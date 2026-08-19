# ServiceFlow Product Specification

## 1. Document purpose

This document defines the portfolio-scale product contract for ServiceFlow. It describes what the product must do, who it serves, how success is evaluated, and what is intentionally excluded. Architecture, persistence, and delivery details are in the companion documents.

## 2. Product summary

ServiceFlow is a multi-tenant scheduling and lightweight operations SaaS for appointment-based businesses such as fitness coaches, salons, consultants, and small clinics. A business can publish services and staff availability, accept online bookings and test-mode payments, operate appointments from a role-aware dashboard, and understand basic business performance. Clients can book publicly and manage their own appointments after authentication.

The initial release is a technically credible portfolio application, not a regulated practice-management or accounting product. It should feel polished and dependable while remaining maintainable by one developer.

## 3. Goals and success measures

### Goals

- Let a new owner create a business and publish a bookable service in under ten minutes.
- Let a client find a real available slot and complete a booking on mobile without staff assistance.
- Give owners and staff a clear daily workflow for finding and managing appointments.
- Demonstrate strict tenant separation, sound authorization, robust transactional booking, and production-minded integrations.
- Present realistic seeded businesses and demo roles so reviewers can evaluate the complete product quickly.
- Meet a strong baseline for responsive design, accessibility, validation, resilience, and automated testing.

### Product indicators

- Onboarding completion rate and median time to first published service.
- Booking funnel conversion: service selected -> slot selected -> booking confirmed.
- Booking mutation success/error rate and double-booking count (target: zero).
- Dashboard page and action latency, with p95 server mutation latency monitored.
- Email delivery and Stripe webhook failure rate in test/demo environments.
- Automated accessibility checks and critical end-to-end flows passing before release.

These are instrumentation targets, not a commitment to build a full product analytics platform in v1.

## 4. Non-goals and deliberate limitations

- No native mobile app; the responsive web application is the product.
- No marketplace aggregating businesses, custom domains, or multi-location organizations in v1. Each organization has one primary location and timezone.
- No recurring appointments, group classes, waitlists, resource/room scheduling, packages, memberships, gift cards, coupons, tips, refunds, taxes, invoices, or payouts.
- No staff payroll, commissions, accounting, CRM automation, or calendar-provider sync.
- No organization-level subscription billing. Stripe is used only for test-mode client deposits/full payments.
- No SMS, push notifications, or two-way email conversations.
- No social login, magic links, SSO, SCIM, or granular custom roles.
- No real medical records, diagnoses, insurance, prescriptions, or compliance claims such as HIPAA. Clinic seed content must be non-sensitive and fictional.
- No multi-currency organization. Each organization selects one supported currency at creation and cannot change it after a paid appointment exists.
- Analytics are operational aggregates, not a financial ledger or business-intelligence system.

## 5. Personas, roles, and permissions

Authorization is deny-by-default. A person may be a client of several organizations and may be staff/owner in one or more organizations. The active organization determines tenant-scoped permissions.

| Capability | Platform admin | Business owner | Staff member | Client/guest |
|---|---:|---:|---:|---:|
| View platform health and organizations | All tenants, audited | Own organization | No | No |
| Suspend/reactivate an organization | Yes | No | No | No |
| Edit organization profile/settings | Emergency support only | Yes | No | No |
| Manage owner/staff memberships | Emergency support only | Yes | No | No |
| Manage services and staff assignments | Read/support | Yes | No | No |
| Manage own staff profile/availability | Support | Yes, any staff | Own only | No |
| View appointments | Support, audited | All in organization | Assigned appointments | Own only |
| Create/reschedule/cancel appointment | Support, audited | All in organization | Assigned appointments within policy | Own within policy; guest via secure link only |
| View analytics | Aggregate/platform | Organization-wide | Own booking summary only | No |
| View audit log | Platform scope | Organization scope | No | No |
| Book a public slot | Yes | Yes | Yes | Yes |

Rules:

- `platform_admin` is a platform-level claim/profile attribute, never an organization membership role.
- `owner` and `staff` are organization membership roles. At least one active owner must remain.
- `client` is the default authenticated product role and is represented per organization by a client record, not by a privileged global claim.
- Guests can book with name/email/phone but cannot use a client dashboard until they sign in and the email is safely matched or the booking is claimed through a verified flow.
- Platform-admin tenant access is reserved for support and must create an audit event with actor, tenant, action, and reason where applicable.

