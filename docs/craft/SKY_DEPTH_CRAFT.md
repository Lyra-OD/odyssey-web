# Craft ciel — profondeur & fond Sanctuaire (lab)

**Type :** craft · **Vérité pour :** itération fond WebGL · layers · presets · roadmap dust lanes / panorama.  
**Dernière MAJ :** 27 août 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 27 août 2026 — Backup **`/test-sky-legacy`** (SkyTheme) isolé · lab courant = SkyCraftState.
- 27 août 2026 — Lab branché sur `SkyCraftState` (Context) · knobs → store · preview `toLegacy*` · Log state.
- 27 août 2026 — Contrat `SkyCraftState` + adaptateur legacy — Fond/Fog = scène · milkyGroup parent.
- 27 août 2026 — Lab : isolation knobs · Solo · Export/Import preset JSON v1.
- 27 août 2026 — Panorama hors milky · void noir séparé · chips Fond/Fog.

**Liens :**
- Stack layers (canon) : [`../SANCTUARY_SKY_CRAFT.md`](../SANCTUARY_SKY_CRAFT.md)
- Thème / knobs : [`../SANCTUARY_SKY_THEME.md`](../SANCTUARY_SKY_THEME.md)
- Preview intégrée : [`../SANCTUARY_SKY_CRAFT.md`](../SANCTUARY_SKY_CRAFT.md) (`test-ciel`)
- Hero + constellation : [`../ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md) (`test-lueur`)

---

## 1. Rôle du lab

| Surface | Rôle |
|---------|------|
| **`/contribute/test-sky`** | Atelier **fond ciel** — store `SkyCraftState` · presets |
| **`/contribute/test-sky-legacy`** | Backup figé (état `SkyTheme` pré-refactor) — secours only |
| **`/contribute/test-ciel`** | Preview Sanctuaire (immersif + constellation auto) |
| **`/contribute/test-lueur`** | Hero · reveal Leo · Lueur produit |

Ne pas mélanger : le craft ciel **n’implémente pas** naissance prénom, Leo, bridges.  
Ne pas éditer le legacy pour de nouvelles features — uniquement `test-sky`.

---

## 2. Accès (dev only)

```
/fr/contribute/test-sky          ← lab courant (SkyCraftState)
/fr/contribute/test-sky-legacy   ← backup pré-refactor (SkyTheme)
/en/contribute/test-sky
/en/contribute/test-sky-legacy
```

Code : `SkyCraftLab.tsx` · backup : `SkyCraftLabLegacy.tsx` + `skyCraftKnobDefsLegacy.ts`  
Page : `app/[lang]/contribute/test-sky/page.tsx` · legacy : `…/test-sky-legacy/page.tsx`  
Infra layers : `constellation/skyCraftLayers.ts` · props `skyLayers` / `skyCraftChrome` sur `SanctuaryUniverse.tsx`.

---

## 2b. Contrat d’état (fondation outil)

Source : `skyCraftState.ts` · pont prod : `skyCraftStateAdapter.ts` · store lab : `skyCraftStore.tsx`.

| Store | Contenu |
|-------|---------|
| `scene` | clearColor · fog · ambient · idle · `parallaxIntensity` |
| `layers.milkyGroup` | Transform parent (poussière · zodiacal · lanes · bande) |
| `layers.*` | Socle `LayerState` (`isVisible` · opacity desktop · pos/rot/scale) |

Lab branché : knobs ↔ `SkyCraftState` · preview via `toLegacySkyTheme` / `toLegacyLayerMap`.  
Régression : bouton **Log state** + `window.__SKY_CRAFT__` (state · legacyTheme · legacyLayers).  
Chips **Fond / Fog** éditent `scene` (pas des meshes). Preset JSON = snapshot `SkyCraftState`.

---

## 3. Lab outil (hands-on)

- Toggle layers · modes **A / B** · knobs **par cible** (layer | Scène | **milkyGroup**)
- Chips **Fond** / **Fog** → écrivent `scene.clear*` / `scene.fog` (pas des meshes)
- **`layers.milkyGroup`** = Rotate/Pos parent (poussière · zodiacal · lanes · bande) — **pas** le panorama
- **Solo** / Mute → `LayerState.isVisible` natif
- **Export / Import** = snapshot JSON `SkyCraftState` (`skyCraftPreset.ts`)
- **Log state** + `window.__SKY_CRAFT__` pour régression adaptateur

**Asset S2 :** `public/craft/sky/milky-way-v1.jpg` — lab (Vecteezy, temporaire) · desktop only. Prod → licence claire ou NASA PD.

**Reset** → `defaultSkyCraftState` · liens `test-ciel` / `test-lueur` / eclipse / wormhole / **Legacy**.

---

## 4. Roadmap craft (brainstorm → exécution)

| Phase | Quoi | Statut |
|-------|------|--------|
| **S0** | Lab v0 (ce doc) | ✅ |
| **S1** | **`MilkyDustLanes`** — masque sombre soustractif (ref photo) | ✅ v1 |
| **S2** | Panorama fond (NASA WebP) + toggle lab A/B | ✅ v1 |
| **S3** | `SkyCraftState` + store + Solo + Export/Import + backup legacy | ✅ v1 |
| **S4** | Sim tier mobile/reduced dans le panel | ⏳ |
| **S5** | Merge preset KEEP → prod · themes nommés · meshes R3F sur contrat | ⏳ |

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

**`test-sky` = décor (SkyCraftState) ; `test-sky-legacy` = backup ; `test-lueur` = Lueur ; `test-ciel` = preview famille.**
