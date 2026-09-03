# Parcours UX — Storyboard voulu (Invité)

**Type :** living · **Vérité pour :** ce que **la nièce** voit et ressent, beat par beat.  
**Dernière MAJ :** 3 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 3 sept 2026 — Courriel **sur le même écran** que photo/mot (G3 absorbé dans G2). Puis greffe étoile, puis aide payante.
- 3 sept 2026 — Photos **ET/OU** mot (plus de XOR).
- 3 sept 2026 — **Figé CEO :** dépôt → **1 étoile** (leur nom + souvenir) **et** Coffre · courriel **forcé** · puis **aide payante**.

**Statut :** rail **aligné CEO**. Plan code : [`PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md). Toucher le Hero ou un bouton = détail d’écran.

**Liens :**
- Orga : [`PARCOURS_UX_STORYBOARD_VOULU.md`](PARCOURS_UX_STORYBOARD_VOULU.md)
- Surface : `/[lang]/contribute/[token]` · `SanctuaryLanding` · `SanctuaryDepositForm`
- Packs (grille, pas à recopier) : [`../FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) §2 · [`../IMPLEMENTATION_CASCADE_VFINAL.md`](../IMPLEMENTATION_CASCADE_VFINAL.md)

Copy écran = clés FR+EN au code.

---

## 0. Une phrase

**Lien → ciel de X → ils déposent tout d’un coup (5 photos et/ou 1 mot + nom + courriel) → une étoile à leur nom se greffe au ciel, le souvenir est aussi dans le Coffre → on leur propose d’aider la famille à concevoir le film (options payantes, skip possible).**

---

## 1. Une étoile, deux endroits

S’ils déposent, **les deux** arrivent :

| Où | Quoi |
|----|------|
| **Constellation** | **Une** étoile à **leur nom**, avec le souvenir qu’ils viennent de laisser. |
| **Coffre** | Le **même** souvenir (fichiers / mot), pour que l’orga fasse le film. |

**Une personne = une étoile.** Cinq photos ne font pas cinq étoiles : elles remplissent le Coffre et restent accrochées à **leur** étoile.

Le **Hero** = toujours X. Leur étoile = plus petite.  
La **Lueur** et les autres aides = **achats**, après le dépôt — pas le dépôt gratuit.

Démo 10 sept : greffe = **stub HTML 2D** (pastille + filament CSS). Rails WebGL = Phase 2.

---

## 2. Beats

### G0 — Le lien

L’orga envoie. Ils ouvrent. Pas de prix dans le message.

### G1 — Ciel de X

Ils voient le ciel de **[prénom]**. Le Hero est là. Pas le catalogue payant.

Geste pour ouvrir le dépôt : bouton **ou** toucher le Hero — au craft.

### G2 — Déposer (gratuit) + courriel

**Un écran**, charte wizard (monolithe indigo). Jusqu’à **5 photos** **et/ou** **1 mot**. Nom pour signer l’étoile. **Courriel obligatoire** (*nouvelles du film*) + consentement.

**À cet instant :** leur étoile se greffe au ciel (nom + souvenir) **et** le souvenir entre dans le Coffre.

Pas encore l’argent.

### G3 — *(absorbé dans G2)*

Plus d’étape courriel séparée. Le motif *nouvelles du film* / légal reste, sur l’écran de saisie.

### G4 — Aider la famille à concevoir le film

**Ensuite.** Même monolithe. Proposition claire, skip *Non merci* possible.

Aujourd’hui le catalogue existe déjà (voix, témoignage, coproduction / générique, Lueur, mécène).  
**Plus tard on ajoute** : témoignage vidéo **intégré au film**, nom au générique, et d’autres portes — **sans changer ce beat** : c’est toujours « aider à concevoir le film ».

Prix : grille canon, pas ici.

### G5 — Partir / revenir

Le ciel avec **leur** étoile. Même lien pour ajouter une photo (si &lt; 5) ou revoir.

---

## 3. vs le code aujourd’hui

| Aujourd’hui | Voulu |
|-------------|--------|
| Ciel d’abord, puis dépôt monolithe | Aligné (T1/T2) |
| Courriel sur l’écran 1, forcé | Aligné (ex-T3 absorbé) |
| Stub 2D + filament depuis le Hero | Aligné démo ; WebGL Phase 2 |
| Packs après greffe, cadre « aider la famille », skip | T4 |

---

## 4. Hors scope

- Plan technique (stub vs WebGL) — [`PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md).
- Liste exhaustive des futurs SKU — on les accroche à G4.
- Toucher Hero vs bouton.
