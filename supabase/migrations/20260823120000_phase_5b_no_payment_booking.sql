begin;

alter table public.appointments
  add column public_reference text,
  add column client_record_id uuid,
  add column service_name_snapshot text,
  add column duration_minutes_snapshot smallint,
  add column buffer_minutes_snapshot smallint,
  add column price_minor_snapshot bigint,
  add column currency_snapshot char(3),
  add column payment_mode_snapshot text,
  add column deposit_minor_snapshot bigint,
  add column client_name_snapshot text,
  add column client_email_snapshot text,
  add column client_phone_snapshot text,
  add column timezone_snapshot text,
  add column policy_text_snapshot text,
  add column policy_version_snapshot text,
  add column policy_accepted_at timestamptz;

update public.appointments a set
  public_reference='LEGACY-'||replace(a.id::text,'-',''),
  service_name_snapshot=s.name,
  duration_minutes_snapshot=s.duration_minutes,
  buffer_minutes_snapshot=s.buffer_after_minutes,
  price_minor_snapshot=s.price_minor,
  currency_snapshot=s.currency,
  payment_mode_snapshot=s.payment_mode,
  deposit_minor_snapshot=s.deposit_minor,
  client_name_snapshot='Existing fictional client',
  client_email_snapshot='existing-fixture@example.test',
  timezone_snapshot=o.timezone,
  policy_text_snapshot=coalesce(os.policy_text,'No additional booking policy.'),
  policy_version_snapshot='legacy',
  policy_accepted_at=a.created_at
from public.services s
join public.organizations o on o.id=s.organization_id
join public.organization_settings os on os.organization_id=o.id
where a.organization_id=s.organization_id and a.service_id=s.id;

alter table public.appointments
  alter column public_reference set not null,
  alter column service_name_snapshot set not null,
  alter column duration_minutes_snapshot set not null,
  alter column buffer_minutes_snapshot set not null,
  alter column price_minor_snapshot set not null,
  alter column currency_snapshot set not null,
  alter column payment_mode_snapshot set not null,
  alter column client_name_snapshot set not null,
  alter column client_email_snapshot set not null,
  alter column timezone_snapshot set not null,
  alter column policy_text_snapshot set not null,
  alter column policy_version_snapshot set not null,
  alter column policy_accepted_at set not null,
  add constraint appointments_public_reference_key unique(public_reference),
  add constraint appointments_client_fk foreign key(organization_id,client_record_id) references public.client_records(organization_id,id),
  add constraint appointments_snapshot_check check(
    char_length(service_name_snapshot) between 1 and 120 and
    duration_minutes_snapshot between 5 and 480 and buffer_minutes_snapshot between 0 and 240 and
    price_minor_snapshot>=0 and currency_snapshot in ('RON','EUR','USD','GBP') and
    payment_mode_snapshot in ('none','deposit','full') and
    char_length(client_name_snapshot) between 1 and 120 and char_length(client_email_snapshot) between 3 and 320 and
    (client_phone_snapshot is null or char_length(client_phone_snapshot) between 3 and 32)
  ),
  add constraint appointments_active_staff_overlap exclude using gist(
    staff_profile_id with =, tstzrange(starts_at,buffer_ends_at,'[)') with &&
  ) where(status in ('pending_payment','confirmed'));

create or replace function private.protect_client_linkage()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if auth.role()='authenticated' and(
    (tg_op='INSERT' and new.user_id is not null) or
    (tg_op='UPDATE' and new.user_id is distinct from old.user_id)
  ) and coalesce(current_setting('serviceflow.verified_client_link',true),'')<>coalesce(new.user_id::text,'') then
    raise exception 'client identity linking requires a verified trusted function' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_client_linkage() from public,anon,authenticated,service_role;

