# Odyssey — Craft Lueur (Hero · Constellation · Produit)

**Type :** craft · **Vérité pour :** lab atome blanc+teal + emboîtement constellation / SKU.  
**Dernière MAJ :** 26 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 26 août 2026 — **KEEP Hero** : defaults `DEFAULT_HERO_*` + parallax 1.2 · globalScale 0.83 · ratios OK.
- 26 août 2026 — Plan chorégraphie A→F (naissance nom/Hero → whisper + champ) — après lock constellation.
- 25 août 2026 — Onglet 2 : Hero craft partagé · courant trait/étoile/orbe.
- 24 août 2026 — Timeline reveal Leo · force/rotation spikes · lab test-lueur.
- 24 août 2026 — Plan P0–P8 + onglet Champ.

**Preview :** `/fr/contribute/test-lueur` (dev only)  
**Ciel :** [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) · **Orb carte :** [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md)  
**Produit / couleurs / prix Lueurs :** [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md)

---

## 1. Trois onglets (un lab)

| Onglet | Quoi | État |
|--------|------|------|
| **1 — Hero** | Atome défunt seul — blanc + teal, spikes, breath | ✅ **KEEP** 26 août |
| **2 — Constellation** | Graphe Leo — **même HeroStar que onglet 1** + reveal + courant | ✅ craft |
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

## 3. Suite craft

| Phase | Quoi | Gate |
|-------|------|------|
| **0a** | KEEP Hero (ci-dessus) | ✅ |
| **0b** | KEEP Constellation (knobs lab) | ⏳ specs CEO |
| **A→F** | Naissance nom/Hero · draw-from-Hero · settle whisper + champ | après 0b |

Plan Lueurs : [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md) §7 (P0–P8).
