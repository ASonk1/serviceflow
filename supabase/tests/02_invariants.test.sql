begin;
set local search_path = public, extensions;

select plan(15);

select is(
  (select platform_role from public.user_profiles where user_id = '00000000-0000-4000-8000-000000000001'),
  'platform_admin',
  'trusted seed promotes the platform admin explicitly'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000009999', 'metadata.attack@serviceflow.invalid', '{"display_name":"Metadata Attack Fixture","platform_role":"platform_admin","status":"disabled"}');
select is(
  (select platform_role || ':' || status from public.user_profiles where user_id = '00000000-0000-4000-8000-000000009999'),
  'user:active',
  'profile trigger ignores protected user metadata'
);

select throws_ok(
  $$insert into public.organizations (id, slug, name, timezone, currency, status) values ('90000000-0000-4000-8000-000000000001', 'admin', 'Reserved Fixture', 'UTC', 'USD', 'draft')$$,
  '23514', null,
  'reserved organization slug is rejected'
);

select throws_ok(
  $$insert into public.services (organization_id, name, duration_minutes, price_minor, currency) values ('10000000-0000-4000-8000-000000000001', 'Wrong Currency', 30, 100, 'EUR')$$,
  '23503', null,
  'service currency must match its organization'
);

select throws_ok(
  $$insert into public.weekly_availability (organization_id, staff_profile_id, weekday, start_local, end_local) values ('10000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000102', 0, '07:00', '08:00')$$,
  '23514', null,
  'weekday zero is rejected'
);

select throws_ok(
  $$insert into public.weekly_availability (organization_id, staff_profile_id, weekday, start_local, end_local) values ('10000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000102', 1, '10:00', '12:00')$$,
  '23P01', null,
  'overlapping active weekly availability is rejected'
);

select throws_ok(
  $$insert into public.service_staff (organization_id, service_id, staff_profile_id) values ('10000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000101', '24000000-0000-4000-8000-000000000202')$$,
  '23503', null,
  'cross-tenant service/staff relationship is rejected'
);

select throws_ok(
  $$insert into public.staff_profiles (organization_id, membership_id, display_name) values ('10000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000202', 'Forged Staff')$$,
  '23514', null,
  'cross-tenant staff membership is rejected before persistence'
);

set constraints memberships_require_active_owner immediate;
select throws_ok(
  $$update public.organization_memberships set status = 'inactive' where id = '11000000-0000-4000-8000-000000000101'$$,
  '23514', null,
  'final active owner cannot be deactivated'
);
set constraints memberships_require_active_owner deferred;

select throws_ok(
  $$update public.audit_logs set summary = 'Tampered' where id = '17000000-0000-4000-8000-000000000101'$$,
  '42501', 'audit logs are append-only',
  'audit rows cannot be updated even by database maintenance roles'
);
select throws_ok(
  $$delete from public.audit_logs where id = '17000000-0000-4000-8000-000000000101'$$,
  '42501', 'audit logs are append-only',
  'audit rows cannot be deleted even by database maintenance roles'
);

select is((select count(*) from public.organizations), 3::bigint, 'three deterministic fictional organizations are seeded');
select is((select count(*) from public.user_profiles), 11::bigint, 'all seeded and test auth identities have profiles');
select is((select count(*) from public.organization_memberships where status = 'invited' and user_id is null), 1::bigint, 'pending invitation keeps a null user id');
select is((select count(*) from public.client_records where user_id is null), 0::bigint, 'seed does not auto-link any client by entered email');

select * from finish();
rollback;
