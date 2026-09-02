# Parcours UX — Audit des trous (Chemin 1)

**Type :** living · **Vérité pour :** inventaire exhaustif des écarts avant implémentation Traversée — pédagogie · code · craft · copy · DA · décisions.  
**Dernière MAJ :** 2 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 2 sept 2026 — **T2-copy** : clés J3 A+B+C + born + CTAs (FR/EN · catalogue).
- 2 sept 2026 — **T2-lang** : LocaleSwitcher fixed studio — toujours visible (hub + rite), hors chrome masqué.
- 2 sept 2026 — **T2-0** : audit Continuer / J3 / copy · T1b traité comme livré · prochaine = T2 · G2 Inviter first.
- 31 août 2026 — **Figé** : Chemins A/B · contrat hub WebGL ↔ gel 2D · tranche T1b.
- 31 août 2026 — G1 tranché · T1 code partiel · gate T1 partiellement passé.

**Liens :**
- Spec Traversée : [`PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](PARCOURS_UX_CHEMIN_1_TRAVERSEE.md)
- Registre beats : [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md)
- Vision Sanctuaire : [`SANCTUARY_USER_JOURNEY.md`](SANCTUARY_USER_JOURNEY.md) §11b
- Wizard métier : [`WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md)

**Usage :** cocher / mettre à jour **ici** avant chaque tranche code (T1+). Un trou **P0** non tranché = **stop** implémentation concernée.

---

## 0. T2-0 — État réel repo (2 sept 2026)

Audit **lecture seule** avant code T2. Ne pas confondre « phase parcours nommée » et « UX livrée ».

### Ce qui est livré (T1b + invite)

| Surface | État |
|---------|------|
| Hub WebGL lite · dolly · breath invite · Html | ✅ |
| `hubFreezeTo2D` · Plan B capture · monolithe open (T-open) | ✅ |
| `panelCloseToHub` · T-close-7 | ✅ |
| Cold start void→WebGL (plus JPEG gate reload) | ✅ |
| Autosave hors ciel · dans monolithe | ✅ |
| Copy hub idle | ✅ `parcoursHeroPrompt` / `TapHint` / open / close / monolith Continue |

### Continuer aujourd’hui (écart P0)

| Étape | Code | Écart vs canon |
|-------|------|----------------|
| Clic Continuer monolithe | `goNext` → `flush` → `playReward()` | OK départ |
| Play A→F | `useWizardStep1Reveal.playReward` · `revealT` 0→1 · durée = craft lab · dwell **3,5 s** | OK craft |
| Phases parcours | `reward` → `ritual.reveal` · `done` → `hub.postReveal` | Phases **set** |
| UI J3 | **Absente** | Canon : dwell + carte · code : **rien** |
| Après dwell | `goNext` **return** après `playReward` (T2-1 ✅) | Plus de tunnel step 2 · UI J3 = T2-5 |
| `transition.backdropToWebGL` | **Pas de chorégraphie nommée** | Switch `showRitualWebGL` + `skyActive` via phase reward — pas de crossfade gel→ritual documenté |
| Caméra | Hub = `hubSkyCamera` (dolly) · Ritual = RevealCamera / défaut constellation | **Deux modes** — alignement 2D↔3D à valider visuellement (P1) |
| Zodiac ritual | `birthDateToZodiacSign` → template | ✅ branché sur variant ritual |
| Identité reveal | Prénom seul sur Hero ritual | ✅ approx · settle nom/dates = T2-6 |

### Copy J3 — dictionnaire (T2-copy ✅)

| Clé | FR |
|-----|-----|
| `parcoursConstellationBorn` | Sa constellation prend forme. |
| `parcoursCircleShare` (titre A) | Plus le cercle partage, plus le ciel s’allume. |
| `parcoursSkyVsVault` (sous-ligne B) | Ils déposent des souvenirs. Vous composez le ciel et le film. |
| `parcoursNoRush` (footer C) | Prenez votre temps. Le ciel attend. |
| `parcoursInviteCta` | Inviter |
| `parcoursContinueCta` | Continuer |

UI J3 = **T2-5** (brancher ces clés).

### Décisions T2 figées (T2-0)

| # | Décision |
|---|----------|
| **G2** | **Inviter first** — CTA Inviter dominant · Continuer soft · skip toujours possible |
| **Carte J3** | **A** titre + **B** sous-ligne · **C** = `noRush` footer |
| **Business** | Volume d’invites via promesse ciel/cercle — **jamais** argent / RevShare à l’écran famille |

### Tranches T2 (1 commit chacune) — ordre

**Fait :** `T2-0` · `T2-lang` · `T2-copy` · `T2-1` · `T2-freeze` · **`T2-name`** ✅  

**Suite :** `T2-2` backdrop polish → `T2-3`… → `T2-5` J3.

**Ordre perf figé :** freeze ciel pendant reveal → nom lisible → choré transition.

Hors T2 : T3 cercle outils · T4 `vault.filmBridge` · G6 durée reveal · prologue.

---

