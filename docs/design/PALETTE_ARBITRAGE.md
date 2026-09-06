# Odyssey — Arbitrage palette : les couleurs qu'il reste à décider

**Type :** décision en cours · **Vérité pour :** mesures des couleurs, options ouvertes, ce qui est déjà tranché.
**Dernière MAJ :** 6 sept 2026 · **Carte :** [`../README.md`](../README.md)
**Canon palette :** [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) §2 — **ce fichier ne remplace pas le canon**, il prépare sa prochaine version.

**Changelog** (max 5)
- 6 sept 2026 — **décision figée** pour l'Étape 5 : paille `#E4D96F` pour Composition Magique, violet pour Je compose moi-même, teal/cyan inchangé pour sélection/hover/focus et halos. Voir §7. Code (tokens + composant) prévu le 7 sept.
- 5 sept 2026 — création : trois bleu-verts mesurés, trois couleurs d'alerte, roue des teintes et quatre candidats pour la couleur chaude.

> **Reprise :** canvas interactif (roue des teintes, aperçus des cartes, comparatifs) →
> `~/.cursor/projects/Users-erik-Desktop-odyssey-frontend/canvases/wizard-palette-audit.canvas.tsx`
> Chat d'origine : audit palette du wizard, 5 sept 2026.

---

## 1. Pourquoi ce document

La palette n'a jamais été décidée en une fois : elle s'est déposée écran par écran. Résultat, trois systèmes cohabitent sans se parler et une même intention s'écrit de plusieurs façons. Ce fichier fige les **mesures** (elles ne changeront plus) pour que la décision de demain porte sur le goût, pas sur des suppositions.

Comptages relevés dans `src/` et `app/` le 5 sept 2026.

---

## 2. Les trois bleu-verts

| Couleur | Valeur | Usages | Rôle | Statut |
|---|---|---:|---|---|
| `teal-400` | `#2DD4BF` | 294 | Sélection, focus, respiration Studio | Documenté (§2.1bis) |
| `--salon-cyan` | `#00E8F0` | 58 | Le seuil : marketing, connexion, monolithe | Documenté (§2.1) |
| `cyan-400` | `#22D3EE` | 31 | Aucun — vit dans les halos et dégradés | **Jamais décidé** |

Le duo cyan / teal est un vrai système : le cyan est la porte, le teal accueille la famille. Le troisième est l'accident — assez proche des deux pour les brouiller dès qu'il sort d'un flou.

**Proposition :** garder la doctrine bicolore et donner une règle au troisième plutôt que le supprimer — *`cyan-400` n'est autorisé que dans un halo ou un dégradé, jamais sur une bordure ni un texte.* C'est déjà son comportement ; l'écrire empêche la dérive.

---

## 3. Les trois couleurs d'alerte

| Couleur | Ce qu'elle dit aujourd'hui | Usages | Où |
|---|---|---:|---|
| `rose-400` | Votre saisie est incorrecte | 23 | Messages de champ, bordures invalides |
| magenta / `fuchsia-*` | Quelque chose a échoué | ~40 | Halo connexion, fichiers refusés, réticule Studio |
| `red-400/500` | Vous allez détruire quelque chose | 14 | Supprimer un chapitre, un souvenir |

**Décidé :**
- Le **magenta** devient la couleur de l'échec, y compris les messages de champ — le `rose-400` disparaît.
- `#ff00ff` reste réservé aux signaux larges (halo, réticule) ; un magenta adouci pour le texte, ce que le code fait déjà pour la liste des fichiers refusés.
- Le **rouge reste** sur la suppression. Détruire n'est pas échouer : c'est le seul endroit du produit où l'utilisateur a besoin d'un réflexe plutôt que d'une esthétique.

---

## 4. La couleur chaude — roue des teintes

Placées sur la roue, les couleurs du produit forment **presque un carré**, à un angle près.

| Teinte | Angle | Écart au suivant |
|---|---:|---:|
| rouge `#F87171` | 0° | 43° → ambre |
| **ambre `#FBBF24`** | **43°** | **129° → teal** |
| teal `#2DD4BF` | 172° | 83° → violet |
| violet `#A78BFA` | 255° | 105° → rouge |

L'ambre se colle au rouge et laisse un trou de 129°. En déplaçant la couleur chaude de **43° vers ~75°**, les écarts passent de `43-129-83-105` à `75-97-83-105` : la roue se referme. C'est probablement la raison de fond du malaise ressenti sur l'ambre.

### Candidats mesurés

Clarté = luminance relative WCAG. Repère : **teal-400 = 0,51**. Une couleur plus claire que le teal volerait la vedette à la couleur du choix retenu.

| Candidat | Valeur | Angle | Clarté | Sur l'angle libre ? | Registre |
|---|---|---:|---:|---|---|
| Champagne du canon | `#C4B5A0` | 35° | 0,47 | Non — zone ambre | Beige perlé, très désaturé |
| Or ancien | `#CCBD79` | 49° | 0,51 | Non — zone ambre | Parchemin, vieil or |
| Vert tilleul | `#B8D075` | 76° | **0,57** | Oui | Frais et vif |
| **Olive patine** | `#A9BC72` | 75° | 0,46 | Oui | Laurier, bronze patiné |

**Lecture :**
- Le champagne (documenté §2.4, **zéro usage** dans le code) et l'or ancien sont émotionnellement justes mais tombent dans la zone de l'ambre : ils l'adoucissent sans corriger le déséquilibre.
- Le vert tilleul vise le bon angle — c'est la trouvaille — mais il est **plus clair que le teal** et un lime circule déjà dans la palette des chapitres.
- L'olive patine est le même angle ramené sous le teal.

