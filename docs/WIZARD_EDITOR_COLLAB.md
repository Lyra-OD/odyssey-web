# Wizard Co-Créateur — Contrat & Threat Model

**Statut :** Phase A+B livrées · **Phase C (UI + Signed Upload) livrée**  
**Règle d'or :** UI = confort · **API = loi**  
**Types :** [`src/lib/wizard/collabCapabilities.ts`](../src/lib/wizard/collabCapabilities.ts)  
**SQL :** [`docs/sql/odyssey_p11_wizard_editor_collab.sql`](sql/odyssey_p11_wizard_editor_collab.sql)

---

## 1. Rôles & scope

| Rôle | Auth | Étapes Wizard | Paiement |
|------|------|---------------|----------|
| **Owner** (Titulaire) | Session Odyssey (`projects.user_id`) | 1–7 | Oui (étape 7) |
| **Editor** (Co-Créateur) | Cookie httpOnly `wizard_editor` après redeem | **3, 4, 5** | Non |
| **Guest** | Token Sanctuaire `guest_contribute` | — (hors Wizard) | Support Packs invité |

Le Co-Créateur **peut** choisir la musique (Stingray / MP3 + ToS). Les frais licence / Soft Cap / checkout restent à la charge du Titulaire — **aucune UI tarifaire** côté éditeur.

---

## 2. Cycle de vie du lien (contrat)

```
Owner ──POST collab-link──► mint token_hash (purpose=wizard_editor, TTL 14j)
                            revoke tout wizard_editor actif du projet (≤1 outstanding)
         ◄── URL /[lang]/collab/[token]

Nièce ──GET /[lang]/collab/[token]──► CollabRedeemClient
         POST /api/collab/redeem ──► verify hash · !revoked · !expired
                            pose cookie httpOnly signé { projectId, tokenId, role:editor, exp }
                            revoke token (one-shot URL)
                            redirect /[lang]/studio (URL propre, sans ?collab_token=)
```

- **Jamais** de `?collab_token=` permanent sur `/studio`.
- Secret URL : 32 bytes base64url · **hash SHA-256** en DB (même famille que `contributeToken`).
- Cookie ≠ token URL : après redeem, le lien brut ne réouvre plus une session.

---

## 3. Capabilities (résumé)

Voir `getWizardCapabilities("editor" | "owner")`.

**Editor = true :** vault, music, montage, upload média, edit storyboard, choix musique, attestation ToS MP3.  
**Editor = false :** essentials, invite cercle, preview paywall, checkout, pricing, extensions, contribute-link, collab-link, fund-balance, export.

**Autosave editor (whitelist) :** `storyboard`, `musicRightsAttestation` uniquement.

---

## 4. Threat Model (bref)

### Objectifs attaquant

1. Payer / voir le Fonds / modifier le prix à la place du Titulaire.  
2. Élargir le scope (étapes 1, 2, 6, 7) via deep-link ou API.  
3. Réutiliser un lien collab fuité (historique, Referer, screenshot).  
4. Écrire dans `wizard_state` des champs finance (`pricing`, `extensions`, `intendedPackage`).

### Contre-mesures

| Surface | Blocage |
|---------|---------|
| `POST /api/checkout` | `requireProjectOwner` **uniquement** — cookie editor → **403** (`canCheckout`) |
| `GET …/fund-balance` | Owner only — editor → **403** (`canViewFundBalance`) |
| `POST …/contribute-link` · `POST …/collab-link` | Owner only |
| `PATCH …/autosave` | Si session editor : strip hors whitelist · refuse pricing/extensions/essentials |
| Navigation Wizard | Clamp steps `{3,4,5}` côté shell **et** refuse `wizard_step` hors scope en autosave editor |
| Token URL fuité | TTL 14 j · one-shot redeem · revoke owner · unique index 1 actif / projet |
| Storage / RLS | **Pas d'élargissement RLS `authenticated`** : uploads editor via **Signed Upload URL** (service_role mint) + `register` admin |

### Hors scope V1

