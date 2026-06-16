# SQL Odyssey — état courant

> **Attention :** les `CHECK` et colonnes forfaits (`granted_package`, `selected_package`, `basePackage` côté app) utilisent les **IDs legacy** `essential`, `signature`, `heritage`. **Ne pas les renommer** en SQL sans migration P6+. Correspondance avec les noms commerciaux (Souvenir / Héritage / Éternité) : [`docs/DELIVERABLES_AND_PACKAGES.md`](../DELIVERABLES_AND_PACKAGES.md).

Ce dossier contient tous les scripts SQL qui décrivent la **vérité actuelle** de la base Supabase d'Odyssey. Tous les scripts de migration sont **idempotents** : on peut les ré-exécuter sans dégât.

**Commerce B2B2C (schéma + saga)** : voir [`docs/B2B2C_COMMERCE.md`](../B2B2C_COMMERCE.md).  
**Note :** les migrations P4–P5 sont en base ; le code Next.js (`/api/checkout`) n'utilise pas encore `tribute_checkouts` ni `debit_partner_tokens_for_checkout()`.

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

**Branding Salon (app, pas de migration dédiée)** : champs optionnels dans `tenants.settings` — `brand_label`, `brand_logo_url`. Voir [`docs/ROUTES_AND_AUTH.md`](../ROUTES_AND_AUTH.md).
| — | `odyssey_p0_storage_policies_REFERENCE.sql` | **Référence** | Policies bucket `user-assets` — **Dashboard Storage uniquement** (pas SQL Editor). |
| — | `odyssey_p4_partner_token_qa_seed.sql` | **Seed QA** | Partenaire fictif + 100 jetons — **après P4**, hors chaîne prod. |

---

## Convention de nommage

| Préfixe | Signification |
|---------|----------------|
| **P0–P5** | Migrations numérotées — ordre obligatoire sur base vierge. |
| **P4.1, P2b** | Patch ciblé — à exécuter après la migration parente. |
| **REFERENCE** | Documentation / policies hors SQL Editor. |
| **Seed / QA** | Données de test — jamais en pipeline CI prod automatique. |

---

## Modèle de données — vue rapide (post-P5)

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
   ├── settings jsonb (brand_label, brand_logo_url, …)
   ├── partner_token_wallets   (PK tenant_id, balance)
   ├── partner_invitations     (granted_package, status, magic link hash)
   └── (funérarium / vertical)

public.tribute_checkouts        (P5 — saga checkout)
   ├── checkout_mode: b2c | b2b_partner | b2b2c_family
   ├── granted_package / selected_package
   ├── partner_tokens_debited / family_total_cents
   └── status: pending → partner_debited → awaiting_payment → completed | compensated

public.partner_token_ledger
   └── tribute_checkout_id (FK nullable, P5)
```

Tables historiques inchangées : `media_assets`, `orders`, `billing_catalog`, `webhook_events`.

---

## Fonction SQL critique (P5)

| Fonction | Rôle |
|----------|------|
| `partner_tokens_for_granted_package(text)` | Mappe `essential`→1, `signature`→2, `heritage`→4 jetons. |
| `debit_partner_tokens_for_checkout(uuid)` | `FOR UPDATE` wallet + ledger + `tribute_checkouts.status = partner_debited`. Exécutable par **`service_role`** uniquement. |

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
