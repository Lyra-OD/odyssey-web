# Odyssey — Plan d'implémentation : Boucle Virale / Fonds Commémoratif (Cascade V-Final)

**Statut : APPROUVÉ CEO (21 juillet 2026) · exécution en cours (Phase 1 Data Layer).**

Document canonique d'implémentation de la **Boucle Virale (Fonds Commémoratif)** et du pivot
d'entrée émotionnelle (Brouillon gratuit → paywall à l'export financé par les contributions
invités). Prime sur les intentions Phase 2 de [`VISION_PHASE_2.md`](VISION_PHASE_2.md) §2.2
lorsqu'il y a conflit. Aligné canon [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md).

Docs liés : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) · [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) ·
[`sql/README.md`](sql/README.md) · [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md).

---

## 0. Décisions verrouillées (CEO)

| # | Décision | Valeur figée |
|---|----------|--------------|
| Principe | Attachement émotionnel d'abord, prix ensuite | Brouillon gratuit tous canaux ; paywall au pic |
| B2B2C | Construit gratuit, export Souvenir 0 $ **ou** upgrade | inchangé (Soft Cap) |
| B2C | Construit gratuit (brouillon), **paywall strict à l'export (min 149 $)**, preview basse résolution / filigranée | **écrase** l'ancien « zéro gratuit » B2C |
| Fork 1 | Modèle **accrétif** : l'invité achète SA valeur (Support Pack) ; Odyssey convertit un % du Net en crédit famille | Option A |
| Fork 2 | **Cascade Waterfall** : P1 forfait de base → P2 auto-élévation → P3 add-ons physiques | Option A + cascade |
| Fork 3 | Posture **agressive** (crédit peut amener la famille à **0 $**) ; archi **configurable** | `fundConversionRate` + `ownerFloor` |
| Règlement | `fundConversionRate = 1.0` (100 % du Net Distribuable). Le crédit dépasse la part cash Odyssey : **absorbé** (coût marginal de livraison ≈ 0 $). **Jamais** de clawback de la commission d'Athos hors remboursement Stripe réel. |
| Rider | Même à un export **0 $**, le flux famille EXIGE compte (nom, courriel, mot de passe) + consentement. |
| LTV Phase 3 | `commemoration_date` sur `projects` dès la V1 + capture email/consent invités → cron Jour-365. |

### Waterfall par micro-transaction invité

```
Contribution invité (ex. 49 $)
  → Platform Fee Odyssey 10 %  (exclusif Odyssey · Stripe/serveur)
  → Net Distribuable 90 %
        → Commission Athos 30 % du Net   (partner_commission_ledger · guest_commission_accrual)
        → Marge Odyssey 70 % du Net
  → Fonds Commémoratif affiché à la famille = Net Distribuable × fundConversionRate (défaut 1.0)
```

