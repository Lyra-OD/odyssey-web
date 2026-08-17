# Odyssey — Routes applicatives & authentification

**Type :** canon · **Vérité pour :** URLs, connexions Studio/Salon, `appRoutes.ts`.  
**Dernière MAJ :** 17 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 17 août 2026 — `POST /api/hq/tenants/[id]/payout` + liste salons (RPC P14).
- 17 août 2026 — `GET /api/hq/overview` : KPI réseau macro (allowlist + service_role).
- 17 août 2026 — `/hq` : table `hq_allowlist` (P13), middleware + layout.
- 17 août 2026 — `POST /api/partner/invitations/[id]/follow-up` (relance e-mail conseiller).
- 17 août 2026 — `/salon/mes-performances` + `GET /api/partner/my-performance` (scoreboard conseiller).
- 17 août 2026 — invitation Salon Souvenir-only (plus de picker).
- 17 août 2026 — `/salon/commissions` + API ; `next` login conserve le chemin Salon ; `/facturation` redirige.

Document canonique pour les **URLs**, les **trois pages de connexion** (famille, partenaire, HQ Odyssey), les **redirects legacy**, et le **branding Salon** (gant blanc). Source de vérité code : `src/lib/appRoutes.ts`.

Complète [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md) § Routes / env et [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md).

---

## Carte des routes (état actuel)

| Zone | URL | Auth | Rôle |
|------|-----|------|------|
| **Studio** (famille) | `/[lang]/studio` | Oui (ou cookie editor) | Wizard hommage **7** étapes — B2C / B2B2C / Co-Créateur |
| **Studio connexion** | `/[lang]/studio/connexion` | Non | Login + **inscription** famille |
| **Salon** (funérarium) | `/[lang]/salon` | Oui | Console partenaire — invitations Souvenir |
| **Salon performances** | `/[lang]/salon/mes-performances` | Oui | Conseiller (`canInvite`) — ses invitations, pas le solde salon |
| **Salon commissions** | `/[lang]/salon/commissions` | Oui | Admin (`canViewLedger`) — KPIs RevShare + ledger SQL |
| **Salon facturation** | `/[lang]/salon/facturation` | Oui | **Redirect** → `/salon/commissions` (jetons morts) |
| **Salon connexion** | `/[lang]/salon/connexion` | Non | Login partenaire **sans** inscription |
| **HQ Odyssey** | `/[lang]/hq` | Oui + allowlist | Tour de contrôle opérateurs (Slice B : KPI réseau macro) |
| **HQ connexion** | `/[lang]/hq/connexion` | Non | Login opérateurs **sans** inscription |
| **Marketing partenaires** | `/[lang]/partners` ou `/partenaires` | Non | Formulaire « devenir partenaire » (≠ Salon) |
| **Acceptation invitation** | `/[lang]/invite/accept?token=…` | Oui (redir. studio connexion) | Magic link famille → projet B2B2C |
| **Bienvenue hommage** | `/[lang]/tribute/welcome?projectId=…` | Oui | Wizard seedé après invitation |
| **Auth callback** | `/auth/callback?next=…` | — | Échange code Supabase (signup / magic link) |

### Scanner Compagnon (Phase A — QR + galerie)

Ingestion mobile photos papier via QR Code wizard desktop (étape Coffre). Spec : [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md). Recadrage + IA = Phase B.

| Route | Auth | Rôle |
|-------|------|------|
| **`/[lang]/scan/[token]`** | Token session (opaque, TTL 2 h) | Mobile — caméra ou galerie → coffre |
| **`POST /api/scan/sessions`** | Titulaire ou Co-Créateur | Crée session QR · retourne `scanUrl` |
| **`POST /api/scan/sessions/[token]/upload`** | Token session | Upload image → Supabase Storage |
| **`GET /api/scan/sessions/[token]`** | Token session | Valide TTL · nom d’hommage minimal |

**Sécurité :** pas de login mobile requis — token lié à **un seul** `project_id` · rate limit uploads · pas d’app native (web only).

