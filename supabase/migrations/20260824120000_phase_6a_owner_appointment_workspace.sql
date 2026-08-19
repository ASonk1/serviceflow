begin;

alter table public.appointments add column staff_name_snapshot text, add column updated_at timestamptz not null default statement_timestamp();
update public.appointments a set staff_name_snapshot=sp.display_name from public.staff_profiles sp where sp.id=a.staff_profile_id and sp.organization_id=a.organization_id;
alter table public.appointments alter column staff_name_snapshot set not null,
  add constraint appointments_staff_snapshot_check check(char_length(btrim(staff_name_snapshot)) between 1 and 100);

create or replace function private.snapshot_appointment_staff()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  select display_name into new.staff_name_snapshot from public.staff_profiles where organization_id=new.organization_id and id=new.staff_profile_id;
  if new.staff_name_snapshot is null then raise exception 'invalid appointment staff' using errcode='23503'; end if;
  return new;
end; $$;
create trigger appointments_snapshot_staff before insert on public.appointments for each row execute function private.snapshot_appointment_staff();
revoke all on function private.snapshot_appointment_staff() from public,anon,authenticated,service_role;

create index appointments_org_starts_id_idx on public.appointments(organization_id,starts_at desc,id);
create index appointments_org_status_starts_id_idx on public.appointments(organization_id,status,starts_at,id);
create index appointments_org_service_starts_idx on public.appointments(organization_id,service_id,starts_at,id);
create index appointments_org_staff_starts_idx on public.appointments(organization_id,staff_profile_id,starts_at,id);
create index appointment_events_appointment_time_idx on public.appointment_events(appointment_id,occurred_at,id);
create index notification_deliveries_appointment_created_idx on public.notification_deliveries(appointment_id,created_at,id);

create or replace function public.get_owner_appointment_overview(target_org_id uuid,as_of timestamptz default statement_timestamp())
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; zone text; day_start timestamptz; day_end timestamptz;
begin
  perform private.require_team_owner(target_org_id);
  select timezone into zone from public.organizations where id=target_org_id;
  day_start:=((as_of at time zone zone)::date::timestamp at time zone zone); day_end:=day_start+interval '1 day';
  select jsonb_build_object(
    'timezone',zone,'localDate',(as_of at time zone zone)::date,
    'today',(select count(*) from public.appointments where organization_id=target_org_id and starts_at>=day_start and starts_at<day_end),
    'upcoming',(select count(*) from public.appointments where organization_id=target_org_id and starts_at>=as_of and status in('pending_payment','confirmed')),
    'completed',(select count(*) from public.appointments where organization_id=target_org_id and status='completed'),
    'cancelled',(select count(*) from public.appointments where organization_id=target_org_id and status in('cancelled','no_show')),
    'schedule',coalesce((select jsonb_agg(jsonb_build_object('id',id,'reference',public_reference,'startsAt',starts_at,'status',status,
      'service',service_name_snapshot,'staff',staff_name_snapshot,'client',client_name_snapshot) order by starts_at,id)
      from(select * from public.appointments where organization_id=target_org_id and starts_at>=as_of and status in('pending_payment','confirmed') order by starts_at,id limit 5)x),'[]'::jsonb)
  ) into result;
  return result;
end; $$;

