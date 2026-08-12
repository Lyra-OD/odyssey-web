# Odyssey — Marque Éclipse (logo vivant)

**Statut :** ✅ validé (11 août 2026) — **éclipse + nom ODYSSEY** (die-cut)  
**Produit code :** [`OdysseyEclipseMark`](../src/components/contribute/OdysseyEclipseMark.tsx)  
**Recette matière :** [`eclipseLogoRecipe.ts`](../src/components/contribute/constellation/eclipseLogoRecipe.ts)  
**Wordmark (shader) :** [`odysseyWordmarkTexture.ts`](../src/components/contribute/constellation/odysseyWordmarkTexture.ts) · die-cut dans [`EclipseDisc.tsx`](../src/components/contribute/constellation/EclipseDisc.tsx)  
**Lab craft (permanent) :** `/fr/contribute/test-eclipse` — **ne pas supprimer**  
**Preview marque :** `/fr/contribute/test-eclipse-mark`  
**Lecture cinéma :** `/fr/contribute/test-eclipse-play` — [map audio](./ODYSSEY_ECLIPSE_PLAY_AUDIO.md)

Ce document est la **bible + handoff** : quoi, pourquoi, recette exacte, comment reproduire ou envoyer ailleurs.

---

## 1. Qu’est-ce que c’est

La marque Odyssey Éclipse = **trou noir fixe** + **soleil presque occulté** + **corona soie** + **diamond bas** + **die-cut ODYSSEY** (photosphère du soleil visible *à travers* les lettres), le tout **vivant**.

> **Évolution (11 août 2026) :** la validation du 10 août couvrait la **matière** seule (disque + soie + diamond). Le lockup complet inclut désormais le **nom** — pas un overlay DOM, une **découpe shader** dans le masque lunaire.

Ce n’est **pas** un GIF magique. L’animation vient de la matière shader pilotée par **Vie = 1** ; le nom est une texture Montserrat Light branchée en craft (`uWordmark` / `wordmarkMul`).

| Couche | Effet vivant |
|--------|----------------|
| Vie | Master : soie, breath, crawl, photon, flash |
| Irrégularité | Plumes / Baily (caractère fibreux) |
| Flash / diamond | Bead bas, glow Odyssey |
| Micro-breath soleil | Intensité / limbe (trou noir fixe) |
| **Die-cut ODYSSEY** | Lettres découpées dans le noir → soleil à travers ; mapping aspect-correct (pas d’UV stretch) |

**Lab vs marque vs play**

| Surface | Rôle |
|---------|------|
| `/fr/contribute/test-eclipse` | Craft permanent — knobs, poses, captures |
| `/fr/contribute/test-eclipse-play` | Lecture cinéma : A bis + B (~9,5 s) KEEP |
| `/fr/contribute/test-wormhole` | Craft warp C (Quiet Luxury) — pas encore branché |
| `/fr/contribute/test-eclipse-mark` | Preview produit de la marque (pose logo) |
| `OdysseyEclipseMark` | Composant à brancher dans l’UI |

Le lab **reste toujours disponible**. La marque en est un **extrait figé** de la recette matière ; le **récit** du nom se voit surtout en play.

### État code (honnête)

| Pièce | État |
|-------|------|
| Matière (recette + Vie) | ✅ dans `OdysseyEclipseMark` |
| Die-cut ODYSSEY (shader + texture) | ✅ dans `EclipseDisc` craft |
| Apparition sync (lag soleil → nom) | ✅ `sampleCraftPlayChrono` / play |
| `wordmarkMul: 1` sur le **mark produit** | ✅ `OdysseyEclipseMark` (`showWordmark` défaut true) |
| Exports DA disc (`logo.*`) | ✅ matière seule (conservés) |
| Exports DA lockup (`lockup.*`) | ✅ matière + ODYSSEY |

---

## 2. Recette officielle (knobs matière)

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

### Wordmark (lockup)

| Élément | Valeur |
|---------|--------|
| Texte | **ODYSSEY** (majuscules) |
| Police | Montserrat Light (`--font-brand` / `font-light`) |
| Rendu | Texture canvas → `uWordmarkMap` ; punch dans `moonMask` |
| Intensité | `craft.wordmarkMul` 0→1 (`uWordmark`) |
| Mapping | Aspect-correct (lettres bord à bord, pas d’étirement) |
| Play (chrono) | Montée `softRiseVelvet(2.62, 4.55)` — **lag après** le soleil (`sunIn` 2.15→3.55) |

**Règles**

- `lifeAmp = 1` → la matière **vit**. `0` → figée (capture / print via `animate={false}`).
- Irrégularité haute = look fibreux validé ; Vie seule suffit pour une soie douce.
- Le die-cut montre le **soleil**, pas un fill blanc typo — ≠ `OdysseyConnexionMark`.
- Ne pas confondre avec `public/eclipse_login.mp4` (fond connexion Halo-Éclipse).

---

## 3. Fichiers code

