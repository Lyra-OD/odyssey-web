# QA P5.5 — Salon partenaire (checklist manuelle)

> ## ✅ QA TERMINÉE — PRODUCTION (juin 2026)
>
> Cette checklist a été **exécutée et validée en conditions réelles** (prod) : RBAC §2 · solde bout en bout §3 · gate non-partenaire R6.
>
> **Important — coexistence B2B2C v2 :** les scénarios **débit à l'invitation** et **overdraft 402** documentés ici concernent le modèle **legacy jetons** (`tenants.is_freemium = false`). Pour les gros clients freemium (ex. Urgel Bourgie), le Souvenir offert coûte **0 jeton** — voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2 et le sprint Phase A (P6).
>
> Ce document reste une **référence historique** pour les petits salons en jetons.

**Last updated: June 2026**

Document **exécutable** — tunnel partenaire **legacy jetons** (P5.5), QA **terminée prod**.

**Piliers validés (historique jetons) :**

1. **Tunnel invitation** (création → magic link → accept → wizard famille)
2. **402 Overdraft** (legacy — tenants non-freemium)
3. **Solde bout en bout** (DB ↔ API ↔ UI accueil ↔ facturation)

**Références :** [`PROJECT_STATUS.md`](PROJECT_STATUS.md) · [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) v2 · [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) · [`sql/odyssey_p5_5_partner_rbac_overdraft.sql`](sql/odyssey_p5_5_partner_rbac_overdraft.sql)


---

## 0. Environnements & comptes

| Élément | Valeur QA |
|---------|-----------|
| **Tenant** | `partner-qa-demo` (branding Urgel Bourgie) |
| **Prod** | `https://odyssey-web-eta.vercel.app` |
| **Local** | `http://localhost:3000` (même Supabase que prod si `.env.local` identique) |
| **Connexion brandée** | `/fr/salon/connexion?partenaire=partner-qa-demo` |
| **Admin QA** | `partner_admin` — ex. Erik + `info@odyssey-video.com` |
| **Directeur QA** | `partner` — compte séparé sur le même tenant (optionnel mais recommandé) |

**Jetons par forfait offert** (`granted_package`) :

| Marketing FR | ID technique | Jetons débités |
|--------------|--------------|----------------|
| Souvenir | `essential` | **1** |
| Héritage | `signature` | **2** |
| Éternité | `heritage` | **4** |

**Découvert P5.5 :** `credit_limit_tokens` = **20** par défaut → solde minimum autorisé = **-20**.

---

## 1. Prérequis Supabase (bloquant)

Exécuter dans **SQL Editor** avant toute session QA.

### 1.1 Health check schéma

```sql
-- Fonctions P5.5 requises
SELECT p.proname AS fonction, 'OK' AS statut
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronnamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_partner_invitation_with_debit',
    'credit_partner_tokens_manual',
    'debit_partner_tokens_for_checkout',
    'get_partner_tenants_for_member',
    'get_partner_public_branding'
  )
ORDER BY p.proname;
-- Attendu : 5 lignes
```

Voir aussi [`sql/odyssey_schema_health_check.sql`](sql/odyssey_schema_health_check.sql).

### 1.2 Membres tenant QA

```sql
SELECT u.email, tm.role, t.slug
FROM public.tenant_members tm
JOIN auth.users u ON u.id = tm.user_id
JOIN public.tenants t ON t.id = tm.tenant_id
WHERE t.slug = 'partner-qa-demo'
ORDER BY tm.role, u.email;
```

### 1.3 Wallet initial

```sql
SELECT w.balance, w.credit_limit_tokens, t.slug
FROM public.partner_token_wallets w
JOIN public.tenants t ON t.id = w.tenant_id
WHERE t.slug = 'partner-qa-demo';
```

| Champ | Attendu QA |
|-------|------------|
| `balance` | Entier (ex. 100, 500 — selon seed / crédits manuels) |
| `credit_limit_tokens` | **20** (si P5.5 appliqué) |

**Si RPC P5.5 absente :** l’API renvoie `503 schema_not_ready` sur invitation — **STOP**, appliquer `odyssey_p5_5_partner_rbac_overdraft.sql`.

| # | Prérequis | OK | Notes |
|---|-----------|----|-------|
| P1 | 5 RPC P5.5 présentes | ☐ | |
| P2 | Tenant `partner-qa-demo` + branding | ☐ | |
| P3 | ≥1 compte `partner_admin` | ☐ | |
| P4 | Wallet + `credit_limit_tokens` = 20 | ☐ | |

---

## 2. RBAC UI (Directeur vs Admin)

Utiliser **deux navigateurs** (ou normal + privé) si deux comptes disponibles.