create table public.appointment_events(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_type text not null,
  occurred_at timestamptz not null default statement_timestamp(),
  metadata jsonb not null default '{}'::jsonb,
  constraint appointment_events_type_check check(event_type in ('appointment_created')),
  constraint appointment_events_actor_check check(actor_type in ('guest','client','system')),
  constraint appointment_events_metadata_check check(jsonb_typeof(metadata)='object' and pg_column_size(metadata)<=4096)
);
create unique index appointment_created_once_idx on public.appointment_events(appointment_id) where event_type='appointment_created';

create table public.notification_deliveries(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  channel text not null default 'email',
  template text not null,
  recipient_email text not null,
  status text not null default 'pending',
  idempotency_key text not null unique,
  scheduled_for timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  constraint notification_channel_check check(channel='email'),
  constraint notification_template_check check(template='appointment_confirmation'),
  constraint notification_status_check check(status in ('pending','sent','failed','cancelled')),
  constraint notification_email_check check(char_length(recipient_email) between 3 and 320)
);

create table public.guest_management_tokens(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  token_hash text not null unique,
  capabilities text[] not null default array['view']::text[],
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint guest_token_hash_check check(token_hash~'^[0-9a-f]{64}$'),
  constraint guest_token_capabilities_check check(capabilities<@array['view']::text[] and 'view'=any(capabilities)),
  constraint guest_token_expiry_check check(expires_at>created_at)
);

create table public.booking_submissions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  idempotency_key uuid not null,
  payload_hash text not null,
  guest_token_hash text not null,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  constraint booking_submissions_org_key unique(organization_id,idempotency_key),
  constraint booking_submissions_hash_check check(payload_hash~'^[0-9a-f]{64}$' and guest_token_hash~'^[0-9a-f]{64}$')
);

create table public.booking_rate_limits(
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  primary key(key_hash,window_started_at),
  constraint booking_rate_key_check check(key_hash~'^[0-9a-f]{64}$'),
  constraint booking_rate_count_check check(request_count between 1 and 1000)
);

alter table public.appointment_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.guest_management_tokens enable row level security;
alter table public.booking_submissions enable row level security;
alter table public.booking_rate_limits enable row level security;
revoke all on public.appointment_events,public.notification_deliveries,public.guest_management_tokens,public.booking_submissions,public.booking_rate_limits from anon,authenticated;

create or replace function private.prevent_booking_artifact_mutation()
returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception 'booking records are append-only' using errcode='42501'; end;
$$;
create trigger appointment_events_append_only before update or delete on public.appointment_events for each row execute function private.prevent_booking_artifact_mutation();
create trigger booking_submissions_append_only before update or delete on public.booking_submissions for each row execute function private.prevent_booking_artifact_mutation();
revoke all on function private.prevent_booking_artifact_mutation() from public,anon,authenticated,service_role;

