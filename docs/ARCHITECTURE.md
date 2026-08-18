# ServiceFlow Architecture

## 1. Context and principles

ServiceFlow will evolve from the current minimal Next.js 16.3.1, React 19, TypeScript, and Tailwind CSS 4 App Router starter into a server-first modular monolith deployed on Vercel. PostgreSQL, Supabase Auth, and Supabase Storage provide the backend foundation; Stripe test mode handles client payments; Resend handles application mail.

The design follows the documentation bundled with the installed Next.js version rather than assumptions from older releases. In particular, pages/layouts are Server Components by default, request APIs and dynamic route params are asynchronous, Server Functions are remotely reachable mutation endpoints that require their own authorization, and Route Handlers are used only for explicit HTTP boundaries.

Principles:

- Keep one deployable application and one database; organize by domain, not microservice.
- Default to server rendering and server data access; add Client Component boundaries only for state, event handling, and browser APIs.
- Put authorization beside every data operation, with PostgreSQL RLS as an independent backstop.
- Make booking/payment/email processes explicit, idempotent, observable state machines.
- Prefer database constraints and small transactional functions over application-only invariants.
- Keep provider adapters thin so domain logic is testable without external calls.
- Optimize for one developer: direct SQL migrations, generated database types, simple modules, and limited infrastructure.

## 2. System context

```text
Browser
  -> Vercel / Next.js App Router
       -> Server Components (reads)
       -> Server Actions (first-party mutations)
       -> Route Handlers (public JSON, webhooks, cron, health)
       -> Domain/application services
            -> Supabase PostgreSQL + RLS
            -> Supabase Auth
            -> Supabase Storage
            -> Stripe test API
            -> Resend API

Stripe -> signed webhook Route Handler
Vercel Cron -> secret-authenticated reminder Route Handler
Supabase Auth -> email confirmation/reset callbacks
```

No browser code receives a Supabase service-role key, Stripe secret, Resend key, database URL, or authorization decision. The Supabase publishable/anon value may be public; its privileges remain restricted by RLS.

## 3. Recommended source organization

This is a target layout, not an instruction to create all files at once.

```text
src/
  app/
    (marketing)/
    (auth)/auth/
    (booking)/book/[slug]/
    (owner-staff)/dashboard/
    (client)/client/
    (platform-admin)/admin/
    api/
      availability/route.ts
      stripe/create-intent/route.ts
      webhooks/stripe/route.ts
      cron/reminders/route.ts
      health/route.ts
    error.tsx
    global-error.tsx
    not-found.tsx
  components/
    ui/                 # accessible primitives
    forms/              # interactive form islands
    data-display/
    marketing/
  features/
    auth/
    organizations/
    services/
    staff/
    availability/
    appointments/
    payments/
    notifications/
    analytics/
    audit/
    admin/
  lib/
    supabase/           # browser, server-user, and service-role factories
    stripe/
    resend/
    validation/
    authz/
    rate-limit/
    observability/
    env.ts
  types/
supabase/
  migrations/
  seed.sql (or an idempotent seed script)
tests/
  unit/
  integration/
  e2e/
```

Each feature may contain `queries.ts`, `actions.ts`, schemas, domain types, pure policies, and components. Database/provider imports should flow inward through small repositories/adapters; UI should not embed SQL or provider orchestration.

## 4. Rendering and server/client responsibilities

### Server Components by default

Use Server Components for layouts, authentication/organization resolution, database reads, metadata, initial tables/cards, and analytics. Benefits are less browser JavaScript, secrets kept server-side, and direct request-time authorization. Protected dashboard reads should be dynamic/request-bound and should not be placed in shared public caches.

Search parameters drive list filtering and pagination. The server validates them, issues a bounded query, and renders the canonical result. Streaming with route-level `loading.tsx` or Suspense can separate slow analytic panels from navigation and primary content.

### Narrow Client Components

Use Client Components only for:

- mobile navigation, dialogs, menus, toasts, and focus management;
- interactive date/time selection and optimistic form affordances;
- calendar controls and lightweight chart interaction;
- Stripe client payment elements;
- browser file selection/previews for avatar upload.

Pass the minimum serializable data from server to client. Never pass full session tokens, hidden tenant rows, service keys, or authorization-capable objects. Keep client-side state ephemeral or URL-backed; the server/database remains authoritative.

