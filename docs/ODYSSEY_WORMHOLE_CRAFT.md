# Odyssey Wormhole — Craft (construction étape par étape)

**URL :** `/fr/contribute/test-wormhole`  
**Shader :** [`WormholeCraftShader.tsx`](../src/components/contribute/constellation/WormholeCraftShader.tsx)

## Référence GIF (effet cible)

Décomposé en couches — pas un shader monolithique :

1. **Faisceau central** : cône lumineux blanc→cyan, se resserre en pointe (perspective).
2. **Amas de nuages roses** : localisé à mi-hauteur, autour du faisceau (pas toute la hauteur).
3. **Nappe de base** : nuages bruns/teal larges en bas (sol de nébuleuse).
4. **Particules** : montent le long du faisceau.
5. **Bloom** : glow fort sur le cyan + le rose.

Chaque couche existe déjà quelque part dans le projet (gaz Sanctuaire, `ShootingStars`, `Bloom` de `@react-three/postprocessing` dans `EclipseCraftPlay`) — on assemble, on n'invente pas un nouveau shader "nuage".

## Étape 1/5 — Faisceau seul (actuel)

- Cône godray blanc → cyan (`shootingStars.rareTints.teal` : tip/mid/tail), additive blending
- Scintillement vertical léger (streaks), pas de FBM nuage
- Knobs : vitesse/contraste scintillement, intensité, hauteur apex
- Palette `defaultSkyTheme` uniquement

## Suite

| Étape | Contenu |
|-------|---------|
| **2** | Amas de nuages roses (`gasRose`/`gasMauve`) localisé à mi-hauteur du faisceau |
| **3** | Nappe de base large (bas d'écran) |
| **4** | Particules montantes (adapter `ShootingStars.tsx` en vertical) |
| **5** | `<Bloom>` (`@react-three/postprocessing`) sur faisceau + amas rose |

## Historique

- Étape 2.1/2.2 (masque V + parois FBM) — **abandonné** : rendu "pixel/Mode-7", pas organique. Remplacé par l'approche en couches ci-dessus.
- Étape 1 (ciel `craftLite`) — KEEP, inchangé.

*Dernière révision : 13 août 2026 — reset étape 1, approche en couches (faisceau).*
