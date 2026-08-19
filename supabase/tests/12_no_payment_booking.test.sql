begin;
select plan(33);

select has_table('public','appointment_events','appointment events exist');
select has_table('public','notification_deliveries','notification outbox exists');
select has_table('public','guest_management_tokens','guest token store exists');
select has_table('public','booking_submissions','idempotency store exists');
select has_table('public','booking_rate_limits','database rate limiter exists');
select is((select relrowsecurity from pg_class where oid='public.appointment_events'::regclass),true,'events use RLS');
select is((select relrowsecurity from pg_class where oid='public.guest_management_tokens'::regclass),true,'tokens use RLS');

set local role anon;
select ok((select bool_and(public.check_public_booking_rate_limit(repeat('9',64))) from generate_series(1,8)),'first eight bounded submission attempts pass');
select is(public.check_public_booking_rate_limit(repeat('9',64)),false,'ninth bounded submission attempt is rejected');
select throws_ok($$select * from public.appointments$$,'42501',null,'anonymous cannot read appointments');
select throws_ok($$select * from public.client_records$$,'42501',null,'anonymous cannot read clients');
select throws_ok($$select * from public.appointment_events$$,'42501',null,'anonymous cannot read events');
select throws_ok($$select * from public.notification_deliveries$$,'42501',null,'anonymous cannot read notifications');
select throws_ok($$select * from public.guest_management_tokens$$,'42501',null,'anonymous cannot read tokens');

select lives_ok($$select public.create_public_no_payment_booking(
  'alpha-wellness-lab','12000000-0000-4000-8000-000000000111',null,'2026-09-07 12:00:00+00',
  'Taylor Fixture','taylor.booking@serviceflow.invalid','+40000000009',true,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',repeat('a',64),repeat('b',64))$$,'guest no-payment booking succeeds');
select is((public.create_public_no_payment_booking(
  'alpha-wellness-lab','12000000-0000-4000-8000-000000000111',null,'2026-09-07 12:00:00+00',
  'Taylor Fixture','taylor.booking@serviceflow.invalid','+40000000009',true,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',repeat('a',64),repeat('b',64))->>'replayed')::boolean,true,'same submission is idempotent');
select throws_ok($$select public.create_public_no_payment_booking(
  'alpha-wellness-lab','12000000-0000-4000-8000-000000000111',null,'2026-09-07 12:00:00+00',
  'Changed Fixture','taylor.booking@serviceflow.invalid','+40000000009',true,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',repeat('a',64),repeat('b',64))$$,'P0001','BOOKING_IDEMPOTENCY_MISMATCH','changed idempotent payload rejected');
select throws_ok($$select public.create_public_no_payment_booking(
  'beta-consulting-studio','23000000-0000-4000-8000-000000000201',null,'2026-09-08 12:00:00+00',
  'Taylor Fixture','taylor.booking@serviceflow.invalid','',true,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',repeat('c',64),repeat('d',64))$$,'P0001','BOOKING_UNAVAILABLE','payment service rejected');
select throws_ok($$select public.create_public_no_payment_booking(
  'isolation-suspended-fixture','34000000-0000-4000-8000-000000000301',null,'2026-09-09 08:00:00+00',
  'Taylor Fixture','taylor.booking@serviceflow.invalid','',true,
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',repeat('e',64),repeat('f',64))$$,'P0001','BOOKING_UNAVAILABLE','suspended organization rejected');
reset role;

select is((select count(*) from public.appointments where client_email_snapshot='taylor.booking@serviceflow.invalid'),1::bigint,'one appointment created');
select is((select count(*) from public.client_records where email_normalized='taylor.booking@serviceflow.invalid'),1::bigint,'client upserted once');
select is((select count(*) from public.appointment_events e join public.appointments a on a.id=e.appointment_id where a.client_email_snapshot='taylor.booking@serviceflow.invalid'),1::bigint,'one event created');
select is((select count(*) from public.notification_deliveries n join public.appointments a on a.id=n.appointment_id where a.client_email_snapshot='taylor.booking@serviceflow.invalid'),1::bigint,'one outbox row created');
select is((select count(*) from public.audit_logs where action='appointment.created'),1::bigint,'one audit row created');
select is((select token_hash from public.guest_management_tokens gt join public.appointments a on a.id=gt.appointment_id where a.client_email_snapshot='taylor.booking@serviceflow.invalid'),repeat('a',64),'only token hash persisted');
select ok((select service_name_snapshot='Balance Foundations' and duration_minutes_snapshot=30 and buffer_minutes_snapshot=5 and price_minor_snapshot=9000 and payment_mode_snapshot='none' and policy_text_snapshot='Fictional Alpha booking policy.' from public.appointments where client_email_snapshot='taylor.booking@serviceflow.invalid'),'trusted immutable snapshots persisted');
select ok((select public_reference is not null and status='confirmed' from public.appointments where client_email_snapshot='taylor.booking@serviceflow.invalid'),'confirmed appointment has opaque reference');
select set_config('test.booking_reference',(select public_reference from public.appointments where client_email_snapshot='taylor.booking@serviceflow.invalid'),true);

set local role anon;
select ok(public.get_public_booking_confirmation(current_setting('test.booking_reference'),repeat('a',64)) is not null,'valid guest token reads safe confirmation');
select is(public.get_public_booking_confirmation(current_setting('test.booking_reference'),repeat('0',64)),null,'invalid token fails generically');
select is(public.get_public_booking_confirmation('SF-FICTIONAL-EXISTING',repeat('a',64)),null,'token cannot cross appointments');
reset role;
insert into public.guest_management_tokens(organization_id,appointment_id,token_hash,created_at,expires_at)
select organization_id,id,repeat('8',64),statement_timestamp()-interval '40 days',statement_timestamp()-interval '10 days'
from public.appointments where client_email_snapshot='taylor.booking@serviceflow.invalid';
set local role anon;
select is(public.get_public_booking_confirmation(current_setting('test.booking_reference'),repeat('8',64)),null,'expired token fails generically');
reset role;
update public.guest_management_tokens set revoked_at=statement_timestamp() where token_hash=repeat('a',64);
set local role anon;
select is(public.get_public_booking_confirmation(current_setting('test.booking_reference'),repeat('a',64)),null,'revoked token fails generically');
reset role;
update public.client_records set user_id='00000000-0000-4000-8000-000000000101',email_normalized='owner.alpha@serviceflow.test',email_display='owner.alpha@serviceflow.test'
where id='16000000-0000-4000-8000-000000000103';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
select ok(public.get_public_booking_confirmation('SF-FICTIONAL-EXISTING',null) is not null,'verified authenticated owner can read linked confirmation');
reset role;

select * from finish();
rollback;
