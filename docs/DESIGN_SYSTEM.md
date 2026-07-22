# Odyssey — Design System

**Dernière mise à jour : juillet 2026**

Guide visuel et produit pour l’ensemble du site Next.js (Studio B2C, Salon B2B2C, pages marketing). Complète [`CONVENTIONS.md`](CONVENTIONS.md) et [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md).

---

## 1. Vision

Odyssey est une plateforme **« quiet luxury »** : hommages vidéo, ton respectueux, esthétique cinématographique. Deux expériences partagent la même base visuelle :

| Surface | Audience | Rôle |
|---------|----------|------|
| **Studio** | Familles (B2C) | Wizard hommage, checkout |
| **Salon** | Partenaires (B2B2C) | Invitations, commissions, co-branding |
| **Marketing** | Public | Storytelling, conversion vers Studio |

Le Salon est un **gant blanc** : la marque partenaire est héroïne ; Odyssey est la signature technique discrète.

---

## 2. Palette de couleurs

### 2.1 Primaire — Violet Odyssey (UV)

Couleur de marque, énergie, action, glow.

| Token | Valeur | Usage |
|-------|--------|--------|
| `uv-500` | `#8B5CF6` | Accents, focus, halo |
| `uv-600` | `#7C3AED` | Glow cartes forfaits |
| `uv-glow` | `rgba(192, 167, 255, 0.62)` | Halos connexion / salon |

**Règle :** le violet ne doit pas concurrencer le logo partenaire sur le Salon. Réserver aux CTA marketing, halos d’ambiance, cartes « Héritage ».

### 2.1bis Secondaire interactif Studio — Teal (login / wizard / Sanctuaire)

Couleur d’**interaction** (sélection, focus, états actifs, respiration). Alignée login sign-up + wizard (`teal-400` / cyan doux), **distincte** du cyan Salon fluo.

| Token | Valeur | Usage |
|-------|--------|--------|
| `teal-400` | Tailwind / `#2DD4BF` famille | Bordures sélection, focus inputs, glow léger |
| `teal-300` | — | Labels « sélectionné », accents hover |
| Respiration | `.connexion-submit-breathe` / `.sanctuary-halo-breathe` | CTA + halo d’ambiance |

**Règle :** tout contrôle **sélectionnable ou focusable** en Studio/Sanctuaire privilégie le teal. Le violet reste l’énergie de marque en fond ; le champagne reste tertiaire mémoriel (≤10 %).

### 2.2 Secondaire — Neutres froids

Fond sombre, typographie, structure.

| Token | Valeur | Usage |
|-------|--------|--------|
| `bg-deep` | `#020202` | Fond connexion + salon (identique) |
| `bg-black` | `#000000` | Fusion logos partenaires à carré noir intégré |
| `text-primary` | `white / 90–100 %` | Titres, actions principales |
| `text-primary-connexion` | `#FFFFFF` pur + glow | **Uniquement** wordmark `OdysseyConnexionMark` |
| `text-secondary-connexion` | `zinc-200` – `zinc-300` | Titres + inputs pages login (blanc cassé) |
| `text-secondary` | `white / 38–55 %` | Sous-titres, labels |
| `text-muted` | `zinc-400` – `zinc-500` | Kickers, métadonnées |
| `border-subtle` | `white / 6–10 %` | Cartes glass, séparateurs |

### 2.3 Tertiaire Salon — Cyan action (Quiet Luxury)

Accent **chirurgical** réservé au Salon partenaire (invitations, commissions). **Ne pas utiliser** sur le marketing B2C ni le co-branding header.

| Token | Valeur | Usage |
|-------|--------|--------|
| `--salon-cyan` | `#00E8F0` | Ligne carte active, chiffres accent, soldes commissions, CTA invitation |
| `--salon-cyan-dim` | `rgba(0, 232, 240, 0.4)` | Badges recommandé |

