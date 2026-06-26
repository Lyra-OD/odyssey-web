# Contrat de Livrables & Packages (Manifeste) — v2

**Last updated: June 2026 · Version: B2B2C v2 (Scrypta Killer)**

Document canonique pour l’architecture **« gant blanc »** B2C / B2B2C : forfaits, livrables vidéo, tarification (freemium partenaire · legacy jetons · B2C direct), extensions à la carte.

**Implémentation TypeScript :** `src/lib/wizard/wizardDeliverables.ts` · UI partenaire : `src/lib/wizard/wizardDeliverables.utils.ts`.  
**Commerce & saga :** [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) · **RevShare :** [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) · **Scanner :** [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md).

---

## Matrice de nommage (Option A — règle d’or)

Les **noms marketing** sont la façade UI (FR/EN). Les **IDs techniques** restent inchangés dans `wizard_state`, `pricingConfig`, SQL P5 et Stripe — **ne pas les renommer** sans migration dédiée.

| Nom marketing (FR) | Nom marketing (EN) | `PackageId` (manifeste TS) | ID technique (`basePackage` / `granted_package`) |
|--------------------|--------------------|----------------------------|--------------------------------------------------|
| **Souvenir** | **Keepsake** | `SOUVENIR` | `essential` |
| **Héritage** | **Legacy** | `HERITAGE` | `signature` |
| **Éternité** | **Eternity** | `ETERNITE` | `heritage` |
| **Légendaire** | **Legendary** | `LEGENDAIRE` | `legendary` *(P6 — nouveau)* |

> **Souvenir** = **lead-magnet** (« cheval de Troie ») **strictement réservé** au canal partenaire B2B2C freemium. **Jamais** vendu en B2C direct.  
> **Légendaire** = tier **B2C direct exclusif** (Quiet Luxury) — absent du catalogue upsell partenaire freemium (149 $ / 299 $).

**Ponts code :**

- `manifestPackageFromLegacy('essential')` → `SOUVENIR`
- `legacyGrantedFromManifest('HERITAGE')` → `signature`
- SQL legacy `partner_tokens_for_granted_package('signature')` → **2** jetons (tenants **non-freemium**)

### i18n (façade UI)

| ID technique | Clé i18n | FR | EN |
|--------------|----------|----|----|
| `essential` | `packages.names.essential` | Souvenir | Keepsake |
| `signature` | `packages.names.signature` | Héritage | Legacy |
| `heritage` | `packages.names.heritage` | Éternité | Eternity |
| `legendary` | `packages.names.legendary` | Légendaire | Legendary |

Sous-titre marketing Légendaire : **Gants Blancs** (FR) · **White Gloves** (EN) — clé i18n `packages.styles.legendary` / `packages.tagline.legendary`.

Helpers : `src/lib/wizard/packageI18n.ts` · styles : `packages.styles.*` · wizard : `tributeWizard.basePackage*`.

---

## Grille tarifaire v2

### Stratégie « Quiet Luxury » — B2C direct (effet de leurre)

Acquisition **organique pure** (Studio, sans invitation partenaire) : **3 forfaits payants**, pas de tier gratuit.

| Position | Forfait | Prix | Rôle produit |
|----------|---------|------|--------------|
| Entrée de gamme | **Héritage** | **149 $** | Porte d’entrée catalogue B2C |
| **Choix privilégié** (upsell IA) | **Éternité** | **299 $** | Scanner Compagnon + restauration IA · ancre recommandée UI |
| Ancre psychologique suprême | **Légendaire** (Gants Blancs) | **499 $** | Éternité + **boîte pré-affranchie** · numérisation physique par l’équipe Odyssey |

**Souvenir** n’apparaît **jamais** dans ce tunnel : c’est le **cheval de Troie** du canal partenaire (lead-magnet B2B2C freemium).

### Résumé exécutif

| `PackageId` | Résolution export | Photos max | B2C direct | Canal partenaire freemium | Legacy jetons (non-freemium) |
|-------------|-------------------|------------|------------|---------------------------|------------------------------|
| **SOUVENIR** | **720p** | **50** | **Non vendu** (lead-magnet B2B2C) | **0 $ · 0 jeton** (offert) | **1 jeton** |
| **HERITAGE** | **1080p** | **150** | **149 $** (entrée B2C) | **149 $** (upsell famille) | **2 jetons** |
| **ETERNITE** | **4K** | **Illimité** | **299 $** (choix privilégié) | **299 $** (upsell famille) | **4 jetons** |
| **LEGENDAIRE** | **4K** | **Illimité** | **499 $** (Gants Blancs) | **Non proposé** | **Non proposé** *(legacy TBD)* |

