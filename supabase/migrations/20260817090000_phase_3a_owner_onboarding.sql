begin;

create table public.onboarding_progress (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  business_identity_completed_at timestamptz,
  location_completed_at timestamptz,
  booking_policies_completed_at timestamptz,
  staff_profile_completed_at timestamptz,
  service_completed_at timestamptz,
  availability_completed_at timestamptz,
  review_completed_at timestamptz,
  publish_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onboarding_progress_order_check check (
    (location_completed_at is null or business_identity_completed_at is not null) and
    (booking_policies_completed_at is null or location_completed_at is not null) and
    (staff_profile_completed_at is null or booking_policies_completed_at is not null) and
    (service_completed_at is null or staff_profile_completed_at is not null) and
    (availability_completed_at is null or service_completed_at is not null) and
    (review_completed_at is null or availability_completed_at is not null) and
    (publish_completed_at is null or review_completed_at is not null)
  )
);

create trigger onboarding_progress_set_updated_at before update on public.onboarding_progress
for each row execute function private.set_updated_at();

alter table public.onboarding_progress enable row level security;
revoke all on public.onboarding_progress from anon, authenticated;
grant select on public.onboarding_progress to authenticated;
grant all on public.onboarding_progress to service_role;

create policy onboarding_progress_select_owner on public.onboarding_progress
for select to authenticated using ((select private.has_org_role(organization_id, array['owner'])));

create or replace function private.is_verified_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u join public.user_profiles p on p.user_id = u.id
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null and p.status = 'active'
  );
$$;

