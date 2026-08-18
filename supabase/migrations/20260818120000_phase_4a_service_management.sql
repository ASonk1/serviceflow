begin;

create or replace function private.is_active_service_owner(target_org_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_verified_active_user()
    and exists (
      select 1
      from public.organizations o
      join public.organization_memberships m on m.organization_id = o.id
      where o.id = target_org_id
        and o.status in ('published','unpublished')
        and o.suspended_at is null
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
        and m.status = 'active'
    );
$$;

create or replace function public.create_managed_service(
  target_org_id uuid,
  service_name text,
  service_description text,
  service_duration integer,
  service_buffer integer,
  service_price_minor bigint
) returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare target_id uuid := gen_random_uuid(); org_currency text;
begin
  if not private.is_active_service_owner(target_org_id) then
    raise exception 'organization not found' using errcode = '42501';
  end if;
  select currency into org_currency from public.organizations where id = target_org_id for share;
  insert into public.services(id,organization_id,name,description,duration_minutes,buffer_after_minutes,price_minor,currency,payment_mode,deposit_minor,visibility,status)
  values(target_id,target_org_id,btrim(service_name),nullif(btrim(service_description),''),service_duration,service_buffer,service_price_minor,org_currency,'none',null,'public','active');
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(target_org_id,(select auth.uid()),'user','owner','service.created','service',target_id,'Service created.','{}');
  return target_id;
end;
$$;

create or replace function public.update_managed_service(
  target_service_id uuid,
  service_name text,
  service_description text,
  service_duration integer,
  service_buffer integer,
  service_price_minor bigint
) returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare target_org_id uuid;
begin
  select organization_id into target_org_id from public.services where id = target_service_id for update;
  if target_org_id is null or not private.is_active_service_owner(target_org_id) then
    raise exception 'service not found' using errcode = '42501';
  end if;
  update public.services set name=btrim(service_name),description=nullif(btrim(service_description),''),duration_minutes=service_duration,buffer_after_minutes=service_buffer,price_minor=service_price_minor where id=target_service_id;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(target_org_id,(select auth.uid()),'user','owner','service.updated','service',target_service_id,'Service updated.','{}');
  return target_service_id;
end;
$$;

create or replace function public.set_managed_service_status(target_service_id uuid, desired_status text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare target_org_id uuid; current_status text;
begin
  if desired_status not in ('active','archived') then raise exception 'invalid service status' using errcode='22023'; end if;
  select organization_id,status into target_org_id,current_status from public.services where id=target_service_id for update;
  if target_org_id is null or not private.is_active_service_owner(target_org_id) then raise exception 'service not found' using errcode='42501'; end if;
  if current_status = desired_status then return desired_status; end if;
  if current_status not in ('active','archived','draft') then raise exception 'invalid service transition' using errcode='22023'; end if;
  update public.services set status=desired_status where id=target_service_id;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(target_org_id,(select auth.uid()),'user','owner',case when desired_status='archived' then 'service.archived' else 'service.activated' end,'service',target_service_id,case when desired_status='archived' then 'Service archived.' else 'Service activated.' end,'{}');
  return desired_status;
end;
$$;

create or replace function public.set_managed_service_staff(target_service_id uuid,target_staff_id uuid,assigned boolean)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
declare target_org_id uuid; currently_assigned boolean;
begin
  select organization_id into target_org_id from public.services where id=target_service_id for update;
  if target_org_id is null or not private.is_active_service_owner(target_org_id) then raise exception 'service not found' using errcode='42501'; end if;
  if not exists (
    select 1 from public.staff_profiles sp
    join public.organization_memberships m on m.organization_id=sp.organization_id and m.id=sp.membership_id
    join auth.users u on u.id=m.user_id
    join public.user_profiles up on up.user_id=u.id
    where sp.id=target_staff_id and sp.organization_id=target_org_id and sp.status='active' and sp.is_public
      and m.status='active' and m.role in ('owner','staff') and u.email_confirmed_at is not null and up.status='active'
  ) then raise exception 'eligible staff profile not found' using errcode='42501'; end if;
  select is_active into currently_assigned from public.service_staff where organization_id=target_org_id and service_id=target_service_id and staff_profile_id=target_staff_id for update;
  if coalesce(currently_assigned,false)=assigned and (currently_assigned is not null or not assigned) then return assigned; end if;
  insert into public.service_staff(organization_id,service_id,staff_profile_id,is_active)
  values(target_org_id,target_service_id,target_staff_id,assigned)
  on conflict(service_id,staff_profile_id) do update set is_active=excluded.is_active;
  insert into public.audit_logs(organization_id,actor_user_id,actor_type,actor_role,action,target_type,target_id,summary,changes)
  values(target_org_id,(select auth.uid()),'user','owner',case when assigned then 'service.staff_assigned' else 'service.staff_unassigned' end,'service',target_service_id,case when assigned then 'Staff assigned to service.' else 'Staff unassigned from service.' end,'{}');
  return assigned;
end;
$$;

create or replace function private.protect_managed_service_writes()
returns trigger language plpgsql set search_path=''
as $$ begin
  if current_user = 'authenticated' then raise exception 'service writes require the managed workflow' using errcode='42501'; end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
create trigger protect_services_managed_writes before insert or update or delete on public.services for each row execute function private.protect_managed_service_writes();
create trigger protect_service_staff_managed_writes before insert or update or delete on public.service_staff for each row execute function private.protect_managed_service_writes();
revoke all on function private.is_active_service_owner(uuid) from public,anon,authenticated,service_role;
revoke all on function private.protect_managed_service_writes() from public,anon,authenticated,service_role;
revoke all on function public.create_managed_service(uuid,text,text,integer,integer,bigint) from public,anon;
revoke all on function public.update_managed_service(uuid,text,text,integer,integer,bigint) from public,anon;
revoke all on function public.set_managed_service_status(uuid,text) from public,anon;
revoke all on function public.set_managed_service_staff(uuid,uuid,boolean) from public,anon;
grant execute on function public.create_managed_service(uuid,text,text,integer,integer,bigint) to authenticated;
grant execute on function public.update_managed_service(uuid,text,text,integer,integer,bigint) to authenticated;
grant execute on function public.set_managed_service_status(uuid,text) to authenticated;
grant execute on function public.set_managed_service_staff(uuid,uuid,boolean) to authenticated;

commit;
