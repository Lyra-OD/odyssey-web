# Odyssey — Parcours Sanctuaire (User X · première visite)

**Type :** produit · **Vérité pour :** prologue cinéma · hub ciel · séparation wizard · tiroir média · navigation.  
**Dernière MAJ :** 25 août 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 25 août 2026 — Étape 2 invite : canal-agnostique · skip immédiat · layout Partager / Copier / QR (§5c).
- 25 août 2026 — Décisions CEO figées : étapes 1–3 (identité complète · invite seul · Plus tard Coffre).
- 25 août 2026 — Canon initial : prologue action→récompense, hub, tiroir global, plan d’implémentation.

**Liens :**
- Ciel / étoiles-mémoire : [`SANCTUARY_SKY.md`](../SANCTUARY_SKY.md)
- Ciel économique (Lueurs colorées) : [`SANCTUARY_SKY_LUEURS.md`](../SANCTUARY_SKY_LUEURS.md)
- Wizard 7 étapes (inchangé) : [`WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md)
- Stratégie Quiet Luxury : [`SANCTUARY_STRATEGY.md`](../SANCTUARY_STRATEGY.md)
- Craft prologue / ciel : [`SANCTUARY_SKY_CRAFT.md`](../SANCTUARY_SKY_CRAFT.md) · [`ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md)

**Statut :** vision produit **figée** (étapes 1–3 tranchées) — **pas encore** implémentée comme flow onboarding unique.

---

## 1. Principe

> **Penser comme un jeu (hub + feedback visuel), sans parler de quêtes.**  
> **Ne pas refondre le wizard — le séparer du Sanctuaire.**  
> **Ciel d’abord ; action → récompense → explication ; navigation libre ensuite.**

| Surface | Rôle |
|---------|------|
| **Prologue** (1×) | Éclipse → vortex → arrivée au ciel — wow |
| **Ciel / Hub** | Univers persistant ; constellation + Lueurs ; retour permanent |
| **Wizard** | Étapes 1–7 existantes — logique métier, autosave, forfait |
| **Studio** | Étapes 4–7 wizard (montage, chapitres, export) |
| **Tiroir média** | Banque complète — accessible **en tout temps**, alimente le studio |

Le wizard **n’est pas remplacé** par des overlays : le prologue **introduit** le même contrat (étape 1 = L’essentiel), puis on enchaîne sur le wizard réel.

---

## 2. Trois choses différentes (ne pas fusionner)

| Concept | Quoi | Où | Lien film |
|---------|------|-----|-----------|
| **Hero (teal)** | Présence du défunt — unique, non achetable | Centre constellation | Symbole — pas un média |
| **Souvenir / slot constellation** | Une **étoile-mémoire** dans la silhouette (ex. Leo, 8 slots) | Ciel — grille A | Peut entrer au montage si la famille le choisit |
| **Tiroir média (Coffre)** | **Toute** la banque : uploads, invités, scanner, doublons… | Panneau global | Source directe du studio |

**Règle :** un dépôt invité → **tiroir** d’abord. Allumer un **slot** constellation = acte familial (curation), pas 1 fichier = 1 étoile automatique.

**Règle :** le tiroir ≠ le ciel. Le studio **puise** dans le tiroir ; le ciel **montre** l’hommage collectif.

---

## 3. Deux grilles dans le ciel

Voir [`SANCTUARY_SKY_LUEURS.md`](../SANCTUARY_SKY_LUEURS.md).

| Grille | Contenu | Couleur |
|--------|---------|---------|
| **A — Silhouette** | Hero + slots souvenirs famille | Teal = défunt seul ; souvenirs = perle / soft |
| **B — Champ Lueurs** | SKU / offrandes invités | Palette curatée (même prix) |

Plus les gens participent (dépôts, Lueurs achetées), plus le ciel **se remplit** — preuve vivante du produit.

---

## 4. Parcours première visite (organisateur — User X)

Séquence **action → récompense → explication** — au moins une fois au début.

