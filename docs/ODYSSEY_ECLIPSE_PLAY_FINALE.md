# Odyssey Éclipse Play — Finale (plongée → voyage → Sanctuaire)

**Statut :** A bis + B **KEEP** sur play · C = **lab wormhole** (pas branché) · D–E pending  
**Play :** `/fr/contribute/test-eclipse-play` (`CRAFT_PLAY_DURATION` ≈ **9,5 s**)  
**Wormhole craft :** `/fr/contribute/test-wormhole` — [`ODYSSEY_WORMHOLE_CRAFT.md`](ODYSSEY_WORMHOLE_CRAFT.md)  
**Chrono image :** [`eclipseCraftTimeline.ts`](../src/components/contribute/constellation/eclipseCraftTimeline.ts)  
**UI play :** [`EclipseCraftPlay.tsx`](../src/components/contribute/EclipseCraftPlay.tsx)  
**Ciel / couleurs :** [`skyTheme.ts`](../src/components/contribute/constellation/skyTheme.ts) · [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md)  
**Audio (partition) :** [`ODYSSEY_ECLIPSE_PLAY_AUDIO.md`](ODYSSEY_ECLIPSE_PLAY_AUDIO.md)  
**Journal lab :** [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md)

> **Règle d’attaque :** une étape à la fois. **go** explicite → coder → valider → commit si demandé.  
> **C se craft hors play** — ne pas rebrancher tant que le lab wormhole n’est pas KEEP.

---

## 0. Décisions (trace)

| Décision | Date | Verdict |
|----------|------|---------|
| Flash diamond → chaleur fin de dolly | 12 août | **KEEP** (via `flashMul` = f(push)) |
| Wash couleur plat DOM teal/mauve/rose | 12 août | **REJECT** |
| Plongée séparée (`plungeMul`) après plateau | 12 août | **REJECT** |
| Dolly continu + murmure porte (~5,73) | 12 août | **KEEP** A bis (`b275029`) |
| Blanc court seuil voyage | 12 août | **KEEP** B (œil) |
| « Nuages soft » plein cadre / mush couleur | 12 août | **REJECT** — pas un voyage |
| Warp Quiet Luxury (blanc/argent, stretch ∝ vel) | 12 août | **INTENTION C** — craft `/test-wormhole` |
| Ouverture ciel + titre + constellation | 12 août | **INTENTION** D–E |

---

## 1. Arc figé (récit)

```text
[1 / 1b] Naissance → ODYSSEY (breath ×1)
[A bis]  Murmure porte → dolly gravité → bead
[B]      Blanc court (« on est dedans »)
[C]      Warp Quiet Luxury → décélère vers le ciel   ← craft séparé
[D]      Ciel Sanctuaire de loin
[E]      Titre murmuré + constellation
```

### Sur le play aujourd’hui

| Acte | Contenu | Base |
|------|---------|------|
| 1 / 1b | Naissance velvet + ODYSSEY die-cut + breath ×1 | KEEP |
| 2 / **A bis** | Murmure ~5,73 → dolly ~6,1→8,95 | ✅ `b275029` |
| 3 / **B** | `wash` ~8,7→9,0 · fin play ~9,5 s | ✅ œil |
| 4 / **C** | *hors play* | ⏳ `/test-wormhole` |

---

## 2. Anti-patterns (ne pas rejouer)

| Pattern | Pourquoi REJECT |
|---------|-----------------|
| Wash plat DOM (teal→mauve→rose) | Wallpaper, pas un voyage |
| Mush couleur / voile soft plein cadre | « On voit de la couleur, on ne sent rien » |
| Flash sur place sans accélération | Bloom spike, pas « on rentre dedans » |
| Plateau dolly + 2ᵉ plongée (`plungeMul`) | Pause / reboot → noir |
| Visée centre trou noir en fin de Z | Écran noir — viser le **bead** |
| Wormhole CGI comic / starburst / néon | Clash Quiet Luxury / deuil |
| Titre boom / UI marketing | Sanctuaire = murmure |
| Empiler A–E sans validation | Craft impossible à juger |
| Coder C directement dans le play | Pollue A–B ; craft d’abord |

---

## 3. Checklist chirurgicale

### A bis — Dolly + murmure porte

| | |
|--|--|
| **Statut** | ✅ KEEP |
| **Commit** | `b275029` |
| **REJECT lié** | hold figé ; ouverture spike ; plongée séparée |

### B — Blanc court

| | |
|--|--|
| **Statut** | ✅ KEEP (œil) |
| **Fichiers** | `wash` + `WhiteWashOverlay` |
| **Commit** | avec pack wormhole lab (ce commit) |

### C — Wormhole (lab)

| | |
|--|--|
| **Statut** | ⏳ lab ouvert |
| **URL** | `/fr/contribute/test-wormhole` |
| **Doc** | [`ODYSSEY_WORMHOLE_CRAFT.md`](ODYSSEY_WORMHOLE_CRAFT.md) |
| **But** | Warp blanc/argent · stretch ∝ velocity · décel → ciel |
| **Done quand** | KEEP knobs + demo décélération → **puis** brancher après B |
| **REJECT lié** | mush ; fluo ; particules CPU |

### D — Ciel de loin · E — Titre

Pending après C branché. Voir intention inchangée ci-dessus.

---

## 4. Signaux chrono

| Étape | Signaux | Notes |
|-------|---------|--------|
| A bis | `cameraPush`, `flashMul`, `portalMurmur` / `portalYield` | Une aspiration |
| B | `wash` (DOM) + bloom | Seuil ; tient fin play tant que C pas branché |
| C | knobs lab → puis `velocity` / opacity play | Voir WORMHOLE_CRAFT |
| D | `skyMul` ↑, warp α ↓, FOV open | |
| E | `titleMul`, constellation | |

---

## 5. Commits de référence

| Commit | Sujet |
|--------|--------|
| `e20a36e` | Flash diamond historique |
| `b275029` | A bis — murmure + dolly ~9 s |
| *(ce push)* | B blanc + lab wormhole + C débranché du play |
| — | C branché play (après KEEP lab) |
| — | D / E |

---

## 6. Liens

- Wormhole craft : [`ODYSSEY_WORMHOLE_CRAFT.md`](ODYSSEY_WORMHOLE_CRAFT.md)  
- Logo : [`ODYSSEY_ECLIPSE_LOGO.md`](ODYSSEY_ECLIPSE_LOGO.md)  
- Lab notes : [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md)  
- Audio : [`ODYSSEY_ECLIPSE_PLAY_AUDIO.md`](ODYSSEY_ECLIPSE_PLAY_AUDIO.md)  
- Ciel : [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md)

*Dernière révision : 12 août 2026 — A–B KEEP ; C = lab `/test-wormhole` ; mush REJECT.*
