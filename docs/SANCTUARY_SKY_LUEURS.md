# Odyssey — Ciel économique (Lueurs)

**Type :** produit · **Vérité pour :** teal défunt · Lueurs colorées · ciel qui se remplit · valeur ressentie.  
**Dernière MAJ :** 24 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 25 août 2026 — Lien parcours onboarding [`product/SANCTUARY_USER_JOURNEY.md`](product/SANCTUARY_USER_JOURNEY.md).
- 24 août 2026 — Plan d’arrivée P0–P8 (craft → produit) + onglet Champ.
- 24 août 2026 — Canon initial (brainstorm CEO) : 2 grilles, palette curatée, prix égal, moments inoubliables.

**Liens :**
- Ciel / souvenirs : [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md)
- Parcours User X (prologue · hub · tiroir) : [`product/SANCTUARY_USER_JOURNEY.md`](product/SANCTUARY_USER_JOURNEY.md)
- Craft atome : [`ODYSSEY_LUEUR_CRAFT.md`](ODYSSEY_LUEUR_CRAFT.md) · [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md)
- SKU prix : [`MONETIZATION_CATALOG.md`](MONETIZATION_CATALOG.md) §A.3 · live = `pricingConfig` / `guestSupportPacks`
- Positionnement : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md)

**Statut :** vision produit à figer en craft — **pas encore** implémenté dans le graphe Leo / champ Lueurs.

---

## 1. Promesse

> **Le défunt reste teal — unique et sacré.  
> Les Lueurs colorées sont la vie qui s’agrège.  
> Plus les gens déposent, offrent ou achètent — plus le ciel devient inoubliable.**

Le ciel n’est pas seulement beau : c’est la **preuve vivante** du produit. On *voit* l’amour s’accumuler.

---

## 2. Deux grilles (ne pas fusionner)

| Grille | Qui / quoi | Couleur | Remplit comment |
|--------|------------|---------|-----------------|
| **A — Silhouette** (ex. Leo, modèle C) | 1 hero défunt + slots **souvenirs** famille | Hero = **teal** ; souvenirs = perle / soft (pas teal) | Dépôt mémoire → slot s’allume |
| **B — Champ Lueurs** | SKU / offrandes (`guest_candle`…) | **Palette curatée** (magenta, bleu, violet…) | Achat / offrande → une étoile de plus |

- Teal = **défunt seul** — jamais une Lueur achetable en teal.
- Souvenir (média) ≠ Lueur payée (présence colorée). Deux histoires, **un même ciel**.
- [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) reste la vérité pour « étoile-mémoire » + pont film. **Ce doc** = couche économique / émotionnelle Lueurs.

---

## 3. Couleurs

### Règles

1. **Palette courte** (4–6 teintes nommées) — pas de color picker RGB.
2. Exemples de direction (noms marketing à caler en copy) : *Aube*, *Abysse*, *Améthyste*, *Braise*, *Nuit*…
3. Même atome visuel (`HeroStar` / `LueurNode`) — seul le **hue / glow** change.
4. Hero teal reste **plus grand / plus brillant** que toute Lueur colorée (hiérarchie).
5. Événements plus tard : éditions limitées (*Lueur d’hiver*, collab) — **pas** une hiérarchie de prix permanente par teinte.

### Anti-patterns

- ❌ Sapin de Noël (trop de teintes saturées)
- ❌ Teal vendu / offert comme SKU
- ❌ Souvenirs famille peints en teal « ghost » sans distinction claire du hero

---

## 4. Prix

### Décision V1

| Sujet | Règle |
|-------|--------|
| Couleur | **Même prix** pour toutes les teintes de la palette |
| SKU Lueur | Prix unique catalogue (ex. **19 $** `guest_candle`) — voir Monetization |
| Premium ailleurs | **Place** (près du défunt), **pack**, **message**, **durée**, **mécène** — pas la teinte |

### Pourquoi pas « violet = +10 $ »

- Dans un espace de deuil, le prix par couleur devient **statut / comparaison** — toxique.
- Double friction (choix teinte + choix prix) tue le geste généreux.
- La rareté se monétise mieux en **édition / pack / mécénat** qu’en échelle de teintes.

---

## 5. Moments inoubliables (valeur ressentie)

Objectif : chaque geste = **preuve visible + émotion + histoire à raconter**.

