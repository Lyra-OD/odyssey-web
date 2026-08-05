# Odyssey — Ciel du Sanctuaire · **Craft Bible**

**Statut : vivant · mis à jour 5 août 2026**  
**Complète :** [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) (vision produit / UX / lexique)  
**Ce doc =** *comment* on construit le ciel WebGL — layers, règles, anti-patterns, plan polish.

> Vision produit → `SANCTUARY_SKY.md`  
> Craft technique / visuel → **ce fichier**  
> Knobs / thème / presets → [`SANCTUARY_SKY_THEME.md`](SANCTUARY_SKY_THEME.md)

**Preview :** `/fr/contribute/test-ciel` (token `test-ciel`)  
**Entrée scène :** `SanctuaryUniverse.tsx`  
**Thème (couleurs, opacités, parallaxe) :** `constellation/skyTheme.ts` — **source de vérité des knobs** ; ne pas hardcoder dans les layers.

---

## 1. Promesse craft

Un ciel **vivant, digne, immersif** — pas un wallpaper néon.

- Gaz teal/mauve + voie lactée lisible + profondeur (parallaxe)  
- Filantes rares (directions aléatoires)  
- Plus tard : étoiles = **souvenirs** (pas dans ce polish décoratif)

Test craft :

> Sans toucher l’UI, on sent l’espace.  
> En bougeant la souris, on sent la profondeur.  
> Rien ne crie « WebGL demo 2018 ».

---

## 2. Stack des layers (ordre de rendu)

Du plus loin au plus près :

| # | Layer | Fichier | Rôle | Thème / parallaxe |
|--|--|--|--|--|
| −1 | **NebulaGasFar** | `NebulaGasFar.tsx` | Nébuleuse quasi noire (profondeur) | `gasFar` — skip `reduced` |
| −0.5 | **GhostStars** | `GhostStars.tsx` | Bokeh / optique soft | `ghostStars` — skip `reduced`/`mobile` |
| 0a | **NebulaGasRose** | `NebulaGasRose.tsx` | Magenta 2001, biais droite, plus loin | `gasRose` |
| 0b | **NebulaGasMauve** | `NebulaGasMauve.tsx` | Gaz mauve, plus loin / lent | `gasMauve` |
| 0c | **NebulaGasTeal** | `NebulaGasTeal.tsx` | Gaz teal + bande soft | `gasTeal` |
| 1 | **CosmicDust** | `constellation/CosmicDust.tsx` | Voile poussière sur l’axe voie lactée | `cosmicDust` |
| 2 | **StarDust band** | `constellation/StarDust.tsx` | Voie lactée (~96 % du budget étoiles) | `starsBand` (+ zoom-out compensate) |
| 3 | **StarDust field** | idem | Peu d’étoiles proches (~4 %) | `starsField` (+ zoom-out compensate) |
| 4 | **ShootingStars** | `constellation/ShootingStars.tsx` | Filantes sporadiques | `shootingStars` |
| — | **Constellation** | `SanctuaryUniverse` | Lueurs-mémoire | `constellation` |

**Infra :**
- `ForceRenderLoop` — frames idle (sans souris)  
- `ParallaxLayer` + `ParallaxProvider` — profondeur + stub intensité  
- `WheelZoom` + `FocusCamera` — zoom molette / focus étoile  
- `IdleCameraDrift` — dérive + breath + rares (knobs : `scene.idle` → [`SANCTUARY_SKY_THEME.md`](SANCTUARY_SKY_THEME.md))  
- `CameraRig` — légère rotation, × `intensity`  
- Seeds PRNG stables (`mulberry32`) — retoucher la bande **ne re-shuffle pas** le field
- `skyTheme.ts` — source de vérité couleurs / opacités / parallaxe / idle

---

## 3. StarDust — règles figées

### Split
- **band** : 100 % sur l’axe voie lactée (falloff centre → bords)  
- **field** : étoiles dispersées, plus grosses / plus proches  
- Budget desktop : `tierDustCount` → band **96 %**, field **4 %**  
- `reduced` : band seule

### Seeds
- `band` seed `0xba12d001` · `field` seed `0xf1e1d002`  
- Ne pas repasser à `Math.random()` non seedé pour la géométrie

### Respiration
- Continue, centrée sur **1.0** (GLSL `breath`) — OK, stable  
- **Scintillement sporadique bande = abandonné** (GLSL et JS : disparition ou effet invisible)

---

## 4. Parallaxe (état « ciné » + stub)

### Comportement
- Courbe non-linéaire : `shapePointer` → `pow(|p|, 1.4)` (petit geste = peu)  
- XY + **léger Z**  
- Inertie par layer (`lerp`)  
- Gaz en **micro-parallaxe inverse** (volume)

### Mode D (UI branchée)

```tsx
<SanctuaryUniverse
  mode={skyOpen ? "immersive" : "background"}
  onClose={() => setSkyOpen(false)}
  locale={locale}
/>
```

- **background** : `pointer-events: none` sur le canvas, parallaxe ×0.55, **pointeur fenêtre + dérive idle** (reste vivant derrière l’UI)  
- **immersive** : plein écran, parallaxe ×1, **Fermer** + **Esc**  
- Lexique : **Voir le ciel** / **See the sky**  
- `test-ciel` : démarre immersif ; Fermer → fond + CTA Voir le ciel  
- Sanctuaire réel : ciel en fond + bouton header  

---

## 5. Recette visuelle (ne pas dériver)

| À faire | À éviter |
|--|--|
| Teal `#3d9a94` + mauve `#7a628e` soft | Neon, bloom agressif, cœur blanc additif |
| Voile poussière sombre, opacity basse | Voile qui noie les étoiles |
| Filantes courtes, tête→queue en dégradé | Barres longues type « slash UI » |
| Fond (gaz/bande) stable, digne | Tout le ciel qui « nage » |
| Field rare mais lisible (profondeur) | Field trop nombreux = distrait la bande |

