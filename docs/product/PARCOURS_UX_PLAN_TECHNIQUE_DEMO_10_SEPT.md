# Parcours UX — Plan démo (jeudi 10 sept 2026, matin)

**Type :** living · **Vérité pour :** arriver **jeudi 10 sept au matin** avec un **concept complet, convaincant**.  
**Dernière MAJ :** 3 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 3 sept 2026 — **Script parlé** ~8 min (A / B / C) · si X casse, on dit Y.
- 3 sept 2026 — **Feuille walk ven 4** · parallèle Traversée = non · J3 seulement si Continuer est un trou.
- 3 sept 2026 — Approche technique : **surface, pas tuyaux** · marcher → 3 trous · stub documenté.
- 3 sept 2026 — **Refonte :** famille d’abord · invité = ouverture · Salon KPI = 3ᵉ acte. WOW = placeholders OK.
- 3 sept 2026 — T4 desktop deux colonnes · 390 accordéon · pied hors scroll · témoignage ouvert en entier.

**Statut :** **actif** · orga : [`PARCOURS_UX_STORYBOARD_VOULU.md`](PARCOURS_UX_STORYBOARD_VOULU.md) · invité : [`PARCOURS_UX_STORYBOARD_INVITE.md`](PARCOURS_UX_STORYBOARD_INVITE.md)

---

## 0. Ce que « démo » veut dire (figé 3 sept, soir)

Les **tuyaux sont là**. Des semaines. On ne recâble pas le moteur.

On montre le **concept entier** pour qu’un inconnu **y croie** en ~8 min.

| Priorité | Qui | Pourquoi |
|----------|-----|----------|
| **1 — Cœur** | **La famille** | C’est le plus important. On voit ce qu’elle *fait* : ciel, Coffre, chapitres, film, inviter. |
| **2 — Ouverture** | **L’invité** | Comment ça s’ouvre. Convaincant, **pas** le centre. |
| **3 — Preuve métier** | **Le Salon** | Commissions / KPI / *Mes performances*. Les écrans existent. |

**WOW = placeholder documenté.** Pastille 2D, filament CSS, `test-visuel` : OK si l’humain comprend le beat.  
**Pas** : recâbler Stripe, nouveaux SKU, éclipse / 12 signes / WebGL rails.

Parké (on y revient après jeudi si besoin) : lead sous *Aider la famille…* · Lueur au même rang que les autres packs.

### Approche technique (nouvelle — figée 3 sept soir)

**Avant :** on construisait encore des tuyaux (T1–T6 invité, APIs, flags).  
**Maintenant :** le moteur est là. On **fait voir** ce qui existe. On ne recâble pas.

| Règle | Ça veut dire |
|-------|----------------|
| **Un wizard** | Les 7 étapes famille = la colonne. Pas de 8ᵉ étape, pas de nouvelle route. |
| **Surface, pas tuyau** | Layout, rythme, copy, trou entre deux écrans. Interdit : nouvelle API, nouveau SKU, WebGL rails, Stripe replay. |
| **Stub = livrable** | Pastille 2D, filament CSS, aperçu filigrané, `test-visuel`. Documenté > craft incomplet. |
| **Marcher → 3 trous** | On joue le fil. On ne fixe **que** ce qui casse le concept. Le reste attend. |
| **Deux peaux, un code** | 390 = carte. Desktop = ça s’étale (invité : 2 colonnes déjà). Même état. |
| **Couper par le bas** | Si le temps manque : acte C (Salon), jamais l’acte A (famille). |

Traversée 0→12 (éclipse, J3, 12 signes) = **canon**, pas le plan jeudi. On ne réécrit pas `PARCOURS_UX_CHEMIN_1_TRAVERSEE.md` cette semaine.

**Parallèle (figé 3 sept soir) :** on ne fait **pas** démo + Traversée à fond. Jusqu’au 10 = voie A. J3 / éclipse / signes = **off**, sauf si le walk ven 4 montre que Continuer mène nulle part — alors **une** J3 stub, pas le rite.

---

## 1. Script jeudi matin (~8 min)

### Acte A — La famille (le cœur, ~4 min)

