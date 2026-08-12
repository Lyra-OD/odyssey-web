# Odyssey Éclipse Play — Finale (plongée → voyage → Sanctuaire)

**Statut :** intention **figée** (12 août 2026) · code base = flash seul · étapes A–E **pending**  
**Play :** `/fr/contribute/test-eclipse-play`  
**Chrono image :** [`eclipseCraftTimeline.ts`](../src/components/contribute/constellation/eclipseCraftTimeline.ts)  
**UI play :** [`EclipseCraftPlay.tsx`](../src/components/contribute/EclipseCraftPlay.tsx)  
**Ciel / couleurs :** [`skyTheme.ts`](../src/components/contribute/constellation/skyTheme.ts) · craft ciel [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md)  
**Audio (partition) :** [`ODYSSEY_ECLIPSE_PLAY_AUDIO.md`](ODYSSEY_ECLIPSE_PLAY_AUDIO.md)  
**Journal lab :** [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md)

> **Règle d’attaque :** une étape à la fois. Dire **go A** / **go B** / … → coder → valider → commit si demandé → étape suivante.  
> Ne pas enchaîner A–E sans go explicite.

---

## 0. Pourquoi ce doc existe

Trace des décisions de **fin de play** (après le lockup logo), pour pouvoir changer plus tard sans rejouer les erreurs.

| Décision | Date | Verdict |
|----------|------|---------|
| Flash diamond blanc (bead + bloom) | 12 août | **KEEP** intention — devenu chaleur de fin de dolly |
| Wash couleur plat (overlay DOM teal/mauve/rose) | 12 août | **REJECT** — filtre wallpaper, pas un voyage |
| Plongée séparée après plateau dolly (`plungeMul`) | 12 août | **REJECT** — pause + 2ᵉ gear → écran noir |
| Dolly continu accéléré dans le diamond | 12 août | **INTENTION A bis** — une seule courbe gravité |
| Tunnel nuages soft (couleurs skyTheme) | 12 août | **INTENTION** — étape C |
| Ouverture ciel + titre + constellation | 12 août | **INTENTION** — étapes D–E |

---

## 1. Arc figé (récit)

Un seul voyage spatial : **on entre dans la lumière**, on traverse des **nuages Odyssey**, on **arrive** dans le Sanctuaire.

```text
[Actes 1–1b — logo]
naissance → ODYSSEY (breath ×1) → hold
        ↓
[A bis] Dolly continu accéléré → dans le diamond (pas de pause / 2ᵉ plongée)
[B] Blanc court (« on est dedans »)
[C] Tunnel nuages soft (teal / mauve / rose)
[D] Ouverture : ciel de loin
[E] Titre murmuré + constellation
```

### Actes déjà livrés (ne pas casser naissance / ODYSSEY)

| Acte | Contenu | Base |
|------|---------|------|
| 1 / 1b | Naissance velvet + ODYSSEY die-cut + breath ×1 | KEEP |
| 2 / **A bis** | Dolly **continu** 6,9→13,1 (~6,2 s, courbe 3) → bead ; menace + chaleur `flashMul` | checkpoint |
| ~~Plongée séparée `plungeMul`~~ | 2ᵉ geste après plateau → écran noir | **REJECT** (12 août) |

`CRAFT_PLAY_DURATION` actuel ≈ **13,4 s**. B–E allongeront.

---

## 2. Anti-patterns (ne pas rejouer)

| Pattern | Pourquoi REJECT |
|---------|-----------------|
| Wash plat DOM (dégradé fixe teal→mauve→rose) | Plus de caméra / profondeur — anti-climatique |
| Flash « sur place » sans accélération | Bloom spike, pas « on rentre dedans » |
| Plateau dolly puis 2ᵉ plongée (`plungeMul`) | Pause / reboot ; fin dans le noir |
| Visée centre du trou noir en fin de Z | Écran noir — viser le **bead** |
| Wormhole CGI comic / starburst / tunnel néon | Clash Quiet Luxury / deuil |
| Titre boom / jeu / UI marketing | Sanctuaire = murmure, pas trailer |
| Empiler A–E sans validation | Trop de variables ; craft impossible à juger |

---

## 3. Checklist chirurgicale

Cocher au fil des go. Mettre à jour **statut** + **commit** dans §5.

### A bis — Dolly continu accéléré → diamond

