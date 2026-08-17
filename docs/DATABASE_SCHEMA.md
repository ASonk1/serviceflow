# ServiceFlow Database Schema

## 1. Scope and conventions

PostgreSQL in Supabase is the system of record. Supabase Auth owns credentials in `auth.users`; application tables live in `public` unless a private schema is useful for server-only functions. The schema is designed for one organization location/timezone while retaining clean tenant boundaries.

Conventions:

- Primary keys are UUIDs generated in PostgreSQL. Public confirmation references are separate opaque random values.
- All timestamps representing instants are `timestamptz` in UTC. Weekly recurring wall-clock values use `time` plus weekday and are interpreted in the organization IANA timezone.
- Money is integer minor units (`bigint` where aggregation warrants it) plus an ISO 4217 currency code restricted in v1 to `RON`, `EUR`, `USD`, or `GBP`.
- Tenant-owned tables carry non-null `organization_id`; composite foreign keys are preferred where they prevent cross-tenant relationships.
- Mutable records have `created_at`, `updated_at`; actors are included where useful. Historical/domain event records are append-only.
- Archive/deactivate is preferred to delete for referenced business data. Authentication deletion uses an explicit privacy workflow.
- Enum-like columns use PostgreSQL enums or checked text. Checked text is easier to evolve; the migration should pick one convention consistently.
- Email comparisons use canonical lower-case values (or `citext` if enabled). Store display values only where needed.

## 2. Entity relationship overview

```text
auth.users 1---1 user_profiles
auth.users 1---* organization_memberships *---1 organizations
organizations 1---* staff_profiles 1---* service_staff *---1 services
staff_profiles 1---* weekly_availability
staff_profiles 1---* blocked_times
organizations 1---* client_records *---0..1 auth.users
organizations 1---* appointments
services 1---* appointments
staff_profiles 1---* appointments
client_records 1---* appointments
appointments 1---* appointment_events
appointments 1---* payments
appointments 1---* booking_holds (conceptually; normally one active attempt)
organizations 1---* audit_logs
organizations 1---* notification_deliveries
```

Every tenant-to-tenant relationship must include or validate `organization_id`. A globally unique UUID alone does not make a cross-tenant foreign key safe.

## 3. Identity and tenant tables

### `user_profiles`

Application extension of `auth.users`. A minimal trigger on `auth.users` creates this row and assigns safe defaults; it must not copy caller-controlled platform-role or status metadata.

| Column | Type | Rules |
|---|---|---|
| `user_id` | uuid PK/FK auth.users | cascade on auth deletion only through controlled workflow |
| `display_name` | text | 1-100 chars |
| `phone` | text nullable | normalized/display-safe, not used as identity |
| `avatar_path` | text nullable | Supabase Storage path, not arbitrary URL |
| `platform_role` | text | `user` or `platform_admin`, default `user` |
| `status` | text | `active`, `disabled` |
| timestamps | timestamptz | standard |

Indexes: partial index on `platform_role = 'platform_admin'` if admin lookup requires it. Ordinary users may select/update only safe fields on their own row; no user may self-promote platform role.

### `organizations`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | generated |
| `slug` | text | lower-case; unique; regex and reserved-name validation |
| `name` | text | 1-120 chars |
| `description` | text nullable | bounded |
| `logo_path` | text nullable | storage path |
| `email`, `phone` | text nullable | public business contact |
| `address_*` | text nullable | single primary location |
| `timezone` | text | valid IANA name, immutable with future bookings unless migrated |
| `currency` | char(3) | supported ISO currency, immutable after payment |
| `status` | text | `draft`, `published`, `unpublished`, `suspended` |
| `onboarding_step` | text nullable | resumable UI state, not security state |
| `published_at`, `suspended_at` | timestamptz nullable | lifecycle |
| timestamps | timestamptz | standard |

Constraints/indexes:

