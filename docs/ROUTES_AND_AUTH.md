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
- Slug valide + tenant trouvé → logo (même PNG que le dashboard) + « Propulsé par Odyssey » aligné à droite + séquence cinéma CSS (~3,3 s).
- Pas de paramètre, slug invalide ou tenant inconnu → lockup Odyssey standard (pas d’erreur visible).
- Après login brandé, le slug `?partenaire=` est mémorisé (`localStorage`) — fallback logo header si le tenant met du temps à charger.

**Lecture serveur (connexion) :** `fetchPartnerBrandingBySlug()` → RPC **`get_partner_public_branding`** (P5.2), pas de `service_role`.

**Dashboard Salon (`/salon`) :**
- Même `brand_logo_url` via `fetchPartnerTenantsForUser()` (layout serveur) et `GET /api/partner/tenants`.
- Layout : `resolvePartnerInitialBrand()` enrichit le branding serveur via RPC publique si le tenant n’a pas encore de logo en settings.
- Header : `PartnerBrandLockup` + `PartnerLogoBand` variant `dashboard` + animation courte (~1,8 s).
- Fallback logo client : si le tenant n’a pas `logoUrl`, RPC `get_partner_public_branding` via slug tenant, slug connexion (`localStorage`) ou premier tenant disponible.
- Header `z-30` pour rester au-dessus des halos des cartes forfaits.
- Atmosphère : `SalonAtmosphere` (halos violet atténués), alignée sur la connexion.
- Hiérarchie page : `PartnerSalonPageIntro` (contexte + jetons compacts) → `InvitationComposer` (centré, skin cyan).

**SQL requis (Supabase) :**

| Script | Rôle |
|--------|------|
| `odyssey_p5_2_partner_public_branding.sql` | RPC branding public connexion |
| `odyssey_p5_3_tenant_partner_select.sql` | RLS SELECT `tenants` pour `partner` / `partner_admin` |
| `odyssey_p5_4_partner_tenants_for_member.sql` | RPC liste tenants + branding (alternative / complément à P5.3) |
| `odyssey_partner_tenant_branding_example.sql` | Exemple QA Urgel Bourgie |
| `odyssey_p4_partner_token_qa_seed.sql` | Membership `partner_admin` + jetons QA |

Exécuter **P5.2 + (P5.3 ou P5.4) + seed** pour connexion et dashboard co-brandés.

**Exemple SQL (QA) :** voir `docs/sql/odyssey_partner_tenant_branding_example.sql`.

**Phase 2 (pas encore) :** upload logo depuis le Salon → Storage + `settings.brand_logo_url` ; générateur de lien brandé dans le dashboard.

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
| `src/components/auth/LoginForm.tsx` | Formulaire auth (`audience`, animations) |
| `src/components/auth/SalonConnexionBrand.tsx` | Branding connexion Salon (server) |
| `src/components/auth/StudioConnexionBrand.tsx` | Branding connexion Studio |
| `src/components/auth/PartnerLogoBand.tsx` | Logo partenaire (`cinema` / `dashboard`) |
| `src/components/partner/PartnerBrandLockup.tsx` | Logo + « Propulsé par Odyssey » |
| `src/components/partner/SalonAtmosphere.tsx` | Halos fond connexion / salon |
| `src/lib/partner/fetchPartnerBrandingBySlug.ts` | Branding public par slug (P5.2) |
| `src/lib/partner/fetchPartnerTenantsForUser.ts` | Tenants + branding membre ; `resolvePartnerInitialBrand()` |
| `src/lib/partner/partnerBrandingFromSettings.ts` | Parse settings ; `parsePartnerLogoUrl()` |
| `src/lib/salonTierCardSkin.ts` | Motion + classes cartes invitation Salon (cyan) |
| `src/lib/wizard/wizardDeliverables.utils.ts` | Présentation tiers (`tokenDebitLabel`, features structurées) |
| `app/[lang]/studio/connexion/page.tsx` | Page connexion famille |
| `app/[lang]/salon/connexion/page.tsx` | Page connexion partenaire (+ `searchParams`) |
| `app/[lang]/(salon)/salon/layout.tsx` | Garde auth + branding serveur initial |
| `app/[lang]/(salon)/salon/components/PartnerHeader.tsx` | Header co-brandé |
| `app/[lang]/(salon)/salon/components/PartnerSalonPageIntro.tsx` | Hiérarchie workspace + jetons |
| `src/lib/partner/PartnerContext.tsx` | Tenant actif côté Salon |
| `app/api/partner/tenants/route.ts` | Liste tenants partenaire (session) |
| `app/api/partner/invitations/route.ts` | Création invitation + magic link |
| `docs/DESIGN_SYSTEM.md` | Palette, hiérarchie, co-branding, **signature Halo-Éclipse** (§4.1), animations |

---

## Tests manuels (checklist courte)

1. `/fr/studio/connexion` — inscription + login → `/fr/studio` ; **Halo-Éclipse** : halo violet (connexion) / cyan (inscription) ; `OdysseyConnexionMark` blanc lumineux ; CTA cyan.
2. `/fr/salon/connexion` (navigation privée, sans cookie partenaire) — fallback Odyssey ; pas d’onglet inscription → `/fr/salon`.
3. `/fr/login` → redirect studio connexion.
4. `/fr/salon/connexion?partenaire=partner-qa-demo` — branding partenaire + même signature Halo-Éclipse en fond.
5. Erreur login (mauvais mot de passe) — halo **magenta** + message ; éclipse inchangée (cf. [`DESIGN_SYSTEM.md` §4.1](DESIGN_SYSTEM.md#41-signature-halo-éclipse-connexion-studio--salon)).
6. `/fr/salon` — header logo = même PNG, dropdown tenant, pas d’erreur « espace introuvable ».
7. Déconnexion studio → retour studio connexion.
8. Toggle FR/EN — conserve query `?partenaire=` ; « Retour au site » apparaît en dernier (Acte V).
9. Invitation magic link → accept → tribute welcome (voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md)).
