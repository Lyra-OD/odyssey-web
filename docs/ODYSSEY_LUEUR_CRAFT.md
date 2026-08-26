# Odyssey — Craft Lueur (Hero · Constellation · Produit)

**Type :** craft · **Vérité pour :** lab atome blanc+teal + emboîtement constellation / SKU.  
**Dernière MAJ :** 26 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 26 août 2026 — **Recette naissance** KEEP : nom fumée + Hero C0–C2 (depuis le nom, voile mini→peak→contracte, cam serrée→pull-back).
- 26 août 2026 — Lab constellation : knobs **slots** + **traits major/minor** (style · couleur · glow).
- 26 août 2026 — Plan A→F + **caméra** (canon) : serré → pull-back ; Hero = centre causal.
- 26 août 2026 — **KEEP Hero** : defaults `DEFAULT_HERO_*` + parallax 1.2 · globalScale 0.83.
- 25 août 2026 — Onglet 2 : Hero craft partagé · courant trait/étoile/orbe.

**Preview :** `/fr/contribute/test-lueur` (dev only)  
**Ciel :** [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) · **Orb carte :** [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md)  
**Produit / couleurs / prix Lueurs :** [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md)

---

## 1. Trois onglets (un lab)

| Onglet | Quoi | État |
|--------|------|------|
| **1 — Hero** | Atome défunt seul — blanc + teal, spikes, breath | ✅ **KEEP** 26 août |
| **2 — Constellation** | Graphe Leo — **même HeroStar que onglet 1** + reveal + slots/traits craft | 🚧 craft knobs (avant KEEP 0b) |
| **3 — Lueur produit** | SKU / carte / ritual — même famille + **palette** | 🚧 + teintes curatées |
| **4 — Champ** (à ajouter) | Grille B : N lueurs colorées + naissance | 🔜 plan [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md) §7 |

Règle : **valider Hero seul (P0)** avant de brancher 2 → 3 → 4.

---

## 2. Atome — KEEP (26 août 2026)

**Fichier :** [`HeroStar.tsx`](../src/components/contribute/constellation/HeroStar.tsx)  
Lab init = ces constantes (retour onglet 1 = même look).

| Layer | size | glow | breath | depth Z | amount | rot° |
|-------|------|------|--------|---------|--------|------|
| **Blanc** | 2.19 | 1.10 | 0.70 | −0.60 | 0.45 | 0 |
| **Teal** | 1.38 | 1.00 | 0.70 | −0.60 | 0.65 | 12 |
| **Spikes** | 1.56 | 1.15 | 0.70 | −0.60 | 1.04 | 108 |

| Global | Valeur |
|--------|--------|
| Parallax souris | **1.20** |
| Ratios figés | **oui** |
| Taille générale | **0.83** |

Additive blending · masque circulaire soft (anti-carré point sprite).

---

## 2b. Constellation craft (avant KEEP 0b)

**Defaults :** [`craftDefaults.ts`](../src/components/contribute/constellation/craftDefaults.ts)

| Surface | Knobs |
|---------|--------|
| **Slots** | taille bright / medium / dim · glow · breath · ghost size + dim |
| **Traits majeurs** | style (continu · pointillé · tirets · glow) · épaisseur · opacité · couleur *ou* noyau+halo |
| **Traits mineurs** | idem, famille séparée |
| **Tiers Leo** | major = faucille + épine ; minor = boucles / croisés (`edgeTier`) |

CEO craft → ensuite **0b KEEP** (fixer les defaults).

---

## 3. Suite craft

| Phase | Quoi | Gate |
|-------|------|------|
| **0a** | KEEP Hero (§2) | ✅ |
| **0b** | KEEP Constellation (knobs lab onglet 2) | ⏳ specs CEO |
| **A→F** | Chorégraphie ci-dessous | après 0b |

---

## 4. Chorégraphie reveal (A→F) — canon craft

**Principe :** une seule timeline (`revealT`). Caméra **liée** au même `revealT` (pas un 2ᵉ clock).  
**Hero** = **centre causal** (traits partent de lui) — **pas** obligé d’être le centroïde géométrique du graphe Leo (la silhouette prime).

### 4.1 Recette naissance (KEEP craft — 26 août) — reproduire

**Lab :** `/fr/contribute/test-lueur` → onglet **Constellation** → **Rejouer** (durée ~14 s).  
**« Tous ghosts »** ≈ état 1ʳᵉ anim (slots non allumés).

| Fichier | Rôle |
|---------|------|
| [`graphs/birth.ts`](../src/components/contribute/constellation/graphs/birth.ts) | Timeline nom + Hero C0–C2 (`resolveBirth`) |
| [`graphs/revealCamera.ts`](../src/components/contribute/constellation/graphs/revealCamera.ts) | Pose cam serrée → pull-back |
| [`RevealCamera.tsx`](../src/components/contribute/constellation/RevealCamera.tsx) | Applique la pose ; `FocusCamera` cède |
| [`HeroStar.tsx`](../src/components/contribute/constellation/HeroStar.tsx) | Layers KEEP + `birth` (grain/veil/core) |
| [`SanctuaryUniverse.tsx`](../src/components/contribute/SanctuaryUniverse.tsx) | Wire Html nom + offset `heroFromName` |
| [`graphs/reveal.ts`](../src/components/contribute/constellation/graphs/reveal.ts) | `DEFAULT_CONSTELLATION_REVEAL_MS = 14000` · traits (`heroShare: 0`) |