| # | Scénario | Étapes | Attendu | OK |
|---|----------|--------|---------|-----|
| R1 | **Admin** — accueil | Login admin → `/fr/salon` | Bloc jetons visible ; solde numérique réel | ☐ |
| R2 | **Admin** — facturation | `/fr/salon/facturation` | Solde + découvert ; nav **Facturation** ; message recharge (Stripe pas requis) | ☐ |
| R3 | **Admin** — lien Recharger | Clic « Recharger » sur accueil | → `/fr/salon/facturation` | ☐ |
| R4 | **Directeur** — accueil | Login directeur → `/fr/salon` | **Pas** de bloc jetons | ☐ |
| R5 | **Directeur** — facturation | URL directe `/fr/salon/facturation` | Redirect `/fr/salon` ; pas de nav Facturation | ☐ |
| R6 | **Famille** — gate salon | Compte sans rôle partenaire → `/fr/salon` | Redirect `/fr/studio` | ☐ |

---

## 3. Pilier A — Solde bout en bout

| # | Scénario | Étapes | Attendu | OK |
|---|----------|--------|---------|-----|
| S1 | **API wallet** | DevTools → `GET /api/partner/wallet?tenantId=<uuid>` (session admin) | `200` ; `balance` + `creditLimitTokens` cohérents avec SQL | ☐ |
| S2 | **UI accueil = API** | Noter solde UI accueil | = `balance` API (pas mock 42) | ☐ |
| S3 | **UI facturation = API** | Ouvrir `/fr/salon/facturation` | Même solde + limite découvert | ☐ |
| S4 | **Multi-admin** | Admin A + Admin B (même tenant) | **Même** solde affiché (wallet partagé) | ☐ |
| S5 | **Refresh** | F5 sur accueil + facturation | Solde stable (pas de régression) | ☐ |
| S6 | **Changement tenant** | Si plusieurs tenants dans dropdown | Solde se met à jour au switch | ☐ |

**Vérification SQL après S1 :**

```sql
SELECT balance, credit_limit_tokens
FROM public.partner_token_wallets w
JOIN public.tenants t ON t.id = w.tenant_id
WHERE t.slug = 'partner-qa-demo';
```

---

## 4. Pilier B — Tunnel invitation (happy path)

**Email famille de test :** adresse **nouvelle** (jamais invitée) ou supprimer invitation `pending` avant retest.

| # | Étape | Action | Attendu | OK |
|---|-------|--------|---------|-----|
| I1 | Création | Admin → `/fr/salon` → choisir forfait (ex. Héritage) → email famille → **Envoyer** | Écran succès + **magic link** affiché | ☐ |
| I2 | API | DevTools → `POST /api/partner/invitations` | `200` ; body avec `invitationId`, `magicLinkUrl`, `expiresAt` | ☐ |
| I3 | Débit wallet | Noter solde avant/après | Solde **-2** jetons (Héritage) ; UI accueil + facturation à jour | ☐ |
| I4 | Ledger | SQL ci-dessous | Ligne `invitation_debit` ; `delta` négatif ; `invitation_id` renseigné | ☐ |
| I5 | Magic link | Ouvrir lien (navigation privée) ou copier URL | Page `/fr/invite/accept?token=…` | ☐ |
| I6 | Accept | Famille : login ou inscription avec **même email** invité | Accept OK → redirect wizard | ☐ |
| I7 | Welcome | `/fr/tribute/welcome` | Wizard seedé ; contexte invitation visible | ☐ |
| I8 | Invitation status | SQL | `partner_invitations.status` → `accepted` (après accept) | ☐ |

**SQL ledger (après I3) :**

```sql
SELECT l.delta, l.balance_after, l.reason, l.invitation_id, l.created_at
FROM public.partner_token_ledger l
JOIN public.tenants t ON t.id = l.tenant_id
WHERE t.slug = 'partner-qa-demo'
ORDER BY l.created_at DESC
LIMIT 5;
```

**SQL invitation :**

```sql
SELECT id, invited_email, granted_package, status, expires_at, created_at
FROM public.partner_invitations i
JOIN public.tenants t ON t.id = i.tenant_id
WHERE t.slug = 'partner-qa-demo'
ORDER BY i.created_at DESC
LIMIT 3;
```

---

## 5. Pilier C — 402 Overdraft

**Objectif :** prouver que l’API **refuse** une invitation qui ferait passer le solde **sous** `-credit_limit_tokens`.

### 5.1 Préparer le wallet (QA uniquement)

```sql
-- ⚠️ Tenant QA seulement — remet le solde au plancher du découvert
UPDATE public.partner_token_wallets w
SET balance = -20, updated_at = now()
FROM public.tenants t
WHERE w.tenant_id = t.id AND t.slug = 'partner-qa-demo';

SELECT balance, credit_limit_tokens FROM public.partner_token_wallets w
JOIN public.tenants t ON t.id = w.tenant_id WHERE t.slug = 'partner-qa-demo';
-- Attendu : balance = -20, credit_limit_tokens = 20
```

