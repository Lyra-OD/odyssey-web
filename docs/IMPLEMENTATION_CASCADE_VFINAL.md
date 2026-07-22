# Odyssey — Plan d'implémentation : Boucle Virale / Fonds Commémoratif (Cascade V-Final)

**Statut : APPROUVÉ CEO · Phase 1–2 ✅ · Phase 0 grille/UX Sanctuaire (22 juil. 2026) ✅ · Phase 3a Frontend ⏳**

Document canonique d'implémentation de la **Boucle Virale (Fonds Commémoratif)** et du pivot
d'entrée émotionnelle (Brouillon gratuit → paywall à l'export financé par les contributions
invités). Prime sur les intentions Phase 2 de [`VISION_PHASE_2.md`](VISION_PHASE_2.md) §2.2
lorsqu'il y a conflit. Aligné canon [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md).

Docs liés : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) · [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) ·
[`sql/README.md`](sql/README.md) · [`MONETIZATION_CATALOG.md`](MONETIZATION_CATALOG.md).

---

## 0. Décisions verrouillées (CEO)

| # | Décision | Valeur figée |
|---|----------|--------------|
| Principe | Attachement émotionnel d'abord, prix ensuite | Brouillon gratuit tous canaux ; paywall au pic |
| Framing | Laïc — immortaliser / partager / rendre virtuellement immortel | Pas de registre religieux |
| B2B2C | Construit gratuit, export Souvenir 0 $ **ou** upgrade | inchangé (Soft Cap) |
| B2C | Construit gratuit (brouillon), **paywall strict à l'export (min Héritage 179 $)**, preview filigranée | **écrase** l'ancien « zéro gratuit » B2C |
| Fork 1 | Modèle **accrétif** : l'invité achète SA valeur (empreinte) ; Odyssey convertit le Net en crédit famille | Option A |
| Fork 2 | **Cascade** : P1 forfait → P2 auto-élévation → P3 add-ons · Surplus = **plus de produit** (pas de cash-out) | Option A + cascade |
| Fork 3 | Posture **agressive** (crédit peut amener la famille à **0 $**) ; archi **configurable** | `fundConversionRate` + `ownerFloor` |
| Règlement | `fundConversionRate = 1.0` (100 % du Net). Crédit porté par Odyssey. **Jamais** clawback commission Athos hors remboursement Stripe. |
| Rider | Même à un export **0 $**, flux famille EXIGE compte + consentement. |
| Soft Cap médias | Médias **invités NE COMPTENT PAS** dans le quota 50 famille | Viral ≠ punition |
| Voix / Vidéo V1 | Promesse : **« soumis à la famille pour intégration dans l'œuvre finale »** | Pas de garantie absolue |
| Feature flag | `viral_loop_enabled` reste **`false`** en prod jusqu'à fin Phase 3a | Pilote ensuite |
| LTV | `commemoration_date` + email/consent invités → cron Jour-365 | Fondations dès V1 |

### Waterfall par micro-transaction invité

```
Contribution invité (ex. Voix 69 $)
  → Platform Fee Odyssey 10 %  (exclusif Odyssey · Stripe/serveur)
  → Net Distribuable 90 %
        → Commission Athos 30 % du Net   (si tenant is_freemium)
        → Marge Odyssey 70 % du Net
  → Fonds Commémoratif (crédit famille) = Net × fundConversionRate (défaut 1.0)
```

