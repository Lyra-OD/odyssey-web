# Odyssey — Scanner Compagnon (Killer App)

**Type :** canon · **Vérité pour :** spec scanner. Phase A+B (QR, galerie, aperçu IA → `aiRetouch`) 🟡 · job IA serveur ⏳ — ne pas montrer comme Killer App livrée.  
**Dernière MAJ :** 17 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 17 août 2026 — Phase B : aperçu Avant/Après + CTA add-on `aiRetouch` / Éternité. Recadrage inset (pas OpenCV). Pas de job IA serveur.
- 17 août 2026 — Phase A : QR étape 3 · `/scan/[token]` galerie/caméra · `source=scanner_companion` · poll grille. HEIC accepté (iPhone).
- 17 août 2026 — en-tête type + carte.
- juillet 2026 — spec B2B2C v2 + stubs P6.

Document canonique pour le **Scanner Compagnon Web** : ingestion mobile de photos papier via QR Code, restauration IA en temps réel, et pont de conversion vers les forfaits **Éternité (349 $)** et **Légendaire / Gants Blancs (499 $)**.

Complète [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) · [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) · [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md).

---

## Vision produit

Le Scanner Compagnon est la **Killer App** qui différencie Odyssey des outils obsolètes (ex. Scrypta) :

- Le conseiller ou la famille travaille sur **desktop** dans le wizard Studio.
- Les **vieilles photos papier** sont numérisées via le **téléphone** (sans app native).
- **Phase 1 (juin 2026) — Scanner async :** les **invités** contribuent aussi **avant / après la cérémonie** et **à distance** (diaspora) — voir [`VISION_PHASE_2.md`](VISION_PHASE_2.md) §2.1.
- L’**IA de restauration** produit un aperçu **Avant/Après** immédiat — preuve de valeur tangible.
- L’upsell vers **Éternité** ou **Légendaire** devient **émotionnellement évident**.

> **Important — séparation des tokens :** le **QR live wizard** utilise `scan_sessions` (session courte), tandis que la contribution async invités / diaspora visée par la vision produit passera par `project_access_tokens` (liens longue durée) — tous deux déjà stubés dans `odyssey_p6_freemium_revshare.sql`.

```text
Desktop Wizard  ←—— temps réel ——→  Mobile Scanner (PWA web)
       ↓                                    ↓
  Grille médias projet              Détection papier + recadrage
       ↓                                    ↓
  Avant/Après IA (upsell gate)      Upload Supabase Storage
       ↓
  Checkout Éternité 349 $  ou  Légendaire 499 $
```

---

## Périmètre & activation par forfait

| Forfait | Scanner QR | Restauration IA complète | Pont upsell |
|---------|------------|--------------------------|-------------|
| **Souvenir** (B2B2C offert) | **Démo limitée** (1–2 previews floutées) | Non | Vers Éternité / Légendaire |
| **Héritage** | Démo limitée | Non | Vers Éternité / Légendaire |
| **Éternité** | **Complet** | **Oui** | — (tier cible) |
| **Légendaire** (B2C) | **Complet** | **Oui** | — (tier ancre) |

> En **B2C direct Quiet Luxury**, le Scanner est le **levier de conversion** vers Éternité (choix privilégié) ou Légendaire (ancre suprême).

---

## Flux UX (famille / conseiller)

### Acte 1 — Desktop : génération QR

| Étape | Surface | Comportement |
|-------|---------|--------------|
| 1 | Wizard **étape médias** (desktop) | Bandeau « Numérisez vos albums avec votre téléphone » |
| 1bis | Draft pas prêt | `ScannerCompanionPlaceholder` — même chrome, pas de QR |
| 2 | `ScannerCompanionPanel` | **Phase A** — QR + copie du lien (TTL 2 h, cache `sessionStorage`) |
| 3 | Instructions | « Scannez avec l’appareil photo · aucune installation requise » |
| 4 | État live | Phase C — heartbeat « Téléphone connecté » ⏳. Phase A : poll grille 5 s |

### Acte 2 — Mobile : session web légère

| Étape | Surface | Comportement |
|-------|---------|--------------|
| 1 | Scan QR | Ouvre URL `https://{site}/[lang]/scan/{sessionToken}` |
| 2 | **PWA web** (pas d’app store) | Phase A : page web mobile (pas encore `manifest.json`) |
| 3 | Capture | **Phase A** — caméra (`capture=environment`) **ou** galerie. Recadrage perspective = Phase B |
| 4 | **Détection document** | Phase B ⏳ — fallback : photo telle quelle |
| 5 | Confirmation | « Photo ajoutée ✓ » · capture suivante |
| 6 | Feedback | Liste d’envois sur la page mobile |

