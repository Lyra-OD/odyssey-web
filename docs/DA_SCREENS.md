# Odyssey — Écrans DA (Vague 1)

**Type :** playbook · **Vérité pour :** frames Figma ↔ URLs, contrat DA / code.  
**Dernière MAJ :** 19 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 19 août 2026 — Session Figma + B2C : ordre du jour [`B2C_GO_TO_MARKET.md`](B2C_GO_TO_MARKET.md) §1.
- 19 août 2026 — Réf. Paul `Odysee Rev-2.pdf` : mapping 8→7 étapes, layout seulement.
- 19 août 2026 — Vague 1 : 18 frames famille + variantes. Figma = wire ; copy = catalogue.

Méthode validée : **un fichier Figma**, **une frame = une URL** (ou une étape du wizard sur la même URL). Wire gris + typo + **copy du catalogue**. Le DA itère dans Figma ; le code reprend la frame **signée**. La copy ne se réécrit pas dans Figma comme vérité.

Routes : [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) · `src/lib/appRoutes.ts`.  
Wizard 7 étapes : [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md).  
Étape 5 : [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md).  
Tokens : [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).  
Copy : [`COPY.md`](COPY.md) · vue FR/EN [`COPY_CATALOG.md`](COPY_CATALOG.md).

Pas de lab HTML `docs/da/`. Pas de squellette CSS de tout le site avant Figma. Pas de recette DA sur la prod live (Storage gelé). Lab `/fr/da` = **Vague B**, plus tard.

---

## 1. Contrat

| Qui | Fait | Ne fait pas |
|-----|------|-------------|
| **DA** | Frames nommées ci-dessous, 1440 + 390, composants réutilisés, copy collée depuis le catalogue (clé visible en note) | Inventer une 8ᵉ étape wizard · changer un prix · réécrire la voix |
| **Produit / code** | Implémenter le delta frame signée → Next | Recoder le wire « au feeling » sans frame |
| **Copy** | JSON `dictionaries/fr.json` + `en.json` | Texte figé dans Figma comme source |

**Delta Figma → code :** la frame signée (commentaire `OK DA YYYY-MM-DD` sur la frame) est le brief. Un écart copy = ticket JSON, pas un calque Figma orphelin.

**Composants Figma à créer une fois (Vague 1) :** Header marketing · Footer · Bouton primaire / secondaire · Champ · Stepper 7 · Carte forfait · Modale Soft Cap (wire) · QR Coffre · Zone dépôt photos.

---

## 2. Fichier Figma

Pages (pas de pages « Archive » dans Vague 1) :

1. `00 — Couverture` — lien ce doc + [`COPY_CATALOG.md`](COPY_CATALOG.md)
2. `01 — Marketing`
3. `02 — Auth famille`
4. `03 — Studio (wizard)`
5. `04 — Sanctuaire & Scanner`
6. `05 — Composants`
7. `Ref — Paul Rev-2` *(optionnel)* — PDF wire importé, **verrouillé**, lecture seule · voir §8

**Nom de frame** = id ci-dessous. **Sous-titre / description Figma** = URL. Langue de travail des wires : **FR** (`/fr/…`). EN = même structure, pas une 2ᵉ Vague.

Variantes = frames filles `… / empty`, `… / filled`, `… / error` (pas des pages séparées).

---

## 3. Vague 1 — famille (priorité)

18 frames. Coffre, Film de sa vie, Checkout, Sanctuaire, Scanner = **cœur**.

### Marketing

| Id | Frame Figma | URL | Copy (namespace) | Notes |
|----|-------------|-----|------------------|-------|
| V1-01 | `home` | `/fr` | `hero` `header` `pricing` | Landing. Voix film / souvenirs. |
| V1-02 | `process` | `/fr/process` | `process` | Parcours, pas jargon wizard. |
| V1-03 | `manifesto` | `/fr/manifesto` | `manifesto` | Page marketing ≠ bible `Manifesto-V10.4.md`. |
| V1-04 | `contact` | `/fr/contact` | `contact` | |
| V1-05 | `partners` | `/fr/partners` | `partnersPage` | Lead B2B. Alias `/fr/partenaires` = **pas** une 2ᵉ frame. |

### Auth & invitation famille