## 1. Légende priorités

| Priorité | Signification | Gate code |
|----------|---------------|-----------|
| **P0** | Trou bloquant sens ou perf — Traversée incompréhensible ou invivable | Spec + stub copy **minimum** avant tranche |
| **P1** | Trou important — confusion probable ou promesse produit faible | Avant fin Chemin 1 « démo-ready » |
| **P2** | Polish / canal / retour — peut attendre fin T2–T4 | Backlog |
| **P3** | Hors Chemin 1 (Lueurs, co-org, chemins 2+) | Ne pas bloquer T1 |

| Statut | Signification |
|--------|---------------|
| ⏳ | Non spec / non impl |
| 🟡 | Partiel |
| ✅ | Spec figée |
| 🔴 | Décision CEO requise |

---

## 2. Chaînons pédagogiques (narratif → film)

Beats **copy + UI court** — pas de WebGL obligatoire sauf rituel noté.

| ID | Priorité | Message FR (canon) | Où | Statut spec | Statut code |
|----|----------|-------------------|-----|-------------|-------------|
| `parcours.heroPrompt` | P0 | Une Présence · Toucher l’étoile | Hub idle · clic Hero | ✅ | ✅ |
| `parcours.constellationBorn` | P1 | Sa constellation prend forme. | Post-reveal | ✅ | ⏳ T2-4 |
| **`hub.skyVsVault`** | **P0** | Sous-ligne B (raccourci dépôt→ciel/film) | Hub post-reveal (J3) | ✅ | ⏳ T2-copy+5 |
| **Cercle A** | **P0** | Plus le cercle partage, plus le ciel s’allume. | Titre carte J3 | ✅ | ⏳ T2-copy+5 |
| **`hub.noRush`** | **P1** | Prenez votre temps. Le ciel attend. | Footer J3 | ✅ | ⏳ T2-copy+5 |
| `parcours.circleShare` | P1 | (= titre A — réutiliser clé) | Étape 2 / overlay invite | ✅ | ⏳ T3 |
| **`circle.guestJourney`** | **P0** | Ils reçoivent un lien… | Après 1ère invite ou skip step 2 | ✅ | ⏳ T3 |
| **`vault.filmBridge`** | **P0** | Ici se rangent les souvenirs… | Avant étape 3 · drawer | ✅ | ⏳ T4 |
| **`studio.filmBridge`** | **P1** | Maintenant, vous donnez une forme au film… | Entrée étape 4 | ✅ | ⏳ T5 |
| `media.firstDeposit` | P1 | (Rituel visuel — pas de ligne longue) | Étape 3 si dépôt | ✅ vision D3 | 🟡 |
| `parcours.filmLeavesSkyStays` | P1 | Le film part, le ciel reste. | Checkout étape 7 | ✅ | ⏳ |
| **`panel.closeHint`** | **P2** | Fermer · le ciel vous attend | Chrome panneau | ✅ | ✅ aria |
| `channel.souvenirGift` | P2 | Cadeau du salon… | Canal B2B2C | ✅ | ⏳ |

**Trous narratifs :** Coffre→film (P0) · Ciel≠Coffre (P0) · parcours invité (P0) · permission tempo (P1) · Studio←Coffre (P1).

---

## 3. Surfaces & infra (architecture Traversée)

| Trou | Priorité | Cible spec | Code aujourd'hui | Tranche |
|------|----------|------------|------------------|---------|
| **Chemins A / B séparés** | P0 | §1b TRAVERSEE · `virginHub` | 🟡 flags | T1 |
| **Hub WebGL lite animé** | P0 | `hub.idle` | ✅ | **T1b ✅** |
| **`transition.hubFreezeTo2D`** | P0 | Clic Hero | ✅ | **T1b ✅** |
| **`transition.panelCloseToHub`** | P0 | Fermer panneau | ✅ T-close-7 | **T1b ✅** |
| Backdrop 2D | P0 | `SkyBackdrop` · Plan B | ✅ | T1b ✅ |
| Machine états `parcours` | P0 | `useParcoursUx` | ✅ | — |
| Panneau verre open/close | P0 | monolithe | ✅ T-open / T-close | T1b ✅ |
| Skip prologue → hub | P1 | `hasSeenPrologue` | ⏳ | T6 |
| Transition image 2D → WebGL | P0 | `backdropToWebGL` | 🟡 switch phase · **pas** choré | **T2-2** |
| Hub post-reveal J3 | P0 | carte Inviter / Continuer + dwell | ⏳ tunnel step 2 | **T2-1 + T2-5** |
| Overlay invite sur ciel | P1 | `panel.invite` | 🟡 step 2 classique | T3 |
| Beat drawer Coffre→film | P0 | `VaultFilmBridgeBeat` | ⏳ | T4 |
| Studio sans ciel WebGL | P1 | steps 4–6 | 🟡 | T5 |
| Alignement caméra 2D↔3D | P1 | même idle Z reveal | ⏳ valider | **T2-2/3** |
| Chrome wizard atténué au hub | P1 | `hubChromeHidden` · **langue hors chrome** | ✅ T2-lang | T1b ✅ · T2-lang ✅ |

