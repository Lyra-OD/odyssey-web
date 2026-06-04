# Tribute Wizard — Architecture

**Last code review: June 2026**

This document describes the 8-step tribute wizard: navigation, state, autosave, and how montage acts map to soundtrack selection. Parent overview: [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) §4.7.

---

## Orchestrator

| File | Role |
|------|------|
| `src/components/tribute/TributeWizard.tsx` | Step routing, validation gates, autosave wiring, checkout handoff |
| `src/components/tribute/WizardStepper.tsx` | Visual stepper; click → `onStepClick` |
| `src/components/StickyPriceBar.tsx` | Sticky B2C total / B2B token cost (all steps) |
| `src/components/tribute/WizardBasePackagePicker.tsx` | Formula selection (steps 1–2) |
| `src/hooks/useWizardAutosave.ts` | Debounced + immediate PATCH to `/api/projects/[id]/autosave` |
| `src/components/tribute/AutosaveIndicator.tsx` | “Saving / Saved / Error” UX |
| `src/lib/wizard/wizardDeliverables.ts` | **Deliverables manifest** — `PACKAGE_MANIFEST`, jetons/$, Salon/Social (pilotage UI cible) |
| `src/lib/wizard/wizardDeliverables.utils.ts` | Présentation partenaire (cartes invitation, copy dérivée du manifeste) |
| `src/lib/wizard/pricingConfig.ts` | **Checkout cents** — `WIZARD_PRICING`, extensions, bundle 67 $ (aligné manifeste via `assertManifestPricingAlignedWithLegacyConfig`) |
| `src/lib/wizard/wizardPricing.ts` | Cart math (`computeWizardCart`, integer cents only) |
| `src/lib/wizard/wizardState.ts` | `WizardStateV1` type + coercion/migration from legacy payloads |
| `src/lib/partner/partnerCheckout.ts` | B2B token debit (`partner_token_wallets`) |
| `src/lib/partner/resolvePartnerAccess.ts` | Partner role detection (`tenant_members`) |
| `app/api/projects/[id]/autosave/route.ts` | GET/PATCH with Zod schemas |
| `app/api/checkout/route.ts` | Checkout (**cible** 3 modes — voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md)) |
| `app/[lang]/(partner)/partner/` | Dashboard partenaire (header, portefeuille, `InvitationComposer` sur manifeste) |

`TOTAL_STEPS = 8` in `TributeWizard.tsx`.

---

## Deliverables manifest

The tribute wizard is **no longer a static 8-step product definition** in documentation alone: package capabilities (Salon vs Social, MP3 vs Stingray, token vs dollar display) are driven by [`src/lib/wizard/wizardDeliverables.ts`](../src/lib/wizard/wizardDeliverables.ts) (`PACKAGE_MANIFEST`).

**Canonical product doc:** [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) (marketing names Souvenir / Héritage / Éternité ↔ technical IDs `essential` / `signature` / `heritage`).

### Dynamic UI (target — partial today)

| Rule (manifest) | Wizard behaviour |
|---------------|------------------|
| `salon.audio === 'stingray_acts'` | Step 5 — Stingray per act (**implemented**) |
| `salon.audio === 'personal_mp3'` | Step 5 — personal MP3 upload + legal gatekeeper (**not implemented**) |
| `social.enabled === true` | Additional Social step — Safe Music only, 9:16 preview (**not implemented**) |
| `social.enabled === false` | Hide Social step (e.g. **Souvenir** / `SOUVENIR`) |
| `resolveTransactionMode()` | `StickyPriceBar` / pickers: **tokens** (partner) vs **dollars** (family) |

**Today:** `InvitationComposer` (partner dashboard) reads the manifest + `packages.names` from dictionaries; `TributeWizard` uses `WizardBasePackagePicker` with **marketing labels** via i18n (`tributeWizard.basePackage*` = Souvenir / Héritage / Éternité) while persisting legacy IDs (`essential` / `signature` / `heritage`). Step 5 remains Stingray-only until MP3/Social steps ship.

### i18n (marketing names)