**Règle d’or tertiaire Salon :** jamais sur le logo partenaire ni « Propulsé par » ; maximum **5–10 %** de la surface ; halo mauve **uniquement** sur Héritage au repos (Option A) ; à la sélection : ligne cyan + scale (Camera Dolly).

**Studio / Marketing B2C :** conserve le violet UV (`pricingTierCardSkin.ts`) — pas de cyan fluo sur `Pricing.tsx`.

### 2.4 Champagne memorial (Studio / éditorial — optionnel)

Pour éviter un site 100 % violet + noir, une **couleur tertiaire chaude** apporte chaleur humaine (hommage, mémoire, premium funéraire) sans entrer en conflit avec le vert partenaire (ex. Urgel Bourgie).

| Token | Valeur | Usage recommandé |
|-------|--------|-------------------|
| `memorial-champagne` | `#C4B5A0` | Lignes d’accent éditoriales, états « succès discret », hover secondaire |
| `memorial-champagne-dim` | `#C4B5A0` à **35 % opacité** | Filets, séparateurs alternatifs au violet |

**Alternative** (plus nature) : `sage-memorial` `#7A9E87` — validation, confirmation invitation, badges « actif ».

**Règle d’or tertiaire :** jamais sur le co-branding header ; maximum **5–10 %** de la surface écran ; jamais en compétition avec le violet des forfaits marketing.

### 2.5 Couleur partenaire (contextuelle)

Chaque tenant peut avoir une accent couleur dans son logo (ex. vert `#2D6A4F` Urgel Bourgie). **Ne pas globaliser** — rester dans le cadre du logo PNG, pas dans l’UI Odyssey globale.

---

## 3. Typographie & hiérarchie

### 3.1 Familles

| Rôle | Classe / font | Usage |
|------|---------------|--------|
| Marque | `font-brand` | Odyssey, ESPACE PARTENAIRES, kickers caps |
| Éditorial | `font-editorial` | Titres invitation, storytelling |
| Interface | `font-label` | Labels formulaires, onglets, soldes |

### 3.2 Échelle hiérarchique — Salon (dashboard)

Du plus important au plus discret :

```
Niveau 0 — Header (persistant)
  └─ Logo partenaire (même PNG que connexion, variant dashboard)
  └─ Propulsé par Odyssey (8–11 px, white/26–36 %, droite sous logo)
  └─ Sélecteur tenant (droite)

Niveau 1 — Bandeau workspace (PartnerSalonPageIntro)
  └─ « ESPACE PARTENAIRES » (11 px caps, white/55 %)
  └─ Sous-titre contexte (14 px, white/38 %)
  └─ Jetons compacts (36–48 px, secondaire — pas 72 px)

Niveau 2 — Action principale (InvitationComposer)
  └─ Kicker INVITATION (10 px, zinc-500)
  └─ Titre serif (32–40 px) — héros de la page
  └─ Champ courriel glass (centré, coins `rounded-sm`)
  └─ Cartes forfaits — skin `salonTierCardSkin.ts` (ligne cyan + dolly ; halo mauve Héritage au repos)

Niveau 3 — Signature Odyssey (header uniquement sur salon)
  └─ Jamais en lockup éclipse centre page
```

### 3.3 Connexion Studio & Salon (fallback Odyssey)

```
OdysseyConnexionMark (blanc pur lumineux, Montserrat espacé)
  → Titre contexte (zinc-200 — « Accéder au studio », « Espace partenaires »)
  → Sous-titre (white/45 %)
  → Carte formulaire glass
  → CTA cyan (contour + respiration)
  → « Retour au site » (Acte V — dernier reveal)
```

**Signature Halo-Éclipse** en fond : voir **§4.1**. Animations cinéma sur connexion (`salon-cinema-*`, `odyssey-connexion-mark-*` dans `globals.css`).

### 3.4 Connexion Salon (avec logo partenaire)

