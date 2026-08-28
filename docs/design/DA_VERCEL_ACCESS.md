# Odyssey — Accès Vercel pour le DA (liens directs)

**Type :** playbook · **Vérité pour :** URLs prod à partager au DA, provisioning compte « tout voir », limites craft labs.  
**Dernière MAJ :** 28 août 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 28 août 2026 — URL Vercel réelle : `odyssey-91druvvf1-erik-8818s-projects.vercel.app`.
- 28 août 2026 — création : liens FR/EN, 3 portes auth, Salon/HQ/Studio, tokens, checklist ops.

Complète [`../DA_SCREENS.md`](../DA_SCREENS.md) (frames Figma) · [`../ROUTES_AND_AUTH.md`](../ROUTES_AND_AUTH.md) (auth détaillée) · [`../HQ_ODYSSEY.md`](../HQ_ODYSSEY.md).

---

## 1. URL de base (Vercel)

| Environnement | URL | Usage |
|---------------|-----|--------|
| **Déploiement actuel (partager au DA)** | **https://odyssey-91druvvf1-erik-8818s-projects.vercel.app** | Preview Vercel · accueil FR : `/fr` |
| Domaine custom (futur) | https://odyssey.video | Pas encore le lien à envoyer au DA |
| Local dev | http://localhost:3000 | Labs craft + previews Sanctuaire (`test-ciel`, etc.) |

**Langues :** remplacer `/fr/` par `/en/` pour la version anglaise (même écran, copy EN).

**Règle liens :** toutes les URLs ci-dessous sont en **FR**. Préfixe EN = remplacer  
`https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/` → `…/en/`.

---

## 2. Compte DA — ce qu’on configure côté ops (avant de lui envoyer le doc)

Il n’existe **pas** un seul login « super-admin » dans l’app. **Un même e-mail Supabase** peut accéder à tout si on lui accorde **trois identités** distinctes :

| Zone | Ce qu’il faut en base | Effet |
|------|------------------------|-------|
| **Studio** (famille + wizard) | Compte Auth créé (inscription via Studio **ou** invite Supabase) | Wizard 7 étapes, Coffre, checkout |
| **Salon** (partenaire) | Ligne `tenant_members` avec rôle `partner_admin` sur au moins un tenant | Salon + **Commissions** (vue VP / directeur financier) |
| **HQ Odyssey** | Ligne `hq_allowlist` (P13) | Tour de contrôle réseau + fiche par salon |

**Rôles Salon (pour référence DA) :**

| Rôle SQL | Profil métier | Pages |
|----------|---------------|-------|
| `partner` | Conseiller / directeur terrain | `/salon`, `/salon/mes-performances` |
| `partner_admin` | DG / VP salon | `/salon`, `/salon/commissions` (+ invitations) |

Pour que le DA voie **directeur ET VP**, lui donner **`partner_admin`** (couvre commissions + invitations). La page **Mes performances** reste la vue « conseiller » — utile seulement s’il a aussi des invitations à son nom.

### Checklist provisioning (remplacer l’e-mail)

1. **Créer le user** dans Supabase Auth (Dashboard → Authentication) **ou** laisser le DA s’inscrire une fois sur Studio connexion.
2. **HQ allowlist** (SQL Editor, onglet nommé `HQ — Add operator — YYYY-MM-DD`) :

```sql
INSERT INTO public.hq_allowlist (user_id, note)
SELECT id, 'DA — accès review Vague 1'
FROM auth.users
WHERE lower(email) = lower('da@exemple.com')
ON CONFLICT (user_id) DO NOTHING;
```

3. **Salon partenaire** — rattacher au tenant QA démo (Urgel branding) :

```sql
INSERT INTO public.tenant_members (user_id, tenant_id, role)
SELECT u.id, t.id, 'partner_admin'
FROM auth.users u
CROSS JOIN public.tenants t
WHERE lower(u.email) = lower('da@exemple.com')
  AND t.slug = 'partner-qa-demo'
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role;
```

Script complet seed QA : [`../sql/odyssey_p4_partner_token_qa_seed.sql`](../sql/odyssey_p4_partner_token_qa_seed.sql) · branding : [`../sql/odyssey_partner_tenant_branding_example.sql`](../sql/odyssey_partner_tenant_branding_example.sql).

4. **Envoyer au DA** : ce document + son mot de passe (créé ou reset Supabase) — **ne jamais** coller le mot de passe dans le repo.

5. **Wizard peuplé (optionnel)** : créer un projet hommage lié à son user pour qu’il tombe sur un Coffre / Film déjà rempli (sinon wizard vide après 1ʳᵉ connexion Studio).

---

## 3. Les trois portes de connexion (même e-mail, URLs différentes)

