# Odyssey Éclipse Play — map timing audio

**Statut :** partition verrouillée (intention) — **pas encore branchée au code**  
**Play :** `/fr/contribute/test-eclipse-play`  
**Chrono image source :** [`eclipseCraftTimeline.ts`](../src/components/contribute/constellation/eclipseCraftTimeline.ts) (`CRAFT_PLAY_DURATION` ≈ **14,7 s** — fin flash ; A–E allongeront)  
**Finale visuelle (A–E) :** [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md)  
**Direction :** peu de sons, très justes — espace + rituel (pas trailer EDM)

Quand on brancherá l’audio, piloter les volumes / fades sur les **mêmes courbes** que l’image (`diamondIn`, `sunIn`, `wordmarkMul`, `cameraPush`, `threat`, `flashMul`, …) — pas une timeline audio parallèle inventée.

---

## 1. Pistes (3 couches + silence)

| ID | Piste | Nature |
|----|--------|--------|
| **A** | Air / void | Quasi silence, micro souffle très bas |
| **D** | Drone | Grave organique (glass / cello sub) — couche principale |
| **S** | Shimmer | Harmonic aigu / lumière — couche branding (suit breath + extinction) |
| **M** | Motion | Whoosh interne très soft — couche dolly / plongée |
| **X** | Hit (seuil) | Flash / entrée lumière — **à brancher avec go A–B** |
| **T** | Tunnel (plus tard) | Soft air / nuages — go C |
| **Y** | Arrivée (plus tard) | Ouverture ciel + titre — go D–E |

Pas de mélodie au début. Stéréo large, volumes bas.

---

## 2. Partition (temps ↔ image ↔ son)

| Temps (s) | Image (chrono actuel) | Courbe code | Son | Intention |
|-----------|------------------------|-------------|-----|-----------|
| **0 → 0,45** | Noir | — | **A** quasi 0 | Le vide a du poids |
| **0,35 → 2,15** | Diamond seul | `diamondIn` | **A** + **D** à peine | Présence avant la lumière |
| **2,15 → 3,55** | Soleil naît | `sunIn` | **D** monte | La lumière *arrive* |
| **2,62 → 4,55** | Die-cut **ODYSSEY** | `wordmarkIn` | **S** après **D** | Causalité : soleil → nom |
| **4,55 → 6,9** | Hold + **breath** | `wordmarkMul` pulse | **S** respire avec le die-cut ; **D** plat | On *lit* / *sent* ODYSSEY |
| **6,9 → 12,0** | Dolly ~5,1 s + extinction | `cameraPush` ; `wordmarkOut` | **M** soft ; **S** suit le fade | Aspiration + étoile qui s’éteint |
| **~12,0 → 13,7** | Menace limbe / diamond | `limbThreat` ; `threat` | **D** + grave léger | Battement avant flash |
| **~13,78 → 14,58** | Flash diamond (base `e20a36e`) | `flashMul` | **X** (pas encore) | Hit net — bientôt **sync plongée** (go A) |
| **Après go A–E** | Plongée → blanc → tunnel → ciel → titre | voir PLAY_FINALE | **X** + **M** + **T** + **Y** | Voyage → Sanctuaire |

**REJECT audio/image :** wash plat coloré comme climax (pas de « drone wash » décoratif).

---

## 3. Sync technique (quand on coderá)

| Signal image | Usage audio suggéré |
|--------------|---------------------|
| `sunIn` | gain du **drone D** |
| `wordmarkMul` | gain du **shimmer S** (inclut breath + extinction) |
| `cameraPush` | gain / filtre de **motion M** |
| `threat` (`cameraPush²`) | couche grave menace |
| `flashMul` (+ plongée A) | **X** hit + reverb courte |
| Play start / replay | hard reset toutes les pistes à 0 |

---

## 4. Hors scope pour l’instant

- Fichiers audio / Web Audio  
- Silence UI (lab chrome) — **fin seulement**  
- Tunnel / ciel / titre audio (attend go C–E + PLAY_FINALE)

---

## 5. Prochaine étape audio (plus tard)

1. Assets **D / S / M**.  
2. `PlayAudioDriver` sur `elapsed` + courbes.  
3. Mix pass — puis **X** avec plongée (go A–B).

*Dernière sync image : 12 août 2026 — flash `e20a36e` (~14,7 s) ; finale A–E = [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md).*
