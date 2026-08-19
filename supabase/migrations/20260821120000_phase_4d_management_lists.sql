-- Phase 4D: bounded, tenant-authorized management list read models.

create or replace function private.validate_list_window(target_limit integer, target_offset integer)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if target_limit not in (5, 10, 20) or target_offset < 0 or target_offset > 199980 then
    raise exception 'invalid list window' using errcode = '22023';
  end if;
end; $$;

create or replace function public.list_managed_services(
  target_org_id uuid, search_text text default '', status_filter text default 'all',
  sort_field text default 'name', sort_direction text default 'asc',
  target_limit integer default 10, target_offset integer default 0
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.require_team_owner(target_org_id);
  perform private.validate_list_window(target_limit, target_offset);
  if char_length(search_text) > 100 or status_filter not in ('all','draft','active','archived')
    or sort_field not in ('name','status','price','updated') or sort_direction not in ('asc','desc') then
    raise exception 'invalid list query' using errcode = '22023';
  end if;
  with filtered as (
    select s.id, s.name, s.description, s.duration_minutes, s.buffer_after_minutes,
      s.price_minor, s.status, s.updated_at,
      (select count(*) from public.service_staff ss where ss.organization_id=s.organization_id and ss.service_id=s.id and ss.is_active) as active_staff_count
    from public.services s
    where s.organization_id=target_org_id
      and (status_filter='all' or s.status=status_filter)
      and (btrim(search_text)='' or s.name ilike '%'||btrim(search_text)||'%' or coalesce(s.description,'') ilike '%'||btrim(search_text)||'%')
  ), ordered as (
    select * from filtered
    order by
      case when sort_field='name' and sort_direction='asc' then lower(name) end asc,
      case when sort_field='name' and sort_direction='desc' then lower(name) end desc,
      case when sort_field='status' and sort_direction='asc' then status end asc,
      case when sort_field='status' and sort_direction='desc' then status end desc,
      case when sort_field='price' and sort_direction='asc' then price_minor end asc,
      case when sort_field='price' and sort_direction='desc' then price_minor end desc,
      case when sort_field='updated' and sort_direction='asc' then updated_at end asc,
      case when sort_field='updated' and sort_direction='desc' then updated_at end desc,
      id asc limit target_limit offset target_offset
  ) select jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(ordered) order by
        case when sort_field='name' and sort_direction='asc' then lower(name) end asc,
        case when sort_field='name' and sort_direction='desc' then lower(name) end desc,
        case when sort_field='status' and sort_direction='asc' then status end asc,
        case when sort_field='status' and sort_direction='desc' then status end desc,
        case when sort_field='price' and sort_direction='asc' then price_minor end asc,
        case when sort_field='price' and sort_direction='desc' then price_minor end desc,
        case when sort_field='updated' and sort_direction='asc' then updated_at end asc,
        case when sort_field='updated' and sort_direction='desc' then updated_at end desc, id) from ordered), '[]'::jsonb),
      'total', (select count(*) from filtered),
      'organizationTotal', (select count(*) from public.services where organization_id=target_org_id)
    ) into result;
  return result;
end; $$;

