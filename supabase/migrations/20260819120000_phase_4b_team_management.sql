create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  email_normalized text not null,
  role text not null default 'staff',
  status text not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint organization_invitations_org_id_key unique (organization_id, id),
  constraint organization_invitations_email_check check (
    email_normalized = lower(btrim(email_normalized))
    and email_normalized ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    and char_length(email_normalized) between 3 and 320
  ),
  constraint organization_invitations_role_check check (role = 'staff'),
  constraint organization_invitations_status_check check (status in ('pending', 'accepted', 'expired', 'revoked')),
  constraint organization_invitations_expiry_check check (expires_at > created_at),
  constraint organization_invitations_lifecycle_check check (
    (status = 'pending' and accepted_at is null and revoked_at is null)
    or (status = 'accepted' and accepted_at is not null and revoked_at is null)
    or (status = 'expired' and accepted_at is null and revoked_at is null)
    or (status = 'revoked' and accepted_at is null and revoked_at is not null)
  )
);

create unique index organization_invitations_pending_email_key
  on public.organization_invitations (organization_id, email_normalized)
  where status = 'pending';
create index organization_invitations_org_status_created_idx
  on public.organization_invitations (organization_id, status, created_at desc, id);

create trigger organization_invitations_set_updated_at
before update on public.organization_invitations
for each row execute function private.set_updated_at();

create or replace function private.protect_managed_team_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'staff_profiles' and exists (
    select 1 from public.organizations o where o.id = new.organization_id and o.status = 'draft'
  ) then
    return new;
  end if;
  if current_user = 'authenticated' then
    raise exception 'team writes require the managed workflow' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger protect_memberships_managed_writes
before update of organization_id, user_id, role, status on public.organization_memberships
for each row execute function private.protect_managed_team_writes();
create trigger protect_staff_profiles_managed_writes
before update of organization_id, membership_id, status on public.staff_profiles
for each row execute function private.protect_managed_team_writes();

alter table public.organization_invitations enable row level security;
revoke all on public.organization_invitations from anon, authenticated;
grant select on public.organization_invitations to authenticated;
grant all on public.organization_invitations to service_role;

create policy organization_invitations_select_owner on public.organization_invitations
for select to authenticated
using ((select private.has_org_role(organization_id, array['owner'])));

create or replace function private.require_team_owner(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.organizations o
    join public.organization_memberships m on m.organization_id = o.id
    join auth.users u on u.id = m.user_id
    join public.user_profiles p on p.user_id = u.id
    where o.id = target_org_id
      and o.status <> 'suspended'
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
      and m.status = 'active'
      and u.email_confirmed_at is not null
      and p.status = 'active'
  ) then
    raise exception 'organization not found' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.create_team_invitation(target_org_id uuid, invite_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := lower(btrim(invite_email));
  target_id uuid;
begin
  perform private.require_team_owner(target_org_id);
  if clean_email is null or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or char_length(clean_email) not between 3 and 320 then
    raise exception 'invalid invitation email' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_org_id::text || ':' || clean_email, 0));
  update public.organization_invitations
    set status = 'expired'
    where organization_id = target_org_id and email_normalized = clean_email
      and status = 'pending' and expires_at <= statement_timestamp();

  if exists (
    select 1 from public.organization_invitations
    where organization_id = target_org_id and email_normalized = clean_email and status = 'pending'
  ) then
    raise exception 'active invitation exists' using errcode = '23505';
  end if;
  if exists (
    select 1
    from public.organization_memberships m
    join auth.users u on u.id = m.user_id
    where m.organization_id = target_org_id and lower(u.email) = clean_email
  ) then
    raise exception 'membership exists' using errcode = '23505';
  end if;

  insert into public.organization_invitations (
    organization_id, email_normalized, role, status, invited_by, expires_at
  ) values (
    target_org_id, clean_email, 'staff', 'pending', (select auth.uid()), statement_timestamp() + interval '7 days'
  ) returning id into target_id;

  insert into public.audit_logs (organization_id, actor_user_id, actor_type, actor_role, action, target_type, target_id, summary, changes)
  values (target_org_id, (select auth.uid()), 'user', 'owner', 'team.invitation_created', 'organization_invitation', target_id, 'Team invitation created.', '{}');
  return target_id;