---

## 4. Code vs spec (vérité repo · sept 2026)

| Écart | Priorité | Spec Chemin 1 | Code actuel | Action |
|-------|----------|---------------|-------------|--------|
| Saisie étape 1 | P0 | Gel 2D · zéro WebGL sous champs | ✅ capture + opacity 0 | — |
| Retour draft rempli | P0 | Chemin B → panneau direct | 🟡 `virginHub` | Polish T1 |
| Après reveal | P0 | Hub J3 dwell | **T2-1 ✅** reste step 1 · UI carte = T2-5 | **T2-5** |
| Nom de famille requis | ✅ | G1 | `canProceedEssential` | — |
| Zodiac ritual | P2 | date → silhouette | ✅ | — |
| Perf WebGL + formulaire | P0 | Traversée | ✅ gel saisie | — |

---

## 5. Craft & animation

| Asset / beat | Priorité | État craft | Stub Chemin 1 | Bloque T2 ? |
|--------------|----------|------------|---------------|-------------|
| Prologue éclipse | P2 | ⏳ labs | Skip → hub | **Non** |
| Reveal constellation A→F | P0 | ✅ lab + `playReward` | — | **Non** |
| Filaments invités | P2 | ⏳ | Copy + ghosts | **Non** |
| 11 silhouettes zodiac | P3 | ⏳ | Leo fallback | **Non** |

---

## 6. Copy & i18n

| Trou | Priorité | Action |
|------|----------|--------|
| Clés J3 absentes | P0 | **T2-copy ✅** — brancher UI en T2-4/5 |
| Voix « film » vs jargon | P1 | A+B+C figés · pas RevShare famille |
| `export-copy-catalog.mjs` | P1 | Même commit que clés |

---

## 7. DA & frames Figma

| Frame manquante | Priorité | Réf |
|-----------------|----------|-----|
| Hub Hero idle + message | P0 | Partiel live · `DA_SCREENS.md` |
| Panneau verre open/close | P0 | Live |
| Hub post-reveal J3 | P0 | **À faire** avec T2-5 |
| Transition 2D→3D | P1 | Stub crossfade T2-2 |

---

## 8. Décisions produit

| # | Sujet | État | Note |
|---|--------|------|------|
| **G1** | Nom famille | ✅ | Obligatoire |
| **G2** | Inviter vs Continuer | ✅ **2 sept 2026** | **Inviter first** · Continuer soft |
| **G3** | `vault.filmBridge` timing | ✅ spec | Après step 2 systématique |
| **G6** | Durée reveal prod | P2 ouvert | Ajuster **post-T2** |
| **G7** | État parcours en DB | P1 ouvert | Reload mid-J3 — noter · pas bloquant 1er play |
| **G8** | Hub ↔ gel 2D | ✅ | §2b |

---

## 9. Canal & persona (Chemin 1 vs variantes)

| Trou | Chemin 1 (B2C) | Variante Salon |
|------|----------------|----------------|
| Souvenir 0 $ | P2 | P0 `channel.souvenirGift` |
| RevShare | Checkout — **pas** hub J3 | Ops salon |

**Ne pas mélanger** orga Chemin 1 et parcours invité sans fork.

---

## 10. Démo & ops (Patrice)

| Trou | Mitigation |
|------|------------|
| J3 absent | **T2** — sinon oral + Figma |
| Coffre→film | T4 si vente montage |
| Perf | Pas WebGL sous form — déjà |

**Gate démo-ready vision ciel :** T1b ✅ + **T2**. Film pitch : + T4.

---

## 11. Gate T1 (historique)

- [x] Spec Traversée · Registry · Audit · G1 · G8
- [x] T1b hub + freeze + close (livré sept 2026)

**Gate T2 prêt à coder :** T2-0 ✅ (ce §0) · G2 ✅ · copy listée → enchaîner **T2-copy**.

---

## 12. Synthèse — vrais trous maintenant

| Catégorie | P0 restants T2 | Lesquels |
|-----------|----------------|----------|
| **Infra / flux** | 2 | `backdropToWebGL` choré · J3 (coupe tunnel + UI) |
| **Pédagogie J3** | 2 | Titre A + sous-ligne B (`skyVsVault`) |
| **Copy** | 1 | Clés J3 absentes |
| **Craft** | 0 | A→F déjà là |

**Conclusion :** T1b **livré**. Prochaine implémentation = **T2** (copy → tunnel → transition → reveal → J3). Hors scope T2 : T3 invite volume · T4 Coffre→film.

---

## 13. Prochaines mises à jour doc

| Quand | Mettre à jour |
|-------|---------------|
| Fin chaque tranche T2 | §0 · §3 · TRAVERSEE changelog |
| T2-copy | COPY_CATALOG · fr/en |
| T2-5 | DA_SCREENS J3 · Registry `hub.postReveal` |
| Décision G6/G7 | §8 |