### Caching

- Marketing content can be prerendered/cached.
- Public business/service details may use short tagged caches if all data is intentionally public and publish/archive actions invalidate the tag.
- Authenticated/tenant-personalized data is read per request. Do not cache it globally. If framework caching is later introduced, every key/tag must include tenant and authorization dimensions.
- Availability is volatile: calculate on request, return short private/no-store semantics, and revalidate transactionally on booking.
- Mutations return the updated result or use the installed Next.js revalidation APIs deliberately; correctness cannot depend on cache invalidation alone.

## 5. Request and mutation strategy

### Server Actions

Use Server Actions for first-party form mutations: onboarding, service/staff/settings updates, availability/blocked-time changes, appointment operations, profile changes, and admin state changes. Every action follows one pipeline:

1. Parse with a Zod schema and reject unexpected/oversized input.
2. Resolve the authenticated user from Supabase on the server.
3. Resolve explicit tenant context from a trusted membership lookup, never from a client claim alone.
4. Check role/capability and resource ownership near the mutation.
5. Call a domain service or transactional database function.
6. Write audit/notification state in the same database transaction where appropriate.
7. Return a typed expected result; log unexpected failures with correlation ID.
8. Revalidate/refresh only the affected UI and redirect using an allowlisted internal path when needed.

Server Actions use POST but remain directly invokable endpoints. Hiding a button is never authorization.

Owner onboarding uses a user-session Supabase client, never the service-role client. Its start RPC is transactionally idempotent and takes no user ID; it locks on `auth.uid()` before resolving or creating a draft. Each implemented step has a focused Zod schema and a matching security-definer RPC with a fixed empty `search_path`. Progress is a constrained relational row of completion timestamps, and the server always resumes from the first incomplete persisted step rather than trusting a route or browser step number. Active draft ownership resolves to `/onboarding`; only non-draft active tenant membership resolves to the owner dashboard.

### Route Handlers

Use Route Handlers where an HTTP contract is required:

- `GET /api/availability`: public bounded query used by the booking UI.
- `POST /api/stripe/create-intent`: public/authenticated payment setup with rate limit and trusted pricing.
- `POST /api/webhooks/stripe`: raw-body signature verification and idempotent event handling.
- `GET|POST /api/cron/reminders`: Vercel cron invocation authenticated by a secret.
- health endpoint returning only non-sensitive status.

Do not build a parallel REST API for ordinary dashboard CRUD. If a future mobile/external API is required, introduce versioned route contracts then.

### Read model

Server Components call server-only query functions. Query functions accept an authorization context (`userId`, `organizationId`, capabilities), select explicit columns, apply deterministic sorting and limits, and let RLS recheck access. They do not expose raw Supabase clients to UI modules.

## 6. Authentication and authorization

### Authentication

- Supabase Auth owns credentials, password hashing, email verification, password reset, sessions, and refresh tokens.
- Email/password is the only v1 sign-in method. Require verified email before privileged organization mutations and booking ownership claims.
- Use the official SSR cookie integration appropriate to the installed packages. Refresh sessions in the request layer/proxy mechanism required by the installed Next.js/Supabase versions.
- Treat middleware/proxy route checks as an early UX redirect only, not the security boundary.

Phase 2C implements this boundary with four explicit client factories: browser, authenticated server-user, Proxy/session-refresh, and a server-only service-role factory. Ordinary request modules use only the user-scoped client. Proxy calls `getClaims()` for session refresh and optimistic anonymous redirects; protected layouts independently call `getUser()`, resolve protected profile data, active memberships, non-suspended organizations, and linked client records before selecting a destination. Authenticated responses use private/no-store semantics.

Email/password flows use Server Actions with Zod validation and generic credential/reset responses. Callback and confirmation handlers accept only validated internal return paths. Recovery password changes additionally require a short-lived HTTP-only marker bound to the server-verified user; a normal authenticated session alone is not treated as a recovery session. Local Auth redirects are restricted to the local application, and production must configure the exact Vercel URLs and matching Supabase email templates/redirect allowlist.

### Authorization model

Authorization has three layers:

1. Route/layout guard selects the correct experience and rejects obvious role mismatches.
2. Domain/query/action guard verifies authenticated user, active organization membership, role/capability, tenant status, and resource relationship.
3. PostgreSQL RLS checks tenant membership/ownership again for every table access made with the user session.

