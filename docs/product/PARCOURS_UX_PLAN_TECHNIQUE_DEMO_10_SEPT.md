# Parcours UX — Plan technique (démo 10 sept 2026)

**Type :** living · **Vérité pour :** ce qu’on **code** cette semaine pour une démo **jeudi 10 sept 2026**. Pas le rêve 0→12 entier.  
**Dernière MAJ :** 3 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 3 sept 2026 — Ouverture : slice **invité G1→G4** + Coffre orga. Stub étoile. Packs déjà là.

**Statut :** **actif** — source : [`PARCOURS_UX_STORYBOARD_INVITE.md`](PARCOURS_UX_STORYBOARD_INVITE.md) · orga figé : [`PARCOURS_UX_STORYBOARD_VOULU.md`](PARCOURS_UX_STORYBOARD_VOULU.md)

**Règle démo :** placeholder **documenté** > craft incomplet. Si l’humain comprend le beat, c’est jouable.

---

## 0. Ce que tu présentes jeudi (script ~6 min)

1. **Orga** (déjà là) : étape Inviter → copier le lien. Pas de nouveau wizard.
2. **Invité** (téléphone ou 2ᵉ onglet) : ouvre `/fr/contribute/{token}` → **ciel de X** (pas le form tout de suite).
3. Laisse **une photo** (ou un mot) + **son prénom**.
4. **Une étoile à son nom** s’allume (stub OK). Le fichier est dans le projet.
5. **Courriel obligatoire** (*nouvelles du film*).
6. **Aider la famille** : catalogue payant existant (voix, témoignage, Lueur, générique, mécène). Skip OK.
7. **Retour orga** : Coffre / médias du wizard — la photo invité est là.

**Hors script jeudi :** éclipse, rituel constellation 12 signes, filaments craft, nouveaux SKU (vidéo dans le film), 25/50/100 ans, ciel de famille.

---

## 1. Déjà en prod (on ne recrée pas)

| Brique | Où |
|--------|-----|
| Lien public | `app/[lang]/contribute/[token]` |
| Ciel + Hero | `SanctuaryLanding` · `SanctuaryUniverse` |
| Formulaire photo / mot | `SanctuaryDepositForm` |
| Insert Coffre | `POST /api/contribute/[token]/deposit` → `media_assets` `contributor_type=guest` |
| Liste médias orga | `GET /api/projects/[id]/media` (pas de filtre anti-guest) |
| Packs + Stripe | `ImprintCatalog` · `ImprintCheckoutCta` · `guestSupportPacks.ts` |
| Cercle (noms, API) | `GET /api/contribute/[token]` → `circle[]` — **pas encore collé au ciel** |

---

## 2. Trous à boucher (ordre)

### T1 — Ciel d’abord (G1) · **P0 démo**

`SanctuaryLanding` aujourd’hui : welcome + formulaire dès `ready`.

- Phase `sky` : ciel plein écran, prénom de X, CTA *Laisser un souvenir* (bouton ; toucher Hero = bonus si ça tient).
- Puis phase `deposit`.

Copy → `dictionaries` FR+EN, pas les strings actuelles du `.tsx`.

### T2 — Dépôt puis étoile (G2) · **P0 démo**

- Formulaire **sans** courriel. Nom requis (signe l’étoile).
- **5 photos XOR 1 mot** (UI + API : si une photo existe pour ce token, refuser un mot, et l’inverse). Plafond photos 5 inchangé.
- Au succès : **stub étoile** — un nœud plus petit que le Hero + **prénom** (Html / label). Pas de filament craft.
- Une personne = une étoile (même token / même nom : on **n’ajoute pas** une étoile par photo).

Donnée : réutiliser `circle` du GET (déjà dérivé des dépôts). Brancher sur le canvas ou un overlay 2D si WebGL est trop risqué cette semaine.

### T3 — Courriel forcé (G3) · **P0 démo**

Nouveau palier **après** le premier dépôt, **avant** les packs.

- Motif : *nouvelles du film* + case consentement (déjà dans le form — la **déplacer** ici).
- Bloquant pour passer à G4.
- Persister `contributor_email` sur les `media_assets` de ce token (aujourd’hui l’email part **avec** le dépôt, optionnel). Nouveau `PATCH /api/contribute/[token]/identity` (ou champ post-dépôt) — ne pas perdre le souvenir si le PATCH échoue : retry, pas rollback fichier.

### T4 — Aide payante (G4) · **P0 démo**

Le catalogue **existe**. On change l’**ordre** et le **cadre** :

- Seulement après T3.
- Titre : aider la famille à concevoir le film (clés FR+EN).
- Skip → ciel (G5) avec leur étoile.
- **Tenant démo :** `viral_loop_enabled` **ON** ([`../ops/VIRAL_LOOP_PILOT_RUNBOOK.md`](../ops/VIRAL_LOOP_PILOT_RUNBOOK.md)) sinon les packs / Fonds ne se voient pas en checkout. Pas de nouveaux SKU.

### T5 — Coffre orga (preuve) · **P0 démo**

Vérifier en vrai : photo guest `upload_status=uploaded` visible étape médias. Si un filtre UI les cache → 1 correctif, pas une nouvelle pièce.

### T6 — Copy + mobile · **P1**

Clés Sanctuaire hors dur dans `SanctuaryLanding` / `SanctuaryDepositForm`. Catalogue. Passe 390 px (le script est téléphone).

---

## 3. Calendrier (3 → 10 sept)

| Jour | Livrable |
|------|----------|
| **Jeu 3** | Plan · T1 commencé (ciel d’abord) |
| **Ven 4** | T1 fini · T2 dépôt XOR + stub étoile |
| **Sam 5** | T3 courriel + PATCH identity |
| **Dim 6** | T4 cadre packs · T5 Coffre vérifié |
| **Lun 7** | Copy FR+EN · mobile · token démo flag ON |
| **Mar 8** | Répétition script · bugs |
| **Mer 9** | Filet |
| **Jeu 10** | Démo |

Si on décroche : **couper T2 craft** (étoile = pastille CSS + nom, zéro WebGL extra) avant de couper T3.

---

## 4. Hors cette semaine

- Chemin 1 beats 0–5 (éclipse, freeze, 12 signes).
- Filaments / Lueur dans le graphe.
- Mini-clip 30 s, nouveaux SKU G4.
- Réécrire `PARCOURS_UX_CHEMIN_1_TRAVERSEE.md` ligne à ligne.

---

## 5. Fichiers probables (pas de big bang)

- `src/components/contribute/SanctuaryLanding.tsx` — phases
- `src/components/contribute/SanctuaryDepositForm.tsx` — sans email
- `app/api/contribute/[token]/deposit/route.ts` — XOR + email optionnel au POST
- `app/api/contribute/[token]/identity/route.ts` — **nouveau**
- Overlay étoile : `SanctuaryUniverse` **ou** Html au-dessus (préférer Html pour jeudi)
- `dictionaries/fr.json` + `en.json` · `node scripts/export-copy-catalog.mjs`
- Tests : dépôt XOR · identity PATCH · landing phases (vitest, pas E2E obligatoire)

---

## 6. Critère « démo OK »

Un inconnu avec le lien : voit X → dépose → **voit son prénom dans le ciel** → **doit** donner un courriel → voit des options payantes → l’orga retrouve le fichier dans le Coffre.

Le Stripe live d’un pack = bonus, pas bloquant si le pont s’ouvre.
