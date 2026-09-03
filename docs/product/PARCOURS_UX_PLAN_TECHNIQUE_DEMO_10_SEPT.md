# Parcours UX — Plan démo (jeudi 10 sept 2026, matin)

**Type :** living · **Vérité pour :** arriver **jeudi 10 sept au matin** avec un **concept complet, convaincant**.  
**Dernière MAJ :** 3 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 3 sept 2026 — **Refonte :** famille d’abord · invité = ouverture · Salon KPI = 3ᵉ acte. WOW = placeholders OK.
- 3 sept 2026 — T4 desktop deux colonnes · 390 accordéon · pied hors scroll · témoignage ouvert en entier.
- 3 sept 2026 — T6 copy voix/vidéo/mécène/lueur · passe 390 px.
- 3 sept 2026 — T5 Coffre : tuile *Souvenir* + nom (code ; à rejouer si le script le demande).
- 3 sept 2026 — T1–T4 invité : ciel d’abord · dépôt + courriel · packs.

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

---

## 1. Script jeudi matin (~8 min)

### Acte A — La famille (le cœur, ~4 min)

1. Atelier wizard (7 étapes, déjà là) : **Essentiels** → ciel / Hero (WOW stub OK).
2. **Inviter** : copier le lien. Une phrase : le cercle va nourrir le Coffre.
3. **Coffre** : les souvenirs se rangent. Scanner si ça tient, sinon on le nomme et on passe.
4. **Chansons → Livre ouvert** : on compose un film avec le Coffre. Magie ou « je compose » — on *voit* le studio.
5. **Aperçu / envoi** : *regardez le film* (filigrane / stub OK). On comprend qu’un film existe.

Si un beat craft manque : **placeholder**, on avance. Ne pas ouvrir le WebGL.

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