- Compte Odyssey obligatoire pour la nièce.  
- Multi-éditeurs concurrents / CRDT.  
- Realtime Supabase (hydrate `last_saved_at` suffit).  
- Kill-switch cookie distant à chaque régénération de lien (option V1.1 : `metadata.sessionEpoch`).

---

## 5. Phase B — Backend (statut)

| Endpoint | Accès |
|----------|--------|
| `POST /api/projects/[id]/collab-link` | Owner only (+ 403 si cookie editor) |
| `POST /api/collab/redeem` | Public token → cookie httpOnly signé + revoke one-shot |
| `GET/PATCH /api/projects/[id]/autosave` | Owner **ou** editor (whitelist) |
| `GET/DELETE/PATCH …/media*` | Owner **ou** editor |
| `POST …/media/upload-url` | Owner **ou** editor — `createSignedUploadUrl` (admin) |
| `POST …/media/register` | Owner **ou** editor — upsert `media_assets` (admin, `owner_user_id` = titulaire) |
| `GET/POST …/music` | Owner **ou** editor |
| `POST /api/checkout` | Owner only — editor → **403** `canCheckout` |
| `GET …/fund-balance` | Owner only — editor → **403** `canViewFundBalance` |
| `POST …/contribute-link` | Owner only — editor → **403** |

**Cookie :** HMAC-SHA256 (`WIZARD_EDITOR_COOKIE_SECRET` ou fallback `SUPABASE_SERVICE_ROLE_KEY`).  
**Helpers :** `resolveWizardCraftAccess` · `requireProjectEditor` · `rejectEditorForOwnerOnlyRoute` · `filterAutosavePatchForEditor`.

---

## 6. Phase C — UI + Signed Upload (livré)

| Item | Implémentation |
|------|----------------|
| Entrée | `app/[lang]/collab/[token]` → `CollabRedeemClient` |
| Studio SSR | Cookie editor → charge projet via **admin** · `accessRole="editor"` · pas de redirect login |
| Shell | Clamp `{3,4,5}` · bannière Quiet Luxury `text-teal-400/50` · hide StickyPrice / Dossier / Invite / Soft Cap / Cart / Checkout |
| Upload Coffre | `uploadStrategy: "signed"` → `upload-url` → `uploadToSignedUrl` → `register` |
| Soft Cap médias (infra) | `register` bump silencieux `intendedPackage→signature` si freemium ≥50 (quota P8) — **pas** d'UI tarifaire éditeur |

### Ops SQL

1. **Obligatoire (si pas déjà fait) :** exécuter [`odyssey_p11_wizard_editor_collab.sql`](sql/odyssey_p11_wizard_editor_collab.sql) sur Supabase (`purpose=wizard_editor` + index 1 actif).  
2. **Signed Upload :** **aucune migration Storage RLS** supplémentaire. Les URLs sont mintées avec le **service_role** (`createSignedUploadUrl`) ; le client upload avec le token signé, puis `register` écrit via admin. Ne pas ouvrir de policy `authenticated` INSERT sur `user-assets` pour l’éditeur.

### QA manuelle (checklist)

- [ ] Mint lien collab (owner) → ouvrir `/[lang]/collab/[token]` en navigation privée  
- [ ] Cookie posé · redirect `/studio` · bannière « Mode Co-Créateur »  
- [ ] Étapes visibles = Coffre / Musique / Montage uniquement  
- [ ] Upload photo/vidéo OK (signed) · statut vert Coffre  
- [ ] Choix Stingray OK · **aucune** Soft Cap / prix  
- [ ] Autosave storyboard OK · F5 conserve l’état  
- [ ] `POST /api/checkout` avec cookie editor → **403**  
- [ ] Titulaire (owner) : Soft Cap + checkout inchangés

---

## 7. Suite éventuelle

- [x] CTA mint lien collab — `CollabInvitePanel` (header + étapes 2 & 5, owner only)
- Kill-switch sessionEpoch à la régénération de lien  
- Multi-éditeurs / présence
