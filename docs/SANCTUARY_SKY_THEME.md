# Odyssey — Ciel · **Thème / knobs**

**Statut : vivant · 5 août 2026**  
**Complète :** [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) (stack layers) · [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) (vision)

> Ce doc = *ce qui est tuneable* et où ça vit.  
> Pas une bible craft : juste le contrat pour ajuster layer par layer.

---

## 1. Où ?

| Quoi | Fichier |
|------|---------|
| Types + `defaultSkyTheme` + `mergeSkyTheme` + Provider | `src/components/contribute/constellation/skyTheme.ts` |
| Idle (dérive / rare) | `IdleCameraDrift.tsx` — lit `scene.idle` |
| Injection | `SanctuaryUniverse` prop `skyTheme` (défaut = `defaultSkyTheme`) |

Les shaders / composants **lisent** le thème via `useSkyTheme()` — ne pas hardcoder les couleurs / amplitudes dans les layers.

---

## 2. Layers tuneables

| Clé | Layer |
|-----|--------|
| `gasRose` | Gaz magenta 2001 |
| `gasMauve` | Gaz mauve |
| `gasTeal` | Gaz teal |
| `cosmicDust` | Voile poussière |
| `starsBand` | Voie lactée |
| `starsField` | Étoiles proches |
| `shootingStars` | Filantes (couleurs + parallaxe) |
| `scene` | Background / fog / ambient / **idle** |
| `constellation` | Parallaxe constellation |

Chaque gaz : `color`, `deep`, `opacity` (desktop/mobile/reduced), `parallax`, `position`, `scale`, …

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
| `rareEnabled` | Moments rares on/off | `true` |
| `rareTargets` | Pool de cibles : `"rose"` \| `"mauve"` \| `"teal"` \| `"band"` | les 4 |
| `rareGasPulse` | Force du pulse opacité (gaz) | `0.14` |
| `rareBandPulse` | Force du pulse alpha (voie lactée) | `0.22` |
| `rareGapMinSec` / `rareGapMaxSec` | Intervalle entre rares (pendant idle) | `140`–`260` |
| `rareDurationSec` | Durée d’un pulse | `9` |
| `rareSpecialStreak` | Filante un cran plus belle avec le pulse | `true` |

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

Forme du nuage, domain warp, seeds PRNG, logique reveal — restent dans le code layer / craft bible.  
Les knobs = **présence, couleur, rythme, parallaxe, placement, idle / rare**.

---

## 6. Règle

1. Toucher un layer → une clé thème.  
2. Idle / rare → `scene.idle` uniquement.  
3. Nouveau look vivant → preset (pas `_archive/`).  
4. Essai mort → `_archive/`.
