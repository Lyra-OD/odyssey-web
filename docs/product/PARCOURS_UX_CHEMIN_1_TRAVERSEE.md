# Parcours UX — Chemin 1 : La Traversée d'Odyssey

**Type :** canon · **Vérité pour :** premier chemin UX (organisateur · première visite) — beats, surfaces, transitions, placeholders craft.  
**Dernière MAJ :** 2 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 2 sept 2026 — **T2-gel-photo** : Continuer / postReveal = **même capture canvas** que le panneau Essentiels (plus de forcer `hub-freeze-v1.jpg`).
- 2 sept 2026 — **T2-sticky** : sticky **absent** sur tout le ciel step1 — seul P0 « Revenir à l’essentiel » en bas.
- 2 sept 2026 — **T2-reward-perf** : remount Canvas hub≠ritual · ForceRenderLoop 24 fps overlay · HeroStar lite · sync ~4 Hz.
- 2 sept 2026 — **T2-perf** : setState reveal throttlé · section sans `bg-black` en overlay.
- 2 sept 2026 — **P0** : retour Essentiels post-reveal · déconnexion sous langue.

**Statut :** **T2-gel-photo** ✅ · tester **uniquement** `http://localhost:3000` · suite nav P1/P2 · P0 ✅.

**Liens :**
- **Audit trous (gate avant code) :** [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md)
- Vision Sanctuaire (hub · tiroir · grilles) : [`SANCTUARY_USER_JOURNEY.md`](SANCTUARY_USER_JOURNEY.md)
- Registre beats nommés : [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md)
- Wizard 7 étapes (métier inchangé) : [`WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md)
- Craft constellation / reveal : [`ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md)
- Craft prologue / ciel : [`SANCTUARY_SKY_CRAFT.md`](../SANCTUARY_SKY_CRAFT.md) · [`ODYSSEY_ECLIPSE_CRAFT.md`](../ODYSSEY_ECLIPSE_CRAFT.md)
- Frames DA (à compléter) : [`../DA_SCREENS.md`](../DA_SCREENS.md)
- Playbook démo VP : [`../MEETING_PATRICE_VP.md`](../MEETING_PATRICE_VP.md)

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
| **Chemin 1** | Parcours linéaire première visite — **deux entrées** A / B (§1b) |
| **Hub ↔ panel** | Ciel **animé** au hub · **gel 2D** à la saisie · réversible (§2b) |

---

## 1b. Deux chemins d'entrée (figé — ne pas mélanger)

| | **Chemin A — Première traversée** | **Chemin B — Retour** |
|--|-----------------------------------|------------------------|
| **Qui** | Compte neuf · projet vierge · jamais vu le prologue | Compte + draft existant |
| **Prologue éclipse** | **Oui** (1×) | **Non** |
| **Arrivée ciel** | Après cinéma → **hub WebGL animé** + Hero | Pas de « Pose son nom » si déjà ancré |
| **Entrée étape 1** | Clic Hero → gel 2D + panneau verre | **Draft rempli** → panneau direct · **vierge** → hub Hero comme A |
| **Chorégraphie** | Film complet §0→1 | Reprend où le draft indique |

**Règle code :** flags séparés (`hasSeenPrologue`, `virginHub`, `draft essentials`) — **jamais** une seule UI pour les deux.

---

## 2. Trois surfaces (ne pas fusionner)

| Surface | Rôle | Relation film |
|---------|------|----------------|
| **Ciel / Hub** | Hommage collectif · Hero · silhouette · Lueurs | Symbole — le ciel **reste** après le film |
| **Wizard (contrôle)** | Panneau verre — identité, invite, médias… | Étapes métier |
| **Coffre (tiroir)** | Banque complète des souvenirs | Source du **montage** → le film |

**Règle copy :** on ne vend pas du « partage de lien technique » — on invite à **peupler le ciel**.

---

## 2b. Contrat rendu ciel — hub animé ↔ gel 2D (figé 31 août 2026)

> **Hub = lieu vivant (WebGL léger). Panneau = travail (2D gelée + verre). Même cadrage — le ciel se fige, il ne change pas de décor.**

### Matrice des modes