| Technical ID | FR | EN | Dictionary keys |
|--------------|----|----|-----------------|
| `essential` | Souvenir | Keepsake | `packages.names.essential`, `tributeWizard.basePackageEssential` |
| `signature` | Héritage | Legacy | `packages.names.signature`, `tributeWizard.basePackageSignature` |
| `heritage` | Éternité | Eternity | `packages.names.heritage`, `tributeWizard.basePackageHeritage` |

See [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) and `src/lib/wizard/packageI18n.ts`.

### Pricing split

| Concern | Source |
|---------|--------|
| Deliverables, jetons, public $, Salon/Social flags | `wizardDeliverables.ts` |
| Cart line items, extension cents, Stripe totals | `pricingConfig.ts` + `wizardPricing.ts` |
| Drift guard | `assertManifestPricingAlignedWithLegacyConfig()` in `wizardDeliverables.ts` |

Do not duplicate package prices in UI strings — use `formatPackagePriceForMode(packageId, mode, locale)` after resolving `manifestPackageFromLegacy(basePackage)`.

---

## Step-by-step flow

| Step | Label (i18n key) | Main UI | Server / DB |
|------|------------------|---------|-------------|
| 1 | `stepperEssentials` | Name, dates, avatar, **formula** | `essentials`, `basePackage`; draft via `POST /api/projects/draft` |
| 2 | `stepperSources` | Social source + URL, formula (compact) | `socialSources`, `basePackage` |
| 3 | `stepperVault` | Dropzone + upload queue | `media_assets` rows; reload `GET /api/projects/[id]/media` |
| 4 | `stepperMontage` | Three-act timeline, focal points | `montage` |
| 5 | `stepperSound` | Stingray search (tier **standard** / **premium**), listen, choose per act | `musicalAmbiance.tracks` |
| 6 | `stepperExtensions` | Upsell cards + Heritage Pack; **bundle rules** when `basePackage=heritage` | `extensions` |
| 7 | `stepperPreview` | Copy + `CinematicTeaser` | Reads montage + tracks (no extra JSON section) |
| 8 | `stepperCheckout` | Cart recap + pay CTA | `POST /api/checkout` |

---

## Navigation and autosave

```mermaid
sequenceDiagram
  participant User
  participant Stepper as WizardStepper
  participant TW as TributeWizard
  participant AS as useWizardAutosave
  participant API as PATCH autosave

  User->>Stepper: Click step N
  Stepper->>TW: onStepClick(N)
  TW->>AS: flush()
  AS->>API: wizard_state + wizard_step
  API-->>AS: last_saved_at
  TW->>TW: setCurrentStep(N)
```

- **Back** button (top-left, steps 2+): same `flush()` then decrement step.
- Text fields use `queueSave("text")` — 800ms debounce.
- Step changes and explicit actions use `queueSave("immediate")` or `flush()`.

---

## `wizard_state` v1 shape

```typescript
// src/lib/wizard/wizardState.ts — simplified
{
  version: 1,
  isPartner?: true,                    // B2B UI flag (checkout uses tenant role)
  basePackage?: "essential" | "signature" | "heritage",
  pricing?: {
    basePackage: "signature",
    baseCents: 14900,                  // integers only
    optionsCents: 4900,
    totalCents: 19800,
    partnerTokenCost?: 2               // B2B only
  },
  essentials?: { firstName, lastName, birthDate, deathDate, avatarPath },
  socialSources?: { selected, url },
  montage?: {
    acts: { spark: string[], epic: string[], legacy: string[] },
    unassignedIds?: string[],
    excludedIds: string[],
    focalPoints: Record<mediaId, { x, y }>
  },
  extensions?: {
    aiRetouch?, extendedLicense?, collectorUsb?,
    digitalVault?, heritagePack?
  },
  musicalAmbiance?: {
    tracks?: {
      acte1?: { title, artist, trackId, coverUrl, previewUrl? },
      acte2?: { ... },
      acte3?: { ... }
    },
    catalogProvider?: "stingray" | "mock"
  }
}
```

**Legacy package id:** `prestige` is coerced to `signature` on read (`pricingConfig.ts`).

**Legacy (read-only migration, do not write on new saves):**
- `musicalAmbiance.mood`, `trackOrder`, `selectedTrack`, `catalogTrackId`
- Old `upsell` / `copyrightOption` → migrated to `extensions` via `wizardExtensions.ts`

