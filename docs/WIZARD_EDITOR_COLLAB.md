# Wizard Co-Créateur — Contrat & Threat Model (Phase A)

**Statut :** Phase A figée · UI non commencée · Backend = Phase B  
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

Le Co-Créateur **peut** choisir la musique (Stingray / MP3 + ToS). Les frais licence / Soft Cap / checkout restent à la charge du Titulaire.

---

## 2. Cycle de vie du lien (contrat)

```
Owner ──POST collab-link──► mint token_hash (purpose=wizard_editor, TTL 14j)
                            revoke tout wizard_editor actif du projet (≤1 outstanding)
         ◄── URL /[lang]/collab/[token]

Nièce ──GET/POST redeem──► verify hash · !revoked · !expired
                            pose cookie httpOnly signé { projectId, tokenId, role:editor, exp }
                            revoke token (one-shot URL)
                            redirect Studio mode editor (step ∈ {3,4,5})
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

### Contre-mesures (Phase B — obligatoires)

| Surface | Blocage |
|---------|---------|
| `POST /api/checkout` | `requireProjectOwner` **uniquement** — cookie editor → **403** (`canCheckout`) |
| `GET …/fund-balance` | Owner only — editor → **403** (`canViewFundBalance`) |
| `POST …/contribute-link` · `POST …/collab-link` | Owner only |
| `PATCH …/autosave` | Si session editor : strip hors whitelist · refuse pricing/extensions/essentials |
| Navigation Wizard | Clamp steps `{3,4,5}` côté shell **et** refuse `wizard_step` hors scope en autosave editor |
| Token URL fuité | TTL 14 j · one-shot redeem · revoke owner · unique index 1 actif / projet |
| Storage / RLS | Pas d'élargissement RLS `authenticated` : uploads editor via **routes API** + vérif cookie (comme Guest = service_role après gate) |

### Hors scope V1

- Compte Odyssey obligatoire pour la nièce.  
- Multi-éditeurs concurrents / CRDT.  
- Realtime Supabase (hydrate `last_saved_at` suffit).  
- Kill-switch cookie distant à chaque régénération de lien (option V1.1 : `metadata.sessionEpoch`).

---

## 5. Critères Done Phase A

- [x] Types capabilities + allowlist autosave + TTL constants  
- [x] SQL P11 `wizard_editor` + index 1 actif  
- [x] Threat model documenté  
- [ ] **Ops :** exécuter `odyssey_p11_wizard_editor_collab.sql` sur Supabase avant Phase B intégration

---

## 6. Phase B — Backend (statut)

| Endpoint | Accès |
|----------|--------|
| `POST /api/projects/[id]/collab-link` | Owner only (+ 403 si cookie editor) |
| `POST /api/collab/redeem` | Public token → cookie httpOnly signé + revoke one-shot |
| `GET/PATCH /api/projects/[id]/autosave` | Owner **ou** editor (whitelist) |
| `GET/DELETE/PATCH …/media*` | Owner **ou** editor |
| `GET/POST …/music` | Owner **ou** editor |
| `POST /api/checkout` | Owner only — editor → **403** `canCheckout` |
| `GET …/fund-balance` | Owner only — editor → **403** `canViewFundBalance` |
| `POST …/contribute-link` | Owner only — editor → **403** |

**Cookie :** HMAC-SHA256 (`WIZARD_EDITOR_COOKIE_SECRET` ou fallback `SUPABASE_SERVICE_ROLE_KEY`).  
**Helpers :** `resolveWizardCraftAccess` · `requireProjectEditor` · `rejectEditorForOwnerOnlyRoute` · `filterAutosavePatchForEditor`.

**Note upload Coffre :** l’upload navigateur→Storage (RLS owner) reste à brancher en Phase C pour l’éditeur (signed upload / route API). Liste + delete + reorder + autosave storyboard sont déjà ouverts.

---

## 7. Suite — Phase C (rappel)

1. Page `/[lang]/collab/[token]` → redeem  
2. Shell Wizard `accessRole=editor` steps `{3,4,5}`  
3. CTA mint lien (étapes 2 + 5)  
4. Upload médias editor via API/signed URL
