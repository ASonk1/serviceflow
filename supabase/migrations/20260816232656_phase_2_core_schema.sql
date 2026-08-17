begin;

create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null,
  phone text,
  avatar_path text,
  platform_role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint user_profiles_display_name_check check (char_length(btrim(display_name)) between 1 and 100),
  constraint user_profiles_phone_check check (phone is null or char_length(phone) between 3 and 32),
  constraint user_profiles_avatar_path_check check (avatar_path is null or (char_length(avatar_path) between 1 and 500 and avatar_path !~ '^[a-z]+://')),
  constraint user_profiles_platform_role_check check (platform_role in ('user', 'platform_admin')),
  constraint user_profiles_status_check check (status in ('active', 'disabled'))
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  logo_path text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country_code char(2),
  timezone text not null,
  currency char(3) not null,
  status text not null default 'draft',
  onboarding_step text,
  published_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint organizations_id_currency_key unique (id, currency),
  constraint organizations_slug_format_check check (slug = lower(slug) and slug ~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$'),
  constraint organizations_reserved_slug_check check (slug <> all (array['admin','api','auth','dashboard','client','demo','features','login','onboarding','privacy','sign-in','sign-up','support','terms','www']::text[])),
  constraint organizations_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint organizations_description_check check (description is null or char_length(description) <= 2000),
  constraint organizations_logo_path_check check (logo_path is null or (char_length(logo_path) between 1 and 500 and logo_path !~ '^[a-z]+://')),
  constraint organizations_email_check check (email is null or char_length(email) between 3 and 320),
  constraint organizations_phone_check check (phone is null or char_length(phone) between 3 and 32),
  constraint organizations_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint organizations_timezone_check check (char_length(timezone) between 1 and 100),
  constraint organizations_currency_check check (currency in ('RON', 'EUR', 'USD', 'GBP')),
  constraint organizations_status_check check (status in ('draft', 'published', 'unpublished', 'suspended')),
  constraint organizations_lifecycle_check check (
    (status = 'published' and published_at is not null and suspended_at is null)
    or (status = 'suspended' and suspended_at is not null)
    or (status in ('draft', 'unpublished') and suspended_at is null)
  )
);

create unique index organizations_slug_lower_key on public.organizations (lower(slug));
create index organizations_status_created_at_idx on public.organizations (status, created_at desc);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete restrict,
  role text not null,
  status text not null,
  invited_email text,
  invited_by uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint organization_memberships_org_id_key unique (organization_id, id),
  constraint organization_memberships_org_user_key unique (organization_id, user_id),
  constraint organization_memberships_role_check check (role in ('owner', 'staff')),
  constraint organization_memberships_status_check check (status in ('invited', 'active', 'inactive')),
  constraint organization_memberships_invited_email_check check (invited_email is null or (invited_email = lower(btrim(invited_email)) and char_length(invited_email) between 3 and 320)),
  constraint organization_memberships_lifecycle_check check (
    (status = 'invited' and user_id is null and invited_email is not null and accepted_at is null)
    or (status = 'active' and user_id is not null and accepted_at is not null)
    or (status = 'inactive' and user_id is not null)
  )
);

create unique index organization_memberships_invited_email_key
  on public.organization_memberships (organization_id, lower(invited_email))
  where status = 'invited';
create index organization_memberships_user_status_idx on public.organization_memberships (user_id, status);
create index organization_memberships_org_role_status_idx on public.organization_memberships (organization_id, role, status);

