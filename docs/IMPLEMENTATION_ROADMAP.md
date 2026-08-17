# ServiceFlow Implementation Roadmap

## 1. Delivery approach

Build vertical, verifiable slices while keeping the application deployable. Each phase has a hard verification gate; do not advance with unexplained failures. The sequence prioritizes tenant security and scheduling correctness before visual breadth or integrations.

The roadmap assumes one developer. Estimates are deliberately omitted because quality and availability vary; phases are scoped to reviewable outcomes. New dependencies are added only when the phase needs them and after checking compatibility with the installed Next.js 16.3.1/React 19 stack and bundled Next.js documentation.

## 2. Definition of done for every phase

- Scope and acceptance criteria for the phase are met, including responsive and accessibility behavior for touched UI.
- No secrets, real personal information, service-role keys, or environment files are committed.
- Lint, typecheck, relevant tests, and production build pass; `git diff --check` is clean.
- Expected loading, empty, error, forbidden, and not-found states exist for new data surfaces.
- Authorization and validation are server-enforced for every new mutation/read path.
- Documentation, schema migrations/types, seed fixtures, and environment examples stay synchronized.
- Manual smoke notes and any deliberate debt are recorded before moving on.

## 3. Phase 0 — Baseline and decision record

### Deliverables

- Preserve and assess the minimal starter; document exact runtime/tool versions and package manager/lockfile.
- Read the installed Next.js guides relevant to each feature before implementation, especially project structure, Server/Client Components, auth, data security, Server Actions, Route Handlers, caching, errors, proxy/session handling, and deployment.
- Add developer commands for format/check, typecheck, unit, integration, E2E, and build as tools are introduced.
- Establish lightweight ADRs for Supabase client separation, RLS tenancy, booking concurrency, payment holds, and notification outbox.
- Define local/preview/production environment matrix and create a value-free `.env.example` when implementation begins.

### Verification gate

- Clean install and current starter build succeed from the lockfile.
- A new contributor can follow setup documentation without undocumented secrets.
- Architecture decisions match the installed framework APIs; no deprecated proxy/middleware/session pattern is assumed.

## 4. Phase 1 — UI foundation and marketing site

### Deliverables

- Define design tokens, typography, spacing, color, elevation, focus, motion, and responsive breakpoints with Tailwind CSS.
- Build accessible primitives needed immediately: buttons, links, inputs, selects, text areas, cards, badges, alerts, skeletons, dialogs, menus, pagination, and toast/live-region behavior.
- Implement marketing home, features, demo, privacy, terms, metadata, sitemap/robots, not-found, error, header/mobile navigation, footer, and polished CTA/product-preview sections.
- Establish route groups and shell layouts without overbuilding feature folders.

### Verification gate

- Manual checks at 320, 768, 1024, and 1440 px; no horizontal overflow and no inaccessible mobile-only interaction.
- Keyboard-only navigation, visible focus, reduced motion, semantic headings/landmarks, and automated accessibility smoke pass.
- Lighthouse-style performance/accessibility baseline is recorded; production build and visual smoke pass.

## 5. Phase 2 — Supabase foundation, schema core, and authentication

Phase 2 begins with a bounded Phase 2A foundation slice: compatible dependencies and scripts, value-free environment documentation and typed public/server validation, local Supabase configuration, and recorded architecture/schema decisions. Phase 2A intentionally creates no application tables, RLS policies, authentication pages, or protected routes.

Phase 2B adds only the core PostgreSQL schema, deny-by-default RLS authorization foundation, deterministic fictional fixtures, generated database types, and local pgTAP integration coverage. Application authentication and protected Next.js surfaces remain deferred to a later Phase 2 slice.

### Deliverables

- Add local/test Supabase workflow, migration directory, generated types, and separated browser/user-server/service-role clients.
- Migrate profiles, organizations, settings, memberships, services, staff assignments, availability, clients, and initial audit tables with RLS enabled immediately.
- Implement email/password sign-up, email confirmation/callback, sign-in/out, forgot/update password, session refresh using the current supported request mechanism, safe return paths, and protected layouts.
- Implement role/capability policy module and tenant-selection resolution.
- Add deterministic fictional seeds for at least two organizations and all roles, with a cross-tenant fixture.

### Verification gate

- Migrations apply from zero twice (fresh environment) and generated types show no drift.
- Auth lifecycle works locally, including expired/invalid callback and generic credential/reset errors.
- RLS matrix proves cross-tenant select/insert/update/delete denial across every introduced tenant table.
- Service-role key is absent from browser bundles and ordinary request modules.

## 6. Phase 3 — Owner onboarding and organization publishing