| | |
|--|--|
| **Statut** | ✅ checkpoint (courbe 3 + timeline) — peaufinage possible avant go B |
| **Go** | `go A bis` / courbe 3 |
| **But** | Une seule courbe caméra ; départ franc ; tempo ~6,2 s ; sans crunch blanc |
| **Fichiers** | `eclipseCraftTimeline.ts` (`gravityDolly` ≈ 0.36·u + 0.64·u^2.05), `EclipseCraftPlay.tsx` |
| **Done quand** | Départ lisible, continuum jusqu’au bead |
| **Commit** | `342d558` |
| **REJECT lié** | go A plongée séparée ; tweak fin `pow 2.65` trop crunch |

### B — Blanc court

| | |
|--|--|
| **Statut** | ☐ pending (après A validé) |
| **Go** | `go B` |
| **But** | Instant de **plein blanc** en fin de dolly (~0,3–0,6 s) = seuil du voyage |
| **Fichiers** | `EclipseCraftPlay.tsx` (overlay / clear) ± timeline |
| **Done quand** | « On est dans la lumière » — pas un hold blanc qui traîne |
| **Commit** | — |

### C — Wormhole nuages

| | |
|--|--|
| **Statut** | ☐ pending (après B validé) |
| **Go** | `go C` |
| **But** | Voyage soft dans gaz **skyTheme** (teal / mauve / rose) — soie, pas comic |
| **Fichiers** | Play + layers / shader tunnel (réutiliser palette `defaultSkyTheme`) |
| **Done quand** | On voyage dans les couleurs Odyssey, sans look sci-fi cheap |
| **Commit** | — |

### D — Ouverture ciel de loin

| | |
|--|--|
| **Statut** | ☐ pending (après C validé) |
| **Go** | `go D` |
| **But** | Sortie tunnel → **ciel Sanctuaire** lu de loin (caméra / FOV qui s’ouvre) |
| **Fichiers** | Play + layers ciel ([`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md)) |
| **Done quand** | « Ah, c’est un ciel » — pas encore l’UI produit |
| **Commit** | — |

### E — Titre + constellation

| | |
|--|--|
| **Statut** | ☐ pending (après D validé) |
| **Go** | `go E` |
| **But** | Arrivée produit : titre murmuré + constellation qui s’allume |
| **Copy placeholder** | FR : *Bienvenue* / *Sanctuaire de [Prénom]* · EN : *Welcome* / *Sanctuary of [Name]* (à peaufiner) |
| **Fichiers** | Play overlay typo + constellation existante / idle |
| **Done quand** | On arrive émotionnellement dans le Sanctuaire |
| **Commit** | — |

---

## 4. Signaux chrono (cible — à remplir en codant)

Courbes existantes utiles : `flashMul`, `cameraPush`, `diamondMul`, `bloom`, `limbThreat`, `wash` (réserver pour matière voyage, **pas** overlay plat).

| Étape | Signaux envisagés | Notes |
|-------|-------------------|--------|
| A bis | `cameraPush` (gravité) ; `flashMul` = f(push late) | Une courbe |
| B | `whiteIn` ou pic blanc très court | Domaine DOM ou clear Three |
| C | `tunnelMul` / motion streaks + gaz | Couleurs = `gasTeal` / `gasMauve` / `gasRose` |
| D | `skyMul` ↑, tunnel ↓, FOV open | Lier intro ciel plus tard si voulu |
| E | `titleMul`, constellation reveal | Quiet Luxury breath |

Audio : piste **X** (hit seuil) + whoosh soft — voir PLAY_AUDIO § flash→voyage.

---

## 5. Commits de référence

| Commit | Sujet |
|--------|--------|
| `e20a36e` | Flash diamond blanc (acte 4) — base historique |
| `342d558` | A bis — dolly continu + timeline scrub |
| — | B — blanc court |
| — | C — wormhole nuages |
| — | D — ciel de loin |
| — | E — titre + constellation |

Wash plat : **jamais commité** (WIP jeté ; working tree revenu à `e20a36e`).

---

## 6. Liens

- Logo / matière : [`ODYSSEY_ECLIPSE_LOGO.md`](ODYSSEY_ECLIPSE_LOGO.md)  
- Lab notes : [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md)  
- Audio : [`ODYSSEY_ECLIPSE_PLAY_AUDIO.md`](ODYSSEY_ECLIPSE_PLAY_AUDIO.md)  
- Ciel : [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) · [`SANCTUARY_SKY_THEME.md`](SANCTUARY_SKY_THEME.md)

*Dernière révision : 12 août 2026 — intention A–E figée ; code gelé sur flash jusqu’à go A.*
