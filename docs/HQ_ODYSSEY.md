# Odyssey — Tour de contrôle HQ

**Type :** canon · **Vérité pour :** auth `/hq`, vues réseau / tenant, payout ops.  
**Dernière MAJ :** 18 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 18 août 2026 — Slice D : formulaire `/partners` + table `partner_leads` (P15) + alerte Resend HQ.
- 17 août 2026 — C.3 : drill conseillers sur `/hq/salons/[id]` (`aggregateMyPerformance`).
- 17 août 2026 — C.2 : fiche `/hq/salons/[tenantId]` (miroir commissions + payout).
- 17 août 2026 — C.1 : tabs verticales (`human` / `pet`).
- 17 août 2026 — Slice C : liste salons + payout RPC P14.

Complète [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) (waterfall, ledger, payout) · [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) · [`COMMUNICATIONS_MVP.md`](COMMUNICATIONS_MVP.md).  
**Ne pas** traiter HQ comme un 3ᵉ rôle salon. Rôles tenant inchangés : `partner` (directeur) · `partner_admin` (DG salon).

---

## 1. Pourquoi une 3ᵉ porte

Deux audiences existent :

| Porte | URL | Qui |
|-------|-----|-----|
| Studio | `/[lang]/studio/connexion` | Famille (inscription OK) |
| Salon | `/[lang]/salon/connexion` | Directeur / DG — **sans** inscription |

HQ Odyssey n’est **ni** un salon **ni** une famille. Y mettre un opérateur en `partner_admin` sur chaque tenant pollue le RBAC, mélange Patrice et Odyssey, et ne donne pas la vue **réseau**.

**Règle :** HQ = identité **plateforme**, hors `tenant_members`.

---

## 2. Architecture auth

### Routes

| URL | Auth | Rôle |
|-----|------|------|
| `/[lang]/hq/connexion` | Non | Login **sans** inscription (même famille que Salon) |
| `/[lang]/hq` | Oui + allowlist | Macro réseau |
| `/[lang]/hq/salons/[tenantId]` | Oui + allowlist | Micro tenant (miroir `partner_admin` + drill conseillers) |

Post-login : `next` sanitisé (`/hq` seulement), défaut `/[lang]/hq`.  
Compte connecté **sans** allowlist → `/salon` s’il est partenaire, sinon `/{lang}`. Pas de 403 HTML : redirect.

Audience code : `hq` (distincte de `salon` / `studio`). Branding Odyssey, pas co-branding salon.

### Allowlist `hq_allowlist`

Source de vérité : table Supabase `public.hq_allowlist` (`user_id` PK → `auth.users`). **Pas** d’env, **pas** de redeploy, **pas** `app_metadata` / `user_metadata`.

```text
isListedOnHqAllowlist(user) = EXISTS hq_allowlist WHERE user_id = auth.uid()
```

- **Middleware** : chemins `/[lang]/hq/**` hors `/connexion` — session absente → login HQ ; hors table → `/{lang}`.
- **Layout HQ** : même check (défense en profondeur) + redirect `/salon` si le compte est partenaire.
- **RLS** : `SELECT` de sa propre ligne seulement. `INSERT` / `DELETE` = SQL Editor (`service_role`). Un user **ne peut pas** s’auto-ajouter.
- SQL : [`sql/odyssey_p13_hq_allowlist.sql`](sql/odyssey_p13_hq_allowlist.sql).

**Interdit :**

- `ODYSSEY_OPERATORS` ou tout env d’e-mails / UUID.
- `user_metadata` / `app_metadata` comme gate.
- Un rôle `admin` dans `tenant_members`.
- `partner_staff`.

**Provision :** créer le user Auth à la main → `INSERT INTO hq_allowlist` (voir bandeau du SQL P13). Pas d’inscription publique `/hq`. Table vide = personne n’entre.

APIs HQ (slices B+) : session → `isListedOnHqAllowlist` → **ensuite** client admin (`service_role`). Jamais de `SELECT *` HQ sans cette gate.

---

## 3. Hiérarchie des vues (lecture)

Les formules **ne se dupliquent pas**. HQ **agrège** ce que Salon calcule déjà. Canon chiffres : [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md).

### 3.1 Réseau (macro) — `/hq`

Tous les tenants `is_freemium !== false`, ledger `status = confirmed`.

| KPI | Formule | Note |
|-----|---------|------|
| **GMV total** | `SUM(gross_payment_cents)` des `commission_accrual` | Brut Soft Cap familles. Pas la commission. |
| **Part salon (30 %)** | `SUM(commission_cents)` | 30 % du **Net Distribuable**. |
| **Revenus nets Odyssey (70 %)** | `SUM(net_distributable_cents − commission_cents)` | = `odyssey_margin_cents`. C’est le 70 % **après** la part salon. |
| **Platform Fee** | `SUM(platform_fee_cents)` | 10 % du brut. **À part** du 70 % Net — ne pas les fusionner dans un seul chiffre. |
| **Conversion globale** | invitations distinctes avec `commission_accrual` confirmé / invitations envoyées | 0 envoi → 0 %. Pas les contributions invité. |

