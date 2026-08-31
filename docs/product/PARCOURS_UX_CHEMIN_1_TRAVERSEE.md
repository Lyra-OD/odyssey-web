# Parcours UX — Chemin 1 : La Traversée d'Odyssey

**Type :** canon · **Vérité pour :** premier chemin UX (organisateur · première visite) — beats, surfaces, transitions, placeholders craft.  
**Dernière MAJ :** 31 août 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 31 août 2026 — Chaînons P0–P1 (Ciel≠Coffre · invité · Studio←Coffre) · §11 audit trous → [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md).
- 31 août 2026 — Canon Chemin 1 : Traversée §0–4 · matrice stub/ready · plan tranches · séparation 2D / rituel WebGL.

**Liens :**
- **Audit trous (gate avant code) :** [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md)
- Vision Sanctuaire (hub · tiroir · grilles) : [`SANCTUARY_USER_JOURNEY.md`](SANCTUARY_USER_JOURNEY.md)
- Registre beats nommés : [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md)
- Wizard 7 étapes (métier inchangé) : [`WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md)
- Craft constellation / reveal : [`ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md)
- Craft prologue / ciel : [`SANCTUARY_SKY_CRAFT.md`](../SANCTUARY_SKY_CRAFT.md) · [`ODYSSEY_ECLIPSE_CRAFT.md`](../ODYSSEY_ECLIPSE_CRAFT.md)
- Frames DA (à compléter) : [`../DA_SCREENS.md`](../DA_SCREENS.md)
- Playbook démo VP : [`../MEETING_PATRICE_VP.md`](../MEETING_PATRICE_VP.md)

**Statut :** spec produit **figée** (Chemin 1). **Implémentation** : à démarrer — voir §8 plan tranches.  
**Règle :** une animation craft non terminée **ne bloque pas** le chemin — stub documenté dans [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md).

---

## 1. Principe directeur

> **Le ciel est la maison. Le wizard est un contrôle qui entre et sort. Le film est la promesse qu'on révèle après avoir compris que le ciel se remplit.**

| Idée | Détail |
|------|--------|
| **Wow rare et court** | WebGL immersif aux **rites** (prologue, reveal, envoi) — pas en fond de formulaire |
| **Image 2D → moteur 3D** | Même cadrage, aucun saut visuel — la magie = le même univers qui s'allume |
| **Draft = vérité** | Prénom, dates, signe, étape parcours vivent dans le draft wizard — pas dans Three.js |
| **Wizard 7 étapes** | Rail métier conservé (autosave, forfait, checkout) — la Traversée est la **mise en scène** |
| **Chemin 1** | Parcours linéaire unique pour la première visite organisateur — pas de moteur de quêtes en V1 |

---

## 2. Trois surfaces (ne pas fusionner)

| Surface | Rôle | Relation film |
|---------|------|----------------|
| **Ciel / Hub** | Hommage collectif · Hero · silhouette · Lueurs | Symbole — le ciel **reste** après le film |
| **Wizard (contrôle)** | Panneau verre — identité, invite, médias… | Étapes métier |
| **Coffre (tiroir)** | Banque complète des souvenirs | Source du **montage** → le film |

**Règle copy :** on ne vend pas du « partage de lien technique » — on invite à **peupler le ciel**.

---

## 3. La Traversée — Chemin 1 (spec beat par beat)

### 0. Le Prologue & Le Seuil (L'Arrivée)

| | |
|--|--|
| **Beat ID** | `prologue.arrival` |
| **Fréquence** | Une fois par organisateur (flag `hasSeenPrologue` ou équivalent) |
| **Visuel** | Cinématique éclipse → transition → **image 2D fixe** d'un ciel étoilé profond |
| **Interaction** | Écran calme. **Hero** palpite doucement — attend qu'on vienne la réveiller |
| **Message** (une ligne) | *« Une présence. Pose son nom. »* |
| **Geste** | Clic Hero → le **panneau verre** wizard glisse par-dessus l'image (pas de page austère) |
| **Stub si craft absent** | Skip prologue → hub direct avec image ciel + Hero CSS pulse |
| **Craft cible** | [`ODYSSEY_ECLIPSE_CRAFT.md`](../ODYSSEY_ECLIPSE_CRAFT.md) · wormhole · hand-off ciel |

---

### 1. L'Ancrage (Étape 1 — Identité)

