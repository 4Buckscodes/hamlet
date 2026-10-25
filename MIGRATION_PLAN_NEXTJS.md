# HAMLET Next.js migration and guest redesign plan

This branch is the isolated implementation area for the guest-facing redesign and Vite-to-Next.js migration. Production remains untouched; do not deploy or merge without review.

## Why Next.js
HAMLET needs crawlable, indexable destination and property pages. Next.js App Router provides server-rendered route shells, metadata, sitemap/robots support, and a path toward server-rendered listing details. The current Vite app is a client-side SPA and is not the best long-term SEO foundation for that goal.

## Stage 1 — framework foundation and safety
- Add Next.js App Router entry points for home, explore, how-it-works, partner join and partner workspace.
- Preserve the existing React components while migrating, and retain the current partner routes.
- Convert Vite-only environment access to Next.js public environment variables.
- Remove illustrative/sample inventory from guest-facing results; never present sample properties as bookable or real.
- Preserve the single `calculateHamletPrice` source of truth and the request-to-book model.
- Keep all work on `redesign/guest-experience`; do not deploy.

## Stage 2 — SEO and discoverability
- Implement metadata per route, canonical URLs, Open Graph metadata, robots.txt and sitemap.xml.
- Build destination/neighbourhood landing pages only for locations with a defensible inventory or useful original content.
- Render approved, non-suspended property data on the server where the current data access model permits it; confirm Supabase RLS/public policies before exposing data.
- Add individual property routes with unique titles/descriptions and structured data only for facts that are actually available.
- Avoid indexing empty, duplicate, preview or query-filter URLs as if they were unique content.

## Stage 3 — guest experience
- Refine homepage hierarchy, search controls, listing cards, filters, detail page, price breakdown, booking request, empty/error/loading states, accessibility and mobile behavior.
- Use warm ivory, charcoal, restrained clay accents, strong typography and authentic property photography. Avoid generic AI-template styling and unsubstantiated trust claims.
- Clearly distinguish request submitted, accepted, awaiting payment, confirmed, cancelled and refunded states.

## Stage 4 — verification and release review
- Regenerate the lockfile and run build, lint, tests, route checks and responsive/accessibility review in a real build environment.
- Test empty inventory, query failures, dates, guest limits, duplicate submissions, pricing parity, unconfigured Supabase and partner auth/workspace.
- Review all environment variables and Vercel project settings before any deployment.
- Do not merge or deploy without explicit user review.

## Non-negotiable product integrity
- Public inventory must be approved and non-suspended. Do not fall back to demo listings.
- A booking request is not a confirmed booking. Never imply instant booking.
- Do not claim payment is integrated unless the configured provider and server-side confirmation path actually exist.
- Keep the guest-facing HAMLET fee at 3% using the central pricing function. Do not invent a processing-fee policy.
- Do not expose Supabase service-role credentials to the browser.
- Partner functionality is protected scope and must remain operational.
