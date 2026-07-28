# Odyssey — Roadmap Phase 2  
## Vision : Le Moteur Cinématographique Avancé

**Statut :** Vision produit · **non implémenté** (sauf fondations P0)  
**Last updated :** 28 juillet 2026  
**Fondation livrée (P0) :** mapping Storyboard → Creatomate · Audio Stem Graph · One Bed Law — `src/lib/creatomate/`  
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
| Enchaînement mécanique des médias | **Respiration** dirigée — le rythme fait pleurer, pas seulement l’image |

**P0** livre le moteur de film crédible (œil + oreille de base).  
**Phase 2** le rend **cognitif, sensoriel, et respirant**.  
**Au-delà** : le même moteur irrigue l’écosystème (Sanctuaire, salons, transmission) — une œuvre, plusieurs vies.

---

## Les trois organes du moteur

```text
     ŒIL                         OREILLE                      POUMONS
     Vision / pellicule          Audio Stem Graph             Breath Engine
     (quoi / humeur / cadre)     (quoi on entend / mix)       (quand on retient / relâche)
            \                          |                           /
             \                         |                          /
              \________________________|_________________________/
                                       │
                         Direction émotionnelle unifiée
```

| Organe | Rôle | Fondation P0 | Phase 2 |
|--------|------|--------------|---------|
| **Œil** | Pellicule, Signature intro, Smart Ken Burns, arc Vision | `cinematicTheme` · `payloadBuilder` · résolution forfaits | Relighting · tags humeur · POI |
| **Oreille** | Beds, sync, ducking, One Bed Law | Stem Graph (`bed` / `sync` ; `ghost` / `foreground` dormants) | Ghost Track · VO · loudness |
| **Poumons** | Silence, attente, release | Intro Signature (embryon) | **Breath Engine** (pilier transversal) |

Le Breath Engine n’est **pas** une feature à côté des autres : c’est le **chef d’orchestre** qui fait travailler Œil et Oreille ensemble.

---

> **Principe Phase 2.** Le Moteur Cinématographique Avancé positionne Odyssey comme un **Moteur Cognitif et Sensoriel** — niveau chef-d’œuvre — où chaque hommage devient une œuvre cohérente, émotionnelle et **respirante**, au-delà du collage chronologique.

```text
P0 — Mapping Creatomate + Stem Graph ✅
            │
            ▼
Phase 2 — Moteur Cinématographique Avancé
     ┌──────────────────────────────────────────────────┐
     │              BREATH ENGINE (Poumons)               │
     │         Negative Space · Hold · Release            │
     └──────────────────────────────────────────────────┘
              │              │               │
              ▼              ▼               ▼
        Ghost Track    Moteur Narratif   Smart Ken Burns
        (Oreille+)       (Œil+)          + Relighting
```

---

## Vision Phase 2 : piliers

Les piliers ci-dessous **ne modifient pas** l’architecture P0 tant qu’un chantier d’implémentation n’est pas ouvert. Ils s’y branchent en amont (analyse) et en aval (enrichissement du plan de rendu + theme).

---

### 0. Le Breath Engine — *L’ingénierie du silence et de l’attente* ★ transversal

| | |
|---|---|
| **Essence** | L’émotion pure naît souvent du **vide**. Le moteur contrôle la **respiration** du montage, pas seulement l’ordre des médias. |
| **Ambition** | Negative Space temporel — le rythme fait pleurer, pas seulement l’image. |

#### Problème industrie

Tous les générateurs vidéo enchaînent mécaniquement :

```text
image A (N s) → transition → image B (N s) → …
```

Le cerveau s’habitue. Aucune tension. Aucune direction.

#### Concept — Negative Space

L’IA narrative (et / ou les règles Quiet Luxury du theme) ne gère pas seulement **quoi** montrer : elle décide **combien de temps retenir** et **quand relâcher**.

**Exemple canon (Signature Odyssey) :**

