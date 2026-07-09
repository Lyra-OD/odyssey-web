# Odyssey Frontend — Conventions

**Last updated: July 2026 · B2B2C v2 · S5 Livre Ouvert PR-1/2/3**

## Langue du code

- **Code** (TypeScript, noms de fichiers, commentaires techniques courts) : **anglais**.
- **Copy utilisateur** : `dictionaries/fr.json` et `dictionaries/en.json` — noms forfaits marketing sous `packages.names` (IDs techniques `essential` / `signature` / `heritage` / `legendary`).
- **Documentation technique** : anglais dans les annexes (`WIZARD_ARCHITECTURE.md`, `B2B2C_COMMERCE.md`) ; sections historiques FR dans `TECHNICAL_ONBOARDING_ODYSSEY.md`.

## Périmètre de ce dépôt

- **Next.js 14** (`app/`, `src/`, `lib/`) = Studio Odyssey (wizard, API routes, Stripe).
- **`app-backend/`** (brain / engine / graphql) = stack legacy ou parallèle — **hors périmètre** du wizard Next actuel sauf mention explicite.

## Séparation des couches

| Couche | Emplacement | Rôle |
|--------|-------------|------|
| UI | `src/components/` | Présentation, i18n |
| Orchestration | `src/hooks/`, composants wizard | État, autosave, navigation |
| Services / API | `app/api/`, `src/lib/` | I/O serveur, Supabase, Stripe |
| Livrables & forfaits (manifeste) | `src/lib/wizard/wizardDeliverables.ts` | **Contrat produit** jetons/$, Salon/Social — doc [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) |
| Prix catalogue (checkout cents) | `src/lib/wizard/pricingConfig.ts` | Montants Stripe, extensions, alignement manifeste |
| Commissions partenaire (P6) | SQL + `app/api/stripe/webhook` | RevShare 30 % — doc [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) |
| Scanner Compagnon | `app/[lang]/scan/`, `app/api/scan/` | Ingestion mobile QR — doc [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) |
| Schéma DB | `docs/sql/odyssey_p*.sql` | Migrations Supabase ordonnées |

## Documentation — hiérarchie

1. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — palette, typographie, co-branding, **signature Halo-Éclipse** (connexion §4.1), hiérarchie Salon/Studio.
2. [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) — routes applicatives, auth, branding Salon (si touché).
3. [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) + `wizardDeliverables.ts` — forfaits, livrables, freemium B2B2C vs Quiet Luxury B2C (149/299/499).
4. `pricingConfig.ts` — cents checkout et extensions.
5. [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) — commerce v2 : freemium, saga checkout, coexistence legacy jetons.
6. [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) — **RevShare 30 %** : tables `partner_commission_balances` / `partner_commission_ledger`, accrual webhook Stripe, clawback remboursements, payout mensuel manuel admin Odyssey.
7. [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) — **Killer App** : QR wizard desktop → session web mobile → ingestion photos papier → preview IA Avant/Après → pont upsell Éternité / Légendaire.
8. [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) — wizard 8 étapes, pricing v2, schéma DB P6.
8b. [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md) — **Étape 5** Livre Ouvert, Composition Magique, constantes timing, roadmap S5-J/K/L.
8c. [`QA_S5_MONTAGE_STEP.md`](QA_S5_MONTAGE_STEP.md) — checklist régression manuelle Étape 5.
8d. [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md) — **stratégie mobile** wizard (Forbes + Ferpection, Scanner, plan M0–M6).
9. `docs/sql/README.md` — ordre des migrations (P0→P6).
10. [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) — hub onboarding.
11. [`PROJECT_STATUS.md`](PROJECT_STATUS.md) — audit daté, dette, plan sprint v2 (living doc).
12. [`QA_P5_5_PARTNER_SALON.md`](QA_P5_5_PARTNER_SALON.md) — checklist QA Salon — **✅ terminée prod** (règles legacy jetons ; freemium v2 = doc B2B2C).

Après toute modification wizard, **Étape 5 / Composition Magique** (`storyboard/*`, `magic-*` CSS, `storyboardMagicTimeline.ts`), **mobile / Scanner** (shell mobile, dock banque, étape 3), forfaits/livrables, pricing, checkout, RevShare, routes/auth ou `/api/music/*` : mettre à jour les fichiers concernés — en priorité [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md), [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md) si touch parcours mobile, + [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §4.2 si touch visuel magic (règle §13 de l'onboarding).

## Vision produit

- [`Manifesto-V10.4.md`](Manifesto-V10.4.md) = constitution technique (Brain/Engine, Loi 25, stack) — **pas** référence checkout.
- [`VISION_PHASE_2.md`](VISION_PHASE_2.md) = feuille de route stratégique Phase 1 (Scanner async, Family Tribute Fund) + Phase 2 (CPL, MRR Sanctuaire, LYRA Data Graph).
- Implémentation commerce : [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2.
