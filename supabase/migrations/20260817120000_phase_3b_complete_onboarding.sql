begin;

alter table public.staff_profiles add column job_title text;
alter table public.staff_profiles add constraint staff_profiles_job_title_check check (job_title is null or char_length(btrim(job_title)) between 1 and 100);
alter table public.onboarding_progress add column staff_profile_id uuid;
alter table public.onboarding_progress add column service_id uuid;
alter table public.onboarding_progress add constraint onboarding_progress_staff_fk foreign key (organization_id, staff_profile_id) references public.staff_profiles(organization_id, id) on delete restrict;
alter table public.onboarding_progress add constraint onboarding_progress_service_fk foreign key (organization_id, service_id) references public.services(organization_id, id) on delete restrict;

create or replace function private.protect_draft_lifecycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status
     and (select auth.role()) = 'authenticated'
     and current_setting('serviceflow.lifecycle_write', true) is distinct from 'on' then
    raise exception 'publication lifecycle requires a validated workflow' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.is_onboarding_owner(target_org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_verified_active_user() and exists (
    select 1 from public.organizations o
    join public.organization_memberships m on m.organization_id=o.id
    where o.id=target_org_id and o.status in ('draft','unpublished','published')
      and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active'
  );
$$;

create or replace function private.onboarding_ready(target_org_id uuid, require_review boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organizations o
    join public.organization_settings s on s.organization_id=o.id
    join public.onboarding_progress p on p.organization_id=o.id
    join public.staff_profiles sp on sp.organization_id=o.id and sp.id=p.staff_profile_id
    join public.organization_memberships m on m.organization_id=o.id and m.id=sp.membership_id
    join public.services sv on sv.organization_id=o.id and sv.id=p.service_id
    join public.service_staff ss on ss.organization_id=o.id and ss.service_id=sv.id and ss.staff_profile_id=sp.id
    where o.id=target_org_id
      and o.name<>'Untitled business' and o.slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      and o.slug <> all(array['admin','api','auth','dashboard','client','demo','features','login','onboarding','privacy','sign-in','sign-up','support','terms','www']::text[])
      and o.country_code is not null and o.city is not null
      and exists(select 1 from pg_catalog.pg_timezone_names tz where tz.name=o.timezone)
      and o.currency in ('RON','EUR','USD','GBP')
      and s.booking_horizon_days between 1 and 365 and s.slot_interval_minutes between 5 and 120
      and p.business_identity_completed_at is not null and p.location_completed_at is not null
      and p.booking_policies_completed_at is not null and p.staff_profile_completed_at is not null
      and p.service_completed_at is not null and p.availability_completed_at is not null
      and (not require_review or p.review_completed_at is not null)
      and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active'
      and sp.status='active' and sp.is_public and btrim(sp.display_name)<>''
      and sv.status='active' and sv.visibility='public' and sv.currency=o.currency
      and sv.duration_minutes between 5 and 480 and sv.buffer_after_minutes between 0 and 240 and sv.price_minor>=0
      and ss.is_active
      and exists(select 1 from public.weekly_availability w where w.organization_id=o.id and w.staff_profile_id=sp.id and w.is_active and w.start_local<w.end_local)
  );
$$;

create or replace function public.save_onboarding_staff_profile(target_org_id uuid, staff_name text, staff_bio text default null, staff_job_title text default null, public_visible boolean default true)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare owner_membership_id uuid; target_staff_id uuid; clean_name text:=btrim(staff_name);
begin
  if not private.is_draft_owner(target_org_id) then raise exception 'draft not found' using errcode='42501'; end if;
  if char_length(clean_name) not between 1 and 100 or char_length(coalesce(staff_bio,''))>2000 or char_length(coalesce(staff_job_title,''))>100 or not public_visible then raise exception 'invalid staff profile' using errcode='22023'; end if;
  select id into owner_membership_id from public.organization_memberships where organization_id=target_org_id and user_id=(select auth.uid()) and role='owner' and status='active' for update;
  if owner_membership_id is null then raise exception 'owner membership required' using errcode='42501'; end if;
  select staff_profile_id into target_staff_id from public.onboarding_progress where organization_id=target_org_id for update;
  if target_staff_id is null then
    insert into public.staff_profiles(organization_id,membership_id,display_name,bio,job_title,is_public,status)
    values(target_org_id,owner_membership_id,clean_name,nullif(btrim(staff_bio),''),nullif(btrim(staff_job_title),''),true,'active')
    on conflict(organization_id,membership_id) do update set display_name=excluded.display_name,bio=excluded.bio,job_title=excluded.job_title,is_public=true,status='active'
    returning id into target_staff_id;
  else
    update public.staff_profiles set display_name=clean_name,bio=nullif(btrim(staff_bio),''),job_title=nullif(btrim(staff_job_title),''),is_public=true,status='active'
    where id=target_staff_id and organization_id=target_org_id and membership_id=owner_membership_id;
    if not found then raise exception 'invalid onboarding staff relationship' using errcode='42501'; end if;
  end if;
  update public.onboarding_progress set staff_profile_id=target_staff_id,staff_profile_completed_at=coalesce(staff_profile_completed_at,now()) where organization_id=target_org_id and booking_policies_completed_at is not null;
  if not found then raise exception 'complete prior step' using errcode='22023'; end if;
  update public.organizations set onboarding_step='service' where id=target_org_id;
  return target_staff_id;
end;
$$;

create or replace function public.save_onboarding_service(target_org_id uuid, service_name text, service_description text, service_duration integer, service_buffer integer, service_price_minor bigint)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare target_service_id uuid; target_staff_id uuid; org_currency text; clean_name text:=btrim(service_name);
begin
  if not private.is_draft_owner(target_org_id) then raise exception 'draft not found' using errcode='42501'; end if;
  if char_length(clean_name) not between 1 and 120 or char_length(coalesce(service_description,''))>4000 or service_duration not between 5 and 480 or service_buffer not between 0 and 240 or service_price_minor not between 0 and 100000000 then raise exception 'invalid service' using errcode='22023'; end if;
  select o.currency,p.staff_profile_id,p.service_id into org_currency,target_staff_id,target_service_id from public.organizations o join public.onboarding_progress p on p.organization_id=o.id where o.id=target_org_id for update of o,p;
  if not exists(select 1 from public.staff_profiles where id=target_staff_id and organization_id=target_org_id and status='active' and is_public) then raise exception 'valid staff profile required' using errcode='22023'; end if;
  if target_service_id is null then
    insert into public.services(organization_id,name,description,duration_minutes,buffer_after_minutes,price_minor,currency,payment_mode,visibility,status)
    values(target_org_id,clean_name,nullif(btrim(service_description),''),service_duration,service_buffer,service_price_minor,org_currency,'none','public','active') returning id into target_service_id;
  else
    update public.services set name=clean_name,description=nullif(btrim(service_description),''),duration_minutes=service_duration,buffer_after_minutes=service_buffer,price_minor=service_price_minor,currency=org_currency,payment_mode='none',deposit_minor=null,visibility='public',status='active' where id=target_service_id and organization_id=target_org_id and status<>'archived';
    if not found then raise exception 'invalid onboarding service relationship' using errcode='42501'; end if;
  end if;
  insert into public.service_staff(organization_id,service_id,staff_profile_id,is_active) values(target_org_id,target_service_id,target_staff_id,true)
  on conflict(service_id,staff_profile_id) do update set is_active=true;
  update public.onboarding_progress set service_id=target_service_id,service_completed_at=coalesce(service_completed_at,now()) where organization_id=target_org_id and staff_profile_completed_at is not null;
  if not found then raise exception 'complete prior step' using errcode='22023'; end if;
  update public.organizations set onboarding_step='availability' where id=target_org_id;
  return target_service_id;
end;
$$;

create or replace function public.replace_onboarding_availability(target_org_id uuid, intervals jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare target_staff_id uuid; item jsonb; day_num integer; starts time; ends time;
begin
  if not private.is_draft_owner(target_org_id) then raise exception 'draft not found' using errcode='42501'; end if;
  if jsonb_typeof(intervals)<>'array' or jsonb_array_length(intervals) not between 1 and 35 then raise exception 'one to 35 intervals required' using errcode='22023'; end if;
  select staff_profile_id into target_staff_id from public.onboarding_progress where organization_id=target_org_id and service_completed_at is not null for update;
  if target_staff_id is null then raise exception 'valid staff and service required' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(intervals) loop
    if not (item ?& array['weekday','start','end']) or (select count(*) from jsonb_object_keys(item))<>3 then raise exception 'invalid interval fields' using errcode='22023'; end if;
    begin day_num:=(item->>'weekday')::integer;starts:=(item->>'start')::time;ends:=(item->>'end')::time; exception when others then raise exception 'invalid interval value' using errcode='22023'; end;
    if day_num not between 1 and 7 or starts>=ends or extract(second from starts)<>0 or extract(second from ends)<>0 or mod(extract(minute from starts)::integer,5)<>0 or mod(extract(minute from ends)::integer,5)<>0 then raise exception 'invalid interval value' using errcode='22023'; end if;
  end loop;
  if (select count(distinct (value->>'weekday',value->>'start',value->>'end')) from jsonb_array_elements(intervals))<>jsonb_array_length(intervals) then raise exception 'duplicate availability interval' using errcode='23505'; end if;
  if exists(
    with parsed as (select row_number() over() n,(value->>'weekday')::integer weekday,(value->>'start')::time starts,(value->>'end')::time ends from jsonb_array_elements(intervals))
    select 1 from parsed a join parsed b on a.n<b.n and a.weekday=b.weekday and a.starts<b.ends and b.starts<a.ends
  ) then raise exception 'availability intervals overlap' using errcode='23P01'; end if;
  delete from public.weekly_availability where organization_id=target_org_id and staff_profile_id=target_staff_id;
  insert into public.weekly_availability(id,organization_id,staff_profile_id,weekday,start_local,end_local,is_active)
  select md5(target_org_id::text||':'||target_staff_id::text||':'||(value->>'weekday')||':'||(value->>'start')||':'||(value->>'end'))::uuid,target_org_id,target_staff_id,(value->>'weekday')::smallint,(value->>'start')::time,(value->>'end')::time,true
  from jsonb_array_elements(intervals) order by (value->>'weekday')::integer,(value->>'start')::time,(value->>'end')::time;
  update public.onboarding_progress set availability_completed_at=coalesce(availability_completed_at,now()) where organization_id=target_org_id and service_completed_at is not null;
  update public.organizations set onboarding_step='review' where id=target_org_id;
end;
$$;

create or replace function public.complete_onboarding_review(target_org_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not private.is_draft_owner(target_org_id) then raise exception 'draft not found' using errcode='42501'; end if;
  perform 1 from public.organizations where id=target_org_id for update;
  if not private.onboarding_ready(target_org_id,false) then raise exception 'organization is not ready for review' using errcode='22023'; end if;
  update public.onboarding_progress set review_completed_at=coalesce(review_completed_at,now()) where organization_id=target_org_id;
  update public.organizations set onboarding_step='publish' where id=target_org_id;
end;
$$;

create or replace function public.publish_organization(target_org_id uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare public_slug text; current_status text;
begin
  if not private.is_onboarding_owner(target_org_id) then raise exception 'organization not found' using errcode='42501'; end if;
  select status,slug into current_status,public_slug from public.organizations where id=target_org_id for update;
  if current_status='published' then return public_slug; end if;
  if current_status not in ('draft','unpublished') or not private.onboarding_ready(target_org_id,true) then raise exception 'organization is not ready to publish' using errcode='22023'; end if;
  perform set_config('serviceflow.lifecycle_write','on',true);
  update public.organizations set status='published',published_at=now(),suspended_at=null,onboarding_step='complete' where id=target_org_id;
  update public.onboarding_progress set publish_completed_at=coalesce(publish_completed_at,now()) where organization_id=target_org_id;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes) values(target_org_id,(select auth.uid()),'user','owner','organization.published','organization',target_org_id,'Organization published.','{}');
  return public_slug;
end;
$$;

create or replace function public.unpublish_organization(target_org_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not private.is_onboarding_owner(target_org_id) then raise exception 'organization not found' using errcode='42501'; end if;
  perform 1 from public.organizations where id=target_org_id for update;
  if (select status from public.organizations where id=target_org_id)='unpublished' then return; end if;
  if (select status from public.organizations where id=target_org_id)<>'published' then raise exception 'organization is not published' using errcode='22023'; end if;
  perform set_config('serviceflow.lifecycle_write','on',true);
  update public.organizations set status='unpublished' where id=target_org_id;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes) values(target_org_id,(select auth.uid()),'user','owner','organization.unpublished','organization',target_org_id,'Organization unpublished.','{}');
end;
$$;

create or replace function public.get_public_business(public_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug',o.slug,'name',o.name,'city',o.city,'region',o.region,'countryCode',o.country_code,'timezone',o.timezone,'currency',o.currency,
    'staff',coalesce((select jsonb_agg(jsonb_build_object('displayName',sp.display_name,'bio',sp.bio,'jobTitle',sp.job_title) order by sp.display_name,sp.id) from public.staff_profiles sp join public.organization_memberships m on m.organization_id=sp.organization_id and m.id=sp.membership_id where sp.organization_id=o.id and sp.status='active' and sp.is_public and m.status='active'),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(jsonb_build_object('name',sv.name,'description',sv.description,'durationMinutes',sv.duration_minutes,'bufferMinutes',sv.buffer_after_minutes,'priceMinor',sv.price_minor) order by sv.name,sv.id) from public.services sv where sv.organization_id=o.id and sv.status='active' and sv.visibility='public' and exists(select 1 from public.service_staff ss join public.staff_profiles sp on sp.organization_id=ss.organization_id and sp.id=ss.staff_profile_id where ss.organization_id=o.id and ss.service_id=sv.id and ss.is_active and sp.status='active' and sp.is_public)),'[]'::jsonb),
    'availability',coalesce((select jsonb_agg(jsonb_build_object('weekday',w.weekday,'start',to_char(w.start_local,'HH24:MI'),'end',to_char(w.end_local,'HH24:MI')) order by w.weekday,w.start_local,w.end_local,w.id) from public.weekly_availability w join public.staff_profiles sp on sp.organization_id=w.organization_id and sp.id=w.staff_profile_id where w.organization_id=o.id and w.is_active and sp.status='active' and sp.is_public),'[]'::jsonb)
  ) from public.organizations o where o.slug=lower(btrim(public_slug)) and o.status='published' and o.suspended_at is null;
$$;

revoke all on function private.is_onboarding_owner(uuid) from public,anon,authenticated,service_role;
revoke all on function private.onboarding_ready(uuid,boolean) from public,anon,authenticated,service_role;
revoke all on function public.save_onboarding_staff_profile(uuid,text,text,text,boolean) from public,anon;
revoke all on function public.save_onboarding_service(uuid,text,text,integer,integer,bigint) from public,anon;
revoke all on function public.replace_onboarding_availability(uuid,jsonb) from public,anon;
revoke all on function public.complete_onboarding_review(uuid) from public,anon;
revoke all on function public.publish_organization(uuid) from public,anon;
revoke all on function public.unpublish_organization(uuid) from public,anon;
revoke all on function public.get_public_business(text) from public;
grant execute on function public.save_onboarding_staff_profile(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.save_onboarding_service(uuid,text,text,integer,integer,bigint) to authenticated;
grant execute on function public.replace_onboarding_availability(uuid,jsonb) to authenticated;
grant execute on function public.complete_onboarding_review(uuid) to authenticated;
grant execute on function public.publish_organization(uuid) to authenticated;
grant execute on function public.unpublish_organization(uuid) to authenticated;
grant execute on function public.get_public_business(text) to anon,authenticated;

commit;
