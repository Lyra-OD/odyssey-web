# Odyssey — Craft Lueur (Hero · Constellation · Produit)

**Type :** craft · **Vérité pour :** lab atome blanc+teal + emboîtement constellation / SKU.  
**Dernière MAJ :** 24 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 24 août 2026 — Force + rotation spikes sur chaque layer (blanc / teal / spikes).
- 24 août 2026 — Layers indépendants (taille / glow / breath / Z) + parallax souris.
- 24 août 2026 — Lab `/fr/contribute/test-lueur` · 3 onglets · atome `HeroStar` (ref diffraction).

**Preview :** `/fr/contribute/test-lueur` (dev only)  
**Ciel :** [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) · **Orb carte :** [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md)

---

## 1. Trois onglets (un lab)

| Onglet | Quoi | État |
|--------|------|------|
| **1 — Hero** | Atome défunt seul — blanc + teal, spikes, breath | 🚧 craft sur ref photo |
| **2 — Constellation** | Graphe Leo + reveal — Hero au centre | 🚧 branche `HeroStar` ensuite |
| **3 — Lueur produit** | SKU / carte / ritual — même famille | 🚧 remplacer `LueurNode` par atome validé |

Règle : **valider Hero seul** avant de brancher 2 et 3.

---

## 2. Atome

**Fichier :** [`HeroStar.tsx`](../src/components/contribute/constellation/HeroStar.tsx)

- Par layer : **taille** · intensité · respiration · **profondeur Z** · **force spikes** · **rotation**
- Global : **parallax souris** (faux 3D)
- Additive blending · ref photo diffraction

---

## 3. Suite

1. Geler knobs Hero (KEEP)  
2. Brancher `HeroStar` dans constellation (remplace hero `LueurNode`)  
3. Brancher dans `SanctuaryLueurOrb` (carte + ritual)  
4. MAJ [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md) — un atome, trois contextes
