begin;
set local search_path = public, extensions;

select plan(69);

-- Anonymous users have neither grants nor policies on private application tables.
set local role anon;
select throws_ok($$select * from public.organizations$$, '42501', null, 'anonymous cannot select organizations');
select throws_ok($$select * from public.user_profiles$$, '42501', null, 'anonymous cannot select profiles');
select throws_ok($$select * from public.services$$, '42501', null, 'anonymous cannot select services');
reset role;

-- Owner A sees and manages only Alpha tenant data.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);
select is((select count(*) from public.organizations), 1::bigint, 'owner A selects only own organization');
select is((select count(*) from public.organization_settings), 1::bigint, 'owner A selects only own settings');
select is((select count(*) from public.organization_memberships), 4::bigint, 'owner A selects only own memberships');
select is((select count(*) from public.services), 6::bigint, 'owner A selects only own services');
select is((select count(*) from public.staff_profiles), 1::bigint, 'owner A selects only own staff profiles');
select is((select count(*) from public.service_staff), 1::bigint, 'owner A selects only own assignments');
select is((select count(*) from public.weekly_availability), 1::bigint, 'owner A selects only own availability');
select is((select count(*) from public.blocked_times), 1::bigint, 'owner A selects only own blocks');
select is((select count(*) from public.client_records), 1::bigint, 'owner A selects only own clients');
select is((select count(*) from public.audit_logs), 1::bigint, 'owner A selects only own audit rows');

select throws_ok($$insert into public.organizations (slug, name, timezone, currency, status) values ('forged-owner-org','Forged','UTC','USD','draft')$$, '42501', null, 'owner A cannot create an ownerless organization directly');
select throws_ok($$delete from public.organizations where id = '20000000-0000-4000-8000-000000000001'$$, '42501', null, 'owner A cannot delete organization B');

select results_eq($$update public.organizations set name = 'Nope' where id = '20000000-0000-4000-8000-000000000001' returning 1$$, $$select 1 where false$$, 'owner A cannot update organization B');
select results_eq($$update public.organization_settings set slot_interval_minutes = 20 where organization_id = '20000000-0000-4000-8000-000000000001' returning 1$$, $$select 1 where false$$, 'owner A cannot update settings B');
select results_eq($$update public.organization_memberships set role = 'owner' where id = '22000000-0000-4000-8000-000000000202' returning 1$$, $$select 1 where false$$, 'owner A cannot update membership B');
select results_eq($$update public.services set name = 'Nope' where id = '23000000-0000-4000-8000-000000000201' returning 1$$, $$select 1 where false$$, 'owner A cannot update service B');
select results_eq($$update public.staff_profiles set display_name = 'Nope' where id = '24000000-0000-4000-8000-000000000202' returning 1$$, $$select 1 where false$$, 'owner A cannot update staff profile B');
select results_eq($$update public.service_staff set is_active = false where service_id = '23000000-0000-4000-8000-000000000201' returning 1$$, $$select 1 where false$$, 'owner A cannot update assignment B');
select results_eq($$update public.weekly_availability set start_local = '11:00' where id = '25000000-0000-4000-8000-000000000201' returning 1$$, $$select 1 where false$$, 'owner A cannot update availability B');
select results_eq($$update public.blocked_times set reason = 'Nope' where id = '26000000-0000-4000-8000-000000000201' returning 1$$, $$select 1 where false$$, 'owner A cannot update block B');
select results_eq($$update public.client_records set full_name = 'Nope' where id = '27000000-0000-4000-8000-000000000203' returning 1$$, $$select 1 where false$$, 'owner A cannot update client B');

