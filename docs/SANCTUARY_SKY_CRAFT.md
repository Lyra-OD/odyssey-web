# Odyssey — Ciel du Sanctuaire · **Craft Bible**

**Statut : vivant · mis à jour 5 août 2026**  
**Complète :** [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) (vision produit / UX / lexique)  
**Ce doc =** *comment* on construit le ciel WebGL — layers, règles, anti-patterns, plan polish.  
**Dernière MAJ :** 24 août 2026

**Changelog** (max 5)
- 27 août 2026 — Vague 1 knobs shader (gaz · dust · stars · zodiacal · aurora · filantes) — [`craft/SKY_DEPTH_CRAFT.md`](craft/SKY_DEPTH_CRAFT.md).
- 27 août 2026 — Lab fond : contrat `SkyCraftState` + backup `/test-sky-legacy` — [`craft/SKY_DEPTH_CRAFT.md`](craft/SKY_DEPTH_CRAFT.md).
- 26 août 2026 — **S2 `SkyPanorama`** — fond NASA opt-in · layer `panorama` off prod par défaut.
- 26 août 2026 — **S1 `MilkyDustLanes`** — dark lanes · bande StarDust plus dense / serrée.
- 26 août 2026 — **EclipseDisc hors ciel ambiant** — labs `/test-eclipse*` + prologue J1 ; hors pool idle ambiant.

> Vision produit → `SANCTUARY_SKY.md`  
> Craft technique / visuel → **ce fichier**  
> Knobs / thème / presets → [`SANCTUARY_SKY_THEME.md`](SANCTUARY_SKY_THEME.md)  
> Screensaver + intro Éclipse → [`SANCTUARY_SKY_SCREENSAVER.md`](SANCTUARY_SKY_SCREENSAVER.md)

**Preview :** `/fr/contribute/test-ciel` (token `test-ciel`) · **Lab fond :** [`craft/SKY_DEPTH_CRAFT.md`](craft/SKY_DEPTH_CRAFT.md) (`/fr/contribute/test-sky` · backup `test-sky-legacy`)  
**Entrée scène :** `SanctuaryUniverse.tsx`  
**Atome Lueur (un composant, deux contextes) :** [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md).  
**Thème prod (meshes) :** `constellation/skyTheme.ts` · **contrat lab :** `skyCraftState.ts` (+ adaptateur).

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
| −2 | **SkyPanorama** | `SkyPanorama.tsx` | Photo voie lactée (plan 2:1, hybride S2) | `skyPanorama` — opt-in lab · skip mobile/reduced |
| −1 | **NebulaGasFar** | `NebulaGasFar.tsx` | Nébuleuse quasi noire (profondeur) | `gasFar` — skip `reduced` |
| −0.5 | **GhostStars** | `GhostStars.tsx` | Bokeh / optique soft | `ghostStars` — skip `reduced`/`mobile` |
| 0a | **NebulaGasRose** | `NebulaGasRose.tsx` | Magenta 2001, biais droite, plus loin | `gasRose` |
| 0b | **NebulaGasMauve** | `NebulaGasMauve.tsx` | Gaz mauve, plus loin / lent | `gasMauve` |
| 0c | **NebulaGasTeal** | `NebulaGasTeal.tsx` | Gaz teal + bande soft | `gasTeal` |
| 1 | **CosmicDust** | `constellation/CosmicDust.tsx` | Voile poussière sur l’axe voie lactée | `cosmicDust` |
| 1b | **ZodiacalLight** | `ZodiacalLight.tsx` | Lumière solaire soft (axe bande) | `zodiacal` — skip `reduced` |
| 1c | **AuroraVeil** | `AuroraVeil.tsx` | Rideau aurore (dormant → pulse rare `aurora`) | `aurora` — skip `reduced` |
| 1d | **MilkyDustLanes** | `MilkyDustLanes.tsx` | Rivières sombres voie lactée (profondeur S1) | `milkyDustLanes` — skip `reduced` |
| 1e | **EclipseDisc** | `EclipseDisc.tsx` | Disque + corona (**labs + prologue J1** — pas le fond ambiant) | `eclipse` / `scene.intro` — desktop · voir `/test-eclipse` |
| 2 | **StarDust band** | `constellation/StarDust.tsx` | Voie lactée (~96 % du budget étoiles) | `starsBand` (+ zoom-out compensate) |
| 3 | **StarDust field** | idem | Peu d’étoiles proches (~4 %) | `starsField` (+ zoom-out compensate) |
| 4 | **ShootingStars** | `constellation/ShootingStars.tsx` | Filantes + **StreakEcho** (fantôme post-rare) | `shootingStars` |
| — | **Constellation** | `SanctuaryUniverse` | Lueurs-mémoire | `constellation` |

