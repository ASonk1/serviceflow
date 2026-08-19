begin;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_id uuid not null,
  staff_profile_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  buffer_ends_at timestamptz not null,
  status text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint appointments_service_fk foreign key (organization_id,service_id) references public.services(organization_id,id),
  constraint appointments_staff_fk foreign key (organization_id,staff_profile_id) references public.staff_profiles(organization_id,id),
  constraint appointments_time_check check (starts_at<ends_at and ends_at<=buffer_ends_at),
  constraint appointments_status_check check (status in ('pending_payment','confirmed','completed','cancelled','no_show'))
);
create index appointments_staff_time_idx on public.appointments(staff_profile_id,starts_at) where status in ('pending_payment','confirmed');
alter table public.appointments enable row level security;
revoke all on public.appointments from anon,authenticated;

create table public.booking_holds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_id uuid not null,
  staff_profile_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  buffer_ends_at timestamptz not null,
  status text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint booking_holds_service_fk foreign key (organization_id,service_id) references public.services(organization_id,id),
  constraint booking_holds_staff_fk foreign key (organization_id,staff_profile_id) references public.staff_profiles(organization_id,id),
  constraint booking_holds_time_check check (starts_at<ends_at and ends_at<=buffer_ends_at),
  constraint booking_holds_status_check check (status in ('active','converted','expired','cancelled','reconciliation_required'))
);
create index booking_holds_staff_time_idx on public.booking_holds(staff_profile_id,starts_at,expires_at) where status='active';
alter table public.booking_holds enable row level security;
revoke all on public.booking_holds from anon,authenticated;

create or replace function public.get_public_business(public_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'slug',o.slug,'name',o.name,'description',o.description,'city',o.city,'region',o.region,'countryCode',o.country_code,
    'timezone',o.timezone,'currency',o.currency,'logoPath',o.logo_path,
    'staff',coalesce((select jsonb_agg(jsonb_build_object('displayName',sp.display_name,'bio',sp.bio,'jobTitle',sp.job_title,'avatarPath',sp.avatar_path) order by sp.display_name,sp.id) from public.staff_profiles sp join public.organization_memberships m on m.organization_id=sp.organization_id and m.id=sp.membership_id where sp.organization_id=o.id and sp.status='active' and sp.is_public and nullif(btrim(sp.display_name),'') is not null and m.status='active' and m.user_id is not null and m.accepted_at is not null),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(jsonb_build_object(
      'id',sv.id,'name',sv.name,'description',sv.description,'durationMinutes',sv.duration_minutes,
      'bufferMinutes',sv.buffer_after_minutes,'priceMinor',sv.price_minor,'paymentMode',sv.payment_mode,'depositMinor',sv.deposit_minor
    ) order by sv.name,sv.id) from public.services sv where sv.organization_id=o.id and sv.status='active' and sv.visibility='public'
      and exists(select 1 from public.service_staff ss join public.staff_profiles sp on sp.organization_id=ss.organization_id and sp.id=ss.staff_profile_id
        join public.organization_memberships m on m.organization_id=sp.organization_id and m.id=sp.membership_id
        where ss.organization_id=o.id and ss.service_id=sv.id and ss.is_active and sp.status='active' and sp.is_public
          and nullif(btrim(sp.display_name),'') is not null and m.status='active' and m.user_id is not null and m.accepted_at is not null)),'[]'::jsonb)
  ) from public.organizations o join public.organization_settings os on os.organization_id=o.id
  where char_length(public_slug) between 3 and 63 and o.slug=lower(btrim(public_slug)) and o.status='published' and o.suspended_at is null
    and os.guest_booking_enabled and o.timezone in (select name from pg_catalog.pg_timezone_names);
$$;