select results_eq($$delete from public.organization_settings where organization_id = '20000000-0000-4000-8000-000000000001' returning 1$$, $$select 1 where false$$, 'owner A cannot delete settings B');
select results_eq($$delete from public.organization_memberships where id = '22000000-0000-4000-8000-000000000202' returning 1$$, $$select 1 where false$$, 'owner A cannot delete membership B');
select results_eq($$delete from public.services where id = '23000000-0000-4000-8000-000000000201' returning 1$$, $$select 1 where false$$, 'owner A cannot delete service B');
select results_eq($$delete from public.staff_profiles where id = '24000000-0000-4000-8000-000000000202' returning 1$$, $$select 1 where false$$, 'owner A cannot delete staff profile B');
select results_eq($$delete from public.service_staff where service_id = '23000000-0000-4000-8000-000000000201' returning 1$$, $$select 1 where false$$, 'owner A cannot delete assignment B');
select results_eq($$delete from public.weekly_availability where id = '25000000-0000-4000-8000-000000000201' returning 1$$, $$select 1 where false$$, 'owner A cannot delete availability B');
select results_eq($$delete from public.blocked_times where id = '26000000-0000-4000-8000-000000000201' returning 1$$, $$select 1 where false$$, 'owner A cannot delete block B');
select results_eq($$delete from public.client_records where id = '27000000-0000-4000-8000-000000000203' returning 1$$, $$select 1 where false$$, 'owner A cannot delete client B');

select throws_ok($$insert into public.organization_settings (organization_id) values ('20000000-0000-4000-8000-000000000001')$$, '42501', null, 'owner A cannot insert settings B');
select throws_ok($$insert into public.organization_memberships (organization_id, user_id, role, status, accepted_at) values ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'staff', 'active', now())$$, '42501', null, 'owner A cannot insert membership B');
select throws_ok($$insert into public.services (organization_id, name, duration_minutes, price_minor, currency) values ('20000000-0000-4000-8000-000000000001', 'Forged', 30, 0, 'EUR')$$, '42501', null, 'owner A cannot insert service B');
select throws_ok($$insert into public.staff_profiles (organization_id, membership_id, display_name) values ('20000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000202', 'Forged')$$, '23514', 'staff profile requires an active linked membership', 'owner A cannot insert staff profile B');
select throws_ok($$insert into public.service_staff (organization_id, service_id, staff_profile_id) values ('20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000201', '24000000-0000-4000-8000-000000000202')$$, '42501', null, 'owner A cannot insert assignment B');
select throws_ok($$insert into public.weekly_availability (organization_id, staff_profile_id, weekday, start_local, end_local) values ('20000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000202', 5, '07:00', '08:00')$$, '42501', null, 'owner A cannot insert availability B');
select throws_ok($$insert into public.blocked_times (organization_id, staff_profile_id, starts_at, ends_at, created_by) values ('20000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000202', '2026-10-01', '2026-10-02', '00000000-0000-4000-8000-000000000101')$$, '42501', null, 'owner A cannot insert block B');
select throws_ok($$insert into public.client_records (organization_id, email_normalized, email_display, full_name) values ('20000000-0000-4000-8000-000000000001', 'forged@serviceflow.invalid', 'forged@serviceflow.invalid', 'Forged')$$, '42501', null, 'owner A cannot insert client B');
select throws_ok($$insert into public.audit_logs (actor_type, actor_role, action, summary) values ('user','owner','audit.forged','Forged')$$, '42501', null, 'authenticated users cannot insert audit rows directly');
select throws_ok($$update public.audit_logs set summary = 'Forged' where id = '17000000-0000-4000-8000-000000000101'$$, '42501', null, 'authenticated users cannot update audit rows directly');
select throws_ok($$delete from public.audit_logs where id = '17000000-0000-4000-8000-000000000101'$$, '42501', null, 'authenticated users cannot delete audit rows directly');

select throws_ok($$select private.write_audit_log('10000000-0000-4000-8000-000000000001','service.tested','service','12000000-0000-4000-8000-000000000101','Fictional test audit.','{}')$$, '42501', null, 'authenticated users cannot invoke the private audit writer directly');