```
┌─────────────────────────────────────────────────────────────┐
│  ACTE 0 — PROLOGUE (cinéma, ~20–30 s, sans formulaire long) │
└─────────────────────────────────────────────────────────────┘
  1. Éclipse
  2. Voyage vortex / wormhole (depuis le loin)
  3. Arrivée : Sanctuaire immense, une Hero teal isolée au centre
  4. Phrase : « Chaque souvenir est une étoile. Construisons sa constellation. »
  5. Pause respiration (2–3 s)

┌─────────────────────────────────────────────────────────────┐
│  ACTE 1 — ANCRAGE (wizard étape 1, overlay sur le ciel)      │
└─────────────────────────────────────────────────────────────┘
  6. Panneau translucide « L’essentiel » — champs **obligatoires** :
     · Prénom
     · Date de naissance
     · Date de décès
     (indispensables pour figer la constellation / silhouette)
  7. Ciel visible derrière (flou léger, parallaxe) — jamais masqué
  8. Utilisateur valide → autosave même API que Step 1 wizard

┌─────────────────────────────────────────────────────────────┐
│  ACTE 2 — RÉCOMPENSE (ciel seul, 2–4 s)                     │
└─────────────────────────────────────────────────────────────┘
  9. Panneau descend / fade
 10. Animation constellation : Hero s’ancre + silhouette + slots fantômes + reveal traits
 11. Une ligne max : « Sa constellation prend forme. »

┌─────────────────────────────────────────────────────────────┐
│  ACTE 3 — HUB (carte verre, explication)                      │
└─────────────────────────────────────────────────────────────┘
 12. Hub réapparaît — 2 idées, 2 verbes :
     · **Inviter** — vos proches illuminent le ciel (souvenirs · Lueurs)
     · **Médias** — vous rassemblez le Coffre pour construire le film
 13. Boutons : Inviter · Continuer (wizard étapes 2–3)

┌─────────────────────────────────────────────────────────────┐
│  SUITE — WIZARD + HUB OUVERT                                  │
└─────────────────────────────────────────────────────────────┘
 14. **Étape 2 — Cercle :** générer le lien / Inviter **uniquement**
     · Zéro friction — pas de co-organisateurs ici
     · Gestion co-organisateurs → **Studio** (plus tard)
 15. **Étape 3 — Coffre :** bouton **« Plus tard »** toujours visible — **ne jamais bloquer**
     · S’il dépose une photo → **une étoile s’allume** (feedback ciel immédiat)
     · S’il passe → slots restent **fantômes** — studio accessible quand même
 16. Fin étape 3 (dépôt ou Plus tard) → hub ciel plein écran
 17. Navigation libre : Ciel ↔ Wizard ↔ Studio ↔ Tiroir
```

**Revisite :** pas de prologue complet — hub ciel direct (flag `hasSeenSanctuaryPrologue` ou équivalent).

---

## 5. Hub après récompense (copy direction)

Carte unique, pas un mur de texte :

> **Le ciel accueille votre famille.**  
> Invitez vos proches : chaque souvenir et chaque Lueur illuminent l’univers.  
> **Le film se construit dans le Coffre** — vos médias, leur hommage, un seul hommage.

CTA primaire : **Inviter**  
CTA secondaire : **Continuer**

---

## 5b. Règles étapes 1–3 (figées CEO · 25 août 2026)

| Étape | Intitulé wizard | Règle produit |
|-------|-----------------|---------------|
| **1** | L’essentiel | **Prénom + date de naissance + date de décès** — tous requis. Sans les trois, pas de constellation figée. |
| **2** | Cercle | **Lien / Inviter seulement.** Pas de co-organisateurs à cette étape. Co-org → Studio. **Skip immédiat** — aucun canal requis avant « Continuer ». |
| **3** | Coffre | **« Plus tard » obligatoire** (CTA secondaire permanent). Jamais de gate vers le studio. Photo déposée → étoile s’allume ; skip → fantômes. |

**Étape 3 ↔ ciel :** le premier dépôt organisateur au Coffre peut **allumer** un slot (réponse rituelle). Absence de média = silhouette + ghosts inchangés — pas d’erreur, pas de culpabilisation.

**Invités (hors wizard) :** dépôt → tiroir d’abord ; slots constellation supplémentaires = curation familiale (cf. §2) — pas 1 fichier = 1 étoile auto pour tout le ciel.

---

## 5c. Étape 2 — Inviter (canal-agnostique · 25 août 2026)

**Objectif :** encourager le partage **sans imposer de canal** et **sans bloquer** la suite.

### Règles

| Règle | Détail |
|-------|--------|
| **Skip immédiat** | « Continuer sans inviter » **toujours visible** — pas de partage requis pour passer à l’étape 3. |
| **Canal-agnostique** | Pas de WhatsApp / Messenger / iMessage en premier. L’utilisateur choisit **son** app via le sheet natif ou en collant le message. |
| **Lien prêt** | Auto-génération du lien Sanctuaire à l’arrivée (`autoGenerate` — déjà en code). |
| **Ciel visible** | Overlay sur constellation : ghosts pulsent ; copy = *chaque souvenir peut illuminer une étoile*. |
| **Pas de co-org** | Retirer `CollabInviteInlineCard` de l’étape 2 — co-organisateurs → Studio uniquement. |