create or replace function public.create_public_no_payment_booking(
  public_slug text, public_service_id uuid, public_staff_id uuid, requested_start timestamptz,
  contact_name text, contact_email text, contact_phone text, policy_accepted boolean,
  submission_key uuid, guest_token_hash text, rate_key_hash text
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  org record; svc record; candidate record; prior record; client_id uuid; appointment_id uuid;
  local_start timestamp; local_day date; local_clock time; appointment_end timestamptz; occupied_end timestamptz;
  normalized_email text:=lower(btrim(contact_email)); normalized_name text:=btrim(contact_name);
  normalized_phone text:=nullif(btrim(contact_phone),''); policy_text text; policy_version text;
  payload_hash text; reference text; linked_user uuid; actor_kind text:='guest'; candidate_found boolean:=false;
begin
  if char_length(public_slug) not between 3 and 63 or public_slug<>lower(btrim(public_slug)) or
     requested_start is null or submission_key is null or policy_accepted is not true or
     char_length(normalized_name) not between 1 and 120 or char_length(normalized_email) not between 3 and 320 or
     normalized_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or
     (normalized_phone is not null and char_length(normalized_phone) not between 3 and 32) or
     guest_token_hash!~'^[0-9a-f]{64}$' or rate_key_hash!~'^[0-9a-f]{64}$' then
    raise exception 'BOOKING_INVALID' using errcode='22023';
  end if;

  select o.id,o.slug,o.name,o.timezone,o.currency,os.slot_interval_minutes,os.minimum_lead_minutes,
    os.booking_horizon_days,coalesce(os.policy_text,'No additional booking policy.') as policy_text
  into org from public.organizations o join public.organization_settings os on os.organization_id=o.id
  where o.slug=public_slug and o.status='published' and o.suspended_at is null and os.guest_booking_enabled
    and o.timezone in(select name from pg_catalog.pg_timezone_names);
  if org.id is null then raise exception 'BOOKING_UNAVAILABLE' using errcode='P0001'; end if;

  select s.* into svc from public.services s where s.organization_id=org.id and s.id=public_service_id
    and s.status='active' and s.visibility='public' and s.payment_mode='none';
  if svc.id is null then raise exception 'BOOKING_UNAVAILABLE' using errcode='P0001'; end if;

  policy_text:=org.policy_text;
  policy_version:=encode(extensions.digest(convert_to(policy_text,'UTF8'),'sha256'),'hex');
  payload_hash:=encode(extensions.digest(convert_to(concat_ws('|',org.id,svc.id,coalesce(public_staff_id::text,'any'),requested_start,
    normalized_name,normalized_email,coalesce(normalized_phone,''),policy_version),'UTF8'),'sha256'),'hex');

  select bs.payload_hash,bs.guest_token_hash,a.public_reference into prior
  from public.booking_submissions bs join public.appointments a on a.id=bs.appointment_id
  where bs.organization_id=org.id and bs.idempotency_key=submission_key;
  if prior.public_reference is not null then
    if prior.payload_hash<>payload_hash or prior.guest_token_hash<>guest_token_hash then
      raise exception 'BOOKING_IDEMPOTENCY_MISMATCH' using errcode='P0001';
    end if;
    return jsonb_build_object('reference',prior.public_reference,'replayed',true);
  end if;

  local_start:=requested_start at time zone org.timezone;
  local_day:=local_start::date;
  local_clock:=local_start::time;
  if local_day<(statement_timestamp() at time zone org.timezone)::date or
     local_day>(statement_timestamp() at time zone org.timezone)::date+org.booking_horizon_days or
     requested_start<statement_timestamp()+make_interval(mins=>org.minimum_lead_minutes) then
    raise exception 'BOOKING_SLOT_LOST' using errcode='P0001';
  end if;
  appointment_end:=requested_start+make_interval(mins=>svc.duration_minutes);
  occupied_end:=appointment_end+make_interval(mins=>svc.buffer_after_minutes);

  for candidate in
    select sp.id,sp.display_name from public.staff_profiles sp
    join public.organization_memberships m on m.organization_id=sp.organization_id and m.id=sp.membership_id
    join public.service_staff ss on ss.organization_id=sp.organization_id and ss.staff_profile_id=sp.id and ss.service_id=svc.id
    where sp.organization_id=org.id and sp.status='active' and sp.is_public and nullif(btrim(sp.display_name),'') is not null
      and m.status='active' and m.user_id is not null and m.accepted_at is not null and ss.is_active
      and(public_staff_id is null or sp.id=public_staff_id)
    order by sp.id
  loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(candidate.id::text||':'||local_day::text,0));
    if exists(
      select 1 from public.weekly_availability w
      where w.organization_id=org.id and w.staff_profile_id=candidate.id and w.is_active
        and w.weekday=extract(isodow from local_day) and(w.effective_from is null or w.effective_from<=local_day)
        and(w.effective_until is null or w.effective_until>=local_day)
        and local_clock>=w.start_local
        and local_start+make_interval(mins=>svc.duration_minutes+svc.buffer_after_minutes)<=local_day+w.end_local
        and mod((extract(epoch from(local_clock-w.start_local))/60)::integer,org.slot_interval_minutes)=0
    ) and not exists(select 1 from public.blocked_times b where b.staff_profile_id=candidate.id and b.starts_at<occupied_end and b.ends_at>requested_start)
      and not exists(select 1 from public.appointments a where a.staff_profile_id=candidate.id and a.status in('pending_payment','confirmed') and a.starts_at<occupied_end and a.buffer_ends_at>requested_start)
      and not exists(select 1 from public.booking_holds h where h.staff_profile_id=candidate.id and h.status='active' and h.expires_at>statement_timestamp() and h.starts_at<occupied_end and h.buffer_ends_at>requested_start)
    then candidate_found:=true;exit; end if;
  end loop;
  if not candidate_found then raise exception 'BOOKING_SLOT_LOST' using errcode='P0001'; end if;

  if auth.uid() is not null then
    select u.id into linked_user from auth.users u join public.user_profiles up on up.user_id=u.id and up.status='active'
    where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=normalized_email;
    if linked_user is not null then actor_kind:='client'; end if;
  end if;
  if linked_user is not null then perform set_config('serviceflow.verified_client_link',linked_user::text,true); end if;

  insert into public.client_records(organization_id,user_id,email_normalized,email_display,full_name,phone,first_booked_at,last_booked_at)
  values(org.id,linked_user,normalized_email,btrim(contact_email),normalized_name,normalized_phone,statement_timestamp(),statement_timestamp())
  on conflict(organization_id,email_normalized) do update set
    email_display=excluded.email_display,full_name=excluded.full_name,phone=excluded.phone,
    user_id=coalesce(public.client_records.user_id,excluded.user_id),
    first_booked_at=coalesce(public.client_records.first_booked_at,excluded.first_booked_at),last_booked_at=excluded.last_booked_at,
    updated_at=statement_timestamp()
  returning id into client_id;

  reference:='SF-'||upper(encode(extensions.gen_random_bytes(12),'hex'));
  insert into public.appointments(organization_id,service_id,staff_profile_id,client_record_id,starts_at,ends_at,buffer_ends_at,status,
    public_reference,service_name_snapshot,duration_minutes_snapshot,buffer_minutes_snapshot,price_minor_snapshot,currency_snapshot,
    payment_mode_snapshot,deposit_minor_snapshot,client_name_snapshot,client_email_snapshot,client_phone_snapshot,timezone_snapshot,
    policy_text_snapshot,policy_version_snapshot,policy_accepted_at)
  values(org.id,svc.id,candidate.id,client_id,requested_start,appointment_end,occupied_end,'confirmed',reference,svc.name,
    svc.duration_minutes,svc.buffer_after_minutes,svc.price_minor,svc.currency,svc.payment_mode,svc.deposit_minor,normalized_name,
    normalized_email,normalized_phone,org.timezone,policy_text,policy_version,statement_timestamp()) returning id into appointment_id;

  insert into public.appointment_events(organization_id,appointment_id,event_type,actor_user_id,actor_type)
  values(org.id,appointment_id,'appointment_created',linked_user,actor_kind);
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes,ip_hash)
  values(org.id,linked_user,case when linked_user is null then 'system' else 'user' end,case when linked_user is null then 'system' else 'client' end,
    'appointment.created','appointment',appointment_id,'Public no-payment appointment created',jsonb_build_object('source','public_booking'),rate_key_hash);
  insert into public.notification_deliveries(organization_id,appointment_id,recipient_email,template,idempotency_key)
  values(org.id,appointment_id,normalized_email,'appointment_confirmation','appointment-confirmation:'||appointment_id);
  insert into public.guest_management_tokens(organization_id,appointment_id,token_hash,expires_at)
  values(org.id,appointment_id,guest_token_hash,statement_timestamp()+interval '30 days');
  insert into public.booking_submissions(organization_id,idempotency_key,payload_hash,guest_token_hash,appointment_id)
  values(org.id,submission_key,payload_hash,guest_token_hash,appointment_id);
  return jsonb_build_object('reference',reference,'replayed',false);
