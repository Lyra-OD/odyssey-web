# Odyssey Frontend

Application Next.js 14 (App Router) pour le Studio Odyssey:
- authentification Supabase,
- wizard de creation,
- ingestion media massive,
- pipeline Stripe (catalog + webhook robuste).

## Documentation principale

- Onboarding technique: `docs/TECHNICAL_ONBOARDING_ODYSSEY.md`
- Conventions: `docs/CONVENTIONS.md`
- Vision produit: `docs/Manifesto-V10.4.md`

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

Roadmap detaillee dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10).

**Upsells prevus dans le wizard** (a brancher au catalogue Stripe):
- retouche photo / video assistee par IA,
- musique premium et ligne **frais / droits d'auteur** selon la licence choisie,
- **signature de responsabilite** lorsque des sources tierces sont utilisees (ex: YouTube, imports URL),
- autres options (HD, delai express, packaging): meme principe Stripe-First + trace dans `orders`.

**Securite (roadmap, priorites):** ordre **P0 → P1 → P2** (essentiel prod → renfort → maturite), sans implementation engagee par la doc seule — detail dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, sous-partie securite).

**Elevation produit (roadmap):** fiabilite du parcours, qualite percue du rendu, conformite/reputation, partenaires B2B2C — priorites **P1 / P2** et ordre suggere dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, sous-partie elevation produit).

**Moteur video:** orchestration avec **outil tiers** (API templates type Creatomate ou equivalent), flux paiement → job → webhook fin de rendu — detail dans `docs/TECHNICAL_ONBOARDING_ODYSSEY.md` (section 10, **Architecture cible — Moteur video**).

**Positionnement & adoption:** strategie haut de gamme (templates d'excellence, validation narrative, IA ciblee, ops robustes) et leviers adoption (friction, confiance, partenariats) — meme fichier, sous-sections **Positionnement haut de gamme** et **Potentiel marche et leviers adoption**.