Le **Fonds Commémoratif** est un **crédit** (remise) appliqué au paywall famille. Il est **porté par
Odyssey** (subvention d'acquisition), n'est jamais inférieur au Net Distribuable réellement versé par
les invités (garantie anti-scandale PR), et ne réduit **jamais** la commission cash d'Athos.

### Catalogue Support Packs (V1 — Quiet Luxury, panier cible 50 $)

| `product_key` | Nom | Prix |
|---------------|-----|------|
| `guest_hd` | Pack Soutien Numérique (Copie HD) | 49 $ |
| `guest_heritage` | Pack Héritage (HD + Version Sociale + Page Livre d'or) | 89 $ |
| `guest_candle` | Bougie Commémorative Digitale (friction basse) | 15 $ |

### Anti-abus

- **Auto-contribution AUTORISÉE** (un proche peut booster le fonds avec sa propre carte).
- **Plafond dur par transaction** : `gross_cents ≤ 100000` (1000 $) + velocity check Stripe de base
  sur la page publique `/contribute/[token]`.

---

## 1. Principe non-cassant (fil rouge)

1. **Additif uniquement** : colonnes/tables `IF NOT EXISTS`, **nouvelles** RPC (jamais modifier
   `compute_revenue_waterfall` ni `accrue_partner_commission_for_checkout`).
2. **Feature flag par tenant** : `tenants.settings.viral_loop_enabled` (défaut `false`). Off ⇒ flux
   B2B2C/B2C actuels strictement inchangés.
3. **Isolation webhook** : nouvelle branche `checkout_mode = 'guest_support'`. Les branches
   `b2b2c_family` et `b2c` ne sont pas touchées.
4. **Backend autoritaire** : le crédit du Fonds n'est **jamais** calculé côté client.

---

## 2. Phase 1 — Data Layer (Supabase)

Migration : **`docs/sql/odyssey_p10_memorial_fund.sql`** (idempotente). Prérequis : P6, P6.1, P8.

| Objet | Action |
|-------|--------|
| `projects.commemoration_date` / `date_of_passing` (`date`) + index partiel | **ADD** — arme le cron Jour-365 |
| `tenants.settings` : `fund_conversion_bps` (10000), `owner_floor_cents` (0), `viral_loop_enabled` (false) | **SEED merge** (jsonb, non destructif) |
| `guest_micro_checkouts` : `contributor_name`, `platform_fee_bps/cents`, `net_distributable_cents`, `commission_cents`, `commission_rate_bps`, `fund_credit_cents`, `project_access_token_id`, `consent_marketing` | **ADD** + cap `gross_cents ≤ 100000` |
| `family_tribute_fund_balances.consumed_cents` | **ADD** — modèle crédit (accrued = généré, consumed = appliqué, paid = payout legacy inutilisé V1) |
| `partner_commission_ledger.guest_micro_checkout_id` + reason `guest_commission_accrual`/`guest_commission_clawback` | **ADD** + étendre CHECK — ⚠️ **inversion garde-fou** |
| `family_tribute_fund_ledger` reason `credit_applied`/`credit_reversal` | **étendre CHECK** |
| RLS `family_tribute_fund_balances` SELECT owner | **ADD policy** — thermomètre UI |

**Nouvelles RPC (Phase 2, aucune existante modifiée) :**
- `accrue_guest_micro_checkout(...)` — waterfall → commission Athos + allocation crédit fonds. Idempotent `stripe_event_id`.
- `consume_family_fund_credit(...)` — applique `min(disponible, prix − ownerFloor)` à l'export.

---

## 3. Phase 2 — Core Logic & API

| Élément | Fichier (cible) | Rôle |
|---------|-----------------|------|
| **ChannelProfile** | `src/lib/wizard/channelProfile.ts` (new) | Source unique : channel, grantedPackage, allowedPackages, anchorPackage, freeExport, previewMode, viralLoop |
| Fix init | `app/api/projects/draft` | Écrit granted/intended depuis ChannelProfile → **fin du fallback Éternité 299 $** |
| **Cascade** | `src/lib/wizard/memorialFund.ts` (new, pur) | `computeCascade()` : P1 forfait → P2 auto-élévation → P3 add-ons |
| Support Packs | `src/lib/wizard/guestSupportPacks.ts` (new) | Catalogue TS (prix inline `price_data`, comme `/api/checkout`) |
| Page invitée | `app/api/contribute/[token]/route.ts` (new) | Valide token, expose catalogue |
| Checkout invité | `app/api/contribute/[token]/checkout/route.ts` (new) | Crée `guest_micro_checkouts` + session Stripe `guest_support` + email/consent |
| Webhook | `app/api/stripe/webhook/route.ts` | **Nouvelle branche** `guest_support` → `accrue_guest_micro_checkout` ; activer `charge.refunded` |
| Checkout famille | `app/api/checkout/route.ts` | `consume_family_fund_credit` avant Stripe ; Rider compte+consent même à 0 $ |

**Tests :** conserver les 7 cas de `tests/business/revshare-waterfall.test.ts` ; ajouter `describe`
« Guest micro-checkout » (commission Athos sur contribution invité + `fund_credit = net × 1.0`) ;
nouveaux `memorialFund.cascade.test.ts`, `channelProfile.test.ts`.

---

## 4. Phase 3 — Frontend (UI / State)

| Composant | Action |
|-----------|--------|
| `TributeWizard.tsx` | Consomme `ChannelProfile` backend (remplace `planOverride`) ; `memorialFund` = snapshot lecture seule |
| `CheckoutStep.tsx` | Bloc **« Fonds Commémoratif »** : thermomètre, reste-à-payer, bannière auto-élévation ; réutilise l'UI amputation |
| Panneau « Inviter vos proches » | Génère lien `project_access_tokens` (`/[lang]/contribute/[token]`) |
| `app/[lang]/contribute/[token]/page.tsx` (new) | Page publique sans auth : achat Support Pack + email/consent |
| Flux export 0 $ | Écran Rider : création compte + consentement même quand reste = 0 $ |
| i18n fr/en | Thermomètre, auto-élévation, invitation, page contributeur, Rider |

---

## 5. Ce qu'on ne touche PAS

`compute_revenue_waterfall`, `accrue_partner_commission_for_checkout`, branches webhook
`b2b2c_family`/`b2c`, débit jetons (déjà à zéro — purge P8), les 7 tests RevShare existants.

---

## 6. Risques suivis

| Risque | Mitigation |
|--------|------------|
| Crédit > part cash Odyssey (rate 1.0) | Absorbé (coût marginal ≈ 0 $) ; monitorer marge/projet |
| Remboursement invité après export | Odyssey absorbe le crédit ; commission Athos clawbacked via Stripe |
| Abus cartes volées page publique | Cap 1000 $/txn + velocity Stripe |
| Loi 25 / consentement | `consent_records` : marketing séparé du transactionnel |
| Drift doc canon | MAJ VISION_PHASE_2 §2.2, SANCTUARY §3.3/§4, PROJECT_STATUS |

---

## 7. Phase 2 — Wiring livré (backend/API)

Tout est **gated par `tenants.settings.viral_loop_enabled`** (défaut `false`) ⇒ flux
B2B2C/B2C actuels strictement inchangés tant que le flag n'est pas activé.

| Surface | Fichier | Rôle |
|---------|---------|------|
| Catalogue | `src/lib/wizard/guestSupportPacks.ts` | Support Packs (HD 49 $, Héritage 89 $, Bougie 15 $) + cap 1000 $ |
| Token | `src/lib/contribute/contributeToken.ts` · `accessToken.ts` | Génération/hash SHA-256 + résolution (bypass RLS admin) |
| Lien invité | `POST /api/projects/[id]/contribute-link` | Owner génère un `project_access_tokens` (TTL 30 j) |
| Contexte public | `GET /api/contribute/[token]` | Hommage minimal + catalogue + fonds levé |
| Achat invité | `POST /api/contribute/[token]/checkout` | Crée `guest_micro_checkouts` + session Stripe `guest_support` + `consent_records` |
| Webhook | `app/api/stripe/webhook` | Branche `guest_support` → `accrue_guest_micro_checkout` (canal isolé) |
| Paywall famille | `app/api/checkout` | Preview crédit → **0 $ = consume inline** (`fund_free`) · **partiel = coupon Stripe** + consume au webhook |
| Tests | `tests/business/guest-waterfall.test.ts` · `memorial-fund-cascade.test.ts` | 19 tests (miroir RPC + cascade P1→P2→P3) |

**Décision — timing de consommation du crédit :** couverture 100 % (0 $) → `consume_family_fund_credit`
**inline** dans `/api/checkout` (finalisation immédiate, aucune fenêtre d'abandon).
Crédit **partiel** → remise via **coupon Stripe `amount_off`** et consommation committée au **webhook**
(paiement confirmé), idempotente par `tribute_checkout_id` (b2b2c) / `webhook_events` (b2c).
Métadonnées portées : `fund_credit_applied_cents`, `precredit_total_cents`, `owner_floor_cents`.

**Limitations connues (suivi) :**
- Réversion sur `checkout.session.expired` non branchée (le partiel consomme au webhook,
  donc pas de fuite ; le 0 $ inline est protégé par le garde `status = submitted`).
- Si des contributions arrivent **entre** la création du checkout et le paiement, le webhook
  peut consommer légèrement plus que le montant prévisualisé (borné à `precredit − floor`) —
  bénin, sans impact cash.
- Génération d'UI (panneau invitation, page `/[lang]/contribute/[token]`, Rider, thermomètre) = Phase 3.
