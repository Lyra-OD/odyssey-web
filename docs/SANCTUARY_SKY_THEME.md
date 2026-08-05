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
| Injection | `SanctuaryUniverse` prop `skyTheme` (défaut = `defaultSkyTheme`) |

Les shaders / composants **lisent** le thème via `useSkyTheme()` — ne pas hardcoder les couleurs dans les layers.

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
| `scene` | Background / fog / ambient / **idle** caméra |
| `constellation` | Parallaxe constellation |

`scene.idle` : dérive zoom + micro-move après `delaySec` (`IdleCameraDrift`).  
Aussi : `breathBoost` (parallaxe), `rareGasPulse` + filante spéciale toutes les ~2–4 min d’idle.

Chaque gaz : `color`, `deep`, `opacity` (desktop/mobile/reduced), `parallax`, `position`, `scale`, …

---

## 3. Comment changer un look

**Craft (aujourd’hui)** — éditer `defaultSkyTheme` dans `skyTheme.ts` :

```ts
gasMauve: {
  color: "#9a6fad", // ← ici
  ...
}
```

**Preset / runtime (plus tard)** — même shape, merge partiel :

```ts
import { defaultSkyTheme, mergeSkyTheme } from ".../skyTheme";

const winter = mergeSkyTheme(defaultSkyTheme, {
  id: "season.winter",
  gasTeal: { color: "#2a7a8a" },
  gasRose: { opacity: { desktop: 0.28 } },
});

<SanctuaryUniverse skyTheme={winter} />
```

---

## 4. Ce qui n’est PAS un knob

Forme du nuage, domain warp, seeds PRNG, logique reveal — restent dans le code layer / craft bible.  
Les knobs = **présence, couleur, rythme, parallaxe, placement**.

---

## 5. Règle

1. Toucher un layer → une clé thème.  
2. Nouveau look vivant → preset (pas `_archive/`).  
3. Essai mort → `_archive/`.
