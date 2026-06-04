# SQL Odyssey — état courant

Ce dossier contient tous les scripts SQL qui décrivent la **vérité actuelle** de la base Supabase d'Odyssey. Tous les scripts sont **idempotents** : on peut les ré-exécuter sans dégât.

## Ordre d'exécution sur une base vierge

| # | Fichier                                          | Rôle                                                                                                  |
| - | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1 | `odyssey_p0_complete.sql`                        | Schéma P0 : table `orders`, RLS sur `projects`/`orders`/`media_assets`, index, grants service_role.   |
| 2 | `odyssey_p0_fix_grants.sql`                      | Patch ciblé : ré-applique les `GRANT` aux rôles `authenticated`/`service_role` si l'init P0 a planté. |
| 3 | `odyssey_p1_user_bootstrap.sql`                  | Multi-tenant : `tenant_members`, enrichissement `tenants`, trigger unifié `on_auth_user_created` qui peuple `profiles` + `tenant_members`, backfill des comptes existants. |
| 4 | `odyssey_p2_media_assets_schema_sync.sql`        | Alignement du schéma `media_assets` avec le payload du service d'upload (storage_path, mime_type, size_bytes, source, upload_status, order_index) + index + contrainte UNIQUE (project_id, storage_path). Repose sur les colonnes historiques `owner_user_id` et `tenant_id` (déjà NOT NULL). |
| 5 | `odyssey_p2b_media_assets_cleanup.sql`           | Patch ciblé : supprime la colonne `user_id` créée en doublon par une version antérieure du script P2 (convention DB officielle = `owner_user_id`). À exécuter une seule fois si tu vois encore `user_id` dans le schéma. |
| 6 | `odyssey_p3_wizard_autosave.sql`                 | Autosave du Tribute Wizard : colonnes `wizard_state` (jsonb), `wizard_step` (smallint, CHECK 1..10), `last_saved_at` (timestamptz) sur `projects` + index composite `(user_id, status, last_saved_at DESC)` pour la reprise rapide du brouillon. |
| 7 | `odyssey_p4_partner_token_wallets.sql`           | B2B : `partner_token_wallets` (solde par `tenant_id`) + `partner_token_ledger` ; débit via `POST /api/checkout` quand rôle partenaire (`pricingConfig` tokens). |
| 7 | `odyssey_p0_storage_policies_REFERENCE.sql`      | **Référence uniquement** : policies du bucket `user-assets`. À appliquer via Supabase Dashboard → Storage → Policies (le SQL Editor n'a pas les droits sur `storage.objects`). |

## Convention

- **P0** = sécurité de base (RLS, grants, structure orders).
- **P1** = couche multi-tenant (vertical → tenant → membership → profile).
- **P2** = alignement des schémas applicatifs avec le code (media_assets, etc.).
- **P3** = enrichissements parcours utilisateur (autosave wizard, reprise brouillon, etc.).
- **REFERENCE** suffix = à appliquer hors SQL Editor (Dashboard ou CLI).

## Modèle de données — vue rapide

```
auth.users
   │
   ├──→ public.profiles            (1:1, créé par trigger on_auth_user_created)
   │       └── id = auth.users.id
   │
   ├──→ public.tenant_members      (M:N, créé par même trigger)
   │       ├── user_id  → auth.users.id
   │       ├── tenant_id → public.tenants.id
   │       └── role
   │
   └──→ public.projects
           ├── user_id        → public.profiles.id
           ├── tenant_id      → public.tenants.id
           ├── status         (ENUM project_status : 'draft', 'submitted', 'paid', ...)
           ├── wizard_state   (jsonb)        — snapshot UI sérialisé pour autosave
           ├── wizard_step    (smallint 1..10)
           ├── last_saved_at  (timestamptz)
           └── (first_name, last_name, birth_date, death_date, ...)

public.tenants
   ├── id, name, slug, vertical, settings (jsonb), created_at
   └── 2 lignes seedées : "Verticale Humains" (humans/human) et "Verticale Animaux" (pets/pet)

public.media_assets
   ├── project_id     → public.projects.id (nullable historique)
   ├── owner_user_id  → auth.users.id (NOT NULL, convention DB Odyssey)
   ├── tenant_id      → public.tenants.id (NOT NULL)
   ├── storage_path, mime_type, size_bytes
   ├── source ('local' | 'facebook' | 'instagram' | 'tiktok' | 'google_photos')
   ├── upload_status ('queued' | 'uploaded' | ...)
   ├── order_index, created_at
   ├── (héritées non utilisées : file_type, display_order, status, file_hash)
   └── UNIQUE (project_id, storage_path)  -- requis pour upsert ON CONFLICT
```

⚠️ La colonne propriétaire est `owner_user_id` (pas `user_id`). Le service d'upload `src/lib/uploads/mediaUploadService.ts` mappe son paramètre `userId` vers cette colonne.

## Trigger Supabase

Une seule fonction `public.handle_new_user()` (SECURITY DEFINER) est appelée par le trigger `on_auth_user_created` sur `auth.users` AFTER INSERT. Elle peuple simultanément :
1. `public.profiles` (FK cible de `projects.user_id`).
2. `public.tenant_members` (rattachement au tenant par défaut, slug `humans`).

Tout autre trigger sur `auth.users` lié au bootstrap user doit passer par cette fonction unifiée.

## Storage

Le bucket `user-assets` est régi par les policies définies dans `odyssey_p0_storage_policies_REFERENCE.sql`. Le chemin canonique d'un fichier est :

```
projects/<project_id>/<yyyy>/<mm>/<dd>/<filename>
```

Les policies vérifient que `<project_id>` (segment 2 du path) appartient à `auth.uid()` via la table `projects`.

## Historique (fichiers supprimés)

- `supabase_p0_rls_projects_orders_media_storage.sql` — supersédé par `odyssey_p0_complete.sql` (mai 2026).
- `odyssey_p1_tenant_members.sql` — consolidé dans `odyssey_p1_user_bootstrap.sql` (ajout du bootstrap `profiles` + trigger unifié) (mai 2026).