- unique index on `lower(slug)` (store normalized as well);
- check slug length/shape, currency upper-case, valid status/timestamps;
- index `(status, created_at desc)` for platform administration;
- IANA timezone validity is checked by a trusted function/migration reference or strictly validated at application and migration boundaries.

### `organization_memberships`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | generated |
| `organization_id` | uuid FK | organizations, restrict delete |
| `user_id` | uuid nullable FK | auth.users, null while an invitation is pending; restrict/control delete once linked |
| `role` | text | `owner` or `staff` |
| `status` | text | `invited`, `active`, `inactive` |
| `invited_email` | text nullable | canonical email for pending invitation |
| `invited_by` | uuid nullable | actor user ID |
| `accepted_at` | timestamptz nullable | lifecycle |
| timestamps | timestamptz | standard |

Constraints/indexes:

- unique `(organization_id, user_id)` for linked members;
- unique partial `(organization_id, lower(invited_email)) where status = 'invited'`;
- indexes `(user_id, status)`, `(organization_id, role, status)`;
- trigger/transactional function prevents deactivating/demoting the final active owner;
- invitation acceptance verifies authenticated email and atomically links `user_id`.

### `organization_settings`

One-to-one with organization.

| Column | Type | Rules |
|---|---|---|
| `organization_id` | uuid PK/FK | tenant |
| `slot_interval_minutes` | smallint | allowed range, e.g. 5-120 |
| `minimum_lead_minutes` | integer | 0 to bounded maximum |
| `booking_horizon_days` | smallint | 1-365 |
| `cancellation_notice_minutes` | integer | non-negative |
| `reschedule_notice_minutes` | integer | non-negative |
| `reminder_lead_minutes` | integer | default 1440 |
| `guest_booking_enabled` | boolean | default true |
| `policy_text` | text nullable | bounded public policy |
| timestamps | timestamptz | standard |

### `onboarding_progress`

One row per draft organization. It stores nullable completion timestamps for `business_identity`, `location`, `booking_policies`, `staff_profile`, `service`, `availability`, `review`, and `publish`. A check constraint enforces sequence order; there is no arbitrary browser-authored JSON state. RLS permits only an active owner to read the row, while writes are limited to authenticated onboarding functions that derive the caller from `auth.uid()`. The first null timestamp is the deterministic resume point. `organizations.onboarding_step` is retained as a display hint only and is never authoritative.

`start_owner_onboarding()` serializes starts per authenticated user and atomically creates or resolves the draft organization, default settings, active owner membership, and progress row. Step functions accept an organization identifier only as a resource target, re-check that the caller is its verified active draft owner, validate persisted values, and advance progress in the same transaction.

## 4. Catalog and staffing

### `services`

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id` | uuid | PK; tenant FK |
| `name`, `description` | text | bounded; description nullable |
| `duration_minutes` | smallint | e.g. 5-480 |
| `buffer_after_minutes` | smallint | 0-240 |
| `price_minor` | bigint | >= 0 |
| `currency` | char(3) | equals organization currency via controlled mutation |
| `payment_mode` | text | `none`, `deposit`, `full` |
| `deposit_minor` | bigint nullable | required and `0 < deposit <= price` only for deposit mode |
| `visibility` | text | `public`, `private` |
| `status` | text | `draft`, `active`, `archived` |
| timestamps | timestamptz | standard |

Indexes: `(organization_id, status, name, id)`, optional normalized/trigram name search after measurement. Unique `(organization_id, id)` supports composite FKs. Referenced services cannot be deleted.

### `staff_profiles`

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id` | uuid | PK; tenant FK |
| `membership_id` | uuid | unique FK to same-tenant active owner/staff membership |
| `display_name` | text | public name |
| `bio` | text nullable | bounded |
| `avatar_path` | text nullable | storage path |
| `is_public` | boolean | public booking visibility |
| `status` | text | `active`, `inactive` |
| timestamps | timestamptz | standard |