**Pont conversion :** preview IA Avant/Après → upsell forfaits **Éternité (349 $)** ou **Légendaire (499 $)** — voir [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md).

### Boucle Virale — Fonds Commémoratif (Cascade V-Final · UI 3a ✅)

Contribution invité async : les proches achètent des **empreintes** dont le Net Distribuable devient un **crédit** sur le paywall famille. Gated par `tenants.settings.viral_loop_enabled` (**false** en prod jusqu’au pilote). Canon : [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md).

| Route | Auth | Rôle |
|-------|------|------|
| **`POST /api/projects/[id]/contribute-link`** | Owner projet | Génère un lien invité opaque (`purpose=guest_contribute`, TTL 30 j) |
| **`GET /api/contribute/[token]`** | Token invité (public) | Contexte page contributeur |
| **`POST /api/contribute/[token]/checkout`** | Token invité (public) | Session Stripe `guest_support` |
| **`POST /api/contribute/[token]/deposit`** | Token invité (public) | Dépôt gratuit (1 photo \| 1 mot) · jusqu’à **5 photos** / token (quota) |
| **`/[lang]/contribute/[token]`** | Token invité (public) | **UI Sanctuaire livrée** (Phase 3a) |

### Co-Créateur (Phases A–C ✅)

| Route | Auth | Rôle |
|-------|------|------|
| **`/[lang]/collab/[token]`** | Token one-shot | Redeem → cookie httpOnly editor → redirect `/studio` |
| **`POST /api/collab/redeem`** | Token | Hash SHA-256 · révocation + grâce idempotente |
| **`POST /api/projects/[id]/collab-link`** | Owner | Mint lien (TTL 14 j) · révoque les précédents |

Canon : [`WIZARD_EDITOR_COLLAB.md`](WIZARD_EDITOR_COLLAB.md).

### Export Creatomate (gate ✅ · worker P0 ✅ · master Stingray ⏳)

| Route | Auth | Rôle |
|-------|------|------|
| **`POST /api/projects/[id]/export`** | Owner | Gate entitlements → enqueue `project_export_jobs` |
| **`GET /api/projects/[id]/export`** | Owner | Dernier job (status / message / output) |
| **`POST /api/internal/export/drain`** | Bearer `EXPORT_DRAIN_SECRET` | Worker : mock **ou** submit Creatomate (`src/lib/creatomate/`) |
| **`POST /api/webhooks/creatomate`** | HMAC `CREATOMATE_WEBHOOK_SECRET` | Callback render — **fail-closed** si secret absent/invalide |

**Sécurité contribute :** token opaque SHA-256, client admin (bypass RLS) ; cap **1000 $/transaction** ; plafond **5 photos** / token ; quotas message / checkout pending ; accrual au webhook.

`lang` = `fr` | `en`.

---

## Renommages (éviter la confusion)

| Ancien chemin | Nouveau | Mécanisme |
|---------------|---------|-----------|
| `/[lang]/dashboard` | `/[lang]/studio` | Redirect permanent (`next.config.mjs`) |
| `/[lang]/partner` | `/[lang]/salon` | Redirect permanent |
| `/[lang]/login`, `/login` | `/[lang]/studio/connexion` | Redirect page + `next.config.mjs` |

**Ne pas confondre :**
- **`/salon`** = espace connecté funérarium (B2B2C opérationnel).
- **`/partners`** = page marketing acquisition partenaires.

---

## Deux connexions distinctes (Option A — « gant blanc »)

Pas de toggle Salon/Famille sur une même page : deux entrées séparées, copy dédiée.

| | Studio (famille) | Salon (partenaire) |
|--|------------------|-------------------|
| **URL** | `/studio/connexion` | `/salon/connexion` |
| **Inscription** | Oui (onglet Sign up) | Non |
| **Après login** | `/studio` (ou `?next=`) | `/salon` (ou `?next=`) |
| **Copy** | Pas de mention B2B | Pas de mention famille |
| **Composant** | `LoginForm` `audience="studio"` | `LoginForm` `audience="salon"` |