1. Atelier wizard (7 étapes, déjà là) : **Essentiels** → ciel / Hero (WOW stub OK).
2. **Inviter** : copier le lien. Une phrase : le cercle va nourrir le Coffre.
3. **Coffre** : les souvenirs se rangent. Scanner si ça tient, sinon on le nomme et on passe.
4. **Chansons → Livre ouvert** : on compose un film avec le Coffre. Magie ou « je compose » — on *voit* le studio.
5. **Aperçu / envoi** : *regardez le film* (filigrane / stub OK). On comprend qu’un film existe.

Si un beat craft manque : **placeholder**, on avance. Ne pas ouvrir le WebGL.

### Script parlé (à dire, pas à coder)

On montre. On ne justifie pas le craft. Voix : souvenirs, film, chapitre, Coffre.  
Jamais : timeline, checkout, jetons, « on va recâbler ».

**Onglets prêts avant d’entrer :** `/fr/studio` · le lien invité (ou `/fr/contribute/test-visuel?packs=1`) · `/fr/salon/commissions` + `/fr/salon/mes-performances` si l’acte C tient.

---

**Acte A — ~4 min** · `/fr/studio`

| Temps | On montre | On dit |
|-------|-----------|--------|
| 0:00 | Essentiels, ciel / Hero | *« Une famille ouvre l’atelier. Elle dit pour qui c’est. Le ciel s’allume — c’est le sien. »* |
| 0:45 | Cercle · *Copier le lien* | *« Elle n’est pas seule. Un lien : les proches déposent un souvenir. Ça entre dans le Coffre. Elle compose le film. »* |
| 1:30 | Coffre-fort | *« Tous les souvenirs au même endroit. Photos d’ici, du téléphone, des invités. »* Scanner moche : *« Le téléphone pose aussi dans ce Coffre. »* On passe. |
| 2:15 | Musique → Le film | *« Chaque chapitre a une chanson. Ensuite, le studio : Odyssey range, ou elle compose. On *voit* le film se former. »* Magie si elle ouvre, sinon *Je compose*. |
| 3:15 | Aperçu | *« Voici le film. Pas un diaporama — un film, avec ce que le Coffre contient. »* Filigrane OK. |

**On ne va pas à Finaliser.** Stripe n’est pas le sujet.

Si un écran meurt : *« Ici, elle [beat]. On avance. »* On ne debug pas.

---

**Acte B — ~2 min** · même lien, 2ᵉ onglet (sinon `test-visuel?packs=1`)

| Temps | On montre | On dit |
|-------|-----------|--------|
| 4:00 | Ciel de X | *« Le proche ouvre le lien. Il voit le ciel — pas un formulaire. »* |
| 4:20 | Dépôt (photos et/ou mot + nom + courriel) | *« Il laisse un souvenir. Prénom, courriel. C’est dans le Coffre de la famille. »* |
| 4:50 | Étoile (stub 2D OK) | *« Et il est dans le ciel : une étoile à son nom. Une personne, une étoile. »* |
| 5:20 | *Aider la famille…* ou *Non merci* | *« S’il veut, il aide à concevoir le film. S’il ne veut pas : Non merci. Il reste dans le ciel. »* On skip. On ne paie pas. |

Pas de token : `test-visuel`. Une phrase : *« Même geste. Aperçu, sans paiement. »*

---

**Acte C — ~2 min** · coupable si le temps manque

| Temps | On montre | On dit |
|-------|-----------|--------|
| 6:00 | `/fr/salon/commissions` | *« Le salon voit le cercle : qui ouvre, qui dépose, ce qui revient. »* |
| 6:40 | `/fr/salon/mes-performances` | *« Chaque conseiller a ses chiffres. Pas une boîte noire. »* |

Chiffres à zéro : **on coupe C**. On ne s’excuse pas deux minutes sur un tableau vide.  
*« Le salon mesure l’ouverture. On vous le montre la prochaine fois. »*

---

**Si X casse**

