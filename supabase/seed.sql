-- Deterministic local/test-only fixtures. Every identity and business below is fictional.
-- Auth placeholders deliberately have no password. The Alpha owner/staff email identities below
-- allow isolated browser tests to establish their own sessions through the local recovery flow.

begin;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', 'platform.admin@serviceflow.invalid', '{"display_name":"Platform Admin Fixture","platform_role":"platform_admin"}'),
  ('00000000-0000-4000-8000-000000000101', 'owner.alpha@serviceflow.test', '{"display_name":"Avery Alpha"}'),
  ('00000000-0000-4000-8000-000000000102', 'staff.alpha@serviceflow.test', '{"display_name":"Sage Alpha"}'),
  ('00000000-0000-4000-8000-000000000103', 'client.alpha@serviceflow.invalid', '{"display_name":"Casey Alpha"}'),
  ('00000000-0000-4000-8000-000000000104', 'inactive.alpha@serviceflow.invalid', '{"display_name":"Inactive Alpha"}'),
  ('00000000-0000-4000-8000-000000000201', 'owner.beta@serviceflow.invalid', '{"display_name":"Blair Beta"}'),
  ('00000000-0000-4000-8000-000000000202', 'staff.beta@serviceflow.invalid', '{"display_name":"Sky Beta"}'),
  ('00000000-0000-4000-8000-000000000203', 'client.beta@serviceflow.invalid', '{"display_name":"Cameron Beta"}'),
  ('00000000-0000-4000-8000-000000000301', 'owner.isolation@serviceflow.invalid', '{"display_name":"Ira Isolation"}');

update auth.users set instance_id='00000000-0000-0000-0000-000000000000',aud='authenticated',role='authenticated',raw_app_meta_data='{"provider":"email","providers":["email"]}',encrypted_password='',email_confirmed_at=statement_timestamp(),confirmation_token='',recovery_token='',email_change='',email_change_token_new='',email_change_token_current='',phone_change='',phone_change_token='',reauthentication_token='',created_at=statement_timestamp(),updated_at=statement_timestamp()
where id in ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102');

insert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
values
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000101','{"sub":"00000000-0000-4000-8000-000000000101","email":"owner.alpha@serviceflow.test","email_verified":true}','email',null,statement_timestamp(),statement_timestamp()),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000102','{"sub":"00000000-0000-4000-8000-000000000102","email":"staff.alpha@serviceflow.test","email_verified":true}','email',null,statement_timestamp(),statement_timestamp());

-- The profile trigger ignores platform_role in user metadata. Trusted seed maintenance performs
-- the one explicit platform-admin assignment after proving the trigger created a normal user.
update public.user_profiles
set platform_role = 'platform_admin'
where user_id = '00000000-0000-4000-8000-000000000001';

insert into public.organizations (
  id, slug, name, description, email, city, country_code, timezone, currency, status, onboarding_step, published_at, suspended_at
)
values
  ('10000000-0000-4000-8000-000000000001', 'alpha-wellness-lab', 'Alpha Wellness Lab', 'Fictional movement coaching fixture.', 'hello@alpha.serviceflow.invalid', 'Bucharest', 'RO', 'Europe/Bucharest', 'RON', 'published', 'complete', '2026-01-10 10:00:00+00', null),
  ('20000000-0000-4000-8000-000000000001', 'beta-consulting-studio', 'Beta Consulting Studio', 'Fictional consulting fixture.', 'hello@beta.serviceflow.invalid', 'Berlin', 'DE', 'Europe/Berlin', 'EUR', 'published', 'complete', '2026-01-11 10:00:00+00', null),
  ('30000000-0000-4000-8000-000000000001', 'isolation-suspended-fixture', 'Isolation Suspended Fixture', 'Fictional suspended tenant used only by authorization tests.', 'hello@isolation.serviceflow.invalid', 'London', 'GB', 'Europe/London', 'GBP', 'suspended', 'complete', null, '2026-02-01 10:00:00+00');

