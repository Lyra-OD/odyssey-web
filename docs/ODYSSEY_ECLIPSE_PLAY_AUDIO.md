# Odyssey Éclipse Play — map timing audio

**Statut :** partition verrouillée (intention) — **pas encore branchée au code**  
**Play :** `/fr/contribute/test-eclipse-play`  
**Chrono image source :** [`eclipseCraftTimeline.ts`](../src/components/contribute/constellation/eclipseCraftTimeline.ts) (`CRAFT_PLAY_DURATION` ≈ **13,7 s**)  
**Direction :** peu de sons, très justes — espace + rituel (pas trailer EDM)

Quand on brancherá l’audio, piloter les volumes / fades sur les **mêmes courbes** que l’image (`diamondIn`, `sunIn`, `wordmarkMul`, `cameraPush`, `threat`) — pas une timeline audio parallèle inventée.

---

## 1. Pistes (3 couches + silence)

| ID | Piste | Nature |
|----|--------|--------|
| **A** | Air / void | Quasi silence, micro souffle très bas |
| **D** | Drone | Grave organique (glass / cello sub) — couche principale |
| **S** | Shimmer | Harmonic aigu / lumière — couche branding (suit breath + extinction) |
| **M** | Motion | Whoosh interne très soft — couche dolly |
| **X** | Hit (plus tard) | Flash / seuil — **pas encore** |

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
| **~12,0 → 13,7** | Menace limbe / diamond | `limbThreat` ; `threat` | **D** + grave léger | Battement avant futur flash |
| **Plus tard** | Flash diamond → wrap / ciel | TBD | **X** hit + reverb | Climax net |

---

## 3. Sync technique (quand on coderá)

| Signal image | Usage audio suggéré |
|--------------|---------------------|
| `sunIn` | gain du **drone D** |
| `wordmarkMul` | gain du **shimmer S** (inclut breath + extinction) |
| `cameraPush` | gain / filtre de **motion M** |
| `threat` (`cameraPush²`) | couche grave menace |
| Play start / replay | hard reset toutes les pistes à 0 |

---

## 4. Hors scope pour l’instant

- Fichiers audio / Web Audio  
- Silence UI (lab chrome) — **fin seulement**  
- Flash / wrap / ciel audio  

---

## 5. Prochaine étape audio (plus tard)

1. Assets **D / S / M**.  
2. `PlayAudioDriver` sur `elapsed` + courbes.  
3. Mix pass.

*Dernière sync image : août 2026 — dolly 6,9→12,0 (~5,1 s) ; durée 13,7 s.*
