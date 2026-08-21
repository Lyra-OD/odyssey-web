# Odyssey Frontend — Conventions

**Type :** canon · **Vérité pour :** règles repo, hiérarchie docs, langue code.  
**Dernière MAJ :** 21 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 21 août 2026 — catégories docs + **nouveaux** fichiers dans `business/` `product/` `design/` `craft/` `vision/` / `TEMP/` (existants inchangés).
- 19 août 2026 — GTM B2C : [`B2C_GO_TO_MARKET.md`](B2C_GO_TO_MARKET.md) dans la hiérarchie lecture.
- 19 août 2026 — DA Vague 1 : [`DA_SCREENS.md`](DA_SCREENS.md) dans la hiérarchie lecture.
- 17 août 2026 — STATUS vivant vs log ; rituel Cursor code+doc (même commit, pas de hook).
- 17 août 2026 — en-tête type ; Freemium **Phases 0–5 ✅**, Phase 6 QA ⏳ (plus « 0–4 »).

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
| Livrables & forfaits | `src/lib/wizard/wizardDeliverables.ts` | Quotas, 1080p/4K, musique — [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) |
| Export Creatomate | `src/lib/creatomate/` | Storyboard, résolution, Audio Stem Graph — [`ROADMAP_PHASE2.md`](ROADMAP_PHASE2.md) |
| Prix catalogue | `src/lib/wizard/pricingConfig.ts` · `wizardPricing.ts` | Cents Stripe, Soft Cap `computeWizardCartWithGrant` |
| Soft Cap | `softCap.ts` · `SoftCapModal.tsx` | Expansion Narrative — [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) |
| Commissions | SQL P6/P8 + webhook | Bulletproof 30 % Net Distribuable — [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) |
| Scanner Compagnon | `app/[lang]/scan/`, `app/api/scan/` | [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) |
| Schéma DB | `docs/sql/odyssey_p*.sql` | Migrations ordonnées → **P8** |

## Documentation — hiérarchie (vivante)

Carte (types, catégories, « ne pas copier ») : [`README.md`](README.md).  
**Chemins des docs existants inchangés** (sauf `sql/`, `ops/`, `TEMP/`, `brand/`, `_archive/`).

### Où créer un **nouveau** fichier docs

| Catégorie | Dossier |
|-----------|---------|
| Rush / mail / notes session | [`TEMP/`](TEMP/README.md) |
| Runbook / QA | [`ops/`](ops/) |
| SQL | [`sql/`](sql/README.md) |
| Business / GTM / brief partenaire **neuf** | [`business/`](business/README.md) |
| Produit (wizard, Sanctuaire, Scanner) **neuf** | [`product/`](product/README.md) |
| DA / copy process **neuf** | [`design/`](design/README.md) |
| Lab craft **neuf** | [`craft/`](craft/README.md) |
| Vision stratégique **neuve** | [`vision/`](vision/README.md) |
| Portes (STATUS, conventions) | racine `docs/` |

Ne pas déplacer FREEMIUM / COPY / DA_SCREENS / Manifesto dans ces dossiers sans stubs + décision CEO.  
Détail + index : [`README.md`](README.md) § regroupement logique.

### Ordre de lecture code (existants — chemins racine)

0. [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md) — **hub onboarding** (porte développeur).
1. [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) — **canon CEO** : purge jetons, Soft Cap dual (`musicLicense` 39 $), grille Héritage **1080p** / Éternité+ **4K**. Specs : [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) · [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md) · [`SANCTUARY_TOKEN_NFC.md`](SANCTUARY_TOKEN_NFC.md). Vision cinéma Phase 2 : [`ROADMAP_PHASE2.md`](ROADMAP_PHASE2.md).
2. [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) + `wizardDeliverables.ts` — contrat livrables.
3. `pricingConfig.ts` / `wizardPricing.ts` — cents + panier Soft Cap.
4. [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) — waterfall · ledger · clawback. **Jetons DROP P8.**
5. [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) — wizard **7** étapes.
5b. [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md) — Étape 5 Livre Ouvert + Composition Magique.
5c. [`QA_S5_MONTAGE_STEP.md`](QA_S5_MONTAGE_STEP.md) · [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md).
6. [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md) — proxy musique.
7. [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) — positionnement Quiet Luxury.
8. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) · [`DA_SCREENS.md`](DA_SCREENS.md) · [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) · [`WIZARD_EDITOR_COLLAB.md`](WIZARD_EDITOR_COLLAB.md).
9. [`sql/README.md`](sql/README.md) — migrations **P0→P11**.
10. [`PROJECT_STATUS.md`](PROJECT_STATUS.md) — living status. Journal : [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md).
11. [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) — commerce Soft Cap / RevShare. GTM canal direct : [`B2C_GO_TO_MARKET.md`](B2C_GO_TO_MARKET.md).
12. [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) — Killer App mobile.
13. [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md) · [`MONETIZATION_CATALOG.md`](MONETIZATION_CATALOG.md).
14. [`PARTNER_REPORT_JUL2026.md`](PARTNER_REPORT_JUL2026.md) · [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md) — rapport partenaire + projections.

**Archive :** [`_archive/`](_archive/) — onboarding pré-Freemium · B2B2C pré-purge · `QA_P5_5` jetons · **STATUS log**. **Ne plus exécuter / onboarder.**

Après modification wizard, Soft Cap, Étape 5 / Composition Magique, pricing, checkout, RevShare, musique : mettre à jour **FREEMIUM** + **TECHNICAL_ONBOARDING_V1** + annexes touchées **dans le même commit**. Rituel agent : [`.cursor/rules/docs-same-commit.mdc`](../.cursor/rules/docs-same-commit.mdc). Pas de hook Git.

## Vision produit (hors implémentation commerce)

- [`Manifesto-V10.4.md`](Manifesto-V10.4.md) = constitution Brain/Engine — **bible, ne pas éditer** ; **pas** référence checkout V1.
- [`VISION_PHASE_2.md`](VISION_PHASE_2.md) = roadmap stratégique longue (Scanner async, CPL, MRR…).
- Implémentation commerce V1 : **FREEMIUM_V1_PIVOT** → phases 5–6.
