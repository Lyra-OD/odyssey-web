# Odyssey — Ciel · **Thème / knobs**

**Statut : vivant · 27 août 2026**  
**Complète :** [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) (stack layers) · [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) (vision) · lab fond [`craft/SKY_DEPTH_CRAFT.md`](craft/SKY_DEPTH_CRAFT.md)

**Changelog** (max 5)
- 27 août 2026 — Vague 1 : knobs shader (warp/breath/density · flow/band · spike/core/`uTint` · zodiacal/aurora · filantes).
- 27 août 2026 — Contrat lab `SkyCraftState` · store · adaptateur · presets.

> Ce doc = *ce qui est tuneable* et où ça vit.  
> Lab outil : contrat **`SkyCraftState`** · prod R3F lit encore **`SkyTheme`** via adaptateur.

---

## 1. Où ?

| Quoi | Fichier |
|------|---------|
| **Contrat craft** `SkyCraftState` / `LayerState` / `SceneState` | `constellation/skyCraftState.ts` |
| Store lab (Context) | `skyCraftStore.tsx` |
| Adaptateur `toLegacySkyTheme` / `fromLegacySkyTheme` / `toLegacyLayerMap` | `skyCraftStateAdapter.ts` |
| Preset JSON = snapshot `SkyCraftState` | `skyCraftPreset.ts` |
| Slots nommés (Défaut · Démo VP · Nuit douce) | `skyPresets.ts` · UI `SkyCraftPresets.tsx` |
| Knobs lab courant | `skyCraftKnobDefs.ts` |
| Backup knobs (`test-sky-legacy`) | `skyCraftKnobDefsLegacy.ts` |
| Types + `defaultSkyTheme` + Provider (prod / meshes) | `skyTheme.ts` |
| Idle (dérive / rare) | `IdleCameraDrift.tsx` — lit `scene.idle` |
| Intro Éclipse | `SkyIntroEclipse.tsx` — lit `scene.intro` |
| Injection | `SanctuaryUniverse` prop `skyTheme` (défaut = `defaultSkyTheme`) |

Les shaders / composants **lisent** encore le thème legacy via `useSkyTheme()` — ne pas hardcoder les couleurs / amplitudes dans les layers. Migration mesh-par-mesh vers `LayerState` = roadmap S5.

---

## 2. Layers tuneables

| Clé (craft / legacy) | Layer |
|-----|--------|
| `gasRose` | Gaz magenta 2001 |
| `gasMauve` | Gaz mauve |
| `gasTeal` | Gaz teal |
| `gasFar` | Nébuleuse lointaine (Phase S1) |
| `ghostStars` | Bokeh optique (Phase S1) |
| `cosmicDust` | Voile poussière |
| `dustLanes` / `milkyDustLanes` | Dark lanes voie lactée |
| `zodiacal` | Lumière zodiacale |
| `starsBand` | Bande VL (étoiles — pas le transform groupe) |
| `starsField` | Étoiles proches |
| `shootingStars` | Filantes |
| chip **Fond** → `scene.clearColor` | Clear WebGL (pas un mesh) |
| chip **Fog** → `scene.fog` | Fog Three.js (pas un mesh) |
| `scene` | ambient · parallax× · loop · idle |
| `milkyGroup` | Transform parent poussière · zodiacal · lanes · bande |
| `panorama` / `skyPanorama` | Panorama photo · rotation/flip · void |
| `eclipse` | Disque + corona (rare + intro) |
| `aurora` | Rideau aurore |
| `constellation` | Parallaxe constellation |

Socle craft par layer : `isVisible` · `opacity` (desktop) · `position` · `rotation` · `scale` · `color?` · `parallax` · extras.  
Tiers mobile/reduced = dérivés au render (`deriveOpacityForTier`), pas dans le preset.

---

## 3. `scene.idle` — knobs complets

Tout se règle dans `defaultSkyTheme.scene.idle` (ou un merge preset).

| Knob | Rôle | Défaut craft |
|------|------|--------------|
| `enabled` | Active la dérive caméra idle | `true` |
| `delaySec` | Secondes sans interaction avant dérive | `3.5` |
| `periodSec` | Période du va-et-vient (plus long = plus lent) | `72` |
| `zoomAmp` | Amplitude zoom autour du zoom user | `0.55` |
| `moveAmp` | Amplitude déplacement XY | `0.16` |
| `lookAmp` | Amplitude look-at | `0.1` |
| `breathBoost` | Amplifie la parallaxe autonome des layers | `0.45` |
| `fogBreathAmp` | Micro-dérive fog (vide qui respire) | `1.1` |
| `rareEnabled` | Moments rares on/off | `true` |
| `rareTargets` | Pool : `"rose"` \| `"mauve"` \| `"teal"` \| `"band"` \| `"aurora"` | les 5 (pas `"eclipse"` — réservé labs / intro) |
| `rareGasPulse` | Force du pulse opacité (gaz) | `0.14` |
| `rareBandPulse` | Force du pulse alpha (voie lactée) | `0.22` |
| `rareDustPulse` | Pulse voile poussière si rare = gaz | `0.1` |
| `rareLueurPulse` | Pulse Lueur hero si rare = `band` | `0.38` |
| `rareAuroraPulse` | Pulse aurore si rare = `aurora` | `0.7` |
| `rareEclipsePulse` | Bloom éclipse si rare = `eclipse` (labs / intro seulement) | `0.92` |
| `rareGapMinSec` / `rareGapMaxSec` | Intervalle entre rares (pendant idle) | `140`–`260` |
| `rareDurationSec` | Durée d’un pulse | `9` |
| `rareSpecialStreak` | Filante un cran plus belle avec le pulse | `true` |

