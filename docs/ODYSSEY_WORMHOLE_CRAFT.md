# Odyssey Wormhole — Craft (construction étape par étape)

**URL :** `/fr/contribute/test-wormhole`  
**Lab :** [`WormholeCraftLab.tsx`](../src/components/contribute/WormholeCraftLab.tsx)  
**Shaders 3D :** [`WormholeRig3D.tsx`](../src/components/contribute/constellation/WormholeRig3D.tsx)

---

## Référence visuelle cible

GIF BBC — pilier d'énergie cosmique vu de l'extérieur :
- Faisceau central blanc → cyan très lumineux (surexposé)
- Nuages volumétriques rose → mauve → teal autour du faisceau
- Forme en V / cône inversé : large en bas, pointe en haut
- Mouvement vivant : bouillonnement des nuages, légère ondulation du pilier
- Bloom fort sur tous les éléments lumineux

---

## Architecture actuelle (Phase 1 + Phase 2)

### Phase 1 — Piliers wireframe (calibration géométrique)
Deux `CylinderGeometry` en wireframe, vue extérieure (DoubleSide).  
Sert à sculpter la forme parfaite **avant** d'appliquer les shaders.

**Composant :** `Phase1WaveMesh` dans `WormholeCraftLab.tsx`  
**Vertex shader :** coude unique ancré aux extrémités via enveloppe `sin(nY × π)`, direction boussole XZ (`uBendAngle`).

#### Specs calibrées — 14 août 2026

**Pilier Rose (tunnel cloud) — `P1_ROSE_DEFAULTS` :**

| Contrôle | Valeur |
|---|---|
| Rayon bas | `7.20` |
| Rayon haut | `0.00` |
| Coude (force) | `4.00` |
| Coude (direction) | `4.70` |
| Coude (0=figé) | `0.00` |
| Position X | `0.00` |
| Position Y (haut/bas) | `4.70` |
| Position Z | `0.40` |
| Longueur du pilier | `15.50` |

**Pilier Cyan (cône beam) — `P1_CYAN_DEFAULTS` :**

| Contrôle | Valeur |
|---|---|
| Rayon bas | `2.20` |
| Rayon haut | `0.00` |
| Coude (force) | `4.00` |
| Coude (direction) | `4.70` |
| Coude (0=figé) | `0.00` |
| Position X | `0.00` |
| Position Y (haut/bas) | `3.90` |
| Position Z | `1.30` |
| Longueur du pilier | `14.00` |

**Caméra — `P1_CAM_DEFAULTS` :**

| Contrôle | Valeur |
|---|---|
| Cam Z (recul) | `9.50` |
| Cam Y (hauteur) | `−2.90` |

---

### Phase 2 — Shaders 3D (rendu final)

Mêmes géométries qu'en Phase 1, avec shaders Worley+FBM+nDotV et Bloom.

**Composants :** `WormholeCloud3D` + `WormholeBeam3D` dans `WormholeRig3D.tsx`  
**Post-processing :** `EffectComposer` + `Bloom` (`@react-three/postprocessing`)  
  - `luminanceThreshold: 0.15` · `intensity: 1.8` · `mipmapBlur: true`

#### Contrôles Phase 2 (boutons 1-4)

| Bouton | Groupe | Contenu |
|---|---|---|
| **1 — Rose géo** | `CloudKnobs` | Rayon bas/haut · Coude · Position · Longueur |
| **2 — Rose mat** | `CloudKnobs` | Densité · Contraste · Auto-ombre · Bouillon · Scroll · Opacité |
| **3 — Cyan** | `BeamKnobs` | Rayon bas/haut · Coude · Position · Longueur · Intensité |
| **4 — Cam** | `CameraKnobs` | Cam Z · Cam Y |

> **Note :** les defaults Phase 2 (géométrie) seront calibrés séparément une fois les shaders finalisés.

#### Ordre des sliders (identique Phase 1 et Phase 2)
1. Rayon bas
2. Rayon haut
3. Coude (force)
4. Coude (direction)
5. Coude (0=figé)
6. Position X
7. Position Y (haut/bas)
8. Position Z
9. Longueur du pilier
10. *(Intensité — beam uniquement)*

---

## Roadmap shaders (étapes C à F)

| # | Action | Statut |
|---|---|---|
| **A** | Porter géométrie Phase 1 → Phase 2 (bend + height + position) | ✅ fait |
| **B** | Bloom post-processing (`@react-three/postprocessing`) | ✅ fait |
| **C** | Booster beam : cœur blanc surexposé + halo cyan large | 🔜 |
| **D** | Cloud multi-couches : 3 cylindres concentriques pour vraie profondeur | 🔜 |
| **E** | Affiner couleurs cloud (rose chaud → mauve → teal aux tips) | 🔜 |
| **F** | Peaufinage final : timings, opacités, coude animé | 🔜 |

---

## Historique

| Date | Action |
|---|---|
| 13 août 2026 | Pivot 3D : `CylinderGeometry` vue extérieure, vertex displacement (snake wave) |
| 13 août 2026 | Shaders Phase 2 : `WormholeCloud3D` (Worley+FBM) + `WormholeBeam3D` (nDotV) |
| 14 août 2026 | Refactor UI : boutons 1/2/3 Phase 1, knobs indépendants, bend ancré aux extrémités |
| 14 août 2026 | Bloom ajouté, vertex shader Phase 2 migré vers bend (abandon snake wave) |
| 14 août 2026 | Specs Phase 1 calibrées et figées comme defaults (voir tableaux ci-dessus) |