| Phase | Rendu ciel | GPU | Panneau |
|-------|------------|-----|---------|
| **Hub idle** (Hero attend) | **WebGL animé** — plan test-ciel · dolly · `hub.heroPulse` (breath) · invite Html | Actif (budget serré) | Fermé |
| **Étape 1 (hub + panneau)** | Chrome forfait / Cercle / shell **masqué** | — | Forfait = plus tard (étape 2+ / menu) |
| **Clic Hero** | `transition.hubFreezeTo2D` | Stop loop · capture ou frame alignée | Ouvre — **verre teinté** (distinct du hub) |
| **Saisie** (`panel.essentials`) | **Image 2D fixe** (même frame) | **Off** | Ouvert — zéro lag clavier |
| **Fermer panneau** (X / Esc) | `transition.panelCloseToHub` — fondu PNG → **reprise WebGL hub** | Reprise hub-lite | Ferme |
| **Continuer** | `transition.backdropToWebGL` — 2D → WebGL · play reveal A→F | Rituel full | Ferme ou fade |

### Transitions nommées

| ID | Déclencheur | Effet perceptif |
|----|-------------|-----------------|
| `transition.hubFreezeTo2D` | Clic Hero | **Souffle** (flash+hold 200 ms) → crossfade ciel 560 ms → panneau expand @ 760 ms (ciel figé) · total transition ~1200 ms |
| `transition.panelCloseToHub` | Fermer panneau | Inspire 220 ms → collapse 520 ms → hold 80 ms → thaw KEEP 880 ms (sérialisé T-close-7) |
| `transition.backdropToWebGL` | Continuer | Le ciel **s'allume** → constellation |

### Implémentation (cible)

1. Gel 2D : **Plan B** capture canvas @ clic (`hubFreezeCapture.ts`) · fallback `hub-freeze-v1.jpg` — voir [`../TEMP/PLAN_B_HUB_CAPTURE_CANVAS.md`](../TEMP/PLAN_B_HUB_CAPTURE_CANVAS.md).
2. Timeline : `hubFreezeTimeline.ts` (hold → fade → panel · miroir close).
3. `ForceRenderLoop` on pendant hold (flash) · **off** en saisie · **unmount** WebGL en `panel.essentials`.
4. Ancre étoile hub = **ref** · FX freeze = `hubFreezeFxRef` (flash / holdBreath / inviteMul).
5. Panneau monolithe : recette [`../design/PARCOURS_MONOLITH_RECIPE.md`](../design/PARCOURS_MONOLITH_RECIPE.md) · enter **`parcours-monolith-expand`** (T-open-1–3) · exit **collapse → étoile** (`parcours-monolith-collapse` + `hubStarAnchorRef`).

### Ce n'est PAS

- WebGL full + formulaire concurrent (lag) ❌  
- Hub = PNG statique en permanence (perd le « vrai ciel ») ❌  
- Deux décors différents au clic (saut visuel) ❌  

### Stub acceptable (T1 → T1b)

- T1 actuel : PNG + Hero CSS partout → **placeholder** jusqu'à hub WebGL lite branché.  
- Fermer panneau : fondu noir acceptable en dev · cible = reprise hub animée.

---

## 3. La Traversée — Chemin 1 (spec beat par beat)

### 0. Le Prologue & Le Seuil (L'Arrivée)

| | |
|--|--|
| **Beat ID** | `prologue.arrival` |
| **Fréquence** | Une fois par organisateur (flag `hasSeenPrologue` ou équivalent) |
| **Visuel** | Cinématique éclipse → transition → **hub WebGL animé** (ciel vivant · Hero pulse) |
| **Chemin** | **A** uniquement |
| **Interaction** | Écran calme. **Hero** teal animé — attend qu'on vienne la réveiller |
| **Message** (une ligne) | *« Une présence. Pose son nom. »* — le **prénom** réveille le Hero ; le formulaire demande aussi le **nom de famille** (hommage complet). |
| **Geste** | Clic Hero → **`transition.hubFreezeTo2D`** + panneau verre (**Chemin A vierge**). **Chemin B · draft rempli** → panneau direct (sans hub). |
| **Stub si craft absent** | Skip prologue → hub WebGL lite ou PNG + Hero CSS en dernier recours |
| **Craft cible** | [`ODYSSEY_ECLIPSE_CRAFT.md`](../ODYSSEY_ECLIPSE_CRAFT.md) · wormhole · hand-off ciel |

---

### 1. L'Ancrage (Étape 1 — Identité)