**Règle de redirection post-auth :**
- `?next=` prioritaire (chemins `/fr/…` ou `/en/…` uniquement).
- Sinon destination fixe selon `audience` — **pas** d’auto-détection partenaire via `/api/partner/tenants` sur la page famille.

**Legacy `/login` :** alias technique pour anciens liens (favoris, e-mails). Redirige vers **studio connexion** uniquement. Ce n’est pas une page produit.

---

## Branding partenaire — page Salon connexion

Lien personnalisé recommandé pour chaque funérarium :

```
https://odyssey.video/fr/salon/connexion?partenaire=<slug>
```

Alias anglais : `?partner=<slug>` (même comportement).

| Paramètre URL | Colonne DB | Champ `tenants.settings` |
|---------------|------------|--------------------------|
| `partenaire=maison-dupont` | `tenants.slug` | — |
| Nom affiché | `tenants.name` (fallback) | `brand_label` |
| Logo | — | `brand_logo_url` (URL HTTPS publique) |

**Comportement :**
- Slug valide + tenant trouvé → logo (même PNG que le dashboard) + « Propulsé par Odyssey » aligné à droite + séquence cinéma CSS (~3,3 s).
- Pas de paramètre, slug invalide ou tenant inconnu → lockup Odyssey standard (pas d’erreur visible).
- Après login brandé, le slug `?partenaire=` est mémorisé (`localStorage`) — fallback logo header si le tenant met du temps à charger.

**Lecture serveur (connexion) :** `fetchPartnerBrandingBySlug()` → RPC **`get_partner_public_branding`** (P5.2), pas de `service_role`.

**Dashboard Salon (`/salon`) :**
- Même `brand_logo_url` via `fetchPartnerTenantsForUser()` (layout serveur) et `GET /api/partner/tenants`.
- Layout : `resolvePartnerInitialBrand()` enrichit le branding serveur via RPC publique si le tenant n’a pas encore de logo en settings.
- Header : `PartnerBrandLockup` + `PartnerLogoBand` variant `dashboard` + animation courte (~1,8 s).
- Fallback logo client : si le tenant n’a pas `logoUrl`, RPC `get_partner_public_branding` via slug tenant, slug connexion (`localStorage`) ou premier tenant disponible.
- Header `z-30` pour rester au-dessus des halos d’ambiance.
- Atmosphère : `SalonAtmosphere` (halos violet atténués), alignée sur la connexion.
- Hiérarchie page : `PartnerSalonPageIntro` → `InvitationComposer` (email + CTA Souvenir).

**SQL requis (Supabase) :**

| Script | Rôle |
|--------|------|
| `odyssey_p5_2_partner_public_branding.sql` | RPC branding public connexion |
| `odyssey_p5_3_tenant_partner_select.sql` | RLS SELECT `tenants` pour `partner` / `partner_admin` |
| `odyssey_p5_4_partner_tenants_for_member.sql` | RPC liste tenants + branding (alternative / complément à P5.3) |
| `odyssey_partner_tenant_branding_example.sql` | Exemple QA Urgel Bourgie |
| `odyssey_p4_partner_token_qa_seed.sql` | **HIST** — ne plus seed jetons (P8) |

Exécuter **P5.2 + (P5.3 ou P5.4) + seed** pour connexion et dashboard co-brandés.

**Exemple SQL (QA) :** voir `docs/sql/odyssey_partner_tenant_branding_example.sql`.

**Phase 2 (pas encore) :** upload logo depuis le Salon → Storage + `settings.brand_logo_url` ; générateur de lien brandé dans le dashboard.

---

## Routes protégées