create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  slot_interval_minutes smallint not null default 15,
  minimum_lead_minutes integer not null default 60,
  booking_horizon_days smallint not null default 90,
  cancellation_notice_minutes integer not null default 1440,
  reschedule_notice_minutes integer not null default 1440,
  reminder_lead_minutes integer not null default 1440,
  guest_booking_enabled boolean not null default true,
  policy_text text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint organization_settings_slot_interval_check check (slot_interval_minutes between 5 and 120),
  constraint organization_settings_minimum_lead_check check (minimum_lead_minutes between 0 and 525600),
  constraint organization_settings_horizon_check check (booking_horizon_days between 1 and 365),
  constraint organization_settings_cancellation_check check (cancellation_notice_minutes between 0 and 525600),
  constraint organization_settings_reschedule_check check (reschedule_notice_minutes between 0 and 525600),
  constraint organization_settings_reminder_check check (reminder_lead_minutes between 0 and 525600),
  constraint organization_settings_policy_text_check check (policy_text is null or char_length(policy_text) <= 10000)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  duration_minutes smallint not null,
  buffer_after_minutes smallint not null default 0,
  price_minor bigint not null,
  currency char(3) not null,
  payment_mode text not null default 'none',
  deposit_minor bigint,
  visibility text not null default 'private',
  status text not null default 'draft',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint services_org_id_key unique (organization_id, id),
  constraint services_org_currency_fk foreign key (organization_id, currency) references public.organizations(id, currency) on delete restrict,
  constraint services_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint services_description_check check (description is null or char_length(description) <= 4000),
  constraint services_duration_check check (duration_minutes between 5 and 480),
  constraint services_buffer_check check (buffer_after_minutes between 0 and 240),
  constraint services_price_check check (price_minor >= 0),
  constraint services_currency_check check (currency in ('RON', 'EUR', 'USD', 'GBP')),
  constraint services_payment_mode_check check (payment_mode in ('none', 'deposit', 'full')),
  constraint services_deposit_check check (
    (payment_mode = 'deposit' and deposit_minor > 0 and deposit_minor <= price_minor)
    or (payment_mode in ('none', 'full') and deposit_minor is null)
  ),
  constraint services_visibility_check check (visibility in ('public', 'private')),
  constraint services_status_check check (status in ('draft', 'active', 'archived'))
);

create index services_org_status_name_idx on public.services (organization_id, status, name, id);

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  membership_id uuid not null,
  display_name text not null,
  bio text,
  avatar_path text,
  is_public boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint staff_profiles_org_id_key unique (organization_id, id),
  constraint staff_profiles_org_membership_key unique (organization_id, membership_id),
  constraint staff_profiles_membership_fk foreign key (organization_id, membership_id) references public.organization_memberships(organization_id, id) on delete restrict,
  constraint staff_profiles_display_name_check check (char_length(btrim(display_name)) between 1 and 100),
  constraint staff_profiles_bio_check check (bio is null or char_length(bio) <= 2000),
  constraint staff_profiles_avatar_path_check check (avatar_path is null or (char_length(avatar_path) between 1 and 500 and avatar_path !~ '^[a-z]+://')),
  constraint staff_profiles_status_check check (status in ('active', 'inactive'))
);

create index staff_profiles_org_status_name_idx on public.staff_profiles (organization_id, status, display_name, id);

create table public.service_staff (
  organization_id uuid not null,
  service_id uuid not null,
  staff_profile_id uuid not null,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (service_id, staff_profile_id),
  constraint service_staff_org_service_fk foreign key (organization_id, service_id) references public.services(organization_id, id) on delete restrict,
  constraint service_staff_org_staff_fk foreign key (organization_id, staff_profile_id) references public.staff_profiles(organization_id, id) on delete restrict
);

create index service_staff_org_staff_active_idx on public.service_staff (organization_id, staff_profile_id, is_active);

create table public.weekly_availability (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  staff_profile_id uuid not null,
  weekday smallint not null,
  start_local time not null,
  end_local time not null,
  effective_from date,
  effective_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint weekly_availability_org_staff_fk foreign key (organization_id, staff_profile_id) references public.staff_profiles(organization_id, id) on delete restrict,
  constraint weekly_availability_weekday_check check (weekday between 1 and 7),
  constraint weekly_availability_time_check check (start_local < end_local),
  constraint weekly_availability_effective_check check (effective_from is null or effective_until is null or effective_from <= effective_until),
  exclude using gist (
    organization_id with =,
    staff_profile_id with =,
    weekday with =,
    int8range(
      extract(epoch from start_local)::bigint,
      extract(epoch from end_local)::bigint,
      '[)'
    ) with &&,
    daterange(coalesce(effective_from, '-infinity'::date), coalesce(effective_until + 1, 'infinity'::date), '[)') with &&
  ) where (is_active)
);

