# Odyssey — Craft Lueur (Hero · Constellation · Produit)

**Type :** craft · **Vérité pour :** lab atome blanc+teal + emboîtement constellation / SKU.  
**Dernière MAJ :** 24 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 24 août 2026 — Onglet 2 : timeline reveal Leo (play / pause / scrub + knobs).
- 24 août 2026 — Plan P0–P8 + onglet Champ (lien ciel économique).
- 24 août 2026 — lien [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md) (palette produit ≠ knobs lab).
- 24 août 2026 — Force + rotation spikes sur chaque layer (blanc / teal / spikes).
- 24 août 2026 — Lab `/fr/contribute/test-lueur` · HeroStar layers.

**Preview :** `/fr/contribute/test-lueur` (dev only)  
**Ciel :** [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) · **Orb carte :** [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md)  
**Produit / couleurs / prix Lueurs :** [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md)

---

## 1. Trois onglets (un lab)

| Onglet | Quoi | État |
|--------|------|------|
| **1 — Hero** | Atome défunt seul — blanc + teal, spikes, breath | 🚧 craft sur ref photo |
| **2 — Constellation** | Graphe Leo + reveal — **play / pause / scrub** + knobs | ✅ contrôles craft |
| **3 — Lueur produit** | SKU / carte / ritual — même famille + **palette** | 🚧 + teintes curatées |
| **4 — Champ** (à ajouter) | Grille B : N lueurs colorées + naissance | 🔜 plan [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md) §7 |

Règle : **valider Hero seul (P0)** avant de brancher 2 → 3 → 4.

---

## 2. Atome

**Fichier :** [`HeroStar.tsx`](../src/components/contribute/constellation/HeroStar.tsx)

- Par layer : **taille** · intensité · respiration · **profondeur Z** · **force spikes** · **rotation**
- Global : **parallax souris** (faux 3D)
- Additive blending · ref photo diffraction

---

## 3. Suite

Plan détaillé : [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md) §7 (P0–P8).

1. Geler knobs Hero (KEEP) — **P0**  
2. Brancher `HeroStar` dans constellation ; souvenirs perle — **P1**  
3. Palette + onglet Champ + naissance — **P2–P4**  
4. Wire SKU → ciel — **P6** · seuils — **P7**