Ouverture réseau (`accepted / sent`) = secondaire, même dénominateur que le Salon.

**Pas** de CTA versement sur la macro. **Pas** le détail d’une famille (e-mails en clair).

### 3.2 Tenant (micro) — liste puis clic

**Liste** des salons :

| Colonne | Source |
|---------|--------|
| Nom / slug | `tenants` |
| Accrued | `partner_commission_balances.accrued_cents` |
| Payable (à verser) | `accrued_cents − paid_cents` — `payableCents()` déjà en code |
| Paid | `paid_cents` |

**Vocabulaire — ne pas confondre :**

| Mot HQ / ops | Colonne SQL | Rôle |
|--------------|-------------|------|
| **Payable** (« en attente de virement Odyssey ») | `accrued − paid` | Cible du bouton **Marquer comme payé** |
| **Pending** (carte Salon aujourd’hui) | `pending_cents` | Disputes / clearing / accruals non confirmés. **Ne pas** le remettre à zéro par un payout |

Le mot « Pending » du brief ops = **payable**, pas `pending_cents`.

**Au clic** : vue **miroir** de `/salon/commissions` pour **ce** `tenant_id` — mêmes KPIs (accrued / pending_cents / paid, GMV, ouverture, conversion) + ledger. Ce que voit le `partner_admin` du salon, sans le CTA « Demander un versement » (disabled côté Salon). HQ a le bouton payout à la place.

**C.3 Directeurs :** sous le ledger, scoreboard par `invited_by_user_id` (mêmes formules que `aggregateMyPerformance` / Mes performances). Montant = commission salon **attribuée** aux liens — pas un payable conseiller. Odyssey verse le salon. Pas d’e-mail famille, pas d’impersonation, pas de relance HQ.

---

## 4. Action de payout (écriture)

Odyssey verse **hors Stripe** (virement / chèque). HQ **enregistre** le fait, il ne déclenche pas un paiement carte.

### Bouton « Marquer comme payé »

- Visible seulement sur la fiche tenant, si `payable_cents > 0`.
- Confirmation : montant = **tout le payable** du tenant (V1, pas de paiement partiel).
- Acteur = `auth.uid()` de l’opérateur HQ (audit).

### Effet ledger (canon RevShare)

```text
INSERT partner_commission_ledger
  reason = payout
  delta_cents = −payable_cents
  actor_user_id = opérateur HQ
  tenant_id = salon

UPDATE partner_commission_balances
  paid_cents += payable_cents
```

Résultat : **payable → 0**. Accrued **inchangé** (cumul généré). Paid augmente. `pending_cents` **inchangé**.

RPC cible déjà spécifiée, pas encore branchée UI :

```text
record_partner_commission_payout(
  p_tenant_id, p_amount_cents, p_actor_user_id, p_notes
)
```

Slice C : exposer cette RPC (ou l’implémenter si absente en SQL) derrière `POST /api/hq/tenants/[id]/payout`, gate `isListedOnHqAllowlist`.  
Idempotence : un seul payout concurrent par tenant (lock ligne solde). Notes libres (réf. virement).

**Interdit V1 :** Stripe Connect, adjustment libre sans ticket, payout d’un montant > payable, payout depuis un compte `partner_admin`.

---

## 5. Ce que HQ ne fait pas (V1)

- Impersonner une famille, un directeur, ou ouvrir le wizard.
- Envoyer la relance à la place du directeur (le clic reste Salon).
- Drip e-mail, cron, invitation initiale automatique.
- Éditer prix, forfaits, `grantedPackage`.
- Flag `viral_loop_enabled` (runbook ops existant, pas HQ).

---

## 6. Plan de match — slices

Ordre strict. Pas de Slice N+1 tant que N n’est pas mergé. Docs de ce fichier + [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) + changelog STATUS **dans le même commit** que le code.

### Slice A — Auth HQ

**Done when :** un `user_id` dans `hq_allowlist` se connecte sur `/fr/hq/connexion` (sans inscription) et voit le shell HQ. Hors table → `/{lang}` (middleware) ou `/salon` (layout, si partenaire). SQL P13 appliqué. Pas d’env.

Hors slice : aucun chiffre, aucun payout.

### Slice B — Dashboard macro ✅

**Done when :** `/hq` affiche GMV, part salon 30 %, revenus Odyssey 70 % du Net, Platform Fee, conversion globale. Chiffres = agrégats SQL des mêmes raisons ledger que le Salon. Tests : 0 tenant → 0 % ; un accrual Héritage 179 $ → GMV 17 900 ¢, commission 4 833 ¢, marge Odyssey 11 277 ¢, fee 1 790 ¢.

**Livré :** `GET /api/hq/overview` · `src/lib/hq/hqNetworkOverview.ts` · cartes KPI sur `/hq` · `tests/business/hq-network-overview.test.ts`.

