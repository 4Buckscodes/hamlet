# HAMLET Next.js migration and guest redesign plan

**Current status: audit-first. No further framework or product implementation until the current product state has been mapped.** This branch is isolated. Production must not be deployed to or merged without explicit review.

## Product facts confirmed by the owner
- **Way Find** is the guest's doorstep-navigation experience. It is more than destination search; its existing navigation, location, routing, permissions and handoff behavior must be discovered and preserved.
- **Paystack is not fully integrated.** The current goal is backend architecture that can later connect to Paystack. Do not present checkout, payment capture, webhook confirmation, refunds, or automated settlement as live unless code and provider configuration prove each part exists.
- Payment currencies, backend tracking, location behavior and AI-related work may exist beyond the files reviewed so far. Audit all branches, commits, migrations, configs and integrations before concluding a capability is absent.

## Stage 0 — full current-state audit (mandatory gate)
Do not continue the migration or redesign until this inventory is completed.

1. **Repository and branch audit**
   - Compare master with every relevant feature/fix branch and identify unmerged commits.
   - Inspect recent history, documentation, package/lockfile, build configuration, CI, Vercel config, environment-variable names, and generated routes/assets.
   - Identify work that is present only in another branch or described in project notes.
2. **Backend and database audit**
   - Read every Supabase migration in order, seed data, RLS policy, database function/RPC, enum, trigger, index, and SQL test.
   - Map property lifecycle, approval/suspension, partner roles/permissions, booking lifecycle, payment records/statuses, currency representation, ledger/reconciliation assumptions, location fields and event/tracking storage.
   - Do not apply migrations or change live Supabase state during the audit.
3. **Payment and currency audit**
   - Trace price calculation from UI through RPC/database and any server-side code. Identify currency assumptions, integer/decimal units, conversion/formatting, provider identifiers, idempotency, payment state transitions, webhook placeholders and reconciliation.
   - Preserve calculateHamletPrice as the existing guest pricing source of truth unless tests and the audit show a safe, reviewed reason to change it. The 3% HAMLET guest fee remains; provider-processing-fee policy remains undecided.
   - Clearly mark Paystack integration as planned/backend-preparation until real server-side payment initialization, signature-verified webhook processing, idempotency and reconciliation are demonstrably implemented and tested. Never trust browser redirects or screenshots as proof of payment.
4. **Way Find audit**
   - Search every branch and file for Way Find, maps, coordinates, geocoding, directions, location permission, property address/doorstep details, guest itinerary, navigation deep links, tracking and analytics.
   - Map the full user journey, required location permissions, external APIs, secrets, privacy/retention behavior, error/offline paths, and the distinction between sharing a property location and continuously tracking a guest.
   - Preserve the actual intended behavior; do not invent a replacement based on the feature name alone.
5. **AI and external integration audit**
   - Identify every AI provider/model, prompt, endpoint, feature flag, key name, server/client boundary, budget or fallback path, and any other third-party integration. Do not expose secrets or move private keys to client bundles.
6. **Audit deliverable**
   - Add a current-state report with: confirmed live, backend-only/prepared, prototype/demo, unmerged branch work, broken/uncertain, security/privacy risks, environment/deployment dependencies, and test coverage.
   - Create a dependency map and migration risk register before changing architecture.

## Stage 1 — Next.js migration plan (only after Stage 0 review)
- Migrate to Next.js App Router for crawlable pages and route-specific metadata.
- Preserve and verify existing guest and partner routes, auth/session handling, Supabase RLS, RPC calls, property intake/approval, booking operations and tests.
- Review each Vite environment variable and replace it with appropriate Next.js configuration. Public browser configuration uses NEXT_PUBLIC_; server-only secrets do not.
- Rebuild CI and deployment configuration for Next.js. Do not retain Vite SPA rewrite rules that override Next.js routes.
- Use a staged migration with route parity checks and a rollback path. Avoid changing database schema and framework in the same unreviewed step.

## Stage 2 — SEO and discoverability
- Implement route-specific metadata, canonical URLs, Open Graph, robots and sitemap.
- Build property and neighbourhood pages only where data and useful original content justify indexation.
- Render only approved, non-suspended public listings. Confirm the exact RLS/data-access boundary before server-rendering.
- Use structured data only for facts supported by actual records. Do not index empty, duplicate, preview or parameter-only pages as unique content.

## Stage 3 — guest experience
- Redesign homepage, discovery, listing details, price breakdown, booking requests, request status and helpful empty/error/loading states.
- Integrate Way Find into the appropriate post-booking or property-arrival journey only after the existing flow is understood.
- Use warm ivory, charcoal, restrained clay accents, editorial typography and authentic property photography. Avoid generic AI-template styling, fabricated reviews, fake scarcity and unsubstantiated verification claims.
- Clearly distinguish request submitted, availability confirmed, awaiting payment, confirmed, cancelled, expired, refunded and disputed states as the real backend supports them.

## Stage 4 — validation and release review
- Build, lint, run unit and Supabase SQL/RLS tests, inspect routes and test mobile, keyboard and reduced-motion behavior.
- Test no inventory, query failure, invalid dates, over-capacity requests, duplicate submissions, pricing parity, currency formatting, unavailable location permission, Way Find failure, unconfigured Supabase, and the not-yet-integrated Paystack path.
- Verify partner join/workspace, property submission, approval queues, booking operations, permissions and auth.
- Review Vercel project settings and environment variables. No production deployment, merge, destructive migration or live-provider change without explicit owner review.

## Non-negotiable integrity and security rules
- Public inventory is approved and non-suspended only. Never fall back to demo properties.
- A booking request is not a confirmed booking.
- Do not claim Paystack payments or automated reconciliation are live until verified in code and tested against provider sandbox behavior.
- Keep the guest-facing HAMLET fee at 3% via the central pricing function; do not invent a processing-fee policy.
- Never expose service-role keys, payment secrets, webhook secrets or AI-provider secrets in client bundles.
- Way Find must request only necessary permissions, explain location use, and avoid implying continuous tracking unless it is explicitly implemented, consented to and necessary.
- Preserve partner functionality as protected scope.