Le **Fonds** est un **crédit produit** (remise sur l'hommage), **jamais** un virement cash à la famille.

### Grille famille (Quiet Luxury accessible — Phase 0)

| Forfait | ID | Prix |
|---------|-----|------|
| Souvenir | `essential` | **0 $** |
| Héritage | `signature` | **179 $** |
| Éternité | `heritage` | **349 $** |
| Légendaire | `legendary` | **499 $** |

### Catalogue empreintes invitées (Sanctuaire — ordre UX)

| Ordre | `product_key` | Nom | Prix | Note |
|-------|---------------|-----|------|------|
| 1 | `guest_voice` | Voix dans le film | **69 $** | Ancre / cœur panier |
| 2 | `guest_video` | Témoignage filmé (live) | **119 $** | Staple cérémonie — caméra in-app |
| 3 | `guest_heritage` | Coproduction (HD + social + générique) | **129 $** | Statut |
| 4 | `guest_candle` | Geste / Bougie | **15 $** | Secondaire (jamais CTA #1) |
| 5 | `guest_patron` | Mécène (montant libre) | **150–1000 $** (suggestion **250 $**) | Asymétrie |
| — | `guest_hd` | Pack HD | ~~49 $~~ | **⚠️ DÉPRÉCIÉ** (cannibalise la voix) |

**Cible ARPU invité payant :** ~80–100 $ (ex-cible ~50 $).

### Mécène / Surplus (règle figée)

1. Waterfall normal (10 % + commission partenaire si freemium).
2. Crédit fonds = 100 % du Net → cascade P1→P2→P3.
3. **Surplus au-delà du panier max** = encore plus d'hommage / add-ons / solde crédit — **pas de cash-out**, pas de philanthropie V1 (P4 différé).
4. **Pas** de mini-% supplémentaire sur le « fonds » (marge = packs + 10 % plateforme uniquement).

### Anti-abus

- Auto-contribution **autorisée**.
- Plafond dur : `gross_cents ≤ 100000` (1000 $) + velocity Stripe.
- Plancher Mécène : **150 $**.
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
| Fix init | `app/api/projects/draft` | Écrit granted/intended depuis ChannelProfile → **fin du fallback Éternité 349 $** |
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

## 4. Phase 3 — Frontend & UX Sanctuaire

### Tunnel UX en 2 temps (figé)

```text
1. SANCTUAIRE D'ABORD (0 $)
   Invité arrive via contributeToken
   → dépose photo OU mot (+ nom, email, consent)  ← 1 geste rituel
   → option « aider la famille » : jusqu'à 5 photos / invité (total)
   → Phase 3b : option mini-clip fichier 15–30 s (max 1) — ≠ témoignage live
   → rôle « Présent » · cercle mis à jour
   → médias invités HORS Soft Cap 50 famille

2. EMPREINTE (payant, optionnel)
   Pont : « Entrez dans le film de la cérémonie »
   → catalogue ancré : Voix 69 → Témoignage filmé 119 → Coproduction 129
   → Bougie 15 (secondaire) · Mécène 150–1000
   → guest_video = enregistrement LIVE (tél. / webcam), pas upload galerie
   → Voix / témoignage / mini-clip : « soumis à la famille pour intégration »
   → crédit fonds → cascade famille (P1→P2→P3, surplus = produit)
```

**Plafonds (figés)** — `src/lib/contribute/sanctuaryLimits.ts` : 1 dépôt gratuit photo|mot · **5 photos max / invité** · **1 mini-clip ≤ 30 s** · pas de dump 20 photos sur lien public.

**Cérémonie (Jour J) :** projection — **zéro ask**.  
**Gamification :** rôles + cercle (pas de jauge $ côté invité).  
**Famille checkout :** reste-à-payer Fonds discret + Rider 0 $.

### Phase 3a — à coder (flag off jusqu'à done)

| Surface | Action |
|---------|--------|
| `app/[lang]/contribute/[token]/page.tsx` | **NEW** — Sanctuaire public (tunnel 2 temps) |
| `POST /api/contribute/[token]/deposit` (ou équivalent) | **NEW** — dépôt gratuit photo/mot (admin, `contributor_type=guest`) |
| `POST .../checkout` | **ADAPT** — Mécène `amountCents` 150–1000 |
| `GET .../contribute/[token]` | **ADAPT** — cercle (noms/count), pas $ invité |
| Panneau Inviter (Wizard) | **NEW** — `contribute-link` + QR + copy Immortaliser |
| `CheckoutStep.tsx` | **ADAPT** — Fonds + reste-à-payer + Rider 0 $ |
| i18n fr/en | Copy Sanctuaire / empreintes / cercle / Rider |

### Phase 3b+ (différé)

- Capture **voix** + **témoignage live** (`getUserMedia`, chrono court) pour packs payants  
- Upload **mini-clip** fichier 15–30 s (max 1 / invité) — aide montage, distinct du live  
- Enforce API plafonds photos (5) · upsell in-flow · relance email 24–48 h · End Credits · P4

---

## 5. Ce qu'on ne touche PAS

`compute_revenue_waterfall`, `accrue_partner_commission_for_checkout`, branches webhook
`b2b2c_family`/`b2c`, débit jetons (purge P8).

---

## 6. Risques suivis

| Risque | Mitigation |
|--------|------------|
| Crédit > part cash Odyssey (rate 1.0) | Absorbé (coût marginal ≈ 0 $) ; monitorer marge/projet |
| Remboursement invité après export | Odyssey absorbe le crédit ; commission Athos clawbacked via Stripe |
| Abus cartes volées page publique | Cap 1000 $/txn + velocity Stripe + plancher Mécène 150 $ |
| Loi 25 / consentement | `consent_records` : marketing séparé du transactionnel |
| Promesse voix/vidéo trop forte | Copy V1 : soumis à la famille |
| Drift doc canon | Pivot + Catalog + ce fichier = source prix/UX |

---

## 7. Phase 2 — Wiring livré (backend/API)

Tout est **gated par `tenants.settings.viral_loop_enabled`** (défaut `false`) ⇒ flux
B2B2C/B2C actuels strictement inchangés tant que le flag n'est pas activé **et** que la Phase 3a n'est pas terminée.

| Surface | Fichier | Rôle |
|---------|---------|------|
| Catalogue | `src/lib/wizard/guestSupportPacks.ts` | Empreintes 15/69/119/129 + Mécène 150–1000 · `guest_hd` déprécié |
| Prix famille | `src/lib/wizard/pricingConfig.ts` | 0 / **179** / **349** / 499 |
| Token | `src/lib/contribute/*` | Génération/hash + résolution |
| Lien invité | `POST /api/projects/[id]/contribute-link` | TTL 30 j |
| Contexte public | `GET /api/contribute/[token]` | Hommage + catalogue actif |
| Achat invité | `POST /api/contribute/[token]/checkout` | Stripe `guest_support` (Mécène amount = Phase 3a) |
| Webhook | `app/api/stripe/webhook` | `guest_support` → `accrue_guest_micro_checkout` |
| Paywall famille | `app/api/checkout` | Crédit inline 0 $ / coupon partiel |
| Tests | `tests/business/*` | Soft Cap · RevShare · guest waterfall · cascade |

**Décision — timing de consommation du crédit :** couverture 100 % (0 $) → `consume_family_fund_credit`
**inline** dans `/api/checkout`. Crédit **partiel** → coupon Stripe + consume au **webhook**.

**Limitations connues (suivi) :**
- UI Sanctuaire / Inviter / Fonds / Rider = **Phase 3a** (prochaine).
- Checkout Mécène montant libre = **Phase 3a** (bornes déjà dans `guestSupportPacks.ts`).
- Capture voix + témoignage live + mini-clip 30 s = **Phase 3b**.
- Enforce multi-photos (plafond 5) = fin **Phase 3a** ou début 3b.
