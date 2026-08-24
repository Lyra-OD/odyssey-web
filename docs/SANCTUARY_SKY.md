# Odyssey — Ciel du Sanctuaire (étoiles-mémoire)

**Statut : vision figée · 29 juillet 2026** · **MAJ craft silhouette :** 24 août 2026 (`leo-graph-v1`)  
**Base technique sécurisée :** commit `6ded642` (WebGL galaxy / `LueurNode` / `test-ciel`)

Document canonique de l’expérience **ciel** du Sanctuaire invité et du **pont** vers le film famille.  
**Craft technique / layers / polish WebGL :** [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md).  
**Atome Lueur (carte vs ciel) :** [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md).  
**Knobs / thème ciel (couleurs, presets) :** [`SANCTUARY_SKY_THEME.md`](SANCTUARY_SKY_THEME.md).  
Complète [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) (positionnement / monétisation) et [`VISION_PHASE_2.md`](VISION_PHASE_2.md) §2.1 (modération invité). Ne remplace pas le wizard film ([`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md)).

---

## 1. Promesse

> **Déposer reste simple. Le ciel rend ça magique. Le film reste un choix familial en 1 bouton clair.**

- **Une étoile = une mémoire** (photo, vidéo, voix, message) — pas un avatar de personne.
- **Centre = Lueur pure** (présence / mystère) — jamais un portrait vignette.
- **Autour = satellites de mémoire** en orbite.
- Poésie = **image + mouvement**. Mots UI = **table de cuisine**.

Test d’or :

> Une grand-mère réussit le geste en 10 secondes.  
> Un ado dit « wait wtf c’est beau ».  
> Les deux comprennent la même chose.

---

## 2. Deux espaces (ne pas fusionner)

| Qui | Où | Quoi |
|-----|-----|------|
| **Invités** | Sanctuaire `/contribute/[token]` | Ajoutent un souvenir → étoile dans le ciel |
| **Famille** | Studio / wizard (étapes 3→7) | Actes / chapitres, Livre Ouvert, export film |
| **Pont** | Review famille | La famille **choisit** ce qui entre dans le film |

- Placement XY dans le ciel **≠** slot dans un chapitre.
- **Jamais** de drag ciel → grille d’acte.
- Le ciel est le **lieu permanent du cercle** ; le film est une **lecture narrative**.

---

## 3. Double mode UX

1. **Fond du Sanctuaire** — ciel WebGL derrière l’UI, **non interactif** (`pointer-events: none`), caméra calme.
2. **Voir le ciel** — plein écran **interactif** (drag, focus / révélation). Sortie claire (fermer / Esc).

Le dépôt formulaire reste le chemin sûr ; le ciel est la **récompense**, pas un prérequis.

---

## 4. Rituel en 3 temps

1. **Naissance** — après dépôt, l’étoile apparaît (micro-copie : « C’est dans le ciel. »). Pas de toast SaaS « upload OK ».
2. **Vie en fond** — le ciel se remplit pendant qu’on navigue le Sanctuaire.
3. **Voir le ciel** — explorer, ajuster sa place, **toucher une étoile** = révéler le média dans la lumière.

Révélation : morph soft, **1 média à la fois**, pas de grille de vignettes. Vidéo = preview silencieux + play explicite.

---

## 5. Lexique UI figé

| Interne / trop opaque | **UI (obligatoire)** |
|----------------------|----------------------|
| Allumer une âme | **Ajouter un souvenir** |
| Satellite de mémoire | *(montré, pas nommé)* |
| Accueillir dans le récit | **Mettre dans le film** |
| Garder au ciel seul | **Garder seulement ici** |
| Archiver | **Retirer du ciel** |
| Mode constellation | **Voir le ciel** |
| Inbox `pending_review` | **Nouveaux souvenirs** (« 4 nouveaux ») |

Code / docs internes peuvent garder Lueur, âme, constellation. **Face user = lexique ci-dessus.**

### Gestes max

**Invité — 2 gestes**

1. Ajouter un souvenir  
2. Voir le ciel (optionnel) — tap = voir la photo  

Pas de « pour le film ? » au dépôt.

**Famille — 3 gestes** sur un souvenir

1. Mettre dans le film  
2. Garder seulement ici  
3. Retirer du ciel  

Ensuite : Livre Ouvert (placement dans un chapitre) — zéro nouveau paradigme montage.

---

## 6. Pont étoile → film

### Décision figée

**Toujours les deux** : « Mettre dans le film » = le souvenir **reste** au ciel **et** entre en banque storyboard (`approved`).  
Seul **Retirer du ciel** éteint l’étoile publique.  
Formule : *Le ciel garde tout ; le film choisit.*

### États

```text
Dans le ciel (pending_review)
  → Mettre dans le film → banque (approved) → assigné chapitre (acte)
  → Garder seulement ici (reste ciel, pas film)
  → Retirer du ciel (archived — Smart Pacing, pas delete brutal)
```

Signe discret si aussi dans le film (anneau / fil un peu plus chaud) — **pas** de badge SaaS « in movie ».

### Portes famille

1. Inbox **Nouveaux souvenirs** (`SanctuaryInvitePanel` / Studio)  
2. Focus étoile en mode ciel (session famille)  
3. Filet Étape 5 : badge **Invité · prénom** + filtre pending  

Confirmation prose après « Mettre dans le film » :

> On l’a ajouté aux médias du film. Vous pourrez le placer dans un chapitre.

### État technique au moment de la figé (29 juil. 2026)

| Existe | Manque |
|--------|--------|
| `review_status` DB · dépôt → `pending_review` · Soft Cap exclut guests | UI/API approve / archive |
| Guests listés dans `GET /media` → peuvent fuir en banque | Badge provenance + geste conscient |
| `SanctuaryInvitePanel` = lien/QR | Compteur « N nouveaux » |

---

## 7. Règles artistiques

- Jamais de miniatures permanentes dans le ciel.  
- Voie lactée = poussière anonyme ; étoiles-mémoire = plus rares / plus présentes.  
- Centre = Lueur pure ; prénom du défunt possible comme ancrage, sans portrait.  
- **Silhouette** = template zodiaque (graphe 9 nœuds) — pas un nuage autour du centre.  
- Perf : `useVisualTier` (desktop / mobile / `prefers-reduced-motion`).  
- Éviter : tutoriel Voie lactée, jargon spirituel sur chaque bouton, forcer le mode ciel pour déposer.

### Hors scope (ne pas faire)

- Composer les actes **dans** le ciel  
- Auto-injecter chaque dépôt guest dans un acte  
- Drag fichier / cloud-drive sur le canvas  
- Soft Cap sur médias guest sans décision produit explicite  
- Rename produit Lueur → Étoile (différé)

---

## 8. Plan d’exécution — demain (30 juil. 2026)

Ordre strict. Ne pas attaquer le pont avant polish + double mode + révélation.

| # | Bloc | Done when |
|---|------|-----------|
| **A** | **Polish ciel** (`LueurNode`, `StarDust`, `SanctuaryUniverse`) — scintillement, voie lactée plus riche, plus d’étoiles | `test-ciel` donne le WTF sans médias |
| **B** | **Double mode** — fond non interactif sur Sanctuaire + bouton **Voir le ciel** | Contribute normal vivant ; mode ciel produit |
| **C** | **Étoiles = médias** — focus révèle photo (3–5 assets), centre Lueur pure | Tap = « ah, c’est une photo » |
| **D** | **Pont famille (socle)** — PATCH review + 3 actions + badge Invité ; inbox stretch | Famille peut Mettre / Retirer sans jargon |

**Stretch J+1 :** naissance post-deposit animée, persist positions, anneau « aussi dans le film ».

Fichiers clés :

- `src/components/contribute/LueurNode.tsx`
- `src/components/contribute/SanctuaryUniverse.tsx`
- `src/components/contribute/SanctuaryLanding.tsx`
- `src/components/contribute/constellation/*`
- `src/components/tribute/SanctuaryInvitePanel.tsx`
- `app/api/contribute/[token]/deposit/route.ts` + future route review médias

---

## 9. Liens

- [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) — positionnement / monétisation  
- [`VISION_PHASE_2.md`](VISION_PHASE_2.md) §2.1 — modération + badge provenance  
- [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md) — actes / banque  
- [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md) — Phase 3 Sanctuaire  
- Preview dev : token `test-ciel` (`src/lib/contribute/sanctuaryPreview.ts`)
