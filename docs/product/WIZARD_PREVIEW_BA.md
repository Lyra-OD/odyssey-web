# Étape 6 — Bande-annonce mix (à planifier)

**Type :** canon · **Vérité pour :** direction produit de l’aperçu wizard (pas le master Creatomate).  
**Dernière MAJ :** 17 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 17 sept 2026 — Décision CEO : mix **BA** (bande-annonce + lecture d’un chapitre). Pas maintenant — plan dédié ensuite.

**Wizard :** [`../WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md) (étape 6). **Export film :** [`../craft/CREATOMATE_RECIPE.md`](../craft/CREATOMATE_RECIPE.md). Soft Cap inchangé. Bandeau « pourquoi » : [`WIZARD_PREVIEW_SOFTCAP.md`](WIZARD_PREVIEW_SOFTCAP.md).

---

## Pourquoi

Le teaser actuel (diaporama 16:9, lecture auto, fades) **fait semblant d’être le film**. Les familles comparent au master. Ça fait pauvre.

On ne rattrape pas le rendu Creatomate dans l’étape 6. On **arrête de promettre un film**.

---

## Décision (verrouillée, non codée)

**Mix BA** — pas A seul, pas le Livre en lecture seule.

1. **Bande-annonce** (~30–45 s) : un souvenir fort par chapitre + **sa** musique, fondu Quiet Luxury. Pas une timeline complète.
2. **Voir ce chapitre** : ouvrir un chapitre pour vérifier souvenirs + piste (contrôle boomer, pas une 2ᵉ fausse pellicule).
3. **Copy honnête** : premier souffle / fil de l’histoire. Le film complet naît à l’export (~X min). Jamais « voici le film » comme vérité pixel.
4. **Hors scope ici :** render Creatomate, Ken Burns master, 1080p live, rejouer le DnD.

**Quand :** plan d’implémentation **plus tard**. Ne pas patcher le teaser actuel vers un faux-film.

---

## Aujourd’hui (runtime)

`PreviewStep` + `CinematicTeaser` : storyboard live, pause réelle, Payer armé (anti ghost-click). C’est un **pont**, pas la cible mix BA.

---

## Suite

Un plan chirurgical (copy FR/EN, UI BA + tiroir chapitre, N3) quand le CEO dit **go**. Soft Cap / checkout ne bougent pas avec ce chantier.