| Id | Frame Figma | URL | Copy | Notes |
|----|-------------|-----|------|-------|
| V1-06 | `studio-connexion` | `/fr/studio/connexion` | `auth` `login` | Inscription **autorisée**. Pas Salon / HQ. |
| V1-07 | `invite-accept` | `/fr/invite/accept?token=` | `auth` | Magic link B2B2C → Studio. |
| V1-08 | `tribute-welcome` | `/fr/tribute/welcome?projectId=` | `tributeWizard` | Post-invitation, wizard seedé. |

`/fr/login` et `/login` = redirects → **pas** de frames.

### Studio — une URL, 7 frames

URL unique : `/fr/studio`. Stepper code : Essentiels · Cercle · Coffre-fort · Musique · Le film · Aperçu · Finaliser.  
Extensions = **dans** checkout (étape 7), pas une 8ᵉ frame. Scanner = **dans** Coffre, pas une 8ᵉ étape.

| Id | Frame Figma | Étape | Copy (repères) | Priorité DA |
|----|-------------|-------|----------------|-------------|
| V1-09 | `studio-01-essentiels` | 1 | `tributeWizard` stepper + essentiels | Normale |
| V1-10 | `studio-02-cercle` | 2 | invitations / Co-Créateur | Normale |
| V1-11 | `studio-03-coffre` | 3 | Coffre, QR Scanner | **Cœur** |
| V1-12 | `studio-04-musique` | 4 | chapitres / chansons | Haute (voix, pas « acte ») |
| V1-13 | `studio-05-film` | 5 | Livre Ouvert — « Le film de sa vie » | **Cœur** |
| V1-14 | `studio-06-apercu` | 6 | preview | Haute |
| V1-15 | `studio-07-finaliser` | 7 | forfaits + Extensions + Stripe | **Cœur** |

Variantes **obligatoires** :

| Frame | Variantes |
|-------|-----------|
| V1-11 Coffre | `empty` · `filled` · `scan-qr` (desktop, QR compagnon visible) |
| V1-13 Film | `empty` · `chapters` (Livre Ouvert) |
| V1-15 Finaliser | `unpaid` · `soft-cap` (modale) · `paid` |

Desktop **et** mobile (390) au moins pour V1-11, V1-13, V1-15, V1-16, V1-17.

### Sanctuaire, lecture, Scanner

| Id | Frame Figma | URL | Copy | Notes |
|----|-------------|-----|------|-------|
| V1-16 | `contribute` | `/fr/contribute/{token}` | Sanctuaire invité | Dépôt souvenirs, pas wizard. Variantes `empty` · `thanks`. |
| V1-17 | `scan` | `/fr/scan/{token}` | `scan` | Mobile-first 390. Variantes `landing` · `camera` · `done`. TTL 2 h — pas de login. |
| V1-18 | `watch` | `/fr/watch/{videoId}` | lecture film | Destination famille après rendu. |

**Hors Vague 1 (même si famille) :** `/fr/collab/{token}` (éditeur Co-Créateur) — Vague 1b si le DA a du slack, sinon Vague 2.

---

## 4. Vague 2 — plus tard (Salon / HQ)

Ne pas ouvrir ces frames tant que Vague 1 n’est pas signée.

| Id | Frame | URL |
|----|-------|-----|
| V2-01 | `salon-connexion` | `/fr/salon/connexion` |
| V2-02 | `salon` | `/fr/salon` |
| V2-03 | `salon-mes-performances` | `/fr/salon/mes-performances` |
| V2-04 | `salon-commissions` | `/fr/salon/commissions` |
| V2-05 | `hq-connexion` | `/fr/hq/connexion` |
| V2-06 | `hq` | `/fr/hq` |
| V2-07 | `hq-salon` | `/fr/hq/salons/{tenantId}` |

`/fr/salon/facturation` = redirect → pas de frame.

---

## 5. Vague 3 — labs (jamais démo VP)

`/fr/contribute/test-eclipse*` · `test-wormhole` — craft interne. Pas dans le fichier Vague 1.

---

## 6. Ordre de travail DA (recommandé)