create or replace function private.is_draft_owner(target_org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_verified_active_user() and exists (
    select 1 from public.organizations o
    join public.organization_memberships m on m.organization_id = o.id
    where o.id = target_org_id and o.status = 'draft'
      and m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active'
  );
$$;

create or replace function private.protect_draft_lifecycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'draft' and new.status <> 'draft' and (select auth.role()) = 'authenticated' then
    raise exception 'draft publishing requires the validated publish workflow' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_draft_lifecycle_before_update before update of status on public.organizations
for each row execute function private.protect_draft_lifecycle();

create or replace function public.start_owner_onboarding()
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare target_id uuid; generated_id uuid := gen_random_uuid();
begin
  if not private.is_verified_active_user() then raise exception 'verified active user required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended((select auth.uid())::text, 0));
  select o.id into target_id from public.organizations o
  join public.organization_memberships m on m.organization_id = o.id
  where m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active' and o.status = 'draft'
  order by o.created_at limit 1;
  if target_id is null then
    target_id := generated_id;
    insert into public.organizations (id, slug, name, timezone, currency, status, onboarding_step)
      values (target_id, 'draft-' || replace(target_id::text, '-', ''), 'Untitled business', 'UTC', 'RON', 'draft', 'business-identity');
    insert into public.organization_settings (organization_id) values (target_id);
    insert into public.organization_memberships (organization_id, user_id, role, status, accepted_at)
      values (target_id, (select auth.uid()), 'owner', 'active', now());
  end if;
  insert into public.onboarding_progress (organization_id) values (target_id) on conflict do nothing;
  return target_id;
end;
$$;

create or replace function public.save_onboarding_business_identity(target_org_id uuid, business_name text, public_slug text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare normalized_slug text := lower(btrim(public_slug)); normalized_name text := btrim(business_name);
begin
  if not private.is_draft_owner(target_org_id) then raise exception 'draft not found' using errcode = '42501'; end if;
  if char_length(normalized_name) not between 2 and 100 then raise exception 'invalid business name' using errcode = '22023'; end if;
  if char_length(normalized_slug) not between 3 and 63 or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'invalid slug' using errcode = '22023'; end if;
  if normalized_slug = any(array['admin','api','auth','dashboard','client','demo','features','login','onboarding','privacy','sign-in','sign-up','support','terms','www']) then raise exception 'reserved slug' using errcode = '22023'; end if;
  update public.organizations set name = normalized_name, slug = normalized_slug, onboarding_step = 'location' where id = target_org_id;
  update public.onboarding_progress set business_identity_completed_at = coalesce(business_identity_completed_at, now()) where organization_id = target_org_id;
end;
$$;

create or replace function public.save_onboarding_location(target_org_id uuid, timezone_name text, currency_code text, country text, city_name text, address1 text default null, address2 text default null, region_name text default null, postal text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not private.is_draft_owner(target_org_id) then raise exception 'draft not found' using errcode = '42501'; end if;
  if not exists (select 1 from pg_timezone_names where name = timezone_name) then raise exception 'invalid timezone' using errcode = '22023'; end if;
  if currency_code not in ('RON','EUR','USD','GBP') then raise exception 'invalid currency' using errcode = '22023'; end if;
  if country !~ '^[A-Z]{2}$' or char_length(btrim(city_name)) not between 1 and 100 then raise exception 'invalid location' using errcode = '22023'; end if;
  update public.organizations set timezone=timezone_name, currency=currency_code, country_code=country, city=btrim(city_name), address_line1=nullif(btrim(address1),''), address_line2=nullif(btrim(address2),''), region=nullif(btrim(region_name),''), postal_code=nullif(btrim(postal),''), onboarding_step='booking-policies' where id=target_org_id;
  update public.onboarding_progress set location_completed_at=coalesce(location_completed_at,now()) where organization_id=target_org_id and business_identity_completed_at is not null;
  if not found then raise exception 'complete prior step' using errcode='22023'; end if;
end;
$$;

create or replace function public.save_onboarding_booking_policies(target_org_id uuid, lead_minutes integer, horizon_days integer, cancellation_minutes integer, reschedule_minutes integer, interval_minutes integer, guests_enabled boolean, terms text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not private.is_draft_owner(target_org_id) then raise exception 'draft not found' using errcode = '42501'; end if;
  if lead_minutes not between 0 and 525600 or horizon_days not between 1 and 365 or cancellation_minutes not between 0 and 525600 or reschedule_minutes not between 0 and 525600 or interval_minutes not between 5 and 120 or mod(interval_minutes,5) <> 0 then raise exception 'invalid booking policies' using errcode='22023'; end if;
  if lead_minutes > horizon_days * 1440 then raise exception 'lead time exceeds horizon' using errcode='22023'; end if;
  update public.organization_settings set minimum_lead_minutes=lead_minutes, booking_horizon_days=horizon_days, cancellation_notice_minutes=cancellation_minutes, reschedule_notice_minutes=reschedule_minutes, slot_interval_minutes=interval_minutes, guest_booking_enabled=guests_enabled, policy_text=nullif(btrim(terms),'') where organization_id=target_org_id;
  update public.organizations set onboarding_step='staff-profile' where id=target_org_id;
  update public.onboarding_progress set booking_policies_completed_at=coalesce(booking_policies_completed_at,now()) where organization_id=target_org_id and location_completed_at is not null;
  if not found then raise exception 'complete prior step' using errcode='22023'; end if;
end;
$$;

revoke all on function private.is_verified_active_user() from public, anon, authenticated, service_role;
revoke all on function private.is_draft_owner(uuid) from public, anon, authenticated, service_role;
revoke all on function private.protect_draft_lifecycle() from public, anon, authenticated, service_role;
revoke all on function public.start_owner_onboarding() from public, anon;
revoke all on function public.save_onboarding_business_identity(uuid,text,text) from public, anon;
revoke all on function public.save_onboarding_location(uuid,text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.save_onboarding_booking_policies(uuid,integer,integer,integer,integer,integer,boolean,text) from public, anon;
grant execute on function public.start_owner_onboarding() to authenticated;
grant execute on function public.save_onboarding_business_identity(uuid,text,text) to authenticated;
grant execute on function public.save_onboarding_location(uuid,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.save_onboarding_booking_policies(uuid,integer,integer,integer,integer,integer,boolean,text) to authenticated;

commit;