create index weekly_availability_org_staff_weekday_idx on public.weekly_availability (organization_id, staff_profile_id, weekday, is_active);

create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  staff_profile_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint blocked_times_org_staff_fk foreign key (organization_id, staff_profile_id) references public.staff_profiles(organization_id, id) on delete restrict,
  constraint blocked_times_interval_check check (starts_at < ends_at),
  constraint blocked_times_reason_check check (reason is null or char_length(reason) <= 500)
);

create index blocked_times_org_staff_starts_idx on public.blocked_times (organization_id, staff_profile_id, starts_at);
create index blocked_times_staff_range_idx on public.blocked_times using gist (staff_profile_id, tstzrange(starts_at, ends_at, '[)'));

create table public.client_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete restrict,
  email_normalized text not null,
  email_display text not null,
  full_name text not null,
  phone text,
  notes text,
  first_booked_at timestamptz,
  last_booked_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint client_records_org_id_key unique (organization_id, id),
  constraint client_records_org_email_key unique (organization_id, email_normalized),
  constraint client_records_email_normalized_check check (email_normalized = lower(btrim(email_normalized)) and char_length(email_normalized) between 3 and 320),
  constraint client_records_email_display_check check (char_length(email_display) between 3 and 320),
  constraint client_records_full_name_check check (char_length(btrim(full_name)) between 1 and 120),
  constraint client_records_phone_check check (phone is null or char_length(phone) between 3 and 32),
  constraint client_records_notes_check check (notes is null or char_length(notes) <= 5000),
  constraint client_records_booking_dates_check check (first_booked_at is null or last_booked_at is null or first_booked_at <= last_booked_at)
);

create unique index client_records_org_user_key on public.client_records (organization_id, user_id) where user_id is not null;
create index client_records_org_last_booked_idx on public.client_records (organization_id, last_booked_at desc, id);
create index client_records_user_idx on public.client_records (user_id) where user_id is not null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_type text not null,
  actor_role text not null,
  action text not null,
  target_type text,
  target_id uuid,
  summary text not null,
  changes jsonb not null default '{}'::jsonb,
  request_id text,
  ip_hash text,
  created_at timestamptz not null default statement_timestamp(),
  constraint audit_logs_actor_type_check check (actor_type in ('user', 'system', 'provider')),
  constraint audit_logs_actor_role_check check (actor_role in ('platform_admin', 'owner', 'staff', 'client', 'system', 'provider')),
  constraint audit_logs_action_check check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$' and char_length(action) <= 120),
  constraint audit_logs_target_type_check check (target_type is null or (target_type ~ '^[a-z][a-z0-9_]*$' and char_length(target_type) <= 80)),
  constraint audit_logs_summary_check check (char_length(btrim(summary)) between 1 and 500),
  constraint audit_logs_changes_check check (jsonb_typeof(changes) = 'object' and pg_column_size(changes) <= 16384),
  constraint audit_logs_request_id_check check (request_id is null or char_length(request_id) <= 120),
  constraint audit_logs_ip_hash_check check (ip_hash is null or char_length(ip_hash) <= 128)
);

create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc, id);
create index audit_logs_actor_created_idx on public.audit_logs (actor_user_id, created_at desc);
create index audit_logs_target_created_idx on public.audit_logs (target_type, target_id, created_at desc);
create index audit_logs_platform_created_idx on public.audit_logs (created_at desc, id) where organization_id is null;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function private.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_display_name text;
begin
  safe_display_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if safe_display_name is null then
    safe_display_name := split_part(coalesce(new.email, 'ServiceFlow user'), '@', 1);
  end if;

  insert into public.user_profiles (user_id, display_name, platform_role, status)
  values (new.id, left(safe_display_name, 100), 'user', 'active');
  return new;
end;
$$;