Wholesale legacy : **40 $ / jeton** (`PARTNER_TOKEN_COST_CENTS = 4000`).

### Règles par canal

| Canal | Qui paie le forfait | Extensions | Commission partenaire |
|-------|---------------------|------------|----------------------|
| **B2C direct** (Studio, sans invitation) | Famille — **149 $ / 299 $ / 499 $** + extensions | À la carte · Stripe | **Aucune** |
| **B2B2C freemium** (`is_freemium = true`) | Souvenir offert · upsell famille **149 $ / 299 $** | À la carte · Stripe | **30 % brut Stripe** (forfait + extensions) |
| **B2B2C legacy jetons** (`is_freemium = false`) | Partenaire débité en jetons · famille paie delta + extensions | À la carte · Stripe | **Aucune** (modèle v1) |
| **B2B partner** (funérarium) | Partenaire débité en jetons (`selected_package`) | Selon forfait | **Aucune** |

> **Souvenir gratuit = cadeau exclusif du partenaire freemium (lead-magnet).**  
> **Légendaire = exclusif B2C direct** — ancre « Quiet Luxury » ; hors catalogue upsell partenaire v2.

---

## Triple tarification (modes `TransactionMode`)

| Contexte | Mode | Règle affichage / encaissement |
|----------|------|--------------------------------|
| **Partenaire B2B** (dashboard funérarium) | `tokens` | Jetons selon forfait · **0 jeton affiché** pour Souvenir sur tenant freemium |
| **Famille B2C direct** | `dollars` | 149 $ / 299 $ / 499 $ + extensions · pas de Souvenir · effet de leurre Quiet Luxury |
| **Famille B2B2C freemium** | `dollars` | Souvenir **Inclus** · Héritage **149 $** · Éternité **299 $** + extensions |
| **Famille B2B2C legacy** | `dollars` (delta) | Delta vs forfait offert + extensions — voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) § legacy |

Utilitaires cibles : `resolveTransactionMode()`, `formatPackagePriceForMode()`, `computeB2B2CFamilyPricing()`.

**Checkout runtime :** centimes dans `pricingConfig.ts` + `wizardPricing.ts` · manifeste = contrat produit · alignement via `assertManifestPricingAlignedWithLegacyConfig()`.

---

## `PACKAGE_MANIFEST` — contrat v2

Source cible : `PACKAGE_MANIFEST` dans `wizardDeliverables.ts` *(à mettre à jour)*.

| `PackageId` | Résolution | Photos max | Jetons legacy | $ B2C / upsell | Musique Salon | Social 9:16 | Restauration IA | Scanner Compagnon |
|-------------|------------|------------|---------------|----------------|---------------|-------------|-------------------|-------------------|
| **SOUVENIR** | 720p | 50 | 0 (freemium) / 1 (legacy) | 0 $ (freemium offert) · N/A B2C | **Stingray** (actes) | **Non** | Non | Non |
| **HERITAGE** | 1080p | 150 | 0 (freemium) / 2 (legacy) | **149 $** | **Stingray** (actes) | **Oui** · Safe Music | Non | Non |
| **ETERNITE** | 4K | Illimité | 0 (freemium) / 4 (legacy) | **299 $** | MP3 perso *ou* parcours salon | **Oui** · Safe Music | **Oui** | **Oui** (QR web) |
| **LEGENDAIRE** | 4K | Illimité | — | **499 $** (B2C only) | MP3 perso *ou* parcours salon | **Oui** · Safe Music | **Oui** | **Oui** + **boîte pré-affranchie** |

Forfait **recommandé** (dashboard partenaire) : `HERITAGE` (`RECOMMENDED_PACKAGE_ID`).  
Forfait **recommandé** (B2C direct — Quiet Luxury) : `ETERNITE` (`RECOMMENDED_B2C_PACKAGE_ID` cible).

### Capacités techniques par forfait (nouveaux champs manifeste cibles)

```typescript
// Structure cible — wizardDeliverables.ts (à implémenter)
features: {
  aiRestoration: boolean;           // Éternité + Légendaire
  cloudStorageYears: number;        // 5 / 50 / 50 / 50
  maxPhotos: number | null;         // 50 / 150 / null / null
  exportResolution: '720p' | '1080p' | '4K';
  scannerCompanion: boolean;        // Éternité + Légendaire
  whiteGloveDigitization: boolean;  // Légendaire — boîte pré-affranchie Odyssey
}
```