exception when exclusion_violation or unique_violation then
  raise exception 'BOOKING_SLOT_LOST' using errcode='P0001';
end;
$$;

create or replace function public.check_public_booking_rate_limit(rate_key_hash text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare attempts integer; rate_window timestamptz:=date_bin(interval '15 minutes',statement_timestamp(),timestamptz '2020-01-01');
begin
  if rate_key_hash!~'^[0-9a-f]{64}$' then return false; end if;
  insert into public.booking_rate_limits(key_hash,window_started_at,request_count) values(rate_key_hash,rate_window,1)
  on conflict(key_hash,window_started_at) do update set request_count=public.booking_rate_limits.request_count+1
  returning request_count into attempts;
  delete from public.booking_rate_limits where window_started_at<statement_timestamp()-interval '1 day';
  return attempts<=8;
end;
$$;

create or replace function public.get_public_booking_confirmation(public_reference text,guest_token_hash text default null)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'reference',a.public_reference,'slug',o.slug,'business',o.name,'service',a.service_name_snapshot,'staff',sp.display_name,
    'startsAt',a.starts_at,'endsAt',a.ends_at,'durationMinutes',a.duration_minutes_snapshot,'bufferMinutes',a.buffer_minutes_snapshot,
    'priceMinor',a.price_minor_snapshot,'currency',a.currency_snapshot,'paymentMode',a.payment_mode_snapshot,
    'timezone',a.timezone_snapshot,'clientName',a.client_name_snapshot,'clientEmail',a.client_email_snapshot,
    'clientPhone',a.client_phone_snapshot,'status',a.status,'createdAt',a.created_at
  ) from public.appointments a join public.organizations o on o.id=a.organization_id
  join public.staff_profiles sp on sp.id=a.staff_profile_id
  left join public.client_records cr on cr.id=a.client_record_id and cr.organization_id=a.organization_id
  where a.public_reference=$1 and(
    exists(select 1 from public.guest_management_tokens gt where gt.appointment_id=a.id and gt.token_hash=$2
      and gt.revoked_at is null and gt.expires_at>statement_timestamp() and 'view'=any(gt.capabilities))
    or(auth.uid() is not null and cr.user_id=auth.uid() and exists(select 1 from auth.users u where u.id=auth.uid()
      and u.email_confirmed_at is not null and lower(u.email)=cr.email_normalized))
  );