### Acte 3 — Desktop : sync temps réel

| Étape | Surface | Comportement |
|-------|---------|--------------|
| 1 | Grille médias wizard | Nouvelle vignette **sans refresh manuel** (poll 5 s, Phase A) |
| 2 | Badge | « Via Scanner » sur la vignette |
| 3 | Pipeline | Thumbs / proxy = pipeline existant. Job restauration IA = Phase B |

### Acte 4 — Avant/Après IA (upsell)

| Étape | Surface | Comportement |
|-------|---------|--------------|
| 1 | `RestorationPreviewModal` | Slider **Avant / Après** sur la photo scanner (aperçu CSS) |
| 2 | Gate | Complet si **Éternité+** (inclus) ou add-on **`aiRetouch`** · sinon watermark + flou après 3 s |
| 3 | CTA primaire | **Ajouter la restauration IA** — add-on checkout [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) §2 (`aiRetouch`) |
| 4 | CTA secondaire | Passer à **Éternité** (IA incluse) |

### Acte 5 — Légendaire Gants Blancs (B2C)

Si l’utilisateur choisit **Légendaire** :

- Message : « Nous vous envoyons une **boîte pré-affranchie** pour vos albums restants »
- Workflow ops post-checkout (hors Scanner) — voir [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) § Légendaire

---

## Architecture technique

### Vue d’ensemble

```mermaid
flowchart TB
  subgraph Desktop["Studio Desktop (Wizard)"]
    W[TributeWizard — étape médias]
    QR[ScannerCompanionPanel — QR]
    G[Grille médias + Realtime]
    AA[RestorationPreviewModal]
  end

  subgraph Mobile["Mobile Web (PWA)"]
    S["/scan/{sessionToken}"]
    CAM[Camera + Crop UI]
  end

  subgraph API["Next.js API"]
    CREATE[POST /api/scan/sessions]
    UPLOAD[POST /api/scan/sessions/:id/upload]
    RESTORE[POST /api/ai/restoration/preview]
  end

  subgraph Backend["Supabase"]
    SS[(scan_sessions)]
    ST[(Storage project-media)]
    PM[(media_assets)]
    RT[Realtime channel]
  end

  W --> CREATE --> SS
  CREATE --> QR
  S --> CAM --> UPLOAD --> ST --> PM
  PM --> RT --> G
  G --> RESTORE --> AA
  AA --> Checkout[POST /api/checkout]
```

---

### Tables (P6 stub / cible Scanner)

#### `scan_sessions`

| Colonne | Rôle |
|---------|------|
| `id` | uuid PK |
| `project_id` | FK → hommage |
| `token_hash` | Hash du token URL (jamais en clair en DB) |
| `created_by_user_id` | Owner desktop |
| `project_access_token_id` | Lien éventuel vers token async plus long |
| `status` | `active` \| `expired` \| `revoked` \| `completed` |
| `expires_at` | TTL QR live par défaut **2 h** |
| `upload_count` | Compteur uploads session |

**Index :** UNIQUE `(token_hash)` · INDEX `(project_id, status)`.

#### `media_assets` (existant — extension)

| Colonne | Rôle |
|---------|------|
| `source` | `'local'` \| `'scanner_companion'` |
| `scan_session_id` | FK nullable |
| `restoration_status` | `none` \| `pending` \| `completed` \| `failed` |
| `restoration_preview_path` | Storage path preview IA |

---

### Routes API (cible)

| Route | Auth | Rôle |
|-------|------|------|
| `POST /api/scan/sessions` | Titulaire ou Co-Créateur | Crée session · retourne `scanUrl` + token |
| `GET /api/scan/sessions/:token` | Token session | Valide TTL · nom d’hommage minimal |
| `POST /api/scan/sessions/:token/upload` | Token session | Multipart image → Storage + `media_assets` |
| `POST /api/ai/restoration/preview` | Owner projet | ⏳ job serveur — aperçu actuel = client |
| `GET /api/scan/sessions/:id/events` | Owner projet | Phase C ⏳ — poll grille projet à la place |

**Sécurité session mobile :**

- Token **opaque** 128-bit · TTL QR live **2 h** · **1 projet** par session
- Contribution async invités : via `project_access_tokens` longue durée (stub P6, logique métier séparée)
- Rate limit upload : max **30 photos / session** (session = 2 h)
- Validation MIME : `image/jpeg`, `image/png`, `image/webp`, **plus HEIC/HEIF** (galerie iPhone)
- Taille max : **12 Mo** par photo (mobile)