## 6. Detailed user journeys

### 6.1 Visitor and marketing

1. A visitor lands on the responsive home page and can understand the value proposition, core features, example workflows, pricing-positioning (demo messaging, not purchasable plans), FAQ, and calls to action.
2. The visitor can navigate with keyboard and screen reader, use a mobile menu, and reach sign-up, sign-in, demo, privacy, and terms pages.
3. Public pages expose meaningful metadata, semantic headings, share imagery, and fast-loading content.

### 6.2 Owner sign-up and onboarding

1. The owner creates an account with email/password, verifies email, and signs in.
2. If no organization exists, the owner enters a resumable onboarding flow: business details and slug; timezone/location/currency; booking policies; first staff profile; first service; weekly availability; review/publish.
3. Every step validates on client for usability and again on server for trust. The slug is checked for format, reserved words, and uniqueness.
4. The owner can save progress and resume. The organization remains `draft` and unbookable until required data exists.
5. Publishing makes `/book/[slug]` available. The owner sees a checklist and preview.

Phase delivery note: before the Phase 5 booking engine is implemented, the published route is an informational public profile only. It displays allowlisted business, staff, service, and weekly-hours data and clearly disables interactive booking rather than simulating an appointment.

### 6.3 Owner operations

1. The owner sees today/upcoming appointments, status summaries, recent activity, and setup alerts.
2. The owner can create, edit, archive, search, filter, sort, and paginate services; assign one or more active staff; and configure duration, buffer, price, and payment requirement.
3. The owner can invite staff, deactivate membership, edit staff public profiles, assign services, set weekly availability, and add blocked time.
4. The owner can search/filter/paginate appointments and clients, open details, create an appointment on behalf of a client, and reschedule/cancel according to explicit rules.
5. The owner views bookings, revenue, and client analytics for a date range and can inspect an organization audit log.

### 6.4 Staff workflow

1. An invited staff member accepts after authenticating with the invited email.
2. Staff see only their schedule and summary. They can filter by date/status/client.
3. Staff can edit their profile and weekly availability, create blocked time, and manage status/rescheduling/cancellation only for appointments assigned to them.
4. Staff cannot manage services, other members, organization settings, tenant-wide analytics, or the audit log.

### 6.5 Public client booking

1. A client opens `/book/[slug]`, sees the business, location/timezone, policies, active services, price, duration, and assigned staff.
2. The client selects a service, optionally chooses a staff member or “any available,” chooses a date within the booking horizon, then chooses a server-calculated available time. Times are displayed in the business timezone with an explicit label.
3. The client enters contact details, accepts policies, and authenticates optionally or continues as guest.
4. If payment/deposit is required, the server creates a short-lived booking hold and Stripe PaymentIntent; the client completes Stripe test checkout/payment UI. A webhook is the authority for payment success.
5. The server atomically confirms the still-valid slot. If the slot is no longer available, no duplicate appointment is created and the user receives a recoverable next-step/refund-or-cancel message for the test payment.
6. The confirmation page shows a non-sensitive reference, details, and management options. An idempotent confirmation email is queued/sent.

### 6.6 Client account

1. An authenticated client sees upcoming and past appointments across businesses, with organization context.
2. They can search/filter/paginate history and open appointment details.
3. Within organization policy, they can reschedule to a newly validated slot or cancel. Paid/deposit refund handling is explicitly shown as manual/out of scope for v1 unless no capture occurred.
4. Client actions trigger audit records and notification emails. They cannot access other clients or tenant operations.

### 6.7 Platform administration

1. A platform admin signs into a separately guarded admin area.
2. They can search/filter/paginate organizations and inspect status, owners, usage counts, and recent platform audit events.
3. They can suspend/reactivate a tenant. Suspension blocks public booking and tenant mutations but preserves data and limited owner read access.
4. Any support access or state change is authorization-checked and audited. Impersonation is excluded.

## 7. Functional requirements and acceptance criteria

### 7.1 Marketing and public shell

