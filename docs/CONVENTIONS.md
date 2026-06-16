# Odyssey Frontend — Conventions

**Last updated: June 2026**

## Langue du code

- **Code** (TypeScript, noms de fichiers, commentaires techniques courts) : **anglais**.
- **Copy utilisateur** : `dictionaries/fr.json` et `dictionaries/en.json` — noms forfaits marketing sous `packages.names` (IDs techniques `essential` / `signature` / `heritage`).
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
| Schéma DB | `docs/sql/odyssey_p*.sql` | Migrations Supabase ordonnées |

## Documentation — hiérarchie

1. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — palette, typographie, co-branding, hiérarchie Salon/Studio.
2. [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) — routes applicatives, auth, branding Salon (si touché).
3. [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) + `wizardDeliverables.ts` — forfaits, livrables, double tarification.
4. `pricingConfig.ts` — cents checkout et extensions.
5. `docs/sql/README.md` — ordre des migrations.
6. [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) — commerce 3 modes + saga.
7. [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) — wizard 8 étapes.
8. [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) — hub onboarding.

Après toute modification wizard, forfaits/livrables, pricing, checkout, routes/auth ou `/api/music/*` : mettre à jour les fichiers concernés (règle §13 de l’onboarding).

## Vision produit

[`Manifesto-V10.4.md`](Manifesto-V10.4.md) = intention produit long terme — **pas** référence d’implémentation du checkout (préférer `B2B2C_COMMERCE.md`).