| Route | Si non authentifié |
|-------|-------------------|
| `/[lang]/studio` | → `/studio/connexion?next=/[lang]/studio` |
| `/[lang]/salon` (+ layout) | → `/salon/connexion?next=<chemin Salon demandé>` ; si auth mais **sans** rôle partenaire → redirect `/studio` |
| `/[lang]/salon/commissions` | Même gate auth/partenaire ; si **sans** `canViewLedger` → redirect `/salon` (client) |
| `/[lang]/salon/mes-performances` | Même gate auth/partenaire ; scoreboard du user connecté seulement |
| `/[lang]/salon/facturation` | Redirect serveur → `/salon/commissions` |
| `/[lang]/hq` (+ layout) | Middleware + layout : hors session → `/hq/connexion` ; hors `hq_allowlist` → `/{lang}` ; layout partenaire → `/salon` |
| `/[lang]/invite/accept` | → `/studio/connexion?next=…` (famille invitée) |
| `/[lang]/tribute/welcome` | → `/studio/connexion?next=…` |

**Déconnexion** (`DashboardSignOut`) :
- Studio (défaut) → `/studio/connexion`
- Salon (`PartnerHeader` passe `signInHref`) → `/salon/connexion?partenaire=<slug mémorisé>`
- HQ → `/hq/connexion`

**API partenaire (session) :** `GET /api/partner/tenants` · `GET /api/partner/my-performance` (`canInvite`) · `GET /api/partner/commissions` (`canViewLedger`) · `POST /api/partner/invitations` · `POST /api/partner/invitations/[id]/follow-up` (`canInvite`, auteur de l’invitation) · `GET /api/partner/wallet` (deprecated).

**API HQ (session + allowlist) :** `GET /api/hq/overview` · `GET /api/hq/tenants` · `POST /api/hq/tenants/[id]/payout` — KPI macro, liste micro, versement (service_role + RPC P14).

---

## Auth callback (`/auth/callback`)

