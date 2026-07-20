# QA — Waterfall commissions P6 (modèle Bulletproof)

**Dernière révision : juillet 2026**

Checklist de régression manuelle pour le **waterfall revenus** (Platform Fee 10 % → Net Distribuable → RevShare 30 %) avant et après implémentation webhook + RPC P6.1.

**Canon formules :** [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) · [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) § Modèle Bulletproof.

**Prérequis test :** tenant QA avec `is_freemium = true` · `platform_fee_bps = 1000` · `revshare_bps = 3000` (defaults) · checkout `b2b2c_family`.

---

## Formule de référence (ordre figé)

```text
Gross Volume           = session.amount_total (= family_total_cents snapshot)
Platform Fee           = floor(gross × platform_fee_bps / 10000)     — default 1000 (10 %)
Net Distribuable       = gross − platform_fee
Partner Commission     = floor(net_distributable × revshare_bps / 10000) — default 3000 (30 %)
Odyssey Margin         = net_distributable − partner_commission       — ≈ 63 % du brut
```

**Clawback partiel :**

```text
clawback_cents = floor(commission_cents_snapshot × refunded_cents / gross_payment_cents_snapshot)
```

---

## Scénarios obligatoires (5)

### S1 — Héritage seul (upsell freemium)

| Champ | Valeur attendue |
|-------|-----------------|
| Contexte | Souvenir offert → famille choisit **Héritage** |
| **Gross Volume** | **14 900¢** (149,00 $) |
| Platform Fee (10 %) | **1 490¢** |
| **Net Distribuable** | **13 410¢** |
| RevShare (30 % du Net) | **4 023¢** (40,23 $) |
| Odyssey Margin | **9 387¢** (93,87 $) |
| `commission_status` | `accrued` après webhook |
| Ledger | 1 ligne `commission_accrual` · `delta_cents = +4023` |

**Vérifications SQL :**

```sql
SELECT gross_payment_cents, platform_fee_cents, net_distributable_cents,
       commission_cents, commission_rate_bps, commission_status
FROM tribute_checkouts WHERE id = :checkout_id;

SELECT gross_payment_cents, net_distributable_cents, commission_cents, delta_cents
FROM partner_commission_ledger
WHERE tribute_checkout_id = :checkout_id AND reason = 'commission_accrual';
```

---

### S2 — Éternité seul (upsell freemium)

| Champ | Valeur attendue |
|-------|-----------------|
| Contexte | Souvenir offert → famille choisit **Éternité** |
| **Gross Volume** | **29 900¢** (299,00 $) |
| Platform Fee (10 %) | **2 990¢** |
| **Net Distribuable** | **26 910¢** |
| RevShare (30 % du Net) | **8 073¢** (80,73 $) |
| Odyssey Margin | **18 837¢** (188,37 $) |

---

### S3 — Héritage + Retouche IA (49 $)

| Champ | Valeur attendue |
|-------|-----------------|
| Contexte | Upsell Héritage + extension `aiRetouch` |
| **Gross Volume** | **19 800¢** (149 $ + 49 $) |
| Platform Fee (10 %) | **1 980¢** |
| **Net Distribuable** | **17 820¢** |
| RevShare (30 % du Net) | **5 346¢** (53,46 $) |
| Odyssey Margin | **12 474¢** (124,74 $) |

**Note :** le Gross inclut **forfait + extensions** dans la même session Stripe.

---

### S4 — Souvenir gratuit (0 $) — pas de commission

| Champ | Valeur attendue |
|-------|-----------------|
| Contexte | `granted_package = essential` · `selected_package = essential` · aucune extension payante |
| **Gross Volume** | **0¢** |
| Platform Fee | — |
| Net Distribuable | — |
| RevShare | **0¢** — RPC retourne `zero_gross_payment` |
| `commission_status` | `none` |
| Stripe | **Aucune** session · `status = completed` synchrone |
| Ledger | **Aucune** ligne `commission_accrual` |

---

### S5 — Remboursement partiel 50 % sur S1 (clawback)

| Champ | Valeur attendue |
|-------|-----------------|
| Prérequis | S1 complété · `commission_cents = 4023` · `gross_payment_cents = 14900` |
| `refunded_cents` (Stripe) | **7 450¢** (50 % du brut) |
| **Clawback** | `floor(4023 × 7450 / 14900)` = **2 011¢** (20,11 $) |
| Ledger | 1 ligne `commission_clawback` · `delta_cents = -2011` |
| `partner_commission_balances.accrued_cents` | −2011 par rapport à post-S1 |
| `commission_status` | `clawed_back` si remboursement total · sinon partiel (accrued avec solde réduit) |

**Idempotence :** rejouer le même `stripe_event_id` → no-op · HTTP 200.

---

## Scénarios complémentaires (recommandés)

| ID | Scénario | Gross | Net Distribuable | Commission |
|----|----------|-------|------------------|------------|
| S6 | B2C direct Héritage (pas de RevShare) | 14 900¢ | — | **0¢** · `checkout_mode = b2c` |
| S7 | ~~Legacy jetons~~ | — | — | **PURGED P8** — ne plus tester |
| S8 | Double webhook `checkout.session.completed` | S1 | — | **1 seule** accrual · seconde = `already_accrued` |

---

## Tableau d’impact — ancien vs Bulletproof

| Scénario | Brut | Ancien (30 % brut) | Bulletproof (10 % + 30 % Net) | Δ partenaire |
|----------|------|--------------------|-------------------------------|--------------|
| Héritage seul | 14 900¢ | 4 470¢ | **4 023¢** | −447¢ |
| Éternité seul | 29 900¢ | 8 970¢ | **8 073¢** | −897¢ |
| Héritage + Retouche | 19 800¢ | 5 940¢ | **5 346¢** | −594¢ |

---

## Checklist exécution QA

- [ ] **S1** — accrual webhook · snapshots `tribute_checkouts` cohérents
- [ ] **S2** — Éternité · montants ledger = tableau
- [ ] **S3** — extensions incluses dans Gross · commission sur Net Distribuable total
- [ ] **S4** — 0 $ · pas d’appel RPC accrual · pas de ligne ledger
- [ ] **S5** — clawback proportionnel · idempotence event refund
- [ ] **S6** — B2C · ledger commissions vide pour ce checkout
- [ ] **S8** — double `evt_xxx` · une seule accrual
- [ ] UI `partner_admin` — affiche waterfall (Gross / Fee / Net / Commission) — post-implémentation UI
- [ ] `prefers-reduced-motion` N/A (commerce)

---

## Anti-régressions

| ❌ Échec | Cause probable |
|---------|----------------|
| Commission = 30 % du brut | RPC P6 legacy non migrée P6.1 |
| `net_distributable` absent | Migration P6.1 non appliquée |
| Clawback = 30 % du refund brut | Formule clawback incorrecte |
| Commission sur checkout B2C | Éligibilité `b2b2c_family` + `is_freemium` non vérifiée |
| Accrual au POST checkout | Violation saga — webhook uniquement |

---

## Documents liés

| Document | Rôle |
|----------|------|
| [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) | Spec ledger + RPC |
| [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) | Commerce Soft Cap |
| [`_archive/QA_P5_5_PARTNER_SALON.md`](_archive/QA_P5_5_PARTNER_SALON.md) | **HIST** — ne plus exécuter |

---

*Checklist vivante — à exécuter après migration `odyssey_p6_1_bulletproof_waterfall.sql` et branche webhook.*