create or replace function public.list_owner_appointments(target_org_id uuid,search_text text default '',status_filter text default 'all',
  service_filter uuid default null,staff_filter uuid default null,date_from date default null,date_to date default null,
  sort_field text default 'start',sort_direction text default 'asc',target_limit integer default 10,target_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; zone text; from_utc timestamptz; to_utc timestamptz;
begin
  perform private.require_team_owner(target_org_id); perform private.validate_list_window(target_limit,target_offset);
  if char_length(search_text)>100 or status_filter not in('all','pending_payment','confirmed','completed','cancelled','no_show')
    or sort_field not in('start','client','service','created') or sort_direction not in('asc','desc')
    or(date_from is not null and date_to is not null and(date_from>date_to or date_to-date_from>366)) then raise exception 'invalid appointment query' using errcode='22023'; end if;
  select timezone into zone from public.organizations where id=target_org_id;
  if date_from is not null then from_utc:=date_from::timestamp at time zone zone; end if;
  if date_to is not null then to_utc:=(date_to+1)::timestamp at time zone zone; end if;
  with filtered as(
    select a.id,a.public_reference,a.status,a.starts_at,a.ends_at,a.created_at,a.service_name_snapshot,a.staff_name_snapshot,
      a.client_name_snapshot,a.client_email_snapshot,a.duration_minutes_snapshot,a.price_minor_snapshot,a.currency_snapshot,a.payment_mode_snapshot
    from public.appointments a where a.organization_id=target_org_id
      and(status_filter='all' or a.status=status_filter) and(service_filter is null or a.service_id=service_filter)
      and(staff_filter is null or a.staff_profile_id=staff_filter) and(from_utc is null or a.starts_at>=from_utc) and(to_utc is null or a.starts_at<to_utc)
      and(btrim(search_text)='' or a.client_name_snapshot ilike '%'||btrim(search_text)||'%' or a.client_email_snapshot ilike '%'||btrim(search_text)||'%' or a.public_reference ilike '%'||btrim(search_text)||'%')
  ),ordered as(select * from filtered order by
    case when sort_field='start' and sort_direction='asc' then starts_at end asc,case when sort_field='start' and sort_direction='desc' then starts_at end desc,
    case when sort_field='client' and sort_direction='asc' then lower(client_name_snapshot) end asc,case when sort_field='client' and sort_direction='desc' then lower(client_name_snapshot) end desc,
    case when sort_field='service' and sort_direction='asc' then lower(service_name_snapshot) end asc,case when sort_field='service' and sort_direction='desc' then lower(service_name_snapshot) end desc,
    case when sort_field='created' and sort_direction='asc' then created_at end asc,case when sort_field='created' and sort_direction='desc' then created_at end desc,id asc limit target_limit offset target_offset)
  select jsonb_build_object('timezone',zone,'items',coalesce(jsonb_agg(to_jsonb(ordered) order by
    case when sort_field='start' and sort_direction='asc' then starts_at end asc,case when sort_field='start' and sort_direction='desc' then starts_at end desc,
    case when sort_field='client' and sort_direction='asc' then lower(client_name_snapshot) end asc,case when sort_field='client' and sort_direction='desc' then lower(client_name_snapshot) end desc,
    case when sort_field='service' and sort_direction='asc' then lower(service_name_snapshot) end asc,case when sort_field='service' and sort_direction='desc' then lower(service_name_snapshot) end desc,
    case when sort_field='created' and sort_direction='asc' then created_at end asc,case when sort_field='created' and sort_direction='desc' then created_at end desc,id asc),'[]'::jsonb),
    'total',(select count(*) from filtered),'organizationTotal',(select count(*) from public.appointments where organization_id=target_org_id)) into result from ordered;
  return result;
end; $$;

create or replace function public.get_owner_appointment_detail(target_org_id uuid,target_appointment_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform private.require_team_owner(target_org_id);
  select jsonb_build_object('id',a.id,'reference',a.public_reference,'status',a.status,'startsAt',a.starts_at,'endsAt',a.ends_at,'bufferEndsAt',a.buffer_ends_at,
    'service',a.service_name_snapshot,'staff',a.staff_name_snapshot,'durationMinutes',a.duration_minutes_snapshot,'bufferMinutes',a.buffer_minutes_snapshot,
    'priceMinor',a.price_minor_snapshot,'currency',a.currency_snapshot,'paymentMode',a.payment_mode_snapshot,'depositMinor',a.deposit_minor_snapshot,
    'clientName',a.client_name_snapshot,'clientEmail',a.client_email_snapshot,'clientPhone',a.client_phone_snapshot,'timezone',a.timezone_snapshot,
    'policyText',a.policy_text_snapshot,'policyVersion',a.policy_version_snapshot,'policyAcceptedAt',a.policy_accepted_at,'createdAt',a.created_at,'updatedAt',a.updated_at,
    'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'type',e.event_type,'actorType',e.actor_type,'occurredAt',e.occurred_at) order by e.occurred_at,e.id) from public.appointment_events e where e.organization_id=target_org_id and e.appointment_id=a.id),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'channel',n.channel,'template',n.template,'status',n.status,'scheduledFor',n.scheduled_for,'createdAt',n.created_at) order by n.created_at,n.id) from public.notification_deliveries n where n.organization_id=target_org_id and n.appointment_id=a.id),'[]'::jsonb)) into result
  from public.appointments a where a.organization_id=target_org_id and a.id=target_appointment_id;
  return result;
end; $$;

revoke all on function public.get_owner_appointment_overview(uuid,timestamptz),public.list_owner_appointments(uuid,text,text,uuid,uuid,date,date,text,text,integer,integer),public.get_owner_appointment_detail(uuid,uuid) from public,anon;
grant execute on function public.get_owner_appointment_overview(uuid,timestamptz),public.list_owner_appointments(uuid,text,text,uuid,uuid,date,date,text,text,integer,integer),public.get_owner_appointment_detail(uuid,uuid) to authenticated;

commit;