| | |
|--|--|
| **Beat ID** | `anchor.form` → `anchor.reveal` → `hub.postReveal` |
| **Wizard métier** | Étape 1 — L'essentiel (prénom, nom, dates, avatar) |
| **Visuel saisie** | **`transition.hubFreezeTo2D`** puis formulaire sur **image 2D fixe** — zéro WebGL sous les champs |
| **Panneau** | Verre **teinté** — visuellement distinct du hub (§2b) |
| **Fermer** | **`transition.panelCloseToHub`** — retour ciel animé (draft conservé) |
| **Déclencheur** | Clic **Continuer** (après validation + autosave flush) |
| **Transition magique** | Image 2D → **réveil WebGL** (même cadrage) → play constellation liée à la date (~8–14 s craft) |
| **Message post-draw** | *« Sa constellation prend forme. »* (une ligne max) |
| **Hub post-reveal (J3)** | Dwell court — constellation figée — **pas** de tunnel forcé vers l'étape 2 |
| **Stub transition** | Crossfade 400 ms si alignement caméra pas prêt ; reveal craft = déjà livré |
| **Craft cible** | [`ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md) — timeline A→F |

**Règle zodiac :** date de naissance valide → template silhouette (ex. Balance) au moment du **rituel** reveal — pas besoin de WebGL pendant la saisie.

#### Identité à l'écran (G1 + respect — tranché 31 août 2026)

| Moment | Prénom | Nom de famille | Dates (années) |
|--------|--------|----------------|----------------|
| **Reveal A→F (rituel)** | **Seul** — au Hero, beats craft | Non | Non |
| **Hub post-reveal / idle settle** | Visible (Hero) | **Discret** — sous ou près du prénom, typo plus petite / soft | **Ligne whisper** · ex. `1942 — 2024` |
| **Formulaire étape 1** | Champ requis | Champ requis | Champs requis |

**Beat ID :** `anchor.identityDisplay` · craft : [`ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md) (Html Hero) + hub chrome.