create or replace function private.validate_organization_timezone()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid organization timezone' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.validate_staff_membership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.id = new.membership_id
      and membership.organization_id = new.organization_id
      and membership.status = 'active'
      and membership.user_id is not null
  ) then
    raise exception 'staff profile requires an active linked membership' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.protect_user_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated'
     and (new.platform_role is distinct from old.platform_role or new.status is distinct from old.status) then
    raise exception 'protected profile fields cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.protect_client_linkage()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'INSERT' and new.user_id is not null then
      raise exception 'client identity linking requires a verified trusted function' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
      raise exception 'client identity linking requires a verified trusted function' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.protect_block_creator()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'INSERT' and new.created_by is distinct from (select auth.uid()) then
      raise exception 'blocked time creator must match authenticated user' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
      raise exception 'blocked time creator is immutable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.enforce_active_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  checked_org_id uuid;
begin
  if tg_table_name = 'organizations' then
    checked_org_id := coalesce(new.id, old.id);
  else
    checked_org_id := coalesce(new.organization_id, old.organization_id);
  end if;
  if exists (select 1 from public.organizations where id = checked_org_id)
     and not exists (
       select 1
       from public.organization_memberships
       where organization_id = checked_org_id
         and role = 'owner'
         and status = 'active'
         and user_id is not null
     ) then
    raise exception 'organization must retain at least one active owner' using errcode = '23514';
  end if;
  return null;
end;
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = (select auth.uid())
      and platform_role = 'platform_admin'
      and status = 'active'
  );
$$;

create or replace function private.has_org_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_org_id is not null
    and allowed_roles <@ array['owner', 'staff']::text[]
    and exists (
      select 1
      from public.organization_memberships
      where organization_id = target_org_id
        and user_id = (select auth.uid())
        and status = 'active'
        and role = any(allowed_roles)
    );
$$;

create or replace function private.is_org_operational(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizations
    where id = target_org_id and status <> 'suspended'
  );
$$;

create or replace function private.is_own_staff_profile(target_staff_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles profile
    join public.organization_memberships membership
      on membership.id = profile.membership_id
     and membership.organization_id = profile.organization_id
    where profile.id = target_staff_profile_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function private.is_assigned_to_service(target_service_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.service_staff assignment
    where assignment.service_id = target_service_id
      and assignment.is_active
      and private.is_own_staff_profile(assignment.staff_profile_id)
  );
$$;

create trigger create_user_profile_after_auth_user
after insert on auth.users
for each row execute function private.create_user_profile();

create trigger validate_organization_timezone_before_write
before insert or update of timezone on public.organizations
for each row execute function private.validate_organization_timezone();

create trigger validate_staff_membership_before_write
before insert or update of organization_id, membership_id on public.staff_profiles
for each row execute function private.validate_staff_membership();

create trigger protect_user_profile_fields_before_update
before update on public.user_profiles
for each row execute function private.protect_user_profile_fields();

create trigger protect_client_linkage_before_write
before insert or update on public.client_records
for each row execute function private.protect_client_linkage();

create trigger protect_block_creator_before_write
before insert or update on public.blocked_times
for each row execute function private.protect_block_creator();

create constraint trigger organizations_require_active_owner
after insert or update on public.organizations
deferrable initially deferred
for each row execute function private.enforce_active_owner();

create constraint trigger memberships_require_active_owner
after insert or update or delete on public.organization_memberships
deferrable initially deferred
for each row execute function private.enforce_active_owner();

create trigger user_profiles_set_updated_at before update on public.user_profiles for each row execute function private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function private.set_updated_at();
create trigger organization_memberships_set_updated_at before update on public.organization_memberships for each row execute function private.set_updated_at();
create trigger organization_settings_set_updated_at before update on public.organization_settings for each row execute function private.set_updated_at();
create trigger services_set_updated_at before update on public.services for each row execute function private.set_updated_at();
create trigger staff_profiles_set_updated_at before update on public.staff_profiles for each row execute function private.set_updated_at();
create trigger service_staff_set_updated_at before update on public.service_staff for each row execute function private.set_updated_at();
create trigger weekly_availability_set_updated_at before update on public.weekly_availability for each row execute function private.set_updated_at();
create trigger blocked_times_set_updated_at before update on public.blocked_times for each row execute function private.set_updated_at();
create trigger client_records_set_updated_at before update on public.client_records for each row execute function private.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.services enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.service_staff enable row level security;
alter table public.weekly_availability enable row level security;
alter table public.blocked_times enable row level security;
alter table public.client_records enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.user_profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_settings to authenticated;
grant select, insert, update, delete on public.organization_memberships to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.staff_profiles to authenticated;
grant select, insert, update, delete on public.service_staff to authenticated;
grant select, insert, update, delete on public.weekly_availability to authenticated;
grant select, insert, update, delete on public.blocked_times to authenticated;
grant select, insert, update, delete on public.client_records to authenticated;
grant select on public.audit_logs to authenticated;
grant all on all tables in schema public to service_role;
revoke insert, update, delete on public.audit_logs from service_role;

grant usage on schema private to authenticated, service_role;
revoke all on all functions in schema private from public, anon, authenticated, service_role;
grant execute on function private.is_platform_admin() to authenticated, service_role;
grant execute on function private.has_org_role(uuid, text[]) to authenticated, service_role;
grant execute on function private.is_org_operational(uuid) to authenticated, service_role;
grant execute on function private.is_own_staff_profile(uuid) to authenticated, service_role;
grant execute on function private.is_assigned_to_service(uuid) to authenticated, service_role;

create policy user_profiles_select_own on public.user_profiles
for select to authenticated using (user_id = (select auth.uid()));
create policy user_profiles_update_own on public.user_profiles
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy organizations_select_member on public.organizations
for select to authenticated using ((select private.has_org_role(id, array['owner','staff'])));
create policy organizations_update_owner on public.organizations
for update to authenticated
using ((select private.has_org_role(id, array['owner'])) and (select private.is_org_operational(id)))
with check ((select private.has_org_role(id, array['owner'])) and (select private.is_org_operational(id)));

create policy organization_settings_select_owner on public.organization_settings
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])));
create policy organization_settings_insert_owner on public.organization_settings
for insert to authenticated with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy organization_settings_update_owner on public.organization_settings
for update to authenticated
using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)))
with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy organization_settings_delete_owner on public.organization_settings
for delete to authenticated using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));

