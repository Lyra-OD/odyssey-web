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

### Canvas (les deux phases)

Deux WebGL empilés :

1. **Ciel** — `SanctuaryUniverse` en `mode="background"` (`z-0`)
2. **Craft** — Canvas transparent (`alpha: true`, `premultipliedAlpha: false`, clear alpha 0, `z-[1]`)

**Ne pas** coller `EffectComposer` / Bloom sur le Canvas craft : le buffer post-process devient opaque et perce un trou noir dans le ciel. Le halo du beam se fait **dans le shader** (gaussiennes + `AdditiveBlending`).

**Ne pas** écrire `gl_FragColor.a = 0` : avec un Canvas en alpha droit, le navigateur fait `couleur × 0` → invisible. Toujours une **vraie alpha**.

Caméra craft : `CAMERA_DEFAULTS` = Phase 1 cam (`z: 9.50`, `y: −2.90`), lookAt `(0, 2, 0)`.

---

### Phase 2 — Recette actuelle (14 août 2026, soir)

Ce n’est **plus** un cône 3D rempli + raymarch. Deux calques indépendants :

| Calque | Mesh | Shader | Blending |
|---|---|---|---|
| **Nuages** | `InstancedMesh` de billboards (`WormholeCloudPuffs`) | FBM 2D, disques mous | Normal, alpha réelle |
| **Beam** | `PlaneGeometry` face caméra (`WormholeBeam3D`) | Gaussiennes 2D (recette `WormholeCraftShader`) + coude Phase 1 | `AdditiveBlending` |

Le volume-cône `WormholeCloud3D` (Worley raymarch) est **en sommeil** (`CLOUD_DEFAULTS.alpha = 0`). Ne pas le réactiver comme “peau” du wormhole.

#### UI Phase 2

| Bouton | Groupe | Contenu |
|---|---|---|
| **1 — Nuages** | 5 couches `PuffKnobs` : A / B / C / Voiles / Poussière | Couleur + pos XYZ + étendue Y + amas / taille / dispersion / densité / bouillon / opacité |
| **2 — Cyan** | `BeamKnobs` | Rayon bas/haut · Coude · Position · Longueur · Intensité · couleur |
| **3 — Cam** | `CameraKnobs` | Cam Z · Cam Y |

Les nuages **ne suivent pas** le chemin du cône rose : chaque couche a sa propre position. Objectif : amas à côté du faisceau, éclairés plus tard par le cyan — pas un fuseau collé au beam.

#### Beam — recette shader (KEEP)

Portée de [`WormholeCraftShader.tsx`](../src/components/contribute/constellation/WormholeCraftShader.tsx) (Phase 2 shaders 2D d’origine) :

- Plan vertical, `lookAt` cylindrique (face caméra, Y conservé)
- Largeur = `mix(radiusBottom, radiusTop, nY)` dans le vertex + **même coude** que Phase 1 (`sin(nY × π)`)
- Fragment : `nx = uv.x * 2 − 1`
  - `core = exp(-nx² × 14)` → blanc
  - `midGlow = exp(-nx² × 2.8)` → cyan (`beam.color`, défaut `#00e5ff`)
  - `haze / bloom` plus larges → halo sans post-process
  - scintillement `noise` qui monte
- `gl_FragColor = vec4(col, a)` avec `a = beam × uAlpha` — **jamais alpha 0**

**Defaults géométrie beam** = specs Phase 1 Cyan (`BEAM_DEFAULTS`) :

| Contrôle | Valeur |
|---|---|
| Rayon bas | `2.20` |
| Rayon haut | `0.00` |
| Coude (force) | `4.00` |
| Coude (direction) | `4.70` |
| Coude (0=figé) | `0.00` |
| Position X / Y / Z | `0.00` / `3.90` / `1.30` |
| Longueur | `14.00` |
| Intensité | `0.95` |
| Couleur | `#00e5ff` |

