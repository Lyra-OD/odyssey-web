# Odyssey — Routes applicatives & authentification

**Last updated: June 2026**

Document canonique pour les **URLs**, les **deux pages de connexion** (famille vs partenaire), les **redirects legacy**, et le **branding Salon** (gant blanc). Source de vérité code : `src/lib/appRoutes.ts`.

Complète [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) §4.1 et [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md).

---

## Carte des routes (état actuel)

| Zone | URL | Auth | Rôle |
|------|-----|------|------|
| **Studio** (famille) | `/[lang]/studio` | Oui | Wizard hommage 8 étapes — B2C direct |
| **Studio connexion** | `/[lang]/studio/connexion` | Non | Login + **inscription** famille |
| **Salon** (funérarium) | `/[lang]/salon` | Oui | Console partenaire — invitations, jetons |
| **Salon connexion** | `/[lang]/salon/connexion` | Non | Login partenaire **sans** inscription |
| **Marketing partenaires** | `/[lang]/partners` ou `/partenaires` | Non | Formulaire « devenir partenaire » (≠ Salon) |
| **Acceptation invitation** | `/[lang]/invite/accept?token=…` | Oui (redir. studio connexion) | Magic link famille → projet B2B2C |
| **Bienvenue hommage** | `/[lang]/tribute/welcome?projectId=…` | Oui | Wizard seedé après invitation |
| **Auth callback** | `/auth/callback?next=…` | — | Échange code Supabase (signup / magic link) |

`lang` = `fr` | `en`.

---

## Renommages (éviter la confusion)

| Ancien chemin | Nouveau | Mécanisme |
|---------------|---------|-----------|
| `/[lang]/dashboard` | `/[lang]/studio` | Redirect permanent (`next.config.mjs`) |
| `/[lang]/partner` | `/[lang]/salon` | Redirect permanent |
| `/[lang]/login`, `/login` | `/[lang]/studio/connexion` | Redirect page + `next.config.mjs` |

**Ne pas confondre :**
- **`/salon`** = espace connecté funérarium (B2B2C opérationnel).
- **`/partners`** = page marketing acquisition partenaires.

---

## Deux connexions distinctes (Option A — « gant blanc »)

Pas de toggle Salon/Famille sur une même page : deux entrées séparées, copy dédiée.

| | Studio (famille) | Salon (partenaire) |
|--|------------------|-------------------|
| **URL** | `/studio/connexion` | `/salon/connexion` |
| **Inscription** | Oui (onglet Sign up) | Non |
| **Après login** | `/studio` (ou `?next=`) | `/salon` (ou `?next=`) |
| **Copy** | Pas de mention B2B | Pas de mention famille |
| **Composant** | `LoginForm` `audience="studio"` | `LoginForm` `audience="salon"` |

**Règle de redirection post-auth :**
- `?next=` prioritaire (chemins `/fr/…` ou `/en/…` uniquement).
- Sinon destination fixe selon `audience` — **pas** d’auto-détection partenaire via `/api/partner/tenants` sur la page famille.

**Legacy `/login` :** alias technique pour anciens liens (favoris, e-mails). Redirige vers **studio connexion** uniquement. Ce n’est pas une page produit.

---

## Branding partenaire — page Salon connexion

Lien personnalisé recommandé pour chaque funérarium :

```
https://odyssey.video/fr/salon/connexion?partenaire=<slug>
```

Alias anglais : `?partner=<slug>` (même comportement).

| Paramètre URL | Colonne DB | Champ `tenants.settings` |
|---------------|------------|--------------------------|
| `partenaire=maison-dupont` | `tenants.slug` | — |
| Nom affiché | `tenants.name` (fallback) | `brand_label` |
| Logo | — | `brand_logo_url` (URL HTTPS publique) |

**Comportement :**
- Slug valide + tenant trouvé → logo en grand (ou typographie du `brand_label`) + co-brand discret « Propulsé par Odyssey ».
- Pas de paramètre, slug invalide ou tenant inconnu → lockup Odyssey standard (pas d’erreur visible).

**Lecture serveur :** `fetchPartnerBrandingBySlug()` (`src/lib/partner/fetchPartnerBrandingBySlug.ts`) via client **service_role** — expose uniquement `slug`, `brandLabel`, `logoUrl`.

**Exemple SQL (QA) :**

```sql
UPDATE public.tenants
SET settings = settings || '{
  "brand_label": "Maison Dupont",
  "brand_logo_url": "https://example.com/logo.svg"
}'::jsonb
WHERE slug = 'partner-qa-demo';
```

**Phase 2 (pas encore doc d’implémentation) :** upload logo depuis le Salon → Supabase Storage + écriture `settings.brand_logo_url` ; générateur de lien brandé dans le dashboard. Aujourd’hui le logo du `PartnerHeader` reste en `localStorage` (cosmétique local uniquement).

---

## Routes protégées

| Route | Si non authentifié |
|-------|-------------------|
| `/[lang]/studio` | → `/studio/connexion?next=/[lang]/studio` |
| `/[lang]/salon` (+ layout) | → `/salon/connexion?next=/[lang]/salon` |
| `/[lang]/invite/accept` | → `/studio/connexion?next=…` (famille invitée) |
| `/[lang]/tribute/welcome` | → `/studio/connexion?next=…` |

**Déconnexion** (`DashboardSignOut`) → `/studio/connexion` par défaut.

---

## Auth callback (`/auth/callback`)

- Échange `code` ou `token_hash` Supabase → session cookies.
- Redirige vers `next` (sanitisé).
- En cas d’erreur : redirect vers la page connexion adaptée au chemin `next` (salon → `salon/connexion`, sinon `studio/connexion`) avec `?error=callback`.

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/lib/appRoutes.ts` | Chemins canoniques |
| `src/components/auth/LoginForm.tsx` | Formulaire auth (`audience`) |
| `src/components/auth/SalonConnexionBrand.tsx` | Header brandé Salon |
| `src/lib/partner/fetchPartnerBrandingBySlug.ts` | Résolution branding public |
| `app/[lang]/studio/connexion/page.tsx` | Page connexion famille |
| `app/[lang]/salon/connexion/page.tsx` | Page connexion partenaire (+ `searchParams`) |
| `app/[lang]/(salon)/salon/layout.tsx` | Garde auth Salon |
| `src/lib/partner/PartnerContext.tsx` | Tenant actif côté Salon |
| `app/api/partner/tenants/route.ts` | Liste tenants partenaire (session) |
| `app/api/partner/invitations/route.ts` | Création invitation + magic link |

---

## Tests manuels (checklist courte)

1. `/fr/studio/connexion` — inscription + login → `/fr/studio`.
2. `/fr/salon/connexion` — login partenaire, pas d’onglet inscription → `/fr/salon`.
3. `/fr/login` → redirect studio connexion.
4. `/fr/salon/connexion?partenaire=partner-qa-demo` — branding si `settings` renseignés.
5. Déconnexion studio → retour studio connexion.
6. Invitation magic link → accept → tribute welcome (voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md)).