- Home, features, demo, privacy, and terms pages use a consistent responsive design system.
- Header/navigation, mobile menu, footer, CTA sections, testimonials/example outcomes, FAQ, and product previews have usable focus states and semantic markup.
- Core public pages work at 320 px width through wide desktop without horizontal scrolling.
- Metadata, sitemap, robots policy, not-found page, and social metadata are defined before production launch.

### 7.2 Authentication and account lifecycle

- Users can sign up, verify email, sign in, sign out, request password reset, and set a new password with Supabase email/password auth.
- Protected routes redirect unauthenticated users to sign-in with a validated return path.
- Authentication errors do not reveal whether an account exists.
- Session refresh is supported through the framework integration; authorization is always rechecked near data access/mutation.
- Profile completion and invitation acceptance are idempotent.

### 7.3 Organization and onboarding

- Organization slug is globally unique, case-normalized, stable in v1, and excludes reserved route words.
- Draft progress persists. Required publish conditions are: valid organization settings, one active owner/staff profile, one active service assignment, and at least one availability window.
- A published tenant can be manually unpublished by its owner; suspended tenants cannot publish or accept bookings.
- All tenant data reads and writes are RLS protected and application scoped by organization ID.

### 7.4 Services and staff

- Service fields include name, description, duration, cleanup/buffer duration, price, payment mode (`none`, `deposit`, `full`), deposit amount where applicable, visibility, and active/archive state.
- Currency amounts use integer minor units; durations are bounded positive minutes.
- Services cannot be hard-deleted once referenced by an appointment. Archived services are not publicly bookable.
- Staff profiles can be public/private and contain display name, biography, optional avatar, and active state.
- Organization logos and staff avatars are optional public presentation assets. They use generated tenant-scoped object names, an image-only 2 MB public bucket, authenticated owner mutation policies, and validated stored object paths; their absence never blocks publication.
- Only active membership + active staff profile + active assignment can receive new bookings.
- Phase 4A owners manage services at `/dashboard/services`: creation and edits derive currency from the organization, lifecycle uses archive/activate rather than deletion, and assignments accept only same-tenant active public staff backed by active verified memberships. Search/filter/pagination, invitations, staff editing, and schedule editing remain later Phase 4 slices.
- Phase 4B owners manage members and invitation history at `/dashboard/team`. Invitations grant only `staff`, expire after seven days, accept only for the verified invited email, and retain accepted/expired/revoked history. Deactivation retains the membership/profile, disables active service assignments, and reactivation never silently restores assignments. Weekly availability and blocked time remain Phase 4C.
- Phase 4C provides `/dashboard/availability` and tenant-scoped staff schedule routes. Active verified owners manage any active owner/staff profile in their operational organization; active verified staff manage only their own. Recurring intervals use the organization timezone, are ordered by weekday/start, and reject duplicates or overlap. One-off blocks store UTC instants, allow overlap as a logical union, and keep optional labels private.
- Phase 4D makes the service, team membership, invitation-history, and availability-member lists server-driven and shareable. Validated URL parameters control bounded search, allowlisted filters and sort direction, and database pagination. Every order has a UUID tie-breaker; malformed parameters fall back safely; page-changing links preserve active state; and independent membership/invitation controls coexist on `/dashboard/team` without broadening owner-only email visibility.

### 7.5 Availability and blocked time

- Staff define zero or more non-overlapping weekly windows per weekday in the organization timezone.
- Owners/staff can add one-off blocked intervals with a reason; overlaps are coalesced logically for availability calculations.
- Availability accounts for service duration, service buffer, weekly windows, blocked time, active appointments/holds, booking lead time, horizon, and slot interval.
- DST boundaries are handled by storing instants in UTC and interpreting recurring availability in the IANA organization timezone. Ambiguous/nonexistent local times must not silently create invalid slots.
- The availability endpoint is bounded by tenant/service/date and rate limited; it never returns private appointment details.

Phase 5A delivers the read-only portion: `/book/[slug]` discovers intentionally published services and `/book/[slug]/availability` selects eligible staff/date/slot with reloadable URL state. A selected slot is explicitly neither held nor confirmed. `/api/availability` accepts exactly one validated slug, service, staff choice, and local date and returns no-store public DTOs. Distributed edge rate limiting remains a deployment-hardening requirement; the implementation does not claim an in-memory limiter is production safe.

### 7.6 Appointments