```
Logo partenaire (cinema, grand)
  → Propulsé par Odyssey (discret, aligné droite)
  → ESPACE PARTENAIRES (zinc-200, caps)
  → Sous-titre (white/45 %)
  → Carte formulaire glass
```

Même signature **Halo-Éclipse** (§4.1) derrière le co-branding.

---

## 4. Atmosphère & fond

Composant : `SalonAtmosphere` (`src/components/partner/SalonAtmosphere.tsx`).

| Variant | Opacité halo | Contexte |
|---------|--------------|----------|
| `connexion` | 100 % | Page login partenaire |
| `dashboard` | ~38 % | Salon après auth |

Gradient partagé (`SALON_HALO_GRADIENT`) — ellipse violet/magenta, blur 200–240 px, centré haut de page.

**Studio connexion** : même halos via `LoginForm` (sign-in violet, sign-up cyan).

### 4.1 Signature **Halo-Éclipse** (connexion Studio + Salon)

> **Phrase produit :** *Une éclipse vivante dont la couleur reflète l’état du parcours.*

Signature visuelle Odyssey sur **toutes** les pages de connexion (`LoginForm` partagé). À préserver sur tout nouvel écran auth ou variante de login.

#### Principe — deux registres, un seul phénomène

| Couche | Rôle | Variable ? |
|--------|------|------------|
| **Éclipse** (`eclipse_login.mp4`) | Corona organique, respiration, profondeur céleste | **Non** — constante, neutre (blanc/gris) |
| **Halo** (gradients radiaux CSS) | Atmosphère, émotion, **état du parcours** | **Oui** — couleur selon le contexte |

L’éclipse est le **corps** ; le halo est l’**âme**. En `mix-blend-screen` à faible opacité (~11 %), la corona **prolonge** le halo coloré — ce n’est pas un fond décoratif indépendant.

#### Empilement (z-index bas → haut)

```
1. Fond #020202
2. Halo coloré (gradient radial, blur 200–240 px)     ← couleur d’état
3. Éclipse plein écran (object-cover, screen-blend)   ← toujours identique
4. Contenu (logo, titre, formulaire, CTA)
```

**Règle d’or :** ne jamais teinter l’éclipse selon l’état. Seul le **halo** change. Ne jamais ajouter une 2ᵉ vidéo éclipse derrière le wordmark (cf. `OdysseyConnexionMark`).

#### États canoniques (couleur du halo)

| État | Token code | Couleur | Déclencheur |
|------|------------|---------|-------------|
| **Connexion** | `HALO_SIGN_IN` | Violet / UV (`#8B5CF6`, `#C0A7FF`) | Onglet Connexion, login salon sans inscription |
| **Inscription** | `HALO_SIGN_UP` | Cyan (`#22D3EE`, `#67E8F9`) | Onglet Inscription (Studio) |
| **Succès** | `HALO_CONFIRMATION` | Vert émeraude | Email de vérification envoyé |
| **Erreur** | `HALO_ERROR` | Magenta (`#FF00FF` ~30 % cœur) | Identifiants invalides, erreur auth |

Transitions halo : `transition-[background-image] duration-300` dans `LoginForm` (ex. bascule connexion ↔ inscription, apparition erreur).

#### Wordmark Odyssey (fallback sans logo partenaire)

Composant **`OdysseyConnexionMark`** — distinct de `OdysseyBrandLockup` (navbar, marketing).

| Propriété | Valeur |
|-----------|--------|
| Police | Montserrat (`font-brand`), uppercase, tracking large |
| Couleur | **Blanc pur `#FFFFFF`** + glow blanc lumineux — **seul** élément « soleil » de la page |
| Reste du form | Blanc cassé (`zinc-200` titres, `zinc-300` inputs) pour hiérarchie |
| Animation | Acte I — `odyssey-connexion-mark-reveal` (~1,85 s) |
| Pied de page | « Retour au site » — Acte V (`salon-footer-reveal`, après le formulaire) |