**Filantes teintées :** `shootingStars.rareTints.*` — palette tip/mid/tail selon la cible rare (incl. `aurora`, `eclipse`).

**StreakEcho :** `shootingStars.echoDelaySec` (`0.4`) + `echoOpacity` (`0.35`) — fantôme soft après filante spéciale.

**Aurore :** knobs `aurora` (`curtainSpeed`, `alphaCap`) — dormant hors rare ; pulse via `rareAuroraPulse`.

**Dark lanes :** knobs `milkyDustLanes` (`lane`, `deep`, `contrast`, `flowSpeed`, `bandTight`, `warpAmp`) — filaments sur axe bande ; skip `reduced`.

**Gaz :** `warpAmp` · `breathAmp` · `densityCap` (Far / Rose / Mauve / Teal) — defaults = hardcodes historiques.

**Étoiles :** `spikeAmt` · `coreRadius` · tint branché `uTint` (défaut `#d1e0ff` ≈ cool shader).

**Filantes :** `spawnGapSmall` / `spawnGapLarge` · `speedMul` · `lengthMul`.

**Éclipse :** knobs `eclipse` (body/corona/rim/coronaAmp) — **hors** `SanctuaryUniverse` ambiant ; labs `/test-eclipse*` + intro future via `scene.intro`.

---

## 3b. `scene.intro` — intro Éclipse 1×/session

| Knob | Rôle | Défaut |
|------|------|--------|
| `enabled` | Active l’intro immersif | `false` (craft isolé d’abord) |
| `durationSec` | Durée totale | `3.2` |
| `coronaAmp` | Boost corona pendant l’intro | `1.25` |
| `openScale` | Ouverture du disc (× scale) | `1.65` |

Skip : Esc, clic, non-desktop, `prefers-reduced-motion`, déjà vu (`sessionStorage`).  
**Statut :** intro Sanctuaire **coupée** — forme à valider sur `/fr/contribute/test-eclipse` avant rebranchement. Plan : [`SANCTUARY_SKY_SCREENSAVER.md`](SANCTUARY_SKY_SCREENSAVER.md).

**Comportement rare :** une cible du pool est choisie au hasard (sans répéter d’affilée). Seul ce layer pulse ; optionnellement une filante spéciale part en même temps.

### Exemples

Que le teal + la bande, plus souvent :

```ts
mergeSkyTheme(defaultSkyTheme, {
  scene: {
    idle: {
      rareTargets: ["teal", "band"],
      rareGapMinSec: 90,
      rareGapMaxSec: 150,
    },
  },
});
```

Couper les rares, garder la dérive :

```ts
mergeSkyTheme(defaultSkyTheme, {
  scene: { idle: { rareEnabled: false } },
});
```

---

## 4. Comment changer un look

**Craft (aujourd’hui)** — éditer `defaultSkyTheme` dans `skyTheme.ts`.

**Preset / runtime (plus tard)** — même shape, merge partiel :

```ts
import { defaultSkyTheme, mergeSkyTheme } from ".../skyTheme";

const winter = mergeSkyTheme(defaultSkyTheme, {
  id: "season.winter",
  gasTeal: { color: "#2a7a8a" },
  scene: { idle: { rareTargets: ["teal", "mauve"] } },
});

<SanctuaryUniverse skyTheme={winter} />
```

---

## 5. Ce qui n’est PAS un knob

Seeds PRNG, logique reveal / idle rare, forme exacte des blobs — restent dans le code layer / craft bible.  
Les knobs = **présence, couleur, rythme, parallaxe, placement, idle / rare**, + **Vague 1** amplitudes shader (warp, breath, densité, flow, spikes, gaps filantes…).

---

## 6. Règle

1. Lab : toucher un layer → `layers[id]` (socle + extras). Fond/Fog → `scene` seulement.  
2. Idle / rare → `scene.idle` uniquement.  
3. Nouveau look vivant → preset `SkyCraftState` (pas `_archive/`).  
4. Essai mort → `_archive/`.  
5. Prod / meshes non migrés → passer par `toLegacySkyTheme` (étrangleur).  
6. Backup UI → `/contribute/test-sky-legacy` uniquement (pas de nouvelles features).