create policy memberships_select_owner_or_self on public.organization_memberships
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])) or user_id = (select auth.uid()));
create policy memberships_insert_owner on public.organization_memberships
for insert to authenticated with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy memberships_update_owner on public.organization_memberships
for update to authenticated
using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)))
with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy memberships_delete_owner on public.organization_memberships
for delete to authenticated using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));

create policy services_select_owner_or_assigned_staff on public.services
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])) or (select private.is_assigned_to_service(id)));
create policy services_insert_owner on public.services
for insert to authenticated with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy services_update_owner on public.services
for update to authenticated
using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)))
with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy services_delete_owner on public.services
for delete to authenticated using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));

create policy staff_profiles_select_owner_or_self on public.staff_profiles
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(id)));
create policy staff_profiles_insert_owner on public.staff_profiles
for insert to authenticated with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy staff_profiles_update_owner_or_self on public.staff_profiles
for update to authenticated
using (((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(id))) and (select private.is_org_operational(organization_id)))
with check (((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(id))) and (select private.is_org_operational(organization_id)));
create policy staff_profiles_delete_owner on public.staff_profiles
for delete to authenticated using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));

create policy service_staff_select_owner_or_self on public.service_staff
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id)));
create policy service_staff_insert_owner on public.service_staff
for insert to authenticated with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy service_staff_update_owner on public.service_staff
for update to authenticated
using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)))
with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy service_staff_delete_owner on public.service_staff
for delete to authenticated using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));

create policy weekly_availability_select_owner_or_self on public.weekly_availability
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id)));
create policy weekly_availability_insert_owner_or_self on public.weekly_availability
for insert to authenticated with check (((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id))) and (select private.is_org_operational(organization_id)));
create policy weekly_availability_update_owner_or_self on public.weekly_availability
for update to authenticated
using (((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id))) and (select private.is_org_operational(organization_id)))
with check (((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id))) and (select private.is_org_operational(organization_id)));
create policy weekly_availability_delete_owner_or_self on public.weekly_availability
for delete to authenticated using (((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id))) and (select private.is_org_operational(organization_id)));

