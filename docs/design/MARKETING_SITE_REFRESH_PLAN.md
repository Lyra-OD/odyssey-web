# Odyssey — Plan refresh site marketing (B2C + B2B)

**Type :** playbook · **Vérité pour :** audit landing actuelle, écarts vs stratégie, plan de modification incrémentale (sans refonte).  
**Dernière MAJ :** 28 août 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 28 août 2026 — §8 croisement explicite [`B2C_GO_TO_MARKET.md`](../B2C_GO_TO_MARKET.md) · D1 realigné (pas de grille landing).
- 28 août 2026 — audit code + copy · plan 4 phases · inventaire fichiers · docs à mettre à jour ensuite.

Contexte stratégique (validé CEO + partenaire) : **deux portes** (`/fr` famille · `/fr/partners` pro), promesse Sanctuaire côté émotion, **zéro montage** côté douleur concrète, B2B = **geste + modernité + revenus teaser** (pas de % public).  
Canon produit : [`../B2C_GO_TO_MARKET.md`](../B2C_GO_TO_MARKET.md) · [`../SANCTUARY_STRATEGY.md`](../SANCTUARY_STRATEGY.md) · prix [`../FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) §2 · frames [`../DA_SCREENS.md`](../DA_SCREENS.md).

---

## 0. Principe directeur

**On ne recommence pas.** Shell visuel (Hero vidéo, grain, éclipse, composants `Process` / `Manifesto` / `Pricing`, `Navbar`, skin éditorial) = **KEEP**.  
On modifie : **copy**, **ordre des sections**, **CTAs**, **contenu `/partners`**, **alignement prix canon**, **séparation des voix B2C/B2B**.

---

## 1. Audit — ce que fait le site aujourd’hui

### 1.1 Carte des pages marketing

| URL | Composition | Rôle actuel |
|-----|-------------|-------------|
| `/[lang]` | `Navbar` → `Hero` → `Manifesto` → `Process` → `Pricing` → `Partnerships` | **Tout-en-un** : émotion + process + forfaits + teaser B2B |
| `/[lang]/process` | `Navbar` → `Process` seul | Répétition section accueil |
| `/[lang]/manifesto` | `Navbar` → `Manifesto` seul | Page marketing manifeste |
| `/[lang]/partners` | `Navbar` → titre + sous-titre + `PartnersLeadForm` | Lead B2B **sans** pitch business |
| `/[lang]/contact` | Formulaire famille | Support pré-achat |
| `/[lang]/partenaires` | redirect → `/partners` | Alias FR |

**Wizard / Studio :** entrée via `Navbar` → « Connexion » → `/studio/connexion` uniquement.  
**Pas de page marketing dédiée B2C** au-delà de `/`.

### 1.2 Accueil `/fr` — section par section

| Section | Composant | Copy / comportement actuel | Verdict |
|---------|-----------|----------------------------|---------|
| **Hero** | `Hero.tsx` | Vidéo, wordmark animé, pitch rotatif (hooks aléatoires). Nav basse : ancres `#manifesto`, `#process`, `#pricing`, `#partners`, `/contact`. **Pas de CTA « Créer un hommage »** (clé `hero.primaryCta` existe en JSON mais **non branchée**). | 🟡 Visuel fort · **conversion absente** |
| **Manifesto** | `Manifesto.tsx` | « Sanctuaire visuel », dignité, cinéma. Bon ton émotionnel. | 🟢 Garder · ajuster 1 phrase « zéro montage » si besoin |
| **Process** | `Process.tsx` | **3 étapes** : Déposer → Composer → Recevoir. Proche du funnel cible. Pas de Cercle / Sanctuaire / proches. | 🟡 Bon squelette · **enrichir copy** (Coffre, Cercle, zéro montage) |
| **Pricing** | `Pricing.tsx` | **3 cartes cliquables** (effet UV) · CTA « SÉLECTIONNER » **sans lien** vers Studio. **Prix marketing ≠ canon produit** (voir §1.4). | 🔴 Décrochage produit + pas de conversion |
| **Partnerships** | `Partnerships.tsx` | Teaser pro · renvoie vers `/partners` (**href sans locale** → bug `/partners` au lieu de `/fr/partners`). Copy mélange B2B et renvoi aux forfaits famille (« section offres ci-dessus »). | 🔴 Voix B2B contaminée par B2C |

### 1.3 Navbar (`Navbar.tsx`)

- Liens : Accueil · Manifeste · Processus · Forfaits · Partenaires · Contact  
- Action unique : **Connexion** → Studio  
- **Manque :** CTA primaire « Créer un hommage » · pas de « Espace partenaire » distinct en header

### 1.4 Écart critique — grille prix marketing vs canon

| | Marketing (`dictionaries/*.json` → `pricing`) | Produit (`pricingConfig.ts` / FREEMIUM §2) |
|---|-----------------------------------------------|---------------------------------------------|
| Tier 1 | Essentiel · **49 $** | **Souvenir** · 0 $ (B2B2C cadeau) / B2C paywall min **Héritage 179 $** |
| Tier 2 | Hommage · **99 $** (recommandé) | **Héritage (signature)** · **179 $** |
| Tier 3 | Héritage · **199 $** | **Éternité (heritage)** · **349 $** (+ Légendaire 499 $ B2C) |

**Risque :** promesse marketing fausse avant même le wizard · conflit avec [`B2C_GO_TO_MARKET.md`](../B2C_GO_TO_MARKET.md) (« pas de grille en hero », Héritage 179 $ entrée B2C).

### 1.5 Page `/partners`

- Titre + 1 paragraphe générique + formulaire (`POST /api/partners/lead`)  
- **Absent :** geste cadeau · modernité image · zéro friction · revenus teaser · « ce qu’on montre en démo 30 min »  
- **Absent visuellement :** sections structurées (composant réutilisable possible)

### 1.6 Points forts à préserver (ne pas casser)

- Identité cinéma : Hero vidéo, grain, éclipse, `CinematicWordReveal`, halos violet  
- Process **3 chapitres** (aligné pitch « trois étapes » hero) — **ne pas passer à 7 étapes** sur le marketing  
- Formulaire partenaire fonctionnel + rate limit  
- i18n FR/EN via `dictionaries/*.json`  
- Pages `/process` et `/manifesto` isolées (SEO / partage de lien)  
- Voix manifeste (« sanctuaire », dignité) — continuité avec [`COPY.md`](../COPY.md)

### 1.7 Synthèse écarts vs stratégie cible

| Stratégie | État actuel |
|-----------|-------------|
| Deux portes B2C / B2B | Une page longue + `/partners` minimal |
| B2C : émotion + **zéro montage** | Émotion oui · douleur PowerPoint absente |
| B2C : pas de grille agressive en hero | Grille **milieu de page** avant teaser B2B |
| B2C : CTA « Commencer un hommage » | CTA **inexistant** sur Hero |
| B2B : directeur bienfaiteur, pas vendeur | Teaser faible · copy partiellement B2C |
| B2B : pas de % / RevShare public | OK (rien n’est affiché) — mais **trop peu** pour convaincre |
| Prix alignés FREEMIUM | **Non alignés** |
| Sanctuaire / Cercle dans le récit | Absents du Process marketing |

---

## 2. Cible — ce qu’on veut (sans refonte)

### 2.1 Architecture « deux portes »

```text
/fr  (famille)
  Hero        → cinéma + zéro montage + CTA Créer un hommage
  Manifesto   → sanctuaire (court)
  Process     → Coffre · Cercle/Sanctuaire · Film (3 temps)
  [optionnel] → bloc Sanctuaire / proches (1 paragraphe)
  Pricing     → bas de page · canon ou « à partir de » · CTA → Studio
  —           → retirer ou minimiser teaser B2B ici (lien header suffit)

/fr/partners  (pro)
  Hero B2B    → geste + modernité
  4–5 blocs   → problème · inversion · comment · revenus teaser · démo
  Formulaire  → Demander une démo (existant)
```

### 2.2 Grille copy (consensus partenaire)

| Zone | Formulations clés |
|------|-------------------|
| B2C hero | Zéro montage · pas de diaporama à 2 h du matin · vous déposez, Odyssey tisse |
| B2C Sanctuaire | Enrichir l’hommage **ensemble** (proches) — pas « élever » |
| B2C paywall (plus tard wizard) | Faire grandir le film · Débloquer le film complet |
| B2B | Vous **offrez** · modernisez votre image · revenus quand la famille **enrichit** l’hommage |

### 2.3 Règles voix (rappel)

Famille : souvenirs, film, chapitre, Coffre, Sanctuaire — pas *timeline / acte / checkout / jetons*.  
B2B public : pas *friction*, *RevShare*, *30 %*, *ledger*.

---

## 3. Plan de modification — 4 phases

Estimation : **copy-heavy · réutilisation composants existants**. Pas de nouveau design system.

---

### Phase 1 — Quick wins (1 session · code + JSON)

**Objectif :** corriger les bugs de conversion et d’alignement sans toucher au layout Hero.

| # | Tâche | Fichiers |
|---|--------|----------|
| 1.1 | Brancher CTA Hero « Créer un hommage » → `appRoutes.studioConnexion(lang)` | `Hero.tsx` · `dictionaries/fr.json` + `en.json` (sous-titre relief si ajouté) |
| 1.2 | Navbar : CTA secondaire visible « Créer un hommage » + garder Connexion | `Navbar.tsx` · `header.*` JSON |
| 1.3 | Fix lien Partnerships : `href={/${lang}/partners}` | `Partnerships.tsx` |
| 1.4 | Pricing : lier cartes / CTA « Commencer » → Studio connexion (ou signup) | `Pricing.tsx` |
| 1.5 | Aligner prix marketing sur canon **ou** copy « À partir de 179 $ » + 3 forfaits Héritage / Éternité / Légendaire (B2C) — **décision CEO** table §1.4 | `dictionaries/*.json` · vérifier pas de duplication dans composant |
| 1.6 | Régénérer catalogue copy | `node scripts/export-copy-catalog.mjs` |

**Done when :** parcours incognito `/fr` → clic CTA → `/studio/connexion` ; prix cohérents avec FREEMIUM ; lien partenaires localisé.

---

### Phase 2 — Copy B2C accueil (1 session · JSON + micro-ajustements)

**Objectif :** intégrer zéro montage + Sanctuaire sans nouveaux composants.

| # | Tâche | Fichiers |
|---|--------|----------|
| 2.1 | Hero pitch : ajouter pool ou ligne fixe « zéro montage » (FR+EN) | `hero.pitch` JSON |
| 2.2 | Process : réécrire 3 steps → **Coffre** (déposer) · **Cercle** (proches / Sanctuaire) · **Film** (recevoir) | `process.*` JSON |
| 2.3 | Process : remplacer « Composer » par langage famille (Odyssey tisse — vous ne montez pas) | idem |
| 2.4 | Manifesto : 1 phrase max sur le soulagement technique (optionnel) | `manifesto.*` JSON |
| 2.5 | Partnerships (section accueil) : **retirer** la référence aux forfaits famille · 1 phrase + lien « Espace partenaire » | `partnerships.*` JSON |
| 2.6 | SEO title/description : inclure « sans montage » si naturel | `seo.*` JSON |

**Option layout (Phase 2b — si 30 min de plus) :** réordonner accueil → Hero · Manifesto · Process · Pricing · **supprimer** `Partnerships` du scroll (garder lien header uniquement).  
Fichier : `app/[lang]/page.tsx` uniquement.

**Done when :** lecture `/fr` = parcours famille pur ; aucune mention revenus / partenaire dans le corps sauf nav.

---

### Phase 3 — Page `/partners` riche (1–2 sessions)

**Objectif :** page B2B autonome qui convertit en démo — **sans** nouvelle route.

| # | Tâche | Fichiers |
|---|--------|----------|
| 3.1 | Nouveau namespace JSON `partnersPage.sections[]` (hero, problem, gift, simplicity, modernity, revenueTeaser, demoPreview) | `dictionaries/fr.json` + `en.json` |
| 3.2 | Composant `PartnersPitchSections.tsx` (réutilise `editorialSkin`, `CinematicWordReveal`, même DA que Process) | `src/components/PartnersPitchSections.tsx` |
| 3.3 | Intégrer sections **au-dessus** du formulaire existant | `app/[lang]/partners/page.tsx` |
| 3.4 | CTA répété bas de page → ancre `#partners-form` | idem |
| 3.5 | Frame Figma `V2-partners-teaser` (optionnel DA) | `DA_SCREENS.md` (doc phase 4) |

**Contenu sections (ordre fixe) :**

1. Hero — *Offrez un Sanctuaire. Modernisez l’expérience de vos familles.*  
2. Problème — outils coûteux · vente au mauvais moment · lien qui meurt  
3. Le geste — invitation un clic · bienfaiteur pas vendeur  
4. Simplicité — zéro licence · zéro stock · pas de formation lourde  
5. Modernité — image 2026 aux yeux des jeunes générations  
6. Revenus teaser — *quand la famille enrichit l’hommage, votre maison participe* — **sans chiffre**  
7. Démo — Salon brandé · Sanctuaire mobile · Commissions (aperçu) · 30 min  
8. Formulaire (existant)

**Done when :** `/fr/partners` compréhensible sans lire `/fr` ; formulaire toujours fonctionnel.

---

### Phase 4 — Documentation & DA (session séparée · après Phases 1–3)

**Objectif :** canon à jour · frames Figma · pas de 2ᵉ source de vérité prix.

| Doc | Action |
|-----|--------|
| [`../B2C_GO_TO_MARKET.md`](../B2C_GO_TO_MARKET.md) | Remplir §6 constat · valider funnel landing |
| [`../DA_SCREENS.md`](../DA_SCREENS.md) | Frames `home-cta` · `partners-teaser` · ajuster V1-01 / V1-05 |
| [`../COPY.md`](../COPY.md) | Règles vocabulaire marketing (enrichir / débloquer / offrir) |
| [`../SANCTUARY_STRATEGY.md`](../SANCTUARY_STRATEGY.md) | §1 pointer vers ce plan pour surface web |
| [`../README.md`](../README.md) | Ligne carte design |
| `COPY_CATALOG.md` | Régénéré (rituel commit) |

**Hors scope V1 marketing :** refonte Hero layout · nouvelle page `/fr/da` · labs craft publics · NDA · contrat en ligne.

---

## 4. Inventaire fichiers (référence unique)

| Fichier | Phase | Nature du changement |
|---------|-------|----------------------|
| `app/[lang]/page.tsx` | 2b | Ordre sections / retirer Partnerships |
| `app/[lang]/partners/page.tsx` | 3 | Sections pitch |
| `src/components/Hero.tsx` | 1 | CTA Studio |
| `src/components/Navbar.tsx` | 1 | Dual CTA |
| `src/components/Pricing.tsx` | 1 | Link CTA + maybe tier keys |
| `src/components/Partnerships.tsx` | 1–2 | Fix href · copy via JSON |
| `src/components/PartnersPitchSections.tsx` | 3 | **Nouveau** |
| `dictionaries/fr.json` | 1–3 | Copy marketing |
| `dictionaries/en.json` | 1–3 | idem EN |
| `docs/COPY_CATALOG.md` | 1–3 | Généré |
| `docs/design/MARKETING_SITE_REFRESH_PLAN.md` | — | Ce fichier (vivant → cocher phases) |

**Ne pas modifier (sauf bug) :** `Manifesto.tsx`, `Process.tsx` structure, `PartnersLeadForm`, `pricingConfig.ts`, wizard, auth.

---

## 5. Décisions CEO requises (avant Phase 1.5)

| # | Question | Options |
|---|----------|---------|
| D1 | Grille pricing sur `/fr` | **A)** 3 forfaits canon B2C (179 / 349 / 499) · **B)** « À partir de 179 $ » + 1 carte + lien process · **C)** Retirer Pricing de l’accueil (lien discret) |
| D2 | Teaser B2B sur accueil | **A)** Retirer section `Partnerships` · **B)** Garder 1 ligne + lien header |
| D3 | CTA Navbar | **A)** « Créer un hommage » primaire + « Connexion » · **B)** « Créer » + « Partenaires » séparés |
| D4 | `/process` standalone | **A)** Garder · **B)** Redirect → `/#process` |

