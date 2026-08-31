# Parcours UX — Audit des trous (Chemin 1)

**Type :** living · **Vérité pour :** inventaire exhaustif des écarts avant implémentation Traversée — pédagogie · code · craft · copy · DA · décisions.  
**Dernière MAJ :** 31 août 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 31 août 2026 — Audit initial Chemin 1 · chaînons P0–P3 · matrice 6 catégories · gate avant T1.

**Liens :**
- Spec Traversée : [`PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](PARCOURS_UX_CHEMIN_1_TRAVERSEE.md)
- Registre beats : [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md)
- Vision Sanctuaire : [`SANCTUARY_USER_JOURNEY.md`](SANCTUARY_USER_JOURNEY.md) §11b
- Wizard métier : [`WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md)

**Usage :** cocher / mettre à jour **ici** avant chaque tranche code (T1+). Un trou **P0** non tranché = **stop** implémentation concernée.

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
| `parcours.heroPrompt` | P0 | Une présence. Pose son nom. | Hub idle · clic Hero | ✅ | ⏳ |
| `parcours.constellationBorn` | P1 | Sa constellation prend forme. | Post-reveal | ✅ | ⏳ |
| **`hub.skyVsVault`** | **P0** | Le Coffre rassemble tout. Le ciel montre l'hommage que la famille choisit d'illuminer. | Hub post-reveal (J3) | ✅ | ⏳ |
| **`hub.noRush`** | **P1** | Prenez votre temps. Le ciel attend. | Hub post-reveal · footer panneau | ✅ | ⏳ |
| `parcours.circleShare` | P1 | Plus le cercle partage, plus le ciel s'allume. | Étape 2 / overlay invite | ✅ | ⏳ |
| **`circle.guestJourney`** | **P0** | Ils reçoivent un lien. Leurs souvenirs entrent dans le Coffre — vous composez le film et le ciel ensemble. | Après 1ère invite ou skip step 2 | ✅ | ⏳ |
| **`vault.filmBridge`** | **P0** | Ici se rangent les souvenirs. Plus tard, vous en ferez un film. | Avant étape 3 · drawer | ✅ | ⏳ |
| **`studio.filmBridge`** | **P1** | Maintenant, vous donnez une forme au film — à partir de ce que le Coffre contient. | Entrée étape 4 (chapitres) | ✅ | ⏳ |
| `media.firstDeposit` | P1 | (Rituel visuel — pas de ligne longue) | Étape 3 si dépôt · slot s'allume | ✅ vision D3 | 🟡 code partiel |
| `parcours.filmLeavesSkyStays` | P1 | Le film part, le ciel reste. | Checkout étape 7 | ✅ | ⏳ |
| **`panel.closeHint`** | **P2** | Fermer · le ciel vous attend | Chrome panneau (tooltip / aria) | ✅ | ⏳ |
| `channel.souvenirGift` | P2 | C'est un cadeau du salon. Le film peut grandir si la famille le souhaite. | Canal B2B2C · avant Dossier / checkout | ✅ | ⏳ |

**Trous narratifs résolus par ce tableau :** Coffre→film (P0) · Ciel≠Coffre (P0) · parcours invité (P0) · permission tempo (P1) · Studio←Coffre (P1).

**Encore implicite (ne pas sur-expliquer Chemin 1) :** Lueurs grille B · co-organisateurs · Soft Cap détail · Scanner — voir §6.

---

## 3. Surfaces & infra (architecture Traversée)

| Trou | Priorité | Cible spec | Code aujourd'hui | Tranche |
|------|----------|------------|------------------|---------|
| Backdrop 2D (image ciel) | P0 | `SkyBackdrop` | ⏳ WebGL derrière formulaire | T1 |
| Machine états `parcours` | P0 | `useParcoursUx` | ⏳ wizard step seul | T1 |
| Panneau verre open/close fluide | P0 | `transition.panelOpen/Close` | 🟡 panneau wizard fixe | T1 |
| Skip prologue → hub | P1 | flag `hasSeenPrologue` | ⏳ | T1 |
| Transition image 2D → WebGL | P0 | `transition.backdropToWebGL` | ⏳ | T2 |
| Hub post-reveal J3 | P0 | carte Inviter / Continuer + dwell | ⏳ `goNext` → step 2 | T2 |
| Overlay invite sur ciel | P1 | `panel.invite` | 🟡 page step 2 classique | T3 |
| Beat drawer Coffre→film | P0 | `VaultFilmBridgeBeat` | ⏳ | T4 |
| Studio sans ciel WebGL | P1 | fond éditorial steps 4–6 | 🟡 ciel peut encore monter | T5 |
| Tiroir Coffre global (J5) | P2 | icône depuis hub + studio | ⏳ step 3 seulement | post-T4 |
| Nav permanente Ciel↔Wizard (J6) | P2 | 1 clic partout | ⏳ | post-T4 |
| Frame PNG ciel exportée | P0 | asset `sky-backdrop-chemin1.png` | ⏳ | T1 (stub : noir + grain OK) |
| Alignement caméra 2D↔3D | P1 | même idle Z reveal | ⏳ à valider visuellement | T2 |