---

## Montage ↔ music act mapping

Narrative montage uses English act IDs; licensed music uses French persist keys aligned with product copy.

| Montage (`montage.acts`) | Music (`musicalAmbiance.tracks`) | Product act |
|--------------------------|----------------------------------|-------------|
| `spark` | `acte1` | Spark |
| `epic` | `acte2` | Epic |
| `legacy` | `acte3` | Legacy |

`CinematicTeaser` and `teaserHelpers.ts` resolve slides per montage act and play the matching `acteN` track.

---

## Step 4 — Montage

- **Component:** `MontageStep.tsx`, `MontageDirectorModal.tsx`, `MontageMediaCard.tsx`
- **Helpers:** `montageHelpers.ts`, `montageDirector.ts`
- User assigns each uploaded `media_assets.id` to spark/epic/legacy, sets focal point (0–1), or excludes media.
- Validation before leaving step 4: at least one included photo in the timeline (see `TributeWizard` montage gate).

---

## Step 5 — Sound signature

- **Component:** `SoundSignatureStep.tsx`
- **API:** `GET /api/music/search?q=…` (see [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md))
- UI: three act tabs (cover or “To choose”), debounced search, Listen / Choose per row.
- **No** mood-based catalog as primary UX (removed).

---

## Step 7 — Cinematic preview

| File | Role |
|------|------|
| `PreviewStep.tsx` | Marketing copy, CTA to checkout, link to edit earlier steps |
| `CinematicTeaser.tsx` | Photo crossfade per slide + audio from selected act track |
| `teaserHelpers.ts` | Slide list, duration estimate, act grouping |

Audio `src` uses `track.previewUrl` (typically `/api/music/preview?trackId=…`).

---

## Pricing — hybrid B2C / B2B (`pricingConfig.ts`)

**Rule:** all money is stored and computed as **integer USD cents** (no float dollars in cart math).

```typescript
// src/lib/wizard/pricingConfig.ts
export const PARTNER_TOKEN_COST_CENTS = 4000; // 40.00 USD per token (wholesale)

export const WIZARD_PRICING = {
  packages: {
    ESSENTIEL:  { id: "essential", priceCents: 7900,  tokens: 1 },   // 79.00 $
    SIGNATURE:  { id: "signature", priceCents: 14900, tokens: 2 },   // 149.00 $
    HERITAGE:   { id: "heritage",  priceCents: 29900, tokens: 4, musicCatalog: "premium" },
  },
  extensions: {
    RETOUCHE_IA:       { id: "aiRetouch",       priceCents: 4900 },
    LICENCE_PREMIUM:   { id: "extendedLicense", priceCents: 3900 },  // Option Licence Premium
    USB:               { id: "collectorUsb",    priceCents: 7900 },
    COFFRE_FORT:       { id: "digitalVault",    priceCents: 9900 },
    PACK_HERITAGE:     { id: "heritagePack",    priceCents: 14900 },
  },
};
```

| Helper | Role |
|--------|------|
| `packageCents(id)` | Base package cents |
| `packagePartnerTokens(id)` | B2B token debit for package |
| `extensionCents(id)` | Extension line cents |
| `computeWizardCart()` | `totalCents = baseCents + optionsCents` (integers); skips extensions bundled in Heritage |
| `sumCartLineItemsCents()` | Checkout verification (sum of line items) |
| `calculatePartnerMargin(packageId, tokens?)` | `priceCents − PARTNER_TOKEN_COST_CENTS × tokens` |
| `heritageBundleAlaCarteCents()` | Signature + Licence Premium + USB + Coffre (à la carte reference) |
| `calculateBundleSavings("heritage")` | `max(0, alaCarte − heritage.priceCents)` → **6700¢ (67 $)** |
| `bundleSavingsDollarsLabel(cents)` | Integer dollars for UI badges (`67`) |
| `isExtensionBundledInBasePackage()` | Heritage includes licence + USB + vault (no extra charge) |
| `resolveMusicCatalogTier()` | `standard` vs `premium` from package + extensions |

Display-only: `StickyPriceBar` converts `totalCents / 100` for B2C label `Total : {amount} $` (cart reflects bundle rules via `computeWizardCart`).

---

