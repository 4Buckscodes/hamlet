# HAMLET Locked MVP Specification

**Version:** 1.0  
**Decision date:** 11 October 2026  
**Status:** Product scope locked; live-launch dependencies remain open.

## 1. MVP goal

Prove HAMLET can onboard legitimate shortlet properties, connect guests to suitable accommodation, facilitate real request-to-book transactions, and maintain clear accountability between guests, property owners and authorised partners from listing review through booking, stay, issue resolution and settlement.

HAMLET is a trusted, partner-inclusive shortlet marketplace first. Advanced property-management automation and the wider service ecosystem are later releases.

## 2. Launch market and initial target

- Launch geography: Lagos, Nigeria.
- Abuja and Ibadan: deferred until the Lagos operating process is reliable.
- Initial supply target: 50 approved properties by 31 October 2026.
- Pilot success is measured by completed bookings, trustworthy supply, reconciled transactions, issue resolution and repeat/qualified demand—not registrations alone.

## 3. Locked commercial and booking decisions

- Booking model: request-to-book.
- Payments: use an approved payment provider; initially reconcile transactions and settlements through a controlled ledger and manual operating procedure.
- HAMLET service fee: 3% paid by the guest only.
- Owner HAMLET service fee: 0%.
- Displayed guest price: accommodation subtotal plus HAMLET's 3% fee and any known mandatory charges. The total must be visible before the guest commits and must not increase unexpectedly at checkout.
- Fee base: discounted accommodation subtotal, excluding refundable deposits and separately disclosed taxes or charges where applicable, subject to legal/commercial review.
- Payment-processing fee policy: **not decided**. Do not hard-code or automatically pass it to guests yet. Confirm provider/account terms, fee calculation, tax treatment and disclosure requirements first.
- Guest reviews: deferred. Collect private feedback during the pilot.
- Verification: manual, evidence-based review with recorded outcomes and honest trust labels.
- Partner commissions: recorded only when specifically agreed; they are not the same as HAMLET's service fee.

Example: for a ₦100,000 accommodation subtotal, HAMLET's guest service fee is ₦3,000 and the guest-facing total before any later-approved processing-fee policy or other applicable mandatory charges is ₦103,000.

## 4. Release 1 scope

### Guest marketplace
- Responsive, mobile-first property discovery.
- Search/filter by Lagos area, dates, price, guest capacity and amenities where supported by actual data.
- Property details, photographs, amenities, house rules, location and transparent total pricing.
- Booking request, status tracking, confirmed booking details and support/issue reporting.
- No public reviews or claims of live availability until those features are genuinely connected.

### Property onboarding and verification
- Structured property submission for owners and authorised partners.
- Record submitter role, owner/property contacts and authority to list.
- Capture listing facts, photos/media references, pricing, availability information and relevant documentation evidence.
- Duplicate checks and manual review workflow: submitted, needs correction, approved, rejected or suspended.
- Only approved, non-suspended listings may be publicly discoverable.
- A checked documentation box is self-reported until evidence is reviewed. A checklist is not itself proof of legal title or document validity.

### HAMLET Partner Network
- One partner registration/sign-in experience for owners, agents, property managers, shortlet operators, co-hosts/hospitality operators, referral partners and other authorised partners.
- Open partner registration with immediate account activation and role-based access; admins can suspend, restore or deactivate partner accounts.
- Submit properties and track review.
- Explicit property authorisation/assignment and revocation.
- View only own profile, authorised properties, permitted booking data and specifically agreed commissions.
- Public registration must never grant admin access.

### Booking lifecycle
1. Requested.
2. Availability and terms being checked.
3. Accepted, awaiting payment, with an explicit payment deadline.
4. Confirmed only after verified provider payment and final availability checks.
5. Completed, cancelled, expired, refunded or disputed as applicable.

- Prevent overlapping confirmed bookings.
- Recheck availability after a payment deadline expires.
- A browser redirect, screenshot or uploaded receipt is not sufficient proof of payment.
- Record cancellation, refund, no-show, failed payment and issue outcomes.

### Payments and financial records
- Integrate a suitable provider after business and account eligibility are confirmed.
- Verify server-side provider callbacks/webhooks and process them idempotently.
- Maintain a transaction ledger with booking reference, amounts, status, provider references, fee calculations, refunds, reconciliation differences and responsible operator.
- Keep accommodation revenue, HAMLET's guest service fee, provider charges, refundable deposits and agreed partner commissions as distinct ledger concepts.
- Owner proceeds must not be reduced by HAMLET's 3% guest service fee.
- Initially use manual reconciliation and settlement operations where permitted; do not build an internal wallet or assume HAMLET may hold customer funds.
- Exact processing-fee treatment remains configurable/undecided and must not be double charged.