---

## Extensions à la carte

Les extensions restent **séparées** du forfait dans le panier checkout. Elles s’ajoutent au total Stripe et **génèrent de la commission RevShare** (30 % du brut) lorsqu’elles sont payées par une famille invitée via un tenant freemium.

| Extension (marketing) | `id` technique | Prix (cents) | Commissionnable (B2B2C freemium) |
|-----------------------|----------------|--------------|----------------------------------|
| Retouche IA | `aiRetouch` | 4 900 (49 $) | Oui — *redondant si forfait Éternité (IA incluse)* |
| Licence Premium | `extendedLicense` | 3 900 (39 $) | Oui |
| USB collector | `collectorUsb` | 7 900 (79 $) | Oui |
| Coffre-fort numérique | `digitalVault` | 9 900 (99 $) | Oui |
| Pack Héritage | `heritagePack` | 14 900 (149 $) | Oui |

**Règle UI :** masquer ou désactiver les extensions **déjà incluses** dans le forfait sélectionné (ex. restauration IA sur Éternité).

**Source cents :** `pricingConfig.ts` · panier : `computeWizardCart()` + `sumCartLineItemsCents()`.

Le bundle marketing « économie 67 $ » (Héritage vs à la carte) reste valide pour le **positionnement B2C** ; recalculer après alignement `pricingConfig` v2.

---

## Règle des livrables vidéo

### Résolution & quotas photos

| Forfait | Export final | Quota upload wizard | Enforcement |
|---------|--------------|---------------------|-------------|
| **Souvenir** | **720p** H.264 | **50 photos max** | Gate upload étape médias (à implémenter) |
| **Héritage** | **1080p** H.264 | **150 photos max** | Gate upload |
| **Éternité** | **4K** H.264/H.265 | **Illimité** (fair use policy TBD) | Gate upload + restauration IA |
| **Légendaire** | **4K** H.264/H.265 | **Illimité** | Idem Éternité + workflow **boîte physique** (ops Odyssey) |

Proxy d’ingestion (pipeline) : conversion immédiate en proxy **1080p** minimum à l’upload — voir [`Manifesto-V10.4.md`](Manifesto-V10.4.md) · rendu final selon tier.

### Format Salon (hommage principal 16:9)

- **Ratio :** 16:9 (`salon.aspect`).
- **Musique :**
  - **SOUVENIR / HÉRITAGE :** catalogue **Stingray** par acte narratif (`stingray_acts`) — wizard étape 5 ✅.
  - **ÉTERNITÉ / LÉGENDAIRE :** **MP3 personnel** (`personal_mp3`) ou parcours salon dédié — gatekeeper juridique ⏳.
- **Rendu :** pipeline Creatomate (cible) — résolution = tier export.

### Format Social (9:16, ~45 s)

- **Musique :** **Safe Music uniquement** (`safe_music`).
- **Activation :** HÉRITAGE, ÉTERNITÉ et LÉGENDAIRE · **désactivé** pour SOUVENIR.
- **UI / rendu :** cible produit ⏳.

```text
Salon 16:9  → Stingray (Souvenir/Héritage) ou MP3 perso (Éternité)
Social 9:16 → Safe Music obligatoire si forfait l'inclut
Export      → 720p / 1080p / 4K selon tier
```

---

## Scanner Compagnon (Éternité & Légendaire)

Feature différenciante (« Killer App ») justifiant l’upsell **Éternité 299 $** et l’ancre **Légendaire 499 $**.

| Élément | Spécification |
|---------|---------------|
| **Activation preview** | Dès l’étape médias (tous forfaits en **mode démo limité**) · restauration IA complète = **Éternité / Légendaire** |
| **UX Studio** | QR Code sur l’écran desktop du wizard · scan → session web mobile (sans app native) |
| **Ingestion** | Photos papier détectées / recadrées → upload temps réel Supabase |
| **Upsell** | Composant **Avant/Après** IA → pont checkout **Éternité (299 $)** ou **Légendaire (499 $)** |
| **Doc technique** | [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) |

Le Scanner **n’est pas** une extension payante — c’est un **levier d’conversion** vers les tiers IA.

---

## Légendaire — Gants Blancs (boîte pré-affranchie)