## Economic bundle — Heritage package (marketing + cart)

**Goal:** make the **Heritage** formula irresistible by showing savings vs buying Signature plus the main physical/digital options separately, while keeping **Signature** customers able to upsell via **Option Licence Premium** (39 $).

### Savings calculation

```text
à_la_carte = packageCents("signature")
           + extensionCents("extendedLicense")   // 39 $
           + extensionCents("collectorUsb")      // 79 $
           + extensionCents("digitalVault")      // 99 $
           = 14900 + 3900 + 7900 + 9900 = 36600¢ (366 $)

heritage     = packageCents("heritage") = 29900¢ (299 $)

savings      = calculateBundleSavings("heritage") = 6700¢ → UI: « Économisez 67 $ »
```

Implemented in `heritageBundleAlaCarteCents()` and `calculateBundleSavings()` (`pricingConfig.ts`). AI Retouch is **not** part of this comparison (remains an optional upsell on Heritage).

### UI — `WizardBasePackagePicker`

- On the **Heritage** card (B2C only, `hidePrices=false`): promo line from i18n `basePackageHeritageBundlePromo` — e.g. **« Le choix complet (Économisez 67 $) »**.
- Uses `bundleSavingsDollarsLabel(calculateBundleSavings("heritage"))` — no float math in the label.

### UI — step 6 extensions (`MontageExtensionsStep`)

When `basePackage === "heritage"`:

| Behaviour | Detail |
|-----------|--------|
| **Hide** Heritage Pack upsell | Pack targets Signature/Essentiel customers; redundant on Heritage formula |
| **Badge « Déjà inclus »** | `extendedLicense`, `collectorUsb`, `digitalVault` — cards disabled, price hidden |
| **Still purchasable** | `aiRetouch` (optional) |

Cart: `computeWizardCart()` does not add line items for bundled extension ids when base is Heritage (`isExtensionBundledInBasePackage`).

### Upsell path (Signature / Essentiel)

- Step 5: info banner if catalog tier is **standard** — prompts adding **Licence Premium** at step 6.
- Step 6: toggling `extendedLicense` unlocks **premium** catalog on step 5 (re-search with `tier=premium`).

See [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md) for catalog tiers.

---

## Music catalog tiers (Standard vs Premium)

| Access | Packages / options | Search API |
|--------|-------------------|------------|
| **Standard** | Essentiel, Signature (default) | `GET /api/music/search?tier=standard` |
| **Premium** | Heritage (included), or **Option Licence Premium** (`extendedLicense`), or Heritage Pack | `GET /api/music/search?tier=premium` |

Resolution: `resolveMusicCatalogTier(basePackage, extensions)` in `pricingConfig.ts`; wired in `TributeWizard` → `SoundSignatureStep` (`catalogTier` prop).

Mock catalog (`stingrayCatalog.ts`): each track has `musicTier: "standard" | "premium"`; premium filter returns the full library, standard filter excludes premium-tier tracks.

---

## Step 8 — Checkout

- **Component:** `CheckoutStep.tsx` (recap + pay CTA)
- **API:** `app/api/checkout/route.ts`
- **Référence commerce :** [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) (saga P5, règles `granted_package`)

**Implémentation actuelle du code :** 2 branches (`resolveUserIsPartner` → jetons TS **ou** Stripe). **Cible :** 3 modes via `tribute_checkouts.checkout_mode` + `debit_partner_tokens_for_checkout()`.

```mermaid
flowchart TD
  A[POST /api/checkout] --> B{checkout_mode}
  B -->|b2c| C[Stripe: total catalogue]
  C --> C1[metadata.total_cents]
  B -->|b2b_partner| D[debitPartnerTokens TS ou RPC P5]
  D --> D1[tokens = selected_package]
  D1 --> D2[no Stripe]
  B -->|b2b2c_family| E[debit_partner_tokens_for_checkout]
  E --> E1[tokens = granted_package only]
  E1 --> F{family_total_cents > 0?}
  F -->|no| G[completed]
  F -->|yes| H[Stripe delta famille]
  H --> I[webhook → completed]
```

### Mode `b2c` (famille directe)

