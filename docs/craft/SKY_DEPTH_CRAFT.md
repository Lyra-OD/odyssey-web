# Craft ciel — profondeur & fond Sanctuaire (lab)

**Type :** craft · **Vérité pour :** itération fond WebGL · layers · presets · roadmap dust lanes / panorama.  
**Dernière MAJ :** 26 août 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 27 août 2026 — Layers **Fond** / **Fog** séparés · milky Pos XYZ · Rotate global · void noir.
- 27 août 2026 — Panorama : **Noir void** = plan noir séparé (pas de shrink photo) + fond scène `#000` en mode B.
- 26 août 2026 — **S2 panorama** — plan photo (pas sphère 360) · asset `/craft/sky/milky-way-v1.jpg` · modes A/B.
- 26 août 2026 — Lab : couleurs par layer + **pool idle rare** (cibles · pulses · gaps).
- 26 août 2026 — **S1 `MilkyDustLanes`** — dark lanes shader · knobs lab · bande StarDust resserrée.
- 26 août 2026 — Lab **`/contribute/test-sky`** v0 : toggles layers · knobs `skyTheme` · sans constellation par défaut.

**Liens :**
- Stack layers (canon) : [`../SANCTUARY_SKY_CRAFT.md`](../SANCTUARY_SKY_CRAFT.md)
- Thème / knobs : [`../SANCTUARY_SKY_THEME.md`](../SANCTUARY_SKY_THEME.md)
- Preview intégrée : [`../SANCTUARY_SKY_CRAFT.md`](../SANCTUARY_SKY_CRAFT.md) (`test-ciel`)
- Hero + constellation : [`../ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md) (`test-lueur`)

---

## 1. Rôle du lab

| Surface | Rôle |
|---------|------|
| **`/contribute/test-sky`** | Atelier **fond ciel** — gaz · poussière · étoiles · parallaxe |
| **`/contribute/test-ciel`** | Preview Sanctuaire (immersif + constellation auto) |
| **`/contribute/test-lueur`** | Hero · reveal Leo · Lueur produit |

Ne pas mélanger : le craft ciel **n’implémente pas** naissance prénom, Leo, bridges.

---

## 2. Accès (dev only)

```
/fr/contribute/test-sky
/en/contribute/test-sky
```

Code : `SkyCraftLab.tsx` · page `app/[lang]/contribute/test-sky/page.tsx`  
Infra layers : `constellation/skyCraftLayers.ts` · props `skyLayers` / `skyCraftChrome` sur `SanctuaryUniverse.tsx`.

---

## 3. v0 livré

- Toggle **15 layers** · modes **A procédural / B photo NASA** · knobs par layer

**Asset S2 :** `public/craft/sky/milky-way-v1.jpg` — lab (Vecteezy, temporaire) · 3840×1920 · ~2 Mo · desktop only. Prod → licence claire ou NASA PD.
- Knobs : parallaxe · fog · opacités gaz · poussière · band/field α/size
- **Reset** → `defaultSkyTheme` + layers défaut
- Liens vers `test-ciel` · `test-lueur`

---

## 4. Roadmap craft (brainstorm → exécution)

| Phase | Quoi | Statut |
|-------|------|--------|
| **S0** | Lab v0 (ce doc) | ✅ |
| **S1** | **`MilkyDustLanes`** — masque sombre soustractif (ref photo) | ✅ v1 |
| **S2** | Panorama fond (NASA WebP) + toggle lab A/B | ✅ v1 |
| **S3** | Export preset JSON (`skyTheme` partial) · bouton Copy | ⏳ |
| **S4** | Sim tier mobile/reduced dans le panel | ⏳ |
| **S5** | Merge preset KEEP → `defaultSkyTheme` + prod | ⏳ |

### Direction visuelle (rappel)

- Fond plus **photo / voie lactée** naturelle
- **Teal = Hero + filaments** — pas recoloriser toute la galaxie
- Dark lanes = profondeur #1 vs ref Hubble

---

## 5. Anti-patterns lab

- ❌ Démo VP sur `/test-sky` (labs only)
- ❌ Dupliquer les knobs Hero ici (→ `test-lueur`)
- ❌ Hardcoder opacités dans les shaders (→ `skyTheme.ts`)

---

## 6. Une phrase

**`test-sky` = décor ; `test-lueur` = Lueur ; `test-ciel` = preview famille — trois ateliers, trois rôles.**
