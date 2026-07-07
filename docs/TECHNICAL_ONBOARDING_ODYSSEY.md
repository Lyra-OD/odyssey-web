# Odyssey Frontend - Technical Onboarding

**Last code review: July 2026 · B2B2C v2 + storyboard foundations**

This document helps any developer (frontend, backend, DevOps, QA) onboard quickly: what is implemented, how the architecture works, how to run and test locally, and what comes next.

**Deep dives (English, kept in sync with code):**
- [`docs/DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) — **Deliverables manifest** v2 (Souvenir lead-magnet · Quiet Luxury B2C 149/299/499 · Légendaire Gants Blancs)
- [`docs/B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) — **B2B2C v2** : freemium, RevShare 30 %, saga checkout, legacy jetons coexistence
- [`docs/PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) — Commission ledger, webhook accrual, clawback, payout
- [`docs/SCANNER_COMPANION.md`](SCANNER_COMPANION.md) — Scanner Compagnon (QR → mobile → IA → upsell)
- [`docs/WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) — 8-step flow, pricing v2, checkout saga, P6 schema
- [`docs/STORYBOARD_REFACTOR.md`](STORYBOARD_REFACTOR.md) — official roadmap for the song-based storyboard refactor
- [`docs/STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md) — Search API, catalog tiers, mock mode
- [`docs/sql/README.md`](sql/README.md) — SQL migrations **P0–P6** (P5.5 RBAC, P6 freemium + commissions)
- [`docs/ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) — routes `studio` / `salon` / `scan`, auth, branding
- [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — palette, co-branding, Halo-Éclipse
- [`docs/CONVENTIONS.md`](CONVENTIONS.md) — Code language, doc hierarchy, repo scope
- [`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md) — Living audit + sprint plan v2

Ce document reste partiellement en francais pour l'historique produit; les sections **4.7**, **5**, **10** et les annexes ci-dessus sont la reference a jour pour Jon et l'equipe technique.

---

## Sommaire

Recherche rapide: les titres sont prefixes **## N)** dans ce fichier.

| Section | Contenu |
|---------|---------|
| **1–3** | Contexte, stack, structure du repo |
| **4** | Fonctions deja implementees (auth, wizard, upload, webhook Stripe) — **§4.7 = Tribute Wizard 8 steps** |
| **5** | Modeles de donnees (projects, orders, billing_catalog, webhook_events, media) |
| **6–8** | Variables d'environnement (**Stingray**), scripts, lancement local |
| **9** | Check-list Vercel / GitHub |
| **10** | **Roadmap:** Done (May–Jun 2026) / In progress / To do |
| **10b** | Migrations SQL (incl. P3 autosave) |
| **11–14** | Multi-skins; isolation medias; regles d'equipe; notes |

---

## 1) Contexte du projet

Odyssey est une application Next.js 14 (App Router) avec:
- une experience "Studio" (dashboard + wizard de creation de tribute),
- une ingestion media massive (photos/videos) vers Supabase Storage,
- une base de paiement Stripe "Stripe-First",
- un webhook Stripe robuste avec idempotence forte (pattern lock token).

La logique metier vise un modele hybride **v2 (juin 2026)** :
- **B2C direct (Quiet Luxury)** — 3 forfaits payants : Héritage **149 $**, Éternité **299 $**, Légendaire **499 $** (Gants Blancs). Pas de tier gratuit.
- **B2B2C freemium** — le partenaire offre **Souvenir à 0 $** (lead-magnet) ; la famille paie l’upsell **prix plein** ; Odyssey reverse **30 % RevShare** (brut Stripe) via `partner_commission_ledger`.
- **B2B legacy jetons** — petits salons (`is_freemium = false`) : wallet P5.5 inchangé (débit à l’invitation).
- **Scanner Compagnon** — ingestion mobile photos papier → restauration IA → conversion Éternité / Légendaire.

Canon commerce : [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2.

### Agnosticité backend & multi-verticalité (règle CEO)

Odyssey n'est **pas** une application funéraire. Le back-end Supabase / API reste **agnostique** : funérariums, animaux de compagnie, mariages, événements = **même schéma**, **même saga checkout**, **même webhook Stripe**.

Le **modèle d'affaires B2B2C** est **strictement piloté par la configuration du Tenant** — jamais hardcodé globalement :

| Configuration tenant | Effet |
|----------------------|-------|
| `tenants.vertical` | Catégorie métier (`human`, `pet`, `wedding`…) — copy UI, manifeste livrables |
| `tenants.is_freemium` (P6) | `true` → freemium + RevShare · `false` → jetons prépayés legacy P5.5 |
| `tenants.settings.revshare_bps` | Taux commission (default 3000 = 30 %) — snapshot sur `tribute_checkouts.commission_rate_bps` |

**Exemples coexistants (prod cible) :**
- Urgel Bourgie (`vertical = human`, `is_freemium = true`) → Souvenir 0 $, RevShare 30 % upsell
- Petit salon funéraire (`is_freemium = false`) → wallet jetons, débit à l'invitation, pas de RevShare
- Clinique vétérinaire future (`vertical = pet`, `is_freemium = false`) → jetons prépayés, même RPC P5.5

Detail complet : [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) § Agnosticité backend.

---

## 2) Stack technique

- **Framework web**: Next.js 14 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS, lucide-react, framer-motion
- **Auth/Data/Storage**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Paiement**: Stripe (`stripe` SDK serveur)
- **Upload client**: react-dropzone (via adaptateur headless)
- **i18n**: dictionnaires JSON `dictionaries/fr.json` et `dictionaries/en.json`

---

## 3) Active repo structure (high-signal paths)

- `app/`: Next.js App Router (pages + API routes)
- `app/api/stripe/webhook/route.ts`: central Stripe webhook
- `app/api/projects/[id]/autosave/route.ts`: wizard autosave (GET/PATCH)
- `app/api/projects/[id]/media/route.ts`: list project media (signed URLs)
- `app/api/music/search|preview|stream/route.ts`: licensed music (Stingray proxy)
- `app/api/checkout/route.ts`: checkout — **cible saga v2** (see [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md))
- `app/api/stripe/webhook/route.ts`: Stripe webhook (catalog sync + **cible** `checkout.session.completed` + RevShare)
- `app/[lang]/scan/[token]/page.tsx`: **cible P6** — Scanner Compagnon mobile PWA
- `app/api/scan/sessions/route.ts`: **cible P6** — création session QR
- `docs/B2B2C_COMMERCE.md`: commerce B2B2C v2 (freemium, RevShare, saga)
- `docs/PARTNER_REVSHARE.md` / `docs/SCANNER_COMPANION.md`: commissions + Killer App
- `src/lib/wizard/pricingConfig.ts`: pricing source of truth (cents + B2B tokens)
- `src/components/StickyPriceBar.tsx`: sticky total (B2C $) or token cost (B2B)
- `src/components/auth/LoginForm.tsx`: pages connexion Studio + Salon (halos d’état, formulaire partagé)
- `src/components/auth/ConnexionEclipseLayer.tsx`: couche vidéo `eclipse_login.mp4` (signature Halo-Éclipse)
- `src/components/auth/OdysseyConnexionMark.tsx`: wordmark Odyssey connexion (Montserrat, blanc lumineux)
- `src/components/auth/StudioConnexionBrand.tsx` / `SalonConnexionBrand.tsx`: branding header connexion
- `app/auth/callback/route.ts`: Supabase auth callback
- `src/components/tribute/TributeWizard.tsx`: **8-step** tribute wizard orchestrator
- `src/components/tribute/WizardPhaseProgress.tsx`: 3-phase progress indicator (replaces `WizardStepper`)
- `src/components/tribute/PackageDossierPanel.tsx`: global off-canvas package selector (« Le Dossier »)
- `src/components/tribute/StoryboardChaptersStep.tsx`: dynamic musical chapters (step 4, live)
- `src/components/tribute/storyboard/ChapterMusicPanel.tsx`: Stingray search + preview per chapter (step 4)
- `src/components/tribute/StoryboardMontageStep.tsx`: montage placeholder (step 5 — `S5` dnd-kit next)
- `src/hooks/useWizardStoryboard.ts`: storyboard domain hook (resync, validation, pacing)
- `src/components/tribute/CinematicTeaser.tsx`: cinematic preview player (step 7)
- `src/components/media/MediaDropzoneAdapter.tsx`: headless dropzone adapter
- `src/hooks/useMassMediaUpload.ts` / `useWizardAutosave.ts`: upload + autosave orchestration
- `src/lib/wizard/wizardState.ts`: canonical `wizard_state` V2 (`storyboard`) + legacy compatibility bridge
- `src/lib/music/stingrayClient.ts`: server-only Stingray MAPI client
- `lib/stripe.ts`: Stripe server singleton
- `scripts/`: Stripe / webhook diagnostics
- `dictionaries/`: FR/EN UX copy

---

## 4) Architecture scellee pour le MVP

Ce bloc decrit la fondation technique stable au 26 mai 2026. Toutes les sections ci-dessous sont en production locale et alignees avec le code + le schema Supabase.

### 4.1 Authentification & Profils

**Pipeline d'inscription unifie.**

- Login / signup via Supabase Auth (`@supabase/ssr`).
- Sur chaque INSERT dans `auth.users`, un trigger Postgres `on_auth_user_created` (AFTER INSERT, FOR EACH ROW) appelle la fonction `public.handle_new_user()` en `SECURITY DEFINER`.
- Cette fonction unique fait deux choses atomiquement:
  1. Insere une ligne minimale dans `public.profiles (id)` -- colonne referencee par `projects.user_id_fkey`.
  2. Insere une ligne dans `public.tenant_members (user_id, tenant_id, role)` avec le tenant par defaut (`slug = 'humans'`).

**Backfill des comptes existants**: le script `docs/sql/odyssey_p1_user_bootstrap.sql` contient un seed idempotent qui rattache tous les utilisateurs deja crees.

**Routes & connexion (juin 2026)** — reference complete : [`docs/ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md).

| Zone | URL connexion | URL app | Inscription |
|------|---------------|---------|-------------|
| Famille (Studio) | `/[lang]/studio/connexion` | `/[lang]/studio` | Oui |
| Partenaire (Salon) | `/[lang]/salon/connexion?partenaire=<slug>` (optionnel) | `/[lang]/salon` | Non |
| Legacy | `/[lang]/login` → redirect studio connexion | — | — |

Chemins canoniques : `src/lib/appRoutes.ts`. Redirects anciens `/dashboard` et `/partner` : `next.config.mjs`.

**Signature visuelle connexion — Halo-Éclipse (juin 2026)**

Document canonique : [`DESIGN_SYSTEM.md` §4.1](DESIGN_SYSTEM.md#41-signature-halo-éclipse-connexion-studio--salon).

| Couche | Implementation | Regle |
|--------|----------------|-------|
| Fond | `#020202` | Identique Studio / Salon |
| Halo d'etat | `HALO_SIGN_IN` / `HALO_SIGN_UP` / `HALO_CONFIRMATION` / `HALO_ERROR` dans `LoginForm.tsx` | **Seule** couche qui change de couleur (violet, cyan, vert, magenta) |
| Eclipse | `ConnexionEclipseLayer` + `public/eclipse_login.mp4`, ~11 % opacity, `mix-blend-screen` | **Constante** — prolongation organique du halo, jamais teintee par etat |
| Wordmark | `OdysseyConnexionMark` si pas de logo partenaire | Blanc pur + glow ; reste du form en blanc casse (`zinc-200`/`300`) |
| CTA | `connexionSubmitButtonClass` | Contour cyan + respiration (`connexion-submit-breathe`) |

**Ne pas** reutiliser `OdysseyBrandLockup` (video `/eclipse.mp4`) sur les pages connexion — lockup marketing navbar / hero uniquement.

**Important**: ne pas creer d'autre trigger sur `auth.users` pour le bootstrap user -- tout doit passer par `handle_new_user()`. Ajouts futurs (org auto-creee, email transactionnel de bienvenue, etc.) -> etendre cette fonction.

### 4.2 Multi-tenant (B2B / B2B2C / white-label ready)

> **Multi-verticalité :** `vertical` décrit le **marché** (human, pet, wedding…). `is_freemium` + `revshare_bps` décrivent le **modèle commercial** — axes indépendants, tous deux sur `tenants`. Voir §1 et [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) § Agnosticité backend.

Table `public.tenants` (existante):
- `id uuid PK`, `name text`, `slug text`, `vertical text`, `settings jsonb`, `created_at`.
- **P6 :** `is_freemium boolean NOT NULL DEFAULT false` — freemium + RevShare vs jetons legacy (par tenant, jamais global).
- 2 lignes seedees: `humans` (vertical `human`) et `pets` (vertical `pet`).

Table `public.tenant_members` (creee par P1):
- `id uuid PK`, `user_id uuid FK auth.users`, `tenant_id uuid FK tenants`, `role text DEFAULT 'member'`, `created_at`.
- Contrainte `UNIQUE (user_id, tenant_id)` -> empeche les doublons + permet `ON CONFLICT DO NOTHING` dans le trigger.
- RLS activee: `tenant_members_select_own` -- un utilisateur ne voit que ses propres rattachements (`user_id = auth.uid()`).
- Pas de policy INSERT/UPDATE/DELETE pour `authenticated`; ces operations passent par le trigger `SECURITY DEFINER` ou via `service_role`.

**Convention de naming**:
- `slug` = identifiant technique stable (immutable une fois en prod).
- `name` = label commercial modifiable.
- `settings.brand_label` = marque affichée connexion Salon + header dashboard partenaire.
- `settings.brand_logo_url` = URL publique du logo (connexion `?partenaire=<slug>` et `/salon`) — RPC P5.2 / P5.4 (voir [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md), [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)).
- `settings.revshare_bps` = taux RevShare partenaire (default **3000** = 30 %) — lu au checkout, snapshot sur `tribute_checkouts.commission_rate_bps`.
- `vertical` = categorie metier (`human`, `pet`, futur `wedding`, `event`...) -- permet d'avoir plusieurs tenants par vertical (ex. white-label d'un studio funeraire dans `vertical = 'human'`).

**Resolution du tenant dans le code**: la route `app/api/projects/draft/route.ts` fait un `SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1` pour recuperer le tenant principal. Si demain un user appartient a plusieurs tenants, le wizard lui demandera explicitement de choisir.

### 4.3 Stockage media -- bucket `user-assets`

- Bucket prive Supabase Storage, accede via le SDK navigateur (`@supabase/supabase-js`).
- Chemin canonique d'un fichier:
  ```
  projects/<project_id>/<yyyy>/<mm>/<dd>/<order_index>-<safe-name>-<random>.<ext>
  ```
- Construit par `buildStoragePath()` dans `src/lib/uploads/mediaUploadService.ts`.
- Les policies RLS du bucket sont definies dans `docs/sql/odyssey_p0_storage_policies_REFERENCE.sql` -- a appliquer **via Dashboard -> Storage -> user-assets -> Policies** (le SQL Editor n'a pas les droits sur `storage.objects`).
- Regle: un utilisateur ne peut SELECT/INSERT que sur un fichier dont le 2e segment de chemin (`<project_id>`) correspond a un projet qu'il possede dans `public.projects`.

### 4.4 Schema `public.media_assets`

Aligne avec le payload du service d'upload (`MediaAssetInsertRow`):

| Colonne | Type | NOT NULL | Notes |
|---|---|---|---|
| `id` | uuid | oui | PK, default `gen_random_uuid()` |
| `project_id` | uuid | -- | FK `projects.id`, indexe |
| `owner_user_id` | uuid | oui | FK `auth.users.id` -- **convention DB Odyssey**, pas `user_id` |
| `tenant_id` | uuid | oui | FK `tenants.id` |
| `storage_path` | text | -- | Chemin dans le bucket `user-assets` |
| `mime_type` | text | -- | Ex. `image/jpeg`, `video/mp4`, vide pour HEIC sur Chrome |
| `size_bytes` | bigint | -- | Taille fichier |
| `source` | text | oui | `'local'`, `'facebook'`, `'instagram'`, `'tiktok'`, `'google_photos'` (default `'local'`) |
| `upload_status` | text | oui | `'queued'`, `'uploaded'`, ... (default `'queued'`) |
| `order_index` | integer | oui | Ordre voulu par l'utilisateur (default `0`) |
| `created_at` | timestamptz | oui | default `now()` |
| `file_type`, `display_order`, `status`, `file_hash` | text/int | -- | **Colonnes heritees, non utilisees** par le pipeline actuel |

**Contraintes critiques**:
- `UNIQUE (project_id, storage_path)` -> indispensable pour le `onConflict: "project_id,storage_path"` du upsert client.
- Index `idx_media_assets_owner_user_id` et `idx_media_assets_tenant_id` pour les requetes back-office.

**RLS**:
- `media_assets_select_owner_project`, `media_assets_insert_owner_project`, `media_assets_update_owner_project` -- toutes basees sur l'ownership du projet via `EXISTS (SELECT 1 FROM projects WHERE id = media_assets.project_id AND user_id = auth.uid())`.
- Pas de policy DELETE pour `authenticated`.

### 4.5 Upload frontend -- pipeline complet

**Composants en couches**:

| Couche | Fichier | Role |
|---|---|---|
| UI dropzone | `src/components/media/MediaDropzoneAdapter.tsx` | Adaptateur headless `react-dropzone`. Validator custom pour HEIC (cf. ci-dessous). |
| UI queue | `src/components/media/MediaQueueGrid.tsx` | Grille de miniatures avec statuts, erreurs full text, bouton "Copier l'erreur", retry et delete par item. |
| Orchestration | `src/hooks/useMassMediaUpload.ts` | State queue + actions (`enqueue`, `start`, `retryFailed`, `retryItem`, `removeItem`, `cancel`, `clearCompleted`, `clearAll`). **Auto-relance** d'un batch quand de nouveaux fichiers sont ajoutes pendant qu'un batch tourne (via `useEffect` sur `[isRunning, items, start]`). |
| Service | `src/lib/uploads/mediaUploadService.ts` | Worker pool concurrent (4), retries exponentiels (300ms x 2^n), upload Storage + upsert `media_assets` atomique. |

**Validator HEIC custom (point critique iPhone)**:
- Chrome / Firefox / Edge **ne reconnaissent pas HEIC** comme MIME type valide et renvoient `file.type = ""`.
- Sans patch, `react-dropzone` rejette les `.heic` en `file-invalid-type` meme si le fichier est liste dans `accept`.
- Solution: un `customFileValidator` qui accepte les fichiers sans MIME si l'extension matche `/\.(heic|heif)$/i`.
- Cote affichage: la grille saute la previsualisation `<img>` pour HEIC (Chrome ne sait pas la decoder) et affiche un badge `HEIC` propre a la place.

**Auto-relance des batches**:
- Si l'utilisateur drop un 2e lot pendant qu'un 1er batch tourne, le `start()` du hook refuse l'appel concurrent (`if (isRunning) return`).
- Sans patch, le 2e lot reste eternellement en `queued`.
- Solution: un `useEffect` qui detecte `isRunning === false && items.some(i => i.status === 'queued')` et relance automatiquement.

### 4.6 Webhook Stripe (inchange depuis mai)

- Verification de signature.
- Pattern Atomic Lock Token & Process sur `webhook_events` (TTL configurable, anti double-traitement).
- Ecriture DB uniquement via client Supabase admin (`service_role`).
- Sync `billing_catalog` depuis `product.*` et `price.*`.
- Logs structures + helper `serializeError`.

### 4.7 Tribute Wizard (8 steps) — B2B2C v2 + storyboard pivot

The tribute flow is a **premium 8-step tunnel** with free step navigation, server autosave, and checkout (Stripe and/or freemium 0 $). Full detail: [`docs/WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md).

Package selection is global, not step-bound: the **« Dossier »** trigger (`PackageDossierPanel`) lives in the sticky header from step 1 onward — `WizardBasePackagePicker` has been removed.

| Step | UX label (i18n) | Component | Persisted in `wizard_state` |
|------|-----------------|-----------|-----------------------------|
| 1 | Essentials | `TributeWizard` (+ global `PackageDossierPanel` trigger) | `essentials`, `basePackage`, `pricing` |
| 2 | Sources | `TributeWizard` | `socialSources`, `basePackage` |
| 3 | Vault (upload) | `MediaDropzoneAdapter` + **`ScannerCompanionPanel`** (cible) | `media_assets` + scan sessions — [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) |
| 4 | Musical chapters (**live**) | `StoryboardChaptersStep` + `ChapterMusicPanel` | `storyboard.chapters[].song` — canonical, no bridge |
| 5 | Montage (**placeholder**) | `StoryboardMontageStep` — table de montage en construction (`S5` dnd-kit next) | `storyboard` (canonique) |
| 6 | Memory extensions | `MontageExtensionsStep` | `extensions` (à la carte — commissionnables en freemium) |
| 7 | Film preview | `PreviewStep` + `CinematicTeaser` | reads canonical `storyboard` through the temporary preview bridge |
| 8 | Checkout | `CheckoutStep` | `POST /api/checkout` → saga `tribute_checkouts` — [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2 |

> Steps have been reordered: music/chapters now come **before** montage, since chapter media capacity depends on the chosen song's duration. `S5` (`StoryboardMontageStep` + `dnd-kit`) will replace step 5's current placeholder — see [`STORYBOARD_REFACTOR.md`](STORYBOARD_REFACTOR.md). Clean Slate (juillet 2026) removed the inert `SoundSignatureStep` that silently ignored user input.

**Packages (marketing vs technical IDs):**

| Marketing FR | EN | ID technique | Canal |
|--------------|-----|--------------|-------|
| Souvenir | Keepsake | `essential` | **B2B2C freemium only** (0 $ offert) — lead-magnet |
| Héritage | Legacy | `signature` | B2C entrée 149 $ · upsell freemium |
| Éternité | Eternity | `heritage` | B2C choix privilégié 299 $ · upsell freemium |
| Légendaire (Gants Blancs) | Legendary | `legendary` | **B2C direct only** 499 $ (P6) |

Full matrix : [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) · code: `wizardDeliverables.ts`, `packageI18n.ts`.

**Pivot d’architecture validé (juillet 2026) :**

- l’ancien modèle “3 actes + 3 pistes” n’est plus la source de vérité produit
- la source de vérité canonique est désormais `WizardStoryboardState`
- un `storyboard` contient des `chapters`
- chaque chapitre contient un ordre de `mediaIds` et une `song` optionnelle
- la durée réelle `durationSec` de la chanson devient la base du pacing futur

**Pourquoi ce changement :**

- le manifeste v2 autorise 2 / 4 / 5 / 7 chansons selon le package
- l’ancienne UI était structurellement limitée à 3 slots musicaux
- le modèle `storyboard` résout ce deadlock et aligne naturellement narration, musique et pacing

**Pricing v2 — `src/lib/wizard/pricingConfig.ts` (target; code migration Phase A):**
- All amounts in **integer cents**. Cart: `computeWizardCart()` + `sumCartLineItemsCents()`.
- **Target grid:** `essential` **0¢** (freemium) · `signature` **14900¢** · `heritage` **29900¢** · `legendary` **49900¢**.
- **B2C direct:** Héritage / Éternité / Légendaire only — **no Souvenir**.
- **B2B2C freemium:** family pays **full upsell price** (not delta vs 79 $). Extensions à la carte added to Stripe total.
- **Legacy jetons** (`is_freemium = false`): wholesale **4000¢/token** · débit P5.5 à l’invitation — see [`QA_P5_5_PARTNER_SALON.md`](QA_P5_5_PARTNER_SALON.md) (✅ terminée prod).
- **`StickyPriceBar`:** B2C `Total : {amount} $` · B2B legacy `Coût : {tokens} jeton(s)` · freemium family: dollars only (never « jeton »).
- Heritage bundle marketing (67 $ savings) shown in the global Dossier (`PackageDossierPanel`) — see [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md). `DEFAULT_B2C_BASE_PACKAGE = "heritage"` (Éternité) is now the explicit default anchor for new B2C projects.

**Checkout modes (target v2):**

| Mode | Trigger | Payment |
|------|---------|---------|
| `b2c` | No `projects.invitation_id` | Stripe — Quiet Luxury 149/299/499 + extensions |
| `b2b_partner` | Partner funerarium path | Legacy jetons (P5.5) |
| `b2b2c_family` + `is_freemium` | Invitation + freemium tenant | **0 $** → `completed` sans Stripe · upsell → Stripe → **RevShare 30 %** webhook |
| `b2b2c_family` + legacy | Invitation + non-freemium | Jetons P5.5 + delta Stripe (coexistence) |

**Resolution rule:** `projects.invitation_id` → `b2b2c_family` — **not** `resolveUserIsPartner()` alone.

**Spike checkout v1 (jetons-first saga) : cancelled** — replaced by freemium + RevShare pivot. See [`PROJECT_STATUS.md`](PROJECT_STATUS.md).

**Scanner Compagnon (Killer App — cible Phase B):**
- Desktop wizard step 3 displays QR → mobile `/[lang]/scan/[token]` (PWA, no native app).
- Paper photo capture → Supabase upload → IA before/after preview → upsell Éternité / Légendaire.
- Spec: [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md).

**Autosave, CinematicTeaser:** unchanged — see subsections below and [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md).

**`WizardPhaseProgress` (`WizardPhaseProgress.tsx`) — replaces the old 8-circle `WizardStepper`:**
- Renders 3 macro-phases (Déposer 1–3 / Composer 4–6 / Recevoir 7–8) with a 1px progress line and a discrete current-step label — reduces cognitive load vs. 8 explicit circles.
- Clicking a phase calls `navigateToStep()` in `TributeWizard.tsx`, which **flushes autosave** then updates `currentStep`.
- Top-left **Back** control on steps 2+ uses the same flush-before-navigate pattern.

**Autosave (P3 — `docs/sql/odyssey_p3_wizard_autosave.sql`):**
- Columns on `projects`: `wizard_state` (jsonb), `wizard_step` (1..10), `last_saved_at`.
- API: `GET/PATCH /api/projects/[id]/autosave` with Zod validation and shallow JSONB merge per section.
- Since `S2`, the canonical persisted snapshot is `wizard_state.storyboard`; legacy runtime projections are rebuilt on read for backward compatibility.
- Client: `useWizardAutosave` (800ms debounce for text, immediate flush on step change) + `AutosaveIndicator` UI.
- Draft creation: `POST /api/projects/draft` when `firstName` ≥ 2 characters (required before step 3 upload).

**Sound signature (step 5) — Stingray, not legacy “Musical Ambiance”:**
- Removed: mood-based catalog (`soft`, `melancholic`, etc.) as the primary UX.
- Current: debounced search → `GET /api/music/search?q=…&tier=standard|premium` → licensed tracks with composite `trackId` (`sr:{playlistId}:{songId}`).
- **Catalog tiers:** Signature/Essentiel → **Standard**; Heritage or **Licence Premium** (39 $) → **Premium**. Banner on step 5 upsells Premium when still on Standard.
- See [`docs/STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md).

**`WizardStoryboardState` shape (v2, canonique):**

```json
{
  "storyboard": {
    "chapters": [
      {
        "id": "chapter-1",
        "mediaIds": ["uuid-1", "uuid-2"],
        "song": {
          "source": "stingray",
          "trackId": "stingray-sinatra-my-way",
          "title": "My Way",
          "artist": "Frank Sinatra",
          "coverUrl": "https://...",
          "durationSec": 275
        }
      }
    ],
    "unassignedIds": ["uuid-3"],
    "excludedIds": ["uuid-4"],
    "focalPoints": {
      "uuid-1": { "x": 0.421, "y": 0.318 }
    }
  }
}
```

Legacy state is still accepted on read for migration, but new saves now persist the canonical `storyboard` form. The temporary runtime bridge keeps the old UI working until the dedicated Storyboard UI tickets ship.

**`CinematicTeaser` (step 7):**
- Builds slides from the current runtime bridge, which is itself rebuilt from canonical `storyboard` data until the preview refactor lands.
- Audio uses `track.previewUrl` (same-origin proxy) tied to the persisted `trackId`.
- Apple TV–style controls; auto-play when the preview step mounts.

**Checkout (see [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2):**
- **`b2c`:** Stripe full cart (149/299/499 + extensions) — no RevShare.
- **`b2b_partner`:** Legacy token debit (`debitPartnerTokens()` TS — P5.5 RPC target).
- **`b2b2c_family` freemium:** `family_total_cents = 0` → `completed` without Stripe · else Stripe full upsell → webhook → `accrue_partner_commission_for_checkout()` — **Phase A sprint**.
- **`b2b2c_family` legacy:** jetons P5.5 + delta — coexistence, not Phase A focus.

---

## 5) Modeles de donnees -- source de verite

Tables actives dans `public`:

| Table | Role | Securite |
|---|---|---|
| `tenants` | Verticale + partenaires ; **`vertical`** (marché) · **`is_freemium`** (P6, modèle commercial) · **`settings.revshare_bps`** (taux commission) | Lecture interne + partner SELECT |
| `tenant_members` | Jointure M:N user <-> tenant | RLS: un user voit ses propres rattachements |
| `profiles` | Profil enrichi par user (FK auth.users) | RLS si necessaire (au minimum SELECT own) |
| `projects` | Hommage en cours (FK profiles + tenants) | RLS: ownership via `user_id = auth.uid()` |
| `media_assets` | Photos / videos uploadees | RLS: ownership transitif via le projet parent |
| `orders` | Paiements Stripe (base + upsells) | RLS SELECT only (ecriture = service_role) |
| `billing_catalog` | Cache local des Products/Prices Stripe | Lecture interne |
| `webhook_events` | Idempotence webhook Stripe (lock token) | service_role uniquement |
| `partner_token_wallets` | Solde jetons B2B **legacy** par tenant (P4) | SELECT `partner_admin` (P5.5); write `service_role` |
| `partner_token_ledger` | Journal jetons **legacy** (P4) | SELECT `partner_admin`; write `service_role` |
| `partner_commission_balances` | Agrégat RevShare par tenant (**P6**) | SELECT `partner_admin`; write `service_role` |
| `partner_commission_ledger` | Journal commissions append-only (**P6**) | SELECT `partner_admin`; write `service_role` |
| `partner_invitations` | Invitation funérarium → famille (P5) | SELECT partner roles + accepted family |
| `tribute_checkouts` | Saga checkout v2 (P5 + P6 columns) | SELECT project owner + partner roles; write `service_role` |
| `scan_sessions` | Sessions QR Scanner Compagnon (**P6.1**, cible) | write `service_role` ; validate via token |

Relations critiques:

```
auth.users --1:1--> profiles --1:N--> projects --1:N--> media_assets
              |
              +-----M:N via tenant_members----> tenants
                        |
                        +--> partner_token_wallets (legacy jetons)
                        +--> partner_commission_balances (P6 RevShare)
                        +--> partner_commission_ledger (P6)
                        +--> partner_invitations (P5)
                        +--> tribute_checkouts (P5 + P6)

projects.invitation_id --> partner_invitations
projects --1:N--> orders --N:1--> billing_catalog
tribute_checkouts --optional--> partner_token_ledger.tribute_checkout_id (legacy)
tribute_checkouts --optional--> partner_commission_ledger.tribute_checkout_id (P6)
scan_sessions --> projects (P6.1 Scanner)
```

**Tous les scripts SQL qui produisent cette base sont dans `docs/sql/` et listes dans `docs/sql/README.md` avec leur ordre d'execution sur une base vierge.**

---

## 6) Critical environment variables

**Core (server):**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client)

**Licensed music — Stingray Music API (MAPI), server-only:**

| Variable | Required | Description |
|----------|----------|-------------|
| `STINGRAY_CLIENT_ID` | Yes (prod) | API key sent as `x-client-id` on every MAPI request |
| `STINGRAY_BEARER_TOKEN` | Optional | `Authorization: Bearer …` if your contract requires it (alias: `STINGRAY_API_TOKEN`) |
| `STINGRAY_API_BASE_URL` | No | Default `https://music-service.stingray.com` |
| `STINGRAY_DEVICE_ID` | No | Default `odyssey-wizard` — sent as `X-Device-Id` |
| `STINGRAY_LANGUAGE` | No | Default `fr` — sent as `X-Language` |
| `STINGRAY_MODE` | No | `mock` = offline catalog + cinematic preview MP3; `live` = MAPI (default) |
| `STINGRAY_USE_MOCK` | No | Deprecated — equivalent to `STINGRAY_MODE=mock` |

Without `STINGRAY_CLIENT_ID`, `getStingrayConfig()` forces **mock** mode (log: equivalent `STINGRAY_USE_MOCK=true`). `shouldUseStingrayMock()` also covers explicit `STINGRAY_MODE=mock` / `STINGRAY_USE_MOCK=true`. Staging works without API keys.

**Best practices:**
- Never commit secrets.
- Avoid stray spaces/quotes in `.env.local`.
- Mirror all variables on Vercel (local env is not deployed automatically).

---

## 7) Scripts disponibles (diagnostic et tests)

Dans `scripts/`:
- `check-stripe-auth.ts`: test rapide auth Stripe (sanity check)
- `test-odyssey-sync.ts`: creation de donnees Stripe de test + signature valide
- `stress-test-webhook.ts`: simulation de concurrence webhook

Objectif:
- valider les credentials,
- valider le parsing/signature,
- valider l'idempotence sous charge parallele.

---

## 8) Lancer le projet localement

### 8.1 Installation
```bash
npm install
```

### 8.2 Developpement
```bash
npm run dev
```

### 8.3 Build de verification (comme Vercel)
```bash
npm run build
```

Le build local doit passer avant tout push de release.

---

## 9) Deploiement Vercel - check rapide

Pour que les pushes GitHub declenchent un deploy:
1. Projet Vercel connecte au bon repo (`Lyra-OD/odyssey-web`)
2. Branche de production = `main`
3. App GitHub Vercel autorisee sur le repo/organisation
4. Variables d'environnement configurees dans Vercel

Si "No git repositories found": c'est en general un probleme de permissions GitHub App (pas de code).

---

## 10) Current state and roadmap

**Latest detailed audit and 2-week action plan:** [`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md) (June 2026 snapshot — update that file after milestones; this section remains the long-form onboarding roadmap).

### Done — foundation (May 2026)

- Supabase auth + unified `handle_new_user` bootstrap (`profiles` + `tenant_members`).
- Multi-tenant model: enriched `tenants`, `tenant_members` with RLS.
- `POST /api/projects/draft`: draft project creation with tenant resolution.
- Mass upload pipeline: queue UI, HEIC validator, batch auto-restart, retries, visible errors.
- `media_assets` schema aligned (`owner_user_id`, `source`, `upload_status`, UNIQUE `project_id+storage_path`).
- Production-grade Stripe webhook (atomic lock token).
- Stripe / webhook diagnostic scripts.
- Versioned SQL in `docs/sql/` + execution order in `docs/sql/README.md`.

### Done — tribute wizard tunnel (June 2026)

- **8-step wizard** with `WizardPhaseProgress` (3-phase, click navigation + flush autosave before step change).
- **P3 autosave**: `wizard_state`, `wizard_step`, `last_saved_at` + `useWizardAutosave` + `AutosaveIndicator`.
- **Media reload** after refresh: `GET /api/projects/[id]/media` (+ reorder / delete routes).
- **Musical chapters** (step 4, live): `StoryboardChaptersStep` + `ChapterMusicPanel` — dynamic chapters read/write `storyboard.chapters[].song` directly, no bridge.
- **Montage** (step 5, placeholder): `StoryboardMontageStep` — honest UX message while `S5` (dnd-kit) is built. `SoundSignatureStep` removed during Clean Slate (was silently ignoring input).
- **Storyboard domain hook**: `useWizardStoryboard` extracted from `TributeWizard` (juillet 2026 Clean Slate).
- **Extensions** (step 6): four upsell cards + Heritage Pack; persisted in `wizard_state.extensions`.
- **Cinematic preview** (step 7): `PreviewStep` + `CinematicTeaser` via temporary runtime bridge rebuilt from `storyboard`.
- **Hybrid pricing**: `pricingConfig.ts` + `StickyPriceBar` + global `PackageDossierPanel` (steps 1+).
- **Economic bundle (Heritage)**: savings badge **67 $** on formula picker; extensions Licence/USB/Coffre marked « Déjà inclus » on step 6; cart excludes bundled lines.
- **Music tiers**: Standard vs Premium search on step 4 (`ChapterMusicPanel`) + upsell to Licence Premium (39 $) at step 6.
- **`POST /api/checkout`**: B2C Stripe or B2B partner token debit (2 modes in code today); metadata still carries the legacy music payload until `S9`.

### Done — commerce database (B2B2C core, June 2026)

- **P4** `partner_token_wallets` + `partner_token_ledger`.
- **P4.1** RLS wallets/ledger restricted to `partner` / `partner_admin`.
- **P5** `partner_invitations`, `tribute_checkouts`, `projects.invitation_id`, `debit_partner_tokens_for_checkout()`.
- Documentation: [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md), [`sql/README.md`](sql/README.md) (P0–P5).

See §4.7, [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md), and [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md).

### Done — Salon partner surface + QA P5.5 (June 2026) ✅

- **P5.5 RBAC (app):** `PartnerContext.capabilities` — Directeur vs Admin ; bloc jetons masqué si `!canViewBalance`.
- **Salon layout gate:** `resolveSalonLayoutAccess` — utilisateur sans rôle partenaire → redirect `/studio` ; non-auth → connexion salon avec slug mémorisé.
- **`GET /api/partner/wallet`:** snapshot solde + `credit_limit_tokens` (admin only) ; consommé par `PartnerContext` (plus de mock `42`).
- **Branding connexion persist:** `?partenaire=` + cookie serveur + localStorage ; hotfix cookie en RSC.
- **Header salon:** déconnexion → `/salon/connexion?partenaire=<slug>` ; toggle FR/EN (`LocaleSwitcher`).
- **Signature visuelle connexion Halo-Éclipse:** `ConnexionEclipseLayer`, halos d’état, `OdysseyConnexionMark`, CTA cyan — voir [`DESIGN_SYSTEM.md` §4.1](DESIGN_SYSTEM.md#41-signature-halo-éclipse-connexion-studio--salon) et [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md).

### Done — B2B2C v2 documentation (June 2026) ✅

- Canon: [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2, [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md), [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md), [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md).
- Spike checkout v1 **cancelled** → freemium + RevShare pivot.
- **QA P5.5 terminée prod** — [`QA_P5_5_PARTNER_SALON.md`](QA_P5_5_PARTNER_SALON.md).

### In progress — Phase A sprint (Monday)

- **P6 SQL:** `is_freemium`, `partner_commission_*`, RPC accrue.
- **pricingConfig + wizardDeliverables v2** (0 / 149 / 299 / 499).
- **Saga checkout v2** + webhook RevShare 30 %.

### To do — after Phase A

- Scanner Compagnon · Légendaire fulfillment · clawback · tests CI · video render pipeline.

### Product roadmap (unchanged intent — see subsections below)

The following blocks remain valid **product/strategy** references (video engine architecture, premium positioning, adoption, viral growth, pets vertical, security P0–P2, product elevation). They are **not** implementation checklists.

### A terminer / consolider (legacy FR index — superseded by blocks above)

- ~~Route checkout Stripe~~ → **done** (catalog sync still to do).
- Enqueue rendu video (Creatomate/worker) apres paiement confirme.
- Suite de tests automatique (unit + integration webhook/checkout).
- Monitoring centralise (traces/alerting) et tableaux de bord d'exploitation.

### Architecture cible — Moteur video (outillage existant)

**Portee:** description pour preparer les etapes suivantes — **choix d'outil precis et integrations restent a finaliser**; ce bloc fixe l'intention architecturelle.

**Principe:** ne pas reconstruire un pipeline d'encodage maison pour le MVP. L'approche retenue est **orchestration**: notre stack declenche et suit un rendu realise par un **service externe base templates** (dans la lignée du projet: API type **Creatomate**, ou equivalent SaaS API-driven).

**Flux fonctionnel (ordre logique):**

1. Paiement confirme (webhook Stripe deja en place) ou statut projet `paid` / equivalent.
2. **Enqueue** d'un job de rendu cote serveur (route dediee, job queue, ou fonction edge selon choix infra — a arbitrer).
3. Appel serveur-securise vers l'API du fournisseur de rendu: template ID, URLs medias (Supabase Storage signees ou IDs connus), parametres texte/musique/duree.
4. Le fournisseur rend la video de facon asynchrone.
5. **Callback / webhook** fournisseur → notre backend (handler dedie, verification signature si fournie par le vendeur) → mise a jour `projects` (ex: `completed`, URL fichier final, erreurs).
6. Notification utilisateur (email / in-app) alignee avec la roadmap "Elevation produit".

**Composants typiques (sans prescrire le runtime exact):**

| Role | Responsabilite |
|------|----------------|
| Etat projet + medias | Supabase (`projects`, `media_assets`, statuts rendu). |
| Secrets API rendu | Variables env serveur uniquement (Vercel / fonctions), jamais expose client. |
| Orchestrateur | Code serveur qui enfile le job et gere retries / idempotence sur le **webhook de fin de rendu**. |
| Rendu video | Service tiers (templates, transitions, audio) — Creatomate ou **equivalent** (Shotstack, Remotion Cloud, etc.) selon criteres prix/latence/support. |

**Points critiques a traiter lors de l'implementation:**

- **Idempotence** sur le webhook "render completed" (comme pour Stripe: pas de double livraison).
- **Timeouts et erreurs**: statuts `render_failed`, retry limite, logs exploitables.
- **Couts**: duree video, resolution, stockage sortie — alignement avec upsells et catalogue Stripe.

**Lien avec le reste de la doc:** la qualite percue (preview, templates, section "Elevation produit") conditionne les parametres envoyes au moteur; la securite (P0) impose que seuls les medias du bon `project_id` soient references dans le job.

#### Positionnement haut de gamme (recommandation strategique — doc uniquement)

Le luxe percu ne repose pas sur une seule API, mais sur **trois piliers**: qualite du film, fiabilite du service, maitrise creative et legale.

**Rendu principal (scalable, niveau studio):** privilegier un **moteur template API professionnel** (ex. Creatomate ou equivalent serieux: rendu cloud, templates maitrises, webhooks, preview). Investir dans **peu de templates mais tres finis** (typo, rythme, transitions, mix audio) plutot qu'un volume d'options mediocres.

**Couche prestige (differentiation):** previsualisation / validation narrative avant rendu final; **upsell optionnel de revue humaine** (controle court coherence emotionnelle, son, texte); pack livraison (HD, version courte reseaux, lien securise, traçabilite).

**IA:** ciblee et discrete (retouche, stabilisation legere) plutot que generation de scenes inventees au MVP — risques emotionnels et juridiques pour un hommage.

**Excellence operationnelle:** idempotence webhook fin de rendu, statuts projet lisibles, notifications, observabilite (duree rendu, echecs, retries) — aligne securite P0 et section "Elevation produit".

**Alternative haute exigence creative:** stack type **Remotion + rendu serverless** si controle visuel unique absolu — cout equipe et complexite nettement superieurs; a reserver si le positionnement marque l'exige.

| Couche | Orientation |
|--------|-------------|
| Rendu principal | API template cloud + templates designers |
| Differentiation | Validation narrative + review humaine optionnelle |
| IA | Optionnelle, retouches ciblees |
| Operations | Orchestration + webhooks + statuts + monitoring |

#### Potentiel marche et leviers adoption (hypotheses produit — doc uniquement)

**Potentiel:** le besoin (hommage video personnalise, multi-verticales) est large et emotionnellement fort; la différenciation viendra de la **confiance**, de la **qualite percue**, des **partenariats** (funeraires, veterinaires, mariage, etc.) et d'un parcours qui **reduit la charge cognitive** au moment du deuil ou du rassemblement.

**Realisme sur un objectif type "80% d'usage":** un tel taux ne depend pas seulement du produit — distribution, prix, contexte culturel, et moment de vie importent. La doc fixe des **leviers** plutot qu'une garantie.

**Leviers pour maximiser adoption et completion (a prioriser en discovery / UX):**

1. **Friction minimale:** sauvegarde auto du parcours, reprise sans tout recommencer, upload mobile fluide, valeurs par defaut intelligentes (template, duree, ordre).
2. **Premier succes rapide:** faire atteindre un resultat "deja beau" avec peu de decisions — options avancees ensuite.
3. **Confiance:** prix et delais transparents, politique donnees/medias claire, statuts projet humains, pas de jargon technique.
4. **Preuve sociale:** exemples video (avec consentement), temoignages, partenaires identifiables.
5. **Canaux B2B2C:** partenaires qui introduisent le service au bon moment reduisent l'effort marketing direct et augmentent la conversion contextuelle.
6. **Support humain sur incidents:** en segment sensible, la qualite du recours en cas d'echec compte autant que le rendu.
7. **Qualite visible en quelques secondes:** demos ou extraits courts (avec consentement) pour que l'utilisateur projette immediatement le resultat ("je veux ca pour lui/elle").
8. **Angoisse technique zero:** libelles et messages orientes utilisateur (pas de codes d'erreur bruts); aide contextuelle sur upload et delais.
9. **Transparence avant paiement:** prix total comprehensible, delai de livraison annonce, lignes upsell optionnelles explicites (droits, HD, express).
10. **Parcours "decisions progressives":** peu de choix au debut pour obtenir un resultat satisfaisant; affiner ensuite (aligne avec "premier succes rapide").

**Synthese strategique (penetration marche):**

- La **penetration** (volume d'usage) depend autant de la **distribution** (partenaires, canaux, moment de vie) que du produit seul.
- Maximiser l'adoption ne veut pas dire empiler des fonctionnalites: une combinaison **parcours sobre sous stress emotionnel** + **confiance** + **acces par des tiers de confiance** est souvent plus efficace qu'une liste longue d'options.
- Les **budgets** et la sensibilite au contexte culturel varient: la roadmap doit rester **testable** (hypotheses validees par donnees funnel et entretiens).

#### Croissance "virale" et partage (ethique & product — doc uniquement)

**Portee:** piste de reflexion pour la diffusion organique — **aucune implementation n'est engagee**; le contexte (deuil, hommage, intimite) **interdit** les tactiques agressives type "growth hack" insensible.

**Definition pratique du "viral" ici:** ce n'est pas une courbe exponentielle de type reseau social, mais une **diffusion par recommandation et partage authentique** apres une experience reussie: proches, invites, partenaires (funeraires, soignants, traiteurs) qui decouvrent une qualite memorable au bon moment.

**Boucles organiques plausibles:**

1. **Sortie remarquable:** une video ou un montage si fort emotionnellement que la famille **choisit** de la diffuser (ceremonie, reunion privee, QR programme papier) — le produit devient sa propre pub si la qualite suit le positionnement haut de gamme.
2. **Lien de visionnage digne:** page ou lien **respectueux** (pas de pub intrusive sur la video sensible), options **prive / liste restreinte / avec consentement familial**, meta OG sobres si partage public autorise expressement.
3. **Parrainage mesure:** credits ou avantages pour un **prochain** projet hommage — formulation discrete ("offrir a une autre famille") plutot que gamification criarde.
4. **Canal partenaire = levier viral controle:** le partenaire presente Odyssey comme **service recommande** au moment critique — la "viralite" est alors **pilotee et contextualisee**, pas virale au sens TikTok.
5. **Preuve douce:** avec consentement ecrit, **extraits** ou temoignages sur le site marketing — jamais sans validation famille/partenaire.

**Pieges a eviter (non negociable produit):**

- Sollicitations partage / parrainage au milieu du **parcours de creation** sous stress.
- Publication automatique sur reseaux sans **double confirmation** et comprehension des droits image.
- Watermarks voyants ou branding qui **degrade** un hommage payant (discuter en upsell "sans logo" vs inclus selon positionnement marque).

**Indicateurs (a definir en analytics sans exposer donnees personnelles):**

- Taux de generation de **lien de partage** active par rapport aux projets livres.
- **Referrals** attribues (codes partenaires / campagne Stripe).
- Part des projets **issus d'un partenaire** vs organique.

#### Co-creation invitee (hommage collectif — doc uniquement)

**Pourquoi ca peut amplifier la diffusion, sans etre agressif:**

- chaque personne invitee entre dans l'univers du projet et devient **porteur naturel du recit** ;
- la famille principale garde le **controle** (validation avant inclusion dans le film ou dans une sequence dediee) ;
- cela cree une **raison sociale** de parler d'Odyssey a plusieurs personnes au **bon moment**, avec une charge emotionnelle **positive** (hommage collectif), pas avec des popups « parrainez ».

**Techniquement:** au depart ce n'est qu'une **couche produit** (liens invites, quota, moderation, consentement) — **pas** une nouvelle chaine de rendu complete; le branchement timeline/template peut arriver en phase 2.

**Etapes et a faire rapidement (ordre propose — discovery puis MVP):**

| Etape | Action |
|-------|--------|
| **1. Cadrage produit** | Definir quota invites (ex. 3–8), format contribution (1 photo + texte court), duree de validite du lien, niveaux de visibilite (prive / famille etendue). |
| **2. Consentement & legal light** | Textes clairs pour invites et createur (droits image, usage dans le film); trace horodatee en base liee au `project_id`. |
| **3. Flux invite** | Lien securise (token signe / lien magique); arbitrage **compte obligatoire vs invite sans compte** selon risque abus et RGPD. |
| **4. Moderation createur** | Statuts type `pending` / `approved` / `rejected`; notifications discretes (email) sans harceler. |
| **5. Stockage contributions** | Bucket ou prefix dedie par projet; alignement RLS / isolation (voir section 12). |
| **6. Rendu (phase 2)** | Injection des segments approuves dans le job Creatomate (ou equivalent) ou sequence « credits hommage » — peut suivre un MVP ou les contributions restent visibles dans le wizard uniquement. |
| **7. Mesure** | Taux d'invitations envoyees, taux de completion invite, taux d'approbation — sans exposer contenu sensible dans les analytics tiers. |

**Leviers supplementaires (meme ethique — doc uniquement):**

- **Derive "reseaux natifs":** export ou rendu **court vertical** (Stories / Reels) en complement du master — souvent ce qui est partage publiquement; le long format reste plus intime.
- **Objet physique du rituel:** QR sur livret, urne animaliere, carte de remerciement clinique — viralite **dans la piece** (meme logique que programme funeraire humain).
- **Premiere "famille / meute":** lien prive court avant tout partage large — bouche-a-oreille controle parmi le cercle intime.

#### Croissance virale — verticaliste animaux (cible specifique — doc uniquement)

**Contexte:** la perte d'un animal est intime mais les proprietaires partagent souvent **plus volontiers** du contenu animalier sur les reseaux (avec nuances culturelles). La viralite doit rester **respectueuse** (pas exploiter la douleur; pas comparer a un deces humain dans la communication).

**Partenaires B2B2C adaptes:**

- Cliniques veterinaires, urgences vet, crematoriums animaliers, salons de toilettage, boutiques specialistes, comportementalistes, assurances animaux.
- Refuges / associations: **hommages pour adoption memorielle** ou campagnes de sensibilisation — boucle de notoriete positive si le ton reste digne.

**Formats et lieux de diffusion:**

- **Templates et tonalite** dedies (paws, moments quotidiens, sillons de promenade) sans infantiliser la douleur.
- **Clip court vertical** tres efficace pour cette cible (habitudes de partage photo/video d'animaux).
- **QR** sur urne, plaquette memorial, carte remerciement vet — toucher les proches presents au moment du recueillement ou du dernier rendez-vous.

**Communautes (avec menagement):**

- Groupes de soutien / memoire animaliere en ligne — presence **utile** (guides, ressources) plutot que pub intrusive.
- Hashtags commemoratifs **optionnels** et controle par la famille (jamais imposes).

**Idees produit "douces" propres aux animaux:**

- **Album invite:** meme principe co-creation (amis du parc, famille) avec moderation.
- **Calendrier souvenir** (upsell physique ou numerique) — partage saisonnier naturel.
- **Lien don symbolique** vers refuge ou cause animale choisie par la famille — partage altruiste.

**Pieges specifiques animaux:**

- Eviter memes / ton **inapproprie** sur la mort d'un compagnon.
- Respect des **droits image** si photos tierces (autres proprietaires au parc).

**Backlog discovery supplementaire (verticaliste animaux — a prioriser par tests terrain):**

1. **Photographes animaliers & pet sitters:** partenariats referral ou pack **shooting + video Odyssey** — reseau client existant et assets deja emotionnels.
2. **Clubs de race / rescue specialises:** bouche-a-oreille de niche; presence **utile** (guides, temoignages autorises) plutot que pub groupe sauvage.
3. **Saisonnalite douce:** journees internationales chat/chien ou mois sensibilisation perte — editions template limitees **non exploitantes**, ton digne.
4. **Marques premium animalieres:** pack condoléances dans colis VIP (carte + QR discret) — viralite par **experience produit recue**, pas par harcelement marketing.
5. **Educateurs canins / comportementalistes:** souvent presents fin de vie / separation; **kit partenaire** (phrase + lien) au moment pertinent.
6. **Hommage « double famille »:** adoption refuge — mention du refuge **avec accord** familial + refuge; incitation au **relai propre** par l'association.

### Wizard upsells (product) — partially implemented

**Implemented (step 6 — `MontageExtensionsStep`):**
- AI retouch, **Option Licence Premium** (`extendedLicense`, 39 $), collector USB, digital vault, Heritage Pack (cents in `pricingConfig.ts`, cart via `wizardPricing.ts`). Heritage forfait bundles licence + USB + coffre (no extra charge).
- State in `wizard_state.extensions`; cents from `pricingConfig`; sent via `POST /api/checkout` (B2C Stripe or B2B token flow).

**Still to align with Stripe-First principles:**
- Load sellable options from **`billing_catalog`** (Stripe Price IDs + `odyssey_code` metadata), not hardcoded cents only.
- Timestamped legal acceptances (YouTube / third-party imports, music license) on `project_id`.
- Additional packaging (HD, rush, extra copies) as catalog lines when product defines them.

**Music (step 5):** licensed search via **Stingray MAPI** (see [`docs/STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md)) — not the legacy mood-based “Musical Ambiance” picker.

### A developper - Securite et resilience (objectif maximal, pas de promesse absolue)

**Portee:** ce bloc documente **uniquement** la roadmap et l'ordre de priorite — **aucune implementation n'est engagee ni commencee par ce document.**

**Constat honnete:** aucun systeme connecte n'est mathematiquement **impénétrable**. L'objectif produit est une posture **defense en profondeur**: reduire la surface d'attaque, limiter l'impact d'un incident, detecter et reagir vite.

**Principe directeur:** les attaquants ciblent surtout **sessions**, **donnees d'autres utilisateurs**, **paiements**, **uploads**, **webhooks**, **secrets**. La defense repose sur **couches cumulees**: auth + RLS + autorisation serveur + validation + limitation d'abus + secrets + observabilite.

#### Ordre de priorite — P0 (essentiel / bloquant pour une prod serieuse)

Ces points sont les **fondations**; sans eux, le risque jurisprudentiel et technique reste eleve.

1. **RLS Supabase** sur toutes les tables exposees aux utilisateurs (`projects`, `media_assets`, `orders`, etc.) avec policies basees sur **`auth.uid()`** et **propriete du projet** (pas seulement "utilisateur connecte").
2. **Autorisation serveur** sur chaque Route Handler / Server Action: le serveur verifie que le `project_id` (et tenant si applicable) **appartient** a l'utilisateur ou au partenaire autorise — le front ne fait pas foi.
3. **Paiements Stripe**: webhook **uniquement** avec signature verifiee; **aucun** montant ou ligne de panier entierement forge cote client sans reconciliation avec **`billing_catalog`** / Stripe.
4. **Secrets**: cle **service role** Supabase et **Stripe secret** uniquement cote serveur et dans les env deploy (Vercel); jamais dans le bundle client ni dans Git.
5. **Stockage medias**: politiques Storage alignees sur **projet / utilisateur / tenant**; eviter un bucket trop ouvert en lecture publique pour du contenu sensible.

#### Ordre de priorite — P1 (fort gain / effort raisonnable, apres P0)

6. **Validation des entrees** sur toutes les APIs (schemas type Zod): IDs, URLs tierces (YouTube), metadonnees wizard.
7. **Rate limiting** sur endpoints sensibles (login, sessions, uploads massifs, checkout, endpoints de test hors prod).
8. **Headers HTTP** (`Strict-Transport-Security`, `Content-Security-Policy` progressive, anti-clickjacking) via `next.config` / middleware — en evitant de casser Supabase/Stripe en prod.
9. **Journalisation** structuree des evenements sensibles (echecs auth, refus d'acces, erreurs webhook) **sans** corps de fichiers ni secrets dans les logs.
10. **Dependances**: `npm audit`, Dependabot ou equivalent, politique de patchs critiques pour Next/React et libs auth.

#### Ordre de priorite — P2 (durcissement continu / maturite)

11. **MFA** pour comptes admin / studio internes (roadmap; pas forcement tous les clients au jour 1).
12. **Pentest** ponctuel ou **bug bounty** cible avant forte exposition commerciale ou volume.
13. **Plan d'incident**: rotation des cles, revocation tokens, communication interne, procedure de gel tenant/partenaire.

#### Reference transversale par domaine (meme contenu, vue thematique)

| Domaine | Lien prioritaire |
|---------|------------------|
| Identite et session | P0 (RLS + auth serveur); P2 MFA |
| Base et acces donnees | P0 RLS + service role isole webhooks/jobs |
| Stockage medias | P0 Storage policies |
| API Next.js | P0 autorisation; P1 validation |
| Limitation d'abus | P1 rate limiting |
| Paiements Stripe | P0 webhook + catalogue |
| Navigateur et transport | P1 headers |
| Secrets et configuration | P0 secrets |
| Dependances | P1 supply chain |
| Observabilite et reponse | P1 logs; P2 playbook |
| Verification externe | P2 pentest / OWASP ASVS cible |

### A developper - Elevation produit et confiance (roadmap)

**Portee:** uniquement preparation et priorisation pour les prochaines etapes — **aucune implementation n'est engagee par ce document.**

Objectif: completer la roadmap technique (checkout, rendu, securite) par les chantiers qui augmentent le plus la **valeur percue**, la **confiance**, et la **scalabilite** partenaire.

#### Priorite P1 — Fiabilite et experience utilisateur (fort impact / fondations emotionnelles)

1. **Statuts projet lisibles** tout au long du parcours (upload, paiement, file d'attente rendu, livraison) avec libelles humains.
2. **Notifications** aux jalons critiques (echec upload, paiement confirme, video prete, erreur rendu) — email minimum, SMS ulterieur si pertinent.
3. **Reprise de parcours** sans tout recommencer — **wizard state: done (P3 autosave)**; upload partial retry still to harden.
4. **Engagement sur les delais** (fourchette ou SLA honnete selon charge / type de rendu).

#### Priorite P1 — Qualite du rendu video (coeur de la promesse)

5. **Previsualisation / validation narrative** avant rendu final — **partial: step 7 `CinematicTeaser`** (not final render).
6. **Templates limites mais exemplaires** plutot que volume d'options faibles (qualite percue > nombre de boutons).
7. **Controles legers**: ordre des clips, titre, sous-titres optionnels — sans transformer en suite de montage pro.

#### Priorite P1 — Conformite et reputation (medias tiers)

8. **Journal des consentements** (YouTube, droits image, musique) horodatable et exportable si besoin.
9. **Politique de retention / RGPD**: duree des medias, telechargement, suppression — alignee produit + technique.

#### Priorite P2 — Partenaires et diffusion (B2B2C)

10. **Espace partenaire minimal**: jetons, projets, statut — meme MVP tableau / CSV.
11. **White-label leger**: logo / emails famille depuis branding partenaire (sans refonte totale au debut).
12. **Metriques simples**: conversion wizard, upsells, volumes — pour ajuster l'offre.

#### Priorite P2 — Observabilite produit et differentiation premium

13. **Instrumentation funnel**: ou abandonne-t-on (wizard, checkout, rendu) — complementaire aux logs techniques.
14. **Feature flags** pour activer verticale ou upsell sans deploy lourd.
15. **Differentiation premium ulterieure**: lien partage securise, telechargement HD, QR ceremonie; option future "review humaine" monteur.

#### Ordre suggere (apres la roadmap technique deja listee en section 10)

1. Statuts + notifications + reprise parcours (**P1 UX**).
2. Preview / validation narrative avant rendu final (**P1 rendu**).
3. Journal consentements + retention (**P1 conformite**).
4. Funnel produit + espace partenaire minimal (**P2 croissance**).

---

## 10b) Migrations SQL -- ordre d'execution

Le dossier `docs/sql/` est la **source de verite** des migrations. Voir `docs/sql/README.md` pour le tableau complet. Sur une base vierge:

1. `odyssey_p0_complete.sql` -- RLS de base, orders, grants service_role
2. `odyssey_p0_fix_grants.sql` -- patch grants si P0 a plante en cours
3. `odyssey_p1_user_bootstrap.sql` -- multi-tenant + trigger `handle_new_user`
4. `odyssey_p2_media_assets_schema_sync.sql` -- alignement schema `media_assets`
5. `odyssey_p2b_media_assets_cleanup.sql` -- patch cible (supprime `user_id` en doublon si present)
6. `odyssey_p3_wizard_autosave.sql` -- autosave wizard (`wizard_state`, `wizard_step`, `last_saved_at`)
7. `odyssey_p4_partner_token_wallets.sql` -- portefeuilles jetons partenaires B2B (wallet + ledger)
8. `odyssey_p4_1_security_fixes.sql` -- **patch** RLS partner roles + index ledger `project_id`
9. `odyssey_p5_b2b2c_core.sql` -- invitations, tribute_checkouts, RPC debit atomique
10. `odyssey_p5_1` through `odyssey_p5_5` -- branding, tenants RPC, RBAC, overdraft (see [`sql/README.md`](sql/README.md))
11. **`odyssey_p6_freemium_revshare.sql`** -- **Phase A (T1)** : Partie A commerce (freemium, commission ledger, RPC accrue, legendary) + **Partie B stubs Phase 2** (consent_records, project_access_tokens, scan_sessions, guest_micro_checkouts, family_tribute_fund_*, lifecycle_status, persons/person_faces, media contributor columns)
12. ~~**`odyssey_p6_1_scan_sessions.sql`**~~ -- absorbé dans P6 Partie B
— `odyssey_p0_storage_policies_REFERENCE.sql` -- **via Dashboard uniquement** (pas SQL Editor)
— `odyssey_p4_partner_token_qa_seed.sql` -- **seed QA** (apres P4, non prod)

Toutes ces migrations sont **idempotentes** et utilisent `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / `DROP ... IF EXISTS`. Re-executer sans crainte.

---

## 11) Vision produit extensible (multi-skins, moteur unique)

La direction produit inclut explicitement une strategie de reutilisation:
- conserver **un moteur metier unique** (auth, ingestion media, paiement, orchestration rendu),
- exposer **plusieurs experiences visuelles (skins)** selon la cible,
- adapter le wording, le branding, et certains parcours sans dupliquer la logique coeur.

Exemple cible de diversification:
- segment "hommages pour animaux" avec UX, ton editorial et assets dedies,
- tout en re-utilisant le pipeline technique existant (wizard, uploads, Stripe, webhook, rendu).

Implications techniques:
- separer strictement la couche "theme/branding/copy" de la couche "business logic",
- parametrer les variantes par configuration (dictionnaires, flags, catalog produit, templates),
- eviter le fork de code pour garder vitesse de delivery et maintenance faible.

---

## 12) Isolation des medias entre cibles

**Etat actuel (MVP)**:
- Isolation forte via `project_id` (chemin Storage + colonne FK).
- `tenant_id` desormais **obligatoire (NOT NULL)** sur `media_assets` et resolu cote serveur via `tenant_members` -- un user ne peut pas ecrire dans le tenant d'un autre.
- `owner_user_id` (NOT NULL) garantit qu'on peut tracer le proprietaire historique meme si le projet est partage plus tard.

**A durcir avant ouverture multi-vertical**:
1. Chemin Storage a enrichir: `targets/<vertical>/tenants/<tenant_id>/projects/<project_id>/...` (actuellement juste `projects/<project_id>/...`).
2. Policy Storage a etendre pour verifier le segment `<vertical>` contre `tenant_members.tenant.vertical`.
3. Tests d'integration "anti-mixage": importer simultanement depuis 2 users de verticales differentes et verifier l'isolation au niveau API et Storage.
4. Vue `media_assets_isolated` qui joint avec `tenants.vertical` pour aider les requetes d'audit cross-cibles.

---

## 13) Recommended team rules

- Always run `npm run build` before merge.
- Any webhook write must stay idempotent and conditional.
- Sensitive DB operations on the server must use the appropriate admin client.
- Do not change lock/TTL logic without architecture review.
- Keep separation: UI (presentation), headless adapters/hooks (orchestration), services (network/DB I/O).
- **After any change to wizard steps, deliverables/packages, pricing, checkout, invitations, or `/api/music/*` routes, update §4.7 and §10 in this file and the relevant annex (`DELIVERABLES_AND_PACKAGES.md` / `B2B2C_COMMERCE.md` / `WIZARD_ARCHITECTURE.md` / `STINGRAY_MUSIC_INTEGRATION.md` / `sql/README.md` / `wizardDeliverables.ts` / `pricingConfig.ts`).**

---

## 14) Important notes

- Root `README.md` gives the quickstart and high-level vision; **implementation detail** for the wizard and music stack lives in §4.7, §10, and the annexes linked at the top.
- Subsections under **§10 “Product roadmap”** are strategy-only until explicitly moved to “Done”.
- **Last code review: June 2026** — if code and doc diverge, trust the annexes and `TributeWizard.tsx` (`TOTAL_STEPS = 8`).

