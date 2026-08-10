# Odyssey — Marque Éclipse (logo vivant)

**Statut :** ✅ validé (10 août 2026) — étape craft importante  
**Produit code :** [`OdysseyEclipseMark`](../src/components/contribute/OdysseyEclipseMark.tsx)  
**Recette source de vérité :** [`eclipseLogoRecipe.ts`](../src/components/contribute/constellation/eclipseLogoRecipe.ts)  
**Lab craft (permanent) :** `/fr/contribute/test-eclipse` — **ne pas supprimer**  
**Preview marque :** `/fr/contribute/test-eclipse-mark`

Ce document est la **bible + handoff** : quoi, pourquoi, recette exacte, comment reproduire ou envoyer ailleurs.

---

## 1. Qu’est-ce que c’est

La marque Odyssey Éclipse = **trou noir fixe** + **soleil presque occulté** + **corona soie** + **diamond bas** (glow logo), le tout **vivant**.

Ce n’est **pas** un GIF magique. L’animation vient de la matière shader pilotée par **Vie = 1** :

| Couche | Effet vivant |
|--------|----------------|
| Vie | Master : soie, breath, crawl, photon, flash |
| Irrégularité | Plumes / Baily (caractère fibreux) |
| Flash / diamond | Bead bas, glow Odyssey |
| Micro-breath soleil | Intensité / limbe (trou noir fixe) |

**Lab vs marque**

| Surface | Rôle |
|---------|------|
| `/fr/contribute/test-eclipse` | Craft permanent — knobs, poses, captures |
| `/fr/contribute/test-eclipse-play` | Lecture cinéma (essai) |
| `/fr/contribute/test-eclipse-mark` | Preview produit de la marque |
| `OdysseyEclipseMark` | Composant à brancher dans l’UI |

Le lab **reste toujours disponible** dans le projet. La marque en est un **extrait figé**, pas un remplacement.

---

## 2. Recette officielle (knobs)

Source : craft lab, session 10 août 2026. Miroir code : `ECLIPSE_LOGO_RECIPE`.

| Knob (lab) | Clé code | Valeur |
|------------|----------|--------|
| Pos. soleil | `alignment` | **1.000** |
| Vie / drift | `lifeAmp` | **1.00** |
| Intensité corona | `coronaAmp` | **0.35** |
| Diffusion corona | `coronaSpread` | **0.40** |
| Irrégularité | `coronaIrregular` | **1.95** |
| Rayons / streamers | `coronaRays` | **0.00** |
| Douceur corona | `coronaSoft` | **0.40** |
| Anneau photon | `photonAmp` | **0.00** |
| Flash / diamond | `diamondAmp` | **2.60** |
| Trou noir | `moonScale` | **0.99** |
| Soleil | `sunScale` | **0.97** |

**Règles**

- `lifeAmp = 1` → la marque **vit**. `0` → figée (capture / print via `animate={false}`).
- Irrégularité haute = look fibreux validé ; Vie seule suffit pour une soie douce.
- Ne pas confondre avec `public/eclipse_login.mp4` (fond connexion Halo-Éclipse) ni le wordmark texte `OdysseyConnexionMark`.

---

## 3. Fichiers code

| Fichier | Rôle |
|---------|------|
| [`eclipseLogoRecipe.ts`](../src/components/contribute/constellation/eclipseLogoRecipe.ts) | Constantes recette |
| [`OdysseyEclipseMark.tsx`](../src/components/contribute/OdysseyEclipseMark.tsx) | Composant marque (Canvas + Bloom) |
| [`EclipseDisc.tsx`](../src/components/contribute/constellation/EclipseDisc.tsx) | Shader craft (matière) |
| [`EclipseCraftLab.tsx`](../src/components/contribute/EclipseCraftLab.tsx) | Lab knobs |
| [`EclipseMarkPreview.tsx`](../src/components/contribute/EclipseMarkPreview.tsx) | Page preview |

---

## 4. Comment reproduire (n’importe qui)

### A. Dans le projet (recommandé)

1. Dev server : ouvrir `/fr/contribute/test-eclipse-mark` → marque vivante.
2. Ou lab `/fr/contribute/test-eclipse` → dialer les knobs du §2 (Vie = 1).
3. Utiliser en UI :

```tsx
import { OdysseyEclipseMark } from "@/src/components/contribute/OdysseyEclipseMark";

<OdysseyEclipseMark size={64} animate />
```

- `animate={false}` → Vie coupée (image figée).
- `fill` + parent `aspect-square` → taille responsive.

### B. Modifier la recette

1. Itérer dans le **lab** jusqu’à validation visuelle.
2. Copier les readouts numériques dans `ECLIPSE_LOGO_RECIPE`.
3. Mettre à jour **ce document** (§2) dans le même commit.
4. Vérifier `/test-eclipse-mark`.

### C. Envoyer ailleurs / handoff externe

Donner ce fichier + pointer :

- Preview : `…/fr/contribute/test-eclipse-mark` (dev)
- Recette tableau §2
- Code : `eclipseLogoRecipe.ts` + `OdysseyEclipseMark.tsx`

**Export** (hors scope produit pour l’instant) : capture PNG avec `animate={false}`, ou enregistrement écran / WebM depuis la preview. Pas encore de pipeline Lottie/SVG officiel.

---

## 5. Ce que ce logo n’est pas

| Asset | Différence |
|-------|------------|
| `eclipse_login.mp4` | Vidéo fond connexion (Halo-Éclipse) — neutre, plein écran |
| Wordmark « Odyssey » | Typo Montserrat, pas le disque |
| Intro Sanctuaire ciel | Chrono flash→ciel — **pas encore** branchée ; craft séparé |
| Favicon / App Store | À dériver plus tard en statique |

---

## 6. Principes craft à respecter

- Blanc Odyssey, soie FBM sur `dir` (pas de seam `atan`).
- Trou noir **fixe** ; soleil derrière en pose logo (`alignment = 1`).
- Pas de flash aveuglant / starburst comic / damier cell4 (REJECT lab).
- Vie découplée d’Irrégularité : soie vivante même à irreg basse.

Journal craft : [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md) · Design system : [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §4.2 · Ciel : [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md).

---

## 7. Checklist handoff

- [ ] Preview mark vivante OK
- [ ] Recette §2 = `eclipseLogoRecipe.ts`
- [ ] Lab toujours accessible
- [ ] Doc DESIGN_SYSTEM / PROJECT_STATUS à jour
- [ ] Pas de confusion avec `eclipse_login.mp4`
