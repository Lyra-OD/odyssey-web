# Odyssey Frontend

Application Next.js 14 (App Router) pour le Studio Odyssey:
- authentification Supabase,
- wizard de creation,
- ingestion media massive,
- pipeline Stripe (catalog + webhook robuste).

## Documentation principale

| Document | Contenu |
|----------|---------|
| `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` | **Document central:** stack, structure repo, fait / a terminer, **moteur video**, positionnement haut de gamme, **potentiel & adoption**, **croissance virale** (ethique, co-creation, formats, **verticaliste animaux**), upsells, **securite P0–P2**, elevation produit, multi-skins, isolation medias, regles d'equipe — **sommaire en tete de fichier**. |
| `docs/CONVENTIONS.md` | Conventions de code (anglais, brain vs engine). |
| `docs/Manifesto-V10.4.md` | Vision produit manifeste. |

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

**Upsells prevus dans le wizard** (a brancher au catalogue Stripe):
- retouche photo / video assistee par IA,
- musique premium et ligne **frais / droits d'auteur** selon la licence choisie,
- **signature de responsabilite** lorsque des sources tierces sont utilisees (ex: YouTube, imports URL),
- autres options (HD, delai express, packaging): meme principe Stripe-First + trace dans `orders`.

**Securite (roadmap, priorites):** ordre **P0 → P1 → P2** (essentiel prod → renfort → maturite), sans implementation engagee par la doc seule — detail dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, sous-partie securite).

**Elevation produit (roadmap):** fiabilite du parcours, qualite percue du rendu, conformite/reputation, partenaires B2B2C — priorites **P1 / P2** et ordre suggere dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, sous-partie elevation produit).

**Moteur video:** orchestration avec **outil tiers** (API templates type Creatomate ou equivalent), flux paiement → job → webhook fin de rendu — detail dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, **Architecture cible — Moteur video**).

**Positionnement & adoption:** strategie haut de gamme (templates d'excellence, validation narrative, IA ciblee, ops robustes) et leviers adoption (friction, confiance, partenaires) — meme fichier, sous-sections **Positionnement haut de gamme** et **Potentiel marche et leviers adoption**.

**Diffusion organique ("viral"):** boucles ethiques; **co-creation invitee** (rationale, **etapes rapides** tableau, moderation); formats courts verticalaux, QR rituel, premiere diffusion controlee; **verticaliste animaux** + **backlog discovery** (6 pistes); tout dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (**Croissance "virale" et partage**).