Indexes/constraints: unique `(organization_id, membership_id)`, unique `(organization_id, id)`, `(organization_id, status, display_name)`. Composite membership validation must prevent linking another tenant’s membership.

### `service_staff`

Many-to-many assignment.

| Column | Type | Rules |
|---|---|---|
| `organization_id`, `service_id`, `staff_profile_id` | uuid | tenant-consistent FKs |
| `is_active` | boolean | assignment state |
| timestamps | timestamptz | standard |

Primary key `(service_id, staff_profile_id)`; composite FKs `(organization_id, service_id)` and `(organization_id, staff_profile_id)` guarantee tenant consistency. Index `(organization_id, staff_profile_id, is_active)`.

## 5. Availability and scheduling tables

### `weekly_availability`

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id`, `staff_profile_id` | uuid | tenant-consistent |
| `weekday` | smallint | ISO weekday 1-7, Monday through Sunday |
| `start_local`, `end_local` | time | start < end; windows cannot cross midnight in v1 |
| `effective_from`, `effective_until` | date nullable | optional bounded schedule versions |
| `is_active` | boolean | state |
| timestamps | timestamptz | standard |

Indexes: `(organization_id, staff_profile_id, weekday, is_active)`. An exclusion constraint on staff, weekday/effective dates/local time ranges is preferred; otherwise the write function rejects overlapping active windows. Overnight windows are represented as two rows.

### `blocked_times`

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id`, `staff_profile_id` | uuid | tenant-consistent |
| `starts_at`, `ends_at` | timestamptz | starts < ends |
| `reason` | text nullable | private, bounded |
| `created_by` | uuid | actor |
| timestamps | timestamptz | standard |

Indexes: GiST `(staff_profile_id, tstzrange(starts_at, ends_at, '[)'))` where feasible; B-tree `(organization_id, staff_profile_id, starts_at)`. Overlapping blocks are allowed and treated as a union.

### `booking_holds`

Short-lived reservation attempts for payment-required bookings.

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id` | uuid | tenant |
| `service_id`, `staff_profile_id` | uuid | same tenant |
| `client_record_id` | uuid nullable | linked known client |
| `starts_at`, `ends_at`, `buffer_ends_at` | timestamptz | ordered |
| contact/service snapshot fields | text/integer | trusted immutable attempt data |
| `status` | text | `active`, `converted`, `expired`, `cancelled`, `reconciliation_required` |
| `expires_at` | timestamptz | short bounded TTL |
| `idempotency_key` | text | unique scoped request key |
| `stripe_payment_intent_id` | text nullable | unique where present |
| timestamps | timestamptz | standard |

Indexes: unique `idempotency_key`; unique partial Stripe intent ID; `(staff_profile_id, starts_at, expires_at) where status = 'active'`; `(organization_id, status, expires_at)`. Holds participate in the same staff overlap lock/check as appointments.

## 6. Clients and appointments

### `client_records`

A tenant’s view of a client; one user can have separate records at different organizations.

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id` | uuid | PK; tenant |
| `user_id` | uuid nullable | verified linked auth user |
| `email_normalized` | text | required canonical email |
| `email_display` | text | display/send value |
| `full_name`, `phone` | text | bounded; phone nullable |
| `notes` | text nullable | owner-only; never exposed publicly/client by default |
| `first_booked_at`, `last_booked_at` | timestamptz nullable | maintained transactionally or derived |
| timestamps | timestamptz | standard |

Constraints/indexes: unique `(organization_id, email_normalized)` for v1 identity model; unique partial `(organization_id, user_id) where user_id is not null`; `(organization_id, last_booked_at desc, id)`. Linking requires verified email or verified capability; never trust an entered email to claim history.

Phase 2 exposes linked client data through the narrow `get_my_client_records()` function, which omits owner notes. Authenticated owners cannot directly set or change `user_id`; a later verified claim/link function must own that transition.