Recommandation : **D1-C ou D1-B** (canon B2C §4.2 « voix film, pas grille ») · **D2-A** · **D3-A** · **D4-A**.

---

## 6. Checklist exécution

### Phase 1
- [ ] CTA Hero → Studio (+ copy « brouillon gratuit » si D1-C)
- [ ] CTA Navbar
- [ ] Fix `/fr/partners` link
- [ ] **D1 tranché** : retirer Pricing accueil (D1-C) **ou** aligner prix canon (D1-B) — pas 49/99/199
- [ ] COPY_CATALOG régénéré
- [ ] Test incognito FR + EN
- [ ] Lancer audit **B1** wizard (hors marketing) → noter dans B2C §6

### Phase 2
- [ ] Copy zéro montage + Process 3 temps
- [ ] Partnerships sans mélange B2C
- [ ] (Option) Retirer Partnerships du scroll accueil

### Phase 3
- [ ] Sections `/partners`
- [ ] FR + EN
- [ ] Test formulaire lead

### Phase 4
- [ ] Docs canon mises à jour
- [ ] Frames DA notées
- [ ] §6 B2C_GO_TO_MARKET rempli

---

## 7. Prochaine étape immédiate

1. **Trancher D1–D4** (5 min CEO) — **D1 : privilégier C ou B** (canon B2C).  
2. **Exécuter Phase 1** (quick wins conversion + prix).  
3. **Session copy Phase 2** (JSON seul — peut être fait par toi + partenaire sans dev).  
4. **Phase 3** quand le texte B2B est validé oral.  
5. **Phase 4 docs** + **piste B wizard** (B1–B5) dans le même sprint ou juste après Phase 1.