$$;

create or replace function public.get_public_booking_policy(public_slug text,public_service_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('text',coalesce(os.policy_text,'No additional booking policy.'),
    'version',encode(extensions.digest(convert_to(coalesce(os.policy_text,'No additional booking policy.'),'UTF8'),'sha256'),'hex'))
  from public.organizations o join public.organization_settings os on os.organization_id=o.id
  join public.services s on s.organization_id=o.id and s.id=public_service_id
  where o.slug=lower(btrim(public_slug)) and o.status='published' and o.suspended_at is null and os.guest_booking_enabled
    and o.timezone in(select name from pg_catalog.pg_timezone_names) and s.status='active' and s.visibility='public' and s.payment_mode='none';
$$;

revoke all on function public.create_public_no_payment_booking(text,uuid,uuid,timestamptz,text,text,text,boolean,uuid,text,text) from public;
revoke all on function public.check_public_booking_rate_limit(text) from public;
revoke all on function public.get_public_booking_confirmation(text,text) from public;
revoke all on function public.get_public_booking_policy(text,uuid) from public;
grant execute on function public.create_public_no_payment_booking(text,uuid,uuid,timestamptz,text,text,text,boolean,uuid,text,text) to anon,authenticated;
grant execute on function public.check_public_booking_rate_limit(text) to anon,authenticated;
grant execute on function public.get_public_booking_confirmation(text,text) to anon,authenticated;
grant execute on function public.get_public_booking_policy(text,uuid) to anon,authenticated;

commit;