### Layout (ordre visuel)

```
[Ciel constellation visible — slots fantômes]

« Invitez le cercle de {prénom} »
Une phrase : chaque souvenir peut illuminer une étoile.

┌─────────────────────────┐
│  QR (scan ou montrer)   │
└─────────────────────────┘

[ Partager ]              ← mobile : Web Share API (sheet natif)
[ Copier le message ]     ← desktop primary · texte humain + lien
[ Copier le lien ]        ← secondaire

[ Continuer sans inviter ]   ← jamais caché · jamais après un canal imposé
```

**Mobile :** CTA primaire = **Partager** (sheet → WhatsApp, Messages, Mail, etc. au choix de l’utilisateur).  
**Desktop :** CTA primaire = **Copier le message** (coller dans n’importe quel chat ou email).

### Copy direction (message de partage)

Ton **humain**, pas produit — pas de Lueur / prix / film dans le **premier** message :

> « Nous recueillons les souvenirs de {prénom}. Si vous avez une photo ou un mot doux, déposez-le ici — ça prend une minute : {url} »

**Open Graph** sur le lien contribute (`/contribute/[token]`) : vignette ciel + prénom — multiplie les clics quand le lien s’affiche dans un chat (P1 craft).

### Feedback ciel (optionnel · après action, pas après skip)

Si l’utilisateur **Partage** ou **Copie le message** (pas s’il skip) :
- filaments cercle s’allument (réponse rituelle §8) ;
- micro-copy : *« Dès qu’une personne ouvre le lien, une étoile peut naître. »*

Compteur doux en hub / chrome plus tard (P1) : *« 3 personnes ont rejoint le Sanctuaire »* — incite à relancer, sans gate.

### Anti-patterns étape 2

- ❌ Chip ou CTA « WhatsApp » en premier
- ❌ Bloquer « Continuer » tant qu’on n’a pas partagé
- ❌ Import carnet d’adresses / emails un par un
- ❌ Co-organisateurs sur cette étape
- ❌ Mention Lueurs / prix dans le message initial

**Code actuel :** `SanctuaryInviteStep` + `SanctuaryInviteContent` (`src/components/tribute/SanctuaryInvitePanel.tsx`) — retirer `CollabInviteInlineCard` du step 2 dans `TributeWizard.tsx` à l’implémentation J4/J6.

---

## 6. Navigation permanente

```
                    ┌──────────────┐
                    │   PROLOGUE   │  (1×)
                    └──────┬───────┘
                           ↓
              ┌────────────────────────┐
         ┌───│     CIEL / HUB          │───┐
         │   └────────────────────────┘   │
         │              ↕                  │
         │   ┌────────────────────────┐   │
         └──→│  WIZARD (steps 1–7)     │←──┘
             └───────────┬────────────┘
                         ↕
              ┌────────────────────────┐
              │  STUDIO (steps 4–7)    │
              └───────────┬────────────┘
                          ↕
              ┌────────────────────────┐
              │  TIROIR MÉDIA (global)│
              └────────────────────────┘
```

| Depuis | Toujours reachable |
|--------|-------------------|
| Ciel | Tiroir · Studio · Wizard (réglages) |
| Studio | Ciel · Tiroir |
| Wizard | Ciel · Tiroir (après intro) |

**Invités** (`/contribute/[token]`) : ciel + dépôt → tiroir partagé — **pas** studio.

---

## 7. Tiroir média (Coffre global)

| Aspect | Règle |
|--------|--------|
| **Première rencontre** | Wizard étape 3 « Le Coffre » — onboarding du tiroir + **« Plus tard »** |
| **Gate** | **Aucun** — studio et hub accessibles même Coffre vide |
| **Feedback ciel** | 1ʳᵉ photo orga → 1 slot s’allume ; skip → ghosts |
| **Ensuite** | Icône **Coffre / tiroir** dans le chrome global (ciel · wizard · studio) |
| **Contenu** | Tous les assets projet (`projectMedia`, invités, scanner…) |
| **Studio** | Lit **uniquement** le tiroir — pas une 2ᵉ banque |
| **Constellation** | Affiche des **slots** curatés — pas la liste complète du tiroir |