| # | Moment | Intention |
|---|--------|-----------|
| 1 | **Naissance** | Pas un pop : 2–3 s de cinéma (respiration, filament, micro-silence, puis lueur) |
| 2 | **Signature** | Au focus : prénom / initiale / courte phrase — on voit *des gens*, pas un panier |
| 3 | **Seuils du ciel** | 1ʳᵉ · graphe complet · 50 · 100… → nebula / voie lactée / halo hero **évoluent** |
| 4 | **Deux rythmes** | Famille allume un slot (A) · monde offre une Lueur (B) — lisible au premier regard |
| 5 | **Retour dans le temps** | « Il y a 3 mois, 4 lueurs. Aujourd’hui, 47. » — valeur = amour accumulé |
| 6 | **Lien partage** | « Allumer une lueur pour [Prénom] » — ~10 s, mobile, respectueux |
| 7 | **Rituel récurrent** | Anniversaire / date choisie : le ciel **pulse**, toutes les lueurs respirent ensemble |
| 8 | **Ancre hors écran** (option) | Carte / certificat « ta lueur *Améthyste* brille dans le ciel de… » |

---

## 6. Hiérarchie visuelle (rappel craft)

1. **Hero teal** — centre, diffraction, inimitable  
2. **Souvenirs** (grille A) — perle / soft, slots fantômes → remplis  
3. **Lueurs colorées** (grille B) — champ / anneau / nuage ; densifie le ciel  
4. Fond galaxie / gaz — déjà [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md)

Craft knobs : [`ODYSSEY_LUEUR_CRAFT.md`](ODYSSEY_LUEUR_CRAFT.md) — palette produit **ici**, pas dans le lab seul.

---

## 7. Plan d’arrivée (craft → produit)

Ancré sur les labs existants. **Ne pas** ouvrir un 5ᵉ URL craft sans besoin : étendre `/test-lueur` + brancher dans `/test-ciel`.

### Labs aujourd’hui

| Lab | Rôle dans ce plan |
|-----|-------------------|
| `/test-lueur` | Atome Hero · Constellation · SKU carte — **foyer Lueur** |
| `/test-ciel` | Fond galaxie / gaz / parallaxe — seuils de ciel plus tard |
| `/test-wormhole` · `/test-eclipse*` | Hors scope (marque / warp) |

### Phases

| Phase | Quoi | Où craft | Critère KEEP / done |
|-------|------|----------|---------------------|
| **P0** | Geler **Hero teal** (diffraction) | Lab onglet 1 | Knobs figés, DA OK |
| **P1** | Brancher Hero au centre Leo ; souvenirs = **perle** (plus teal ghost) | Lab onglet 2 → `SanctuaryUniverse` | Silhouette lisible, hero inimitable |
| **P2** | Atome **coloré** = même `HeroStar` + `hue` / preset palette | Lab onglet 3 (+ sélecteur teinte) | 4–6 presets, prix UX égal (pas de prix UI) |
| **P3** | **Onglet 4 — Champ Lueurs** (grille B) : N points colorés, densité, disposition anneau/nuage | **Étendre** `/test-lueur` (pas nouveau lab) | 20–50 lueurs mock lisibles vs Leo |
| **P4** | **Naissance** (2–3 s) : filament / breath / appear | Lab onglet 4 ou sous-mode | Replay bouton « naître » |
| **P5** | Copy + hex palette FR/EN (dictionnaires) | hors WebGL | Noms figés (*Améthyste*…) |
| **P6** | Wire produit : post-achat / offrande → spawn grille B dans ciel réel | `SanctuaryUniverse` + checkout | 1 Lueur achetée = 1 étoile colorée |
| **P7** | Seuils ciel (nebula / halo) + focus signature | `/test-ciel` + flags | 1ʳᵉ / 50 / 100 ressentis |
| **P8** | Lien partage + rituel date (pulse) | produit | Plus tard — après P6 stable |

### Craft : étendre, pas multiplier

- **Oui** : 4ᵉ onglet **Champ** dans `LueurCraftLab` (grille B + palette + naissance).
- **Non** (V1) : `/test-lueurs-champ` séparé — doublon avec `test-lueur` / `test-ciel`.
- Fond / seuils d’atmosphère → rester sur **`test-ciel`** (`skyTheme`), pas reinventer dans le lab Lueur.

### Ordre de travail recommandé (prochaines sessions)

1. **P0** — KEEP Hero (session craft courte)  
2. **P1** — Hero dans Leo + souvenirs dé-teal  
3. **P2 + P3** — palette + onglet Champ (même PR craft si possible)  
4. **P4** — naissance  
5. **P5** — copy  
6. **P6** — branchement SKU (produit, pas craft seul)

### Hors scope pour l’instant

- Prix par couleur  
- Color picker libre  
- Certificat papier / Gelato  
- Édition saisonnière

---

## 8. Une phrase

**Couleur = identité émotionnelle (prix égal).  
Prix premium = place, pack, moment, mécénat.  
Inoubliable = naissance visible + ciel qui mute avec l’amour + raison de revenir.**
