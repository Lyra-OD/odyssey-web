# Odyssey Frontend — Conventions

**Last updated: July 2026 · Freemium V1 (purge jetons · Soft Cap · Phases 0–4 ✅)**

## Langue du code

- **Code** (TypeScript, noms de fichiers, commentaires techniques courts) : **anglais**.
- **Copy utilisateur** : `dictionaries/fr.json` et `dictionaries/en.json` — noms forfaits marketing sous `packages.names` (IDs techniques `essential` / `signature` / `heritage` / `legendary`).
- **Documentation technique vivante** : français OK pour canons produit ; hub = [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md).

## Périmètre de ce dépôt

- **Next.js 14** (`app/`, `src/`, `lib/`) = Studio Odyssey (wizard, API routes, Stripe).
- **`app-backend/`** (brain / engine / graphql) = stack legacy ou parallèle — **hors périmètre** du wizard Next actuel sauf mention explicite.

## Séparation des couches

| Couche | Emplacement | Rôle |
|--------|-------------|------|
| UI | `src/components/` | Présentation, i18n |
| Orchestration | `src/hooks/`, composants wizard | État, autosave, Soft Cap, navigation |
| Services / API | `app/api/`, `src/lib/` | I/O serveur, Supabase, Stripe |
| Livrables & forfaits | `src/lib/wizard/wizardDeliverables.ts` | Quotas, 4K, musique — [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) |
| Prix catalogue | `src/lib/wizard/pricingConfig.ts` · `wizardPricing.ts` | Cents Stripe, Soft Cap `computeWizardCartWithGrant` |
| Soft Cap | `softCap.ts` · `SoftCapModal.tsx` | Expansion Narrative — [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) |
| Commissions | SQL P6/P8 + webhook | Bulletproof 30 % Net Distribuable — [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) |
| Scanner Compagnon | `app/[lang]/scan/`, `app/api/scan/` | [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) |
| Schéma DB | `docs/sql/odyssey_p*.sql` | Migrations ordonnées → **P8** |

## Documentation — hiérarchie (vivante)

0. [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md) — **hub onboarding** (porte développeur).
1. [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) — **canon CEO** : purge jetons, Soft Cap dual (`musicLicense` 39 $), grille Héritage 4K. Specs : [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) · [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md) · [`SANCTUARY_TOKEN_NFC.md`](SANCTUARY_TOKEN_NFC.md).
2. [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) + `wizardDeliverables.ts` — contrat livrables.
3. `pricingConfig.ts` / `wizardPricing.ts` — cents + panier Soft Cap.
4. [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) — waterfall · ledger · clawback. **Jetons DEPRECATED.**
5. [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) — wizard 8 étapes *(croiser FREEMIUM si drift)*.
5b. [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md) — Étape 5 Livre Ouvert + Composition Magique.
5c. [`QA_S5_MONTAGE_STEP.md`](QA_S5_MONTAGE_STEP.md) · [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md).
6. [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md) — proxy musique.
7. [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) — positionnement Quiet Luxury.
8. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) · [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md).
9. [`sql/README.md`](sql/README.md) — migrations **P0→P8**.
10. [`PROJECT_STATUS.md`](PROJECT_STATUS.md) — living status *(peut drifter — croiser FREEMIUM)*.
11. [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) — commerce *(sections jetons = historique ; canon = FREEMIUM)*.
12. [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) — Killer App mobile.

**Archive :** [`_archive/`](_archive/) — onboarding pré-Freemium, checklists jetons.  
**Ne plus** pointer `QA_P5_5_PARTNER_SALON.md` comme guide exécutable (historique P5.5 jetons).

Après modification wizard, Soft Cap, Étape 5 / Composition Magique, pricing, checkout, RevShare, musique : mettre à jour **FREEMIUM** + **TECHNICAL_ONBOARDING_V1** + annexes touchées.

## Vision produit (hors implémentation commerce)

- [`Manifesto-V10.4.md`](Manifesto-V10.4.md) = constitution Brain/Engine — **pas** référence checkout V1.
- [`VISION_PHASE_2.md`](VISION_PHASE_2.md) = roadmap stratégique longue (Scanner async, CPL, MRR…).
- Implémentation commerce V1 : **FREEMIUM_V1_PIVOT** → phases 5–6.
