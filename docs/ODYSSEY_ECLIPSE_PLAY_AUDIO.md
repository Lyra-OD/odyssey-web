# Odyssey Éclipse Play — map timing audio

**Statut :** partition verrouillée (intention) — **pas encore branchée au code**  
**Play :** `/fr/contribute/test-eclipse-play`  
**Chrono image source :** [`eclipseCraftTimeline.ts`](../src/components/contribute/constellation/eclipseCraftTimeline.ts) (`CRAFT_PLAY_DURATION` ≈ **17,8 s**)  
**Direction :** peu de sons, très justes — espace + rituel (pas trailer EDM)

Quand on brancherá l’audio, piloter les volumes / fades sur les **mêmes courbes** que l’image (`diamondIn`, `sunIn`, `wordmarkMul`, `cameraPush`, `threat`) — pas une timeline audio parallèle inventée.

---

## 1. Pistes (3 couches + silence)

| ID | Piste | Nature |
|----|--------|--------|
| **A** | Air / void | Quasi silence, micro souffle très bas |
| **D** | Drone | Grave organique (glass / cello sub) — couche principale |
| **S** | Shimmer | Harmonic aigu / lumière — couche branding |
| **M** | Motion | Whoosh interne très soft — couche dolly |
| **X** | Hit (plus tard) | Flash / seuil — **pas encore** |

Pas de mélodie au début. Stéréo large, volumes bas.

---

## 2. Partition (temps ↔ image ↔ son)

| Temps (s) | Image (chrono actuel) | Courbe code | Son | Intention |
|-----------|------------------------|-------------|-----|-----------|
| **0 → 0,45** | Noir | — | **A** quasi 0 | Le vide a du poids |
| **0,35 → 2,15** | Diamond seul (révélation) | `diamondIn` 0,35→2,75 | **A** + **D** à peine audible (très bas) | Présence avant la lumière |
| **2,15 → 3,55** | Soleil naît | `sunIn` 2,15→3,55 | **D** monte 0 → moyen | La lumière *arrive* |
| **2,62 → 4,55** | Die-cut **ODYSSEY** (lag après soleil, montée lente) | `wordmarkMul` 2,62→4,55 | **S** entre *après* **D**, fade-in feutré | Causalité : soleil → nom |
| **2,45 → 4,15** | Irrégularité corona | `irregIn` | **D** stable / léger grain | Matière vivante, pas nouveau hit |
| **4,55 → 7,8** | Hold branding (mot complet, caméra fixe) | `wordmarkMul` ≈ 1, `cameraPush` = 0 | **D** plat bas ; **S** settle / quasi hold | On *lit* ODYSSEY (silence UI plus tard) |
| **7,8 → 16,1** | Dolly vers diamond | `cameraPush` 7,8→16,1 | **M** très soft + **D** qui se resserre un peu | Aspiration, pas vent Hollywood |
| **15,7 → 17,8** | Hold menace (image encore soft) | `threat` ↑ en fin de push | **D** + grave léger (préparer seuil) | Tension — peaufinage image TBD |
| **Plus tard** | Flash depuis diamond → wrap / ciel | TBD | **X** un hit + reverb longue | Climax net |

---

## 3. Sync technique (quand on coderá)

| Signal image | Usage audio suggéré |
|--------------|---------------------|
| `sunIn` | gain du **drone D** |
| `wordmarkMul` | gain du **shimmer S** (déjà en retard sur le soleil) |
| `cameraPush` | gain / filtre de **motion M** + légère compression du drone |
| `threat` (`cameraPush²`) | couche grave menace (phase suivante) |
| Play start / replay | hard reset toutes les pistes à 0 |

Règle : **un Play = une lecture sync chrono**, mute si onglet caché / reduced-motion si besoin produit.

---

## 4. Hors scope pour l’instant

- Fichiers `.mp3` / `.wav` / Web Audio / spatialize  
- Silence UI (lab chrome) — prévu, pas maintenant  
- Flash / wrap / ciel audio  
- Musique mélodique

---

## 5. Prochaine étape audio (plus tard)

1. Choisir ou générer assets **D / S / M** (boucles clean, seamless).  
2. Brancher un `PlayAudioDriver` sur `elapsed` + courbes ci-dessus.  
3. Mix pass avec toi (niveaux Webby = bas et précis).

*Dernière sync image : août 2026 — lag ODYSSEY 2,62→4,55 ; dolly 7,8→16,1 ; durée 17,8 s.*