`user_profiles.platform_role = 'platform_admin'` grants platform capabilities through carefully reviewed policies/functions. Tenant roles live only in `organization_memberships`. A membership must be active and the organization must not be suspended for mutations. Clients access appointments through verified `client_records.user_id`; guests use hashed, scoped, expiring management tokens through server-only functions.

Platform admin service operations should use user-context RLS where practical. The service-role client is reserved for verified webhooks, cron, seed/admin maintenance, and narrowly scoped internal jobs because it bypasses RLS.

### Tenant context

Tenant dashboard routes should carry an active organization selection in a validated, HTTP-only preference cookie or route selection, then re-resolve membership server-side on every request. Never authorize solely from a slug, hidden form field, JWT metadata, or client-supplied organization ID. All tenant tables include `organization_id`, and joins verify matching tenant IDs.

## 7. Scheduling architecture

### Availability calculation

Inputs are organization, service, optional staff, date range (bounded), and current time. Server logic:

1. Load published tenant booking policy and timezone.
2. Find active staff assignments for the active service.
3. Expand each staff member’s weekly local-time windows for the requested local date.
4. Resolve local intervals through the IANA timezone into UTC, explicitly handling DST gaps/ambiguity.
5. Subtract blocked intervals and active appointment/hold intervals, including service buffer.
6. Apply lead time, horizon, and slot interval; retain candidates that fit fully inside a window.
7. Return deduplicated slots with opaque staff ID only where intended and an explicit timezone.

Availability responses are hints, not reservations.

### Atomic booking/rescheduling

A PostgreSQL RPC/function owns the final invariant. It takes trusted service/staff/client/request inputs, locks a stable staff/date scheduling key (transaction-scoped advisory lock or equivalent), reloads service/policy, checks blocks and overlap, then inserts/updates appointment plus audit/outbox records in one transaction. Database range/exclusion protection should be used if supported cleanly; otherwise the locked overlap query is mandatory and concurrency-tested.

Rescheduling locks the relevant old/new schedule keys in deterministic order to avoid deadlocks. Appointment mutation uses an expected `updated_at` or version for optimistic concurrency, returning a conflict that the UI can recover from.

### Holds and payment sequence

- For no-payment services, the atomic function creates `confirmed` directly.
- For deposits/full payments, create a short-lived `booking_holds` record through the same overlap-safe mechanism, then create/reuse a Stripe PaymentIntent with an idempotency key.
- The signed Stripe webhook records the provider event, verifies amount/currency/metadata against trusted records, converts the valid hold to a confirmed appointment (or marks reconciliation required), records payment, and emits notification work.
- Expired/failed holds stop blocking availability. A scheduled cleanup/reconciliation path handles abandoned and late events.

This avoids treating browser success redirects as proof and acknowledges that database and Stripe cannot share one transaction.

## 8. Payments and email integrations

### Stripe

Use a server-only Stripe adapter. All amounts come from the service snapshot/hold, never the browser. Stripe event IDs and idempotency keys are unique in PostgreSQL. Store PaymentIntent ID but no card data. The webhook returns promptly after durable idempotent processing; failures remain retryable by Stripe. Test-mode badges and limitations are visible in demo UI.

### Resend and notification outbox

Domain transactions add a `notification_deliveries` record with a unique semantic key. A sender invoked after commit or by a protected job renders a versioned template and calls Resend. Status tracks pending/sent/failed and attempts. Reminder scans create missing delivery rows using a uniqueness constraint, so retries cannot duplicate a reminder. Email failures are operationally visible but do not invalidate appointments.

For the simplest portfolio release, the protected cron handler may both claim and send a small batch. A separate queue is deferred until scale requires it.

## 9. Files and storage

Supabase Storage stores organization logos and staff avatars only. Buckets enforce MIME/type and size limits, randomized object paths, and tenant/user-aware storage policies. Public branding images may use a public/read bucket after moderation assumptions are documented; uploads still require owner/self authorization. Avoid user-controlled SVG/HTML and strip or normalize risky image metadata where feasible.

## 10. Search, filtering, pagination, and analytics