---

## 4. Code vs spec (vérité repo · août 2026)

| Écart | Priorité | Spec Chemin 1 | Code actuel | Action |
|-------|----------|---------------|-------------|--------|
| Saisie étape 1 | P0 | Image 2D · zéro WebGL | `SanctuaryUniverse` background | Remplacer T2 |
| Après reveal | P0 | Hub J3 dwell | Direct étape 2 | Brancher J3 T2 |
| Nom de famille requis | 🔴 P0 | D1 CEO : prénom + 2 dates | `canProceedEssential` exige nom | **Décision CEO** |
| Co-org étape 2 | P1 | Invite seul (D2) | Co-org encore possible | Retirer J4 |
| Invité → tiroir d'abord | P1 | D4 · pas auto-star | Partiel Sanctuaire | J7 · pas bloquant T1 |
| Zodiac 12 signes | P2 | Balance + fallback Leo | Libra + Leo | Craft backlog |
| `wizardBirthReveal` path doc | P2 | `lib/contribute/wizardBirthReveal.ts` | doc cite `lib/wizard/` | Fix doc WIZARD_ARCHITECTURE |
| Perf WebGL + formulaire | P0 | Résolu par Traversée | Lag constaté | **Ne pas patcher** — exécuter T1 |

---

## 5. Craft & animation

| Asset / beat | Priorité | État craft | Stub Chemin 1 | Bloque T1–T2 ? |
|--------------|----------|------------|---------------|----------------|
| Prologue éclipse | P2 | ⏳ labs | Skip → hub | **Non** |
| Wormhole | P2 | ⏳ labs | Skip | **Non** |
| Hero pulse 2D | P1 | ⏳ | CSS pulse | **Non** |
| Reveal constellation A→F | P0 | ✅ lab | — | **Non** |
| Filaments invités animés | P2 | ⏳ | Copy + ghosts | **Non** |
| Tiroir 3D précieux | P2 | ⏳ | Drawer CSS | **Non** |
| Premier dépôt → slot | P1 | ⏳ rituel | Optionnel step 3 | **Non** |
| 11 silhouettes zodiac | P3 | ⏳ | Leo fallback | **Non** |

---

## 6. Copy & i18n

| Trou | Priorité | Action |
|------|----------|--------|
| Clés `parcours.*` absentes | P0 | Ajouter FR+EN avant beats UI — voir TRAVERSEE §6 |
| Voix « film » vs « montage » vs « chapitre » | P1 | Aligner COPY.md · famille pas jargon studio |
| Messages hub J3 (3 chaînons + CTAs) | P0 | 5–7 clés max · pas de paragraphe |
| `node scripts/export-copy-catalog.mjs` | P1 | Même commit que clés |

---

## 7. DA & frames Figma

| Frame manquante | Priorité | Réf |
|-----------------|----------|-----|
| Hub Hero idle + message | P0 | À ajouter `DA_SCREENS.md` |
| Panneau verre open/close | P0 | idem |
| Hub post-reveal J3 | P0 | idem |
| Beat Coffre→film drawer | P1 | idem |
| Transition 2D→3D (spec visuelle) | P1 | moodboard ou note craft |
| Checkout farewell | P2 | idem |

**Trou :** pas de doc `PARCOURS_UX_FRAMES.md` — optionnel ; peut vivre dans `DA_SCREENS.md` § Sanctuaire.

---

## 8. Décisions produit ouvertes

