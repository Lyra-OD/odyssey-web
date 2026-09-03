# Parcours UX — Storyboard voulu (Chemin 1)

**Type :** living · **Vérité pour :** expérience **voulue** — ce que l’humain voit et ressent, beat par beat. Pas le plan technique.  
**Dernière MAJ :** 3 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 3 sept 2026 — Choix Traversée / Atelier **sous Continuer étape 1** (pas au login) · Coffre = **une** pièce, Scanner = une porte.
- 3 sept 2026 — Ouverture : beats 0→J3 dictés · Atelier parallèle · mobile (2 mises en page si besoin) · suite = Coffre + Scanner compagnon.

**Statut :** **en cours d’écriture** — on continue ici **avant** le plan technique.

**Liens :**
- Spec impl encore active (à réaligner après ce storyboard) : [`PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](PARCOURS_UX_CHEMIN_1_TRAVERSEE.md)
- Trous à ne pas oublier : [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md)
- Beats nommés : [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md)
- Scanner : [`../SCANNER_COMPANION.md`](../SCANNER_COMPANION.md)
- Mobile wizard (postures, pas 2 apps) : [`../MOBILE_WIZARD_STRATEGY.md`](../MOBILE_WIZARD_STRATEGY.md)

**Règle :** un craft incomplet = **placeholder** documenté. Ça **ne bloque pas** le beat suivant.

---

## 0. Comment lire ce doc

Chaque beat = ce qu’on **voit**, ce qu’on **sent**, ce qu’on **peut faire**, et le **stub** si l’animation n’est pas prête.

Les chaînons de [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md) sont listés dans le beat où ils doivent vivre. Si un trou n’a pas encore de visuel, il est marqué **à placer** — on ne le laisse pas tomber.

---

## 1. Deux modes — même histoire, deux mises en scène

Certaines personnes ne comprendront pas (ou ne voudront pas) le rite. On leur donne une **sortie**, et on peut **basculer** ensuite. Ce n’est **pas** une question au login.

| Mode | Pour qui | Ce qui change | Ce qui ne change pas |
|------|----------|---------------|----------------------|
| **Traversée** | Wow, 1ʳᵉ visite | Éclipse · étoile · magie panneau · rituel · J3 | Wizard 7 étapes, autosave, Coffre, film |
| **Atelier** | Pressés, QA, retour, accessibilité | Formulaires sans rite · ciel léger ou absent | **Le même** wizard métier |

### Où se pose le choix (figé 3 sept 2026)

| Moment | Quoi |
|--------|------|
| **Login / éclipse / Une présence** | **Pas** d’écran « expérience ou formulaire ». La Traversée commence. Lien discret seulement (*Passer à l’atelier*) pour ceux qui fuient tout de suite. |
| **Après l’Essentiel (étape 1)** | **Le** choix. Sous **Continuer**, pas une page à part. Ils ont un prénom, une date, un visage — Continuer n’est plus abstrait. |
| **Retour (Chemin B)** | Draft déjà rempli → **Atelier par défaut**. Pas d’éclipse, pas de « Une présence » forcé. *Reprendre la Traversée* reste possible. |
| **Toujours** | Lien sous la langue : *Passer à l’atelier* / *Reprendre la Traversée*. |

**Porte du rituel (Beat 3) :**

- **Continuer** (défaut) = Beat 4 : ciel, nom, Hero, constellation, puis J3.
- Ligne discrète dessous : *Composer sans le ciel* → Atelier (étapes suivantes, zéro rite).

Copy écran : clés FR+EN à créer au moment du code (`dictionaries/`) — pas de phrase en dur dans le `.tsx`.

> **Trou GAPS P1 Atelier** — spec déjà figée. Ici le choix n’est **pas** à l’entrée : il est **à la porte du rituel**.

---

## 2. Mobile — fluide, ou deux mises en page

La Traversée doit se **vivre** sur téléphone, pas seulement « rentrer ».

- **Même histoire** (mêmes beats, même copy).
- **Deux mises en page** si le rite desktop ne tient pas au pouce : cadrage ciel, taille du panneau, CTA pouce, pas de WebGL sous les champs.
- **Pas** deux apps / deux routes wizard — voir [`MOBILE_WIZARD_STRATEGY.md`](../MOBILE_WIZARD_STRATEGY.md) (un wizard, postures Capture / composition).
- Scanner compagnon = déjà la posture **téléphone** du Coffre (QR, pas d’app native).

À trancher au storyboard Coffre : sur mobile, le rite constellation (J3) reste-t-il en plein ciel, ou passe-t-on plus tôt en Atelier ? **Défaut proposé :** Traversée allégée (ciel + Hero + panneau plein écran), Atelier en 1 tap.

---

## 3. Les beats (dictés 3 sept 2026)

### Beat 0 — L’éclipse

| | |
|--|--|
| **Quand** | Première connexion, **quel que soit le canal** |
| **Fréquence** | Une fois par compte |
| **On voit** | Animation éclipse — craft **quasiment terminé**, il manque un petit bout |
| **Placeholder** | Fondu depuis le noir vers le ciel étoilé. **N’empêche pas** le beat 1 |
| **Émotion** | Quelque chose de cosmique et sacré commence |
| **Craft** | [`ODYSSEY_ECLIPSE_CRAFT.md`](../ODYSSEY_ECLIPSE_CRAFT.md) |
| **Sortie** | Lien discret seulement — **pas** de choix d’écran. Le vrai choix = Beat 3. |

---

### Beat 1 — Une présence

| | |
|--|--|
| **Quand** | Après l’éclipse (ou stub éclipse) |
| **On voit** | Ciel **vivant**. Étoile Hero teal qui respire au centre. |
| **Copy** | *Une présence.* · *Toucher l’étoile.* |
| **Geste** | Toucher le Hero |
| **Émotion** | Calme. Quelque chose attend qu’on vienne à lui. |
| **Note** | Si l’atome Hero doit être refait pour tenir le reste du rite, on le refait. |
| **Placeholder Hero** | Point teal + souffle CSS — le geste « toucher » reste. |

---

### Beat 2 — L’étoile devient le wizard

| | |
|--|--|
| **Quand** | Toucher l’étoile |
| **On voit** | Le panneau **Étape 1** naît **de l’étoile** — dilatation / transformation, pas un slide générique ni un fade plat. |
| **Durée** | ~1–2 s |
| **Derrière** | Le ciel **se fige** (on arrête de dessiner — pas une photo JPEG de capture) |
| **Émotion** | Magie. Moment le plus important du parcours jusqu’ici. |
| **Placeholder** | Expand depuis le centre de l’étoile (CSS) si le craft 3D n’est pas prêt. Le **sens** reste : ça sort de l’étoile. |
| **Trou** | Fermer (X / Échap) → retour Beat 1, draft conservé. Hint : *Fermer · le ciel vous attend.* |

---

### Beat 3 — La saisie (Essentiel)

| | |
|--|--|
| **On voit** | Formulaire Étape 1 — prénom, nom, dates, photo principale |
| **Derrière** | Ciel figé, encore là — on sait qu’on est dans un lieu |
| **Rythme** | Aucune pression |
| **Toujours** | Lien chrome *Passer à l’atelier* |
| **Porte du rituel** | Après validation : **Continuer** (défaut) → Beat 4. Ligne discrète : *Composer sans le ciel* → Atelier (pas de Beat 4–5). |
| **Pas** | Un écran « Choisissez votre parcours » |

---

### Beat 4 — Le rituel (nom, Hero, constellation)

| | |
|--|--|
| **Quand** | **Continuer** (pas *Composer sans le ciel*) |
| **Ordre visuel** | 1. Le panneau se referme, l’étoile reprend sa place. 2. Le ciel **se rallume**. 3. Le **prénom** naît. 4. L’**étoile Hero** naît. 5. La **constellation du signe** se dessine (date de naissance, silhouette réelle du zodiaque). |
| **Durée** | ~8–14 s (à caler après T2) |
| **Émotion** | **Le** moment. Le ciel s’allume pour cette personne. |
| **Nom** | Animation du nom **à garder** si elle survit au cadrage constellation ; sinon on la refait **pour** ce rituel, pas contre. |
| **Identité** | Rituel = **prénom seul** au Hero. Nom + dates = respect, plus tard / plus discrets (G1). |
| **Placeholder signes** | Tant que 10 signes manquent : **ne pas mentir**. Stub = Lion + note craft, ou n’afficher le rite zodiaque que pour Lion / Balance. |
| **Mobile** | La figure entière doit **tenir dans l’écran** (recul caméra). Si trop serré : version mobile = Hero + 1er trait, le reste en recul plus fort. |

---

### Beat 5 — J3 : le ciel peut grandir (Inviter)

*C’est ici qu’on fait comprendre Inviter / Coffre / film — pas un panneau froid posé trop tôt.*

| | |
|--|--|
| **Quand** | Juste après le dessin, **sur** la constellation encore chaude |
| **On voit** | Hold 1–2 s. Puis un **filament** part du Hero (ou d’un nœud du signe). Une **étoile plus petite** naît au bout — **pas** un 2ᵉ Hero. C’est un **exemple**, pas un invité réel. |
| **Copy (ordre)** | 1. *Plus le cercle partage, plus le ciel s’allume.* 2. *Ils déposent des souvenirs. Vous composez le ciel et le film.* |
| **Permission** | *Prenez votre temps. Le ciel attend.* |
| **Geste** | **Inviter** dominant · **Continuer** plus doux · skip toujours possible |
| **Jamais** | Argent, RevShare, forfait sur cet écran (famille) |
| **Pourquoi les deux phrases** | Sans la 2ᵉ, l’orga croit *1 souvenir = 1 étoile*. Ciel ≠ Coffre. |
| **Placeholder greffe** | Un trait + un point. Filaments craft = plus tard. Tant qu’on ne laisse pas croire que c’est déjà quelqu’un de la famille. |
| **Trous GAPS couverts** | Cercle A · `hub.skyVsVault` · `hub.noRush` · G2 Inviter first · UI J3 |

**Après J3, l’orga a compris pourquoi inviter. Il n’a encore rien invité. Rien n’est dans le Coffre.**

---

## 4. Coffre + Scanner — une pièce, plusieurs portes (figé 3 sept 2026)

**Simplifier :** pas un Coffre *et* un Scanner ailleurs. Une surface = **le Coffre**. Le Scanner est **une porte** dedans.

Le ciel **ne reçoit pas** les fichiers. Il s’allume **parce que** quelque chose est dans le Coffre (et que l’orga compose). Sinon on recrée le trou Ciel ≠ Coffre avec un troisième tiroir.

| Porte | Qui | Où ça atterrit |
|--------|-----|----------------|
| Fichier / photo orga | Desktop | **Le Coffre** |
| **Scanner compagnon** (QR, téléphone, papier, pas d’app) | Orga ou salon | **Le même Coffre** |
| Lien invité | Famille, amis | **Le même Coffre** |

Inviter n’est **pas** un second Coffre : c’est le cercle (J3 + étape 2). Les souvenirs des proches **entrent** ici.

Copy déjà au catalogue : *Les photos arrivent dans le coffre* (`tributeWizard.scannerHint`).

Visuel du tiroir, porte double, premier dépôt : **prochaine écriture détaillée** (beats ci-dessous).

---

## 5. Suite — pas encore storyboardée beat par beat

| Beat | Intention (une ligne) | Trou GAPS |
|------|----------------------|-----------|
| **Inviter (étape 2)** | Overlay léger sur le ciel (ou Atelier). Skip OK. | Après 1ʳᵉ invite ou skip : *Ils reçoivent un lien…* (`circle.guestJourney`) |
| **Coffre (étape 3)** | Tiroir précieux. *Ici se rangent les souvenirs. Plus tard, vous en ferez un film.* Dedans : déposer **et** Scanner. Porte double : inviter encore **ou** déposer. | `vault.filmBridge` **P0** |
| **Scanner compagnon** | **Dans** le Coffre, pas une étape à part. QR → téléphone → photos papier → **ce** Coffre. | [`SCANNER_COMPANION.md`](../SCANNER_COMPANION.md) |
| **Premier dépôt** | **Là**, une vraie étoile se greffe (pas l’exemple J3). Skip « Plus tard » = pas de culpabilisation. | `media.firstDeposit` |
| **Studio 4–6** | Plus de ciel immersif. *Maintenant, vous donnez une forme au film.* | `studio.filmBridge` |
| **Envoi** | *Le film part, le ciel reste.* | `parcours.filmLeavesSkyStays` |
| **Fil haut (P2)** | Nœuds Essentiels · Cercle · Coffre · Film — lisibles 1ʳᵉ Traversée, cliquables surtout en Atelier. | GAPS P2 |

**Greffe réelle des invités :** autant de nœuds que de proches qui partagent — ils se **greffent** à la constellation du signe. L’exemple J3 n’est que la leçon.

---

## 6. Checklist trous — rien n’est oublié

À recocher quand le beat a un visuel dans **ce** doc.

| Trou | Dans ce storyboard ? |
|------|----------------------|
| Atelier parallèle + bascule | ✅ §1 |
| Choix **sous Continuer** étape 1 (pas au login) | ✅ §1 + Beat 3 |
| Chemin B → Atelier par défaut | ✅ §1 |
| Éclipse 1× · placeholder | ✅ Beat 0 |
| Une présence / toucher | ✅ Beat 1 |
| Panneau depuis l’étoile · fermer → ciel | ✅ Beat 2 |
| Rituel nom + Hero + constellation | ✅ Beat 4 |
| J3 Inviter + Ciel ≠ Coffre + permission | ✅ Beat 5 |
| Coffre = une pièce · Scanner = une porte | ✅ §4 (visuel tiroir ⏳) |
| Mobile 2 mises en page | ✅ §2 |
| `circle.guestJourney` | ⏳ suite Inviter |
| `vault.filmBridge` visuel tiroir | ⏳ prochaine écriture |
| `media.firstDeposit` | ⏳ après Coffre |
| Studio / envoi / fil P2 | ⏳ plus loin |
| Salon `channel.souvenirGift` | Hors Chemin 1 B2C — ne pas mélanger |

---

## 7. Une phrase (voulue)

**Première connexion → éclipse (ou stub) → une présence → toucher l’étoile → le wizard naît de l’étoile → Continuer *(ou Composer sans le ciel)* → le ciel s’allume (nom, Hero, signe) → une branche enseigne qu’inviter fait grandir le ciel et remplit **le** Coffre (Scanner = une porte) pour le film → le ciel reste.**

---

## 8. Hors scope de cette page

- Plan technique (fichiers, Canvas, gel) — **après** ce storyboard.
- Prix, forfaits, RevShare — jamais dans les beats famille.
- Modifier [`PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](PARCOURS_UX_CHEMIN_1_TRAVERSEE.md) ligne à ligne — seulement quand ce storyboard est assez complet pour le remplacer ou le réécrire.