- Prefer PostgreSQL queries over downloading/filtering in the browser.
- Use URL search params validated with Zod. Normalize empty search, allowlist sort fields, cap page size (for example 20 default, 100 maximum), and add a stable ID tiebreaker.
- Offset pagination is acceptable for portfolio-scale owner tables. Use cursor pagination for high-growth audit logs if needed.
- Search uses indexed normalized fields or PostgreSQL trigram indexes only where measurement justifies them; never interpolate raw query syntax.
- Analytics start as bounded SQL aggregate queries over indexed appointments/payments/client records. Do not add a warehouse or event pipeline. If performance requires it later, add daily aggregate views/jobs without changing metric definitions.

## 11. Validation, errors, rate limiting, and observability

### Validation

Zod validates environment variables at boot/build, route parameters, search parameters, form inputs, provider metadata, and external payloads after signature verification. Database constraints remain authoritative for invariants. Shared schemas must not cause server-only modules to enter the client graph.

### Error model

Expected failures use stable codes such as `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_FAILED`, `SLOT_UNAVAILABLE`, `CONFLICT`, `PAYMENT_REQUIRED`, and `RATE_LIMITED`. Forms return field and form errors. Pages use `not-found`, forbidden handling, local error boundaries, and a global fallback. Logs contain correlation/event IDs and structured context, but redact credentials, tokens, full request bodies, and sensitive client fields.

### Rate limiting and abuse

Apply rate limits to sign-in/sign-up/reset (alongside Supabase controls), public availability, booking/hold creation, payment-intent creation, management-token actions, and contact-like endpoints. Use a managed Vercel-compatible store or platform firewall in production; a database-backed limiter is acceptable initially if atomic and bounded. Keys combine salted IP fingerprint and resource/account dimensions. Return generic `429` responses and `Retry-After`. Add honeypot/Turnstile only if observed abuse warrants it.

### Observability

Use Vercel logs/analytics plus structured application logging. Capture route/action, correlation ID, tenant ID where appropriate, actor ID, provider event ID, latency, and sanitized error code. Define alerts/manual checks for webhook failures, reminder backlog, repeated booking conflicts, elevated server errors, and migration failure. Product audit logs are immutable business records, not substitutes for operational logs.

## 12. Security and privacy

- Enforce TLS, secure HTTP-only same-site cookies, CSRF protections supplied by same-origin Server Actions plus explicit origin checks where relevant, and a restrictive content security policy compatible with Stripe/Supabase/Resend needs.
- Validate redirect targets against an internal allowlist. Do not accept arbitrary callback URLs.
- Keep secrets server-only and separated by local/preview/production. Rotate compromised keys; webhook and cron secrets are independent.
- Use parameterized Supabase/PostgreSQL APIs, explicit column selection, least-privilege policies, and separate user-context/service-role clients.
- Prevent IDOR with resource-and-tenant lookups, not guess-resistant IDs alone. Public references and guest tokens are still opaque, hashed at rest where token-like, expiring, and revocable.
- Redact email/phone and payment/provider IDs from logs and analytics. Limit platform admin display of client details.
- Publish privacy/terms copy that accurately describes a demo product. Provide a documented manual account/tenant deletion process; destructive retention automation is deferred.
- Backups and point-in-time recovery follow the selected Supabase plan. Restore procedure must be rehearsed before claiming recoverability.
- Dependency scanning, secret scanning, lint/type checks, and migration review run in CI. Avoid exposing source maps or debug details unnecessarily.
- Do not claim HIPAA, PCI merchant certification, or medical compliance. Stripe-hosted elements keep card details out of ServiceFlow, but operational security responsibilities remain.

## 13. Testing architecture

### Unit tests (Vitest)

- Pure role/capability policies and appointment state transitions.
- Money/duration rules, Zod schemas, pagination parsing, redirect allowlisting.
- Timezone/DST slot expansion, lead/horizon/buffer logic, and email template data.
- Provider adapters with mocked HTTP clients; no assertions on framework internals.

### Integration tests

- Run against an isolated local/test Supabase PostgreSQL stack or dedicated test project, never production.
- Migrations apply from zero; generated types match schema.
- RLS matrix covers anonymous, client, staff, owner, platform admin, suspended tenant, inactive membership, and cross-tenant IDs for every tenant table.
- Transaction/concurrency tests race booking/hold/reschedule calls and assert no staff overlap.
- Stripe webhook signature/idempotency/out-of-order event handling; notification deduplication and reminder claiming.
- Server Action/Route Handler contracts validate auth, authorization, status codes, and typed errors.