---

## 8. Croisement canon B2C — [`B2C_GO_TO_MARKET.md`](../B2C_GO_TO_MARKET.md)

Le plan marketing **s’appuie** sur ce playbook. Voici le mapping item par item.

### 8.1 Phrase & positionnement (§0)

| Note B2C | Pris en compte dans le plan ? |
|----------|-------------------------------|
| B2C = marge + preuve sociale, pas volume salon | ✅ `/partners` séparé · pas de RevShare sur `/fr` |
| Familles **sans** invitation salon (≠ concurrent directeur) | ✅ Pas de mention « cadeau salon » sur landing B2C |
| « Film qu’on ose envoyer à une tante » avant d’acheter des familles | ⚠️ **Hors scope landing** — dépend master Creatomate (§5 B2C) · noter en Phase 4 |

### 8.2 Bloc B session (§1) — checklist produit + landing

| Item B2C | Scope | Plan |
|----------|-------|------|
| **B1** Parcours incognito `/fr` → wizard sans invitation | **Wizard** (pas que marketing) | Phase 4 → remplir §6 B2C_GO_TO_MARKET · audit séparé post-Phase 1 |
| **B2** Landing : 1 CTA « commencer un hommage », **pas 3 cartes forfait en hero** | **Landing** | ✅ Phase 1 CTA Hero · **D1-C** = retirer `<Pricing>` du scroll ou lien `#pricing` discret seulement |
| **B3** Checkout B2C : plancher Héritage, pas Souvenir 0 $, Légendaire = ancre | **Wizard / `channelProfile`** | ⚠️ Code déjà là (`direct` → `signature` 179 $, `legendary` allowed, `freeExport: false`) · **vérifier à l’écran** en B1, pas dans Phase 1 marketing |
| **B4** Cercle + Sanctuaire avant Finaliser | **Wizard copy** | ✅ Phase 2 Process marketing (teaser) · impl wizard = ticket à part si copy manquante |
| **B5** Preview filigranée B2C | **Wizard** | ⚠️ `previewMode: watermarked` dans `channelProfile.ts` · valider en B1 |
| **B6** Remplir §6 constat | **Doc** | ✅ Phase 4 checklist |