**Référence rejetée :** cœur néon additif type « Non non non » (juillet 2026).

---

## 6. Filantes (mix Kubrick × Premium · plan C)

- Grâce froide **sans** gros `Points` additif (pas de boule blanche)  
- Lisibilité au-dessus du Kubrick pur (opacité / longueur / fréquence)  
- Pool 5 · petites (~4,5–10,5 s) + grandes rares (~36–62 s)  
- Grandes = plus longues / un peu plus lentes, tip = extrémité de ligne  
- Archives : `_archive/ShootingStarsPremiumV1.tsx` (version flashy)  
- `tier === "reduced"` → off

---

## 7. Plan polish A→E (statut)

| | Chantier | Statut |
|--|--|--|
| **A** | Parallaxe ciné + stub intensité | ✅ |
| **B** | Poussière / voile (`CosmicDust`) | ✅ |
| **C** | Filantes premium | ✅ |
| **D** | Mode fond + « Voir le ciel » (UI) | ✅ stub + UI |
| **E** | Focus étoile → révèle média | ⏸ pause (polish après constellation) |
| **E′** | Éclipse Résonnante — constellation | 🚧 Acte I (anneaux + orbit) |
| **F** | Pont famille | ⏳ après E |
| **G** | Naissance d’étoile post-dépôt | ⏳ |
| **H** | Audio immersif (mute default) | ⏳ optionnel |
| **S** | Ciel screensaver (profondeur → intro Éclipse → veille) | 🚧 Phase 1 (Far + Ghost) |

### Roadmap screensaver (S)

Objectif : *« WTF I WANT THIS AS A SCREENSAVER »* — digne, léger GPU.

| Phase | Contenu | Perf |
|-------|---------|------|
| **1** | `NebulaGasFar` + `GhostStars` | ✅ — skip `reduced` ; Ghost aussi skip `mobile` |
| **2** | `ZodiacalLight` | 1 plane |
| **3** | `EclipseDisc` + intro immersif 1×/session | logo-ready |
| **4** | Eclipse rare + Aurora + StreakEcho | rares longs |
| **5** | Mode veille (UI fade + idle plus lent) | comportement |

**Sky Eclipse / logo :** l’Éclipse procédurale (Phase 3) est conçue comme **graine de marque** — si elle convainc, elle pourra remplacer `eclipse.mp4` / `eclipse_login.mp4` (chantier design system séparé). Corps neutre + corona ; couleur d’état = halo autour (comme [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §4.1). Ne pas confondre avec « Éclipse Résonnante » constellation (E′).

Règle de session : **une lettre / phase à la fois**, go explicite, valider sur `test-ciel`, commit sur demande.

---

## 8. Commits repères (craft)

| Commit | Sujet |
|--|--|
| `6ded642` | Base WebGL galaxy / `test-ciel` |
| `48643c9` | Gaz teal/mauve vivant |
| `99a2543` | Dual layers band + field |
| `a5a0639` | Filantes sporadiques |
| `2b2b44a` | Parallaxe ciné + stub mode |
| `cccf6bd` | Voile CosmicDust |
| `_archive/` | Prototypes canvas/DOM pré-WebGL |

---

## 9. Anti-patterns (leçons dures)

1. **Ne pas inventer du scintillement GLSL complexe** sur le champ (`floor(time)`, `if`, attributs custom) → étoiles invisibles (shader HMR / attribut à 0).  
2. **`useMemo(() => new ShaderMaterial, [])`** garde l’ancien programme au HMR → forcer `needsUpdate` ou hard refresh.  
3. **Attribut custom non lié = 0** chez Three.js → alpha 0 = tout disparait.  
4. **Ne pas toucher la bande** quand on ajuste le field (et inversement) — seeds séparées + go ciblé.  
5. **Sans `ForceRenderLoop` + `frameloop="demand"`**, l’idle ne vit que si la souris bouge.  
6. Un layer isolé (filantes, dust) > patch global risqué.

---

## 10. Comment tester

1. Dev server + `/fr/contribute/test-ciel`  
2. **Hard refresh** après changement shader / material  
3. Idle 5–10 s : gaz + dust + respiration + filante éventuelle  
4. Souris douce vs grand geste : courbe non-linéaire  
5. Optionnel : `<SanctuaryUniverse mode="background" />` pour stub ×0.4  

---

## 11. Fichiers clés

```
src/components/contribute/
  SanctuaryUniverse.tsx          # scène + mode stub
  constellation/
    NebulaGas.tsx
    CosmicDust.tsx
    StarDust.tsx
    ShootingStars.tsx
    ParallaxLayer.tsx            # provider + shapePointer + layers
    CameraRig.tsx
    useVisualTier.ts
  _archive/                      # vieux ciels canvas / LueurSky
```

---

## 12. Mise à jour de cette bible

À chaque jalon craft (nouveau layer, règle figée, abandon d’effet) :
1. Mettre à jour le **tableau layers** et le **plan A→E**  
2. Noter l’anti-pattern si on s’est brûlé  
3. Commit doc du type : `docs(sanctuary): update sky craft bible`

*Prochaine entrée attendue : plan F (pont famille) ou G (naissance post-dépôt).*

---

## 13. Révélation E (mock)

- Constellation **réactivée en immersif seulement**
- Centre = **Lueur / hero** — pas de photo (canon)
- Tap (sans drag) sur satellite **avec** `memory` → `MemoryReveal` (1 photo)
- Esc ferme d’abord le souvenir, puis le ciel
- Médias = picsum mock (`mockSouls.ts`) — brancher dépôts réels plus tard