- Échange `code` ou `token_hash` Supabase → session cookies.
- Redirige vers `next` (sanitisé).
- En cas d’erreur : redirect vers la page connexion adaptée au chemin `next` (hq → `hq/connexion`, salon → `salon/connexion`, sinon `studio/connexion`) avec `?error=callback`.

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/lib/appRoutes.ts` | Chemins canoniques |
| `src/components/auth/LoginForm.tsx` | Formulaire auth (`audience`, halos, éclipse, séquence Actes I–V) |
| `src/components/auth/ConnexionEclipseLayer.tsx` | Vidéo éclipse fond connexion (`eclipse_login.mp4`) |
| `src/components/auth/OdysseyConnexionMark.tsx` | Wordmark ODYSSEY connexion (fallback sans logo partenaire) |
| `src/components/i18n/LocaleSwitcher.tsx` | Toggle FR/EN (connexion + dashboards) |
| `src/lib/partner/resolveSalonLayoutAccess.ts` | Gate rôle partenaire (layout salon) |
| `src/components/auth/SalonConnexionBrand.tsx` | Branding connexion Salon (server) |
| `src/components/auth/StudioConnexionBrand.tsx` | Branding connexion Studio |
| `src/components/auth/PartnerLogoBand.tsx` | Logo partenaire (`cinema` / `dashboard`) |
| `src/components/partner/PartnerBrandLockup.tsx` | Logo + « Propulsé par Odyssey » |
| `src/components/partner/SalonAtmosphere.tsx` | Halos fond connexion / salon |
| `src/lib/partner/fetchPartnerBrandingBySlug.ts` | Branding public par slug (P5.2) |
| `src/lib/partner/fetchPartnerTenantsForUser.ts` | Tenants + branding membre ; `resolvePartnerInitialBrand()` |
| `src/lib/partner/partnerBrandingFromSettings.ts` | Parse settings ; `parsePartnerLogoUrl()` |
| `src/lib/salonTierCardSkin.ts` | Motion + classes champ / CTA invitation Salon (cyan) |
| `src/lib/wizard/wizardDeliverables.utils.ts` | Présentation tiers (features structurées) |
| `app/[lang]/studio/connexion/page.tsx` | Page connexion famille |
| `app/[lang]/salon/connexion/page.tsx` | Page connexion partenaire (+ `searchParams`) |
| `app/[lang]/hq/connexion/page.tsx` | Page connexion HQ (sans inscription) |
| `middleware.ts` | Session cookies + gate `/hq` (`hq_allowlist`) |
| `src/lib/hq/isOdysseyOperator.ts` | Allowlist `hq_allowlist` (SQL P13) |
| `src/lib/hq/hqNetworkOverview.ts` | Agrégation KPI réseau macro |
| `src/lib/hq/hqTenantsList.ts` | Liste micro salons + appel payout |
| `src/lib/hq/requireHqOperator.ts` | Gate session + allowlist + admin |
| `app/api/hq/overview/route.ts` | KPI réseau HQ (`hq_allowlist`) |
| `app/api/hq/tenants/route.ts` | Liste salons HQ |
| `app/api/hq/tenants/[id]/payout/route.ts` | Versement payable intégral |
| `docs/sql/odyssey_p14_hq_commission_payout.sql` | RPC payout P14 |
| `docs/HQ_ODYSSEY.md` | Canon tour de contrôle |
| `app/[lang]/(salon)/salon/layout.tsx` | Garde auth + branding serveur initial |
| `app/[lang]/(salon)/salon/components/PartnerHeader.tsx` | Header co-brandé |
| `app/[lang]/(salon)/salon/components/PartnerSalonPageIntro.tsx` | Hiérarchie workspace + commissions |
| `src/lib/partner/PartnerContext.tsx` | Tenant actif côté Salon |
| `app/api/partner/tenants/route.ts` | Liste tenants partenaire (session) |
| `app/api/partner/wallet/route.ts` | **Deprecated** — snapshot 0 (jetons morts) |
| `app/api/partner/commissions/route.ts` | Soldes + ledger RevShare (`canViewLedger`) |
| `app/api/partner/my-performance/route.ts` | Scoreboard conseiller (`invited_by_user_id`) |
| `app/api/partner/invitations/route.ts` | Création invitation + magic link |
| `app/api/partner/invitations/[id]/follow-up/route.ts` | Relance e-mail (1×, régénère le magic link) |
| `docs/DESIGN_SYSTEM.md` | Palette, hiérarchie, co-branding, **signature Halo-Éclipse** (§4.1), animations |

---

## Tests manuels (checklist courte)

1. `/fr/studio/connexion` — inscription + login → `/fr/studio` ; **Halo-Éclipse** : halo violet (connexion) / cyan (inscription) ; `OdysseyConnexionMark` blanc lumineux ; CTA cyan.
2. `/fr/salon/connexion` (navigation privée, sans cookie partenaire) — fallback Odyssey ; pas d’onglet inscription → `/fr/salon`.
3. `/fr/login` → redirect studio connexion.
4. `/fr/salon/connexion?partenaire=partner-qa-demo` — branding partenaire + même signature Halo-Éclipse en fond.
5. Erreur login (mauvais mot de passe) — halo **magenta** + message ; éclipse inchangée (cf. [`DESIGN_SYSTEM.md` §4.1](DESIGN_SYSTEM.md#41-signature-halo-éclipse-connexion-studio--salon)).
6. `/fr/salon/commissions` — Admin voit KPIs + ledger SQL ; Directeur redirigé `/salon` ; déconnecté → login avec `next=/fr/salon/commissions`.
7. Déconnexion studio → retour studio connexion ; déconnexion salon → connexion salon brandée (slug conservé).
8. Toggle FR/EN — conserve query `?partenaire=` ; « Retour au site » apparaît en dernier (Acte V).
9. Invitation magic link → accept → tribute welcome (voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md)).
10. Compte famille sans rôle partenaire → `/fr/salon` redirect `/fr/studio`.
11. `/fr/hq/connexion` — pas d’inscription ; hors `hq_allowlist` → accueil (middleware) ou `/salon` (layout partenaire).
12. `/fr/hq` déconnecté → login HQ avec `next`.