| Fichier | Rôle |
|---------|------|
| [`eclipseLogoRecipe.ts`](../src/components/contribute/constellation/eclipseLogoRecipe.ts) | Constantes recette matière |
| [`odysseyWordmarkTexture.ts`](../src/components/contribute/constellation/odysseyWordmarkTexture.ts) | Masque canvas ODYSSEY |
| [`EclipseDisc.tsx`](../src/components/contribute/constellation/EclipseDisc.tsx) | Shader craft (matière + die-cut) |
| [`eclipseCraftTimeline.ts`](../src/components/contribute/constellation/eclipseCraftTimeline.ts) | Chrono play (dont `wordmarkMul`) |
| [`OdysseyEclipseMark.tsx`](../src/components/contribute/OdysseyEclipseMark.tsx) | Composant marque (Canvas + Bloom) |
| [`EclipseCraftLab.tsx`](../src/components/contribute/EclipseCraftLab.tsx) | Lab knobs |
| [`EclipseCraftPlay.tsx`](../src/components/contribute/EclipseCraftPlay.tsx) | Page lecture cinéma |
| [`EclipseMarkPreview.tsx`](../src/components/contribute/EclipseMarkPreview.tsx) | Page preview |

---

## 4. Comment reproduire (n’importe qui)

### A. Dans le projet (recommandé)

1. Dev server : `/fr/contribute/test-eclipse-mark` → lockup complet (matière + ODYSSEY).  
2. `/fr/contribute/test-eclipse-play` → récit naissance (lag soleil → nom).  
3. Ou lab `/fr/contribute/test-eclipse` → dialer les knobs du §2 (Vie = 1).  
4. Utiliser en UI :

```tsx
import { OdysseyEclipseMark } from "@/src/components/contribute/OdysseyEclipseMark";

<OdysseyEclipseMark size={64} animate />
```

- `animate={false}` → Vie coupée (image figée).
- `fill` + parent `aspect-square` → taille responsive.

### B. Exports pour DA (GIF / PNG animé)

Dossier : [`docs/brand/odyssey-eclipse/`](brand/odyssey-eclipse/)

| Famille | Fichiers | Contenu |
|---------|----------|---------|
| **Disc** | `odyssey-eclipse-logo.{gif,apng.png,mp4}` + `-still.png` | Matière seule |
| **Lockup** | `odyssey-eclipse-lockup.{gif,apng.png,mp4}` + `-still.png` | Matière + die-cut ODYSSEY |

Page capture : `/fr/contribute/test-eclipse-mark-export?variant=lockup` (ou `disc`).  
Script : `node scripts/capture-eclipse-logo.mjs` (voir README brand).

### C. Modifier la recette

1. Itérer dans le **lab** / **play** jusqu’à validation visuelle.  
2. Copier les readouts matière dans `ECLIPSE_LOGO_RECIPE`.  
3. Ajuster wordmark / chrono dans texture + `eclipseCraftTimeline` si besoin.  
4. Mettre à jour **ce document** dans le même commit.  
5. Vérifier play + mark.

### D. Envoyer ailleurs / handoff externe

Donner ce fichier + pointer :

- Play : `…/fr/contribute/test-eclipse-play` (lockup + récit)
- Preview : `…/fr/contribute/test-eclipse-mark`
- Recette tableau §2 + wordmark §2
- Code : `eclipseLogoRecipe.ts` + `odysseyWordmarkTexture.ts` + `EclipseDisc` + `OdysseyEclipseMark`
- Exports DA : `docs/brand/odyssey-eclipse/` (après regen)

---

## 5. Ce que ce logo n’est pas

| Asset | Différence |
|-------|------------|
| `eclipse_login.mp4` | Vidéo fond connexion (Halo-Éclipse) — neutre, plein écran |
| `OdysseyConnexionMark` | Typo Montserrat **blanc lumineux** (connexion) — pas le die-cut solaire |
| Intro Sanctuaire ciel | Finale play A–E (plongée → voyage → ciel) — [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md) ; pas encore codée au-delà du flash |
| Favicon / App Store | À dériver plus tard (matière ± monogramme) |

---

## 6. Principes craft à respecter

- Blanc Odyssey, soie FBM sur `dir` (pas de seam `atan`).
- Trou noir **fixe** ; soleil derrière en pose logo (`alignment = 1`).
- ODYSSEY = **découpe** dans le noir (soleil à travers), pas label flottant / DOM.
- Pas d’UV stretch sur le wordmark ; lettres larges, espacées bord à bord.
- Causalité play : soleil d’abord, nom en lag, hold, puis dolly.
- Naissance diamond / soleil : pop `softRiseVelvet` = **intention** (étoile qui s’allume) — détail [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md) §0c ; soleil KEEP.
- Pas de flash aveuglant / starburst comic / damier cell4 (REJECT lab).
- Vie découplée d’Irrégularité : soie vivante même à irreg basse.

Journal craft : [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md) · Audio play : [`ODYSSEY_ECLIPSE_PLAY_AUDIO.md`](ODYSSEY_ECLIPSE_PLAY_AUDIO.md) · Finale play : [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md) · Design system : [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §4.2 · Ciel : [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md).

---

## 7. Checklist handoff

- [ ] Play : die-cut ODYSSEY lisible, lag après soleil OK
- [ ] Preview mark : lockup + nom OK (`showWordmark`)
- [ ] Recette §2 = `eclipseLogoRecipe.ts`
- [ ] Exports DA **disc** + **lockup** présents
- [ ] Lab toujours accessible
- [ ] Doc DESIGN_SYSTEM / PROJECT_STATUS à jour
- [ ] Pas de confusion avec `eclipse_login.mp4` / `OdysseyConnexionMark`
