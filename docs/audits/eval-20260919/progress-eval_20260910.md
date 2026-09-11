# Odyssey Progress Evaluation

CTO-level technical and product assessment of Odyssey's current implementation, beta readiness, and recommended delivery roadmap. Evaluation prepared in English from the repository state reviewed on 11 September 2026.

## Table of Contents

- [Executive Conclusion](#executive-conclusion)
- [Product Objective and Functions](#product-objective-and-functions)
- [Architecture](#architecture)
- [Gaps and Misalignments](#gaps-and-misalignments)
- [Beta Readiness](#beta-readiness)
- [Recommended Roadmap](#recommended-roadmap)
- [Canonical References](#canonical-references)
- [Changelog](#changelog)

## Executive Conclusion

Odyssey is a platform for creating and delivering personalized video tributes, distributed through funeral homes and available directly to families.

The core product is clearly defined: a funeral home invites a family, the family creates a tribute through a guided wizard, selects media and music, completes the montage, pays if necessary, and receives a rendered video. The B2B2C model is also clear: the funeral home offers the Keepsake package, the family pays for upgrades or add-ons, and the funeral home receives 30% of Net Distributable Revenue.

**CTO assessment: Odyssey is close to a controlled pilot, but is not ready for an open beta with real customers without manual operations and a reduced scope.** The wizard and commerce flows are relatively mature. Video fulfillment, operations, rate limiting, add-ons, and production governance remain incomplete.

## Product Objective and Functions

Odyssey aims to provide:

- Direct-to-family B2C tribute creation.
- Funeral-home-led B2B2C acquisition.
- Collaborative tribute creation by family members.
- Guest contributions from relatives.
- Partner performance and commission tracking.

Main functions include:

- Separate authentication for families, funeral homes, and Odyssey HQ.
- A seven-step family wizard covering identity, invitations, media, music, montage, preview, and checkout.
- Project autosave and photo, video, and audio uploads.
- Soft Cap pricing with `grantedPackage` and `intendedPackage` kept separate.
- Stripe Checkout for B2C, B2B2C delta pricing, and the zero-cost `freemium_free` path.
- Server-side entitlements, Stripe webhook idempotency, and refund handling.
- Partner revenue-share ledger.
- Guest Sanctuary with photos, messages, voice, and paid contributions.
- Co-Creator access through temporary links.
- QR-based mobile scanning.
- Video export through a job queue and Creatomate.
- Partner Salon and Odyssey HQ dashboards.

## Architecture

### Application

- Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS.
- French and English localization.
- Likely Vercel deployment target.

### Data and Security

- Supabase Auth, PostgreSQL, Row-Level Security, and Storage.
- Server-side service-role access for privileged operations.
- Authorization based on project ownership, partner roles, tenants, and HQ allowlists.

### Payments and Commerce

- Stripe Checkout and webhooks.
- Server-side entitlement snapshots in `project_paid_entitlements`.
- Partner commission ledger.
- SQL RPCs for revenue waterfall, memorial funds, and payouts.

### Media and Rendering

- Project-linked media assets with UI and database quota enforcement.
- Stingray music integration with mock/live modes.
- Dynamic Creatomate render plans.
- `project_export_jobs` queue and HMAC-protected Creatomate webhook.

Current operational flow:

```text
POST /api/projects/[id]/export
        -> project_export_jobs
        -> POST /api/internal/export/drain
        -> mock mode or Creatomate
```

This is adequate for a manually operated pilot, but requires scheduling, monitoring, retries, and clear operational ownership before an autonomous beta.

## Gaps and Misalignments

### 1. Video export is still partially simulated

The code still contains `creatomate_stub` and a `mock_staging` mode that can mark a job completed without producing a real video. User-facing messaging also refers to manually draining the queue, and Stingray master rendering remains pending.

**Impact: critical.** A customer could pay and receive a completed status without a real deliverable if the environment is misconfigured.

References: [export route](../../app/api/projects/[id]/export/route.ts), [export worker](../../src/lib/export/processExportJob.ts), and [project status](../PROJECT_STATUS.md).

### 2. Revenue-share deployment is unclear

The QA documentation requires migration P6.1 for the calculation `Gross -> 10% platform fee -> Net Distributable -> 30% partner commission`, but [docs/sql/README.md](../sql/README.md) still describes P6.1 as pending while commercial documentation presents the waterfall as operational.

**Impact: high.** This directly affects partner payouts and commercial trust.

### 3. Production depends on manual SQL migrations

Several production-critical migrations are explicitly marked as needing to be run, including HQ allowlists, HQ payouts, tenant reads, partner leads, invitation RLS, `submitted` project status, and guest photo quotas.

The schema is therefore not yet fully represented by a reproducible, verifiable deployment process.

### 4. Public rate limiting is not implemented

[contributeRateLimit.ts](../../src/lib/security/contributeRateLimit.ts) currently implements a no-op. Business quotas exist, but they do not adequately protect public routes from abuse, excessive Storage use, repeated checkout creation, or attacks against guest links.

**Impact: high before public beta.**

### 5. Add-ons are not operationally fulfilled

Add-ons are recorded as `pending`, but fulfillment is incomplete for NFC, voice, memory books, USB or other physical products, and Gelato or external operations. See [addonFulfillment.ts](../../src/lib/wizard/addonFulfillment.ts).

**Recommendation:** disable these options commercially for the beta unless a documented manual fulfillment process exists.

### 6. Automated tests focus mainly on pure business logic

Existing tests cover Soft Cap behavior, quotas, commissions, refunds, access control, and URL sanitization. There is limited integration coverage for real Supabase RLS, Stripe webhook delivery, Storage uploads, Creatomate rendering, retries, mobile flows, and email delivery.

CI exists in [.github/workflows/test.yml](../../.github/workflows/test.yml), but local validation was blocked during review because dependencies were not installed. The committed `package-lock.json` makes this recoverable with `npm ci`.

### 7. Legal and data governance are incomplete

User-uploaded music consent exists technically, but the wording remains a draft in [MUSIC_RIGHTS_ATTESTATION.md](../MUSIC_RIGHTS_ATTESTATION.md). Before beta, the project also needs finalized terms, privacy and retention rules, contributor rights, treatment of voice/video data, and refund/support procedures.

## Beta Readiness

### Relatively mature

- Product positioning and core journey.
- Family wizard and partner invitation flow.
- Authentication and primary roles.
- Autosave and media management.
- Server-side checkout and webhook handling.
- Entitlement protection against client manipulation.
- Commission and refund model.
- Partner dashboard and initial HQ functionality.
- French/English structure and Next.js/Vercel deployment model.

### Required before real customer launch

1. Real end-to-end Creatomate rendering.
2. Verification of all mandatory SQL migrations.
3. Confirmation that the P6.1 waterfall is deployed and tested.
4. Export scheduling, retries, timeouts, dead-letter handling, and alerts.
5. Production rate limiting for public contribution routes.
6. Stripe Test Mode scenarios for success, delayed and duplicate webhooks, partial refunds, and full refunds.
7. Operational support for diagnosis, export retry, refunds, and data deletion.
8. Final legal terms and consent wording.
9. Supabase backup and restore verification.
10. Confirmation that no customer path relies on mock mode.

## Recommended Roadmap

### Phase 0: Pre-pilot stabilization

- Freeze the MVP around family creation, partner invitation, Keepsake, paid upgrades, and real video export.
- Disable unfulfilled physical add-ons.
- Finalize and deploy P6.1 and all required migrations.
- Make schema health checks part of deployment.
- Run `npm ci`, `npm test`, and `npm run build`.
- Add structured logs and alerts for webhooks and exports.

### Phase 1: Controlled pilot

- Use one funeral-home tenant and five to ten invited families.
- Start in Stripe Test Mode, then allow limited real payments.
- Use Creatomate live and monitor exports closely.
- Maintain runbooks for payments, exports, refunds, and incidents.
- Measure invitation opens, project starts, project completion, paid conversion, delivery time, and export failures.

### Phase 2: Broader beta

- Add distributed rate limiting.
- Operate a scheduled, idempotent export worker with retry and recovery.
- Separate add-on fulfillment workflows from the core digital product.
- Monitor Storage, Stripe, Creatomate, and email costs.
- Add Playwright E2E tests for critical journeys.
- Finalize partner/customer support and data-deletion processes.

## Canonical References

- [B2B2C Commerce](../B2B2C_COMMERCE.md): current salon-to-family commerce model, Soft Cap, and RevShare.
- [Freemium V1 Pivot](../FREEMIUM_V1_PIVOT.md): primary product and pricing canon.
- [Technical Onboarding V1](../TECHNICAL_ONBOARDING_V1.md): stack, environment, code paths, and contracts.
- [Routes and Authentication](../ROUTES_AND_AUTH.md): route map, roles, and access rules.
- [Project Status](../PROJECT_STATUS.md): current implementation status and accepted debt.
- [SQL README](../sql/README.md): migration order and database deployment state.
- [Partner RevShare](../PARTNER_REVSHARE.md): commission and payout model.
- [QA Commission Waterfall](../QA_P6_COMMISSION_WATERFALL.md): required RevShare scenarios.
- [Music Rights Attestation](../MUSIC_RIGHTS_ATTESTATION.md): music rights and consent requirements.
- [Repository README](../../README.md): project setup and quickstart.

## Changelog

| Date | Change |
|------|--------|
| 2026-09-11 | Created English CTO progress evaluation from repository review. |
