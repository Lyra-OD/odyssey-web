# Odyssey Frontend

Next.js 14 (App Router) — **Studio Odyssey** : hommages vidéo Quiet Luxury en B2C et **B2B2C freemium** (salon → famille).

## Produit (Freemium V1)

| Canal | Modèle |
|-------|--------|
| **B2B2C** | Le salon offre **Souvenir 0 $** ; la famille construit via **Soft Cap** (Héritage / Licence musique) ; Odyssey reverse **30 % du Net Distribuable** (Platform Fee 10 %). |
| **B2C** | Héritage **149 $** · Éternité **299 $** · Légendaire **499 $** (ancre Quiet Luxury). |

**Jetons partenaire = purgés.** Solde salon = commissions uniquement (`partner_commission_*`).

| Forfait | ID | Prix | Médias | Export | Musique |
|---------|-----|------|--------|--------|---------|
| Souvenir | `essential` | 0 $ | 50 | 1080p | Stingray standard (+ Soft Cap officiel) |
| Héritage | `signature` | 149 $ | 125 | **4K** | Catalogue officiel **inclus** + MP3 |
| Éternité | `heritage` | 299 $ | 175 | 4K | Idem + IA + coffre |

Add-ons V1 : `sanctuaryToken` 79 $ · `storyVoice` 39 $ · **`musicLicense` 39 $** · `memoryBook` 149 $ · `aiRetouch` 49 $ · `digitalVault` 99 $.

## État (juillet 2026)

| Phase | Contenu | Statut |
|-------|---------|--------|
| 0–1 | Canon docs + manifeste TS (`granted` / `intended` / `musicLicense`) | ✅ |
| 2 | SQL P8 (purge jetons, Soft Cap quota, entitlements) — **appliqué Supabase** | ✅ |
| 3 | Checkout Soft Cap + webhook `project_paid_entitlements` | ✅ |
| 4 | Soft Cap UX (médias, post-Composition Magique, musique dual) | ✅ |
| **5** | Creatomate (gate entitlements) · NFC · Voix · Livre | ⏳ next |
| 6 | QA / cutover | ⏳ |

## Quickstart

```bash
npm install
npm run dev
```

Vérification build :

```bash
npm run build
```

Variables d’environnement : voir [`docs/TECHNICAL_ONBOARDING_V1.md`](docs/TECHNICAL_ONBOARDING_V1.md) § Env.

## Documentation — par où commencer

| Priorité | Document | Rôle |
|----------|----------|------|
| **1** | [`docs/FREEMIUM_V1_PIVOT.md`](docs/FREEMIUM_V1_PIVOT.md) | **Canon CEO** — grille, Soft Cap, musique, phases |
| **2** | [`docs/TECHNICAL_ONBOARDING_V1.md`](docs/TECHNICAL_ONBOARDING_V1.md) | **Hub onboarding** — stack, chemins code, contrats |
| **3** | [`docs/NARRATIVE_SOFT_CAP.md`](docs/NARRATIVE_SOFT_CAP.md) | Soft Cap granted/intended + dual musique + amputation |
| **4** | [`docs/DELIVERABLES_AND_PACKAGES.md`](docs/DELIVERABLES_AND_PACKAGES.md) | Contrat livrables |
| **5** | [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | Hiérarchie docs + règles repo |

### Annexes utiles

| Document | Contenu |
|----------|---------|
| [`docs/PARTNER_REVSHARE.md`](docs/PARTNER_REVSHARE.md) | Waterfall Bulletproof · ledger commissions |
| [`docs/STORYBOARD_STEP5_LIVRE_OUVERT.md`](docs/STORYBOARD_STEP5_LIVRE_OUVERT.md) | Étape 5 Livre Ouvert + Composition Magique |
| [`docs/STINGRAY_MUSIC_INTEGRATION.md`](docs/STINGRAY_MUSIC_INTEGRATION.md) | Proxy musique Stingray |
| [`docs/SANCTUARY_TOKEN_NFC.md`](docs/SANCTUARY_TOKEN_NFC.md) | Add-on NFC 79 $ |
| [`docs/MUSIC_RIGHTS_ATTESTATION.md`](docs/MUSIC_RIGHTS_ATTESTATION.md) | Soupape MP3 / ToS |
| [`docs/sql/README.md`](docs/sql/README.md) | Migrations P0→P8 |
| [`docs/ROUTES_AND_AUTH.md`](docs/ROUTES_AND_AUTH.md) | Studio / Salon / auth |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Palette, Halo-Éclipse, magic |

> **Archive :** l’ancien onboarding pré-purge jetons est dans [`docs/_archive/`](docs/_archive/). Ne plus l’utiliser pour onboarding.

## Stack

Next.js 14 · React 18 · TypeScript · Tailwind · Supabase (Auth, RLS, Storage) · Stripe · Vercel.

## Règles d’or

1. **Never trust the client** pour 4K / master Stingray / IA full — entitlements = snapshot serveur post-webhook.
2. Ne **jamais** écraser `grantedPackage` lors d’un Soft Cap.
3. `musicLicense` ne relève **pas** le plafond médias / 4K.
4. Après changement wizard / pricing / checkout / musique : mettre à jour le canon + onboarding V1 (voir `CONVENTIONS.md`).