1. Page `05 — Composants` (boutons, champs, stepper).
2. V1-01 home (voix + Halo).
3. V1-06 connexion Studio.
4. **Cœur :** V1-11 Coffre → V1-13 Film → V1-15 Finaliser.
5. V1-16 contribute + V1-17 scan (mobile).
6. Reste wizard (09, 10, 12, 14) + marketing (02–05) + watch (18).

Code : on n’implémente **que** les frames signées, dans cet ordre-là.

Session Figma + audit B2C (même jour) : [`B2C_GO_TO_MARKET.md`](B2C_GO_TO_MARKET.md) §1.

---

## 7. Check DA avant « OK »

- [ ] Nom de frame = id du tableau
- [ ] Description = URL exacte
- [ ] Copy collée = catalogue (clé en commentaire Figma, ex. `tributeWizard.stepperVault`)
- [ ] Pas de *timeline / acte / banque / dropzone / Checkout / jetons* côté famille
- [ ] 7 étapes, Scanner dans le Coffre, Extensions dans Finaliser
- [ ] 1440 + 390 sur les 5 frames cœur

---

## 8. Référence Paul Rev-2 (PDF)

Wire externe **« Odysee Rev-2 »** (9 pages, EN, stepper « STEP X OF 8 »). Bonne **inspiration layout** (titres, stepper haut, CTA bas, cartes, compteurs). **Pas** la spec produit Odyssey — le code et le catalogue ont divergé.

### Usage Figma

1. Importer le PDF sur la page `Ref — Paul Rev-2` (images par page ou PDF collé).
2. **Verrouiller** le calque ref — ne pas designer dessus.
3. À côté, créer les frames **§3** avec les **noms canon** et la **copy FR** du catalogue.
4. Reprendre uniquement : hiérarchie visuelle, spacing, densité — pas les textes ni le flow 8 étapes.

### Mapping PDF → frames canon

| PDF Paul | Titre Paul (EN) | Frame Odyssey | Écart produit |
|----------|-----------------|---------------|---------------|
| p.1 | Step 1 — Begin Here | `studio-01-essentiels` | Copy FR catalogue, pas « Begin Here » |
| p.2 | Step 2 — Import Media | `studio-02-cercle` | **Pas** Facebook/Instagram — invitations / Co-Créateur |
| p.3 | Step 3 — The Vault | `studio-03-coffre` | « Vault » → **Coffre** · ajouter variante `scan-qr` |
| p.4 | Step 4 — Edit Table | `studio-05-film` | Timeline/actes Paul → **Livre Ouvert** · ordre **après** musique |
| p.5 | Step 5 — Sound Signature | `studio-04-musique` | Ordre inversé vs Paul · voix chapitre/chanson, pas « act » |
| p.6 | Step 6 — Memory Extensions | `studio-07-finaliser` *(section)* | **Pas** une étape séparée — Extensions **dans** Finaliser |
| p.7 | Step 7 — Preview | `studio-06-apercu` | |
| p.8 | Step 8 — Review & Pay | `studio-07-finaliser` *(section)* | Paiement + forfaits même frame · Soft Cap variante `soft-cap` |
| — | *(absent)* | `contribute` · `scan` · `watch` · marketing · auth | Hors scope du PDF |

**Stepper Figma :** toujours **7** positions (Essentiels → Finaliser), jamais « STEP X OF 8 ».

### Ne pas recopier du PDF

| Sujet | PDF Paul | Vérité Odyssey |
|-------|----------|----------------|
| Étapes | 8 | **7** — [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) |
| Langue wires | EN | **FR** — [`COPY_CATALOG.md`](COPY_CATALOG.md) |
| Voix | Vault, timeline, act, checkout… | Coffre, film, chapitre, souvenirs — [`COPY.md`](COPY.md) |
| Prix / packs | $149 Legacy, Heritage Pack $266… | [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) §2 — ne pas figer le PDF |
| Import réseaux | Étape 2 entière | **Non livré** — Cercle à la place |
| Scanner mobile | Absent | `studio-03-coffre / scan-qr` + frame `scan` |

### Brief une phrase (Paul)

> Rev-2 = moodboard layout. Spec = ce doc + catalogue FR. Une frame = une URL, 7 étapes wizard, commentaire `OK DA YYYY-MM-DD` quand prêt à coder.