| | |
|--|--|
| **Beat ID** | `anchor.form` → `anchor.reveal` → `hub.postReveal` |
| **Wizard métier** | Étape 1 — L'essentiel (prénom, nom, dates, avatar) |
| **Visuel saisie** | Formulaire **ultra-fluide** sur **image fixe** du ciel — zéro WebGL, zéro lag |
| **Déclencheur** | Clic **Continuer** (après validation + autosave flush) |
| **Transition magique** | Image 2D → **réveil WebGL** (même cadrage) → play constellation liée à la date (~8–14 s craft) |
| **Message post-draw** | *« Sa constellation prend forme. »* (une ligne max) |
| **Hub post-reveal (J3)** | Dwell court — constellation figée — **pas** de tunnel forcé vers l'étape 2 |
| **Stub transition** | Crossfade 400 ms si alignement caméra pas prêt ; reveal craft = déjà livré |
| **Craft cible** | [`ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md) — timeline A→F |

**Règle zodiac :** date de naissance valide → template silhouette (ex. Balance) au moment du **rituel** reveal — pas besoin de WebGL pendant la saisie.

---

### 2. Le Cercle (Invitation & Remplissage)

| | |
|--|--|
| **Beat ID** | `circle.invite` |
| **Wizard métier** | Étape 2 — invite (canal-agnostique, skip immédiat OK) |
| **Règle produit** | Plus le cercle partage, plus le ciel s'allume |
| **Visuel** | Interface légère **sur** le ciel (overlay / panneau) |
| **Message** | *« Plus le cercle partage, plus le ciel s'allume. »* |
| **Feedback** | Chaque proche invité → filaments / micro-étoiles autour du Hero (preuve vivante) |
| **Stub V1** | Copy + slots fantômes existants + compteur invites — filaments animés = craft V2 |
| **Craft cible** | Filaments invités — backlog [`SANCTUARY_SKY.md`](../SANCTUARY_SKY.md) |

---

### 3. Le Chaînon : Du Coffre au Film

| | |
|--|--|
| **Beat ID** | `vault.filmBridge` |
| **Wizard métier** | Entrée étape 3 — médias / Coffre |
| **Timing** | Juste après invite **ou** au premier geste « médias » |
| **Visuel** | Le **Coffre** s'ouvre comme un tiroir précieux (pas une page admin) |
| **Message** | *« Ici se rangent les souvenirs. Plus tard, vous en ferez un film. »* |
| **Porte double** | **Inviter encore** (nourrir le ciel) **ou** **Déposer un souvenir** (Coffre — « Plus tard » toujours bienveillant) |
| **Stub V1** | Drawer CSS + copy — animation tiroir 3D = polish ultérieur |

**Pourquoi ce beat :** sans lui, la Traversée reste belle mais **incomplet** commercialement — la famille comprend l'hommage céleste, pas Odyssey = film.

---

### 3b. Chaînons pédagogiques (hub & transitions)

Ces beats **ne remplacent pas** les rituels WebGL — une ligne + carte UI suffit.

#### `hub.skyVsVault` — Ciel ≠ Coffre (P0)

| | |
|--|--|
| **Timing** | Hub post-reveal (J3), **avant** Inviter ou Continuer |
| **Message** | *« Le Coffre rassemble tout. Le ciel montre l'hommage que la famille choisit d'illuminer. »* |
| **Pourquoi** | Évite l'illusion *1 photo = 1 étoile* · prépare invite + dépôt invité (D4) |

#### `hub.noRush` — Permission (P1)

| | |
|--|--|
| **Timing** | Hub J3 · footer panneau wizard |
| **Message** | *« Prenez votre temps. Le ciel attend. »* |
| **Pourquoi** | Réduit pression deuil · légitime Inviter sans médias |

#### `circle.guestJourney` — Parcours invité (P0)

| | |
|--|--|
| **Timing** | Après première invite **ou** skip étape 2 |
| **Message** | *« Ils reçoivent un lien. Leurs souvenirs entrent dans le Coffre — vous composez le film et le ciel ensemble. »* |
| **Pourquoi** | Ferme la boucle « j'ai invité, le ciel n'a pas bougé » |

#### `studio.filmBridge` — Coffre → montage (P1)

| | |
|--|--|
| **Timing** | Entrée étape 4 (chapitres / musique) |
| **Message** | *« Maintenant, vous donnez une forme au film — à partir de ce que le Coffre contient. »* |
| **Pourquoi** | Chaînon manquant entre hommage céleste et studio |

#### `media.firstDeposit` — Premier dépôt (P1, rituel)

| | |
|--|--|
| **Timing** | Étape 3 **si** dépôt (pas si « Plus tard ») |
| **Visuel** | Slot constellation s'allume — wow court |
| **Règle** | D3 · skip → fantômes inchangés, zéro culpabilisation |

#### `panel.closeHint` — Retour hub (P2)

| | |
|--|--|
| **Timing** | Chrome panneau (fermer / Esc) |
| **Message** | *« Fermer · le ciel vous attend »* (tooltip ou aria) |

#### `channel.souvenirGift` — Cadeau salon (P2, Chemin 1b)

| | |
|--|--|
| **Canal** | B2B2C / tenant freemium — **pas** Chemin 1 B2C pur |
| **Message** | *« C'est un cadeau du salon. Le film peut grandir si la famille le souhaite. »* |

---

### 4. La Suite du Voyage (Chapitres ciblés)

| Chapitre | Beat ID | Ciel WebGL ? | Note |
|----------|---------|--------------|------|
| **Studio — montage** | `studio.montage` | **Non** | Livre Ouvert = héros · vignette constellation dans le chrome OK |
| **Studio — chapitres / musique** | `studio.storyboard` | **Non** | Focus récit |
| **Checkout / envoi** | `checkout.farewell` | **Clin d'œil** | *« Le film part, le ciel reste. »* — wow shareable #3 |
| **Retour hub** | `hub.return` | Oui (léger ou image) | Navigation libre Ciel ↔ Wizard ↔ Studio ↔ Coffre |

---

## 4. Machine d'états Parcours (Chemin 1)

États **UX** (couche au-dessus du wizard) — le wizard step 1–7 reste la source métier.

```
prologue          → cinéma éclipse (skippable)
hub.idle          → image ciel + Hero pulse + message
panel.essentials  → panneau verre étape 1 (backdrop 2D)
ritual.reveal     → WebGL mount + play constellation + dwell
hub.postReveal    → admiration + **hub.skyVsVault** + **hub.noRush** + carte Inviter / Continuer
panel.invite      → panneau étape 2 + **circle.guestJourney** après 1ère action
vault.filmBridge  → beat pédagogique Coffre → film
panel.media       → panneau étape 3 (Coffre) · **media.firstDeposit** si dépôt
studio.storyboard → entrée step 4 · **studio.filmBridge**
studio.*          → étapes 4–7 sans ciel WebGL
checkout.farewell → ligne poétique + commande
```

**Transitions fluides obligatoires :**
- `hub.idle` ↔ `panel.*` — entrée/sortie panneau (fermer = retour hub, draft conservé)
- `panel.essentials` → `ritual.reveal` — image 2D → WebGL (même cadrage)
- `ritual.reveal` → `hub.postReveal` — pas de jump vers étape 2 sans dwell

---

## 5. Matrice animation — prête / stub

| Beat | Animation cible | État août 2026 | Stub acceptable |
|------|-----------------|----------------|-----------------|
| `prologue.arrival` | Éclipse + wormhole → ciel | ⏳ craft | Skip ou fade → image ciel |
| `hub.heroPulse` | Hero attend clic | ⏳ | Pulse CSS sur sprite 2D |
| `anchor.form` | Aucune (confort) | ✅ spec | PNG / frame export lab |
| `anchor.reveal` | Play A→F constellation | ✅ craft lab | — |
| `hub.postReveal` | Carte + dwell | ⏳ | UI statique 2–4 s |
| `circle.invite` | Filaments invités | ⏳ | Copy + ghosts |
| `vault.filmBridge` | Tiroir précieux | ⏳ | Drawer CSS + copy |
| `hub.skyVsVault` | Carte pédagogique | ✅ spec | Texte hub J3 |
| `hub.noRush` | Ligne permission | ✅ spec | Footer hub / panneau |
| `circle.guestJourney` | Carte post-invite | ✅ spec | Après step 2 |
| `studio.filmBridge` | Bandeau step 4 | ✅ spec | Une ligne |
| `media.firstDeposit` | Slot s'allume | ⏳ rituel | Skip si Plus tard |
| `studio.montage` | Aucun ciel | ✅ | Fond éditorial |
| `checkout.farewell` | Clin d'œil poétique | ⏳ | Ligne copy checkout |

Détail IDs et durées : [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md).

---

## 6. Copy écran (clés à créer — FR + EN)

| Moment | Clé proposée | FR (canon) |
|--------|--------------|------------|
| Hero hub | `parcours.heroPrompt` | Une présence. Pose son nom. |
| Post-reveal | `parcours.constellationBorn` | Sa constellation prend forme. |
| **Ciel ≠ Coffre** | `parcours.skyVsVault` | Le Coffre rassemble tout. Le ciel montre l'hommage que la famille choisit d'illuminer. |
| **Permission** | `parcours.noRush` | Prenez votre temps. Le ciel attend. |
| Cercle | `parcours.circleShare` | Plus le cercle partage, plus le ciel s'allume. |
| **Parcours invité** | `parcours.guestJourney` | Ils reçoivent un lien. Leurs souvenirs entrent dans le Coffre — vous composez le film et le ciel ensemble. |
| Coffre → film | `parcours.vaultFilmBridge` | Ici se rangent les souvenirs. Plus tard, vous en ferez un film. |
| **Studio ← Coffre** | `parcours.studioFilmBridge` | Maintenant, vous donnez une forme au film — à partir de ce que le Coffre contient. |
| Checkout | `parcours.filmLeavesSkyStays` | Le film part, le ciel reste. |
| Fermer panneau | `parcours.panelCloseHint` | Fermer · le ciel vous attend |
| Cadeau salon (1b) | `parcours.souvenirGift` | C'est un cadeau du salon. Le film peut grandir si la famille le souhaite. |
| Hub post-reveal CTA | `parcours.inviteCta` / `parcours.continueCta` | Inviter · Continuer |

→ Implémentation : `dictionaries/fr.json` + `en.json` · régénérer [`COPY_CATALOG.md`](../COPY_CATALOG.md).

---

## 7. Relation wizard ↔ parcours

| Wizard step | Chapitre Traversée | Surface |
|-------------|-------------------|---------|
| 1 | Ancrage | `panel.essentials` → `ritual.reveal` → `hub.postReveal` + `hub.skyVsVault` + `hub.noRush` |
| 2 | Cercle | `panel.invite` → `circle.guestJourney` |
| 3 | Coffre | `vault.filmBridge` → `panel.media` (+ `media.firstDeposit` si dépôt) |
| 4 | Chapitres | `studio.filmBridge` puis `studio.storyboard` |
| 5–6 | Montage / preview | `studio.*` — ciel retiré |
| 7 | Envoi | `checkout.farewell` |

Le wizard **n'est pas refondu** — on change **quand** le Canvas existe et **comment** on entre/sort du panneau.

---

## 8. Plan d'exécution (tranches — ordre chirurgical)

Les tranches **ne dépendent pas** du prologue craft pour démarrer.

| Tranche | Contenu | Bloqué par craft ? |
|---------|---------|-------------------|
| **T0** | Ce canon + Registry + index docs | Non |
| **T1** | Infra : `SkyBackdrop` 2D · panneau verre · machine états · skip prologue | Non |
| **T2** | Ancrage : saisie image → reveal → hub J3 | Non (reveal OK) |
| **T3** | Cercle : overlay invite + copy | Non |
| **T4** | Beat Coffre → film (drawer + porte double) | Non |
| **T5** | Studio sans ciel · ligne checkout | Non |
| **T6** | Prologue éclipse (brancher quand craft prêt) | Oui |
| **T7** | Polish shareables + filaments invités animés | Partiel |

**Démo VP (Patrice) :** T1 + T2 suffisent pour la vision ; T4 si on vend le film ; prologue = vidéo ou skip.

---

## 9. Écarts connus / décisions ouvertes

| Sujet | État | Note |
|-------|------|------|
| **Inventaire complet** | Living | [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md) — gate T1 §11 |
| **D1 nom de famille** | 🔴 Écart | CEO = prénom + 2 dates · code exige encore nom — **G1** |
| **Frame ciel 2D** | À produire | Export PNG lab ou stub noir T1 |
| **Alignement caméra 2D→3D** | Craft | Même `revealCamera` idle Z |
| **Chemins 2+** | Hors scope | Chemin 1b Salon · invité seul · retour hub |

---

## 10. Une phrase

**Prologue (wow) → Hero qui invite → ancrage calme sur image ciel → le même ciel s'allume (constellation) → hub pour respirer → cercle qui remplit le ciel → Coffre qui explique le film → studio sans distraction → le film part, le ciel reste.**