Hors slice : liste salons, payout.

### Slice C — Dashboard micro & payout ✅

**Done when :**

1. Table des tenants (nom, invitations, conversion, payable).
2. **Marquer comme payé** → RPC `record_partner_commission_payout` + ligne `payout` ; payable = 0 ; 403 si non-opérateur ; 409 si payable = 0.

**Livré :** `GET /api/hq/tenants` · `POST /api/hq/tenants/[id]/payout` · `HqSalonTable` · SQL P14 · `tests/business/hq-tenant-payout.test.ts`.

Hors slice : fiche `/hq/salons/[tenantId]`, drill conseiller, adjustments.

### Slice C.1 — Tabs verticales ✅

**Done when :** le tableau micro se filtre par `tenants.vertical` (tabs). Les 3 cartes macro restent **réseau entier**. Payout toujours par tenant.

**Livré :** SQL P14.2 · `normalizeHqVertical` · tabs dans `HqSalonTable`.

Hors slice : fiche salon, drill directeur.

### Slice C.2 — Fiche salon ✅

**Done when :** clic sur un salon → `/hq/salons/[tenantId]` = miroir `/salon/commissions` (accrued / pending / paid, GMV, ouverture, conversion, ledger) + **Marquer comme payé** (même RPC P14). 404 si tenant hors freemium.

**Livré :** `GET /api/hq/tenants/[id]` · `HqSalonDetailView` · `loadPartnerCommissionDashboard` (partagé avec Salon).

Hors slice : drill directeur (C.3).

### Slice C.3 — Drill directeurs ✅

**Done when :** la fiche salon liste les conseillers (`invited_by_user_id`) avec les mêmes taux que Mes performances. Pas de payable, pas d’e-mail famille, pas d’impersonation, pas de relance HQ.

**Livré :** `src/lib/hq/hqDirectors.ts` · `HqDirectorsTable` · `tests/business/hq-directors.test.ts`.

Hors slice : formulaire `/partners` (Slice D).

### Slice D — Formulaire `/partners` ✅

**Done when :** le formulaire marketing **envoie** (plus `noValidate` mort). Lead stocké (table simple ou e-mail seul). Courriel interne HQ selon [`COMMUNICATIONS_MVP.md`](COMMUNICATIONS_MVP.md) § lead. Pas de création auto de tenant.

**Livré :** `POST /api/partners/lead` · SQL P15 `partner_leads` · `PartnersLeadForm` · alerte Resend (`ODYSSEY_HQ_LEAD_EMAIL`). Honeypot + 3 envois / 15 min / e-mail.

Hors slice : CRM, onboarding Salon automatique, accusé auto vers le salon.

---

## 7. Fichiers

| Fichier | Slice |
|---------|-------|
| `app/[lang]/hq/connexion/page.tsx` | A |
| `app/[lang]/(hq)/hq/layout.tsx` | A |
| `app/[lang]/(hq)/hq/page.tsx` | A (shell) · B (KPI réseau) |
| `app/[lang]/(hq)/hq/components/HqOverviewDashboard.tsx` | B |
| `src/lib/hq/hqNetworkOverview.ts` | B |
| `middleware.ts` | A (gate `/hq`) |
| `src/lib/hq/isOdysseyOperator.ts` | A |
| `docs/sql/odyssey_p13_hq_allowlist.sql` | A |
| `app/api/hq/overview/route.ts` | B |
| `app/api/hq/tenants/route.ts` | C |
| `app/api/hq/tenants/[id]/payout/route.ts` | C |
| `app/[lang]/(hq)/hq/components/HqSalonTable.tsx` | C |
| `src/lib/hq/hqTenantsList.ts` | C |
| `src/lib/hq/requireHqOperator.ts` | B · C |
| `docs/sql/odyssey_p14_2_hq_tenants_vertical.sql` | C.1 |
| `app/[lang]/(hq)/hq/salons/[tenantId]/page.tsx` | C.2 · C.3 |
| `src/lib/hq/hqDirectors.ts` | C.3 |
| `app/[lang]/(hq)/hq/components/HqDirectorsTable.tsx` | C.3 |
| `tests/business/hq-directors.test.ts` | C.3 |
| `app/api/hq/tenants/[id]/route.ts` | C.2 |
| `app/api/partners/lead/route.ts` | D |
| `docs/sql/odyssey_p15_partner_leads.sql` | D |
| `src/lib/partners/partnerLead.ts` | D |
| `src/lib/email/sendPartnerLeadEmail.ts` | D |
| `app/[lang]/partners/PartnersLeadForm.tsx` | D |
| `tests/business/partner-lead.test.ts` | D |

Noms anglais dans le code. Copy HQ FR/EN dans les dictionnaires.

---

## 8. Maintenance

Toute évolution auth HQ, KPI macro, ou payout → **ce fichier** + [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) si le ledger change + [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md).  
Copy e-mails → [`COMMUNICATIONS_MVP.md`](COMMUNICATIONS_MVP.md), pas ici.