create policy blocked_times_select_owner_or_self on public.blocked_times
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id)));
create policy blocked_times_insert_owner_or_self on public.blocked_times
for insert to authenticated with check (
  ((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id)))
  and created_by = (select auth.uid())
  and (select private.is_org_operational(organization_id))
);
create policy blocked_times_update_owner_or_self on public.blocked_times
for update to authenticated
using (((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id))) and (select private.is_org_operational(organization_id)))
with check (
  ((select private.has_org_role(organization_id, array['owner'])) or ((select private.is_own_staff_profile(staff_profile_id)) and created_by = (select auth.uid())))
  and (select private.is_org_operational(organization_id))
);
create policy blocked_times_delete_owner_or_self on public.blocked_times
for delete to authenticated using (((select private.has_org_role(organization_id, array['owner'])) or (select private.is_own_staff_profile(staff_profile_id))) and (select private.is_org_operational(organization_id)));

create policy client_records_select_owner on public.client_records
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])));
create policy client_records_insert_owner on public.client_records
for insert to authenticated with check (
  (select private.has_org_role(organization_id, array['owner']))
  and (select private.is_org_operational(organization_id))
  and user_id is null
);
create policy client_records_update_owner on public.client_records
for update to authenticated
using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)))
with check ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));
create policy client_records_delete_owner on public.client_records
for delete to authenticated using ((select private.has_org_role(organization_id, array['owner'])) and (select private.is_org_operational(organization_id)));

create policy audit_logs_select_owner on public.audit_logs
for select to authenticated using (organization_id is not null and (select private.has_org_role(organization_id, array['owner'])));

create or replace function public.get_my_client_records()
returns table (
  id uuid,
  organization_id uuid,
  email_display text,
  full_name text,
  phone text,
  first_booked_at timestamptz,
  last_booked_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select record.id, record.organization_id, record.email_display, record.full_name,
         record.phone, record.first_booked_at, record.last_booked_at,
         record.created_at, record.updated_at
  from public.client_records record
  where record.user_id = (select auth.uid())
    and exists (
      select 1 from public.user_profiles profile
      where profile.user_id = (select auth.uid()) and profile.status = 'active'
    );
$$;

create or replace function private.write_audit_log(
  target_org_id uuid,
  event_action text,
  event_target_type text,
  event_target_id uuid,
  event_summary text,
  event_changes jsonb default '{}'::jsonb,
  event_request_id text default null,
  event_ip_hash text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  audit_id uuid;
  membership_role text;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not private.is_org_operational(target_org_id) then
    raise exception 'organization is not operational' using errcode = '42501';
  end if;

  select role into membership_role
  from public.organization_memberships
  where organization_id = target_org_id
    and user_id = (select auth.uid())
    and status = 'active';

  if membership_role is null then
    raise exception 'active membership required' using errcode = '42501';
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, actor_type, actor_role, action,
    target_type, target_id, summary, changes, request_id, ip_hash
  ) values (
    target_org_id, (select auth.uid()), 'user', membership_role, event_action,
    event_target_type, event_target_id, event_summary, coalesce(event_changes, '{}'::jsonb),
    event_request_id, event_ip_hash
  ) returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function public.get_my_client_records() from public, anon;
grant execute on function public.get_my_client_records() to authenticated;
revoke all on function private.write_audit_log(uuid, text, text, uuid, text, jsonb, text, text) from public, anon, authenticated, service_role;

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'audit logs are append-only' using errcode = '42501';
end;
$$;

create trigger audit_logs_prevent_update_delete
before update or delete on public.audit_logs
for each row execute function private.prevent_audit_mutation();

revoke execute on function private.set_updated_at() from public, anon, authenticated, service_role;
revoke execute on function private.create_user_profile() from public, anon, authenticated, service_role;
revoke execute on function private.validate_organization_timezone() from public, anon, authenticated, service_role;
revoke execute on function private.validate_staff_membership() from public, anon, authenticated, service_role;
revoke execute on function private.protect_user_profile_fields() from public, anon, authenticated, service_role;
revoke execute on function private.protect_client_linkage() from public, anon, authenticated, service_role;
revoke execute on function private.protect_block_creator() from public, anon, authenticated, service_role;
revoke execute on function private.enforce_active_owner() from public, anon, authenticated, service_role;
revoke execute on function private.prevent_audit_mutation() from public, anon, authenticated, service_role;

commit;
