begin;
set local search_path = public, extensions;

select plan(31);

select has_table('public', 'user_profiles', 'user_profiles exists');
select has_table('public', 'organizations', 'organizations exists');
select has_table('public', 'organization_settings', 'organization_settings exists');
select has_table('public', 'organization_memberships', 'organization_memberships exists');
select has_table('public', 'services', 'services exists');
select has_table('public', 'staff_profiles', 'staff_profiles exists');
select has_table('public', 'service_staff', 'service_staff exists');
select has_table('public', 'weekly_availability', 'weekly_availability exists');
select has_table('public', 'blocked_times', 'blocked_times exists');
select has_table('public', 'client_records', 'client_records exists');
select has_table('public', 'audit_logs', 'audit_logs exists');

select ok(relrowsecurity, 'user_profiles has RLS enabled') from pg_class where oid = 'public.user_profiles'::regclass;
select ok(relrowsecurity, 'organizations has RLS enabled') from pg_class where oid = 'public.organizations'::regclass;
select ok(relrowsecurity, 'organization_settings has RLS enabled') from pg_class where oid = 'public.organization_settings'::regclass;
select ok(relrowsecurity, 'organization_memberships has RLS enabled') from pg_class where oid = 'public.organization_memberships'::regclass;
select ok(relrowsecurity, 'services has RLS enabled') from pg_class where oid = 'public.services'::regclass;
select ok(relrowsecurity, 'staff_profiles has RLS enabled') from pg_class where oid = 'public.staff_profiles'::regclass;
select ok(relrowsecurity, 'service_staff has RLS enabled') from pg_class where oid = 'public.service_staff'::regclass;
select ok(relrowsecurity, 'weekly_availability has RLS enabled') from pg_class where oid = 'public.weekly_availability'::regclass;
select ok(relrowsecurity, 'blocked_times has RLS enabled') from pg_class where oid = 'public.blocked_times'::regclass;
select ok(relrowsecurity, 'client_records has RLS enabled') from pg_class where oid = 'public.client_records'::regclass;
select ok(relrowsecurity, 'audit_logs has RLS enabled') from pg_class where oid = 'public.audit_logs'::regclass;

select col_is_pk('public', 'user_profiles', 'user_id', 'user profile is keyed by auth user');
select col_is_pk('public', 'organizations', 'id', 'organization uses a UUID primary key');
select col_is_pk('public', 'organization_settings', 'organization_id', 'settings are one-to-one with organization');
select col_is_pk('public', 'audit_logs', 'id', 'audit log uses a UUID primary key');

select has_trigger('auth', 'users', 'create_user_profile_after_auth_user', 'auth user profile trigger exists');
select has_trigger('public', 'audit_logs', 'audit_logs_prevent_update_delete', 'audit immutability trigger exists');
select has_trigger('public', 'organization_memberships', 'memberships_require_active_owner', 'final-owner trigger exists');

select results_eq(
  $$select count(*) from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon' and privilege_type in ('SELECT','INSERT','UPDATE','DELETE')$$,
  array[0::bigint],
  'anonymous role has no application table privileges'
);

select ok(
  not has_schema_privilege('authenticated', 'private', 'CREATE'),
  'authenticated role cannot create in private schema'
);

select * from finish();
rollback;