### Admin and accountability
- Review and moderate property listings; manage partner account status (suspend, restore or deactivate).
- Manage bookings, payment records, cancellations and refunds.
- Report, assign, investigate, escalate and close issues with evidence and documented decisions.
- Suspend listings/partners when justified.
- Audit important status changes, permissions and financial adjustments.
- Restrict sensitive guest, identity and incident data to authorised roles.

### Security, privacy and reliability
- Enforce permissions server-side and in database policies, not only in UI.
- Keep provider secrets server-side.
- Validate inputs, protect against duplicate webhook processing and prevent booking conflicts.
- Minimise personal data, limit access, establish retention and breach procedures, and publish appropriate privacy terms.
- Test backups/recovery and meaningful loading/error/pending states.

## 5. Explicitly deferred

- Automated partner commission splitting and payouts.
- Automated provider-fee pass-through until its policy is decided and provider support is verified.
- Instant booking and advanced calendar synchronisation.
- Public ratings/reviews.
- AI-generated listings, automated document extraction and advanced fraud scoring.
- Dynamic pricing and advanced analytics.
- Cleaning/maintenance marketplace, loyalty/rewards and complex referral automation.
- Abuja and Ibadan expansion.

## 6. Central pricing rule

Implement one shared pricing function and reuse it wherever guest-facing totals are calculated.

Inputs:
- accommodation subtotal after any applicable accommodation discount;
- known mandatory non-accommodation charges;
- configured HAMLET service-fee percentage (3% by default).

Outputs:
- accommodation subtotal;
- mandatory charges;
- HAMLET guest service fee;
- guest total.

The 3% fee is calculated on the accommodation subtotal, not on refundable deposits. Processing-provider charges are excluded until the policy is decided. Search cards may show an illustrative all-inclusive nightly estimate; a booking's authoritative total is calculated on the full stay subtotal and shown before payment. Avoid independent fee calculations in UI components or provider callbacks.

## 7. Launch dependencies requiring explicit sign-off

1. Nigerian legal review of marketplace role, terms, owner/partner agreements, cancellation/refund/no-show/damage policies, liability, fee disclosures and applicable Lagos requirements.
2. Payment provider selection/onboarding and confirmation that the merchant account, settlement structure and fee handling are permitted and supported.
3. Written processing-fee policy: absorbed by HAMLET or included in the guest's disclosed total, including provider fees/taxes and payment-method differences.
4. Privacy notice, data access/retention controls and assessment of applicable Nigeria Data Protection Act/NDPC obligations.
5. Operational SOP for availability confirmation, payment deadline, check-in, support, cancellations, refunds, chargebacks, owner settlement and partner commissions.
6. Support ownership and escalation coverage during the pilot.
7. Production environment configuration, admin provisioning, database migration review, backups and end-to-end tests.

## 8. Implementation order

1. Stabilise current branch: pass frontend build/lint/unit tests and Supabase migration/RLS tests.
2. Verify Supabase configuration, authentication, role permissions, admin provisioning and partner account moderation.
3. Complete property intake, evidence review, duplicate handling, corrections and approved-only publication.
4. Implement booking data model and request-to-book lifecycle with overlap prevention and expiry rules.
5. Select provider and implement server-side payment confirmation, central pricing, ledger and reconciliation.
6. Implement cancellations/refunds, complaints, audit trail and operational controls.
7. Run test-mode end-to-end scenarios across guest, owner/partner and admin accounts.
8. Complete legal/payment/privacy/operations sign-off; only then run a controlled live Lagos pilot.

## 9. Release 1 acceptance criteria

- Unapproved, suspended or duplicate listings cannot be published as approved.
- Partners can access only authorised properties and permitted booking information.
- Booking requests are not prematurely confirmed; overlapping confirmed bookings are prevented.
- Payment cannot be marked paid from a redirect or uploaded receipt alone.
- The same central price calculation is used across search, property, booking and payment surfaces.
- Owner HAMLET service fee is zero under the current model; the 3% guest fee is not deducted from owner proceeds.
- Provider fee policy is not silently applied twice or hard-coded while undecided.
- Failed payments, cancellations, refunds, settlement differences and financial adjustments have statuses, owners and audit records.
- Issues can be reported, investigated, assigned, escalated and closed with documented outcomes.
- Role restrictions, secret management, privacy controls and appropriate notices are in place.
- End-to-end happy-path and failure-path tests pass in the intended target environment.
- Launch terms, provider approval, support responsibilities and manual reconciliation procedure are ready.

## 10. Product honesty rule

Do not present sample properties as real inventory, imply live availability or claim a verification level that has not actually been completed. The interface may be polished, but the product must be truthful about what is connected and operational.