**Infra :**
- `ForceRenderLoop` — frames idle (sans souris)  
- `ParallaxLayer` + `ParallaxProvider` — profondeur + stub intensité  
- `WheelZoom` + `FocusCamera` — zoom molette / focus étoile  
- `IdleCameraDrift` — dérive + breath + rares (knobs : `scene.idle` → [`SANCTUARY_SKY_THEME.md`](SANCTUARY_SKY_THEME.md))  
- `SkyIntroEclipse` — intro 1×/session (**OFF** — craft sur `test-eclipse` d’abord)  
- `SkyWander` — promenade opt-in (toggle UI)  
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
| **E′** | Constellation silhouette (graphe) | 🚧 **`leo-graph-v1`** — remplace orb-cloud |
| **F** | Pont famille | ⏳ après E |
| **G** | Naissance d’étoile post-dépôt | ⏳ |
| **H** | Audio immersif (mute default) | ⏳ optionnel |
| **S** | Ciel screensaver (profondeur → moments WTF → intro → veille) | 🚧 — canon [`SANCTUARY_SKY_SCREENSAVER.md`](SANCTUARY_SKY_SCREENSAVER.md) |

### E′ — décisions figées (24 août 2026)

| Décision | Choix |
|----------|--------|
| Forme | **Zodiaque** (naissance + fallbacks) — craft actuel = **Leo** seul |
| Modèle tailles | **C** — graphe fixe · slots souvenirs · famille plus brillante · overflow plus tard |
| Slots | **9** = 1 Lueur (hero) + 8 souvenirs (fantômes jusqu’à dépôt) |
| Layout id | `leo-graph-v1` (`constellation/graphs/`) |
| Abandonné | orb-cloud · orbites Acte I (`_archive/`) |

**Fichiers :** `graphs/leo.ts` · `graphs/resolveConstellation.ts` · `LightBridges` = arêtes du graphe · `LueurNode` variant `ghost`.

**Preview :** `/fr/contribute/test-ciel` — faucille + queue du Lion, 5 allumées / 3 fantômes.

**Suite E′ :** peaufiner positions Leo → puis 11 autres templates · résoudre signe depuis date.

Plan détaillé (phases, perf, intro OFF, veille ⏳) : **ce fichier screensaver**. Lab éclipse `/fr/contribute/test-eclipse`. Marque : [`ODYSSEY_ECLIPSE_LOGO.md`](ODYSSEY_ECLIPSE_LOGO.md). Intro Sanctuaire (`scene.intro`) encore OFF. ≠ E′.

**Journal essais :** [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md).

**Preview craft :** `/fr/contribute/test-ciel` (ciel) · **`/fr/contribute/test-sky`** (fond · [`craft/SKY_DEPTH_CRAFT.md`](craft/SKY_DEPTH_CRAFT.md)) · `/fr/contribute/test-lueur` (Hero · Constellation · Produit) · `/fr/contribute/test-eclipse` (lab) · `/fr/contribute/test-eclipse-play` (A–B) · `/fr/contribute/test-wormhole` (warp C) · `/fr/contribute/test-eclipse-mark` (marque)

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
    graphs/                      # leo-graph-v1 + resolve (silhouette zodiaque)
    NebulaGas.tsx
    CosmicDust.tsx
    StarDust.tsx
    ShootingStars.tsx
    ParallaxLayer.tsx            # provider + shapePointer + layers
    CameraRig.tsx
    useVisualTier.ts
  _archive/                      # vieux ciels canvas / LueurSky / orb-cloud / orbites
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
