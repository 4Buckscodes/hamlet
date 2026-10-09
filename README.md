# HAMLET for Your Shortlets

A premium market-validation landing page for HAMLET, built in React + TypeScript with Vite.

## Overview

HAMLET is a shortlet marketplace and property operating platform for Nigeria, focused on:

- guest trust and clarity
- better shortlet owner operations
- December demand discovery
- structured market research
- founder-friendly lead capture

This project is designed as the first public-facing web experience for HAMLET and is intentionally positioned as a founder-led, honest validation tool rather than a fully scaled product.

## Current Build

The app includes:

- premium dark editorial homepage
- interactive hero and stay prompt
- December stay finder section
- shortlet trust messaging
- founding host form
- guest early-access form
- research form
- local analytics event tracking abstraction
- WhatsApp CTA support
- responsive mobile-first design
- agent workspace for onboarding, property submissions, assignments, commercial terms, booking visibility, and notifications

## Stack

- React
- TypeScript
- Vite
- CSS/vanilla styling

## Local Development

```bash
npm install
npm run dev
```

Then open the local Vite URL in the browser.

## Production Build

```bash
npm run build
```

## Linting

```bash
npm run lint
```

## Notes

- This version stores lead and analytics data in local browser storage for early validation and testing.
- The WhatsApp number is configured through the environment variable `VITE_WHATSAPP_NUMBER`.
- The project was intentionally built to be honest about its current stage and to collect real market intelligence before scaling the product.
- The agent workspace uses Supabase Auth and Postgres RLS when configured. Without Supabase credentials it shows a read-only, clearly labelled development preview; it does not persist demo writes or simulate payments.
- No payment or settlement provider is integrated. Agreed commercial terms and booking states are visibility only, not proof of payout or settlement.

## Agent Workspace Setup

1. Install the Supabase CLI and Docker Desktop, then run `npx supabase start` from the repository root.
2. Apply the migration and local-only fixtures with `npx supabase db reset`.
3. Copy the local API URL and anon key printed by the CLI into `.env.local`:

	```env
	VITE_SUPABASE_URL=http://127.0.0.1:54321
	VITE_SUPABASE_ANON_KEY=your-local-anon-key
	```

4. Start the Vite app with `npm run dev` and open the Agent workspace section.
5. Run the RLS and workflow database tests with `npx supabase test db`.

`supabase/seed.sql` contains public, development-only test credentials and sample records. They are intended only for a disposable local database and must never be applied to a production project. Owner/admin profiles in a real environment must be provisioned through a trusted administrative process; never ship a service-role key to the browser.

The database migration is the authorization boundary. It restricts listing access, agent assignments, application/listing review, correction requests, offer publishing and revisions, offer acceptance, earnings visibility, and notifications. Offer acceptance is bound to the current immutable terms version. Settlement remains marked `not_integrated` until a real settlement provider is added.

## Suggested Environment Variable

```bash
VITE_WHATSAPP_NUMBER=2348000000000
```

## Repository

The project is published to GitHub here:

https://github.com/4Buckscodes/hamlet.git