| Porte | URL connexion | Après login | Inscription publique |
|-------|---------------|-------------|----------------------|
| **Famille (Studio)** | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/studio/connexion | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/studio | **Oui** |
| **Partenaire (Salon)** | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/connexion | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon | **Non** |
| **Odyssey HQ** | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/hq/connexion | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/hq | **Non** |

**Salon brandé (démo Urgel QA)** — recommandé pour montrer le co-branding :

- https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/connexion?partenaire=partner-qa-demo  
- EN : https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/en/salon/connexion?partenaire=partner-qa-demo  

Alias paramètre : `?partner=partner-qa-demo` (équivalent).

**Legacy (redirects automatiques, pas de frame Figma) :**

- https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/login → Studio connexion  
- https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/login → Studio connexion  
- https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/auth → selon config auth  

---

## 4. Marketing (public, sans login)

| Écran | Lien FR | Lien EN |
|-------|---------|---------|
| Accueil | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/en |
| Parcours | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/process | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/en/process |
| Manifesto (page marketing) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/manifesto | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/en/manifesto |
| Contact | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/contact | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/en/contact |
| Devenir partenaire (lead B2B) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/partners | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/en/partners |
| Alias FR partenaires | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/partenaires | — (redirect → `/partners`) |

---

## 5. Studio — wizard famille (7 étapes, une URL)

**URL unique** (stepper dans l’UI — pas d’URL par étape) :

- https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/studio  
- https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/en/studio  

| Étape | Nom produit | Notes DA |
|-------|-------------|----------|
| 1 | Essentiels | Frame `studio-01-essentiels` |
| 2 | Cercle | Invitations / Co-Créateur |
| 3 | **Coffre** | QR Scanner compagnon (variante Figma `scan-qr`) |
| 4 | Musique | Chapitres / chansons |
| 5 | **Le film** | Livre ouvert — cœur DA |
| 6 | Aperçu | Preview avant paiement |
| 7 | **Finaliser** | Forfaits + Extensions + Stripe · variante Soft Cap |

**Auth & entrées famille :**

| Écran | Lien |
|-------|------|
| Connexion / inscription Studio | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/studio/connexion |
| Acceptation invitation B2B2C | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/invite/accept?token=`<TOKEN>` |
| Bienvenue hommage (wizard seedé) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/tribute/welcome?projectId=`<UUID>` |

`<TOKEN>` / `<UUID>` = valeurs réelles générées par l’app ou Supabase (demander à l’équipe produit pour une démo).

---

## 6. Sanctuaire, Scanner, lecture (tokens)

Routes **publiques** (pas de login). Nécessitent un **token opaque** ou un ID réel.

| Écran | Lien modèle | Auth |
|-------|-------------|------|
| Sanctuaire invité (contribute) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/contribute/`<token>` | Token invité |
| Scanner compagnon (mobile) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/scan/`<token>` | Token session QR (TTL ~2 h) |
| Lecture film rendu | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/watch/`<videoId>` | Public |
| Co-Créateur (éditeur) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/collab/`<token>` | Token one-shot → cookie editor → Studio |

**Previews dev Sanctuaire** (ciel, mock Margaret) — **localhost uniquement** (`NODE_ENV !== production`) :

| Preview | Lien local |
|---------|------------|
| Sanctuaire mock | http://localhost:3000/fr/contribute/test-visuel |
| Ciel / constellation | http://localhost:3000/fr/contribute/test-ciel |

Sur **ce déploiement Vercel**, ces tokens renvoient le flux normal (404 ou token invalide) — pas de mock en prod.

---

## 7. Salon partenaire (directeur · VP · conseiller)

**Prérequis :** compte avec `tenant_members` (`partner` ou `partner_admin`).

| Écran | Lien FR | Rôle minimum |
|-------|---------|--------------|
| Connexion Salon (générique) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/connexion | — |
| Connexion brandée QA | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/connexion?partenaire=partner-qa-demo | — |
| Dashboard Salon (invitations) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon | `partner` ou `partner_admin` |
| Mes performances (conseiller) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/mes-performances | `partner` (`canInvite`) |
| Commissions & KPI RevShare | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/commissions | `partner_admin` (`canViewLedger`) |
| Facturation (legacy) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/facturation | Redirect → `/salon/commissions` |

**Ne pas confondre :** `/fr/partners` = marketing acquisition · `/fr/salon` = espace connecté funérarium.

---

## 8. Odyssey HQ (tour de contrôle plateforme)

**Prérequis :** session + ligne `hq_allowlist` (§2).

| Écran | Lien |
|-------|------|
| Connexion HQ | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/hq/connexion |
| Macro réseau (KPI, liste salons) | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/hq |
| Fiche micro salon | https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/hq/salons/`<tenantId>` |

