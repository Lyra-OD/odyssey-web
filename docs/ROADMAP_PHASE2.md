# Odyssey — Roadmap Phase 2  
## Vision : Le Moteur Cinématographique Avancé

**Statut :** Vision produit · **non implémenté**  
**Last updated :** 28 juillet 2026  
**Fondation livrée (P0) :** mapping dynamique Storyboard → Creatomate — `src/lib/creatomate/`  
**Documents liés :** [`VISION_PHASE_2.md`](VISION_PHASE_2.md) · [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) · [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md) · [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)

---

## Thèse Odyssey 2027

> **Odyssey n’est pas un générateur vidéo.**  
> C’est le lieu où le souvenir devient une **œuvre**, un **rituel**, et un **standard** pour les professionnels du deuil.

| Ce que nous refusons | Ce que nous construisons |
|----------------------|---------------------------|
| Slideshow SaaS / collages chronologiques | Chef-d’œuvre A24 · Quiet Luxury |
| IA qui « décrit » ou « ressuscite » | IA qui **évalue l’humeur** et sert la dignité |
| Un MP4 jetable | Une **pellicule Odyssey** + Sanctuaire vivant (reflets : extrait, Livre, jeton NFC) |
| Dashboard froid | **Rituel** : souffle d’intro, présence, geste après le film |
| Famille dépossédée par l’algo | Famille **souveraine** — l’arc Odyssey propose, elle scelle |

**P0** livre le moteur de film crédible.  
**Phase 2** (ci-dessous) le rend **cognitif et sensoriel**.  
**Au-delà** : le même moteur irrigue l’écosystème (Sanctuaire, salons, transmission) — une œuvre, plusieurs vies.

**Ordre d’exécution recommandé :** Stingray master → pellicule / Smart Ken Burns → Ghost Track → arc narratif IA (override famille) → écosystème autour du master.

---

> **Principe Phase 2.** Le Moteur Cinématographique Avancé positionne Odyssey comme un **Moteur Cognitif et Sensoriel** — niveau chef-d’œuvre — où chaque hommage devient une œuvre cohérente, émotionnelle et unifiée, au-delà du collage chronologique.

```text
P0 — Mapping Creatomate ✅
     cinematicTheme · résolution forfaits · intro Signature · ducking
            │
            ▼
Phase 2 — Moteur Cinématographique Avancé (vision)
     ┌─────────────────┬──────────────────┬────────────────────┐
     │  Ghost Track    │  Moteur Narratif │  Smart Ken Burns   │
     │  (sensoriel)    │  (cognitif)      │  + Relighting      │
     └─────────────────┴──────────────────┴────────────────────┘
```

---

## Vision Phase 2 : Le Moteur Cinématographique Avancé

Trois piliers. Aucun ne modifie aujourd’hui l’architecture P0 (`payloadBuilder`, `cinematicTheme`, etc.) : ils s’y **branchent** en amont (analyse) et en aval (enrichissement du plan de rendu).

---

### 1. Le « Ghost Track » Audio — *La Tapisserie des Souvenirs*

| | |
|---|---|
| **Essence** | Une nappe sonore discrète, tissée à partir de la vie réelle capturée dans les vidéos. |
| **Ambition** | Écho nostalgique **découplé de l’image** — comme au cinéma indépendant, où un rire ou une voix traverse une photo silencieuse. |

#### Concept

Le backend (pipeline **FastAPI** / worker média) **extrait l’audio** des vidéos uploadées : rires, fragments de discours, bruits d’ambiance, souffles de salle.

Ces extraits ne restent plus prisonniers de leur clip d’origine. Le moteur compose une **tapisserie** — une couche audio secondaire, basse et continue — jouée **sous les séquences de photos silencieuses**, en parallèle de la musique Stingray (avec ducking / mixage Quiet Luxury).

#### But produit

- Transformer le silence des photos en **présence**.
- Créer une mémoire sonore **transversale** au montage (pas un simple « son de la vidéo en cours »).
- Renforcer le sentiment : *« ils sont encore là »,* sans narration forcée.

#### Implications techniques (cible)

| Couche | Intention |
|--------|-----------|
| Extraction | Job asynchrone post-upload ; stems normalisés, bruit résiduel contrôlé |
| Stockage | Artefacts audio dérivés (chemins Storage), métadonnées énergie / durée |
| Mix Creatomate | Piste `ghost` à volume très bas + segmentation / ducking déjà prévu dans le theme |
| Consentement | Aligné droits musique / contributions invitées — pas d’exfiltration hors projet |

> **Hors P0.** Le ducking Stingray actuel reste la base ; le Ghost Track s’ajoute comme **troisième couche** (bed musique · ghost · son clip).

---

### 2. Le Moteur Narratif — *Arc émotionnel par Vision IA*

| | |
|---|---|
| **Essence** | L’ordre du film n’est plus seulement chronologique : il suit un **arc émotionnel**. |
| **Ambition** | Un montage autonome digne d’une salle obscure — Setup → Climax → Résolution. |

#### Concept

**Avant** la construction du JSON Creatomate, les médias passent par un modèle de **Vision IA**.

L’IA **ne décrit pas** le contenu (pas de légendes verbeuses, pas de « femme souriante sur une plage »). Elle **évalue l’humeur et l’énergie** de chaque plan, selon un vocabulaire fermé, par exemple :