Salon **avec** logo partenaire : `PartnerBrandLockup` inchangé ; Odyssey reste « Propulsé par » discret.

#### Fichiers code

| Sujet | Fichier |
|-------|---------|
| Halos d’état | `src/components/auth/LoginForm.tsx` (`HALO_*`) |
| Couche éclipse | `src/components/auth/ConnexionEclipseLayer.tsx` |
| Asset vidéo | `public/eclipse_login.mp4` (distinct de `/eclipse.mp4` marketing) |
| Wordmark connexion | `src/components/auth/OdysseyConnexionMark.tsx` |
| Animations séquence | `app/globals.css` (`salon-cinema-*`, `odyssey-connexion-mark-*`, `connexion-submit-breathe`) |
| CTA connexion | `src/components/salon/SalonCyanGlowText.tsx` (`connexionSubmitButtonClass`) |

#### Checklist — ne pas casser la signature

1. Une seule vidéo fond : `eclipse_login.mp4` — pas de duplication par état.
2. Changer la couleur = changer le **halo**, pas l’éclipse.
3. Pas de rectangle / lockup éclipse derrière « ODYSSEY » sur connexion.
4. `prefers-reduced-motion` : éclipse figée, animations CSS off.
5. Co-branding partenaire : le halo violet/cyan/erreur reste **derrière** le logo client, sans le recouvrir agressivement.

### 4.2 Composition Magique — Étape 5

> **Phrase produit :** *Nous tissons votre histoire — la lumière se concentre sur le geste, pas sur l'outil.*