**Règle :** le **prénom** porte l'émotion · **dates + nom** portent le respect — jamais « PRÉNOM NOM » en gros titre concurrent avec l'étoile pendant le wow.

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
prologue          → cinéma éclipse (Chemin A · skippable)
hub.idle          → WebGL hub-lite animé + Hero pulse + message
panel.essentials  → hubFreezeTo2D + panneau verre (2D fixe)
ritual.reveal     → backdropToWebGL + play constellation + dwell
hub.postReveal    → admiration + chaînons + carte Inviter / Continuer
...
```

**Transitions fluides obligatoires (§2b) :**
- `hub.idle` → `panel.essentials` : **`transition.hubFreezeTo2D`** + slide panneau verre
- `panel.essentials` → `hub.idle` : **`transition.panelCloseToHub`** (fermer = retour ciel animé)
- `panel.essentials` → `ritual.reveal` : **`transition.backdropToWebGL`** (Continuer)
- `ritual.reveal` → `hub.postReveal` : pas de jump vers étape 2 sans dwell

---

## 5. Matrice animation — prête / stub

| Beat | Animation cible | État août 2026 | Stub acceptable |
|------|-----------------|----------------|-----------------|
| `prologue.arrival` | Éclipse → hub WebGL | ⏳ craft | Skip → hub |
| `hub.idle` | WebGL hub-lite + Hero animé | ⏳ T1b | PNG + CSS (T1 placeholder) |
| `transition.hubFreezeTo2D` | Clic Hero | ⏳ T1b | Cut → PNG existant |
| `transition.panelCloseToHub` | Fermer panneau | ⏳ T1b | Fade noir |
| `hub.heroPulse` | Hero attend clic | ✅ T1b | Breath KEEP (`hubIdle.hubHeroBreath`) |
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

## 6. Copy écran (clés — FR + EN)

| Moment | Clé `tributeWizard.*` | FR (canon écran) | Code |
|--------|----------------------|------------------|------|
| Hero hub | `parcoursHeroPrompt` / `TapHint` | Une Présence · Toucher l’étoile | ✅ |
| Post-reveal | `parcoursConstellationBorn` | Sa constellation prend forme. | ✅ T2-copy |
| **Cercle A (titre J3)** | `parcoursCircleShare` | Plus le cercle partage, plus le ciel s’allume. | ✅ T2-copy |
| **Sous-ligne B** | `parcoursSkyVsVault` | Ils déposent des souvenirs. Vous composez le ciel et le film. | ✅ T2-copy |
| **Permission C** | `parcoursNoRush` | Prenez votre temps. Le ciel attend. | ✅ T2-copy |
| Hub J3 CTA | `parcoursInviteCta` / `parcoursContinueCta` | Inviter · Continuer | ✅ T2-copy |
| Fermer panneau | `parcoursPanelCloseHint` | Fermer · le ciel vous attend | ✅ |
| Cercle étape 2 | (réutiliser `parcoursCircleShare`) | — | T3 |
| **Parcours invité** | `parcoursGuestJourney` (à créer T3) | Ils reçoivent un lien… | ⏳ T3 |
| Coffre → film | `parcoursVaultFilmBridge` (à créer T4) | Ici se rangent les souvenirs… | ⏳ T4 |

→ Catalogue : [`COPY_CATALOG.md`](../COPY_CATALOG.md). UI J3 = **T2-5**.

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

## 8. Suite navigation (P0 → P1 → P2)

**Détail vivant + tableau :** [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md) §0 « Suite navigation figée ».

| ID | Statut | En une phrase |
|----|--------|---------------|
| **P0** / **P0′** | ✅ | Retour Essentiels depuis le ciel · déconnexion sous la langue |
| **P1 — Atelier** | ⏳ spec | Mode **wizard sans rite** : formulaires, nav libre, ciel léger — pour typo / retour / perf |
| **P2 — Fil constellation** | ⏳ spec | Progress en haut (nœuds Essentiels · Cercle · Coffre · Film), cliquables une fois débloqués |

**Pourquoi P1 avant P2 :** le fil seul ne remplace pas un mode « je compose sans cinéma ». L’Atelier porte la navigation libre ; le fil porte la **marque** et le jump entre étapes.

**Ordre de build :** finir T2 (J3) → P1 → P2. Ne pas coder P2 pendant le 1er play cinéma sans règles « déjà visité ».

---

## 9. Plan d'exécution (tranches — ordre chirurgical)

Les tranches **ne dépendent pas** du prologue craft pour démarrer.

| Tranche | Contenu | Bloqué par craft ? |
|---------|---------|-------------------|
| **T0** | Ce canon + Registry + index docs | Non |
| **T1** | Infra placeholder : `SkyBackdrop` · `useParcoursUx` · hub Hero · panneau · Chemins A/B | Non · **placeholder 2D** |
| **T1b** | Hub **WebGL lite animé** · `hubFreezeTo2D` · `panelCloseToHub` · panneau verre teinté | Partiel |
| **T2** | `backdropToWebGL` · reveal · hub J3 (Inviter first · A+B+C) | Non (reveal OK) · **T2-0 ✅** |
| **T3** | Cercle : overlay invite + copy | Non |
| **T4** | Beat Coffre → film (drawer + porte double) | Non |
| **T5** | Studio sans ciel · ligne checkout | Non |
| **T6** | Prologue éclipse (brancher quand craft prêt) | Oui |
| **T7** | Polish shareables + filaments invités animés | Partiel |
| **Nav P1** | Mode Atelier | Après T2 J3 |
| **Nav P2** | Fil constellation | Après P1 |

**Démo VP (Patrice) :** T1 + T2 suffisent pour la vision ; T4 si on vend le film ; prologue = vidéo ou skip.

---

## 10. Écarts connus / décisions ouvertes

| Sujet | État | Note |
|-------|------|------|
| **Inventaire complet** | Living | [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md) — gate T1 §11 |
| **G1 nom de famille** | ✅ Tranché | **Obligatoire** pour l'hommage (prénom + nom + 2 dates). Hero / constellation = **prénom** live. |
| **Contrat hub ↔ 2D** | ✅ Figé | §2b · Registry transitions |
| **Caméra hub** | `HubSkyCamera` — plan test-ciel (z=7.5) → dolly Hero (~5.15) · prologue éclipse skip | T1b |
| **Chemins A / B** | ✅ Figé | §1b |
| **Frame ciel 2D** | Capture canvas @ clic (**Plan B livré**) · fallback JPEG | ✅ T1b+B |
| **Entrée panneau (magie)** | T-open-1–5 : expand depuis étoile · souffle · stagger | ✅ |
| **Peau wizard 2–7** | Monolithe généralisé (verre · halo · CTA) | ⏳ spec [`PARCOURS_MONOLITH_RECIPE.md`](../design/PARCOURS_MONOLITH_RECIPE.md) §6 |
| **Suite nav P1 / P2** | ✅ Spec · ⏳ code | §8 · GAPS §0 |
| **Chemins 2+** | Hors scope | Chemin 1b Salon · invité seul · retour hub |

---

## 11. Une phrase

**Prologue (A) → ciel animé → Hero invite → clic = ciel se fige + verre → Continuer = ciel s'allume → hub respire → cercle → Coffre → film → le ciel reste.**
