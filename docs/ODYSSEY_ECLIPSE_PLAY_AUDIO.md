# Odyssey Éclipse Play — map timing audio

**Statut :** partition **intention** — **pas branchée au code**  
**Play image :** `/fr/contribute/test-eclipse-play` · `CRAFT_PLAY_DURATION` ≈ **9,5 s** (A–B KEEP)  
**Finale :** [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md)  
**Wormhole craft :** [`ODYSSEY_WORMHOLE_CRAFT.md`](ODYSSEY_WORMHOLE_CRAFT.md)  
**Direction :** peu de sons, très justes — espace + rituel (pas trailer EDM)

Piloter volumes / fades sur les **mêmes courbes** que l’image (`diamondIn`, `sunIn`, `wordmarkMul`, `cameraPush`, `wash`, …) — pas une timeline audio parallèle inventée.

---

## 1. Pistes

| ID | Piste | Nature |
|----|--------|--------|
| **A** | Air / void | Quasi silence, micro souffle |
| **D** | Drone | Grave organique — couche principale |
| **S** | Shimmer | Harmonic aigu — branding (breath + extinction) |
| **M** | Motion | Whoosh soft — dolly |
| **X** | Hit (seuil) | Blanc B / entrée lumière |
| **T** | Warp (plus tard) | Soft air / streaks Quiet Luxury — **après KEEP lab wormhole** |
| **Y** | Arrivée (plus tard) | Ciel + titre — go D–E |

---

## 2. Partition (sync image actuelle ~9,5 s)

| Temps (s) | Image | Courbe | Son | Intention |
|-----------|--------|--------|-----|-----------|
| **0 → ~2,5** | Diamond → soleil | `diamondIn` / `sunIn` | **A** + **D** | Présence |
| **~2,8 → 4,6** | ODYSSEY | `wordmarkIn` | **S** | Soleil → nom |
| **~4,55 → 6,5** | Breath + murmure porte | `wordmarkMul` / `portalMurmur` | **S** respire | On *sent* ODYSSEY / porte |
| **~6,1 → 8,95** | Dolly | `cameraPush` ; `wordmarkOut` | **M** soft | Aspiration |
| **~8,7 → 9,5** | Blanc B | `wash` | **X** | Seuil « on est dedans » |
| **Après C branché** | Warp → ciel → titre | WORMHOLE + FINALE | **T** + **Y** | Voyage → Sanctuaire |

**REJECT :** wash plat coloré comme climax audio/image.

---

## 3. Sync technique (quand on coderá)

| Signal image | Audio |
|--------------|--------|
| `sunIn` | gain **D** |
| `wordmarkMul` | gain **S** |
| `cameraPush` | **M** |
| `wash` / fin dolly | **X** |
| warp velocity (lab→play) | **T** |
| Play start / reprise | hard reset pistes |

---

## 4. Hors scope

- Assets / Web Audio  
- **T** / **Y** tant que C lab pas KEEP et D–E pas go  

---

## 5. Prochaine étape audio

1. Assets **D / S / M** alignés sur ~9,5 s.  
2. `PlayAudioDriver` + courbes.  
3. **X** avec B ; **T** quand wormhole branché.

*Dernière sync image : 12 août 2026 — play A–B ~9,5 s ; C = craft wormhole.*
