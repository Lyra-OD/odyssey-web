# Odyssey — RevShare partenaire (Partner Commission)

**Last updated: June 2026 · Version: B2B2C v2**

Document canonique pour la **commission partenaire 30 %** sur les paiements famille (canal freemium), le ledger `partner_commission_*`, l’idempotence webhook Stripe, le clawback, et le **payout manuel mensuel**.

Complète [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) · schéma cible P6 : [`sql/odyssey_p6_freemium_revshare.sql`](sql/odyssey_p6_freemium_revshare.sql) *(à créer)*.

---

## Périmètre

| Contexte | RevShare |
|----------|----------|
| **B2B2C freemium** (`tenants.is_freemium = true`) · famille paie via Stripe | **Oui** — 30 % du brut |
| **B2C direct** (sans invitation partenaire) | **Non** |
| **B2B2C legacy jetons** (`is_freemium = false`) | **Non** (v1) |
| **B2B partner** (débit jetons funérarium) | **Non** |

**Base de calcul CEO (figée) :** montant **brut Stripe** (`checkout.session.amount_total`) — forfait upsell **+ extensions à la carte** incluses dans la session.

**Taux default :** 30 % (`commission_rate_bps = 3000`). Override par tenant : `tenants.settings.revshare_bps`.

---

## Modèle de données (P6)

### Séparation jetons / commissions

```text
partner_token_wallets + partner_token_ledger     → legacy jetons (P4/P5.5)
partner_commission_balances + partner_commission_ledger  → RevShare v2 (P6)
```

**Ne jamais** enregistrer des commissions en jetons ni des débits jetons en centimes.

---

### `partner_commission_balances`

Solde agrégé par tenant — **1 ligne par partenaire**.

| Colonne | Type | Rôle |
|---------|------|------|
| `tenant_id` | uuid PK | FK → `tenants.id` |
| `accrued_cents` | integer ≥ 0 | Total commissions **confirmées** (somme ledger `commission_accrual` confirmées) |
| `paid_cents` | integer ≥ 0 | Total **versé** au partenaire (somme ledger `payout`) |
| `pending_cents` | integer ≥ 0 | Montant en attente (disputes, clearing, accruals `pending`) |
| `updated_at` | timestamptz | Dernière mutation |

**Solde payable (UI admin)** :

```text
payable_cents = accrued_cents - paid_cents - pending_cents_clawed
```

*(Affiner en implémentation : `pending_cents` peut inclure accruals non encore `confirmed`.)*

---

### `partner_commission_ledger`

Journal **append-only** — source de vérité audit.

