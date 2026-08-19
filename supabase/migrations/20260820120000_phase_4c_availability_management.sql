-- Phase 4C: managed recurring availability and one-off blocked time.

create or replace function private.require_schedule_access(target_staff_profile_id uuid)
returns table (organization_id uuid, actor_role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
  select sp.organization_id, m.role
  from public.staff_profiles sp
  join public.organization_memberships target_m on target_m.id=sp.membership_id and target_m.organization_id=sp.organization_id
  join public.organization_memberships m on m.organization_id=sp.organization_id
  join public.organizations o on o.id=sp.organization_id
  where sp.id=target_staff_profile_id and sp.status='active'
    and target_m.status='active' and target_m.accepted_at is not null
    and m.user_id=(select auth.uid()) and m.status='active' and m.accepted_at is not null
    and m.role in ('owner','staff') and o.status in ('published','unpublished') and o.published_at is not null
    and (m.role='owner' or target_m.user_id=(select auth.uid()));
  if not found then raise exception 'schedule unavailable' using errcode='42501'; end if;
end; $$;

create or replace function private.protect_managed_schedule_writes()
returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('authenticated','anon') then
    raise exception 'schedule changes require a managed operation' using errcode='42501';
  end if;
  return coalesce(new,old);
end; $$;

create trigger protect_weekly_availability_managed_writes
before insert or update or delete on public.weekly_availability
for each row execute function private.protect_managed_schedule_writes();
create trigger protect_blocked_times_managed_writes
before insert or update or delete on public.blocked_times
for each row execute function private.protect_managed_schedule_writes();

create or replace function public.create_weekly_availability(target_staff_profile_id uuid, target_weekday integer, target_start time, target_end time)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare access record; new_id uuid:=gen_random_uuid();
begin
  select * into access from private.require_schedule_access(target_staff_profile_id);
  if target_weekday not between 1 and 7 or target_start>=target_end
    or extract(second from target_start)<>0 or extract(second from target_end)<>0
    or mod(extract(minute from target_start)::integer,5)<>0 or mod(extract(minute from target_end)::integer,5)<>0
  then raise exception 'invalid interval' using errcode='22023'; end if;
  insert into public.weekly_availability(id,organization_id,staff_profile_id,weekday,start_local,end_local)
  values(new_id,access.organization_id,target_staff_profile_id,target_weekday,target_start,target_end);
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(access.organization_id,(select auth.uid()),'user',access.actor_role,'availability.created','weekly_availability',new_id,'Weekly availability interval created.','{}');
  return new_id;
end; $$;

create or replace function public.update_weekly_availability(target_interval_id uuid, target_weekday integer, target_start time, target_end time, expected_updated_at timestamptz)
returns void language plpgsql volatile security definer set search_path='' as $$
declare item public.weekly_availability; access record;
begin
  select * into item from public.weekly_availability where id=target_interval_id for update;
  if not found then raise exception 'interval unavailable' using errcode='42501'; end if;
  select * into access from private.require_schedule_access(item.staff_profile_id);
  if item.updated_at<>expected_updated_at then raise exception 'stale interval' using errcode='40001'; end if;
  if target_weekday not between 1 and 7 or target_start>=target_end
    or extract(second from target_start)<>0 or extract(second from target_end)<>0
    or mod(extract(minute from target_start)::integer,5)<>0 or mod(extract(minute from target_end)::integer,5)<>0
  then raise exception 'invalid interval' using errcode='22023'; end if;
  update public.weekly_availability set weekday=target_weekday,start_local=target_start,end_local=target_end where id=item.id;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(access.organization_id,(select auth.uid()),'user',access.actor_role,'availability.updated','weekly_availability',item.id,'Weekly availability interval updated.','{}');
end; $$;

create or replace function public.delete_weekly_availability(target_interval_id uuid, expected_updated_at timestamptz)
returns void language plpgsql volatile security definer set search_path='' as $$
declare item public.weekly_availability; access record;
begin
  select * into item from public.weekly_availability where id=target_interval_id for update;
  if not found then raise exception 'interval unavailable' using errcode='42501'; end if;
  select * into access from private.require_schedule_access(item.staff_profile_id);
  if item.updated_at<>expected_updated_at then raise exception 'stale interval' using errcode='40001'; end if;
  delete from public.weekly_availability where id=item.id;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(access.organization_id,(select auth.uid()),'user',access.actor_role,'availability.deleted','weekly_availability',item.id,'Weekly availability interval removed.','{}');
end; $$;

create or replace function public.create_blocked_time(target_staff_profile_id uuid, target_starts_at timestamptz, target_ends_at timestamptz, target_reason text default null)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare access record; new_id uuid:=gen_random_uuid(); clean_reason text:=nullif(btrim(target_reason),'');
begin
  select * into access from private.require_schedule_access(target_staff_profile_id);
  if target_starts_at>=target_ends_at or char_length(clean_reason)>500 then raise exception 'invalid block' using errcode='22023'; end if;
  insert into public.blocked_times(id,organization_id,staff_profile_id,starts_at,ends_at,reason,created_by)
  values(new_id,access.organization_id,target_staff_profile_id,target_starts_at,target_ends_at,clean_reason,(select auth.uid()));
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(access.organization_id,(select auth.uid()),'user',access.actor_role,'blocked_time.created','blocked_time',new_id,'Blocked time created.','{}');
  return new_id;
end; $$;

create or replace function public.update_blocked_time(target_block_id uuid, target_starts_at timestamptz, target_ends_at timestamptz, target_reason text, expected_updated_at timestamptz)
returns void language plpgsql volatile security definer set search_path='' as $$
declare item public.blocked_times; access record; clean_reason text:=nullif(btrim(target_reason),'');
begin
  select * into item from public.blocked_times where id=target_block_id for update;
  if not found then raise exception 'block unavailable' using errcode='42501'; end if;
  select * into access from private.require_schedule_access(item.staff_profile_id);
  if item.updated_at<>expected_updated_at then raise exception 'stale block' using errcode='40001'; end if;
  if target_starts_at>=target_ends_at or char_length(clean_reason)>500 then raise exception 'invalid block' using errcode='22023'; end if;
  update public.blocked_times set starts_at=target_starts_at,ends_at=target_ends_at,reason=clean_reason where id=item.id;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(access.organization_id,(select auth.uid()),'user',access.actor_role,'blocked_time.updated','blocked_time',item.id,'Blocked time updated.','{}');
end; $$;

create or replace function public.delete_blocked_time(target_block_id uuid, expected_updated_at timestamptz)
returns void language plpgsql volatile security definer set search_path='' as $$
declare item public.blocked_times; access record;
begin
  select * into item from public.blocked_times where id=target_block_id for update;
  if not found then raise exception 'block unavailable' using errcode='42501'; end if;
  select * into access from private.require_schedule_access(item.staff_profile_id);
  if item.updated_at<>expected_updated_at then raise exception 'stale block' using errcode='40001'; end if;
  delete from public.blocked_times where id=item.id;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(access.organization_id,(select auth.uid()),'user',access.actor_role,'blocked_time.deleted','blocked_time',item.id,'Blocked time removed.','{}');
end; $$;

revoke all on function private.require_schedule_access(uuid), private.protect_managed_schedule_writes() from public,anon,authenticated,service_role;
revoke all on function public.create_weekly_availability(uuid,integer,time,time), public.update_weekly_availability(uuid,integer,time,time,timestamptz), public.delete_weekly_availability(uuid,timestamptz), public.create_blocked_time(uuid,timestamptz,timestamptz,text), public.update_blocked_time(uuid,timestamptz,timestamptz,text,timestamptz), public.delete_blocked_time(uuid,timestamptz) from public,anon;
grant execute on function public.create_weekly_availability(uuid,integer,time,time), public.update_weekly_availability(uuid,integer,time,time,timestamptz), public.delete_weekly_availability(uuid,timestamptz), public.create_blocked_time(uuid,timestamptz,timestamptz,text), public.update_blocked_time(uuid,timestamptz,timestamptz,text,timestamptz), public.delete_blocked_time(uuid,timestamptz) to authenticated;
