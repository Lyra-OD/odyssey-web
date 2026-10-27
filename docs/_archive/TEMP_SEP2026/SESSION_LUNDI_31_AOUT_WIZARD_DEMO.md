# Session lundi 31 août 2026 (AM) — Wizard preview + setup démo Patrice

**Type :** temp · **Vérité pour :** plan d’exécution matinée · **pas** canon produit.  
**Durée cible :** ~3 h 30 (9 h → 12 h 30) · **Carte :** [`README.md`](README.md)

**Contexte :** démo Patrice **10 sept. 8 h** · calendrier [`PLAN_DEMO_PATRICE.md`](PLAN_DEMO_PATRICE.md) J-10.

**Décision validée (28 août) :**
- **A** — `/studio/test-wizard` dev : travailler les 7 étapes sans login (lundi AM = code).
- **C** — compte + tenant démo prod : parcours réel Patrice (lundi AM = setup + smoke).

---

## Objectifs fin de matinée

| # | Done when |
|---|-----------|
| 1 | `/fr/studio/test-wizard` ouvre en **local** · 7 étapes navigables · bandeau preview |
| 2 | Tenant démo identifié (`partner-qa-demo` ou Urgel) · branding OK |
| 3 | 3 comptes bookmarqués (directeur salon · famille studio · tel Sanctuaire) |
| 4 | **1 smoke** invitation Souvenir → Sanctuaire iPhone → Studio draft visible |

---

## Bloc 1 — Option A : page test wizard (9 h → 11 h)

### 1.1 Route dev (≈ 45 min)

| Tâche | Détail |
|-------|--------|
| Créer `app/[lang]/studio/test-wizard/page.tsx` | Même garde que labs : `NODE_ENV === "production"` → `notFound()` |
| Shell | Reprendre layout `/studio` (halos teal · wordmark · footer) **sans** auth redirect |
| URL | `http://localhost:3000/fr/studio/test-wizard` |

### 1.2 Mode preview sur `TributeWizard` (≈ 60 min)

| Tâche | Détail |
|-------|--------|
| Prop `previewMode?: boolean` | Quand `true` : pas de `projectId` · pas d’appels autosave / upload / checkout API |
| État local | Navigation steps 1–7 en mémoire client uniquement |
| Query dev | `?plan=essential` \| `heritage` \| `eternity` — reprendre logique `planOverride` existante |
| Bandeau UI | Fixe en haut : « Mode preview — rien n’est enregistré » (FR/EN · `dictionaries`) |
| Médias étape 3 | Placeholders ou 2–3 images statiques `/public` si upload off — **pas bloquant** |

**Fichiers touchés (estimation) :**
- `app/[lang]/studio/test-wizard/page.tsx` (nouveau)
- `src/components/tribute/TributeWizard.tsx` (early-return autosave si preview)
- `dictionaries/fr.json` + `en.json` · `node scripts/export-copy-catalog.mjs`

### 1.3 Smoke A (≈ 15 min)

- [ ] Ouvrir `/fr/studio/test-wizard?plan=essential`
- [ ] Parcourir étapes 1 → 7 sans erreur console
- [ ] Vérifier `/fr/studio/test-wizard` → **404** sur build prod (`npm run build` local OK)

---

## Bloc 2 — Option C : environnement démo Patrice (11 h → 12 h 30)

### 2.1 Tenant & branding (≈ 30 min)

| Tâche | Détail |
|-------|--------|
| Choisir tenant | **`partner-qa-demo`** (déjà en SQL/DA) **ou** slug Urgel dédié |
| Vérifier branding | `/fr/salon/connexion?partenaire=partner-qa-demo` — logo + halo |
| Doc URLs | Noter dans ce fichier § Comptes bookmarqués |

Réf. SQL : [`../sql/odyssey_partner_tenant_branding_example.sql`](../sql/odyssey_partner_tenant_branding_example.sql) · [`../design/DA_VERCEL_ACCESS.md`](../design/DA_VERCEL_ACCESS.md)

### 2.2 Comptes & bookmarks (≈ 30 min)

Créer ou valider **3 identités** (mots de passe dans vault — pas dans git) :

| Rôle | URL bookmark | Usage démo |
|------|--------------|------------|
| **Directeur salon** | `/fr/salon/connexion?partenaire=partner-qa-demo` | Beat 1 · invitation Souvenir |
| **Famille / Studio** | `/fr/studio/connexion` | Beats 3–5 · Coffre · Film · Finaliser |
| **Sanctuaire (tel)** | Lien `contribute/[token]` généré par invitation | Beat 2 · mobile |

- [ ] Compte directeur = `partner_admin` sur le tenant démo
- [ ] Compte famille = user studio **sans** rôle partenaire (éviter confusion UI)
- [ ] Onglets Chrome ordonnés : Salon · Studio · Commissions · (contribute)

### 2.3 Smoke C — parcours réel (≈ 30 min)

Ordre strict ([`MEETING_PATRICE_VP.md`](../MEETING_PATRICE_VP.md) §2.2) :

1. [ ] Salon → **1 invitation Souvenir** (email ou lien copié)
2. [ ] **iPhone Safari** → Sanctuaire · déposer 1 photo + 1 texte
3. [ ] Studio famille → étape 3 Coffre · média contribute visible
4. [ ] `/fr/salon/commissions` — page charge (chiffres OK ou vides)

**Noter les frictions** (bugs, lenteur, copy) en bas de ce fichier → backlog semaine.

---

## Hors scope lundi AM (reporté)

- Vidéo Mode B · QR A6 · Fonds `viral_loop_enabled` → **mar–jeu** (plan J-8 / J-7)
- Polish copy marketing Phase 2 accueil
- Refonte visuelle lourde wizard (utiliser preview pour itérer **après** le smoke C)

---

## Comptes bookmarqués (à remplir lundi)

| Rôle | Email | Notes |
|------|-------|-------|
| Directeur | _@_ | tenant `partner-qa-demo` |
| Famille | _@_ | draft démo |
| Token Sanctuaire | _url_ | généré invitation |

---

## Frictions smoke (à remplir lundi)

| # | Problème | Priorité |
|---|----------|----------|
| | | |

---

## Après-midi / mardi (si temps)

- Itérer wizard sur **preview** (étapes qui posent problème en smoke C)
- Curater **8–12 photos** pour Coffre démo Patrice
- Dry-run Mode A #1 chronométré (objectif **1er sept.**)

---

*Archiver avec `PLAN_DEMO_PATRICE.md` après le 10 sept.*