-- Staff A reads only their own profile, assignment and schedule and may update own schedule.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}', true);
select is((select count(*) from public.staff_profiles), 1::bigint, 'staff sees own profile only');
select is((select count(*) from public.service_staff), 1::bigint, 'staff sees own assignment only');
select is((select count(*) from public.weekly_availability), 1::bigint, 'staff sees own availability only');
select is((select count(*) from public.blocked_times), 1::bigint, 'staff sees own blocks only');
select is((select count(*) from public.client_records), 0::bigint, 'staff cannot select private client records');
select lives_ok($$update public.staff_profiles set bio = 'Updated fictional bio.' where id = '13000000-0000-4000-8000-000000000102'$$, 'staff can update own profile');
select throws_ok($$insert into public.blocked_times (organization_id, staff_profile_id, starts_at, ends_at, reason, created_by) values ('10000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000102','2026-11-01','2026-11-02','Own fictional block','00000000-0000-4000-8000-000000000102')$$,'42501','schedule changes require a managed operation','staff direct block writes require the managed workflow');
select results_eq($$update public.service_staff set is_active = false where service_id = '12000000-0000-4000-8000-000000000101' returning 1$$, $$select 1 where false$$, 'staff cannot mutate assignments');

-- Client receives only its linked safe projection; owner notes are absent from the return type.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}', true);
select is((select count(*) from public.client_records), 0::bigint, 'client cannot directly select private client table');
select is((select count(*) from public.get_my_client_records()), 1::bigint, 'client gets only linked safe record');
select ok(position('notes' in pg_get_function_result('public.get_my_client_records()'::regprocedure)) = 0, 'safe client function does not expose notes');

-- Owner B is isolated from Alpha.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000201","role":"authenticated"}', true);
select is((select id from public.organizations), '20000000-0000-4000-8000-000000000001'::uuid, 'owner B sees only Beta');
select is((select count(*) from public.services where organization_id = '10000000-0000-4000-8000-000000000001'), 0::bigint, 'owner B cannot select Alpha services');

-- Inactive and suspended memberships cannot mutate.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000104","role":"authenticated"}', true);
select is((select count(*) from public.organizations), 0::bigint, 'inactive member cannot select tenant organization');
select results_eq($$update public.weekly_availability set start_local = '08:00' returning 1$$, $$select 1 where false$$, 'inactive member cannot mutate availability');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}', true);
select is((select count(*) from public.organizations), 1::bigint, 'suspended owner retains own organization read');
select results_eq($$update public.services set name = 'Nope' returning 1$$, $$select 1 where false$$, 'suspended organization owner cannot mutate services');
select throws_ok($$insert into public.blocked_times (organization_id, staff_profile_id, starts_at, ends_at, created_by) values ('30000000-0000-4000-8000-000000000001','35000000-0000-4000-8000-000000000301','2026-12-01','2026-12-02','00000000-0000-4000-8000-000000000301')$$, '42501', null, 'suspended organization cannot insert blocks');

-- Platform admin has no broad tenant-table policies.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.organizations), 0::bigint, 'platform admin has no direct organization access');
select is((select count(*) from public.services), 0::bigint, 'platform admin has no direct service access');
select is((select count(*) from public.client_records), 0::bigint, 'platform admin has no direct client access');
select throws_ok($$update public.user_profiles set platform_role = 'user' where user_id = '00000000-0000-4000-8000-000000000001'$$, '42501', 'protected profile fields cannot be changed', 'platform admin cannot self-modify platform role');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"service_role"}', true);
select is((select count(*) from public.organizations), 3::bigint, 'service role bypasses normal tenant RLS');
select is((select count(*) from public.client_records), 2::bigint, 'service role sees all clients for narrow internal work');
select throws_ok($$update public.audit_logs set summary = 'Nope' where id = '17000000-0000-4000-8000-000000000101'$$, '42501', null, 'service role cannot rewrite audit history');
reset role;

select * from finish();
rollback;
