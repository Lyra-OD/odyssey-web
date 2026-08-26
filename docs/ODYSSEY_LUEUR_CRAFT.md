# Odyssey — Craft Lueur (Hero · Constellation · Produit)

**Type :** craft · **Vérité pour :** lab atome blanc+teal + emboîtement constellation / SKU.  
**Dernière MAJ :** 26 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 26 août 2026 — Naissance + **cam** : serré A–C (nom breath scale/lift) → pull-back au draw (`RevealCamera`).
- 26 août 2026 — Lab constellation : knobs **slots** + **traits major/minor** (style · couleur · glow).
- 26 août 2026 — Plan A→F + **caméra** (canon, pas encore câblé) : serré → pull-back ; Hero = centre causal.
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

### Naissance seule (câblé — 26 août)

Fichier : [`birth.ts`](../src/components/contribute/constellation/graphs/birth.ts) · cam : [`revealCamera.ts`](../src/components/contribute/constellation/graphs/revealCamera.ts) · durée défaut **14 s**.

| Beat | `revealT` | Visuel (~temps) | Caméra |
|------|-----------|-----------------|--------|
| **A** | 0 → 0,04 | Vide court (~0,6 s) | **Serrée** Hero+nom (z≈3,45) |
| **B** | 0,04 → 0,46 | Nom : masse floue → **scale+lift** + tenue | Serrée, stable |
| **C** | 0,46 → 0,70 | Mote → grow + nom **yield** ; flash ≤ ~0,14 | Serrée |
| **draw** | 0,70 → 1 | Traits | **Pull-back** → cadre Leo (z≈7,5) |

Émotion : deuil magique. Whisper / proximité souris = plus tard.

### Beats

| Beat | Visuel | Caméra |
|------|--------|--------|
| **A** | Vide / poussière (`t≈0`) | Déjà serré (ou très léger drift) |
| **B** | **Nom naît** (bloom / brume — pas typewriter) | Serré, stable |
| **C** | **Hero s’allume** — même souffle que le nom | Serré, Hero optique centre |
| **D** | Traits **partent du Hero** vers l’extérieur | Début pull-back |
| **E** | Chaque slot **s’éveille** à l’arrivée du trait | Pull-back continue |
| **F** | Inspire collectif des nœuds → traits en **whisper** (~8–12 %) + **champ souris** (proximité, pas hitbox UI) | Cadre idle Leo |

### Hors scope A→F (plus tard)
Palette Champ / SKU · seuils Lueurs — [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md) §7.