insert into public.organization_memberships (
  id, organization_id, user_id, role, status, invited_email, invited_by, accepted_at
)
values
  ('11000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'owner', 'active', null, null, '2026-01-01 09:00:00+00'),
  ('11000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'staff', 'active', null, '00000000-0000-4000-8000-000000000101', '2026-01-02 09:00:00+00'),
  ('11000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', 'staff', 'inactive', null, '00000000-0000-4000-8000-000000000101', '2026-01-03 09:00:00+00'),
  ('11000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000001', null, 'staff', 'invited', 'pending.alpha@serviceflow.invalid', '00000000-0000-4000-8000-000000000101', null),
  ('22000000-0000-4000-8000-000000000201', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'owner', 'active', null, null, '2026-01-01 09:00:00+00'),
  ('22000000-0000-4000-8000-000000000202', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000202', 'staff', 'active', null, '00000000-0000-4000-8000-000000000201', '2026-01-02 09:00:00+00'),
  ('33000000-0000-4000-8000-000000000301', '30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000301', 'owner', 'active', null, null, '2026-01-01 09:00:00+00');

insert into public.organization_invitations (id, organization_id, email_normalized, role, status, invited_by, expires_at, last_sent_at)
values ('18000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000001', 'pending.alpha@serviceflow.invalid', 'staff', 'pending', '00000000-0000-4000-8000-000000000101', statement_timestamp() + interval '7 days', statement_timestamp());

insert into public.organization_settings (organization_id, slot_interval_minutes, minimum_lead_minutes, booking_horizon_days, policy_text)
values
  ('10000000-0000-4000-8000-000000000001', 15, 120, 60, 'Fictional Alpha booking policy.'),
  ('20000000-0000-4000-8000-000000000001', 30, 240, 90, 'Fictional Beta booking policy.'),
  ('30000000-0000-4000-8000-000000000001', 15, 60, 30, 'Fictional suspended-tenant policy.');

insert into public.services (
  id, organization_id, name, description, duration_minutes, buffer_after_minutes, price_minor, currency, payment_mode, deposit_minor, visibility, status
)
values
  ('12000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', 'Fictional Movement Session', 'A fictional individual movement session.', 60, 15, 18000, 'RON', 'none', null, 'public', 'active'),
  ('23000000-0000-4000-8000-000000000201', '20000000-0000-4000-8000-000000000001', 'Fictional Strategy Session', 'A fictional consulting session.', 45, 15, 12500, 'EUR', 'deposit', 2500, 'public', 'active'),
  ('34000000-0000-4000-8000-000000000301', '30000000-0000-4000-8000-000000000001', 'Suspended Fixture Service', 'Not operational.', 30, 0, 5000, 'GBP', 'none', null, 'private', 'draft');

insert into public.staff_profiles (id, organization_id, membership_id, display_name, bio, is_public, status)
values
  ('13000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000102', 'Sage Alpha', 'Fictional Alpha staff profile.', true, 'active'),
  ('24000000-0000-4000-8000-000000000202', '20000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000202', 'Sky Beta', 'Fictional Beta staff profile.', true, 'active'),
  ('35000000-0000-4000-8000-000000000301', '30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000301', 'Ira Isolation', 'Fictional suspended owner/staff fixture.', false, 'active');

insert into public.service_staff (organization_id, service_id, staff_profile_id)
values
  ('10000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000101', '13000000-0000-4000-8000-000000000102'),
  ('20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000201', '24000000-0000-4000-8000-000000000202'),
  ('30000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000301', '35000000-0000-4000-8000-000000000301');

insert into public.weekly_availability (id, organization_id, staff_profile_id, weekday, start_local, end_local)
values
  ('14000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000102', 1, '09:00', '17:00'),
  ('25000000-0000-4000-8000-000000000201', '20000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000202', 2, '10:00', '16:00'),
  ('36000000-0000-4000-8000-000000000301', '30000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000301', 3, '09:00', '12:00');

insert into public.blocked_times (id, organization_id, staff_profile_id, starts_at, ends_at, reason, created_by)
values
  ('15000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000102', '2026-09-07 10:00:00+00', '2026-09-07 11:00:00+00', 'Fictional training block.', '00000000-0000-4000-8000-000000000102'),
  ('26000000-0000-4000-8000-000000000201', '20000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000202', '2026-09-08 10:00:00+00', '2026-09-08 11:00:00+00', 'Fictional planning block.', '00000000-0000-4000-8000-000000000202'),
  ('37000000-0000-4000-8000-000000000301', '30000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000301', '2026-09-09 10:00:00+00', '2026-09-09 11:00:00+00', 'Fictional suspended block.', '00000000-0000-4000-8000-000000000301');

insert into public.client_records (id, organization_id, user_id, email_normalized, email_display, full_name, phone, notes)
values
  ('16000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'client.alpha@serviceflow.invalid', 'client.alpha@serviceflow.invalid', 'Casey Alpha', '+40000000001', 'Private fictional owner note A.'),
  ('27000000-0000-4000-8000-000000000203', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000203', 'client.beta@serviceflow.invalid', 'client.beta@serviceflow.invalid', 'Cameron Beta', '+49000000001', 'Private fictional owner note B.');

insert into public.audit_logs (id, organization_id, actor_user_id, actor_type, actor_role, action, target_type, target_id, summary, changes)
values
  ('17000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'user', 'owner', 'organization.seeded', 'organization', '10000000-0000-4000-8000-000000000001', 'Fictional Alpha fixture created.', '{}'),
  ('28000000-0000-4000-8000-000000000201', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'user', 'owner', 'organization.seeded', 'organization', '20000000-0000-4000-8000-000000000001', 'Fictional Beta fixture created.', '{}');

commit;