### 8.3 Règles stratégie (§4.1–4.2)

| Règle B2C | Écart site actuel | Action plan |
|-----------|-------------------|-------------|
| Entrée = **brouillon gratuit** | CTA absent · message pas explicite | Phase 1 : CTA « Créer un hommage » + copy « brouillon gratuit » sous CTA (JSON) |
| Paywall min **Héritage 179 $** | Grille 49/99/199 $ affichée | **D1-C/B** — ne pas vendre 49 $ sur `/fr` |
| **Pas Souvenir 0 $** en B2C | Risque si copy salon fuit sur `/fr` | Phase 2 : purger toute mention cadeau salon sur accueil |
| Forfaits UI = Héritage · Éternité · Légendaire | Noms Essentiel / Hommage / Héritage | Si grille conservée (D1-A) : renommer + prix canon · **sinon D1-C** |
| Légendaire = ancre, pas CTA #1 | Carte « recommandé » sur tier milieu 99 $ | Aligner avec `anchorPackage: heritage` (Éternité vedette en wizard, pas Légendaire hero) |
| Funnel : landing **sans grille** | Pricing milieu page avant B2B | **Retirer ou minimiser** section Pricing (D1-C) |
| Funnel : photo + prénom **avant** prix | Marketing OK si pas de grille agressive | CTA → Studio suffit |
| Coffre + Cercle + Sanctuaire | Process ne nomme pas Cercle/Sanctuaire | Phase 2 copy Process |
| Ads cold = **non** année 1 | N/A landing | Rappel : pas de pixel / campagne dans ce refresh |