| X | On dit | On fait |
|---|--------|---------|
| Ciel / Hero mort | *« Le ciel de la famille. »* | Stub, on avance vers Inviter. |
| Lien invité mort | *« Ils reçoivent ce lien. »* | `test-visuel?packs=1`. |
| Coffre vide | *« Ici se rangent les souvenirs. »* | On ne charge pas 20 photos en live. |
| Livre / aperçu laid | *« Elle compose le film ici. »* | Un écran, on ne rewrite pas. |
| Salon à zéro | (phrase ci-dessus) | Couper C. |
| Tout se casse | *« La famille fait un film avec le Coffre et le cercle. »* | Stop. On ne code pas. |

Fin à **8:00**. On ne « montre encore un truc ».

### Acte B — L’invité (l’ouverture, ~2 min)

Même lien, téléphone ou 2ᵉ onglet (ou `?packs=1` / `test-visuel` si le token n’est pas prêt) :

1. **Ciel de X** (pas le form d’abord).
2. Une saisie : photos et/ou mot + prénom + courriel.
3. Une étoile à son nom (stub 2D).
4. Packs *Aider la famille* ou *Non merci* → ciel.

### Acte C — Le Salon (preuve, ~2 min)

Compte partenaire : **commissions**, KPI, *Mes performances*. Chiffres **visibles** (vrais ou fixture crédible). Une phrase : le cercle qui aide, le salon qui voit.

---

## 2. Déjà branché (on ne reconstruit pas)

| Surface | État |
|---------|------|
| Wizard famille 7 étapes, autosave, Soft Cap, Dossier, checkout | Branché |
| Ciel / Hero / Inviter / Coffre / chapitres / Livre ouvert | Branché (craft incomplet = stub) |
| Lien invité, dépôt → Coffre, packs → Stripe | Branché (vrai token + flag) |
| Invité UI : ciel d’abord, 390 + desktop 2 colonnes, pied hors scroll | Branché |
| Salon `/salon/commissions` · `/salon/mes-performances` | Branché (API) |
| Greffe étoile WebGL, éclipse, 12 signes | **Pas** cette semaine |
| `test-visuel` | Aperçu UX, pas de paiement réel |

---

## 3. Travail restant (ordre)

### F1 — Famille : un fil qui se *voit* · **ven 4 – sam 5**

Marcher le wizard **comme la démo**. Noter uniquement ce qui **casse le concept** (écran mort, copy hors voix, trou entre deux étapes). Corriger ça. Pas de nouvelle mécanique.

Cibles : Essentiels → ciel → Inviter → Coffre → chansons → Livre ouvert → aperçu.  
Stub OK. Si le Livre ouvert ou l’aperçu est laid : **un** placeholder propre, pas un rewrite.

#### Ven 4 — journée (concrète)

**But du jour :** un inconnu comprend *ce que la famille fait*. Pas un nouveau tuyau. Pas l’invité. Pas le Salon.

| Quand | Quoi |
|-------|------|
| **Matin** | Ouvrir `/fr/studio` (compte démo déjà là). Marcher **une fois**, comme jeudi : Essentiels → ciel / Hero → Inviter (copier le lien) → Coffre → chansons → Livre ouvert → aperçu. Desktop d’abord. |
| **Midi** | Noter **seulement** ce qui casse le concept. Max **3** trous. Le reste = samedi ou on ignore. |
| **Après-midi** | Fixer ces 3 (ou moins). Stub propre > rewrite. |
| **Fin de journée** | Une phrase : *est-ce que l’acte A se raconte ?* Oui / non + les 3 lignes. |

**Casse le concept :** écran mort, on ne sait plus où on est, le Coffre / le film / Inviter est invisible, copy hors voix (timeline, checkout, jetons).  
**Ne casse pas :** craft incomplet, J3 absente, éclipse absente, Scanner moche — on **dit** le beat et on passe.

**Interdit ven 4 :** packs invité, lead *Aider la famille*, Salon KPI, WebGL rails, nouveaux SKU.

**Livrable :** liste de 0–3 trous (corrigés ou datés samedi) + « acte A tenable / pas encore ».

#### Feuille walk — ven 4 matin

Une passe. Desktop. On joue **comme jeudi**, on ne répare pas en marchant.