create or replace function public.list_owner_team_members(
  target_org_id uuid, search_text text default '', role_filter text default 'all', status_filter text default 'all',
  sort_field text default 'name', sort_direction text default 'asc', target_limit integer default 10, target_offset integer default 0
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.require_team_owner(target_org_id);
  perform private.validate_list_window(target_limit,target_offset);
  if char_length(search_text)>100 or role_filter not in ('all','owner','staff') or status_filter not in ('all','active','inactive')
    or sort_field not in ('name','role','status','services') or sort_direction not in ('asc','desc') then
    raise exception 'invalid list query' using errcode='22023'; end if;
  with filtered as (
    select m.id as membership_id, u.email, m.role, m.status as membership_status, m.accepted_at,
      sp.id as profile_id, sp.display_name, sp.job_title, sp.bio, sp.is_public, sp.status as profile_status, sp.updated_at as profile_updated_at,
      (select count(*) from public.service_staff ss where ss.organization_id=m.organization_id and ss.staff_profile_id=sp.id and ss.is_active) as active_service_count
    from public.organization_memberships m join auth.users u on u.id=m.user_id
    left join public.staff_profiles sp on sp.organization_id=m.organization_id and sp.membership_id=m.id
    where m.organization_id=target_org_id and m.status in ('active','inactive')
      and (role_filter='all' or m.role=role_filter) and (status_filter='all' or m.status=status_filter)
      and (btrim(search_text)='' or coalesce(sp.display_name,'') ilike '%'||btrim(search_text)||'%'
        or coalesce(sp.job_title,'') ilike '%'||btrim(search_text)||'%' or u.email ilike '%'||btrim(search_text)||'%')
  ), ordered as (
    select * from filtered order by
      case when sort_field='name' and sort_direction='asc' then lower(coalesce(display_name,email)) end asc,
      case when sort_field='name' and sort_direction='desc' then lower(coalesce(display_name,email)) end desc,
      case when sort_field='role' and sort_direction='asc' then role end asc,
      case when sort_field='role' and sort_direction='desc' then role end desc,
      case when sort_field='status' and sort_direction='asc' then membership_status end asc,
      case when sort_field='status' and sort_direction='desc' then membership_status end desc,
      case when sort_field='services' and sort_direction='asc' then active_service_count end asc,
      case when sort_field='services' and sort_direction='desc' then active_service_count end desc,
      membership_id asc limit target_limit offset target_offset
  ) select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object(
      'membershipId',membership_id,'email',email,'role',role,'membershipStatus',membership_status,'acceptedAt',accepted_at,
      'profileId',profile_id,'displayName',display_name,'jobTitle',job_title,'bio',bio,'isPublic',is_public,
      'profileStatus',profile_status,'profileUpdatedAt',profile_updated_at,'activeServiceCount',active_service_count
    ) order by
      case when sort_field='name' and sort_direction='asc' then lower(coalesce(display_name,email)) end asc,
      case when sort_field='name' and sort_direction='desc' then lower(coalesce(display_name,email)) end desc,
      case when sort_field='role' and sort_direction='asc' then role end asc,
      case when sort_field='role' and sort_direction='desc' then role end desc,
      case when sort_field='status' and sort_direction='asc' then membership_status end asc,
      case when sort_field='status' and sort_direction='desc' then membership_status end desc,
      case when sort_field='services' and sort_direction='asc' then active_service_count end asc,
      case when sort_field='services' and sort_direction='desc' then active_service_count end desc, membership_id asc),'[]'::jsonb),'total',(select count(*) from filtered),
    'organizationTotal',(select count(*) from public.organization_memberships where organization_id=target_org_id and status in ('active','inactive'))) into result from ordered;
  return result;
end; $$;

create or replace function public.list_owner_invitations(
  target_org_id uuid, search_text text default '', status_filter text default 'all',
  sort_field text default 'created', sort_direction text default 'desc', target_limit integer default 10, target_offset integer default 0
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.require_team_owner(target_org_id); perform private.validate_list_window(target_limit,target_offset);
  if char_length(search_text)>100 or status_filter not in ('all','pending','accepted','expired','revoked')
    or sort_field not in ('email','status','created','expires') or sort_direction not in ('asc','desc') then
    raise exception 'invalid list query' using errcode='22023'; end if;
  with projected as (
    select i.*, case when i.status='pending' and i.expires_at<=statement_timestamp() then 'expired' else i.status end as effective_status
    from public.organization_invitations i where i.organization_id=target_org_id
  ), filtered as (
    select * from projected where (status_filter='all' or effective_status=status_filter)
      and (btrim(search_text)='' or email_normalized ilike '%'||btrim(search_text)||'%')
  ), ordered as (
    select * from filtered order by
      case when sort_field='email' and sort_direction='asc' then email_normalized end asc,
      case when sort_field='email' and sort_direction='desc' then email_normalized end desc,
      case when sort_field='status' and sort_direction='asc' then effective_status end asc,
      case when sort_field='status' and sort_direction='desc' then effective_status end desc,
      case when sort_field='created' and sort_direction='asc' then created_at end asc,
      case when sort_field='created' and sort_direction='desc' then created_at end desc,
      case when sort_field='expires' and sort_direction='asc' then expires_at end asc,
      case when sort_field='expires' and sort_direction='desc' then expires_at end desc,
      id asc limit target_limit offset target_offset
  ) select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'email',email_normalized,'role',role,'status',effective_status,'expiresAt',expires_at,
      'createdAt',created_at,'lastSentAt',last_sent_at,'acceptedAt',accepted_at,'revokedAt',revoked_at
    ) order by
      case when sort_field='email' and sort_direction='asc' then email_normalized end asc,
      case when sort_field='email' and sort_direction='desc' then email_normalized end desc,
      case when sort_field='status' and sort_direction='asc' then effective_status end asc,
      case when sort_field='status' and sort_direction='desc' then effective_status end desc,
      case when sort_field='created' and sort_direction='asc' then created_at end asc,
      case when sort_field='created' and sort_direction='desc' then created_at end desc,
      case when sort_field='expires' and sort_direction='asc' then expires_at end asc,
      case when sort_field='expires' and sort_direction='desc' then expires_at end desc, id asc),'[]'::jsonb),'total',(select count(*) from filtered),
    'organizationTotal',(select count(*) from projected)) into result from ordered;
  return result;