- Pas d’invitation partenaire ; `checkout_mode = b2c`.
- `StickyPriceBar`: **Total : {amount} $** (`totalCents ÷ 100`).
- Stripe : somme forfait + extensions (`computeWizardCart`).

### Mode `b2b_partner` (conseiller funérarium)

- Rôles `partner`, `partner_admin` (ou `admin`) sur `tenant_members`.
- `StickyPriceBar`: **Coût : {tokens} jeton(s)** — pas de `$`.
- Jetons = **`tokens(selected_package)`** (1 / 2 / 4).
- **Code actuel :** `debitPartnerTokens()` (TypeScript, P4). **Cible :** ligne `tribute_checkouts` + RPC P5.

### Mode `b2b2c_family` (famille invitée — gant blanc)

- `projects.invitation_id` → `partner_invitations.granted_package`.
- Partenaire débité : **`tokens(granted_package)`** uniquement — **pas** de jetons sur l’upsell famille.
- Famille : **`family_total_cents`** = delta vs forfait offert (+ extensions) → Stripe si montant > 0.
- UX : pas de mention « jeton » ; prix relatifs (ex. Essentiel offert → Signature **+70 $**).
- **DB P5 ✅ · API / UI ⏳** — détail saga : [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md).

| `basePackage` | `priceCents` (B2C list) | Tokens (B2B / granted) | Example margin* |
|---------------|-------------------------|------------------------|-----------------|
| `essential` | 7900 (79 $) | 1 | 3900¢ (39 $) |
| `signature` | 14900 (149 $) | 2 | 6900¢ (69 $) |
| `heritage` | 29900 (299 $) | 4 | 13900¢ (139 $) |

\* `calculatePartnerMargin(packageId)` — partner sets their own retail price to families.

### UI pricing

| Component | Location | Role |
|-----------|----------|------|
| `StickyPriceBar` | Sticky under stepper, every step | Live **total** (B2C $) or **tokens** (B2B); reflects `computeWizardCart` including Heritage bundle rules |
| `WizardBasePackagePicker` | Steps 1–2 (`hidePrices` when partner) | Formula cards + **Heritage savings badge** (67 $) |
| `WizardCartSummary` | Steps 5–6 (B2C only) | Line recap |
| `SoundSignatureStep` | Step 5 | Catalog tier banner (Standard vs Premium upsell) |
| `MontageExtensionsStep` | Step 6 | Extensions + « Déjà inclus » when Heritage |

---

## Database

| Migration | Purpose |
|-----------|---------|
| `docs/sql/odyssey_p3_wizard_autosave.sql` | `wizard_state`, `wizard_step`, `last_saved_at` |
| `docs/sql/odyssey_p4_partner_token_wallets.sql` | Wallets + ledger |
| `docs/sql/odyssey_p4_1_security_fixes.sql` | RLS wallets/ledger (`partner` / `partner_admin`) |
| `docs/sql/odyssey_p5_b2b2c_core.sql` | `partner_invitations`, `tribute_checkouts`, RPC débit |

| Column / table | Type | Purpose |
|----------------|------|---------|
| `projects.wizard_state` | jsonb | UI snapshot (includes `pricing`, `basePackage`) |
| `projects.wizard_step` | smallint | 1..10 (CHECK) |
| `projects.last_saved_at` | timestamptz | Server save time |
| `projects.invitation_id` | uuid FK | Lien invitation B2B2C (P5) |
| `partner_invitations` | table | Forfait offert, email, statut invitation |
| `tribute_checkouts` | table | Saga checkout (`checkout_mode`, statuts) |
| `partner_token_wallets` | table | Solde jetons par tenant |
| `partner_token_ledger` | table | Audit ; `tribute_checkout_id` (P5) |

Fonction : `debit_partner_tokens_for_checkout(uuid)` — **`service_role`** only.

Index: `(user_id, status, last_saved_at DESC)` on `projects` for “resume latest draft” on dashboard.

Ordre SQL : [`docs/sql/README.md`](sql/README.md).

---

## i18n

Copy lives in `dictionaries/fr.json` and `dictionaries/en.json` under `tributeWizard.*` (step titles, stepper labels, sound/extensions/preview/checkout strings).

---

## When you change this flow

Update this file, [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md), [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md), and [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) §4.7 + §5 + §10 per team rule §13.
