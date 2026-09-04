# Parcours UX — Storyboard voulu (Chemin 1)

**Type :** living · **Vérité pour :** expérience **voulue** — ce que l’humain voit et ressent, beat par beat. Pas le plan technique.  
**Dernière MAJ :** 3 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 4 sept 2026 — **Porte Beat 3** : Continuer · *ou* · *Poursuivre sans les animations du ciel* → étape 2.
- 3 sept 2026 — Invité figé + plan technique démo 10 sept. [`PARCOURS_UX_STORYBOARD_INVITE.md`](PARCOURS_UX_STORYBOARD_INVITE.md) · [`PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md)
- 3 sept 2026 — Beat 12 : **télécharger** + **rester dans le ciel** selon forfait. Plus *le film part*.
- 3 sept 2026 — Beats 6→10 + étoile à l’**acceptation** · J3 Continuer = **Inviter**. Dépôt ≠ étoile.

**Statut :** **fermé pour l’orga** — beats 0→12 · décisions §8 figées. **Invité figé :** [`PARCOURS_UX_STORYBOARD_INVITE.md`](PARCOURS_UX_STORYBOARD_INVITE.md). **Plan technique démo 10 sept :** [`PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md).

**Liens :**
- Spec impl encore active (à réaligner après ce storyboard) : [`PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](PARCOURS_UX_CHEMIN_1_TRAVERSEE.md)
- Trous à ne pas oublier : [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md)
- Beats nommés : [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md)
- Scanner : [`../SCANNER_COMPANION.md`](../SCANNER_COMPANION.md)
- Collab : [`../WIZARD_EDITOR_COLLAB.md`](../WIZARD_EDITOR_COLLAB.md)
- Livre Ouvert / magie : [`../STORYBOARD_STEP5_LIVRE_OUVERT.md`](../STORYBOARD_STEP5_LIVRE_OUVERT.md)
- Fonds (mécanique, pas la copy écran) : [`../IMPLEMENTATION_CASCADE_VFINAL.md`](../IMPLEMENTATION_CASCADE_VFINAL.md)
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
- Ligne discrète dessous, après *ou* : *Poursuivre sans les animations du ciel* → Atelier étape 2 (pas de Beat 4–5).

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
| **Porte du rituel** | Après validation : **Continuer** (défaut) → Beat 4. *ou* · *Poursuivre sans les animations du ciel* → étape 2 (pas de Beat 4–5). |
| **Pas** | Un écran « Choisissez votre parcours » |

---

### Beat 4 — Le rituel (nom, Hero, constellation)

| | |
|--|--|
| **Quand** | **Continuer** (pas *Poursuivre sans les animations du ciel*) |
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
| **Clarification** | « Le ciel s’allume » = **des gens** se greffent (étoiles). « Déposent » = fichiers dans le **Coffre**, pas une étoile par photo. |
| **Permission** | *Prenez votre temps. Le ciel attend.* |
| **Geste** | **Inviter** dominant · **Continuer** plus doux → **Beat 6 Inviter** (G2). Skip invite ensuite → Beat 7 Coffre. |
| **Jamais** | Argent, RevShare, forfait sur cet écran (famille) |
| **Pourquoi les deux phrases** | Sans la 2ᵉ, l’orga croit *1 souvenir = 1 étoile*. Ciel ≠ Coffre. |
| **Placeholder greffe** | Un trait + un point. Filaments craft = plus tard. Tant qu’on ne laisse pas croire que c’est déjà quelqu’un de la famille. |
| **Trous GAPS couverts** | Cercle A · `hub.skyVsVault` · `hub.noRush` · G2 Inviter first · UI J3 |

**Après J3, l’orga a compris pourquoi inviter. Il n’a encore rien invité. Rien n’est dans le Coffre.**

---

## 4. Coffre + Scanner — une pièce, plusieurs portes (figé 3 sept 2026)

**Simplifier :** pas un Coffre *et* un Scanner ailleurs. Une surface = **le Coffre**. Le Scanner est **une porte** dedans.

- 3 sept 2026 — **Figé :** un souvenir dans le Coffre **n’allume pas** une étoile. Les étoiles = **les gens** qu’on invite (greffe). Le Coffre = tiroir.

| Porte | Qui | Où ça atterrit |
|--------|-----|----------------|
| Fichier / photo orga | Desktop | **Le Coffre** |
| **Scanner compagnon** (QR, téléphone, papier, pas d’app) | Orga ou salon | **Le même Coffre** |
| Lien invité | Famille, amis | **Le même Coffre** |

Inviter n’est **pas** un second Coffre : c’est le cercle (J3 + Beat 6). Les **souvenirs** des proches **entrent** ici. Leur **présence** (étoile) se greffe au ciel — pas le fichier.

Copy déjà au catalogue : *Les photos arrivent dans le coffre* (`tributeWizard.scannerHint`).

---

## 5. Beats 6 → 12

Rail métier inchangé : wizard **7** étapes. Ici = mise en scène.

### Beat 6 — Inviter (cercle)

| | |
|--|--|
| **Quand** | CTA **Inviter** depuis J3, ou étape 2. Skip OK. |
| **On voit** | Overlay léger (ciel encore là en Traversée ; formulaire en Atelier). Pas un 2ᵉ Coffre. |
| **Copy** | *Ils reçoivent un lien. Leurs souvenirs entrent dans le Coffre — vous composez le film et le ciel ensemble.* |
| **Geste** | Envoyer / copier le lien · **Plus tard** sans culpabilité |
| **Étoile réelle** | Le proche **dépose** (nom + souvenir) → **une** étoile à son nom se greffe, **et** le souvenir va au Coffre. Pas l’envoi du lien. Pas une étoile par photo. Détail : [`PARCOURS_UX_STORYBOARD_INVITE.md`](PARCOURS_UX_STORYBOARD_INVITE.md). |
| **Jamais** | Argent, forfait, Lueurs, « ils peuvent payer » |
| **Trou** | `circle.guestJourney` **P0** |
| **Placeholder** | Copy + champ lien. Filaments craft = plus tard. |

Si l’orga skip : on le dit quand même en une ligne, sinon le ciel qui ne bouge pas a l’air cassé.

---

### Beat 7 — Le Coffre (tiroir)

| | |
|--|--|
| **Quand** | Étape 3 — après Inviter ou skip |
| **On voit** | Un **tiroir** qui s’ouvre (CSS OK). Dedans : grille des souvenirs + **Scanner compagnon** (QR, même pièce). |
| **Copy** | *Ici se rangent les souvenirs. Plus tard, vous en ferez un film.* |
| **Gestes** | Déposer (fichiers) · Scanner (téléphone, papier, pas d’app) · souvenirs d’invités qui arrivent ici · **Plus tard** obligatoire et bienveillant |
| **Pas** | Une étoile qui naît à chaque dépôt. Le tiroir se **remplit**, le ciel ne change pas. |
| **Porte double** | Inviter encore (nourrir le cercle) **ou** rester dans le tiroir |
| **Trou** | `vault.filmBridge` **P0** |
| **Scanner** | [`SCANNER_COMPANION.md`](../SCANNER_COMPANION.md) · *Les photos arrivent dans le coffre* |
| **Mobile** | Posture **Capture** (canon mobile) — le téléphone *est* le Scanner, pas un wizard compressé |

---

### Beat 8 — Les chansons (pont vers le film)

*Avant le studio. Sans ça, l’étape 5 tombe du ciel.*

| | |
|--|--|
| **Quand** | Étape 4 — **après** le Coffre, **avant** le Livre Ouvert |
| **Ordre figé** | Musique → montage. La capacité d’un chapitre dépend de la **durée** de la chanson. [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](../STORYBOARD_STEP5_LIVRE_OUVERT.md) |
| **On comprend** | On va **faire un film**. Les images viennent du Coffre. Chaque **chanson** = un **chapitre**. La 1ʳᵉ chanson accueille **X** souvenirs (calcul pacing déjà là). |
| **On voit** | Choix de chansons · chapitres qui s’ouvrent · bandeau *X médias dans ce chapitre* — pas un tableur |
| **Copy (à caler FR+EN)** | Sens : *Vous composez un film avec les souvenirs du Coffre et les chansons que vous choisissez.* |
| **Trou** | Bandeau éducatif étape 4 existe en UI · **manque** d’être un beat parcours (`studio.filmBridge` commence ici, pas seulement à l’entrée 5) |
| **Plus tard Coffre** | On peut n’avoir presque rien dans le tiroir. Les chapitres existent quand même ; on complète plus tard. |

---

### Beat 9 — Le studio (Livre Ouvert)

| | |
|--|--|
| **Quand** | Étape 5 — **après** les chansons |
| **Ciel** | Plus d’immersif. Focus récit. |
| **Copy** | *Maintenant, vous donnez une forme au film — à partir de ce que le Coffre contient.* |
| **Trois portes** (même écran d’entrée) | 1. **Composition magique** — Odyssey range les souvenirs. 2. **Je compose**. 3. **Inviter un co-créateur** — visible **dès l’entrée**, plus petit que 1 et 2. Paiement = titulaire. [`WIZARD_EDITOR_COLLAB.md`](../WIZARD_EDITOR_COLLAB.md) |
| **Onboarding** | Gate magie / manuel déjà spec ([`STORYBOARD_STEP5_LIVRE_OUVERT.md`](../STORYBOARD_STEP5_LIVRE_OUVERT.md) § deux entrées). Le co-créateur = 3ᵉ porte, pas un 2ᵉ Coffre. |
| **Trou** | `studio.filmBridge` **P1** · collab livré côté contrat, **à raconter** dans le parcours |
| **Soft Cap** | Silence dans le **Coffre**. Conversation forfait / extras **après** le film (magie ou aperçu), pas au tiroir. [`NARRATIVE_SOFT_CAP.md`](../NARRATIVE_SOFT_CAP.md) |

**Aperçu (étape 6, figé) :** pas un monde nouveau. Une ligne : *Regardez le film.* Puis extras / envoi. Filigrane selon canal.

---

### Beat 10 — Le cercle peut porter l’hommage

*Socio-financement. Ici, pas à J3, pas dans le Coffre, pas sur Inviter-souvenirs.*

| | |
|--|--|
| **Quand** | Après qu’iels ont compris le **film** (sortie studio / avant ou dans l’envoi) |
| **Ton** | Une phrase famille. Pas un pitch. Pas RevShare. Pas « payez ». |
| **Copy (sens, clés à créer)** | *Le cercle peut aussi porter l’hommage — une Lueur, un Livre, un film plus vaste. Vous pouvez n’avoir rien à régler.* |
| **Ce que c’est** | Les proches mettent de l’argent **sur l’hommage** (crédit produit : forfait plus haut, Lueurs, Livre). Jamais un virement dans la poche de l’orga. À l’envoi, le reste peut être **0 $**. |
| **Lien invité** | **Souvenir d’abord.** *Allumer une Lueur* (porter l’hommage) = **2ᵉ porte**, seulement si le Fonds est allumé. V1 sans flag = souvenir seul. |
| **Jamais** | % salon, RevShare, « caisse », argent sur J3 |
| **Mécanique** | [`IMPLEMENTATION_CASCADE_VFINAL.md`](../IMPLEMENTATION_CASCADE_VFINAL.md) · flag `viral_loop_enabled` — le beat existe même si le flag est off (copy + stub) |
| **Canal salon** | *C’est un cadeau du salon…* = `channel.souvenirGift` — **pas** Chemin 1 B2C pur. Ne pas mélanger. |

---

### Beat 11 — Les extras (le panier se recolle)

*Ce n’est pas une 8ᵉ étape wizard. C’est l’étape 7 : Extensions + maths. On a pu **proposer** des extras en chemin ; ici on **arrête les comptes**.*

| | |
|--|--|
| **Quand** | Après l’aperçu, **avant** (ou **avec**) l’envoi — `CheckoutStep` · pas un 8ᵉ step |
| **Principe** | Proposé **là où ça a du sens** (Scanner → retouche IA, chanson officielle → licence, etc.). **Payé / inclus une seule fois.** Le panier est la vérité. |
| **On voit** | Liste claire : déjà dans le forfait (*Déjà inclus*) · déjà choisi en chemin (ex. retouche au Scanner) · encore optionnel (Livre, Jeton, Voix, Coffre 50 ans…). |
| **Exemple Scanner** | Au scan : aperçu Avant/Après + *Ajouter la restauration IA*. Ça **coche** `aiRetouch` (ou montre qu’Éternité l’inclut). Aux extras : la ligne est là, **pas** une 2ᵉ proposition surprise. Grille : [`FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) §2 — **ne pas recopier les prix ici**. |
| **Autres déclencheurs en chemin** | Chanson catalogue depuis Souvenir → licence **ou** forfait plus haut. Soft Cap après la magie → Héritage. Fonds / Lueurs / Livre → même panier. |
| **Maths** | Forfait voulu + extras − déjà inclus − crédit du cercle (Fonds) = **reste**. Peut être **0 $**. Pas de double facturation. |
| **Copy (sens)** | *Voici ce que contient l’hommage.* Pas « checkout ». Pas jetons. |
| **Trou** | Étape 7 existe · **manque** le récit « on recolle ce qu’on a déjà proposé » |