| Colonne | Type | Rôle |
|---------|------|------|
| `id` | uuid PK | |
| `tenant_id` | uuid NOT NULL | Partenaire bénéficiaire |
| `tribute_checkout_id` | uuid | FK → `tribute_checkouts.id` |
| `project_id` | uuid | Hommage |
| `invitation_id` | uuid | Canal acquisition (nullable) |
| `reason` | text | Voir [§ Raisons ledger](#raisons-ledger) |
| `delta_cents` | integer | **+** accrual · **−** clawback / payout |
| `gross_payment_cents` | integer | Base calcul (= `amount_total` Stripe au moment de l’accrual) |
| `commission_rate_bps` | integer | Taux figé (ex. 3000) |
| `commission_cents` | integer | Montant absolu commission (≥ 0) |
| `stripe_event_id` | text | **Idempotence webhook** |
| `stripe_payment_intent_id` | text | Réconciliation Stripe |
| `stripe_charge_id` | text | Remboursements / disputes |
| `status` | text | `pending` \| `confirmed` \| `reversed` |
| `actor_user_id` | uuid | Payout manuel admin (nullable) |
| `notes` | text | Référence virement, ticket ops |
| `metadata` | jsonb | Détail line items, forfait, extensions |
| `created_at` | timestamptz | |

#### Raisons ledger

| `reason` | `delta_cents` | Déclencheur |
|----------|---------------|-------------|
| `commission_accrual` | **+** | Webhook `checkout.session.completed` |
| `commission_clawback` | **−** | `charge.refunded`, dispute lost, session expirée post-paiement |
| `payout` | **−** | Versement manuel admin Odyssey |
| `adjustment` | ± | Correction ops (super admin, ticket tracé) |

---

### Index & contraintes critiques

```sql
-- Une seule accrual par checkout
CREATE UNIQUE INDEX idx_commission_ledger_unique_accrual
  ON public.partner_commission_ledger (tribute_checkout_id)
  WHERE reason = 'commission_accrual';

-- Idempotence webhook Stripe
CREATE UNIQUE INDEX idx_commission_ledger_stripe_event
  ON public.partner_commission_ledger (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX idx_commission_ledger_tenant_created
  ON public.partner_commission_ledger (tenant_id, created_at DESC);
```

---

### Enrichissements `tribute_checkouts` (P6)

| Colonne | Rôle |
|---------|------|
| `commission_cents` | Snapshot commission calculée |
| `commission_rate_bps` | Taux appliqué |
| `commission_status` | `none` \| `accrued` \| `clawed_back` \| `paid` |

---

## Formule de calcul

```text
commission_cents = floor(gross_payment_cents × commission_rate_bps / 10000)
```

| Exemple | Brut Stripe | Taux | Commission |
|---------|-------------|------|------------|
| Upsell Héritage seul | 14 900¢ (149 $) | 30 % | **4 470¢** (44,70 $) |
| Upsell Éternité seul | 29 900¢ (299 $) | 30 % | **8 970¢** (89,70 $) |
| Héritage + Retouche IA (49 $) | 19 800¢ | 30 % | **5 940¢** (59,40 $) |

**Règles :**

- `gross_payment_cents` = **`session.amount_total`** Stripe (centimes, devise session)
- Inclut **forfait + extensions** dans la même Checkout Session
- **Pas** de commission sur checkout `family_total_cents = 0` (Souvenir gratuit)
- **Pas** de commission B2C direct (`checkout_mode = b2c` ou absence `tenant_id` partenaire éligible)
- Arrondi **floor** vers le bas (centimes entiers)

---

## Machine à états — commission

Deux niveaux : **checkout** (`tribute_checkouts.commission_status`) et **ligne ledger** (`partner_commission_ledger.status`).

### `tribute_checkouts.commission_status`

```mermaid
stateDiagram-v2
  [*] --> none: checkout créé (0$ ou non éligible)
  none --> accrued: webhook completed + accrual OK
  accrued --> paid: payout mensuel admin
  accrued --> clawed_back: refund / dispute
  clawed_back --> accrued: ré-accural interdit (sauf adjustment)
  paid --> [*]
```

| Statut | Signification |
|--------|---------------|
| `none` | Pas de commission (gratuit, B2C, legacy jetons) |
| `accrued` | Commission confirmée en ledger |
| `clawed_back` | Clawback appliqué (total ou partiel) |
| `paid` | Incluse dans un payout mensuel |

### `partner_commission_ledger.status`

| Statut | Usage |
|--------|-------|
| `pending` | Accrual en attente clearing (dispute ou traitement async) — **Phase 2** |
| `confirmed` | Ligne définitive, compte dans `accrued_cents` |
| `reversed` | Ligne annulée par clawback ou correction |

**Phase 1 (MVP) :** accrual directement `confirmed` sur `checkout.session.completed`.

---

## Accrual — webhook `checkout.session.completed`

### Principe

> **La commission n’est jamais créée au POST `/api/checkout`.**  
> Uniquement après confirmation Stripe via webhook.

### Séquence

```mermaid
sequenceDiagram
  participant S as Stripe
  participant WH as POST /api/stripe/webhook
  participant RPC as accrue_partner_commission_for_checkout
  participant DB as partner_commission_ledger

  S->>WH: checkout.session.completed (event id evt_xxx)
  WH->>WH: Vérifier signature Stripe
  WH->>WH: Idempotence globale webhook_events (lock evt_xxx)
  WH->>DB: SELECT tribute_checkouts BY metadata.checkout_id
  WH->>WH: Éligibilité (b2b2c_family + is_freemium + amount_total > 0)
  WH->>RPC: accrue(checkout_id, gross, rate_bps, evt_xxx)
  RPC->>DB: INSERT commission_accrual (si UNIQUE OK)
  RPC->>DB: UPDATE balances.accrued_cents
  RPC->>DB: UPDATE tribute_checkouts.commission_status = accrued
```

### Idempotence (3 niveaux)

| Niveau | Mécanisme |
|--------|-----------|
| **1. Webhook global** | Table `webhook_events` — lock `stripe_event_id` (pattern existant catalog sync) |
| **2. Ledger** | UNIQUE `stripe_event_id` sur `partner_commission_ledger` |
| **3. Métier** | UNIQUE `tribute_checkout_id` WHERE `reason = commission_accrual` |

**Comportement double webhook :**

1. Premier `evt_123` → accrual créée · HTTP 200
2. Second `evt_123` → no-op · HTTP 200 (Stripe ne retente pas indéfiniment)

**Comportement retry après accrual existante :**

- Si `commission_accrual` déjà présente pour `checkout_id` → retourner `{ ok: true, already_accrued: true }`

### Métadonnées Stripe requises (Checkout Session)

```json
{
  "checkout_id": "uuid",
  "project_id": "uuid",
  "tenant_id": "uuid",
  "checkout_mode": "b2b2c_family"
}
```

### RPC cible

```sql
accrue_partner_commission_for_checkout(
  p_checkout_id uuid,
  p_gross_payment_cents integer,
  p_stripe_event_id text,
  p_stripe_payment_intent_id text,
  p_commission_rate_bps integer DEFAULT 3000
) RETURNS jsonb
```

**Exécutable par :** `service_role` uniquement.

---

## Clawback — remboursements & disputes

### Événements Stripe déclencheurs

| Événement | Action |
|-----------|--------|
| `charge.refunded` | Clawback **au prorata** du montant remboursé |
| `charge.dispute.created` | Passer accrual en `pending` ou clawback provisionnel (Phase 2) |
| `charge.dispute.closed` (lost) | Clawback définitif |
| `checkout.session.expired` | **Pas** de clawback si jamais payé · clawback si remboursement post-paiement uniquement |

### Formule clawback partiel

```text
clawback_cents = floor(refunded_cents × commission_rate_bps / 10000)
```

Exemple : remboursement 50 % de 149 $ → clawback 50 % de 44,70 $ = **22,35 $**.

### RPC cible

```sql
clawback_partner_commission(
  p_checkout_id uuid,
  p_clawback_cents integer,
  p_stripe_event_id text,
  p_reason text DEFAULT 'refund'
) RETURNS jsonb
```

**Effets :**

1. `INSERT partner_commission_ledger` (`reason = commission_clawback`, `delta_cents` négatif)
2. `UPDATE partner_commission_balances` (`accrued_cents -= clawback`)
3. `UPDATE tribute_checkouts.commission_status = clawed_back` (si clawback total)

**Idempotence :** UNIQUE `(stripe_event_id)` pour chaque clawback event.

---

## Payout manuel mensuel (Phase 1)

Odyssey **ne verse pas** automatiquement via Stripe Connect en Phase 1. Processus ops **mensuel** par administrateurs Odyssey.

### Calendrier

| Étape | Quand |
|-------|-------|
| Accrual continu | À chaque webhook `completed` |
| Cut-off mensuel | Dernier jour ouvré du mois · 23:59 UTC |
| Revue admin | J+1 à J+3 |
| Virement partenaire | J+5 (virement bancaire / chèque — hors scope technique) |
| Enregistrement payout | Admin enregistre le versement dans le ledger |

### RPC payout

```sql
record_partner_commission_payout(
  p_tenant_id uuid,
  p_amount_cents integer,
  p_actor_user_id uuid,
  p_notes text DEFAULT NULL
) RETURNS jsonb
```

**Effets :**

1. Vérifier `amount_cents <= payable_cents`
2. `INSERT partner_commission_ledger` (`reason = payout`, `delta_cents = -amount`)
3. `UPDATE partner_commission_balances.paid_cents += amount`
4. Marquer checkouts concernés `commission_status = paid` *(stratégie : FIFO par `completed_at` ou lien explicite dans `metadata`)*

### RBAC UI (cible)

| Rôle | Accès |
|------|-------|
| `partner_admin` | Lecture solde + historique ledger (son tenant) |
| `partner` (Directeur) | **Aucun** accès commissions (aligné P5.5 wallet) |
| Super Admin Odyssey | Payout + adjustments |

---

## Requêtes SQL de vérification (QA)

### Solde tenant

```sql
SELECT tenant_id, accrued_cents, paid_cents, pending_cents,
       accrued_cents - paid_cents AS payable_cents
FROM partner_commission_balances
WHERE tenant_id = :tenant_id;
```

### Dernières lignes ledger

```sql
SELECT created_at, reason, delta_cents, gross_payment_cents,
       commission_cents, stripe_event_id, status
FROM partner_commission_ledger
WHERE tenant_id = :tenant_id
ORDER BY created_at DESC
LIMIT 20;
```

### Cohérence checkout ↔ commission

```sql
SELECT tc.id, tc.family_total_cents, tc.commission_cents, tc.commission_status,
       l.commission_cents AS ledger_commission, l.stripe_event_id
FROM tribute_checkouts tc
LEFT JOIN partner_commission_ledger l
  ON l.tribute_checkout_id = tc.id AND l.reason = 'commission_accrual'
WHERE tc.project_id = :project_id;
```

---

## Anti-patterns interdits

| ❌ Interdit | ✅ Correct |
|-----------|-----------|
| Accrue commission au POST checkout | Webhook `completed` uniquement |
| Base nette Stripe (après frais) | **Brut** `amount_total` |
| Double accrual même checkout | UNIQUE `tribute_checkout_id` + idempotence event |
| Commission sur B2C direct | Vérifier `checkout_mode` + `invitation_id` + `is_freemium` |
| Payout sans ligne ledger | Toujours `INSERT payout` + `actor_user_id` |
| Mélanger jetons et centimes | Ledgers séparés |

---

## État d'implémentation

| Composant | Statut |
|-----------|--------|
| Doc canonique (ce fichier) | ✅ |
| Migration SQL P6 | ⏳ |
| RPC accrue / clawback / payout | ⏳ |
| Webhook handler `checkout.session.completed` | ⏳ |
| Webhook handler `charge.refunded` | ⏳ |
| UI Salon commissions (`partner_admin`) | ⏳ |
| Payout admin Odyssey | ⏳ |
| Stripe Connect auto-payout | 🔮 Phase 2 |

---

## Documents liés

| Document | Rôle |
|----------|------|
| [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) | Saga v2, éligibilité RevShare |
| [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) | Grille forfaits, extensions commissionnables |
| [`sql/README.md`](sql/README.md) | Ordre migrations P6 |
| [`QA_P5_5_PARTNER_SALON.md`](QA_P5_5_PARTNER_SALON.md) | QA wallet legacy (distinct commissions) |

---

## Quand modifier ce document

Toute évolution de : taux RevShare, base de calcul, statuts commission, clawback, payout, ou schéma ledger → mettre à jour **ce fichier**, [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md), et [`sql/odyssey_p6_freemium_revshare.sql`](sql/odyssey_p6_freemium_revshare.sql).