### End-to-end tests (Playwright)

- Marketing navigation and responsive mobile menu.
- Owner sign-up/onboarding/publish; owner service/staff/availability CRUD.
- Guest no-payment booking and authenticated client booking/manage flow.
- Stripe test deposit flow with a deterministic webhook strategy in CI.
- Staff assigned-only access and appointment workflow.
- Client isolation and reschedule/cancel policy.
- Platform admin suspension and owner-visible consequence.
- Search/filter/pagination plus empty/loading/error recovery.
- Cross-role/cross-tenant URL tampering returns forbidden/not-found without leakage.
- Critical keyboard path and automated accessibility scan at representative widths.

### Test pyramid and CI

Most domain cases belong in fast unit tests; database security/concurrency belongs in integration tests; a small stable set of complete journeys belongs in Playwright. CI gates are format/diff hygiene, lint, TypeScript, unit, integration, production build, then E2E against an ephemeral/preview environment. External-provider tests use test/sandbox credentials and deterministic fixtures.

## 14. Deployment and environments

### Environments

- Local: local Supabase through Docker is required, with Stripe CLI test webhooks, Resend sandbox/test recipient restrictions, and deterministic fictional seed data.
- Preview: isolated Supabase branch/project where available, Stripe test mode, preview callback/webhook URL, restricted demo mail.
- Production portfolio: dedicated Supabase production project in the EU/Frankfurt region, Stripe test mode clearly labeled, verified Resend sender/domain, Vercel production deployment.

Preview must not point at the production database. Production does not auto-seed demo credentials unless explicitly designed as a public demo tenant with safe reset policy.

### Environment variables

Create `.env.example` during implementation with descriptions, not values. Expected categories:

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Browser-safe | Canonical environment origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | RLS-constrained browser/server user client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Webhook/cron/admin maintenance only |
| `STRIPE_SECRET_KEY` | Server-only | Stripe test API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser-safe | Stripe client elements |
| `STRIPE_WEBHOOK_SECRET` | Server-only | Webhook signature verification |
| `RESEND_API_KEY` | Server-only | Application email |
| `RESEND_FROM_EMAIL` | Server-only/config | Verified sender |
| `CRON_SECRET` | Server-only | Reminder endpoint authentication |
| rate-limit provider variables | Server-only | Distributed limiter if selected |
| observability variables | Mixed/documented | Error/logging provider if selected |

Only `NEXT_PUBLIC_*` values may enter browser bundles, and those are frozen at build time under Next.js semantics. Environment validation should fail fast with actionable messages and never print secret values.

### Release and migration process

1. Pull request runs all CI gates and creates a Vercel preview.
2. Review schema migration for locks, RLS, reversibility/forward-fix, and compatibility with current code.
3. Apply backward-compatible production migration before or during deploy as documented; never mutate production schema manually.
4. Deploy Vercel app, run smoke tests, validate health/webhook/reminder endpoints, and inspect logs.
5. Roll back application through Vercel if safe. Database changes prefer forward fixes; destructive migrations require backup and staged expand/migrate/contract releases.

## 15. Architectural decisions deferred

- Final component primitive/chart/date libraries should be selected during foundation work based on accessibility and bundle cost.
- A distributed rate-limit vendor is selected before public launch, not assumed in schema design.
- Background queue infrastructure is deferred; durable database outbox plus cron is sufficient for initial scale.
- Materialized analytics, real-time subscriptions, and calendar sync are deferred until measured demand.
- Custom domain/multi-location modeling is intentionally not prebuilt. Adding them later requires an explicit schema and route migration.

## 16. Phase 2 foundation decisions

