# SQL Odyssey — état courant

> **Freemium V1 Pivot :** canon [`FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md).  
> **Phase 2 (à venir) :** RPC invitation **sans** débit · quotas sur `intendedPackage` · `project_paid_entitlements` · `sanctuary_tokens` · **DROP** `partner_token_*`.  
> Scripts P4 / P5.5 jetons restent dans la chaîne historique jusqu’à migration de purge.
>
> **P6 appliqué :** `legendary`, `is_freemium`, commission ledger.  
> **P7 :** trigger `enforce_media_asset_quota()` sur `basePackage` — à faire évoluer vers `intendedPackage` (Phase 2).

Ce dossier contient tous les scripts SQL qui décrivent la **vérité actuelle** de la base Supabase d'Odyssey. Tous les scripts de migration sont **idempotents** : on peut les ré-exécuter sans dégât.

**Commerce B2B2C v2 Bulletproof :** voir [`docs/B2B2C_COMMERCE.md`](../B2B2C_COMMERCE.md) · RevShare [`PARTNER_REVSHARE.md`](../PARTNER_REVSHARE.md) · QA [`QA_P6_COMMISSION_WATERFALL.md`](../QA_P6_COMMISSION_WATERFALL.md).  
**Note :** migrations P4–P6 en base active ✅ ; l’app Next.js rattrape maintenant le schéma (Sprint P6 T2+). Voir [`PROJECT_STATUS.md`](../PROJECT_STATUS.md).

---

## Ordre d'exécution sur une base vierge

| # | Fichier | Type | Rôle |
|---|---------|------|------|
| 1 | `odyssey_p0_complete.sql` | Migration | Schéma P0 : `orders`, RLS `projects` / `orders` / `media_assets`, index, grants `service_role`. |
| 2 | `odyssey_p0_fix_grants.sql` | Patch | Ré-applique les `GRANT` si l'init P0 a échoué en cours de route. |
| 3 | `odyssey_p1_user_bootstrap.sql` | Migration | Multi-tenant : `tenant_members`, enrichissement `tenants`, trigger `handle_new_user` → `profiles` + `tenant_members`. |
| 4 | `odyssey_p2_media_assets_schema_sync.sql` | Migration | Alignement `media_assets` (upload service). |
| 5 | `odyssey_p2b_media_assets_cleanup.sql` | Patch | Supprime `user_id` en doublon si présent (convention = `owner_user_id`). |
| 6 | `odyssey_p3_wizard_autosave.sql` | Migration | `wizard_state`, `wizard_step`, `last_saved_at` sur `projects`. |
| 7 | `odyssey_p4_partner_token_wallets.sql` | Migration | `partner_token_wallets` + `partner_token_ledger` (jetons B2B). |
| 8 | `odyssey_p4_1_security_fixes.sql` | **Patch sécurité** | RLS wallets/ledger : rôles `partner` / `partner_admin` uniquement ; index `ledger.project_id`. |
| 9 | `odyssey_p5_b2b2c_core.sql` | Migration | `partner_invitations`, `tribute_checkouts`, `projects.invitation_id`, `debit_partner_tokens_for_checkout()`. |
| 10 | `odyssey_p5_1_invitation_unique_pending.sql` | **Patch** | Index unique `pending` par `(tenant_id, email)` — anti double-clic invitations. |
| 11 | `odyssey_p5_2_partner_public_branding.sql` | **Patch** | RPC `get_partner_public_branding(slug)` — page Salon connexion co-brandée. |
| 12 | `odyssey_p5_3_tenant_partner_select.sql` | **Patch** | RLS SELECT `tenants` pour rôles `partner` / `partner_admin`. |
| 14 | `odyssey_p5_4_partner_tenants_for_member.sql` | **Patch** | RPC `get_partner_tenants_for_member()` — logo + dropdown Salon après login. |
| 15 | `odyssey_p5_5_partner_rbac_overdraft.sql` | **Patch** | RBAC admin wallet/ledger, overdraft limité, débit atomique invitation, crédit manuel, anti double-débit checkout. |
| 16 | `odyssey_p6_freemium_revshare.sql` | **Migration** | **B2B2C v2 Phase A** + stubs Phase 2 — voir [§ P6](#p6--freemium--revshare-b2b2c-v2) |
| 17 | `odyssey_p6_1_bulletproof_waterfall.sql` | **Migration** | **Bulletproof** — Net Distribuable · `compute_revenue_waterfall()` — [§ P6.1](#p61--bulletproof-waterfall-cible) |
| — | ~~`odyssey_p6_1_scan_sessions.sql`~~ | *(absorbé P6)* | `scan_sessions` inclus dans P6 Partie B |
| 18 | `odyssey_p7_media_quota_guard.sql` | **Migration** | **Storyboard S3** — trigger `enforce_media_asset_quota()` — voir [§ P7](#p7--garde-fou-quota-de-medias-package-aware) |
| — | `odyssey_p0_storage_policies_REFERENCE.sql` | **Référence** | Policies bucket `user-assets` — **Dashboard Storage uniquement** (pas SQL Editor). |
| — | `odyssey_p4_partner_token_qa_seed.sql` | **Seed QA** | Partenaire fictif + 100 jetons — **après P4**, hors chaîne prod. |
| — | `odyssey_partner_tenant_branding_example.sql` | **Référence** | Mise à jour `tenants.settings` (`brand_label`, `brand_logo_url`) — Salon connexion. |
| — | `odyssey_schema_health_check.sql` | **Référence** | Audit lecture seule — migrations P0–P5.5, RPC branding. |

**Branding Salon (app)** : champs dans `tenants.settings` — voir [`docs/ROUTES_AND_AUTH.md`](../ROUTES_AND_AUTH.md), [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) et le script exemple ci-dessus. **P5.2** (connexion) + **P5.3 ou P5.4** (dashboard) + membership partenaire (seed P4 QA).

---

## Convention de nommage

| Préfixe | Signification |
|---------|----------------|
| **P0–P5** | Migrations numérotées — ordre obligatoire sur base vierge. |
| **P4.1, P2b** | Patch ciblé — à exécuter après la migration parente. |
| **REFERENCE** | Documentation / policies hors SQL Editor. |
| **Seed / QA** | Données de test — jamais en pipeline CI prod automatique. |

### Requêtes ad hoc — SQL Editor Supabase

**Toujours nommer l’onglet** (pas « Untitled query »). Format recommandé :

```
[P5.x | QA | ops] — Description courte — YYYY-MM-DD
```

Exemples :

| Titre SQL Editor | Usage |
|------------------|--------|
| `QA — Branding tenant Urgel Bourgie — 2026-06-16` | `UPDATE tenants.settings` + vérif SELECT |
| `QA — Seed partenaire demo + 100 jetons` | Exécution `odyssey_p4_partner_token_qa_seed.sql` |
| `P5.1 — Index unique invitation pending` | Migration `odyssey_p5_1_invitation_unique_pending.sql` |

Dans le corps du script, reprendre le même titre en en-tête de commentaire (comme les fichiers `odyssey_p*.sql` du repo).

### Ménage SQL Editor Supabase

Les requêtes sauvegardées dans le **dashboard Supabase** ne sont pas dans Git — seul toi peux les trier. Méthode recommandée :

1. **Audit base** — exécuter `odyssey_schema_health_check.sql` (onglet : `ops — Schema health check`).
2. **Source de vérité** — garder uniquement les scripts du repo `docs/sql/` ; le reste est historique ou doublon.
3. **Classer chaque onglet** :

| Action | Critère |
|--------|---------|
| **Garder** | Référence / QA réutilisable, titre explicite, aligné repo |
| **Archiver** | Migration déjà appliquée (health check OK) — renommer préfixe `[ARCHIVE]` |
| **Supprimer** | `Untitled query`, doublon exact, script supplanté par un `odyssey_p*.sql` du repo |

4. **Ne pas supprimer** sans health check : migrations P0–P5.1 non confirmées en base.

Scripts **déjà appliqués** sur ta prod actuelle (à ne ré-exécuter que si health check échoue) : P0 → P5.1 selon résultats du health check.

Scripts **jamais à supprimer du repo** : fichiers `odyssey_p*.sql` (historique versionné). Le ménage concerne les **onglets Supabase**, pas le dossier Git.

---

## P6 — Freemium + RevShare (B2B2C v2)

**Fichier :** `odyssey_p6_freemium_revshare.sql` *(appliqué — fondation Phase A)*  
**Prérequis :** P5 + P5.5 appliqués.

### Partie A — Commerce Phase A (logique active T1–T7)

| Objet | Rôle |
|-------|------|
| **`tenants.is_freemium`** | `boolean` default `false` — modèle commercial **par tenant** (freemium vs jetons legacy) |
| **`partner_commission_balances`** | Agrégat RevShare par tenant : `accrued_cents`, `paid_cents`, `pending_cents` |
| **`partner_commission_ledger`** | Journal append-only : `commission_accrual`, `commission_clawback`, `payout` — idempotence `stripe_event_id` |
| **`tribute_checkouts`** (ALTER) | Colonnes `commission_cents`, `commission_rate_bps`, `commission_status` ; package id `legendary` |
| **`accrue_partner_commission_for_checkout()`** | RPC idempotente — **base brut (legacy)** · à migrer P6.1 · `service_role` only |

### Partie B — Stubs Phase 2 (schéma only — pas de RPC métier en T1)

| Objet | Rôle | Activation prévue |
|-------|------|-------------------|
| **`projects.lifecycle_status`** | `active` → `grace_period` → `subscription_required` → `archived` | Phase 2 Sanctuaire MRR |
| **`media_assets.contributor_*`** | `contributor_type`, `contributor_email`, `review_status` | Semaine 3 Scanner async |
| **`consent_records`** | Preuve consentement Loi 25 (marketing / biometric) | Phase 2 CPL |
| **`project_access_tokens`** | Liens invités longue durée (`/contribute/[token]`) | Semaine 3 Scanner async |
| **`scan_sessions`** | Sessions Scanner QR + async | Semaine 3 |
| **`guest_micro_checkouts`** | Micro-transactions invités (≠ `tribute_checkouts`) | Semaine 4 Family Fund |
| **`family_tribute_fund_*`** | Solde + ledger allocation % invités → famille | Semaine 4 Family Fund |
| **`persons` / `person_faces`** | Stub LYRA Data Graph (embeddings hors DB) | Phase 2 |

Détail stratégique : [`VISION_PHASE_2.md`](../VISION_PHASE_2.md) §4 · commerce : [`PARTNER_REVSHARE.md`](../PARTNER_REVSHARE.md) · saga : [`B2B2C_COMMERCE.md`](../B2B2C_COMMERCE.md) v2.

**Seed QA recommandé (post-migration) :**

```sql
UPDATE public.tenants SET is_freemium = true WHERE slug = 'partner-qa-demo';
```

---

## P6.1 — Bulletproof waterfall (cible)

**Fichier :** `odyssey_p6_1_bulletproof_waterfall.sql` *(à créer — Phase 1 doc juillet 2026)*  
**Prérequis :** P6 appliqué.

| Objet | Rôle |
|-------|------|
| **`compute_revenue_waterfall()`** | Single source of truth : Gross → Platform Fee 10 % → **Net Distribuable** → commission 30 % |
| **`tribute_checkouts`** (ALTER) | `gross_payment_cents`, `platform_fee_bps`, `platform_fee_cents`, `net_distributable_cents` |
| **`partner_commission_ledger`** (ALTER) | Colonnes waterfall pour audit |
| **`accrue_partner_commission_for_checkout()`** | REPLACE — appelle `compute_revenue_waterfall` |
| **`clawback_partner_commission()`** | Clawback proportionnel à l’accrual snapshot |

**Spec doc :** [`PARTNER_REVSHARE.md`](../PARTNER_REVSHARE.md) § Annexe · **QA :** [`QA_P6_COMMISSION_WATERFALL.md`](../QA_P6_COMMISSION_WATERFALL.md).

**Exemple attendu post-migration :**

```sql
SELECT compute_revenue_waterfall(14900, 1000, 3000);
-- net_distributable_cents: 13410, commission_cents: 4023, platform_fee_cents: 1490
```

---

## P7 — Garde-fou quota de médias package-aware

**Fichier :** `odyssey_p7_media_quota_guard.sql` *(Storyboard refactor — ticket S3)*
**Prérequis :** P2 (`media_assets`) + P3 (`projects.wizard_state`).

| Objet | Rôle |
|-------|------|
| **`enforce_media_asset_quota()`** | Fonction trigger : lit `projects.wizard_state->>'basePackage'`, calcule le plafond (dupliqué depuis `wizardDeliverables.ts`), verrouille le projet (`pg_advisory_xact_lock`) et compare au `COUNT(*)` courant de `media_assets`. |
| **`trg_media_assets_quota_guard`** | `BEFORE INSERT ON media_assets FOR EACH ROW` — lève `media_quota_exceeded` si le plafond serait dépassé. |

**Pourquoi un trigger DB et pas une route API :** l'upload (`src/lib/uploads/mediaUploadService.ts`) écrit directement du navigateur vers Supabase Storage puis `media_assets`, sans route `POST /api/projects/[id]/media` intermédiaire. L'UI (`TributeWizard.tsx` + `MediaDropzoneAdapter.tsx`) bloque déjà l'utilisateur en amont via `packageMaxMediaItems(basePackage)`, mais seul un garde-fou côté base de données est réellement infalsifiable.

**Plafonds actuels** (à garder synchronisés manuellement avec `PACKAGE_MANIFEST` côté TS) :

| `basePackage` | Manifeste | `maxMediaItems` |
|---------------|-----------|------------------|
| `essential` | SOUVENIR | 50 |
| `signature` | HERITAGE | 125 |
| `heritage` | ETERNITE | 175 |
| `legendary` | LEGENDAIRE | 250 |

**Comportement non-destructif :** le trigger ne bloque que les **nouveaux** INSERT ; il ne supprime jamais de médias existants si un projet est rétrogradé vers un forfait plus petit après avoir dépassé son nouveau plafond.

---

## Modèle de données — vue rapide (post-P6)

```
auth.users
   │
   ├──→ public.profiles
   ├──→ public.tenant_members  (role: member | partner | partner_admin | …)
   │
   └──→ public.projects
           ├── tenant_id
           ├── invitation_id  → partner_invitations (P5, nullable)
           ├── wizard_state / wizard_step / last_saved_at
           └── user_id → profiles

public.tenants
   ├── slug (identifiant stable — liens ?partenaire=)
   ├── is_freemium (P6 — canal Souvenir 0 $)
   ├── settings jsonb (brand_label, brand_logo_url, revshare_bps, …)
   ├── partner_token_wallets   (PK tenant_id — legacy jetons)
   ├── partner_commission_balances (P6 — RevShare agrégat)
   ├── partner_commission_ledger   (P6 — journal commissions)
   ├── partner_invitations     (granted_package, status, magic link hash)
   └── (funérarium / vertical)

public.tribute_checkouts        (P5 + P6 — saga checkout v2)
   ├── checkout_mode: b2c | b2b_partner | b2b2c_family
   ├── granted_package / selected_package (+ legendary P6)
   ├── family_total_cents / commission_cents / commission_status
   └── status: pending → awaiting_payment → completed | failed | refunded

public.partner_token_ledger     (legacy jetons — coexistence)
public.partner_commission_ledger (P6 — RevShare, séparé des jetons)
```

Tables historiques inchangées : `media_assets`, `orders`, `billing_catalog`, `webhook_events`.

---

## Fonction SQL critique (P5)

| Fonction | Rôle |
|----------|------|
| `partner_tokens_for_granted_package(text)` | Legacy — mappe jetons (1/2/4) ; **0 pour freemium Souvenir** (app P6) |
| `debit_partner_tokens_for_checkout(uuid)` | Legacy — jetons · `partner_debited` (tenants non-freemium) |
| `accrue_partner_commission_for_checkout(...)` | **P6** brut (legacy) · **P6.1** Net Distribuable via `compute_revenue_waterfall()` |

---

## Trigger Supabase

`public.handle_new_user()` (SECURITY DEFINER) sur `auth.users` AFTER INSERT → `profiles` + `tenant_members` (tenant par défaut `humans`).

---

## Storage

Bucket `user-assets` — policies dans `odyssey_p0_storage_policies_REFERENCE.sql`. Chemin canonique :

```
projects/<project_id>/<yyyy>/<mm>/<dd>/<filename>
```

---

## Historique (fichiers supprimés du repo)

- `supabase_p0_rls_projects_orders_media_storage.sql` → `odyssey_p0_complete.sql`
- `odyssey_p1_tenant_members.sql` → `odyssey_p1_user_bootstrap.sql`
