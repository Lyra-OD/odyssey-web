# Parcours UX — Plan technique (démo 10 sept 2026)

**Type :** living · **Vérité pour :** ce qu’on **code** cette semaine pour une démo **jeudi 10 sept 2026**. Pas le rêve 0→12 entier.  
**Dernière MAJ :** 3 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 3 sept 2026 — Ciel invité : **FR/EN sans recharger** le Canvas (`replaceState` + les deux copies).
- 3 sept 2026 — Ciel invité : **drag pour se promener** · molette = s’approcher.
- 3 sept 2026 — Ciel invité : **pas de scroll page** · overlay G1 laisse passer souris/molette.
- 3 sept 2026 — Ciel invité : Hero KEEP + breath · caméra **sur l’axe**.
- 3 sept 2026 — T1/T2 restyle wizard (monolithe indigo) · courriel **dès l’écran 1** · T3 **annulé** · T4 packs.

**Statut :** **actif** — source : [`PARCOURS_UX_STORYBOARD_INVITE.md`](PARCOURS_UX_STORYBOARD_INVITE.md) · orga figé : [`PARCOURS_UX_STORYBOARD_VOULU.md`](PARCOURS_UX_STORYBOARD_VOULU.md)

**Règle démo :** placeholder **documenté** > craft incomplet. Si l’humain comprend le beat, c’est jouable.

---

## 0. Ce que tu présentes jeudi (script ~6 min)

1. **Orga** (déjà là) : étape Inviter → copier le lien. Pas de nouveau wizard.
2. **Invité** (téléphone ou 2ᵉ onglet) : ouvre `/fr/contribute/{token}` → **ciel de X** (pas le form tout de suite).
3. **Une saisie** : photos (max 5) **et/ou** un mot + **prénom** + **courriel obligatoire** (même écran).
4. **Une étoile à son nom** se greffe au ciel (stub HTML 2D + filament CSS). Le fichier est dans le Coffre.
5. **Aider la famille** : catalogue payant (voix, témoignage, Lueur, générique, mécène), même charte wizard. Skip *Non merci* → ciel.
6. **Retour orga** : Coffre / médias du wizard — la photo invité est là.

**Hors script jeudi :** éclipse, rituel constellation 12 signes, filaments WebGL, nouveaux SKU (vidéo dans le film), 25/50/100 ans, ciel de famille.

---

## 1. Déjà en prod (on ne recrée pas)

| Brique | Où |
|--------|-----|
| Lien public | `app/[lang]/contribute/[token]` |
| Ciel + Hero | `SanctuaryLanding` · `SanctuaryUniverse` |
| Formulaire photo / mot / courriel | `SanctuaryDepositForm` (monolithe indigo) |
| Insert Coffre | `POST /api/contribute/[token]/deposit` → `media_assets` `contributor_type=guest` |
| Liste médias orga | `GET /api/projects/[id]/media` (pas de filtre anti-guest) |
| Packs + Stripe | `ImprintCatalog` · `ImprintCheckoutCta` · `guestSupportPacks.ts` |
| Cercle (noms, API) | `GET /api/contribute/[token]` → `circle[]` — overlay 2D `GuestStarPills` |

---

## 2. Trous à boucher (ordre)

### T1 — Ciel d’abord (G1) · **fait**

Phase `sky` : ciel plein écran, *Ciel de {prénom}*, CTA *Laisser un souvenir*. Puis phase `deposit`.

### T2 — Dépôt + étoile (G2) · **fait** (restyle 3 sept)

- **Même charte que le wizard orga** : `SanctuaryMonolith` (`parcours-monolith-glass`, halo cyan, CTA `connexionSubmitButtonClass`). Pas de carte `bg-white/[0.03]`.
- **Un écran** : nom + photos ET/OU mot + **courriel obligatoire** + consentement. Plafond **5 photos**.
- Au succès : phase `graft` — stub **HTML 2D** : pastille + prénom + filament CSS depuis le Hero. Illusion de greffe à la constellation. **WebGL sur rails = Phase 2.**
- Une personne = une étoile (même token / même nom : pas une étoile par photo).

### T3 — Courriel séparé · **annulé**

Le courriel n’est plus un palier après le dépôt. Il vit sur l’écran T2. Pas de `PATCH /identity` cette semaine.

### T4 — Aide payante (G4) · **en cours / cadre posé**

Le catalogue **existe**. Cadre démo :

- Seulement après la greffe (T2).
- Titre : *Aider la famille à concevoir le film* (clés FR+EN).
- Skip *Non merci* → ciel (G5) avec leur étoile.
- Même monolithe indigo que le dépôt.
- **Tenant démo :** `viral_loop_enabled` **ON** ([`../ops/VIRAL_LOOP_PILOT_RUNBOOK.md`](../ops/VIRAL_LOOP_PILOT_RUNBOOK.md)) sinon les packs / Fonds ne se voient pas en checkout. Pas de nouveaux SKU.

### T5 — Coffre orga (preuve) · **P0 démo**

Vérifier en vrai : photo guest `upload_status=uploaded` visible étape médias. Si un filtre UI les cache → 1 correctif, pas une nouvelle pièce.

### T6 — Copy + mobile · **P1** (FR/EN ciel **fait**)

Clés Sanctuaire hors dur. Catalogue. Passe 390 px (le script est téléphone). Sur le ciel invité, FR/EN **ne remonte pas** le Canvas (`onSwitch` + `replaceState`).

---

## 3. Calendrier (3 → 10 sept)

| Jour | Livrable |
|------|----------|
| **Jeu 3** | Plan · T1/T2 restyle + courriel écran 1 · T4 cadre packs |
| **Ven 4** | T4 polish (sélection, checkout preview) · T5 Coffre vérifié |
| **Sam 5** | *(ex-T3)* filet T4 + mobile 390 px |
| **Dim 6** | Copy FR+EN · token démo flag ON |
| **Lun 7** | Répétition script |
| **Mar 8** | Bugs |
| **Mer 9** | Filet |
| **Jeu 10** | Démo |

Si on décroche : **garder le stub 2D** (pastille CSS + filament). Ne pas ouvrir le WebGL rails.

---

## 4. Hors cette semaine

- Chemin 1 beats 0–5 (éclipse, freeze, 12 signes).
- Filaments / Lueur dans le graphe WebGL (Phase 2).
- Mini-clip 30 s, nouveaux SKU G4.
- Réécrire `PARCOURS_UX_CHEMIN_1_TRAVERSEE.md` ligne à ligne.
- API `PATCH /api/contribute/[token]/identity` (T3 annulé).

---

## 5. Fichiers (T1–T4)

- `src/components/contribute/SanctuaryLanding.tsx` — phases `sky` → `deposit` → `graft` → `bridge`
- `src/components/contribute/SanctuaryMonolith.tsx` — charte wizard
- `src/components/contribute/SanctuaryDepositForm.tsx` — photos ET/OU mot + courriel
- `src/components/contribute/GuestStarPills.tsx` — stub 2D + filament
- `src/components/contribute/ImprintCatalog.tsx` · `ImprintCheckoutCta.tsx` — T4
- `dictionaries/fr.json` + `en.json` · `node scripts/export-copy-catalog.mjs`
- Tests : `tests/business/guest-deposit-souvenir.test.ts`

---

## 6. Critère « démo OK »

Un inconnu avec le lien : voit X → dépose (photo/mot **et** courriel) **sur le même écran** → **voit son prénom se greffer au ciel** → voit des options payantes (ou skip) → l’orga retrouve le fichier dans le Coffre.

Le Stripe live d’un pack = bonus, pas bloquant si le pont s’ouvre.