**Recommandation :** l'angle du vert, la clarté de l'olive — autour de `#A9BC72`, **valeur exacte à régler à l'écran** sur les vraies cartes (poser deux ou trois variantes et choisir en regardant).

**Effet de bord recherché :** si la couleur chaude reprend le **domaine des souvenirs** (banque, voie manuelle, matière), l'ambre se replie sur les seules **alertes** (plafond, doublon, limite de forfait).

### Écartés

- `sage-memorial` `#7A9E87` — dans le canon, mais à ~140° : trop près du teal, brouille la sélection.
- `fuchsia-400` — famille de l'échec, inutilisable sur un choix.

---

## 5. La palette sémantique visée

Le désordre ne vient pas d'un manque de couleurs mais d'un **manque d'intentions écrites** : un composant contient `border-amber-400/25` et rien ne dit si cet ambre veut dire « attention », « souvenirs » ou « recommandé ». Le suivant recopie la teinte sans l'intention.

Cible : **un fichier de tokens nommés par rôle**, et l'interdiction d'écrire une teinte Tailwind brute dans un composant du parcours.

| Rôle | Teinte | Ce que ça veut dire |
|---|---|---|
| `seuil` | `--salon-cyan` | Franchir une porte : marketing, connexion, monolithe |
| `choix` | `teal-400` | Retenu, actif, focus clavier |
| `ambiance` | `violet-400` | Halo, magie, ce que la machine fait pour vous |
| `matiere` | *à arrêter (~75°)* | Les souvenirs et la main qui les manipule |
| `echec` | magenta | Ça a raté : refus, erreur, saisie invalide |
| `destruction` | `red-400` | Ça va disparaître |
| `alerte` | `amber-400` | Plafond atteint, doublon, limite de forfait |
| `chapitre` | 10 teintes cycliques | Identité d'un chapitre — **inchangé** |

---

## 6. État — ce qui est fait, ce qui reste

**Fait et committé (5 sept) :**
- Choisir se dit en cyan partout : souvenirs, vignettes, options payantes, réseaux du Coffre.
- Les deux cartes de composition sont à égalité (même violet au repos, cyan au survol).
- `sanctuaryFocusRing` ajouté aux tokens boutons — il manquait sur les CTA principaux.
- Canon mis à jour : [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) §2.1bis « choisir = teal, partout ».

**Abandonné après vérification :**
- Unifier le CTA du monolithe — ce n'est pas une dérive mais la signature de marque ; le halo impose `--salon-cyan` (voir [`PARCOURS_MONOLITH_RECIPE.md`](PARCOURS_MONOLITH_RECIPE.md) §3).
- Retirer le magenta `#ff00ff` — c'est la signature UV du réticule Studio, pas un accent perdu.

**Décidé le 5-6 sept (à l'écran, dans le canvas) :**
1. ~~La valeur exacte de la couleur chaude (~75°)~~ → tranché sur un critère différent de l'angle : **paille `#E4D96F`**, retenue parce que Composition Magique évoque déjà cette teinte dans le livre/l'objet, pas parce qu'elle referme la roue des teintes. Elle tombe d'ailleurs dans la « zone ambre » du §4 (angle ≈ 54°) — écart assumé, la cohérence narrative a pesé plus lourd que la géométrie.
2. Elle **ne** reprend **pas** tout le domaine « souvenirs » côté ambre pour l'instant — scope volontairement réduit aux deux cartes de l'Étape 5 (voir §7). Pas d'audit large des `amber-*` restants dans ce chantier.
3. La carte « Je compose moi-même » **devient violette** (au lieu de rester à égalité violet/violet avec l'autre carte) : les deux cartes avaient la même couleur au repos, ce qui ne distinguait pas visuellement les deux voies avant sélection.
4. Fichier de tokens sémantiques : oui, mais scope réduit (§7) — pas la migration `rose-400` → magenta en même temps, laissée pour un chantier séparé.

## 7. Décision finale — Étape 5 (6 sept 2026)

| Carte | Couleur au repos | Sélection / hover / focus | Halo |
|---|---|---|---|
| Composition Magique | **paille `#E4D96F`** | teal/cyan (inchangé) | `SANCTUARY_HALO_UV` / `SANCTUARY_HALO_TEAL` (inchangés) |
| Je compose moi-même | **violet** | teal/cyan (inchangé) | inchangés |

**Implémentation prévue (7 sept) :**
- `#E4D96F` déclarée en variable CSS nommée `--wizard-magic-wheat` dans `app/globals.css` — même patron que `--salon-cyan` — jamais un hex brut dans un `className`.
- Tokens dédiés dans [`../../src/lib/contribute/sanctuaryChrome.ts`](../../src/lib/contribute/sanctuaryChrome.ts) référençant cette variable.
- Application dans [`../../src/components/tribute/storyboard/MontageOnboardingGate.tsx`](../../src/components/tribute/storyboard/MontageOnboardingGate.tsx) uniquement.

**Explicitement hors scope de cette décision :**
- [`../../src/lib/wizard/montageActTheme.ts`](../../src/lib/wizard/montageActTheme.ts) (thème `spark`/`epic`/`legacy`) — colore les **actes narratifs du Studio**, un système à part qui partage l'ambre avec `spark` par coïncidence, pas par lien de sens avec Composition Magique. Non touché.
- Les autres `amber-*` du wizard/studio (alertes, plafonds) — inchangés.