end;
$$;

create or replace function public.resend_team_invitation(target_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.organization_invitations%rowtype;
begin
  select * into invitation from public.organization_invitations where id = target_invitation_id for update;
  if invitation.id is null then raise exception 'invitation not found' using errcode = '42501'; end if;
  perform private.require_team_owner(invitation.organization_id);
  if invitation.status <> 'pending' or invitation.expires_at <= statement_timestamp() then
    if invitation.status = 'pending' then
      update public.organization_invitations set status = 'expired' where id = invitation.id;
    end if;
    raise exception 'invitation is not pending' using errcode = '22023';
  end if;
  if invitation.last_sent_at > statement_timestamp() - interval '30 seconds' then
    return invitation.email_normalized;
  end if;
  update public.organization_invitations
    set last_sent_at = statement_timestamp(), expires_at = statement_timestamp() + interval '7 days'
    where id = invitation.id;
  insert into public.audit_logs (organization_id, actor_user_id, actor_type, actor_role, action, target_type, target_id, summary, changes)
  values (invitation.organization_id, (select auth.uid()), 'user', 'owner', 'team.invitation_resent', 'organization_invitation', invitation.id, 'Team invitation resent.', '{}');
  return invitation.email_normalized;
end;
$$;

create or replace function public.revoke_team_invitation(target_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.organization_invitations%rowtype;
begin
  select * into invitation from public.organization_invitations where id = target_invitation_id for update;
  if invitation.id is null then raise exception 'invitation not found' using errcode = '42501'; end if;
  perform private.require_team_owner(invitation.organization_id);
  if invitation.status = 'revoked' then return invitation.status; end if;
  if invitation.status <> 'pending' then raise exception 'invitation cannot be revoked' using errcode = '22023'; end if;
  if invitation.expires_at <= statement_timestamp() then
    update public.organization_invitations set status = 'expired' where id = invitation.id;
    return 'expired';
  end if;
  update public.organization_invitations set status = 'revoked', revoked_at = statement_timestamp() where id = invitation.id;
  insert into public.audit_logs (organization_id, actor_user_id, actor_type, actor_role, action, target_type, target_id, summary, changes)
  values (invitation.organization_id, (select auth.uid()), 'user', 'owner', 'team.invitation_revoked', 'organization_invitation', invitation.id, 'Team invitation revoked.', '{}');
  return 'revoked';
end;
$$;

create or replace function public.accept_team_invitation(target_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.organization_invitations%rowtype;
  current_email text;
  accepted_membership_id uuid;
  profile_name text;
begin
  select lower(email), coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1))
    into current_email, profile_name from auth.users
    where id = (select auth.uid()) and email_confirmed_at is not null;
  if current_email is null then raise exception 'verified session required' using errcode = '42501'; end if;
  select * into invitation from public.organization_invitations where id = target_invitation_id for update;
  if invitation.id is null or invitation.email_normalized <> current_email then
    raise exception 'invitation not found' using errcode = '42501';
  end if;
  if invitation.status = 'accepted' then
    select id into accepted_membership_id from public.organization_memberships
      where organization_id = invitation.organization_id and user_id = (select auth.uid());
    if accepted_membership_id is not null then return accepted_membership_id; end if;
    raise exception 'invitation unavailable' using errcode = '42501';
  end if;
  if invitation.status <> 'pending' then raise exception 'invitation unavailable' using errcode = '22023'; end if;
  if invitation.expires_at <= statement_timestamp() then
    update public.organization_invitations set status = 'expired' where id = invitation.id;
    raise exception 'invitation expired' using errcode = '22023';
  end if;
  if not exists (select 1 from public.organizations where id = invitation.organization_id and status <> 'suspended') then
    raise exception 'invitation unavailable' using errcode = '42501';
  end if;

  select id into accepted_membership_id from public.organization_memberships
    where organization_id = invitation.organization_id and user_id = (select auth.uid()) for update;
  if accepted_membership_id is null then
    insert into public.organization_memberships (organization_id, user_id, role, status, invited_email, invited_by, accepted_at)
    values (invitation.organization_id, (select auth.uid()), 'staff', 'active', null, invitation.invited_by, statement_timestamp())
    returning id into accepted_membership_id;
  else
    update public.organization_memberships set role = 'staff', status = 'active', accepted_at = coalesce(accepted_at, statement_timestamp())
      where id = accepted_membership_id;
  end if;

  insert into public.staff_profiles (organization_id, membership_id, display_name, is_public, status)
    values (invitation.organization_id, accepted_membership_id, left(profile_name, 100), false, 'active')
    on conflict (organization_id, membership_id) do update set status = 'active';
  update public.organization_invitations set status = 'accepted', accepted_at = statement_timestamp() where id = invitation.id;
  insert into public.audit_logs (organization_id, actor_user_id, actor_type, actor_role, action, target_type, target_id, summary, changes)
  values (invitation.organization_id, (select auth.uid()), 'user', 'staff', 'team.invitation_accepted', 'organization_membership', accepted_membership_id, 'Team invitation accepted.', '{}');
  return accepted_membership_id;
end;
$$;

create or replace function public.get_owner_team(target_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_team_owner(target_org_id);
  return jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membershipId', m.id, 'email', u.email, 'role', m.role, 'membershipStatus', m.status,
        'acceptedAt', m.accepted_at, 'profileId', sp.id, 'displayName', sp.display_name,
        'jobTitle', sp.job_title, 'bio', sp.bio, 'isPublic', sp.is_public,
        'profileStatus', sp.status, 'profileUpdatedAt', sp.updated_at,
        'activeServiceCount', (select count(*) from public.service_staff ss where ss.organization_id = m.organization_id and ss.staff_profile_id = sp.id and ss.is_active)
      ) order by (m.status = 'active') desc, sp.display_name, m.id)
      from public.organization_memberships m
      join auth.users u on u.id = m.user_id
      left join public.staff_profiles sp on sp.organization_id = m.organization_id and sp.membership_id = m.id
      where m.organization_id = target_org_id and m.status in ('active', 'inactive')
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'email', i.email_normalized, 'role', i.role,
        'status', case when i.status = 'pending' and i.expires_at <= statement_timestamp() then 'expired' else i.status end,
        'expiresAt', i.expires_at, 'createdAt', i.created_at, 'lastSentAt', i.last_sent_at,
        'acceptedAt', i.accepted_at, 'revokedAt', i.revoked_at
      ) order by i.created_at desc, i.id)
      from public.organization_invitations i where i.organization_id = target_org_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_my_team_invitation(target_invitation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'organizationName', o.name, 'email', i.email_normalized,
    'status', case when i.status = 'pending' and i.expires_at <= statement_timestamp() then 'expired' else i.status end,
    'expiresAt', i.expires_at
  )
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  join auth.users u on u.id = (select auth.uid()) and u.email_confirmed_at is not null
  where i.id = target_invitation_id and i.email_normalized = lower(u.email);