#### Constantes timeline (`birth.ts`)

| Const | Valeur | Sens |
|-------|--------|------|
| `A_END` | `0.02` | Vide très court |
| `B_END` | `0.40` | Fin hold nom (avant draw) |
| `HERO_START` | `0.30` | Grain/voile commencent **dans** le nom |
| `C_END` | `0.58` | Fin C0–C2 · début traits |
| Cam birth Z | `≈3.45` | Serré sur Hero+nom |
| Cam idle Z | `≈7.5` | Cadre Leo |
| Offset départ Hero | **`y = −0.24`** | Milieu optique du mot (pas −0.4 = trop bas) |
| Durée play | **14 s** | `DEFAULT_CONSTELLATION_REVEAL_MS` |

Beat lab (affiche `A` / `B` / `C0` / `C1` / `C2` / `draw`) = `resolveBirth(revealT).beat`.

#### Recette B — Nom (fumée → mot)

**Intention :** deuil magique, pas typewriter. Nom **sous** l’étoile (pas centroïde écran). Une fois posé → **figé** (pas de yield pendant C).

| Canal | Comportement |
|-------|----------------|
| Clarity / blur | Brume → net (easeOutQuad) |
| Lift + scale | Breath d’apparition (désync) |
| Tracking | Large → se resserre |
| Drift | Seulement pendant la brume · **0** une fois land |
| Glow | Crest au land, puis whisper |

**Interdit :** bobbing idle du nom · yield quand l’étoile naît (retirés — trop méca).

#### Recette C0–C2 — Hero naît **du** nom

**Intention :** formation stellaire / Quiet Luxury — pas supernova. Spikes = **C3** (pas encore).

| Sous-beat | `u` local (0→1 sur `[HERO_START, C_END]`) | Visuel |
|-----------|-------------------------------------------|--------|
| **C0** | tôt | Grain + voile = **même langage fumée que le nom** |
| **C1** | milieu | Core blanc minuscule ; teal en retard |
| **C2** | fin | Core/teal → **KEEP 1:1** ; voile contracte ; montée terminée |

**Voile / grain (souffle) — à reproduire ainsi :**

1. Opacité : fumée soft (pas pop opaque).  
2. Scale : **mini → peak lent (`easeInOut`, grow jusqu’à ~u 0,42–0,48) → contracte** vers le core.  
   ❌ Pas : start-at-max puis shrink only.  
3. Grossissement **plus lent** que le reste si ça « précipite » — élargir la fenêtre `smoothstep` du grow.

**Montée `heroFromName` :**

- `0` = dans le milieu du nom · `1` = siège Hero idle.  
- Courbe `organicFromName` : **hold dans le mot** → se détache → soft land (pas easeOut UI rail).  
- Taille Hero **en retard** sur la montée (désync).

**KEEP :** quand `heroKeep` (après `C_END` + voile/grain morts) → `birth={undefined}` sur `HeroStar` = atom §2 exact.

#### Recette caméra

| Moment | Framing |
|--------|---------|
| A–C | Serré Hero+nom (`REVEAL_CAM_BIRTH_Z`) · look un peu sous le Hero |
| draw → 1 | Pull-back easeInOut → cadre Leo (`REVEAL_CAM_IDLE_Z`) |
| Restart Play | Snap immédiat au cadre birth (pas lerp depuis idle) |

#### Checklist validation (rejouer)

1. Nom : fumée → mot lisible, **figé** sous l’étoile.  
2. ~0,30 : grain **dans** le mot (pas sous le bas des lettres).  
3. Voile : mini → peak fluide → contracte (pas précipité).  
4. Étoile monte du nom vers le siège.  
5. Fin C / draw : Hero = **KEEP** onglet 1.  
6. Traits après ~0,58 · cam s’ouvre.

#### Pas encore (C3–C5 / F)

Spikes en dernier · flash ≤ 0,12 · micro-hold avant 1er trait · whisper / proximité souris.

---

### Beats A→F (canon long — rappel)

| Beat | Visuel | Caméra |
|------|--------|--------|
| **A** | Vide / poussière (`t≈0`) | Déjà serré |
| **B** | **Nom naît** (bloom / brume) | Serré, stable |
| **C** | **Hero** (C0–C2 câblé · C3–C5 TODO) | Serré |
| **D** | Traits partent du Hero | Début pull-back |
| **E** | Slots s’éveillent | Pull-back continue |
| **F** | Whisper + champ souris | Cadre idle Leo |

### Hors scope A→F (plus tard)
Palette Champ / SKU · seuils Lueurs — [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md) §7.