---

### Routes UI (cible)

| Route | Rôle |
|-------|------|
| `/[lang]/studio/...` wizard | `ScannerCompanionPanel` intégré étape médias |
| `/[lang]/scan/[token]` | **Mobile PWA** — capture + crop + upload |
| `/[lang]/scan/[token]/done` | Confirmation · « Retournez à votre ordinateur » |

**PWA mobile :** `manifest.json` minimal · icône Odyssey · `display: standalone` · pas de publication App Store Phase 1.

---

### Détection & recadrage papier

| Couche | Technologie cible | Fallback |
|--------|-------------------|----------|
| **Client mobile** | **Phase B** : cadre visuel + **inset 8 %** canvas (pas OpenCV) | Photo telle quelle si HEIC / échec canvas |
| **Serveur** | Validation MIME / taille (Phase A) | — |

**Pipeline image :**

```text
Capture caméra
  → Recadrage perspective (client)
  → Upload JPEG/WebP
  → Storage: projects/{id}/media/{uuid}-original.jpg
  → Thumb WebP (policy egress existante)
  → Proxy 1080p (pipeline standard)
  → Queue restauration IA (si tier Éternité/Légendaire ou preview upsell)
```

Alignement egress : [`PROJECT_STATUS.md`](PROJECT_STATUS.md) §4.1 (thumbs WebP, cache session).

---

### Restauration IA — Avant/Après

| Mode | Comportement |
|------|--------------|
| **Preview upsell** (Souvenir / Héritage sans add-on) | Aperçu **client** (filtres) · watermark Odyssey · flou après 3 s |
| **Débloqué** | Éternité / Légendaire **ou** add-on `aiRetouch` (checkout existant) · slider sans restriction |
| **Job IA serveur** | ⏳ pas encore — l’aperçu n’est **pas** la restauration finale livrée |

**Composant UI :** `RestorationPreviewModal.tsx`

- Props : `src`, `canFullPreview`, CTA add-on / Éternité
- CTA primaire : **`aiRetouch`** (grille add-ons — ne pas recopier le prix ici)
- CTA secondaire : forfait **Éternité** (`heritage`) si pas déjà Éternité+

---

### Sync temps réel desktop ← mobile

**Option A (recommandée Phase 1) :** Supabase **Realtime** sur `media_assets` INSERT filtré par `project_id`.

**Option B :** Polling `GET /api/projects/:id/media` toutes les 3 s tant que session active.

**Option C :** SSE via `/api/scan/sessions/:id/events`.

Le desktop **ne doit pas** require un refresh manuel après upload mobile.

---

## Pont checkout (conversion)

### Règles métier

| Origine | Package pré-sélectionné | Montant |
|---------|-------------------------|---------|
| CTA « Éternité » depuis Scanner | `heritage` | 34 900¢ (349 $) + extensions |
| CTA « Légendaire » depuis Scanner | `legendary` | 49 900¢ (499 $) + extensions |
| Canal B2B2C freemium (invitation) | `heritage` ou `signature` | Prix upsell partenaire — voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) |
| B2C direct Quiet Luxury | `heritage` recommandé · `legendary` ancre | Pas de Souvenir |

**Tracking conversion (metadata) :**

```json
{
  "conversion_source": "scanner_companion",
  "scan_session_id": "uuid",
  "media_id": "uuid"
}
```

Stocké sur `tribute_checkouts.metadata` et Stripe Session metadata pour analytics.

---

## Limites & quotas (alignement forfait)

| Forfait | Uploads Scanner | Chansons max | Restauration IA |
|---------|-----------------|--------------|-----------------|
| Souvenir | Compte dans **50 médias max** | **2** | Preview upsell only |
| Héritage | Compte dans **125 médias max** | **4** | Preview upsell only |
| Éternité | Compte dans **175 médias max** | **5** | Complet |
| Légendaire | Compte dans **250 médias max** | **7** | Complet |

Gate serveur : `POST /api/scan/sessions/:token/upload` vérifie `count(media_assets) < maxMediaItems` du tier effectif.

**Règle de pacing (manifest product):**

```text
recommendedMediaCapacity = floor(durationSec / targetSecondsPerMedia)
```

Exemple avec `targetSecondsPerMedia = 6` :

- chanson 120 s -> ~20 médias recommandés
- chanson 180 s -> ~30 médias recommandés
- chanson 240 s -> ~40 médias recommandés