create or replace function public.get_public_availability_context(public_slug text,public_service_id uuid,public_staff_id uuid,local_date date,as_of timestamptz default statement_timestamp())
returns jsonb language sql stable security definer set search_path='' as $$
with org as (
  select o.id,o.slug,o.name,o.timezone,o.currency,os.slot_interval_minutes,os.minimum_lead_minutes,os.booking_horizon_days
  from public.organizations o join public.organization_settings os on os.organization_id=o.id
  where char_length(public_slug) between 3 and 63 and o.slug=lower(btrim(public_slug)) and o.status='published' and o.suspended_at is null
    and os.guest_booking_enabled and o.timezone in (select name from pg_catalog.pg_timezone_names)
), service as (
  select s.* from public.services s join org o on o.id=s.organization_id where s.id=public_service_id and s.status='active' and s.visibility='public'
), eligible as (
  select sp.id,sp.display_name,sp.bio,sp.job_title,sp.avatar_path from public.staff_profiles sp join org o on o.id=sp.organization_id
  join public.organization_memberships m on m.organization_id=sp.organization_id and m.id=sp.membership_id
  join public.service_staff ss on ss.organization_id=sp.organization_id and ss.staff_profile_id=sp.id and ss.service_id=public_service_id
  where sp.status='active' and sp.is_public and nullif(btrim(sp.display_name),'') is not null and m.status='active' and m.user_id is not null
    and m.accepted_at is not null and ss.is_active and (public_staff_id is null or sp.id=public_staff_id)
), bounds as (
  select ((local_date::timestamp at time zone o.timezone)-interval '1 day') lo,(((local_date+1)::timestamp at time zone o.timezone)+interval '1 day') hi from org o
)
select jsonb_build_object(
 'organization',(select jsonb_build_object('slug',o.slug,'name',o.name,'timezone',o.timezone,'currency',o.currency,'slotIntervalMinutes',o.slot_interval_minutes,'minimumLeadMinutes',o.minimum_lead_minutes,'bookingHorizonDays',o.booking_horizon_days) from org o),
 'service',(select jsonb_build_object('id',s.id,'name',s.name,'durationMinutes',s.duration_minutes,'bufferMinutes',s.buffer_after_minutes,'priceMinor',s.price_minor,'paymentMode',s.payment_mode,'depositMinor',s.deposit_minor) from service s),
 'staff',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'displayName',e.display_name,'bio',e.bio,'jobTitle',e.job_title,'avatarPath',e.avatar_path) order by e.display_name,e.id) from eligible e),'[]'::jsonb),
 'windows',coalesce((select jsonb_agg(jsonb_build_object('staffId',w.staff_profile_id,'weekday',w.weekday,'start',to_char(w.start_local,'HH24:MI'),'end',to_char(w.end_local,'HH24:MI')) order by w.staff_profile_id,w.start_local,w.end_local,w.id) from public.weekly_availability w join eligible e on e.id=w.staff_profile_id where w.is_active and w.weekday=extract(isodow from local_date) and (w.effective_from is null or w.effective_from<=local_date) and (w.effective_until is null or w.effective_until>=local_date)),'[]'::jsonb),
 'occupied',coalesce((select jsonb_agg(x.item order by x.starts,x.ends,x.kind) from (
   select a.starts_at starts,a.buffer_ends_at ends,'appointment' kind,jsonb_build_object('staffId',a.staff_profile_id,'startsAt',a.starts_at,'endsAt',a.buffer_ends_at) item from public.appointments a join eligible e on e.id=a.staff_profile_id cross join bounds b where a.status in ('pending_payment','confirmed') and a.starts_at<b.hi and a.buffer_ends_at>b.lo
   union all select h.starts_at,h.buffer_ends_at,'hold',jsonb_build_object('staffId',h.staff_profile_id,'startsAt',h.starts_at,'endsAt',h.buffer_ends_at) from public.booking_holds h join eligible e on e.id=h.staff_profile_id cross join bounds b where h.status='active' and h.expires_at>as_of and h.starts_at<b.hi and h.buffer_ends_at>b.lo
   union all select bt.starts_at,bt.ends_at,'block',jsonb_build_object('staffId',bt.staff_profile_id,'startsAt',bt.starts_at,'endsAt',bt.ends_at) from public.blocked_times bt join eligible e on e.id=bt.staff_profile_id cross join bounds b where bt.starts_at<b.hi and bt.ends_at>b.lo
 ) x),'[]'::jsonb)
) where exists(select 1 from org) and exists(select 1 from service) and exists(select 1 from eligible);
$$;

revoke all on function public.get_public_business(text) from public;
revoke all on function public.get_public_availability_context(text,uuid,uuid,date,timestamptz) from public;
grant execute on function public.get_public_business(text) to anon,authenticated;
grant execute on function public.get_public_availability_context(text,uuid,uuid,date,timestamptz) to anon,authenticated;

commit;