1. Le film s’arrête sur un **portrait solennel** magnifique.  
2. Le **bed** descend doucement (ducking motivé, pas un mute brutal).  
3. Le **Ghost Track** (ou leitmotiv Souffle) laisse un ambient / respiration très bas.  
4. Le moteur **retient** l’image **2–3 secondes de plus** que ce que le cerveau attend.  
5. Au moment exact du **release**, la musique reprend ; le montage bascule vers des plans **festifs / chaotiques**.

L’attente crée une tension émotionnelle massive. Le contraste release → joie fait basculer le spectateur.

#### Motivations du Breath (jamais aléatoire)

Un hold n’est légitime que s’il est **motivé**, par exemple :

| Signal | Effet typique |
|--------|----------------|
| Tag Vision **Solennel** / portrait serré | Hold 2–3,5 s + bed duck |
| **Fil du Temps** (écart d’années entre deux clichés) | Pont + silence + typo discrète (*« Douze hivers »*) |
| Fin de chapitre / fin de Setup | Respiration avant Climax |
| Avant **Chœur des Vivants** | Silence, puis entrée des voix |

#### Dose Quiet Luxury

- **1 à 3 breathes majeurs** par film — pas un hold sur chaque photo.  
- Hold borné (cible **2–4 s** de surplus) — jamais 8 s de noir mort.  
- Le cadre **vit** pendant le silence : micro-scale, grain, ghost très bas (pas un « gel bug »).  
- Mode famille : **Rythme Odyssey** (Breath on) vs **Livre Ouvert** (rythme plus linéaire).

#### Tokens theme (cible d’implémentation)

Extensions futures de `cinematicTheme` (noms indicatifs) :

- `breath.holdSecMin` / `holdSecMax`  
- `breath.anticipationBreakSec`  
- `breath.releaseCue` (bed rebound, cut festif…)  
- `breath.maxMajorBreathsPerFilm`  

Le `payloadBuilder` **compile** ; le Breath Engine **décide** via theme + tags — jamais de secondes magiques hardcodées dans le builder.

#### Lien avec les trois propositions d’impact émotionnel

| Proposition | Rôle | Lien Breath |
|-------------|------|-------------|
| **Fil du Temps vivant** (*Temporal Empathy*) | *Où* respirer (ponts d’années) | Le Breath fixe *combien* de silence |
| **Chœur des Vivants** (*Living Chorus*) | *Qui* entre après la retenue | Voix **après** le hold, jamais pendant |
| **Souffle / leitmotiv** | *Quelle* matière remplit le vide | Ghost / breath motif dans le Negative Space |

```text
Temps     → où ça compte
Souffle   → ce qui habite le vide
Chœur     → qui répond après
Breath    → quand on retient / quand on relâche
```

---

### 1. Le « Ghost Track » Audio — *La Tapisserie des Souvenirs*

| | |
|---|---|
| **Essence** | Une nappe sonore discrète, tissée à partir de la vie réelle capturée dans les vidéos. |
| **Ambition** | Écho nostalgique **découplé de l’image** — comme au cinéma indépendant. |

#### Concept

Le backend (pipeline **FastAPI** / worker média) **extrait l’audio** des vidéos uploadées : rires, fragments de discours, bruits d’ambiance, souffles de salle.

Ces extraits ne restent plus prisonniers de leur clip d’origine. Le moteur compose une **tapisserie** — couche `ghost` du Stem Graph — jouée surtout **sous les photos silencieuses** et dans les **Negative Spaces** du Breath Engine, en parallèle du bed (One Bed Law + ducking hiérarchique).

#### Implications techniques (cible)

| Couche | Intention |
|--------|-----------|
| Extraction | Job asynchrone post-upload ; stems normalisés |
| Stem Graph | Layer `ghost` (déjà typé, dormant au P0) |
| Mix | Volume très bas ; mute / −∞ sous `sync` ; présence sous photos + holds |
| Consentement | Droits / contributions — pas d’exfiltration hors projet |

---

### 2. Le Moteur Narratif — *Arc émotionnel par Vision IA*

| | |
|---|---|
| **Essence** | L’ordre du film suit un **arc émotionnel**, pas seulement la chronologie. |
| **Ambition** | Setup → Climax → Résolution — digne d’une salle obscure. |

