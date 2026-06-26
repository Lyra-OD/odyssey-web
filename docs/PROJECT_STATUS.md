# Odyssey Frontend — Project Status

**Last revised: June 2026 · B2B2C v2 pivot documented**

Living snapshot: **audit**, **recommended consolidations**, and **next sprint plan**.  
For stable onboarding and architecture deep dives, see [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) and the specialized docs listed in [`CONVENTIONS.md`](CONVENTIONS.md).

**Update this file** after major milestones (P6 commerce, Scanner MVP, etc.) or at monthly team checkpoints.

---

## 1. Executive summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| **Family Studio (B2C wizard)** | 🟢 Mature | 8 steps, autosave, media, music, Stripe checkout |
| **Partner Salon (UI + QA P5.5)** | 🟢 **Terminée** | RBAC, wallet API, gate R6, solde bout en bout — QA prod validée ([`QA_P5_5_PARTNER_SALON.md`](QA_P5_5_PARTNER_SALON.md)) |
| **B2B2C commerce v2 (doc)** | 🟢 Spec ready | Freemium + RevShare 30 % + Scanner — canon [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2 |
| **B2B2C commerce (app layer)** | 🟡 Partial | P4/P5.5 legacy jetons ✅ ; **P6 + saga v2 + webhook commission** = prochain sprint |
| **RBAC & tokens (P5.5)** | 🟢 Shipped & QA | SQL + TS + UI ; coexistence avec freemium (`is_freemium`) documentée |
| **Automated tests & CI** | 🔴 None | No test framework, no `.github/` workflows |
| **Documentation** | 🟢 Strong | Rich; some docs ahead/behind code (see §4) |
| **Security** | 🟡 Adequate with gaps | RLS solid; salon layout gate ✅; checkout saga still open |

**Overall: 7.5/10** — B2C wizard + Salon partenaire **certifiés en prod** (P5.5 ✅) ; **grand chantier = B2B2C v2** (P6 SQL, saga checkout, RevShare webhook, Scanner Compagnon).

---

## 2. Maturity by product surface

| Surface | Status | Detail |
|---------|--------|--------|
| Marketing / landing | 🟢 | Hero, process, pricing, FR/EN i18n |
| Studio login + 8-step wizard | 🟢 | Core product path ; login = signature **Halo-Éclipse** |
| Connexion UX (Studio + Salon) | 🟢 | Halo-Éclipse, `OdysseyConnexionMark`, i18n toggle, CTA cyan — [`DESIGN_SYSTEM.md` §4.1](DESIGN_SYSTEM.md#41-signature-halo-éclipse-connexion-studio--salon) |
| Media upload / Storage | 🟢 | Client upload + signed URLs + **WebP thumbs** + session cache egress (`39460bd`) — voir §4.1 |
| Licensed music (Stingray) | 🟢 | Live MAPI + auto-mock without credentials |
| B2C checkout (Stripe) | 🟢 | Checkout Session |
| B2B token checkout | 🟡 | Works via legacy TS debit; not P5 saga RPC |
| Salon UI + invitations | 🟢 | `InvitationComposer`, branding, design system |
| Salon wallet / billing UI | 🟡 | Admin : solde réel + page `/salon/facturation` (shell ✅) ; Stripe Payment Link + ledger UI ⏳ |
| B2B2C family pricing v2 | 🔴 | Freemium 0 $ + upsell plein + RevShare — doc ✅ · code ⏳ |
| Scanner Compagnon (Killer App) | 🔴 | Spec [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) ✅ · MVP ⏳ |
| Partner commission ledger (P6) | 🔴 | Spec [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) ✅ · SQL ⏳ |
| Invitation → family wizard | 🟢 | Magic link + `/tribute/welcome` |
| Video render pipeline | 🔴 | Documented only (Creatomate target) |
| Multi-vertical (e.g. pets) | 🟡 | `tenants.vertical` in DB; UI not forked |
| `app-backend/` FastAPI | ⚪ | `/health` stub; out of Next.js scope |

---

## 3. Database vs application layer

The **SQL schema P4/P5.5 is production-ready for legacy jetons**; **P6 (freemium + commissions) is documented but not migrated**. App commerce code still lags both.

```mermaid
flowchart LR
  subgraph DB["Supabase SQL"]
    W[partner_token_wallets]
    I[partner_invitations]
    C[tribute_checkouts]
    R[RPC P5 / P5.5 ✅]
    P6[is_freemium + commission ledger ⏳]
  end
  subgraph App["Next.js API ⚠️"]
    A["POST /api/partner/invitations"]
    B["POST /api/checkout"]
    S["Stripe webhook"]
    SC["Scanner / RevShare ⏳"]
  end
  R --> A
  A --> R
  C -.->|"saga v2 not wired"| B
  C -.->|"completed + commission"| S
  P6 -.-> SC
  B -->|"B2C + basic B2B"| Stripe
```

| Capability | SQL | App code |
|------------|-----|----------|
| Token debit at invitation (P5.5, legacy tenants) | ✅ | ✅ RPC via `POST /api/partner/invitations` |
| QA P5.5 Salon (RBAC, wallet, gate R6) | ✅ | ✅ **Validée prod** |
| `tribute_checkouts` saga **v1** (jetons) | ✅ | ❌ spike **annulé** |
| `tribute_checkouts` saga **v2** (freemium + RevShare) | ⏳ P6 | ❌ **prochain sprint** |
| `tenants.is_freemium` | ⏳ P6 | ❌ |
| `partner_commission_ledger` + accrual webhook | ⏳ P6 | ❌ |
| Checkout mode `b2b2c_family` | ✅ column | ❌ |
| Webhook → checkout completed + commission | — | ❌ (catalog sync only) |
| Scanner Compagnon sessions | ⏳ P6.1 | ❌ |
| Real Salon wallet balance | ✅ | ✅ |
| RBAC Admin vs Director (UI) | ✅ RLS | ✅ |
| Video render after payment | — | ❌ |

Reference: [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2 · [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) · [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) · [`sql/README.md`](sql/README.md).

### Pivot stratégique — Saga Checkout (juin 2026)

| Décision | Détail |
|----------|--------|
| **Spike `tribute_checkouts` v1** | **Annulé** — modèle jetons + delta famille remplacé pour les gros clients |
| **B2B2C v2 (Scrypta Killer)** | **Freemium** Souvenir 0 $ · **RevShare 30 %** brut Stripe · **Scanner Compagnon IA** |
| **Legacy coexistence** | P4/P5.5 jetons **conservé** pour petits salons (`is_freemium = false`) |
| **Prochain sprint** | P6 SQL · saga checkout v2 · webhook commission · Scanner Phase A |

Doc canon v2 : [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) · [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md).

---

## 4. Recent work (Salon + P5.5)

### Shipped on `main` (June 2026)

- Studio / Salon route split, dual login, partner co-branding (P5.2–P5.4)
- Salon invitation UI: cyan skin (`salonTierCardSkin.ts`), structured features, logo fallback
- Docs: `DESIGN_SYSTEM.md`, `ROUTES_AND_AUTH.md`
- **P5.5 Phase 1 (Salon gate + wallet API):** `resolveSalonLayoutAccess` in salon layout — non-partner → redirect `/studio` ; `GET /api/partner/wallet` ; solde réel dans `PartnerContext` (`f5a375a`)
- **Branding connexion persist:** slug `?partenaire=` via URL + cookie + localStorage ; hotfix RSC cookie (`3475421`, `7433457`)
- **Salon header:** déconnexion → connexion salon avec slug ; toggle FR/EN (`fb5dff7`, `c653542`)
- **Connexion — signature Halo-Éclipse (juin 2026):** vidéo `eclipse_login.mp4` (corona constante) + halos CSS d’état (violet / cyan / vert / magenta) ; `OdysseyConnexionMark` (Montserrat blanc lumineux) ; CTA cyan respirant ; séquence cinéma Actes I–V — voir [`DESIGN_SYSTEM.md` §4.1](DESIGN_SYSTEM.md#41-signature-halo-éclipse-connexion-studio--salon)
- **P5.5 Phase 2 (RBAC foundation):** `partnerRoles.ts`, `partnerCapabilities.ts`, `resolvePartnerMembership.ts`, `createPartnerInvitationWithDebit.ts`; `GET /api/partner/tenants` returns `role` + `capabilities`; `PartnerContext` exposes active tenant capabilities; invitation route uses P5.5 RPC + maps `overdraft_limit_exceeded` → HTTP 402
- **P5.5 Phase 3 (Salon UI):** `PartnerSalonPageIntro` gates wallet/recharge on `capabilities.canViewBalance` (Directors see no balance); removed dead `PartnerWalletSection.tsx`
- **Storage egress (wizard médias):** thumbs WebP + cache session + `cacheControl` long sur nouveaux uploads — §4.1 (`39460bd`)
- **QA P5.5 — terminée prod ✅** : RBAC §2 · solde §3 · gate R6 · checklist [`QA_P5_5_PARTNER_SALON.md`](QA_P5_5_PARTNER_SALON.md)
- **Documentation B2B2C v2** : `B2B2C_COMMERCE.md`, `DELIVERABLES_AND_PACKAGES.md`, `PARTNER_REVSHARE.md`, `SCANNER_COMPANION.md`

### SQL reference (apply in Supabase before prod API)

| Artifact | Role |
|----------|------|
| `docs/sql/odyssey_p5_5_partner_rbac_overdraft.sql` | Overdraft limit (default 20 tokens), ledger `actor_user_id` / `invitation_id`, RLS admin-only wallet/ledger, RPC `create_partner_invitation_with_debit`, `credit_partner_tokens_manual`, checkout anti double-debit |

**Business rules (P5.5):**

- Debit at **invitation creation** (`granted_package` → 1/2/4 tokens)
- Limited overdraft: `balance >= -credit_limit_tokens` (default 20)
- `partner` (Director): can invite; never sees balance/ledger/billing
- `partner_admin` (Admin): balance, ledger, manual top-up (Stripe Payment Links + ops for MVP)
- Checkout `b2b2c_family` skips wallet debit if `invitation_debit` already in ledger

### 4.1 Supabase Storage egress (juin 2026)

**Contexte :** pic ~5,5 Go egress (plan Free 5 Go) lors de sessions dev/QA wizard (juin 3–4) — médias en pleine résolution re-téléchargés à chaque étape ; cached egress quasi nul.

**Shippé sur `main` (`39460bd`) — sans transformations Supabase (plan Free) :**

| Mesure | Détail |
|--------|--------|
| Thumbs WebP ~400px | Générés **côté client** à l’upload ; path `photo.jpg` → `photo-thumb.webp` (pas de colonne DB) |
| Grilles / queue | `previewUrl` = thumb ; modal directeur = `fullPreviewUrl` (original) |
| Cache session | `fetchProjectMediaCached` — 50 min ; invalidation après upload/delete |
| `cacheControl` | **1 an** sur **nouveaux** uploads uniquement (`storageEgressPolicy.ts`) |
| Legacy sans thumb | `StoragePreviewImage` : fallback automatique sur l’original (rien de cassé) |

**Fichiers clés :** `src/lib/media/storageEgressPolicy.ts`, `thumbnailPath.ts`, `generateImageThumbnail.ts`, `projectMediaCache.ts`, `hydrateMediaSignedUrls.server.ts`, `StoragePreviewImage.tsx`.

**Décision équipe — ne pas faire maintenant (revisité après surveillance dashboard) :**

| Option | Priorité | Verdict |
|--------|----------|---------|
| **Transformations Supabase** (`/render/image/…`) | — | **Ne pas faire** — hors scope Free / redondant avec nos thumbs |
| **Script backfill thumbs** (médias historiques) | 5/10 | Optionnel ; dry-run + 1 projet QA d’abord ; pic egress **pendant** le script |
| **Mettre à jour `cacheControl` objets existants** | 3/10 | **Non recommandé** — re-upload souvent requis → pic egress/ingress ; ROI faible vs nouveaux uploads déjà couverts |
| **Logos partenaire → `/public` ou CDN** | 2/10 | Gain faible ; plus tard si multi-partenaires |

**Prochaine étape egress :** surveiller **Usage → Storage egress** Supabase **2 semaines** post-deploy. Si courbe stable → rien de plus. Si pic sur **vieux** projets → backfill thumbs avant tout script `cacheControl` legacy.

---

## 5. API routes (13 + auth callback)

| Route | Maturity | Notes |
|-------|----------|-------|
| `/api/projects/draft`, autosave, media, avatar | 🟢 Production | Ownership checks |
| `/api/music/search`, preview, stream | 🟢 Production | Stingray + mock fallback |
| `/api/checkout` | 🟡 Partial | B2C Stripe + B2B TS debit; no `tribute_checkouts`, no `b2b2c_family` |
| `/api/partner/invitations` | 🟢 | P5.5 RPC debit + `canInvite`; `402` on overdraft limit |
| `/api/partner/tenants` | 🟢 | RPC P5.4 or join fallback; `role` + `capabilities` per tenant |
| `/api/partner/wallet` | 🟢 | Admin-only snapshot (`canViewBalance`); balance + credit limit |
| `/[lang]/salon/facturation` | 🟡 Shell | Admin UI ; Payment Link env optional ; ledger list ⏳ |
| `/api/stripe/webhook` | 🟡 | Robust idempotence; **catalog sync only** — no `checkout.session.completed` → orders |
| `/auth/callback` | 🟢 | PKCE, sanitized `?next=` |

---

## 6. Technical debt (prioritized)

### 🔴 High — next sprint (B2B2C v2)

1. **Saga checkout v2** — freemium 0 $ path · Stripe upsell · `tribute_checkouts` · pas de spike v1 jetons-first pour freemium tenants.
2. **P6 SQL** — `tenants.is_freemium`, `partner_commission_balances`, `partner_commission_ledger`, RPC accrue/clawback.
3. **Stripe webhook** — `checkout.session.completed` → completed + RevShare accrual (idempotent).
4. **Scanner Compagnon Phase A** — QR session + mobile upload + realtime sync (see [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md)).
5. **Zero automated tests** — no Jest/Vitest/Playwright; no CI.

### 🔴 High — legacy (before partner scale on jetons path)

6. **Three token debit paths** — consolidate legacy tenants to RPC; deprecate `partnerCheckout.ts` TS debit.
7. **Incomplete Stripe webhook** — extends to item 3 above for v2.

### 🟡 Medium

5. ~~**Salon layout** — any authenticated user can open `/salon` UI~~ → **✅ gate** (`resolveSalonLayoutAccess`, redirect studio if no partner role).
6. **Partner roles duplicated** — `resolvePartnerTenant.ts` still used in places; prefer `resolvePartnerMembership()` everywhere.
7. **Supabase vs Vercel drift** — ensure P5.5 SQL applied in every env; API returns `503 schema_not_ready` if RPC missing.

### 🟢 Low — quick cleanup

8. Dead code: stub pages `auth/`, `watch/`.
9. Duplication: `resolveSiteOrigin()` ×3 vs `lib/siteUrl.ts`; local `PACKAGE_ID_MAP` vs wizard helpers.
10. Contact form without backend.
11. No `.env.example` (env vars documented only in onboarding §6).

---

## 7. Recommended consolidations (anti-spaghetti)

Steps 1–3 and Director wallet hide (Phase 3) are **done**. Remaining before heavy billing UI:

| Step | Action | Status |
|------|--------|--------|
| 1 | `partnerRoles.ts` — single source for roles | ✅ |
| 2 | `resolvePartnerMembership()` → `{ role, capabilities }` | ✅ |
| 3 | `GET /api/partner/tenants` + `PartnerContext` capabilities | ✅ |
| 4 | `partnerWallet.ts` — RPC wrappers only | ⏳ deprecate `partnerCheckout.ts` |
| 5 | Real admin balance via `GET /api/partner/wallet` (replace mock `42`) | ✅ `f5a375a` |
| 6 | `partnerRpcErrors.ts` — map RPC error → HTTP status | ⏳ partial (`partnerApiErrors.ts`) |

**Do not merge** branding + wallet + invitations into mega-files. **Do not** move invitation debit back to TS UPDATE — keep P5.5 RPC as source of truth.

---

## 8. Security notes

**Strengths:** RLS P0–P5; wallet writes via `service_role`; `requireProjectOwner()` on project routes; webhook signature + lock token; public branding RPC without service role; auth callback sanitizes redirects.

**Gaps:**

| Risk | Severity | Detail |
|------|----------|--------|
| ~~Salon without partner role gate~~ | — | ✅ Layout gate redirects non-partners to `/studio` |
| Non-atomic B2B checkout debit (TS) | Medium | Race vs SQL `FOR UPDATE` RPC |
| Checkout without saga | High (business) | Stripe payment not tied to `tribute_checkouts` |
| P5.5 not deployed everywhere | Ops | API returns `503 schema_not_ready` if RPC missing |
| Music APIs public | Low | Acceptable with edge rate limits |

Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STINGRAY_*`.

---

## 9. Documentation alignment

| Doc | Gap |
|-----|-----|
| `B2B2C_COMMERCE.md` | ✅ **v2** (freemium, RevShare, saga v2, legacy coexistence) |
| `DELIVERABLES_AND_PACKAGES.md` | ✅ v2 (Quiet Luxury B2C, Légendaire 499 $) |
| `PARTNER_REVSHARE.md` | ✅ spec · code ⏳ |
| `SCANNER_COMPANION.md` | ✅ spec · code ⏳ |
| `TECHNICAL_ONBOARDING` §4.7 / §5 / §10 | ✅ v2 (freemium, Légendaire, Scanner, P6) |
| `sql/README.md` | ✅ P6 migration row + § P6 détaillé |
| `QA_P5_5_PARTNER_SALON.md` | ✅ **Terminée prod** — bannière + legacy vs freemium |
| `ROUTES_AND_AUTH.md` | ✅ routes Scanner prévues |
| `STINGRAY_MUSIC_INTEGRATION.md` | ✅ freemium 0 jeton Studio |

---

## 10. Next sprint — B2B2C v2 (post QA P5.5)

**Prerequisite ✅:** QA P5.5 terminée prod · doc v2 canonique rédigée (juin 2026).

**Spike checkout v1 : annulé** → pivot Freemium + RevShare + Scanner.

| # | Task | Effort | Done when |
|---|------|--------|-----------|
| S1 | P6 SQL : `is_freemium`, commission tables, RPC accrue/clawback | 1 d | Migration applied + README |
| S2 | Saga checkout v2 : freemium 0 $ + Stripe upsell + `tribute_checkouts` | 2 d | Happy path E2E documented |
| S3 | Webhook `checkout.session.completed` + commission idempotent | 1 d | RevShare line in ledger |
| S4 | Scanner Phase A : QR + mobile `/scan/[token]` + upload | 2 d | Photo appears on desktop wizard |
| S5 | `pricingConfig` + manifest v2 (0/149/299/499, `legendary`) | 1 d | Align deliverables doc |
| S6 | Invitation API : skip debit when `is_freemium` + Souvenir | 0.5 d | No 402 on freemium invite |
| S7 | Smoke tests commission math + checkout idempotency | 1 d | Script or Vitest |

**Sprint exit criteria:** one freemium tenant (ex. Urgel Bourgie) can invite → family completes Souvenir 0 $ OR pays upsell → commission accrued on webhook.

### Completed — P5.5 + doc v2 (juin 2026)

| # | Task | Status |
|---|------|--------|
| 1.1–1.5 | P5.5 RBAC, wallet API, salon gate | ✅ |
| 1.6 | QA P5.5 checklist prod | ✅ **Terminée** |
| Doc | B2B2C v2, RevShare, Scanner, Deliverables | ✅ |

### Explicitly deferred (after v2 Phase A)

- Stripe Connect auto-payout
- Scanner Phase B (crop papier + Avant/Après IA)
- Légendaire Gants Blancs fulfillment ops (boîte physique)
- Full test suite + GitHub Actions
- Video render pipeline
- Storage legacy backfill — voir §4.1

---

## 11. SQL migration reference (P5.5)

Execute after P5.1–P5.4:

```
docs/sql/odyssey_p5_5_partner_rbac_overdraft.sql
```

See [`sql/README.md`](sql/README.md) for full P0–P5.5 order.

---

## 12. Guide lecture rapide (revue partenaire / Jon)

**Ordre recommandé ce soir :**

1. **[`PROJECT_STATUS.md`](PROJECT_STATUS.md)** (ce fichier) — où on en est, dette, plan 2 semaines.
2. **[`DESIGN_SYSTEM.md` §4.1](DESIGN_SYSTEM.md#41-signature-halo-éclipse-connexion-studio--salon)** — signature visuelle connexion **Halo-Éclipse**.
3. **[`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md)** — URLs studio/salon, branding `?partenaire=`, checklist QA connexion.
3b. **[`QA_P5_5_PARTNER_SALON.md`](QA_P5_5_PARTNER_SALON.md)** — ✅ **QA terminée prod** (RBAC, solde, gate R6).
4. **[`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md)** — **v2** freemium + RevShare + saga checkout (spike v1 annulé).
4b. **[`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md)** · **[`SCANNER_COMPANION.md`](SCANNER_COMPANION.md)** — ledger commissions + Killer App.
5. **[`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md)** — grille Quiet Luxury B2C (149/299/499) + Souvenir lead-magnet B2B2C.
6. **[`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md)** — hub technique complet (§4 auth, §10 roadmap).

**Démo prod / QA :** tenant `partner-qa-demo` (Urgel Bourgie) · compte partenaire QA · base Vercel `odyssey-web-eta.vercel.app`.

**Ce qui est shippé récemment (juin 2026, `main`) :** QA P5.5 ✅ · RBAC · gate `/salon` · wallet API · invitations RPC · doc B2B2C v2 · Halo-Éclipse · co-branding.

**Grand chantier prochain sprint :** B2B2C v2 — P6 SQL · saga checkout freemium · webhook RevShare · Scanner Phase A · `pricingConfig` v2.

**Ce qui n’est pas encore prod-ready :** implémentation P6 · commission UI · Scanner · Légendaire fulfillment · tests automatisés.

---

## 13. Related documents

| Topic | Document |
|-------|----------|
| Commerce rules & saga v2 | [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) |
| RevShare & commission ledger | [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) |
| Scanner Compagnon (Killer App) | [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) |
| Routes & Salon auth | [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) |
| Packages & tokens | [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) |
| Wizard | [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) |
| Onboarding hub | [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) |
| SQL order | [`sql/README.md`](sql/README.md) |