### `appointments`

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id` | uuid | PK; tenant |
| `public_reference` | text | unique opaque non-sequential reference |
| `service_id`, `staff_profile_id`, `client_record_id` | uuid | same-tenant FKs |
| `booking_hold_id` | uuid nullable | unique source hold |
| `starts_at`, `ends_at`, `buffer_ends_at` | timestamptz | ordered half-open interval |
| `status` | text | `pending_payment`, `confirmed`, `completed`, `cancelled`, `no_show` |
| `source` | text | `public_guest`, `public_client`, `owner`, `staff`, `admin_support` |
| service snapshot | name, duration, buffer, price, currency, payment mode/deposit | immutable history |
| client snapshot | name, email, phone | immutable contact-at-booking |
| `timezone_snapshot` | text | organization timezone at booking |
| `policy_snapshot` | text nullable | terms accepted |
| `policy_accepted_at` | timestamptz nullable | proof timestamp |
| `cancelled_at`, `cancelled_by`, `cancellation_reason` | nullable | cancellation metadata |
| `version` | integer | optimistic concurrency, starts 1 |
| timestamps | timestamptz | standard |

Constraints/indexes:

- composite FKs include `organization_id` for service, staff, and client;
- unique `(organization_id, id)` plus globally unique public reference;
- time order checks and allowed transition enforcement in transactional functions;
- `(organization_id, starts_at desc, id)`, `(organization_id, status, starts_at, id)`, `(staff_profile_id, starts_at, status)`, `(client_record_id, starts_at desc, id)`;
- GiST/exclusion constraint preventing overlap of `tstzrange(starts_at, buffer_ends_at, '[)')` for one staff profile while status is active (`pending_payment`/`confirmed`) if PostgreSQL constraint predicates and migration ergonomics support it;
- if hold and appointment live in separate tables, exclusion cannot cover both directly, so the transaction advisory lock + overlap checks remain required.

### `appointment_events`

Append-only timeline/state history.

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id`, `appointment_id` | uuid | tenant-consistent |
| `event_type` | text | created, confirmed, rescheduled, cancelled, completed, no_show, payment events |
| `actor_user_id` | uuid nullable | null for provider/system |
| `actor_type` | text | user, guest, system, stripe |
| `from_status`, `to_status` | text nullable | transition |
| `occurred_at` | timestamptz | immutable |
| `metadata` | jsonb | small allowlisted non-sensitive event detail |

Indexes: `(appointment_id, occurred_at, id)`, `(organization_id, occurred_at desc, id)`. No update/delete for ordinary application roles.

### `guest_management_tokens`

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id`, `appointment_id` | uuid | tenant-consistent |
| `token_hash` | text/bytea | unique hash only; raw token never stored |
| `expires_at`, `last_used_at`, `revoked_at` | timestamptz nullable | lifecycle |
| `capabilities` | text[] | narrow allowlist, e.g. view/cancel/reschedule |
| `created_at` | timestamptz | standard |

Lookups occur only in a server-only security-definer function with fixed `search_path` and generic failure behavior.

## 7. Payments, notifications, and provider events

### `payments`

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id` | uuid | tenant |
| `appointment_id` | uuid nullable | linked when converted |
| `booking_hold_id` | uuid nullable | initial attempt |
| `provider` | text | `stripe` |
| `provider_payment_intent_id` | text | unique |
| `amount_minor`, `currency` | bigint, char(3) | trusted amount |
| `kind` | text | `deposit`, `full` |
| `status` | text | `requires_action`, `processing`, `succeeded`, `failed`, `cancelled`, `refund_pending`, `refunded` |
| `paid_at`, `failed_at`, `refunded_at` | timestamptz nullable | lifecycle |
| `failure_code` | text nullable | sanitized code, not full provider payload |
| timestamps | timestamptz | standard |