| # | Sujet | Options | Recommandation | Gate |
|---|--------|---------|----------------|------|
| **G1** | Nom famille étape 1 | A) Garder requis B) D1 CEO seul | Trancher CEO | 🔴 avant Continuer UX final |
| **G2** | Hub J3 : Inviter vs Continuer défaut | A) Inviter mis en avant B) neutre | Inviter first (cercle) | P1 |
| **G3** | `vault.filmBridge` timing | A) après step 2 B) au clic médias | A) systématique Chemin 1 | P0 spec ✅ |
| **G4** | Retour hub après step 3+ | Toujours accessible ? | Oui J6 — stub nav P2 | P2 |
| **G5** | Prologue obligatoire 1× | Skip dev / replay ? | Skip dev · 1× prod | P2 |
| **G6** | Durée reveal prod | 14 s lab vs 8–10 s prod | Ajuster post-T2 perf | P2 |
| **G7** | État parcours dans DB | `wizard_state.parcours` vs flags projet | `wizard_state` extension | P1 avant T1 |

---

## 9. Canal & persona (Chemin 1 vs variantes)

| Trou | Chemin 1 (B2C incognito) | Variante Salon (Chemin 1b · plus tard) |
|------|--------------------------|--------------------------------------|
| Souvenir 0 $ expliqué | P2 — moins urgent | P0 `channel.souvenirGift` |
| Branding tenant | N/A | Logo salon connexion |
| RevShare / Fonds | Checkout step 7 | Flag tenant · runbook séparé |
| Parcours invité contribute | Hors Chemin 1 orga | [`SANCTUARY_USER_JOURNEY.md`](SANCTUARY_USER_JOURNEY.md) J7 |

**Ne pas mélanger** Chemin 1 orga et parcours invité dans la même spec sans fork explicite.

---

## 10. Démo & ops (Patrice · sept 2026)

| Trou | Mitigation |
|------|------------|
| Prologue pas prêt | Skip · oral + vidéo craft |
| J3 absent | Oral « ici la famille respire » · montrer Figma |
| Coffre→film absent | **Bloquant pitch film** — T4 avant démo si vente montage |
| Perf live | Traversée T1–T2 obligatoire · pas WebGL sous form |
| Tenant QA / comptes | [`TEMP/PLAN_DEMO_PATRICE.md`](../TEMP/PLAN_DEMO_PATRICE.md) |

---

## 11. Gate « prêt à coder T1 »

Cocher **tous** les P0 spec avant `SkyBackdrop` :

- [x] Spec Traversée canon
- [x] Registre beats
- [x] Audit trous (ce doc)
- [x] Chaînons P0 spec (`hub.skyVsVault`, `circle.guestJourney`, `vault.filmBridge`)
- [ ] **G1** nom famille — décision CEO ou acceptation temporaire doc
- [ ] Asset backdrop (PNG ou stub noir acceptable T1)
- [ ] Clés copy P0 listées (implémentation peut suivre T1 en parallèle)

**Gate « Chemin 1 démo-ready » (Patrice) :** T1 + T2 + T4 + chaînons P0 en copy à l'écran.

---

## 12. Synthèse — les vrais trous avant de continuer

| Catégorie | Combien P0 | Lesquels |
|-----------|------------|----------|
| **Pédagogie** | 3 | Ciel≠Coffre · invité→Coffre · Coffre→film |
| **Infra** | 4 | Backdrop 2D · états parcours · J3 · transition 2D→3D |
| **Code** | 2 | WebGL sous form · pas de J3 |
| **Décision** | 1 | G1 nom famille |
| **Craft** | 0 bloquant | Prologue skip OK |

**Conclusion :** on peut **démarrer T1** dès que **G1** est tranché (ou explicitement reporté avec nom encore requis). Les chaînons P0 sont **spec** — pas besoin d'animation craft. Le plus gros risque restant n'est pas un oubli narratif : c'est **d'implémenter sans backdrop 2D** (reproduire le lag).

---

## 13. Prochaines mises à jour doc

| Quand | Mettre à jour |
|-------|---------------|
| Décision G1 | Ce doc §8 · TRAVERSEE §9 · SANCTUARY §11b |
| Fin T1 | §3 surfaces · §4 code · PROJECT_STATUS |
| Clés copy | TRAVERSEE §6 · COPY_CATALOG |
| Frames DA | DA_SCREENS.md |