---

### Beat 12 — Le film est là (et on peut le télécharger)

*Pas un adieu. Le film **prend place sous le Hero**. On peut aussi **le télécharger**. Il **reste** dans le ciel **selon le forfait / extra**.*

| | |
|--|--|
| **Quand** | Étape 7, après les extras |
| **Intention** | 1. **Télécharger** le film (fichier à soi). 2. Il **reste** sous l’étoile : on y revient, la descendance aussi, **tant que** la durée du forfait / extra le permet. Ce n’est pas « ça part et le ciel est vide ». |
| **Copy (sens, clés FR+EN au code)** | *Vous pouvez le télécharger. Il reste dans le ciel, sous l’étoile, selon votre hommage.* **Interdit :** *Le film part, le ciel reste.* (`parcours.filmLeavesSkyStays` à remplacer, ne plus l’utiliser.) |
| **Durée dans le ciel** | Selon forfait / extra. Aujourd’hui : Éternité + Coffre-fort ≈ **50 ans** ([`FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) §2). **À confirmer et créer :** **25 / 50 / 100 ans** (et/ou X par année). |
| **Chiffre** | Reste à payer, y compris **0 $**, discret. Rider même à 0 $. |
| **Après** | Hub : Hero + constellation + **le film sous l’étoile** (lire / revoir). Téléchargement = extra geste, pas la fin de l’histoire. |
| **Trou** | Copy + durée paliers · le téléchargement existe déjà côté livrable — le **récit** manquait |

---

## 6. Checklist trous

| Trou | Dans ce storyboard ? |
|------|----------------------|
| Atelier + choix sous Continuer | ✅ §1 · Beat 3 |
| Éclipse → rituel → J3 | ✅ Beats 0–5 |
| Une personne = une étoile (dépôt invité) · fichiers = Coffre | ✅ §4 · Beat 6 · invité G2 |
| Coffre = une pièce · Scanner = porte | ✅ §4 · Beat 7 |
| `circle.guestJourney` | ✅ Beat 6 |
| `vault.filmBridge` | ✅ Beat 7 |
| Pont film / chansons / X médias | ✅ Beat 8 |
| Studio magie / je compose / co-créateur | ✅ Beat 9 (co-créateur dès l’entrée, plus petit) |
| Aperçu | ✅ Beat 9 (court) |
| Soft Cap après le film, pas le tiroir | ✅ Beat 9 |
| Ciel = gens · film = Coffre | ✅ Beat 5 + §8 |
| Cercle porte l’hommage · 0 $ | ✅ Beat 10 |
| Lueurs sur lien invité | ✅ si Fonds allumé seulement |
| **Extras / panier qui recolle** | ✅ Beat 11 |
| **Télécharger + rester selon forfait** | ✅ Beat 12 |
| Durée 25 / 50 / 100 ans | ⏳ **à confirmer** (grille) — pas inventé ici |
| Horizon famille / graphe | ✅ §9 — **pas** Chemin 1 |
| Fil P2 | ✅ Beat 12 |
| `media.firstDeposit` (étoile au dépôt) | ❌ **retiré** |

---

## 7. Une phrase (voulue)

**… → extras → télécharger **et** le film **reste sous le Hero** (durée = forfait). Ciel de famille / graphe = plus tard.**

---

## 8. Décisions figées (3 sept 2026)

Plus de questions ouvertes. Le plan technique part de là.

| # | Décision |
|---|---------|
| **Ciel vs film** | Ciel = **le cercle** (étoiles-personnes). Film = **souvenirs** du Coffre. |
| **Étoile réelle** | Quand l’invité **dépose** (nom + souvenir) — une étoile, pas une par fichier. Pas l’envoi du lien. |
| **J3 Continuer** | → **Inviter**. Coffre après skip ou après l’invite. |
| **Aide film (invité)** | Après souvenir + **courriel forcé** : options payantes pour aider à concevoir le film (Lueur, voix, générique… catalogue qui s’enrichit). |
| **Co-créateur** | Dès l’entrée studio, **plus petit** que magie / je compose. |
| **Aperçu** | Beat court, pas un monde. |
| **Fil P2** | Lisible 1ʳᵉ Traversée. Cliquable surtout Atelier. |
| **Soft Cap / 50 photos** | Silence dans le Coffre. Conversation **après** le film. |
| **Extras** | Proposés **en contexte**. **Recollés** à l’étape extras. Une ligne, pas deux factures. *Déjà inclus* si le forfait les contient. |
| **Télécharger vs ciel** | On **peut** télécharger. Le film **reste** sous le Hero **selon** le forfait / extra. Jamais *le film part*. |
| **Prix** | Jamais recopiés ici — [`FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) §2. |

---

## 9. Horizon — pas Chemin 1 (pour ne pas l’oublier)

Le Chemin 1 **termine** sur **un** ciel, **une** personne, **un** film sous le Hero. Ce qui suit est le rêve — **d’autres phases**. Ne pas le coder maintenant. Ne pas le promettre à l’écran V1.

| Phase | Intention | Déjà dans les docs ? |
|-------|-----------|----------------------|
| **Sanctuaire dans le temps** | Revenir au film sous l’étoile, petits-enfants compris. Durée = forfait / extra (50 ans actuel · **25 / 50 / 100** à créer). | Écrin / Coffre-fort [`SANCTUARY_STRATEGY.md`](../SANCTUARY_STRATEGY.md) · `digitalVault` |
| **Ciel de famille** | Plusieurs constellations (plusieurs êtres) dans **un** univers. On se **promène** comme un arbre généalogique dans l’espace — sanctuaire **média** des films des siens. Jumelage des ciels. | Vision, pas spec Chemin 1 |
| **Graphe** | Scanner / lire **tous** les médias reçus → graphe (qui, liens, visages…). | [`VISION_PHASE_2.md`](../VISION_PHASE_2.md) § graphe / LYRA — **plus tard** |

**Pourquoi plus tard :** un ciel de famille sans un premier ciel **juste** (une personne, un film, on y revient) serait un univers vide. Le graphe sans Coffre rempli n’a rien à lire.

**Chemin 1 prépare déjà ça :** étoiles = **gens** (pas photos) · Coffre = **tous** les souvenirs · film **sous** le Hero = l’ancre où la descendance revient. Le jumelage et le graphe s’accrocheront là.

---

## 10. Suite — storyboard invité

Écriture : [`PARCOURS_UX_STORYBOARD_INVITE.md`](PARCOURS_UX_STORYBOARD_INVITE.md) (beats G0→G6 proposés). Surface déjà en prod : `/[lang]/contribute/[token]`. Vision orga : [`SANCTUARY_USER_JOURNEY.md`](SANCTUARY_USER_JOURNEY.md) — **ne pas** confondre.

---

## 11. Hors scope de cette page

- Plan technique démo 10 sept — [`PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md) (slice invité, pas tout le Chemin 1).
- Grille 25 / 50 / 100 ans — **créer** dans FREEMIUM / extras, pas ici.
- Ciel de famille · graphe médias — §9, pas le rail 0→12.
- Storyboard invité — [`PARCOURS_UX_STORYBOARD_INVITE.md`](PARCOURS_UX_STORYBOARD_INVITE.md).