| Élément | Spécification |
|---------|---------------|
| **Positionnement** | **Éternité** + service physique premium · ancre psychologique Quiet Luxury (499 $) |
| **Inclus** | Tous les livrables **Éternité** (4K, IA, Scanner, Social, MP3…) |
| **Différenciateur** | Envoi d’une **boîte pré-affranchie** à la famille · retour des albums / tirages papier |
| **Fulfillment** | Numérisation + restauration IA par **l’équipe Odyssey** (ops manuelles Phase 1) |
| **Canal** | **B2C direct uniquement** — hors upsell partenaire freemium v2 |
| **ID technique** | `legendary` — migration P6 (`CHECK` packages, `pricingConfig`, SQL) |

---

## Restauration IA

| Forfait | Inclus | Notes |
|---------|--------|-------|
| **Souvenir** | Non | — |
| **Héritage** | Non | Extension `aiRetouch` à la carte (49 $) |
| **Éternité** | **Oui** | Inclus · alimenté par Scanner Compagnon + uploads classiques |
| **Légendaire** | **Oui** | Inclus · + numérisation physique boîte Gants Blancs |

---

## Affichage famille B2B2C freemium (« gant blanc »)

La famille ne voit **jamais** : jeton, commission, RevShare, `is_freemium`.

| Carte forfait | Libellé prix (Souvenir offert) |
|---------------|-------------------------------|
| Souvenir | **Inclus** |
| Héritage | **149 $** |
| Éternité | **299 $** |
| Extension X | **+{prix} $** |

`StickyPriceBar` : total live = forfait sélectionné + extensions cochées (calcul serveur identique au checkout).

---

## Affichage partenaire Salon

| Tenant | Invitation Souvenir | Invitation Héritage / Éternité |
|--------|---------------------|--------------------------------|
| **`is_freemium = true`** | **Gratuit** · 0 jeton | Message acquisition · upsell famille 149 $ / 299 $ · « Commission 30 % » (admin) |
| **`is_freemium = false`** | **1 jeton** (legacy) | Jetons selon `granted_package` (2 / 4) |

Directeur (`partner`) : pas de solde wallet ni commissions — RBAC P5.5 inchangé.

---

## Matrice implémentation

| Capacité | Statut |
|----------|--------|
| Manifeste TS v1 (sans quotas/résolution v2) | ✅ code actuel |
| Manifeste TS v2 (720p/50, 1080p/150, 4K/∞) | ⏳ |
| `pricingConfig.ts` v2 (0 / 149 / 299 / 499) | ⏳ |
| Forfait `legendary` (P6 SQL + manifeste) | ⏳ |
| Légendaire Gants Blancs (fulfillment ops) | ⏳ |
| `tenants.is_freemium` | ⏳ P6 SQL |
| Dashboard partenaire freemium (0 jeton Souvenir) | ⏳ |
| Gate upload photos par tier | ⏳ |
| Checkout saga v2 + RevShare | ⏳ |
| Scanner Compagnon (QR web) | ⏳ |
| Restauration IA pipeline | ⏳ |
| Gatekeeper MP3 Éternité | ⏳ |
| Double rendu Creatomate (Salon + Social) | ⏳ |

---

## Cohérence code — checklist migration v2

Lors de l’implémentation, mettre à jour dans l’ordre :

1. **`wizardDeliverables.ts`** — `PACKAGE_MANIFEST` v2 (résolution, photos, scanner, tokens freemium)
2. **`pricingConfig.ts`** — cents : Souvenir `0` (freemium) · Héritage `14900` · Éternité `29900` · Légendaire `49900` · B2C sans Souvenir
3. **`wizardPricing.ts`** — `computeB2B2CFamilyPricing()` · branche `is_freemium`
4. **`wizardDeliverables.utils.ts`** — cartes Salon freemium vs legacy
5. **`dictionaries/fr.json` + `en.json`** — features forfaits (720p, 50 photos, Scanner, IA)
6. **Ce document** + [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md)

---

## Documents liés

| Document | Rôle |
|----------|------|
| [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) | Saga v2, freemium, RevShare, coexistence legacy |
| [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) | Ledger commissions, webhook, clawback |
| [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) | QR web, ingestion mobile |
| [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) | 8 étapes wizard, checkout |
| [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md) | Tiers musique Stingray |
| [`sql/README.md`](sql/README.md) | Migrations P6 |
| [`pricingConfig.ts`](../src/lib/wizard/pricingConfig.ts) | Cents runtime |

---

## Quand modifier ce document

Tout changement de forfait, résolution, quotas photos, extensions, freemium, RevShare ou Scanner :

1. `src/lib/wizard/wizardDeliverables.ts`
2. **Ce fichier**
3. [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) + [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md)
4. `pricingConfig.ts` si impact checkout
