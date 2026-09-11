# Odyssey Progress Evaluation FAQ

Focused follow-up to the [Odyssey Progress Evaluation](progress-eval_20260810.md). This FAQ answers the main infrastructure-readiness questions for a private MVP pilot and identifies what is implemented, what is conditional, and what still requires production work.

## Table of Contents

- [Odyssey Progress Evaluation FAQ](#odyssey-progress-evaluation-faq)
  - [Table of Contents](#table-of-contents)
  - [Status Legend](#status-legend)
  - [Is Stripe Fully Integrated and Ready for Transactions?](#is-stripe-fully-integrated-and-ready-for-transactions)
    - [Implemented](#implemented)
    - [Required configuration](#required-configuration)
    - [Readiness assessment](#readiness-assessment)
  - [What Is the Authentication Provider?](#what-is-the-authentication-provider)
  - [Are Terms of Use and Privacy Infrastructure Already Built?](#are-terms-of-use-and-privacy-infrastructure-already-built)
    - [Present](#present)
    - [Missing or requiring confirmation](#missing-or-requiring-confirmation)
  - [Are Permissions and Dashboards Complete?](#are-permissions-and-dashboards-complete)
    - [Users and families](#users-and-families)
    - [Partner Salons](#partner-salons)
    - [Remaining gaps](#remaining-gaps)
  - [Is Creatomate Fully Integrated?](#is-creatomate-fully-integrated)
    - [Implemented](#implemented-1)
    - [Remaining gaps](#remaining-gaps-1)
  - [Is Metering and Costing Wired into Stripe?](#is-metering-and-costing-wired-into-stripe)
    - [Implemented](#implemented-2)
    - [Not evidenced](#not-evidenced)
  - [Is Partner Commission Payout Infrastructure Installed?](#is-partner-commission-payout-infrastructure-installed)
    - [Implemented](#implemented-3)
    - [Remaining gaps](#remaining-gaps-2)
  - [What Is Used for Content Storage and Retrieval?](#what-is-used-for-content-storage-and-retrieval)
    - [Storage](#storage)
    - [Metadata and retrieval](#metadata-and-retrieval)
  - [Overall Readiness](#overall-readiness)
  - [Canonical References](#canonical-references)
  - [Changelog](#changelog)

## Status Legend

- 🟢 **Implemented:** code and documented infrastructure are present.
- 🔵 **Conditional:** available when production credentials, migrations, and external configuration are correctly deployed.
- 🟠 **Partial:** the core mechanism exists, but important production or operational pieces remain.
- ⚪ **Not evidenced:** no dedicated implementation was found in the reviewed repository.

## 🔵 Is Stripe Fully Integrated and Ready for Transactions?

**Answer: Stripe is substantially integrated, but it is not automatically production-ready without environment and operational validation.**

### Implemented

- Server-side Stripe client in [lib/stripe.ts](../../lib/stripe.ts).
- Stripe Checkout creation in [app/api/checkout/route.ts](../../app/api/checkout/route.ts).
- B2C and B2B2C checkout paths.
- Zero-dollar `freemium_free` path for the partner-gifted Keepsake.
- Server-side validation of project ownership and checkout inputs.
- Stripe metadata for project, package, extensions, and music selections.
- Webhook handling in [app/api/stripe/webhook/route.ts](../../app/api/stripe/webhook/route.ts).
- Idempotent webhook processing through persisted webhook events and commission constraints.
- `checkout.session.completed` handling.
- `charge.refunded` handling with commission clawback and entitlement revocation.
- Paid entitlement snapshots written after webhook confirmation.

### Required configuration

The onboarding document lists these required variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SITE_URL` for callback URLs where applicable

See [Technical Onboarding V1](../TECHNICAL_ONBOARDING_V1.md#2-stack--lancement).

### Readiness assessment

**Ready for a controlled Stripe Test Mode pilot, subject to configuration checks. Not yet proven ready for unrestricted production transactions.** The repository still needs an executed end-to-end validation covering delayed webhooks, duplicate events, partial refunds, full refunds, failed payments, and reconciliation against the production database.

## 🟢 What Is the Authentication Provider?

**Answer: Supabase Auth.**

The application uses `@supabase/ssr` and `@supabase/supabase-js`:

- Browser client: [utils/supabase/client.ts](../../utils/supabase/client.ts).
- Server client and cookie session handling: [utils/supabase/server.ts](../../utils/supabase/server.ts).
- Session refresh and middleware protection: [middleware.ts](../../middleware.ts) and [utils/supabase/middleware.ts](../../utils/supabase/middleware.ts).
- Auth callback: `/auth/callback`.

The product separates family Studio, Partner Salon, and Odyssey HQ login audiences. Supabase sessions are combined with database roles, tenant membership, project ownership, editor cookies, and the HQ allowlist.

See [Routes and Authentication](../ROUTES_AND_AUTH.md) for the canonical route and role model.

## 🟠 Are Terms of Use and Privacy Infrastructure Already Built?

**Answer: Partial only. Technical consent records exist, but a complete legal and privacy infrastructure was not evidenced.**

### Present

- `consent_records` is used for transactional and optional marketing consent on guest contribution flows.
- Marketing consent is collected during relevant authentication flows.
- Personal music upload is gated by `musicRightsAttestation`.
- Media deletion exists through [app/api/projects/[id]/media/[mediaId]/route.ts](../../app/api/projects/[id]/media/[mediaId]/route.ts).
- Guest routes limit exposure of other contributors' personal information.
- The project contains contact functionality through the application routes.

### Missing or requiring confirmation

No dedicated, clearly identified Terms of Use or Privacy Policy page was found in the reviewed `app/` route tree. The music-rights document explicitly describes its legal copy as a draft:

- [Music Rights Attestation](../MUSIC_RIGHTS_ATTESTATION.md)
- [Consent and guest contribution routes](../../app/api/contribute/[token]/)

Before a real-customer beta, Odyssey should finalize and publish:

- Terms of Use.
- Privacy Policy and retention schedule.
- Media and account deletion process.
- Guest contributor consent and rights language.
- Voice, video, and sensitive-data treatment.
- Refund, support, and abuse-reporting procedures.

**Readiness assessment: not legally launch-complete.** The technical consent foundation is useful, but it does not replace user-facing legal terms, privacy notices, retention controls, or a documented data-subject request process.

## 🟠 Are Permissions and Dashboards Complete?

**Answer: The main permission model and dashboards exist, but they are not complete as a fully operational partner/customer system.**

### Users and families

Implemented surfaces include:

- Authenticated Studio access.
- Project-owner checks through [projectAccess](../../src/lib/api/projectAccess.ts).
- Co-Creator access with scoped temporary links and editor cookies.
- Owner-only checkout and export operations.
- Project media access and deletion.
- Server-side entitlements that are not trusted from client wizard state.

The family Studio route and the Co-Creator model are documented in [Routes and Authentication](../ROUTES_AND_AUTH.md) and [Wizard Editor Collaboration](../WIZARD_EDITOR_COLLAB.md).

### Partner Salons

Implemented surfaces include:

- Salon dashboard and invitation creation.
- `canInvite` permission for counselor actions.
- `canViewLedger` permission for commission visibility.
- Counselor performance view at `/salon/mes-performances`.
- Partner commission dashboard at `/salon/commissions`.
- Tenant-aware branding and partner membership checks.
- HQ allowlist and tenant drill-down views.

The route and access matrix is in [ROUTES_AND_AUTH.md](../ROUTES_AND_AUTH.md). Invitation RLS is addressed by [P16](../sql/odyssey_p16_fix_invitations_rls.sql), but the migration must be applied and verified in the target database.

### Remaining gaps

- HQ payout and several HQ read migrations are explicitly deployment-dependent.
- Partner onboarding is not an automated CRM workflow.
- Some dashboards are read-only or manually operated.
- There is no evidence of a complete support, dispute, or account-administration workflow.
- Public contribution endpoints still need production rate limiting.

**Readiness assessment: sufficient for a controlled one-tenant pilot; not complete for a broad self-service beta.**

## 🟠 Is Creatomate Fully Integrated?

**Answer: Creatomate is technically integrated, but the fulfillment system is only partially production-ready.**

### Implemented

- Creatomate API client in [src/lib/video/creatomate.ts](../../src/lib/video/creatomate.ts).
- Dynamic render plan and payload generation in [src/lib/creatomate/](../../src/lib/creatomate/).
- Export entitlement gate in [app/api/projects/[id]/export/route.ts](../../app/api/projects/[id]/export/route.ts).
- Export job queue in `project_export_jobs`.
- Internal drain endpoint protected by `EXPORT_DRAIN_SECRET`.
- Creatomate callback in [app/api/webhooks/creatomate/route.ts](../../app/api/webhooks/creatomate/route.ts).
- Fail-closed webhook authorization using `CREATOMATE_WEBHOOK_SECRET`.
- External render ID and output URL persistence.

### Remaining gaps

- Without `CREATOMATE_API_KEY`, the system uses a mock staging completion path.
- The export drain is an internal endpoint rather than a fully managed worker service.
- Scheduling, retries, timeout recovery, dead-letter handling, and alerting are not demonstrated as complete.
- The project documentation still marks Stingray master rendering and the final cinema-grade workflow as pending.
- A real production render and delivery test was not completed during this audit.

See [processExportJob.ts](../../src/lib/export/processExportJob.ts), [Routes and Authentication](../ROUTES_AND_AUTH.md#export-creatomate-gate--worker-p0--master-stingray), and [SQL export migration](../sql/odyssey_p9_project_export_jobs.sql).

**Readiness assessment: integrated for a controlled pilot with live credentials and manual supervision; not fully autonomous or production-proven.**

## 🟠 Is Metering and Costing Wired into Stripe?

**Answer: Product pricing and commission accounting are wired into Stripe; infrastructure usage metering is not evidenced as implemented.**

### Implemented

- Package and add-on pricing in [src/lib/wizard/pricingConfig.ts](../../src/lib/wizard/pricingConfig.ts) and [src/lib/wizard/wizardPricing.ts](../../src/lib/wizard/wizardPricing.ts).
- B2B2C delta calculation between the granted and intended package.
- Stripe line items generated from the server-side cart.
- Checkout metadata capturing package and extension state.
- Gross payment captured from `session.amount_total`.
- Commission waterfall:

```text
Gross payment
  -> 10% platform fee
  -> Net Distributable
  -> 30% partner commission
```

- Revenue-share calculations and snapshots through the partner ledger/RPC path.
- Media quotas by package, enforced in application logic and intended to be backed by a database trigger.

### Not evidenced

There is no clear usage-based billing or infrastructure cost-metering system for:

- Supabase Storage consumption or egress.
- Creatomate render duration or render cost.
- Email volume.
- Music licensing cost per track or render.
- Internal operational labor or physical fulfillment cost.

The current Stripe integration charges the defined product/package prices. It does not appear to import provider costs, calculate margin by project, or automatically adjust Stripe charges based on infrastructure usage.

**Readiness assessment: commerce pricing and partner accounting are wired; cost-of-goods and infrastructure metering are not.** This is acceptable for a fixed-price pilot, but margin reporting will be incomplete.

## 🟠 Is Partner Commission Payout Infrastructure Installed?

**Answer: Yes, the accounting and manual payout mechanism are installed; automated partner payouts are not.**

### Implemented

- `partner_commission_balances` aggregate balances.
- Append-only `partner_commission_ledger`.
- Accrual on successful eligible B2B2C payment.
- Refund clawback.
- Idempotency by Stripe event and checkout.
- Manual payout RPC in [odyssey_p14_hq_commission_payout.sql](../sql/odyssey_p14_hq_commission_payout.sql).
- HQ payout route documented at `POST /api/hq/tenants/[id]/payout`.
- Payout ledger records actor and notes for auditability.

See [Partner RevShare](../PARTNER_REVSHARE.md) and [QA Commission Waterfall](../QA_P6_COMMISSION_WATERFALL.md).

### Remaining gaps

- Payout is manual and operationally controlled by Odyssey HQ.
- Stripe Connect or another automated transfer mechanism is not implemented.
- Bank-account onboarding, KYC, payout scheduling, reconciliation, and failed-transfer handling are not evidenced.
- The relevant SQL migrations must be applied and verified in the production Supabase project.

**Readiness assessment: adequate for a manually administered pilot; not a complete automated payout platform.**

## 🟢 What Is Used for Content Storage and Retrieval?

**Answer: Supabase Storage stores binary content, while PostgreSQL stores project and media metadata.**

### Storage

The primary bucket is `user-assets`. Uploads are organized under project-scoped paths such as:

```text
projects/{projectId}/{date}/{order}-{filename}-{uuid}.{extension}
```

The upload implementation is in [mediaUploadService.ts](../../src/lib/uploads/mediaUploadService.ts). It supports:

- direct or signed uploads;
- signed upload URLs for Co-Creators;
- image thumbnails in WebP;
- cache-control policy;
- retries and bounded concurrency;
- MIME and size validation through the upload API path.

### Metadata and retrieval

PostgreSQL `media_assets` records the project ID, storage path, ownership, tenant, MIME type, size, and ordering. Project state is stored in `projects`, including `wizard_state` and storyboard data.

The application retrieves metadata through Supabase queries and accesses objects through Supabase Storage. Deletion removes both the Storage object and its `media_assets` row through [the media delete route](../../app/api/projects/[id]/media/[mediaId]/route.ts).

Quota protection is defined in [odyssey_p7_media_quota_guard.sql](../sql/odyssey_p7_media_quota_guard.sql), while the current bucket and onboarding assumptions are described in [Technical Onboarding V1](../TECHNICAL_ONBOARDING_V1.md) and [SQL README](../sql/README.md).

**Readiness assessment: the core storage architecture is in place and appropriate for a controlled pilot.** Production still requires verified bucket policies, backup/restore procedures, egress monitoring, retention rules, and deletion verification.

## Overall Readiness

| Area | Assessment | Pilot position |
|------|------------|----------------|
| Stripe transactions | 🔵 Conditional: integrated, configuration-dependent | Suitable for controlled Test Mode and limited live pilot after E2E validation |
| Authentication | 🟢 Implemented: Supabase Auth | Implemented |
| Terms/privacy | 🟠 Partial: technical consent only | Not launch-complete |
| User permissions | 🟢 Implemented: core owner/editor controls | Suitable with focused scope |
| Partner permissions/dashboards | 🟠 Partial: core Salon/HQ controls | Suitable for one-tenant pilot; not fully operational |
| Creatomate | 🟠 Partial: live client plus mock fallback | Pilot-ready only with live credentials and manual supervision |
| Pricing/commission accounting | 🟢 Implemented: wired to Stripe/webhooks | Implemented for fixed-price commerce |
| Infrastructure cost metering | ⚪ Not evidenced | Missing for reliable margin reporting |
| Partner payout | 🟠 Partial: manual ledger/RPC payout | Pilot-ready with manual operations |
| Content storage | 🟢 Implemented: Supabase Storage + PostgreSQL metadata | Implemented; operational controls still required |

**Bottom line:** the repository contains the core technical building blocks for a private pilot. It does not yet demonstrate a fully self-service, legally complete, automatically fulfilled, and operationally observable public beta.

## Canonical References

- [Progress Evaluation](progress-eval_20260810.md): companion CTO assessment.
- [B2B2C Commerce](../B2B2C_COMMERCE.md): current partner-to-family commerce model.
- [Freemium V1 Pivot](../FREEMIUM_V1_PIVOT.md): pricing and product canon.
- [Technical Onboarding V1](../TECHNICAL_ONBOARDING_V1.md): environment and implementation map.
- [Routes and Authentication](../ROUTES_AND_AUTH.md): routes, roles, and access rules.
- [Partner RevShare](../PARTNER_REVSHARE.md): commission ledger and payout model.
- [SQL README](../sql/README.md): migration order and deployment state.
- [Music Rights Attestation](../MUSIC_RIGHTS_ATTESTATION.md): music consent and rights requirements.
- [Project Status](../PROJECT_STATUS.md): current status and accepted debt.

## Changelog

| Date | Change |
|------|--------|
| 2026-09-11 | Created infrastructure-readiness FAQ as a follow-up to the CTO progress evaluation. |