end; $$;

create or replace function public.list_schedule_members(
  target_org_id uuid, search_text text default '', sort_field text default 'name', sort_direction text default 'asc',
  target_limit integer default 10, target_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor_role text; result jsonb;
begin
  perform private.validate_list_window(target_limit,target_offset);
  select m.role into actor_role from public.organization_memberships m
  join public.organizations o on o.id=m.organization_id join auth.users u on u.id=m.user_id
  join public.user_profiles p on p.user_id=m.user_id
  where m.organization_id=target_org_id and m.user_id=(select auth.uid()) and m.status='active' and m.accepted_at is not null
    and m.role in ('owner','staff') and o.status in ('published','unpublished') and o.published_at is not null
    and u.email_confirmed_at is not null and p.status='active';
  if actor_role is null then raise exception 'schedules unavailable' using errcode='42501'; end if;
  if char_length(search_text)>100 or sort_field not in ('name','role') or sort_direction not in ('asc','desc') then
    raise exception 'invalid list query' using errcode='22023'; end if;
  with eligible as (
    select sp.id,sp.display_name,sp.job_title,tm.role from public.staff_profiles sp
    join public.organization_memberships tm on tm.id=sp.membership_id and tm.organization_id=sp.organization_id
    where sp.organization_id=target_org_id and sp.status='active' and tm.status='active' and tm.accepted_at is not null
      and (actor_role='owner' or tm.user_id=(select auth.uid()))
  ), filtered as (
    select * from eligible where btrim(search_text)='' or display_name ilike '%'||btrim(search_text)||'%'
      or coalesce(job_title,'') ilike '%'||btrim(search_text)||'%'
  ), ordered as (
    select * from filtered order by
      case when sort_field='name' and sort_direction='asc' then lower(display_name) end asc,
      case when sort_field='name' and sort_direction='desc' then lower(display_name) end desc,
      case when sort_field='role' and sort_direction='asc' then role end asc,
      case when sort_field='role' and sort_direction='desc' then role end desc,
      id asc limit target_limit offset target_offset
  ) select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(ordered) order by
      case when sort_field='name' and sort_direction='asc' then lower(display_name) end asc,
      case when sort_field='name' and sort_direction='desc' then lower(display_name) end desc,
      case when sort_field='role' and sort_direction='asc' then role end asc,
      case when sort_field='role' and sort_direction='desc' then role end desc, id asc),'[]'::jsonb),
    'total',(select count(*) from filtered),'organizationTotal',(select count(*) from eligible)) into result from ordered;
  return result;
end; $$;

revoke all on function private.validate_list_window(integer,integer) from public,anon,authenticated,service_role;
revoke all on function public.list_managed_services(uuid,text,text,text,text,integer,integer) from public,anon;
revoke all on function public.list_owner_team_members(uuid,text,text,text,text,text,integer,integer) from public,anon;
revoke all on function public.list_owner_invitations(uuid,text,text,text,text,integer,integer) from public,anon;
revoke all on function public.list_schedule_members(uuid,text,text,text,integer,integer) from public,anon;
grant execute on function public.list_managed_services(uuid,text,text,text,text,integer,integer) to authenticated;
grant execute on function public.list_owner_team_members(uuid,text,text,text,text,text,integer,integer) to authenticated;
grant execute on function public.list_owner_invitations(uuid,text,text,text,text,integer,integer) to authenticated;
grant execute on function public.list_schedule_members(uuid,text,text,text,integer,integer) to authenticated;