| | |
|--|--|
| **Où** | Local : `http://localhost:3000/fr/studio` · login si besoin : `/fr/studio/connexion`. Compte démo déjà là. |
| **Comment** | Une fois, sans revenir en arrière pour « améliorer ». Noter à voix haute. Max **3** lignes à la fin. |
| **Durée cible** | ~8–12 min (l’acte A jeudi = ~4 min ; là on a le droit de chercher). |

Stepper à l’écran : **Essentiels · Cercle · Coffre-fort · Musique · Le film · Aperçu · Finaliser**.

| # | Beat (script A) | On doit *voir* | ☐ |
|---|-----------------|----------------|---|
| 1 | Essentiels → ciel / Hero | On sait pour qui c’est. Le ciel / Hero existe (stub OK). | |
| 2 | Inviter | On copie un lien. Une phrase : le cercle nourrit le Coffre. | |
| 3 | Coffre | Les souvenirs se rangent. Scanner : on le nomme si moche, on passe. | |
| 4 | Musique → Le film | On compose avec le Coffre. Magie ou « je compose » — le studio se voit. | |
| 5 | Aperçu | Un film existe (filigrane / stub OK). | |
| — | Finaliser | **Hors walk.** Stripe n’est pas le goulot jeudi. | |

**Casse (on note) :** écran mort · on ne sait plus où on est · Coffre / film / Inviter invisible · copy hors voix (timeline, checkout, jetons).  
**Ne casse pas (on dit le beat, on passe) :** craft incomplet · pas d’éclipse · pas de J3 · Scanner moche · aperçu laid.

**Interdit pendant le walk :** packs invité, Salon, WebGL, nouveau SKU, « tant qu’à y être ».

**Fin de matinée — 3 lignes max :**

1. …
2. …
3. …

**Acte A se raconte ?** oui / pas encore.

Si Continuer (après le ciel) mène **nulle part** : c’est un trou. Alors seulement on parle d’une J3 stub — pas avant.

### F2 — Famille : WOW tenable · **sam 5**

Le ciel famille + la greffe / le Hero doivent **impressionner 20 secondes**. Stub 2D / reveal déjà là : on polish le *rythme*, on n’ouvre pas les rails.

### G — Invité : filet · **dim 6** (léger)

Le rail est fait. Une passe 390 + desktop deux colonnes. Pas de nouveau pack. Lead / Lueur égale = **parké**.

### S — Salon : chiffres qui se voient · **lun 7**

Les pages existent. Il faut un **compte de démo** dont les KPI ne sont pas à zéro (tenant réel ou fixture). Même prénom / même hommage que l’acte A si possible.

### R — Répétition · **mar 8 – mer 9**

Enchaîner A → B → C **deux fois**. Chrono. Une carte « si X casse, on dit Y et on saute ».  
Mercredi = filet bugs seulement.

### Jeu 10 matin

On **montre**. On ne code plus.

---

## 4. Calendrier (4 → 10 sept matin)

| Quand | Qui / quoi | Livrable |
|-------|------------|----------|
| **Ven 4** | F1 | Fil famille filmé ou noté · 3 trous max à fixer |
| **Sam 5** | F1 + F2 | Trous famille + 20 s WOW ciel |
| **Dim 6** | G | Filet invité 390 / desktop · script écrit (A/B/C) |
| **Lun 7** | S | Salon avec KPI visibles |
| **Mar 8** | R | 1ʳᵉ répétition complète |
| **Mer 9** | R | Bugs + 2ᵉ répétition · stop code 20 h |
| **Jeu 10 matin** | — | Démo |

Si on décroche : **couper l’acte C** (Salon). Jamais couper l’acte A. L’acte B tient déjà.

---

## 5. Hors jeudi matin

- Éclipse, freeze, 12 signes, filaments WebGL.
- Nouveaux SKU, mini-clip 30 s, 25/50/100 ans.
- Lead packs + forfaits égaux (parké).
- Réécrire `PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`.
- `PATCH /identity` (T3 annulé).

---

## 6. Critère « jeudi matin OK »

Un inconnu voit **ce que la famille fait** (ciel, Coffre, film) et **croit** au produit.

Bonus : l’invité ouvre le ciel et laisse un souvenir.  
Bonus : le Salon montre des chiffres.

Stripe live et token flag = **pas** le goulot. Le goulot = **l’acte famille se voit**.
