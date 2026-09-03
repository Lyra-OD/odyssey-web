# Parcours UX — Storyboard voulu (Invité)

**Type :** living · **Vérité pour :** ce que **la nièce** voit et ressent, beat par beat.  
**Dernière MAJ :** 3 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 3 sept 2026 — **Figé CEO :** dépôt → **1 étoile** (leur nom + souvenir) **et** Coffre · courriel **forcé** (nouvelles du film) · puis **aide payante** (catalogue qui s’enrichit).
- 3 sept 2026 — Rail : lien → ciel de X → 5 photos ou 1 mot → courriel.

**Statut :** rail **aligné CEO**. Plan code : [`PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md). Toucher le Hero ou un bouton = détail d’écran.

**Liens :**
- Orga : [`PARCOURS_UX_STORYBOARD_VOULU.md`](PARCOURS_UX_STORYBOARD_VOULU.md)
- Surface : `/[lang]/contribute/[token]` · `SanctuaryLanding` · `SanctuaryDepositForm`
- Packs (grille, pas à recopier) : [`../FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) §2 · [`../IMPLEMENTATION_CASCADE_VFINAL.md`](../IMPLEMENTATION_CASCADE_VFINAL.md)

Copy écran = clés FR+EN au code.

---

## 0. Une phrase

**Lien → ciel de X → ils déposent (5 photos ou 1 mot) → une étoile à leur nom s’allume, le souvenir est aussi dans le Coffre → courriel obligatoire (nouvelles du film) → on leur propose d’aider la famille à concevoir le film (options payantes, de plus en plus).**

---

## 1. Une étoile, deux endroits

S’ils déposent, **les deux** arrivent :

| Où | Quoi |
|----|------|
| **Constellation** | **Une** étoile à **leur nom**, avec le souvenir qu’ils viennent de laisser. |
| **Coffre** | Le **même** souvenir (fichiers / mot), pour que l’orga fasse le film. |

**Une personne = une étoile.** Cinq photos ne font pas cinq étoiles : elles remplissent le Coffre et restent accrochées à **leur** étoile.

Le **Hero** = toujours X. Leur étoile = plus petite.  
La **Lueur** et les autres aides = **achats**, après le courriel — pas le dépôt gratuit.

---

## 2. Beats

### G0 — Le lien

L’orga envoie. Ils ouvrent. Pas de prix dans le message.

### G1 — Ciel de X

Ils voient le ciel de **[prénom]**. Le Hero est là. Pas le catalogue payant.

Geste pour ouvrir le dépôt : bouton **ou** toucher le Hero — au craft.

### G2 — Déposer (gratuit)

Jusqu’à **5 photos** **ou** **1 mot**.  
Nom pour signer l’étoile.

**À cet instant :** leur étoile s’allume (nom + souvenir) **et** le souvenir entre dans le Coffre.

Pas encore le courriel. Pas encore l’argent.

### G3 — Courriel (forcé)

**Après** le dépôt. On ne saute pas.

Ton type Soft Cap : *Si vous voulez des nouvelles du film…*  
C’est **voulu** (suivre l’hommage) et **légal** (consentement / contact). Pas un compte Odyssey.

Sans courriel : on n’enchaîne pas vers l’aide payante, et on n’a pas de suite « nouvelles du film ».

### G4 — Aider la famille à concevoir le film

**Ensuite.** Proposition claire, skip possible.

Aujourd’hui le catalogue existe déjà (voix, témoignage, coproduction / générique, Lueur, mécène).  
**Plus tard on ajoute** : témoignage vidéo **intégré au film**, nom au générique, et d’autres portes — **sans changer ce beat** : c’est toujours « aider à concevoir le film ».

Prix : grille canon, pas ici.

### G5 — Partir / revenir

Le ciel avec **leur** étoile. Même lien pour ajouter une photo (si &lt; 5) ou revoir.

---

## 3. vs le code aujourd’hui

| Aujourd’hui | Voulu |
|-------------|--------|
| Formulaire dès l’ouverture (tout mélangé) | Ciel d’abord, puis dépôt |
| Cercle = dépôt **ou** paiement, pas d’étoile nommée au ciel | Dépôt → **étoile nommée** + Coffre |
| Courriel optionnel dans le même form | Courriel **après**, **forcé**, motif film |
| Packs tout de suite après *Continuer* | Packs **après** courriel, cadre « aider la famille » |
| Catalogue figé | **Même porte**, options qui s’ajoutent (vidéo dans le film, générique…) |

---

## 4. Hors scope

- Plan technique (API identity, stub vs WebGL) — [`PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md).
- Liste exhaustive des futurs SKU — on les accroche à G4.
- Toucher Hero vs bouton.