`<tenantId>` = UUID du tenant (colonne `tenants.id`). Le DA le copie depuis la **liste salons** sur `/fr/hq` (ex. tenant QA : slug `partner-qa-demo`).

Sans allowlist : redirect accueil ou Salon (pas d’erreur 403 visible).

---

## 9. Labs craft (shader, ciel, éclipse, lueur)

**Important :** toutes les routes `/contribute/test-*` sont **`notFound()` en production** (y compris sur Vercel). Pour review visuelle craft → **dev local** ou session dev partagée.

| Lab | Lien local FR | Doc |
|-----|---------------|-----|
| Craft ciel (knobs actuels) | http://localhost:3000/fr/contribute/test-sky | [`../craft/SKY_DEPTH_CRAFT.md`](../craft/SKY_DEPTH_CRAFT.md) |
| Backup ciel legacy | http://localhost:3000/fr/contribute/test-sky-legacy | idem |
| Preview ciel Sanctuaire | http://localhost:3000/fr/contribute/test-ciel | [`../SANCTUARY_SKY_CRAFT.md`](../SANCTUARY_SKY_CRAFT.md) |
| Lueur / Hero / constellation | http://localhost:3000/fr/contribute/test-lueur | [`../ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md) |
| Éclipse craft | http://localhost:3000/fr/contribute/test-eclipse | [`../ODYSSEY_ECLIPSE_LOGO.md`](../ODYSSEY_ECLIPSE_LOGO.md) |
| Éclipse play (~9,5 s) | http://localhost:3000/fr/contribute/test-eclipse-play | [`../ODYSSEY_ECLIPSE_PLAY_FINALE.md`](../ODYSSEY_ECLIPSE_PLAY_FINALE.md) |
| Marque éclipse | http://localhost:3000/fr/contribute/test-eclipse-mark | idem |
| Export marque | http://localhost:3000/fr/contribute/test-eclipse-mark-export?variant=lockup | [`../brand/odyssey-eclipse/README.md`](../brand/odyssey-eclipse/README.md) |
| Wormhole craft C | http://localhost:3000/fr/contribute/test-wormhole | [`../ODYSSEY_WORMHOLE_CRAFT.md`](../ODYSSEY_WORMHOLE_CRAFT.md) |

*(Variantes EN : remplacer `/fr/` par `/en/`.)*

---

## 10. Parcours recommandé pour une session DA (prod)

Ordre suggéré sur **https://odyssey-91druvvf1-erik-8818s-projects.vercel.app** une fois le compte provisionné :

1. Marketing : `/fr` → `/fr/process` → `/fr/manifesto`  
2. Connexion Studio → `/fr/studio` (parcourir les 7 étapes)  
3. Déconnexion → Salon brandé → `/fr/salon/connexion?partenaire=partner-qa-demo` → `/fr/salon` → `/fr/salon/commissions`  
4. Déconnexion → HQ → `/fr/hq/connexion` → `/fr/hq` → clic salon QA → fiche `/fr/hq/salons/{id}`  
5. Craft shaders : session **localhost** §9 (si review ciel / éclipse / lueur)

Copy écran (référence textes) : [`../COPY_CATALOG.md`](../COPY_CATALOG.md) · frames Figma : [`../DA_SCREENS.md`](../DA_SCREENS.md).

---

## 11. Récap une page — liens cliquables prod (FR)

```
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/process
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/manifesto
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/contact
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/partners
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/studio/connexion
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/studio
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/connexion
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/connexion?partenaire=partner-qa-demo
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/mes-performances
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/salon/commissions
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/hq/connexion
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/hq
```

Tokens / IDs dynamiques (demander à l’équipe pour démo) :

```
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/contribute/{token}
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/scan/{token}
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/watch/{videoId}
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/collab/{token}
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/invite/accept?token={token}
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/tribute/welcome?projectId={uuid}
https://odyssey-91druvvf1-erik-8818s-projects.vercel.app/fr/hq/salons/{tenantId}
```

---

## 12. Support

| Sujet | Doc |
|-------|-----|
| Routes & auth détaillée | [`../ROUTES_AND_AUTH.md`](../ROUTES_AND_AUTH.md) |
| Wizard 7 étapes | [`../WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md) |
| HQ & allowlist | [`../HQ_ODYSSEY.md`](../HQ_ODYSSEY.md) |
| SQL HQ P13 | [`../sql/odyssey_p13_hq_allowlist.sql`](../sql/odyssey_p13_hq_allowlist.sql) |
| QA Salon partenaire | [`../_archive/QA_P5_5_PARTNER_SALON.md`](../_archive/QA_P5_5_PARTNER_SALON.md) |