Le Scanner n’enforce pas cette règle lui-même ; il alimente simplement le volume de médias. Le Wizard Storyboard et la validation pacing calculeront ensuite la cohérence `médias ↔ chansons` à partir de la **durée réelle** de chaque piste (`durationSec`) et de la cible temporelle (`targetSecondsPerMedia`).

---

## Sécurité & confidentialité

| Risque | Mitigation |
|--------|------------|
| Token session leak | TTL court · hash en DB · révocation à la fermeture wizard |
| Upload non autorisé | Token lié à **1 seul** `project_id` |
| Caméra refusée | Fallback « Import depuis galerie » mobile |
| Données sensibles (décès) | RLS `media_assets` · Storage policies existantes |
| ABUSE / spam uploads | Rate limit IP + session |

---

## Dépendances produit existantes

| Composant | Statut | Lien |
|-----------|--------|------|
| Upload médias wizard | ✅ | `app/api/projects/...` |
| Thumbs WebP egress | ✅ | `StoragePreviewImage`, policy egress |
| Wizard étape médias | ✅ | `TributeWizard` step 4 |
| Restauration IA pipeline | ⏳ | Aperçu UI ✅ · job serveur TBD |
| Checkout saga v2 | ⏳ | [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) |
| Forfait `legendary` | ⏳ | [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) |

---

## Plan d’implémentation (phases)

### Phase A — MVP Scanner (QR + galerie)

- [x] `POST /api/scan/sessions` + table `scan_sessions` (P6 B5 / filet [`odyssey_p12_scan_sessions_ensure.sql`](sql/odyssey_p12_scan_sessions_ensure.sql))
- [x] Page mobile `/scan/[token]` · caméra + galerie (sans crop IA)
- [x] QR panel desktop · polling médias (5 s)
- [x] `source = scanner_companion` sur `media_assets`

### Phase B — Pont retouche (add-on existant)

- [x] Recadrage papier client (inset, pas détection 4 coins)
- [x] Preview restauration + `RestorationPreviewModal` (aperçu CSS, pas job serveur)
- [x] Gate upsell · CTA **`aiRetouch`** / Éternité
- [ ] Metadata `conversion_source` Stripe (déjà `ai_retouch` sur la session)

### Phase C — Polish

- [ ] PWA manifest mobile
- [ ] Heartbeat « téléphone connecté »
- [ ] Quotas photos par tier
- [ ] Analytics funnel Scanner → checkout

---

## Fichiers code (cartographie cible)

| Fichier | Action |
|---------|--------|
| `src/components/scanner/ScannerCompanionPlaceholder.tsx` | Draft coffre pas prêt |
| `src/components/scanner/ScannerCompanionPanel.tsx` | **Phase A** — QR + lien |
| `src/components/scanner/ScannerCaptureClient.tsx` | **Phase A** — caméra / galerie |
| `src/components/scanner/RestorationPreviewModal.tsx` | **Phase B** — Avant/Après + CTA `aiRetouch` |
| `src/lib/scanner/cropPaperInset.ts` | Recadrage inset mobile |
| `app/[lang]/scan/[token]/page.tsx` | **Phase A** |
| `app/api/scan/sessions/route.ts` | **Phase A** |
| `app/api/scan/sessions/[token]/upload/route.ts` | **Phase A** |
| `src/lib/scanner/scanSessionToken.ts` | Hash SHA-256 |
| `docs/sql/odyssey_p12_scan_sessions_ensure.sql` | Filet table si P6 B5 absent |

> **Cascade V-Final (✅ livré) :** le volet **contribution invité async** (Support Packs → Fonds
> Commémoratif) est déjà câblé, distinct du Scanner QR : tokens opaques
> `src/lib/contribute/contributeToken.ts` + `accessToken.ts`, routes `GET/POST /api/contribute/[token]`
> et `POST /api/projects/[id]/contribute-link` (voir [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) §
> Boucle Virale). Le Scanner QR Phase A (upload photo mobile) est câblé ; recadrage papier + IA = Phase B.

`docs/sql/odyssey_p6_freemium_revshare.sql` — `scan_sessions` en Partie B (création d’origine).

---

## Documents liés

| Document | Rôle |
|----------|------|
| [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) | Forfaits, Légendaire Gants Blancs |
| [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) | Checkout, pricing upsell |
| [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) | Commission sur upsell partenaire |
| [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) | Étape médias wizard |

---

## Quand modifier ce document

Toute évolution du flux QR, mobile PWA, IA preview, upsell, ou schéma `scan_sessions` → mettre à jour **ce fichier**, [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md), et [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md).