Progress: Phase 3 is complete across 3A–3C: atomic resumable setup, owner-operator profile, first service and assignment, transactional availability/review/publish lifecycle, protected preview, the narrow `/book/[slug]` projection, and optional tenant-scoped organization-logo/staff-avatar media. Interactive booking belongs to Phase 5.

### Deliverables

- Resumable multi-step onboarding for business identity/slug, timezone/location/currency, policies, first staff profile, first service, weekly availability, review, and publish.
- Server-side Zod schemas, field/form error handling, unique/reserved slug checks, progress persistence, and setup checklist.
- Public business preview and publish/unpublish lifecycle.
- Organization logo/staff avatar upload with Supabase Storage policies, size/type validation, and safe paths if images are included in this phase.

### Verification gate

- A new verified user completes onboarding and reaches a published public booking profile.
- Invalid, duplicate, interrupted, retried, and unauthorized steps behave predictably and idempotently.
- Publishing fails transactionally when any required setup invariant is missing.
- Owner B cannot view/change owner A’s draft, slug, files, or settings through UI, action, direct database call, or forged ID.

## 7. Phase 4 — Service, staff, and schedule management

### Deliverables

- Owner service create/edit/archive/activate with price/payment rules and staff assignments.
- Owner team invitation/list/deactivation and staff profile management; final-owner safety.
- Owner/staff weekly availability editor and one-off blocked time management with timezone labeling.
- URL-backed server-side search, filters, deterministic sort, pagination, and designed state variants.
- Audit events for membership, service, assignment, availability, block, and settings changes.

### Verification gate

- Permission matrix passes: staff can mutate only their profile/schedule; owner can manage tenant; inactive/suspended membership cannot mutate.
- Overlapping/invalid weekly intervals fail; DST boundary fixtures render valid intended instants.
- Archived/unassigned/inactive entities cannot be newly booked but historical references remain readable.
- Lists retain shareable URL state and behave correctly at zero, one, and multi-page result counts.

## 8. Phase 5 — Availability engine and no-payment booking

### Deliverables

- Pure timezone-aware availability engine plus bounded public availability Route Handler.
- Public booking flow: business/service, staff/any staff, date, slots, contact/policy, server confirmation, safe reference page.
- Transactional database booking function with schedule lock, overlap recheck, appointment snapshots, client upsert, event, audit, and notification-outbox record.
- Guest management tokens (hashed, expiring, revocable) and authenticated client ownership linking.
- Rate limits on availability/booking and idempotency on submission.

### Verification gate

- Unit matrix covers weekdays, multiple windows, blocks, buffers, lead/horizon limits, fully occupied days, DST gaps/ambiguity, and organization timezone vs browser timezone.
- Integration race sends concurrent requests for the same staff interval; exactly one active booking succeeds.
- Forged price/staff/tenant/time values are ignored/rejected and cross-tenant relationships cannot be persisted.
- Playwright completes guest and authenticated no-payment bookings on mobile and desktop, including a slot-lost recovery path.

## 9. Phase 6 — Operational dashboards and appointment lifecycle

### Deliverables

- Owner overview, appointment list/calendar/detail, client directory/detail, and staff assigned schedule.
- Client dashboard for upcoming/history/detail across organizations.
- Transactional create-on-behalf, reschedule, cancel, complete, and no-show operations with explicit state/policy/version checks.
- Role-specific search/filter/pagination plus all loading/empty/error/forbidden/not-found states.
- Accessible confirmations and success/error announcements.

### Verification gate

- State transition table has unit/integration coverage; repeated cancel/reschedule is idempotent or returns a clear conflict.
- Reschedule concurrency cannot overlap; lock ordering avoids deadlock in stress fixture.
- Owner sees own tenant, staff only assigned appointments, client only linked appointments, guest only token-scoped appointment.
- Critical owner/staff/client Playwright journeys pass with URL tampering tests.

## 10. Phase 7 — Stripe test-mode payments

### Deliverables

- Booking holds with expiry, server-derived PaymentIntent creation, Stripe client elements/test flow, and visible test-mode messaging.
- Raw-body signed Stripe webhook, durable provider event deduplication, payment state, hold conversion/reconciliation, and safe browser polling/confirmation.
- Expired/failed hold cleanup and minimal operational view/logging.
- Document refund/dispute/Connect/payout limitations in product copy and operations notes.

### Verification gate

- Test cards cover success, failure, authentication-required, abandoned/expired, duplicate webhook, and webhook-before/after-browser-return cases.
- Tampered amount/currency/metadata never confirms an appointment.
- Duplicate/out-of-order events do not create duplicate appointments/payments/emails.
- No secret/card data enters client bundles, database, logs, audit records, or error UI; webhook signatures fail closed.

## 11. Phase 8 — Email confirmations, reminders, and audit operations

### Deliverables