$$;

create or replace function public.update_team_member_profile(
  target_membership_id uuid, profile_display_name text, profile_job_title text,
  profile_bio text, profile_is_public boolean, expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_org_id uuid;
  target_profile_id uuid;
  changed_at timestamptz;
begin
  select m.organization_id, sp.id into target_org_id, target_profile_id
    from public.organization_memberships m
    join public.staff_profiles sp on sp.organization_id = m.organization_id and sp.membership_id = m.id
    where m.id = target_membership_id;
  if target_org_id is null then raise exception 'member not found' using errcode = '42501'; end if;
  perform private.require_team_owner(target_org_id);
  update public.staff_profiles set
    display_name = btrim(profile_display_name), job_title = nullif(btrim(profile_job_title), ''),
    bio = nullif(btrim(profile_bio), ''), is_public = profile_is_public
    where id = target_profile_id and updated_at = expected_updated_at
    returning updated_at into changed_at;
  if changed_at is null then raise exception 'stale profile' using errcode = '40001'; end if;
  insert into public.audit_logs (organization_id, actor_user_id, actor_type, actor_role, action, target_type, target_id, summary, changes)
  values (target_org_id, (select auth.uid()), 'user', 'owner', 'team.profile_updated', 'staff_profile', target_profile_id, 'Team member profile updated.', '{}');
  return changed_at;
end;
$$;

create or replace function public.set_team_member_status(target_membership_id uuid, desired_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership public.organization_memberships%rowtype;
  target_profile_id uuid;
begin
  if desired_status not in ('active', 'inactive') then raise exception 'invalid member status' using errcode = '22023'; end if;
  select * into membership from public.organization_memberships where id = target_membership_id for update;
  if membership.id is null then raise exception 'member not found' using errcode = '42501'; end if;
  perform private.require_team_owner(membership.organization_id);
  if membership.status = desired_status then return desired_status; end if;
  if desired_status = 'inactive' and membership.role = 'owner' and not exists (
    select 1 from public.organization_memberships other
    where other.organization_id = membership.organization_id and other.role = 'owner'
      and other.status = 'active' and other.id <> membership.id
  ) then raise exception 'final active owner' using errcode = '23514'; end if;

  select id into target_profile_id from public.staff_profiles
    where organization_id = membership.organization_id and membership_id = membership.id for update;
  update public.organization_memberships set status = desired_status where id = membership.id;
  update public.staff_profiles set status = desired_status where id = target_profile_id;
  if desired_status = 'inactive' then
    update public.service_staff set is_active = false
      where organization_id = membership.organization_id and staff_profile_id = target_profile_id and is_active;
  end if;
  insert into public.audit_logs (organization_id, actor_user_id, actor_type, actor_role, action, target_type, target_id, summary, changes)
  values (membership.organization_id, (select auth.uid()), 'user', 'owner',
    case when desired_status = 'active' then 'team.member_activated' else 'team.member_deactivated' end,
    'organization_membership', membership.id,
    case when desired_status = 'active' then 'Team member activated.' else 'Team member deactivated.' end, '{}');
  return desired_status;
end;
$$;

revoke all on function private.require_team_owner(uuid) from public, anon, authenticated, service_role;
revoke all on function private.protect_managed_team_writes() from public, anon, authenticated, service_role;
revoke all on function public.create_team_invitation(uuid, text) from public, anon;
revoke all on function public.resend_team_invitation(uuid) from public, anon;
revoke all on function public.revoke_team_invitation(uuid) from public, anon;
revoke all on function public.accept_team_invitation(uuid) from public, anon;
revoke all on function public.update_team_member_profile(uuid, text, text, text, boolean, timestamptz) from public, anon;
revoke all on function public.set_team_member_status(uuid, text) from public, anon;
revoke all on function public.get_owner_team(uuid) from public, anon;
revoke all on function public.get_my_team_invitation(uuid) from public, anon;
grant execute on function public.create_team_invitation(uuid, text) to authenticated;
grant execute on function public.resend_team_invitation(uuid) to authenticated;
grant execute on function public.revoke_team_invitation(uuid) to authenticated;
grant execute on function public.accept_team_invitation(uuid) to authenticated;
grant execute on function public.update_team_member_profile(uuid, text, text, text, boolean, timestamptz) to authenticated;
grant execute on function public.set_team_member_status(uuid, text) to authenticated;
grant execute on function public.get_owner_team(uuid) to authenticated;
grant execute on function public.get_my_team_invitation(uuid) to authenticated;
