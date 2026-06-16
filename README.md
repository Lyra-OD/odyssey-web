# Odyssey Frontend

Application Next.js 14 (App Router) pour le Studio Odyssey:
- authentification Supabase,
- **wizard hommage 8 etapes** (autosave, montage, musique Stingray, extensions, checkout hybride),
- ingestion media massive,
- pipeline Stripe (catalog + webhook robuste), **checkout B2B jetons** (partenaires) et **architecture B2B2C** (invitations famille, saga `tribute_checkouts` — **DB P5 en place**, checkout 3 modes encore à brancher).

## Documentation principale

| Document | Contenu |
|----------|---------|
| `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` | **Document central:** stack, structure repo, fait / a terminer, **moteur video**, positionnement haut de gamme, **potentiel & adoption**, **croissance virale** (ethique, co-creation, formats, **verticaliste animaux**), upsells, **securite P0–P2**, elevation produit, multi-skins, isolation medias, regles d'equipe — **sommaire en tete de fichier**. |
| `docs/DELIVERABLES_AND_PACKAGES.md` | **Contrat des livrables et double tarification** (manifeste `wizardDeliverables.ts`, Souvenir/Héritage/Éternité, Salon 16:9 / Social 9:16). |
| `docs/B2B2C_COMMERCE.md` | **Commerce 3 modes** (`b2c`, `b2b_partner`, `b2b2c_family`), prix/jetons, regle `granted_package`, saga Stripe + jetons, etat DB vs API. |
| `docs/ROUTES_AND_AUTH.md` | **Routes canoniques** (`studio` / `salon`), double connexion, legacy `/login`, branding partenaire sur Salon connexion. |
| `docs/WIZARD_ARCHITECTURE.md` | Wizard 8 etapes, autosave, **pricing hybride**, bundle Heritage (67 $), tiers musique, checkout (3 branches). |
| `docs/STINGRAY_MUSIC_INTEGRATION.md` | Musique licenciee (MAPI + mock auto), **catalogues Standard / Premium**, param `tier` sur `/api/music/search`. |
| `docs/sql/README.md` | Migrations SQL ordonnees (**P0–P5**, patch P4.1, seed QA). |
| `docs/CONVENTIONS.md` | Conventions de code (anglais, perimetre Next vs app-backend, hierarchie doc). |
| `docs/Manifesto-V10.4.md` | Vision produit (non reference d'implementation checkout). |

## Quickstart

```bash
npm install
npm run dev
```

Build de verification (comme en deploiement):

```bash
npm run build
```

## Vision architecture

Le projet suit une strategie **moteur unique + multi-skins**:
- une base metier commune (auth, medias, paiements, rendu),
- plusieurs experiences cibles (famille, animaux, mariage, fete, etc.),
- adaptation du branding/copy sans fork de logique coeur.

## Isolation des medias entre cibles

Principe actuel:
- separation forte par `project_id` (storage path + DB),
- `tenant_id` disponible pour renforcer la segmentation.

Principe produit a maintenir:
- aucune cible ne doit partager les medias d'une autre cible,
- toute nouvelle verticale doit garder une isolation explicite (projet/tenant/cible) dans storage + DB + policies.

## A developper (resume)

**Source unique:** `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` — **section 10** (+ sommaire du meme fichier pour navigation).

Chapitres couverts par la roadmap documentaire:

- **A terminer / consolider** (checkout, rendu, tests, monitoring, SQL versionne).
- **Architecture moteur video** (orchestration outil tiers, webhooks, idempotence).
- **Positionnement haut de gamme**, **Potentiel marche / leviers adoption**, **Croissance virale** (ethique, leviers supplementaires, **verticaliste animaux**).
- **Upsells wizard** (Stripe-First, conformite sources tierces).
- **Securite** P0 → P2.
- **Elevation produit** P1 / P2 (fiabilite, rendu, conformite, partenaires).

**Pricing & extensions wizard** (implementes — source `src/lib/wizard/pricingConfig.ts`):
- forfaits **Essentiel / Signature / Heritage** (montants en cents entiers),
- **Option Licence Premium** (39 $) — debloque le catalogue musique Premium pour Essentiel / Signature,
- retouche IA, clef USB Collector, coffre-fort digital, Pack Heritage (upsell step 6),
- forfait **Heritage** : bundle economique affiche (**economie 67 $**), extensions Licence / USB / Coffre deja incluses.

**Encore a brancher au catalogue Stripe** (`billing_catalog` Price IDs) et roadmap produit:
- signature de responsabilite (sources tierces YouTube / URL),
- HD, delai express, packaging — meme principe Stripe-First + trace dans `orders`.

**Securite (roadmap, priorites):** ordre **P0 → P1 → P2** (essentiel prod → renfort → maturite), sans implementation engagee par la doc seule — detail dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, sous-partie securite).

**Elevation produit (roadmap):** fiabilite du parcours, qualite percue du rendu, conformite/reputation, partenaires B2B2C — priorites **P1 / P2** et ordre suggere dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, sous-partie elevation produit).

**Moteur video:** orchestration avec **outil tiers** (API templates type Creatomate ou equivalent), flux paiement → job → webhook fin de rendu — detail dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, **Architecture cible — Moteur video**).

**Positionnement & adoption:** strategie haut de gamme (templates d'excellence, validation narrative, IA ciblee, ops robustes) et leviers adoption (friction, confiance, partenaires) — meme fichier, sous-sections **Positionnement haut de gamme** et **Potentiel marche et leviers adoption**.

**Diffusion organique ("viral"):** boucles ethiques; **co-creation invitee** (rationale, **etapes rapides** tableau, moderation); formats courts verticalaux, QR rituel, premiere diffusion controlee; **verticaliste animaux** + **backlog discovery** (6 pistes); tout dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (**Croissance "virale" et partage**).