Réf. technique actuelle : étape 3 wizard, [`WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md), `projectMediaCache`, Scanner dans le Coffre.

---

## 8. Réponses rituelles du ciel (pas gamification)

Chaque validation majeure peut avoir un **impact visuel** — vocabulaire rituel, pas « niveau 2 » :

| Moment | Réponse ciel (suggestion) |
|--------|---------------------------|
| Prologue | Hero seule |
| Fin étape 1 | Reveal constellation (silhouette + ghosts + traits) — dates figent la silhouette |
| Fin étape 2 | Filaments / lien cercle (partage prêt) — pas de co-org UI |
| Fin étape 3 — photo | Premier slot s’allume (organisateur) |
| Fin étape 3 — Plus tard | Ghosts inchangés — hub / studio ouverts |
| Dépôt invité | Naissance Lueur ou slot (cf. [`SANCTUARY_SKY_LUEURS.md`](../SANCTUARY_SKY_LUEURS.md) §5) |
| Seuils | Nebula / compteur doux (« 12 Lueurs ») |

Animations réutilisent le craft : [`ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md) · reveal Leo · `/test-lueur`.

---

## 9. Anti-patterns

- ❌ Refondre les 7 étapes wizard en quêtes
- ❌ Cacher le ciel pendant tout le wizard
- ❌ 1 upload = 1 étoile automatique (ciel illisible)
- ❌ Deux banques média (ciel vs studio)
- ❌ Bloquer le studio tant que le ciel n’est pas « plein » ou que le Coffre est vide
- ❌ Étape 3 sans bouton « Plus tard »
- ❌ Co-organisateurs à l’étape 2 (friction onboarding)
- ❌ Canal imposé (WhatsApp-first) ou partage requis avant « Continuer »
- ❌ Étape 1 sans date de décès (constellation non figée)
- ❌ Teal vendu comme Lueur SKU

---

## 10. Décisions produit (figées)

| # | Sujet | Décision |
|---|--------|----------|
| **D1** | Champs étape 1 | **Prénom + date de naissance + date de décès** — indispensables pour figer la constellation. |
| **D2** | Étape 2 | **Générer le lien / Inviter seulement.** Co-organisateurs → Studio. **Canal-agnostique** — Partager (sheet) · Copier message · QR. Skip immédiat. |
| **D3** | Étape 3 | **« Plus tard » obligatoire.** Ne jamais bloquer. Photo → étoile s’allume ; skip → fantômes. |
| **D4** | Slots invités (reste) | Dépôt invité → tiroir ; allumer un slot Leo = **curation famille** (hors premier dépôt orga étape 3). |

---

## 11. Plan d’implémentation

Ordre recommandé — **craft d’abord**, puis shell produit, sans casser le wizard.

| Phase | Quoi | Craft / code | Critère done |
|-------|------|--------------|--------------|
| **J0** | Copy hub + décisions 1–3 | Ce doc + [`COPY.md`](../COPY.md) / JSON | ✅ D1–D3 figées |
| **J1** | Prologue shell | Route onboarding · enchaîne éclipse + wormhole + ciel | 1× playable dev |
| **J2** | Overlay étape 1 | Panneau verre · prénom + 2 dates · autosave step 1 | Valide = trigger reveal |
| **J3** | Récompense constellation | Brancher reveal Leo post-step-1 · HeroStar craft | Animation 2–4 s |
| **J4** | Hub + étape 2 overlay | UI post-récompense · invite canal-agnostique · retirer co-org step 2 | Partager · Copier · skip immédiat |
| **J5** | Tiroir global | Chrome icône Coffre · ouvert depuis ciel + studio | Même banque step 3 |
| **J6** | Nav permanente | Ciel ↔ wizard ↔ studio ↔ tiroir | 1 clic partout |
| **J7** | Invités → tiroir → slot | Sanctuaire contribute · règle curation | Dépôt ≠ auto-star |
| **J8** | Lueurs grille B + naissance | [`SANCTUARY_SKY_LUEURS.md`](../SANCTUARY_SKY_LUEURS.md) P2–P6 | SKU → étoile colorée |
| **J9** | DA + mobile | [`DA_SCREENS.md`](../DA_SCREENS.md) frames onboarding | Bottom sheet 55 % |

**Ne pas faire en J1–J4 :** grille Lueurs complète, seuils nebula, certificats papier.

---

## 12. Une phrase

**Prologue wow → Hero → tu ancre (étape 1) → le ciel répond (constellation) → le hub explique (famille remplit le ciel, vous le tiroir pour le film) → wizard et studio restent, avec le Coffre toujours sous la main.**
