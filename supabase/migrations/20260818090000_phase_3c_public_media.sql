begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('serviceflow-public-media','serviceflow-public-media',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set name=excluded.name,public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.is_valid_public_media_path(object_name text)
returns boolean language sql immutable set search_path='' as $$
  select object_name ~ '^organizations/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(branding/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|staff/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$';
$$;

create or replace function private.can_manage_public_media(object_name text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare target_org uuid; target_staff uuid; pieces text[];
begin
  if not private.is_verified_active_user() or not private.is_valid_public_media_path(object_name) then return false; end if;
  pieces:=string_to_array(object_name,'/');
  begin target_org:=pieces[2]::uuid; exception when others then return false; end;
  if not exists(select 1 from public.organizations o join public.organization_memberships m on m.organization_id=o.id where o.id=target_org and o.status<>'suspended' and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active') then return false; end if;
  if pieces[3]='staff' then
    begin target_staff:=pieces[4]::uuid; exception when others then return false; end;
    return exists(select 1 from public.staff_profiles sp where sp.id=target_staff and sp.organization_id=target_org);
  end if;
  return pieces[3]='branding';
end;
$$;

create policy public_media_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='serviceflow-public-media' and private.can_manage_public_media(name));
create policy public_media_owner_update on storage.objects for update to authenticated
using(bucket_id='serviceflow-public-media' and private.can_manage_public_media(name))
with check(bucket_id='serviceflow-public-media' and private.can_manage_public_media(name)
);
create policy public_media_owner_delete on storage.objects for delete to authenticated
using(bucket_id='serviceflow-public-media' and private.can_manage_public_media(name));

create or replace function private.protect_media_references()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (select auth.role())='authenticated'
    and (case when tg_op='INSERT' then to_jsonb(new)->>tg_argv[0] is not null
              else to_jsonb(new)->>tg_argv[0] is distinct from to_jsonb(old)->>tg_argv[0] end)
    and current_setting('serviceflow.media_reference_write',true) is distinct from 'on' then
    raise exception 'media references require the validated media workflow' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger protect_organization_logo_before_write before insert or update of logo_path on public.organizations for each row execute function private.protect_media_references('logo_path');
create trigger protect_staff_avatar_before_write before insert or update of avatar_path on public.staff_profiles for each row execute function private.protect_media_references('avatar_path');

create or replace function private.validate_media_object(target_org_id uuid,target_staff_id uuid,object_path text,media_kind text)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_onboarding_owner(target_org_id)
    and private.is_valid_public_media_path(object_path)
    and case when media_kind='logo' then object_path ~ ('^organizations/'||target_org_id::text||'/branding/[0-9a-f-]{36}\.(jpg|png|webp)$')
             when media_kind='avatar' then target_staff_id is not null and object_path ~ ('^organizations/'||target_org_id::text||'/staff/'||target_staff_id::text||'/[0-9a-f-]{36}\.(jpg|png|webp)$')
             else false end
    and exists(select 1 from storage.objects so where so.bucket_id='serviceflow-public-media' and so.name=object_path
      and coalesce(so.metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp')
      and coalesce(so.metadata->>'size','') ~ '^[0-9]+$'
      and (so.metadata->>'size')::bigint between 1 and 2097152);
$$;

create or replace function public.set_organization_logo(target_org_id uuid,object_path text default null)
returns text language plpgsql volatile security definer set search_path='' as $$
declare previous_path text;
begin
  if not private.is_onboarding_owner(target_org_id) then raise exception 'organization not found' using errcode='42501'; end if;
  select logo_path into previous_path from public.organizations where id=target_org_id for update;
  if object_path is not null and not private.validate_media_object(target_org_id,null,object_path,'logo') then raise exception 'invalid or missing logo object' using errcode='22023'; end if;
  if previous_path is not distinct from object_path then return previous_path; end if;
  perform set_config('serviceflow.media_reference_write','on',true);
  update public.organizations set logo_path=object_path where id=target_org_id;
  perform set_config('serviceflow.media_reference_write','off',true);
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(target_org_id,(select auth.uid()),'user','owner',case when object_path is null then 'organization.logo_removed' else 'organization.logo_updated' end,'organization',target_org_id,case when object_path is null then 'Organization logo removed.' else 'Organization logo updated.' end,'{}');
  return previous_path;
end;
$$;

create or replace function public.set_staff_avatar(target_org_id uuid,target_staff_id uuid,object_path text default null)
returns text language plpgsql volatile security definer set search_path='' as $$
declare previous_path text;
begin
  if not private.is_onboarding_owner(target_org_id) or not exists(select 1 from public.staff_profiles sp where sp.id=target_staff_id and sp.organization_id=target_org_id and sp.status='active') then raise exception 'staff profile not found' using errcode='42501'; end if;
  select avatar_path into previous_path from public.staff_profiles where id=target_staff_id and organization_id=target_org_id for update;
  if object_path is not null and not private.validate_media_object(target_org_id,target_staff_id,object_path,'avatar') then raise exception 'invalid or missing avatar object' using errcode='22023'; end if;
  if previous_path is not distinct from object_path then return previous_path; end if;
  perform set_config('serviceflow.media_reference_write','on',true);
  update public.staff_profiles set avatar_path=object_path where id=target_staff_id and organization_id=target_org_id;
  perform set_config('serviceflow.media_reference_write','off',true);
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(target_org_id,(select auth.uid()),'user','owner',case when object_path is null then 'staff.avatar_removed' else 'staff.avatar_updated' end,'staff_profile',target_staff_id,case when object_path is null then 'Staff avatar removed.' else 'Staff avatar updated.' end,'{}');
  return previous_path;
end;
$$;

create or replace function public.get_public_business(public_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'slug',o.slug,'name',o.name,'city',o.city,'region',o.region,'countryCode',o.country_code,'timezone',o.timezone,'currency',o.currency,'logoPath',o.logo_path,
    'staff',coalesce((select jsonb_agg(jsonb_build_object('displayName',sp.display_name,'bio',sp.bio,'jobTitle',sp.job_title,'avatarPath',sp.avatar_path) order by sp.display_name,sp.id) from public.staff_profiles sp join public.organization_memberships m on m.organization_id=sp.organization_id and m.id=sp.membership_id where sp.organization_id=o.id and sp.status='active' and sp.is_public and m.status='active'),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(jsonb_build_object('name',sv.name,'description',sv.description,'durationMinutes',sv.duration_minutes,'bufferMinutes',sv.buffer_after_minutes,'priceMinor',sv.price_minor) order by sv.name,sv.id) from public.services sv where sv.organization_id=o.id and sv.status='active' and sv.visibility='public' and exists(select 1 from public.service_staff ss join public.staff_profiles sp on sp.organization_id=ss.organization_id and sp.id=ss.staff_profile_id where ss.organization_id=o.id and ss.service_id=sv.id and ss.is_active and sp.status='active' and sp.is_public)),'[]'::jsonb),
    'availability',coalesce((select jsonb_agg(jsonb_build_object('weekday',w.weekday,'start',to_char(w.start_local,'HH24:MI'),'end',to_char(w.end_local,'HH24:MI')) order by w.weekday,w.start_local,w.end_local,w.id) from public.weekly_availability w join public.staff_profiles sp on sp.organization_id=w.organization_id and sp.id=w.staff_profile_id where w.organization_id=o.id and w.is_active and sp.status='active' and sp.is_public),'[]'::jsonb)
  ) from public.organizations o where o.slug=lower(btrim(public_slug)) and o.status='published' and o.suspended_at is null;
$$;

revoke all on function private.is_valid_public_media_path(text) from public,anon,authenticated,service_role;
revoke all on function private.can_manage_public_media(text) from public,anon,authenticated,service_role;
revoke all on function private.protect_media_references() from public,anon,authenticated,service_role;
revoke all on function private.validate_media_object(uuid,uuid,text,text) from public,anon,authenticated,service_role;
revoke all on function public.set_organization_logo(uuid,text) from public,anon;
revoke all on function public.set_staff_avatar(uuid,uuid,text) from public,anon;
grant execute on function public.set_organization_logo(uuid,text) to authenticated;
grant execute on function public.set_staff_avatar(uuid,uuid,text) to authenticated;
grant execute on function private.can_manage_public_media(text) to authenticated;

commit;