#### Nuages — 5 couches (`PUFF_*_DEFAULTS`)

Billboards 2×2, `lookAt` caméra, bruit FBM, alpha = `body × uAlpha`.

| Couche | Couleur | Pos X/Y/Z | Amas | Taille | Disp. | α |
|---|---|---|---|---|---|---|
| **A** | `#c2186e` | −2.40 / 1.20 / 0.60 | 8 | 2.80 | 1.40 | 0.72 |
| **B** | `#ff3d9a` | 2.20 / 2.00 / −0.50 | 8 | 2.50 | 1.50 | 0.68 |
| **C** | `#9a4a78` | 0.10 / −0.80 / 1.10 | 10 | 3.10 | 1.80 | 0.70 |
| **Voiles** | `#9a6fad` | 0 / 3.40 / 0.20 | 12 | 3.60 | 3.20 | 0.38 |
| **Poussière** | `#6a8a88` | 0 / 2.00 / 0 | 22 | 0.95 | 4.20 | 0.32 |

Z trop loin (ex. `−8.5`) envoie les amas **derrière** la scène. Caméra à `z ≈ 9.5` : rester grosso modo entre `−2` et `+4`.

#### Ordre des sliders beam (aligné Phase 1)
1. Rayon bas → 2. Rayon haut → 3–5. Coude → 6–8. Position XYZ → 9. Longueur → 10. Intensité

---

## Roadmap

| # | Action | Statut |
|---|---|---|
| **A** | Géométrie Phase 1 (wireframe, coude ancré) | ✅ |
| **S** | 5 couches puffs indépendantes du cône | ✅ en craft |
| **Beam 2D** | Plan gaussien additif (pas un cône opaque) | ✅ |
| **Ciel** | Canvas craft transparent, **sans** Bloom post-process | ✅ contrainte |
| **L** | Éclairer les puffs par la position monde du cyan | 🔜 (sans les recoller au fuseau, sans alpha 0) |
| **P** | Particules blanches montantes | 🔜 |
| **N** | Nappe de base | 🔜 |
| **G** | Grain — seulement si le ciel est dans **le même** Canvas | 🔜 |
| **F** | Peaufinage GIF | 🔜 |

### Diagnostic (14 août 2026 — 19h)

- Phase 1 : ✅ référence géométrique
- Phase 2 beam : ✅ lame cœur blanc + halo cyan (recette 2D), plus un triangle cyan plein
- Phase 2 nuages : ⚠️ visibles, encore plats / couleurs à sculpter ; pas volumétriques type GIF
- Abandonné pour l’instant : cône Worley, raymarch dans le fuseau, Bloom `EffectComposer` sur overlay

### Pièges déjà payés (ne pas reproduire)

1. Cône 3D opaque = triangle cyan plat, pas le beam GIF
2. Puffs en blending normal **sombres** = trou noir sur le ciel
3. `alpha = 0` + Canvas non pré-multiplié = tout disparaît
4. Bloom post-process sur Canvas transparent = silhouette noire
5. Nuages collés à la spline rose/cyan = un seul tube lumineux, pas des nuages

---

## Historique

| Date | Action |
|---|---|
| 13 août 2026 | Pivot 3D : `CylinderGeometry` vue extérieure, vertex displacement (snake wave) |
| 13 août 2026 | Shaders Phase 2 : `WormholeCloud3D` (Worley+FBM) + `WormholeBeam3D` (nDotV) |
| 14 août 2026 | Refactor UI : boutons 1/2/3 Phase 1, knobs indépendants, bend ancré aux extrémités |
| 14 août 2026 | Bloom ajouté, vertex shader Phase 2 migré vers bend (abandon snake wave) |
| 14 août 2026 | Specs Phase 1 calibrées et figées comme defaults (voir tableaux ci-dessus) |
| 14 août 2026 | Phase 2 : 5 puffs indépendants + beam plan gaussien additif ; Bloom overlay retiré |