Indexes: unique provider intent; `(organization_id, status, created_at desc)`; `(appointment_id, status)`. Application users cannot arbitrarily mark payment succeeded.

### `provider_webhook_events`

Server-only idempotency and operations table.

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | internal |
| `provider`, `provider_event_id` | text | unique pair |
| `event_type` | text | provider type |
| `payload_hash` | text | integrity/debug without retaining full sensitive payload |
| `status` | text | `processing`, `processed`, `ignored`, `failed` |
| `attempt_count`, `last_error_code` | integer/text | bounded operational detail |
| `received_at`, `processed_at` | timestamptz | lifecycle |

Unique `(provider, provider_event_id)`. Accessible only to service-role/internal functions and limited platform operations.

### `notification_deliveries`

| Column | Type | Rules |
|---|---|---|
| `id`, `organization_id` | uuid | tenant |
| `appointment_id` | uuid nullable | context |
| `recipient_user_id` | uuid nullable | context |
| `recipient_email` | text | snapshot, protected |
| `template` | text | allowlisted versioned template |
| `idempotency_key` | text | globally unique semantic key |
| `scheduled_for` | timestamptz | send time |
| `status` | text | `pending`, `processing`, `sent`, `failed`, `cancelled` |
| `attempt_count`, `next_attempt_at` | integer/timestamptz | retries |
| `provider_message_id`, `last_error_code` | text nullable | provider/sanitized info |
| `sent_at` | timestamptz nullable | lifecycle |
| timestamps | timestamptz | standard |

Indexes: unique idempotency key; partial `(status, next_attempt_at, scheduled_for) where status in ('pending','failed')`; `(organization_id, created_at desc)`. Claim jobs use `for update skip locked` in bounded batches.

## 8. Audit and operational records

### `audit_logs`

Append-only important-action trail, not full observability.

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | generated |
| `organization_id` | uuid nullable | null for platform-only event |
| `actor_user_id` | uuid nullable | null for system/provider |
| `actor_type`, `actor_role` | text | snapshot |
| `action` | text | namespaced allowlist such as `service.updated` |
| `target_type`, `target_id` | text/uuid nullable | affected resource |
| `summary` | text | safe human-readable summary |
| `changes` | jsonb | allowlisted changed fields; no secrets/contact bodies |
| `request_id` | text nullable | log correlation |
| `ip_hash` | text nullable | salted privacy-preserving abuse trace |
| `created_at` | timestamptz | immutable |

Indexes: `(organization_id, created_at desc, id)`, `(actor_user_id, created_at desc)`, `(target_type, target_id, created_at desc)`, and platform partial index for null organization. Owners select safe tenant rows; only the unexposed private audit writer, called by future trusted domain functions, inserts application events. Ordinary roles and the service role cannot insert/update/delete audit rows directly.

### Optional `scheduled_job_runs`

Small operational table for reminder/reconciliation jobs: job name, run key, started/completed timestamps, status, counts, sanitized error code. Add only when cron visibility cannot be met through provider logs and notification/webhook state.

## 9. RLS and tenant isolation

### Policy helpers

Create small stable helper functions such as:

- `is_platform_admin()` from the authenticated `auth.uid()` and protected profile field;
- `has_org_role(org_id, allowed_roles[])` for active membership;
- `is_org_operational(org_id)` for mutation gating;
- `owns_client_record(client_id)` based on verified linked `user_id`;
- `is_assigned_staff(staff_profile_id)` based on membership/user relationship.

Security-definer helpers must have fixed `search_path`, fully qualified names, minimal execute grants, and must not accept unchecked identifiers that broaden access. Avoid recursive policy queries by centralizing carefully reviewed helpers.

### Policy matrix