- Supabase PostgreSQL, Supabase Auth, and PostgreSQL RLS are the approved identity and persistence foundation. Vercel remains the primary deployment target; Cloudflare is a portability constraint, so runtime code should avoid unnecessary platform-specific and native Node.js dependencies.
- Email/password is the only v1 authentication method and passwords require at least 12 characters. `user_profiles` rows will be created by a minimal database trigger on `auth.users`; the trigger must set all privileged fields itself and must not copy caller-controlled role data.
- Browser-safe configuration is limited to the canonical app URL, Supabase URL, and Supabase publishable key. The service-role key is server-only and must be isolated behind a `server-only` module when its client is introduced.
- Supported organization currencies are `RON`, `EUR`, `USD`, and `GBP`. Recurring weekdays use ISO numbering from Monday `1` through Sunday `7`.
- Pending staff invitations may have a null `user_id` until verified acceptance. Platform administrators use narrow audited functions or views rather than unrestricted tenant-table access.
- Reserved organization slugs are `admin`, `api`, `auth`, `dashboard`, `client`, `demo`, `features`, `login`, `onboarding`, `privacy`, `sign-in`, `sign-up`, `support`, `terms`, and `www`.
- Local Supabase through Docker is required for development and database integration tests. Seeds must be deterministic and fictional; real customer data and production credentials are prohibited in every demo environment.

## 17. Phase 3A onboarding decisions

- Phase 3A implements business identity, location/regional settings, and booking policies. Staff profile, service, availability, review, and publish remain represented but incomplete for Phase 3B.
- Draft organizations are private and unbookable. Platform administrators receive no implicit tenant-table policy; any future support access remains narrow and audited.
- Slugs are normalized in Zod and PostgreSQL, checked against the documented reserved list, and protected by the existing unique database index.

## 18. Phase 3B publication decisions

- The first onboarding staff profile is an idempotent public owner-operator profile linked to the authenticated owner membership. The progress row stores the authoritative first staff and service identifiers; callers never choose membership, user, currency, staff, or service relationships.
- Weekly availability is submitted as a bounded transient array, validated completely in PostgreSQL, and replaced in one transaction. Stable UUIDs are derived from tenant, staff, weekday, and interval values; the existing exclusion constraint remains the final overlap backstop.
- Review and publication readiness are recalculated from persisted relational data. Publication locks the organization, checks every identity/settings/staff/service/assignment/availability invariant, changes lifecycle state, marks progress, and writes an audit event atomically. Direct authenticated lifecycle updates are trigger-blocked.
- `/book/[slug]` reads only through `get_public_business(text)`, a security-definer function with a fixed empty `search_path` and an explicit public JSON projection. Only published, non-suspended organizations are returned; internal IDs, memberships, contacts, notes, policies, and audit data are absent.
- Unpublish preserves onboarding data and immediately removes the organization from the public projection. Republish reruns the same transactional readiness checks.

## 19. Phase 3C public media decisions

- `serviceflow-public-media` is a deliberately public Supabase Storage bucket limited to JPEG, PNG, and WebP images up to 2 MB. Generated UUID filenames sit under validated organization and staff prefixes; original filenames and external URLs are never persisted.
- Uploads use the authenticated user client and bucket-specific RLS. After upload, a fixed-search-path database function verifies the active owner, tenant/entity relationship, exact path prefix, object existence, MIME metadata, and size before persisting the object path. Logo/avatar remain optional and do not participate in onboarding progress or publication readiness.
- Replacement uploads the new version, attaches it, and only then attempts to delete the previous object. A failed attach cleans up the new object; a failed old-object cleanup can leave an unreferenced object but never a broken persisted reference. Removal clears the reference before best-effort object deletion.
- Anonymous pages construct Storage public URLs only from validated paths returned by the narrow published-business projection. Draft/unpublished/suspended tenants remain absent. Audit events record only the media action, actor, and target—not paths, URLs, filenames, binary data, or credentials.

## 20. Phase 4A service-management decisions

- `/dashboard/services`, `/dashboard/services/new`, and `/dashboard/services/[serviceId]` are owner-only Server Component routes. Each resolves the current verified owner and operational organization again near data access; a forged or cross-tenant service identifier uses the same non-disclosing not-found behavior.
- Client components are limited to forms that need `useActionState`. Server Actions validate strict Zod inputs, re-fetch organization currency, and call narrow PostgreSQL mutations. Currency, organization membership, staff membership, and tenant relationships are never accepted as browser authority.
- Service and assignment writes are controlled by audited fixed-search-path functions. Direct authenticated table writes are trigger-blocked, services are archived rather than deleted, and retrying status/assignment state is idempotent without duplicate audit events.
- Phase 4A deliberately provides deterministic ordering and an empty state but no search/filter/pagination. Team invitations and staff editing remain Phase 4B; availability and blocked time remain Phase 4C; complete URL-backed list tooling remains Phase 4D.