### 8.4 Acquisition & séquence (§4.3–4.5)

| Note | Impact landing |
|------|----------------|
| Zéro ads · SEO plus tard | Pas de pages SEO supplémentaires dans ce plan |
| Share Sanctuaire + `/watch` = acquisition organique | Phase 2 : 1 phrase Process sur proches · pas de page `/watch` marketing V1 |
| J+90 : KPI ≥2 proches invités avant checkout | Wizard + analytics — hors refresh marketing |
| Conversion B2C ~12–20 % / 100 comptes | Ne pas optimiser landing pour volume — optimiser **clarté + CTA** |

### 8.5 Code canal (référence — pas à recoder)

`resolveChannelProfile` · canal **direct** :

- `grantedPackage` / `intendedPackage` = **signature** (Héritage **179 $**)
- `allowedPackages` = signature, heritage, **legendary**
- `anchorPackage` = **heritage** (Éternité = mis en avant)
- `freeExport: false` · `previewMode: watermarked`

Le site marketing doit **raconter** ce funnel, pas le contredire.

### 8.6 Synthèse — deux pistes de travail

| Piste | Fichiers | Quand |
|-------|----------|-------|
| **A — Landing B2C** (ce plan Phases 1–2) | `Hero`, `Navbar`, `page.tsx`, JSON marketing | En premier |
| **B — Parcours wizard B2C** (playbook §1 Bloc B) | `TributeWizard`, checkout, copy wizard | Après Phase 1 · remplir §6 B2C_GO_TO_MARKET |

**Décision D1 révisée (canon B2C) :** préférer **D1-C** (retirer `<Pricing>` de `app/[lang]/page.tsx`, lien « Forfaits » navbar → ancre ou page dédiée plus tard) ou **D1-B** (une ligne « À partir de 179 $ · brouillon gratuit » sans 3 cartes). **Éviter D1-A** sur l’accueil — contredit §4.2 « pas grille » sur la landing.

---

*Brainstorm stratégique : conversation août 2026 (deux portes, partenaire, Sanctuaire). Audit code : `app/[lang]/page.tsx`, composants `src/components/{Hero,Process,Pricing,Partnerships,Navbar}.tsx`, `dictionaries/fr.json`. Canon B2C : [`B2C_GO_TO_MARKET.md`](../B2C_GO_TO_MARKET.md).*