- Appointment statuses are `pending_payment`, `confirmed`, `completed`, `cancelled`, and `no_show`; transitions follow a documented state machine.
- Creation and rescheduling validate the slot again in the same transaction that writes the appointment.
- Concurrent requests for the same staff interval yield at most one active appointment/hold.
- Appointments snapshot service name, duration, buffer, price, currency, client contact, timezone, and applicable policy so history survives later edits.
- Cancellation stores actor, timestamp, and optional reason; records are retained rather than hard-deleted.
- Owner/staff may mark confirmed past appointments complete/no-show. Clients cannot.
- Every material mutation creates an audit event and relevant notification job/event.

### 7.7 Payments

- Stripe runs only in test mode for the portfolio deployment.
- PaymentIntent creation is server-only, amount/currency are derived from trusted data, and metadata contains stable internal identifiers without sensitive details.
- Webhook signature verification uses the raw request body. Events are stored/deduplicated by Stripe event ID and processed idempotently.
- Client redirects are never treated as payment proof; appointment/payment status is reconciled from the webhook/API.
- Failed/expired payments release holds. Payment records retain provider references, amount, currency, status, and timestamps.
- Refund workflows, disputes, Connect, and payouts are explicitly outside v1; the UI communicates this limitation.

### 7.8 Email

- Resend sends verification/reset through the selected auth configuration and application emails for confirmations, reschedules, cancellations, and reminders.
- Email delivery is asynchronous from the core booking mutation when possible. A failed email does not roll back a valid appointment.
- Notification records use idempotency keys, record attempts/status, and expose retryable operational failures without leaking provider details to users.
- Reminder processing targets confirmed appointments at a configured interval (initially 24 hours) and is safe to rerun.

### 7.9 Dashboards and lists

- Owner, staff, client, and platform-admin dashboards are role appropriate.
- Lists use URL-backed search/filter/sort/page state, deterministic ordering, bounded page sizes, and server-side queries.
- Every data surface has designed loading, empty, error, forbidden, and not-found states.
- Destructive/irreversible-looking actions require clear confirmation and report success/failure accessibly.

### 7.10 Analytics

- Owner metrics: confirmed/completed booking count, cancellations/no-shows, gross collected revenue, outstanding scheduled value, unique/new clients, top services, and staff utilization/booking count.
- Staff see only their own operational booking summary, not tenant revenue.
- Date ranges are evaluated in the organization timezone and labeled. Revenue means successful test payments, net of recorded test refunds if refunds are later added; it is not accounting revenue.
- Empty ranges show zero/empty visualizations, not errors. Queries remain tenant-scoped and indexed.

### 7.11 Demo data

- Seed at least two visibly distinct organizations plus one isolated tenant fixture used by tests.
- Include platform admin, owner, staff, and client demo accounts; realistic services, availability, blocks, clients, appointments across statuses, payments, notifications, and audit records.
- Credentials are documented only for local/preview demo environments and never seed production automatically.
- Seed execution is deterministic and idempotent, and fictional data contains no real personal information.

## 8. Application route inventory

Routes may be grouped internally with App Router route groups without changing their URLs.