| Table category | Anonymous | Client | Staff | Owner | Platform admin/service |
|---|---|---|---|---|---|
| Published organization/service/public staff | Select explicitly public columns, preferably via safe view/RPC | Same | Same + tenant data as required | Own tenant | Admin scoped |
| Membership/settings/service assignment | None | None | Own membership/profile subset | Own tenant CRUD | Audited support |
| Availability definitions/blocks | Public never sees raw private reasons | None | Own rows | Own tenant | Audited support |
| Client records | Create through guarded booking function only | Own linked record | Minimal assigned context via safe query | Own tenant | Highly restricted |
| Appointments | Guarded booking/token functions only | Own linked | Assigned staff only | Own tenant | Audited support |
| Payments | No direct access | Own appointment safe projection | Assigned safe projection if needed | Own tenant safe projection | Service mutation/admin inspect |
| Audit | None | None | None | Safe own-tenant select | Platform scope |
| Provider events | None | None | None | None | Service/internal only |

Do not expose tables with private columns to anonymous select merely because some columns are public. Prefer explicit public views/RPCs that return allowlisted fields, while retaining RLS under invoker semantics where possible.

### Mandatory isolation tests

For every tenant table, tests attempt select/insert/update/delete as anonymous, unrelated client, same-tenant client, unrelated staff, same-tenant staff, owner A, owner B, suspended owner, platform admin, and service role as applicable. Explicitly test forged `organization_id`, cross-tenant composite relationship IDs, inactive membership, last-owner mutation, guest token expiry/revocation, and storage paths.

## 10. Transactional functions and invariants

Functions worth placing close to data:

- `publish_organization`: verifies setup checklist and state transition.
- `accept_membership_invitation`: validates verified auth email and links atomically.
- `create_booking_or_hold`: chooses/validates staff, locks schedule key, checks overlap/policy, creates client/hold/appointment/event/audit/outbox atomically.
- `confirm_paid_hold`: idempotently verifies stored payment/hold, reconfirms invariant, creates appointment, closes hold, emits records, or marks reconciliation required.
- `reschedule_appointment`: authorizes caller context, locks old/new keys deterministically, checks policy/version/overlap, snapshots change and emits events.
- `cancel_appointment`: checks capability/policy/version and performs idempotent state transition.
- `claim_notification_batch`: server-only `skip locked` bounded batch.
- `record_webhook_event`: provider event idempotency transition.

Functions must accept actor context only where it can be verified against `auth.uid()` or be callable solely by the service role. Never trust a caller-supplied role.

## 11. Retention, privacy, and backup

- Appointments, payment summaries, appointment events, and audit logs are retained for the demo lifecycle to preserve credible history; define a real retention schedule before processing real users.
- Raw webhook bodies are not retained by default. Store event ID/type/hash and necessary normalized fields.
- Guest raw management tokens exist only in the delivery URL; database stores a one-way hash.
- Client notes are owner-only and excluded from notifications/logs/analytics projections.
- Account deletion is a documented manual workflow: revoke sessions/tokens, unlink or anonymize client snapshots where legally/product appropriate, preserve required non-identifying transaction/audit history, then delete auth identity. Do not cascade blindly.
- Supabase backups/PITR depend on plan selection. Document recovery point/time objectives only after capabilities are confirmed and perform a restore drill before production readiness.

## 12. Migration and seed discipline

- Numbered SQL migrations are immutable after merging and apply cleanly from an empty database.
- Every new table enables RLS in the same migration before application exposure; absence of policy means deny.
- Schema functions, grants, indexes, constraints, triggers, and storage policies are migration-controlled.
- Generate TypeScript database types after migrations and fail CI on drift.
- Seed data is deterministic, fictional, idempotent, and environment-gated. Password/demo auth-user creation uses a supported local/admin seed path, never inserts password hashes manually.
- Destructive schema changes use expand/migrate/contract across releases. Prefer forward-fix migrations to unsafe down migrations after production data exists.
- Measure index use with representative data; avoid speculative duplicate indexes and inspect query plans for appointment lists, availability, client search, analytics, audit, reminders, and webhook reconciliation.