- Resend adapter and accessible versioned templates for confirmation, reschedule, cancellation, and reminder.
- Durable outbox delivery, semantic idempotency keys, bounded retry/attempt state, and protected Vercel cron reminder endpoint.
- Owner audit log and platform-admin audit view with safe filters/pagination.
- Structured correlation IDs and operational diagnostics for webhook/reminder/email failures.

### Verification gate

- Re-running booking/reschedule/cancel/reminder jobs never sends the same semantic notification twice.
- Provider outage leaves appointment correct and a retryable delivery record; recovery sends pending work.
- Cron rejects absent/wrong secret and claims concurrent work without duplicate processing.
- Audit entries exist for every designated important action, are tenant-isolated, redact sensitive fields, and cannot be edited/deleted by ordinary roles.

## 12. Phase 9 — Analytics and platform administration

### Deliverables

- Owner date-range metrics for bookings, cancellation/no-show, successful test payment revenue, clients, services, and staff.
- Staff own booking summary only, with precise metric/timezone labels and empty states.
- Platform-admin organization list/detail, status/usage summary, and suspend/reactivate workflow.
- Query indexes and representative seed volume sufficient to assess query plans and pagination.

### Verification gate

- Aggregate results match independently calculated fixture expectations across timezone/date boundaries.
- Revenue includes only defined successful payment states and never claims accounting accuracy.
- Every analytics query is tenant-scoped; staff and clients cannot infer tenant revenue.
- Suspension immediately blocks public bookings and tenant mutations while preserving the documented read/support behavior; action is audited.

## 13. Phase 10 — Quality hardening and production deployment

### Deliverables

- Complete Vitest, database integration, and stable critical-path Playwright suites; accessibility and responsive manual matrix.
- Distributed production rate limits or verified platform controls, CSP/security headers, redirect/input bounds, storage rules, log redaction, and dependency/secret scanning.
- Vercel preview/production projects, isolated Supabase environments, Stripe test webhooks, verified Resend sender, cron schedule, environment-variable runbook, migration/release/rollback runbook.
- Health checks, structured monitoring checklist/alerts, backup/PITR selection, restore drill notes, and incident/reconciliation playbook.
- Final deterministic demo accounts/data and reviewer walkthrough, clearly labeled as fictional/test mode.

### Verification gate

- CI passes lint, format/diff hygiene, TypeScript, unit, integration, production build, and E2E from a clean checkout.
- Security review includes RLS matrix, IDOR/URL tampering, service-role import audit, rate-limit tests, webhook/cron auth, CSP, storage policy, and secret scan.
- Preview smoke and production smoke cover all roles plus booking/payment/email/audit; callback and webhook URLs match the environment.
- Backup restore is demonstrated in a non-production environment; rollback/forward-fix steps are clear and usable.
- Product-wide acceptance gate in `PROJECT_SPEC.md` passes with known limitations visible in documentation/UI.

## 14. Suggested test ownership by layer

| Concern | Primary verification | Secondary verification |
|---|---|---|
| Role/capability rules | Vitest policy tests | RLS integration + E2E tampering |
| Tenant isolation | PostgreSQL/RLS integration | E2E cross-tenant URLs |
| Slot calculation | Vitest property/table tests | API integration + E2E selection |
| Double-booking | Concurrent DB integration | E2E slot-lost recovery |
| Appointment state | Unit state machine + DB integration | Role journeys |
| Stripe | Webhook/adapter integration | One sandbox E2E path |
| Email/reminders | Outbox integration | Sandbox delivery smoke |
| Responsive/a11y | Component checks + manual matrix | Playwright accessibility smoke |
| Analytics | SQL fixture integration | Dashboard E2E smoke |

## 15. Scope control and risk responses

- If scheduling correctness threatens schedule, cut visual calendar sophistication before cutting transactional/DST tests. A strong agenda/list view is acceptable.
- If payments threaten stability, ship complete no-payment booking first and keep payment behind an environment/tenant feature flag until its gate passes.
- If provider email is unreliable in previews, preserve outbox and preview rendered templates locally; do not make booking depend on delivery.
- If analytics queries become costly, reduce date range/chart breadth and use simple indexed aggregates before introducing background aggregation.
- If public abuse appears, tighten limits and add a challenge; do not collect unnecessary fingerprinting data preemptively.
- If component scope expands, reuse a small accessible primitive set. Avoid building a general-purpose design system.
- Multi-location, subscriptions, recurring bookings, refunds, calendar sync, and regulated clinic workflows require separate product/schema decisions and do not enter v1 opportunistically.

## 16. Post-MVP opportunities (not committed)

Only consider after production gates and measured demand: calendar export/sync, recurring appointments, group capacity, waitlist, multiple locations/resources, organization subscription billing, refund automation, advanced reporting, custom domains, and localized UI. Each requires an explicit threat/model/data migration review rather than extension by assumption.