| Route | Access | Purpose |
|---|---|---|
| `/`, `/features`, `/demo`, `/privacy`, `/terms` | Public | Marketing/legal pages |
| `/auth/sign-up`, `/auth/sign-in`, `/auth/forgot-password`, `/auth/update-password` | Public/anonymous | Account flows |
| `/auth/callback`, `/auth/confirm` | Token/callback | Supabase confirmation and redirect handling |
| `/onboarding`, `/onboarding/[step]` | Authenticated prospective owner | Resumable organization setup |
| `/book/[slug]` | Public | Business/service selection |
| `/book/[slug]/availability` | Public | Date and slot selection UI |
| `/book/[slug]/details` | Public | Contact, policy, and payment step |
| `/book/[slug]/confirmation/[reference]` | Public with opaque capability / authenticated owner | Safe confirmation summary |
| `/manage/[token]` | Public with expiring capability | Guest appointment management |
| `/dashboard` | Authenticated | Resolve role/active tenant and redirect |
| `/dashboard/overview` | Owner/staff | Tenant/own operational overview |
| `/dashboard/calendar`, `/dashboard/appointments`, `/dashboard/appointments/[id]` | Owner/staff | Schedule and appointment management |
| `/dashboard/services`, `/dashboard/services/new`, `/dashboard/services/[id]` | Owner | Service management |
| `/dashboard/staff`, `/dashboard/staff/[id]` | Owner; own profile exception | Staff and assignment management |
| `/dashboard/availability` | Owner/staff | Weekly schedule and blocked time |
| `/dashboard/clients`, `/dashboard/clients/[id]` | Owner; limited assigned context for staff | Client directory/history |
| `/dashboard/analytics` | Owner | Tenant analytics |
| `/dashboard/settings`, `/dashboard/settings/booking`, `/dashboard/settings/team` | Owner | Organization and policy settings |
| `/dashboard/audit-log` | Owner | Tenant audit history |
| `/client`, `/client/appointments`, `/client/appointments/[id]`, `/client/profile` | Client | Client dashboard |
| `/admin`, `/admin/organizations`, `/admin/organizations/[id]`, `/admin/audit-log` | Platform admin | Platform operations |
| `/api/availability` | Public, rate limited | Bounded availability JSON query |
| `/api/stripe/create-intent` | Public/authenticated, rate limited | Trusted PaymentIntent creation |
| `/api/webhooks/stripe` | Stripe signature | Payment webhook |
| `/api/cron/reminders` | Vercel cron secret | Reminder dispatch |
| `/health` or `/api/health` | Public, minimal | Deployment health response |

## 9. Cross-cutting experience requirements

### Responsive behavior

- Mobile (320-767 px): single-column forms, bottom-safe actions where useful, list cards instead of compressed tables, touch targets at least 44 CSS px.
- Tablet (768-1023 px): collapsible sidebar, adaptive two-column forms, scrollable calendar/list affordances.
- Desktop (1024 px+): persistent navigation where space permits, tables with essential columns, multi-panel calendar/detail views.
- Do not encode authorization through responsive visibility; hidden controls remain server-authorized.

### Accessibility

- Target WCAG 2.2 AA: semantic landmarks, logical heading structure, sufficient contrast, visible focus, keyboard operation, labels/descriptions, error summaries, and reduced-motion support.
- Dialogs, menus, date controls, and toasts have correct focus management and accessible names.
- Time slots expose date, time, timezone, staff, availability, and selected state to assistive technology.
- Automated checks supplement manual keyboard and screen-reader smoke tests.

### Validation and errors

- Zod schemas are shared only where safe; server validation is authoritative and maps field issues to accessible form feedback.
- Expected errors return typed outcomes/codes. Unexpected errors go to route error boundaries and observability with a correlation ID.
- User messages are actionable but omit stack traces, SQL/provider details, existence leaks, and secret values.
- Retry paths are idempotent. Loading/submitting controls prevent accidental repeats but never substitute for server idempotency.

## 10. Product-wide acceptance gate

The MVP is release-ready only when:

- The four roles can complete their documented journeys using demo accounts.
- Automated tenant-isolation tests prove cross-tenant reads and writes fail at both ordinary client and server paths.
- Parallel booking tests produce no overlapping active appointments for one staff member.
- Stripe test payment, verified webhook, confirmation email record, reschedule, cancellation, reminder, and audit paths are demonstrated.
- Critical pages pass responsive, keyboard, accessibility, loading/empty/error, and authorization review.
- Unit, integration, and Playwright critical-path suites, lint, typecheck, and production build pass in CI.
- Vercel preview and production environments have validated environment configuration, migrations, seed policy, monitoring, backup/recovery notes, and rollback steps.

## 11. Risks

- Scheduling across DST and concurrent writes is deceptively complex; constrain v1 to one organization timezone and cover boundary/concurrency cases extensively.
- Supabase service-role use can bypass RLS; isolate it to webhook/cron/admin modules and never use it for ordinary request data access.
- Stripe payment and booking consistency spans systems; use explicit holds, idempotency, reconciliation, and operational recovery states.
- Email/cron delivery is at-least-once; deduplicate by notification key and treat provider delivery separately from domain success.
- Broad dashboards can expand scope; prefer complete, polished core flows and simple server-rendered aggregates over real-time BI.
- Public endpoints invite enumeration and abuse; use opaque references, generic responses, input bounds, rate limiting, and bot/spam mitigations appropriate to a portfolio deployment.