Signature visuelle de la **Composition Magique** (`MagicCinematicOverlay`). **Validée DP juillet 2026 — ne pas modifier sans accord produit.** Canon technique : [`STORYBOARD_STEP5_LIVRE_OUVERT.md` §5](STORYBOARD_STEP5_LIVRE_OUVERT.md#5-design-verrouillé--composition-magique).

#### Contexte Studio (pas Salon)

Le cyan `--salon-cyan` (`#00E8F0`) est réutilisé **chirurgicalement** sur la capsule montage — même token que le Salon, mais surface minimale (~capsule + message). Pas de cyan fluo sur marketing B2C hors cette séquence.

#### Empilement (z-index)

```
1. Contenu Livre Ouvert (chapitres, banque) — dim implicite via scrim
2. .magic-depth-scrim (z-72) — vignette + blur périphérique masqué
3. .magic-capsule-enter (z-76) — capsule + spotlight
```

#### Capsule « Bouton Noir » — 3 couches

| Couche | Classe | Animation |
|--------|--------|-----------|
| Entrée | `.magic-capsule-enter` | Fade + translateY 300 ms |
| Frame | `.magic-capsule-frame` | `bg-white/[0.06]`, bordure cyan, breathe box-shadow 1,6 s |
| Texte | `.magic-capsule-text` | Opacity + text-shadow breathe 1,6 s |
| Spotlight | `.magic-capsule-spotlight` | `bg-black/60`, padding négatif — fond capsule |

#### Scrim profondeur — Option B

| Couche | Classe | Technique |
|--------|--------|-----------|
| Vignette | `.magic-depth-scrim__vignette` | `radial-gradient` elliptique (centre clair, bords ~52 % opacité) |
| Blur | `.magic-depth-scrim__blur` | `backdrop-filter: blur(5px)` + `mask-image` radial (blur périphérique uniquement) |

`contain: strict` sur le conteneur scrim — isolation GPU.

#### Cascade médias

| Classe | Rôle |
|--------|------|
| `.magic-media-enter` | Entrée translateY + scale ; stagger via `--magic-stagger-index` × 45 ms |
| `.magic-media-enter-done` | Retire `will-change` post-animation (perf GPU) |

**Règle :** pas de Framer Motion pendant `magicEntrance` — CSS pur sur `MontageMediaCard`.

#### Constantes timing (sync TS ↔ CSS)

Source TypeScript : `storyboardMagicTimeline.ts`. Toute modification → mettre à jour `app/globals.css` et [`STORYBOARD_STEP5_LIVRE_OUVERT.md` §6](STORYBOARD_STEP5_LIVRE_OUVERT.md#6-constantes-timing-source-de-vérité).

#### Checklist — ne pas casser la séquence

1. Capsule 3 couches + spotlight : **verrouillé** — pas de refonte sans DP.
2. Scrim Option B : vignette et blur séparés — ne pas fusionner en une seule couche sans test GPU.
3. `prefers-reduced-motion` : animations off + **`backdrop-filter: none`** sur le blur scrim.
4. Durée cascade ~20 photos : budget **< 3 s** (batch chapitre, pas 1 React commit/photo).

#### Fichiers code

| Sujet | Fichier |
|-------|---------|
| Overlay React | `src/components/tribute/storyboard/MagicCinematicOverlay.tsx` |
| CSS magic | `app/globals.css` (`.magic-*`) |
| Timeline domaine | `src/lib/wizard/storyboardMagicTimeline.ts` |
| Player | `src/lib/wizard/magicTimelinePlayer.ts` |

---

## 5. Co-branding partenaire

### 5.1 Source unique du logo

| Contexte | Lecture données |
|----------|-----------------|
| Connexion `?partenaire=<slug>` | RPC `get_partner_public_branding` → `brand_logo_url` |
| Dashboard salon | `fetchPartnerTenantsForUser()` — RPC P5.4 ou jointure RLS P5.3 |

**Même fichier PNG** — seule l’échelle UI change :

| Variant | Composant | Taille max |
|---------|-----------|------------|
| `cinema` | Connexion | `clamp(4.5rem, 14vw, 6.75rem)` |
| `dashboard` | Header salon | `clamp(2.75rem, 8vw, 4rem)` |

Composants : `PartnerLogoBand`, `PartnerBrandLockup`, `SalonConnexionBrand`.

### 5.2 Logos à carré noir intégré

Ne pas retoucher le fichier client. Le carré noir est **intentionnel** (title card). Sur `#020202` / `#000`, le bloc se fond naturellement.

### 5.3 Propulsé par Odyssey

- Toujours sous le logo, **aligné à droite**
- Kicker : 8 px, `white/26`, tracking large
- Wordmark : 10–11 px, `white/36`, **pas** le lockup éclipse

---

## 6. Surfaces UI (tokens)

### 6.1 Carte glass (connexion, champs salon)

```css
border: 1px solid rgba(255, 255, 255, 0.10);
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(24px);
```

Champs : `bg-black/40`, `rounded-lg`, focus `border-purple-400/45`.

### 6.2 Cartes forfaits (InvitationComposer)

Skin Salon dédié : `src/lib/salonTierCardSkin.ts` (isolé de `pricingTierCardSkin.ts` marketing).

| État | Visuel |
|------|--------|
| Repos | Bordure `white/10`, fond glass |
| Héritage (aucune sélection) | Halo mauve discret + scale 1.02 + ligne cyan |
| Sélection explicite | Scale **1.04**, ligne cyan 2 px, bordure renforcée |
| CTA carte | Outline ; CTA principal « Envoyer l’invitation » en cyan plein |

Features : matrice structurée (`SalonTierFeatureRow`) ; soldes commissions hors liste features.

### 6.3 Header salon

`bg-[#020202]/40`, `backdrop-blur-md`, `border-b white/6`, **`z-30`** (au-dessus des halos cartes).

---

## 7. Animations

| Zone | Animations | Réduction mouvement |
|------|------------|---------------------|
| Connexion salon | Séquence ~3,3 s (`salon-cinema-*`) | `prefers-reduced-motion: reduce` |
| Connexion studio | Même reveal titre / formulaire | idem |
| Header dashboard salon | Séquence ~1,8 s (`salon-dashboard-*`) à chaque reload / changement tenant | idem |
| Contenu salon (invitation) | Stagger entrée (`SALON_INVITE_STAGGER_*`), dolly carte 0,8 s | `useReducedMotion` |
| Cartes forfaits | Framer Motion (sélection + halo repos) | idem |

Courbe signature : `cubic-bezier(0.16, 1, 0.3, 1)` (locomotive / Apple-like).

---

## 8. Surfaces par route

### 8.1 Marketing (`/`, `/partenariats`, etc.)

- Fond noir, sections éditoriales
- Lockup Odyssey éclipse autorisé en hero
- Violet en accent CTA

### 8.2 Studio (`/studio`, wizard)

- Wizard : halos par étape, progress, autosave
- Connexion studio : `OdysseyConnexionMark` + signature **Halo-Éclipse** (§4.1) — halos violet (connexion) / cyan (inscription)

### 8.3 Salon (`/salon`)

- Shell : `PartnerDashboardShell`
- Layout : auth guard + fetch branding serveur
- Page : intro + invitation

Voir [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) pour les chemins canoniques.

---

## 9. Accessibilité

- Contraste texte principal ≥ WCAG AA sur `#020202`
- `sr-only` sur labels tenant / champs
- Focus visible : ring violet `purple-500/60`
- `suppressHydrationWarning` sur champs auth (extensions gestionnaires MDP)
- Animations désactivables via OS

---

## 10. Fichiers de référence code

| Sujet | Fichier |
|-------|---------|
| **Signature Halo-Éclipse** | `ConnexionEclipseLayer.tsx`, `LoginForm.tsx` (`HALO_*`), `public/eclipse_login.mp4` |
| Wordmark connexion | `OdysseyConnexionMark.tsx`, `StudioConnexionBrand.tsx`, `SalonConnexionBrand.tsx` |
| Atmosphère dashboard | `src/components/partner/SalonAtmosphere.tsx` |
| Co-branding | `src/components/partner/PartnerBrandLockup.tsx` |
| Logo band | `src/components/auth/PartnerLogoBand.tsx` |
| Animations CSS | `app/globals.css` (`salon-cinema-*`, `--salon-cyan`) |
| Skin cartes Salon | `src/lib/salonTierCardSkin.ts` |
| Features cartes Salon | `src/components/partner/SalonTierFeatureRow.tsx` |
| Invitation partenaire | `app/[lang]/(salon)/salon/components/InvitationComposer.tsx` |
| Branding DB | `tenants.settings.brand_label`, `brand_logo_url` |
| SQL branding public | `docs/sql/odyssey_p5_2_partner_public_branding.sql` |
| SQL tenants membre | `docs/sql/odyssey_p5_3_tenant_partner_select.sql`, `odyssey_p5_4_partner_tenants_for_member.sql` |
| SQL RLS tenant | `docs/sql/odyssey_p5_3_tenant_partner_select.sql` |

---

## 11. Checklist onboarding partenaire (design)

1. Obtenir PNG/SVG logo **tel que charte** (carré noir accepté)
2. Upload Storage `partner-branding`
3. SQL : `brand_label` + `brand_logo_url`
4. Tester connexion `?partenaire=<slug>`
5. Exécuter P5.2 + (P5.3 ou P5.4) + seed → logo header salon après login
6. Connexion brandée `?partenaire=<slug>` puis `/fr/salon` — même PNG header
7. Valider hiérarchie : partenaire > action invitation > commissions > Odyssey

---

## 12. Évolutions prévues (non implémentées)

- `brand_logo_url_on_dark` / `_on_light` si variantes officielles multiples
- Upload logo depuis dashboard Salon (Phase 2)
- Token CSS `--memorial-champagne` dans `tailwind.config` si adoption tertiaire

---

*Document vivant — mettre à jour après tout changement visuel connexion, salon, ou tokens globaux.*
