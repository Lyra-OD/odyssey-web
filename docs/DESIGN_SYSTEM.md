# Odyssey — Design System

**Dernière mise à jour : juin 2026**

Guide visuel et produit pour l’ensemble du site Next.js (Studio B2C, Salon B2B2C, pages marketing). Complète [`CONVENTIONS.md`](CONVENTIONS.md) et [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md).

---

## 1. Vision

Odyssey est une plateforme **« quiet luxury »** : hommages vidéo, ton respectueux, esthétique cinématographique. Deux expériences partagent la même base visuelle :

| Surface | Audience | Rôle |
|---------|----------|------|
| **Studio** | Familles (B2C) | Wizard hommage, checkout |
| **Salon** | Partenaires (B2B2C) | Invitations, jetons, co-branding |
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

**Règle :** le violet ne doit pas concurrencer le logo partenaire sur le Salon. Réserver aux CTA, focus, cartes « Héritage », halos d’ambiance.

### 2.2 Secondaire — Neutres froids

Fond sombre, typographie, structure.

| Token | Valeur | Usage |
|-------|--------|--------|
| `bg-deep` | `#020202` | Fond connexion + salon (identique) |
| `bg-black` | `#000000` | Fusion logos partenaires à carré noir intégré |
| `text-primary` | `white / 90–100 %` | Titres, actions principales |
| `text-secondary` | `white / 38–55 %` | Sous-titres, labels |
| `text-muted` | `zinc-400` – `zinc-500` | Kickers, métadonnées |
| `border-subtle` | `white / 6–10 %` | Cartes glass, séparateurs |

### 2.3 Tertiaire proposée — Champagne memorial

Pour éviter un site 100 % violet + noir, une **couleur tertiaire chaude** apporte chaleur humaine (hommage, mémoire, premium funéraire) sans entrer en conflit avec le vert partenaire (ex. Urgel Bourgie).

| Token | Valeur | Usage recommandé |
|-------|--------|-------------------|
| `memorial-champagne` | `#C4B5A0` | Lignes d’accent éditoriales, états « succès discret », hover secondaire |
| `memorial-champagne-dim` | `#C4B5A0` à **35 % opacité** | Filets, séparateurs alternatifs au violet |

**Alternative** (plus nature) : `sage-memorial` `#7A9E87` — validation, confirmation invitation, badges « actif ».

**Règle d’or tertiaire :** jamais sur le co-branding header ; maximum **5–10 %** de la surface écran ; jamais en compétition avec le violet des forfaits.

### 2.4 Couleur partenaire (contextuelle)

Chaque tenant peut avoir une accent couleur dans son logo (ex. vert `#2D6A4F` Urgel Bourgie). **Ne pas globaliser** — rester dans le cadre du logo PNG, pas dans l’UI Odyssey globale.

---

## 3. Typographie & hiérarchie

### 3.1 Familles

| Rôle | Classe / font | Usage |
|------|---------------|--------|
| Marque | `font-brand` | Odyssey, ESPACE PARTENAIRES, kickers caps |
| Éditorial | `font-editorial` | Titres invitation, storytelling |
| Interface | `font-label` | Labels formulaires, onglets, jetons |

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
  └─ Champ courriel glass
  └─ Cartes forfaits (glow violet sur recommandé)

Niveau 3 — Signature Odyssey (header uniquement sur salon)
  └─ Jamais en lockup éclipse centre page
```

### 3.3 Connexion Salon

```
Logo partenaire (cinema, grand)
  → Propulsé par Odyssey (discret, aligné droite)
  → ESPACE PARTENAIRES (blanc, caps)
  → Sous-titre (white/45 %)
  → Carte formulaire glass
```

Animations cinéma **uniquement** sur la connexion (`salon-cinema-*` dans `globals.css`).

---

## 4. Atmosphère & fond

Composant : `SalonAtmosphere` (`src/components/partner/SalonAtmosphere.tsx`).

| Variant | Opacité halo | Contexte |
|---------|--------------|----------|
| `connexion` | 100 % | Page login partenaire |
| `dashboard` | ~38 % | Salon après auth |

Gradient partagé (`SALON_HALO_GRADIENT`) — ellipse violet/magenta, blur 200–240 px, centré haut de page.

**Studio connexion** : même halos via `LoginForm` (sign-in violet, sign-up cyan).

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

Skin : `src/lib/pricingTierCardSkin.ts` — glow UV sur sélection / recommandé, bordures `white/10` au repos.

### 6.3 Header salon

`bg-[#020202]/40`, `backdrop-blur-md`, `border-b white/6`.

---

## 7. Animations

| Zone | Animations | Réduction mouvement |
|------|------------|---------------------|
| Connexion salon | Séquence ~3,3 s (`salon-cinema-*`) | `prefers-reduced-motion: reduce` |
| Connexion studio | Même reveal titre / formulaire | idem |
| Header dashboard salon | Séquence ~1,8 s (`salon-dashboard-*`) à chaque reload / changement tenant | idem |
| Contenu salon (invitation) | **Aucune** au chargement | — |
| Cartes forfaits | Framer Motion (sélection) | `useReducedMotion` |

Courbe signature : `cubic-bezier(0.16, 1, 0.3, 1)` (locomotive / Apple-like).

---

## 8. Surfaces par route

### 8.1 Marketing (`/`, `/partenariats`, etc.)

- Fond noir, sections éditoriales
- Lockup Odyssey éclipse autorisé en hero
- Violet en accent CTA

### 8.2 Studio (`/studio`, wizard)

- Wizard : halos par étape, progress, autosave
- Connexion studio : `StudioConnexionBrand` + halos cyan/sign-up

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
| Atmosphère | `src/components/partner/SalonAtmosphere.tsx` |
| Co-branding | `src/components/partner/PartnerBrandLockup.tsx` |
| Logo band | `src/components/auth/PartnerLogoBand.tsx` |
| Animations CSS | `app/globals.css` (bloc `salon-cinema-*`) |
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
5. Exécuter P5.3 → logo header salon après login
6. Valider hiérarchie : partenaire > action invitation > jetons > Odyssey

---

## 12. Évolutions prévues (non implémentées)

- `brand_logo_url_on_dark` / `_on_light` si variantes officielles multiples
- Jetons réels (API wallet) à la place du mock `42`
- Upload logo depuis dashboard Salon (Phase 2)
- Token CSS `--memorial-champagne` dans `tailwind.config` si adoption tertiaire

---

*Document vivant — mettre à jour après tout changement visuel connexion, salon, ou tokens globaux.*