### 5.2 Test UI + API

| # | Étape | Action | Attendu | OK |
|---|-------|--------|---------|-----|
| O1 | Solde UI | Admin → accueil + facturation | Affiche **-20** (ou proche) | ☐ |
| O2 | Invitation | Tenter invitation (n’importe quel forfait, ≥1 jeton) | **Échec** — pas d’écran succès | ☐ |
| O3 | API | DevTools → `POST /api/partner/invitations` | **`402`** ; body `error: "overdraft_limit_exceeded"` | ☐ |
| O4 | Wallet inchangé | SQL balance | Toujours **-20** (pas de débit partiel) | ☐ |
| O5 | Ledger | SQL dernier ledger | **Pas** de nouvelle ligne `invitation_debit` pour cette tentative | ☐ |

**Note UI (juin 2026) :** l’écran salon peut afficher un message **générique** alors que l’API renvoie le message overdraft précis — valider **O3** via DevTools est la source de vérité. Amélioration UI optionnelle post-QA.

### 5.3 Restaurer le wallet après test 402

```sql
SELECT public.credit_partner_tokens_manual(
  (SELECT id FROM public.tenants WHERE slug = 'partner-qa-demo'),
  (SELECT id FROM auth.users WHERE email = 'info@odyssey-video.com' LIMIT 1),
  50,
  'QA restore after overdraft test'
);
```

Puis revérifier solde UI (S2/S3).

| # | Scénario | OK |
|---|----------|-----|
| O6 | Crédit manuel remonte le solde ; nouvelle invitation **réussit** | ☐ |

---

## 6. Scénarios complémentaires (recommandés)

| # | Scénario | Étapes | Attendu | OK |
|---|----------|--------|---------|-----|
| X1 | **409 pending duplicate** | Réinviter le **même email** tant qu’une invitation `pending` existe | `409` ; message « déjà en attente » | ☐ |
| X2 | **Directeur invite** | Directeur envoie invitation (solde OK) | Succès **sans** voir le solde avant/après | ☐ |
| X3 | **503 sans P5.5** | (staging sans SQL seulement) | `503 schema_not_ready` — documenter env | ☐ |
| X4 | **Branding connexion** | `/fr/salon/connexion?partenaire=partner-qa-demo` | Logo Urgel Bourgie + Halo-Éclipse | ☐ |
| X5 | **Déconnexion salon** | Sign out header | → connexion salon avec slug partenaire | ☐ |

---

## 7. Critère de passage (feu vert)

**GO** (historique — **atteint juin 2026**) :

| Pilier | Sections | Statut |
|--------|----------|--------|
| Prérequis | §1 — P1–P4 | ☐ Tous OK |
| Solde E2E | §3 — S1–S5 minimum | ☐ Tous OK |
| Invitation | §4 — I1–I7 minimum | ☐ Tous OK |
| 402 Overdraft | §5 — O1–O6 | ☐ Tous OK |
| RBAC | §2 — R1–R5 minimum | ☐ Tous OK |

**Suite :** sprint **B2B2C v2 Phase A** — P6, saga checkout freemium, RevShare — voir [`PROJECT_STATUS.md`](PROJECT_STATUS.md) §10.

---

## 8. Journal de session QA

| Date | Testeur | Env (local/prod) | Résultat global | Bloquants | Notes |
|------|---------|------------------|-----------------|-----------|-------|
| | | | ☐ GO / ☐ NO-GO | | |

---

## 9. Après feu vert — hors scope immédiat

Ne **pas** entamer tant que §7 n’est pas GO :

- Spike `tribute_checkouts` + `debit_partner_tokens_for_checkout` dans `POST /api/checkout`
- Webhook Stripe → crédit wallet automatique
- Mode `b2b2c_family` complet

**Stripe Payment Link :** optionnel pour QA ; crédit via `credit_partner_tokens_manual` suffit.

---

## 10. Fichiers code touchés par cette QA

| Zone | Fichier |
|------|---------|
| Invitation API | `app/api/partner/invitations/route.ts` |
| RPC wrapper | `src/lib/partner/createPartnerInvitationWithDebit.ts` |
| UI invitation | `app/[lang]/(salon)/salon/components/InvitationComposer.tsx` |
| Wallet API | `app/api/partner/wallet/route.ts` |
| Context salon | `src/lib/partner/PartnerContext.tsx` |
| Facturation | `app/[lang]/(salon)/salon/components/PartnerFacturationView.tsx` |
| Accept invitation | `app/[lang]/invite/accept/page.tsx` |
| Welcome famille | `app/[lang]/tribute/welcome/page.tsx` |
| SQL P5.5 | `docs/sql/odyssey_p5_5_partner_rbac_overdraft.sql` |
