# Odyssey — Commerce B2B2C Freemium V1

**Last updated: 20 juillet 2026 · Freemium V1 (purge jetons)**

> **Canon :** [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Soft Cap : [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) · RevShare : [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) · Onboarding : [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md).  
> **Archive pré-purge :** [`_archive/B2B2C_COMMERCE_PRE_FREEMIUM_PURGE.md`](_archive/B2B2C_COMMERCE_PRE_FREEMIUM_PURGE.md) — ne plus onboards dessus.

Modèle **salon → famille** : Souvenir offert, Soft Cap, Stripe upsell, RevShare **30 % du Net Distribuable** (Platform Fee 10 %).

**Jetons wholesale / wallets = morts (P8).** Solde partenaire = `partner_commission_*` uniquement.

---

## 1. Canaux

| Mode | Qui | Paiement |
|------|-----|----------|
| `b2b2c_family` | Famille via invitation | Soft Cap delta (`granted` → `intended`) + add-ons · ou `freemium_free` (0 $) |
| `b2c` | Famille directe | Prix plein forfait + add-ons |
| `b2b_partner` | Conseiller Salon | Soumission projet (pas de wallet jetons) |

---

## 2. Grille partenaire (freemium)

| Forfait | ID | Famille | RevShare (si payant) |
|---------|-----|---------|----------------------|
| Souvenir | `essential` | **0 $** (cadeau) | — |
| Héritage | `signature` | **149 $** | 30 % Net Distribuable |
| Éternité | `heritage` | **299 $** | idem |

Add-ons commissionnables (dont **`musicLicense` 39 $**). Strip Licence si `intended >= signature`.  
B2C-only : Légendaire **499 $**. Livrables : [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md).

---

## 3. Soft Cap & panier

| Champ | Rôle |
|-------|------|
| `grantedPackage` | Cadeau salon — immuable côté client |
| `intendedPackage` | Forfait construit Soft Cap |
| `extensions.musicLicense` | 39 $ — catalogue officiel sans monter le forfait |

| Déclencheur | Effet panier |
|-------------|--------------|
| ≥ 50 médias / post-Composition Magique | `intended → signature` (après acceptation) |
| Piste catalogue officiel (Souvenir) | Dual : Licence 39 $ **ou** Héritage 149 $ (piste non bloquée) |
| Checkout total > 0 | Stripe + metadata granted/intended · entitlements webhook |
| Checkout 0 $ freemium | Amputation (médias ≤ granted, clear licence) → `freemium_free` |

Cart UI/API : `computeWizardCartWithGrant` / `resolveWizardDisplayCart`.

---

## 4. Waterfall Bulletproof (rappel)

```text
Gross → Platform Fee 10 % → Net Distribuable → commission 30 % (revshare_bps tenant)
```

Détail ledger / clawback / payout : [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) · QA : [`QA_P6_COMMISSION_WATERFALL.md`](QA_P6_COMMISSION_WATERFALL.md).

---

## 5. Agnosticité tenant

| Axe | Source | Note V1 |
|-----|--------|---------|
| Vertical | `tenants.vertical` | human / pet / … — copy UI |
| Freemium | `tenants.is_freemium` | **Cible V1 = true** pour salons ; pas de branche jetons |
| Platform / RevShare bps | `tenants.settings` + snapshot checkout | Defaults 1000 / 3000 |

Ne jamais hardcoder `if (vertical === 'human') isFreemium = true`.

---

## 6. État d’implémentation (juillet 2026)

| Couche | Statut |
|--------|--------|
| P6 + **P8** SQL (purge wallets, Soft Cap quota, entitlements) | ✅ appliqué |
| Manifeste TS Soft Cap / `musicLicense` | ✅ |
| Checkout Soft Cap + amputation 422 + `freemium_free` | ✅ |
| Webhook → `project_paid_entitlements` | ✅ |
| Soft Cap UX (médias, magie, musique dual) | ✅ Phase 4 |
| UI Salon commissions | 🟡 partiel |
| Creatomate gate entitlements | ⏳ Phase 5 |
| Accrual RevShare webhook (durcissement) | 🟡 |

---

## 7. Nommage forfaits

| Marketing FR | EN | PackageId | wizard / SQL |
|--------------|----|-----------|--------------|
| Souvenir | Keepsake | `SOUVENIR` | `essential` |
| Héritage | Legacy | `HERITAGE` | `signature` |
| Éternité | Eternity | `ETERNITE` | `heritage` |

---

## 8. Maintenance

En cas de conflit avec l’archive ou d’anciennes sections « coexistence jetons » : **FREEMIUM_V1_PIVOT gagne**.  
Mettre à jour ce fichier + FREEMIUM + PARTNER_REVSHARE + DELIVERABLES + TECHNICAL_ONBOARDING_V1 après changement commerce.