| Tag | Intention narrative |
|-----|---------------------|
| **Intime** | Proximité, regard, douceur |
| **Solennel** | Gravité, silence, rituel |
| **Chaotique** | Mouvement, foule, intensité |
| **Festif** | Joie collective, éclat |

Ces métadonnées alimentent le `payloadBuilder` (ou un préprocesseur `narrativeArc.ts`) pour réordonner / pondérer le rythme :

```text
Setup        →  plans intimes, lenteur, respiration
Climax       →  plans chaotiques / festifs, coupe plus vive
Résolution   →  portraits serrés, solennel, retour au calme
```

Le storyboard famille reste la **matière première** ; l’arc IA propose une **lecture émotionnelle** (avec garde-fou : la famille peut conserver l’ordre Livre Ouvert).

#### But produit

- Passer d’un diaporama ordonné à un **film qui respire**.
- Différencier Odyssey des outils « slideshow SaaS ».
- Préparer le terrain Soft Cap / upsell : la qualité perçue du master justifie Éternité / Légendaire.

#### Implications techniques (cible)

| Couche | Intention |
|--------|-----------|
| Inférence | Batch Vision post-ingest ; tags stockés sur `media_assets` (ou table dérivée) |
| Contrat | Schéma Zod strict — pas de prose libre dans le chemin de rendu |
| Builder | Consomme les tags ; `cinematicTheme` reste la DA (durées, transitions) |
| Transparence | Mode « Ordre famille » vs « Arc Odyssey » — Quiet Luxury, jamais opaque |

---

### 3. Cinematic Relighting & Intelligence Spatiale — *Smart Ken Burns*

| | |
|---|---|
| **Essence** | Une seule « pellicule Odyssey » pour des sources disparates. |
| **Ambition** | Cadrage intelligent + lumière unifiée — texture haut de gamme, sans look filtre Instagram. |

#### Concept — deux volets

**A. Cadrage IA (Smart Ken Burns)**  
Détection des **visages** et points d’intérêt pour piloter `transform_origin` / focal / panoramiques. Les mouvements lents (Ken Burns Quiet Luxury) **ne coupent jamais un regard**. Enrichit et dépasse les `focalPoints` manuels de l’Étape 5.

**B. Traitement & unification**  
- **Luma mattes** dynamiques (révélation / masquage éthéré, dans la lignée de l’intro Signature).  
- **Light leaks** subtils — accents contrastés (néons / fluorescents) selon la DA Odyssey, jamais agressifs.  
- Objectif : unifier smartphone, scan, VHS et portraits studio sous une **texture visuelle cohérente**.

#### But produit

- Qualité « chef-d’œuvre » perceptible dès les premières secondes.
- Réduire l’écart entre médias « beaux » et médias « bruts ».
- Ancrer la Signature Odyssey au-delà de la typo d’intro.

#### Implications techniques (cible)

| Couche | Intention |
|--------|-----------|
| Vision spatiale | Boxes visage / POI → focal automatique + validation famille |
| Relight / LUT | Pipeline pré-Creatomate ou overlays RenderScript pilotés par `cinematicTheme` |
| Accents DA | Tokens de couleur déjà isolés dans le theme — extension « leaks / mattes » sans hardcode builder |
| Perf | Traitement async ; le drain Creatomate ne recalcule pas la Vision à chaque retry |

---

## Positionnement par rapport au P0

| Livré (P0) | Phase 2 (vision) |
|------------|------------------|
| `cinematicTheme` + unités `vmin` / `%` | Enrichir le theme (ghost volume, arc pacing, leak opacities) **sans** casser le contrat |
| Intro Signature A24 (3 actes) | Relighting + luma mattes sur toute la timeline |
| Ducking musique / vidéo | Ghost Track comme couche supplémentaire |
| Ordre storyboard Livre Ouvert | Arc émotionnel IA (optionnel / premium) |
| Focal manuel Étape 5 | Smart Ken Burns (suggestion + override famille) |
| Résolution 1080p / 4K par forfait | Inchangé — le moteur avancé **sert** Éternité / Légendaire |

---

## Principes non négociables

1. **Quiet Luxury** — pas de motion template criarde ; toute IA sert la dignité du souvenir.  
2. **Famille souveraine** — suggestions narratives et cadrages, jamais confiscation du récit.  
3. **Server-side only** — Vision, extraction audio, entitlements : jamais de confiance client pour le master.  
4. **Theme-driven** — la DA reste dans `cinematicTheme` (et extensions futures) ; le builder compile, il ne décide pas du goût.  
5. **P0 intact** — cette roadmap **ne modifie pas** `src/lib/creatomate/*.ts` tant qu’un chantier d’implémentation n’est pas ouvert explicitement.

---

## Prochaine étape d’exécution (hors vision)

Avant d’ouvrir les piliers 1–3 ci-dessus :

1. **Branchement URL master Stingray** (hook déjà prévu dans `resolveChapterAudio`).  
2. Puis, selon priorité produit : Ghost Track **ou** tags Vision (le Relighting peut suivre une fois le master audio stable).

---

*Document de vision — Odyssey Frontend · Phase 2 Cinematic Engine · juil. 2026*