#### Concept

**Avant** Creatomate, les médias passent par une Vision IA qui **n’écrit pas de légendes** : elle tague l’**humeur** (vocabulaire fermé) :

| Tag | Intention |
|-----|-----------|
| **Intime** | Proximité, regard, douceur |
| **Solennel** | Gravité, rituel — candidat Breath hold |
| **Chaotique** | Mouvement, intensité — candidat release |
| **Festif** | Joie collective — candidat release |

L’arc propose ; le **Breath Engine** rythme les bascules (hold solennel → release festif).  
La famille peut conserver l’ordre **Livre Ouvert**.

---

### 3. Cinematic Relighting & Intelligence Spatiale — *Smart Ken Burns*

| | |
|---|---|
| **Essence** | Une seule « pellicule Odyssey » pour des sources disparates. |
| **Ambition** | Cadrage intelligent + lumière unifiée — texture haut de gamme. |

**A. Cadrage IA** — visages / POI → `transform_origin` / focal ; Ken Burns qui **ne coupe jamais un regard**.  
**B. Relighting** — luma mattes, light leaks subtils (accents DA), LUT Odyssey.

Pendant un Breath hold : micro-mouvement + grain + éventuellement soft light — le portrait **respire** sans bouger comme un slide figé.

---

### Annexes émotionnelles (sous le Breath)

#### Fil du Temps vivant (*Temporal Empathy*)

Mesurer les **écarts** entre souvenirs (années, saisons). Insérer des ponts : typo discrète (*« Douze hivers »*), silence, ghost.  
Le Breath décide la durée du pont.

#### Chœur des Vivants (*Living Chorus*)

Dépôts Sanctuaire (mots / voix, dose rare) en **Résolution** seulement — après un hold, avant l’outro Odyssey.  
Jamais un mur de commentaires sociaux.

#### Souffle / leitmotiv humain

Un court enregistrement famille (respiration, murmure) comme **épine dorsale** sonore des Negative Spaces — plus intime qu’une piste catalogue.

---

## Positionnement par rapport au P0

| Livré (P0) | Phase 2 (vision) |
|------------|------------------|
| `cinematicTheme` + `vmin` / `%` | Tokens `breath.*`, ghost volumes, leaks |
| Intro Signature (embryon de respiration) | Breath Engine sur toute la timeline |
| Stem Graph · One Bed Law · sync → duck bed | Ghost · foreground · Chœur |
| Ordre Livre Ouvert | Arc Vision + holds motivés |
| Focal manuel Étape 5 | Smart Ken Burns |
| 1080p / 4K par forfait | Inchangé — le moteur avancé **sert** Éternité / Légendaire |

---

## Principes non négociables

1. **Quiet Luxury** — pas de motion template criarde ; le silence est digne, jamais gimmick.  
2. **Famille souveraine** — Rythme Odyssey vs Livre Ouvert ; jamais confiscation du récit.  
3. **Server-side only** — Vision, extraction audio, entitlements : jamais confiance client pour le master.  
4. **Theme-driven** — DA dans `cinematicTheme` ; le builder compile.  
5. **Breath motivé** — pas de `+2s` aléatoire ; hold = signal (Solennel, Temps, fin d’acte).  
6. **Dose** — 1–3 breathes majeurs / film.  
7. **P0 intact** jusqu’à GO d’implémentation explicite sur un chantier.

---

## Ordre d’exécution recommandé

1. Stabiliser **master Stingray** (`STINGRAY_MASTER_URL_TEMPLATE` / provider réel).  
2. **Pellicule / Smart Ken Burns** (wow immédiat).  
3. **Ghost Track** (oreille Phase 2).  
4. **Breath Engine** + tags Vision (poumons + œil narratif) — dès que bed + ghost sont stables.  
5. Fil du Temps · Chœur · leitmotiv Souffle (enrichissements sous le Breath).  
6. Écosystème (Sanctuaire / NFC / extrait salon) autour du même master.

---

*Document de vision — Odyssey Frontend · Phase 2 Cinematic Engine · Breath Engine formalisé · juil. 2026*
