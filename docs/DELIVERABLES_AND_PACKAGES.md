# Contrat de Livrables & Packages (Manifeste) — v2

**Last updated: July 2026 · Version: B2B2C v2 + Storyboard pivot**

> **Pivot CEO V1 (juillet 2026) :** la grille cible (Héritage 4K + Stingray officiel, purge jetons, Soft Cap, nouveaux add-ons) est figée dans [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md). Ce fichier sera réécrit en Phase 0 — en cas de conflit, **FREEMIUM_V1_PIVOT prime**.

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

### Séparation stricte des listes runtime

Le manifeste TypeScript sépare désormais explicitement les packages selon le **canal métier** :

| Liste TS | Contenu | Rôle |
|----------|---------|------|
| `PACKAGE_IDS` | `SOUVENIR`, `HERITAGE`, `ETERNITE`, `LEGENDAIRE` | Catalogue runtime complet |
| `PARTNER_PACKAGE_IDS` | `SOUVENIR`, `HERITAGE`, `ETERNITE` | Invitations partenaire, legacy jetons, catalogue Salon |
| `B2C_DIRECT_PACKAGE_IDS` | `HERITAGE`, `ETERNITE`, `LEGENDAIRE` | Tunnel Studio B2C direct |

**Pourquoi `LEGENDAIRE` n’existe pas dans les types legacy partenaire :**

- `LEGENDAIRE` / `legendary` est **B2C direct only**
- il n’existe **aucun** mapping vers `partner_invitations.granted_package`
- il n’existe **aucun** mapping vers `LegacyGrantedPackage`
- il n’existe **aucune** tarification jetons legacy

Autrement dit :

```text
wizard runtime          : essential | signature | heritage | legendary
legacy partner / SQL    : essential | signature | heritage
```

Cette séparation est volontaire : elle empêche qu’un forfait **Légendaire** fuite dans les flows partenaire, wallet jetons, invitations ou delta legacy.

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

| `PackageId` | Résolution export | Médias max | Chansons max | B2C direct | Canal partenaire freemium | Legacy jetons (non-freemium) |
|-------------|-------------------|------------|--------------|------------|---------------------------|------------------------------|
| **SOUVENIR** | **1080p** | **50** | **2** | **Non vendu** (lead-magnet B2B2C) | **0 $ · 0 jeton** (offert) | **1 jeton** |
| **HERITAGE** | **1080p** | **125** | **4** | **149 $** (entrée B2C) | **149 $** (upsell famille) | **2 jetons** |
| **ETERNITE** | **4K** | **175** | **5** | **299 $** (choix privilégié) | **299 $** (upsell famille) | **4 jetons** |
| **LEGENDAIRE** | **4K** | **250** | **7** | **499 $** (Gants Blancs) | **Non proposé** | **Non proposé** |

Wholesale legacy : **40 $ / jeton** (`PARTNER_TOKEN_COST_CENTS = 4000`).

### Règles par canal

| Canal | Qui paie le forfait | Extensions | Commission partenaire |
|-------|---------------------|------------|----------------------|
| **B2C direct** (Studio, sans invitation) | Famille — **149 $ / 299 $ / 499 $** + extensions | À la carte · Stripe | **Aucune** |
| **B2B2C freemium** (`is_freemium = true`) | Souvenir offert · upsell famille **149 $ / 299 $** | À la carte · Stripe | **30 % du Net Distribuable** (Bulletproof : 10 % platform puis 30 % net) |
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

Source actuelle : `PACKAGE_MANIFEST` dans `wizardDeliverables.ts`.

| `PackageId` | Résolution | Médias max | Chansons max | Jetons legacy | $ B2C / upsell | Musique Salon | Social 9:16 | Restauration IA | Scanner Compagnon |
|-------------|------------|------------|--------------|---------------|----------------|---------------|-------------|-------------------|-------------------|
| **SOUVENIR** | 1080p | 50 | 2 | 0 (freemium) / 1 (legacy) | 0 $ (freemium offert) · N/A B2C | **Stingray** (chapitres) | **Non** | Non | Non |
| **HERITAGE** | 1080p | 125 | 4 | 0 (freemium) / 2 (legacy) | **149 $** | **Stingray** (chapitres) | **Oui** · Safe Music | Non | Non |
| **ETERNITE** | 4K | 175 | 5 | 0 (freemium) / 4 (legacy) | **299 $** | MP3 perso *ou* parcours salon | **Oui** · Safe Music | **Oui** | **Oui** (QR web) |
| **LEGENDAIRE** | 4K | 250 | 7 | — | **499 $** (B2C only) | MP3 perso *ou* parcours salon | **Oui** · Safe Music | **Oui** | **Oui** + **boîte pré-affranchie** |

Forfait **recommandé** (dashboard partenaire) : `HERITAGE` (`RECOMMENDED_PACKAGE_ID`).  
Forfait **recommandé** (B2C direct — Quiet Luxury) : `ETERNITE` (`RECOMMENDED_B2C_PACKAGE_ID` cible).

### Capacités techniques par forfait (direction produit validée)

```typescript
pricing: {
  tokens: number;
  dollars: number;
}
limits: {
  maxMediaItems: number;            // 50 / 125 / 175 / 250
  maxSongs: number;                 // 2 / 4 / 5 / 7
}
rendering: {
  exportResolution: '1080p' | '4K';
  renderPriority: 'standard' | 'high' | 'ultra';
}
pacing: {
  targetSecondsPerMedia: number;    // ex. 6 s / média (S4)
}
features: {
  aiRestoration: boolean;           // Éternité + Légendaire
  cloudStorageYears: number;        // 5 / 50 / 50 / 50
  scannerCompanion: boolean;        // Éternité + Légendaire
  whiteGloveDigitization: boolean;  // Légendaire — boîte pré-affranchie Odyssey
}
```

### Nouvelle règle métier — storyboard par chanson + pacing temporel

Odyssey n’utilise plus de « durée vidéo max » comme garde-fou principal, ni un quota abstrait `maxMediaItemsPerSong` comme modèle éditorial final. Le contrôle des coûts et du rythme repose désormais sur :

1. **`maxMediaItems`** — plafond absolu de médias acceptés dans le package
2. **`maxSongs`** — plafond absolu de chansons autorisées pour ce package

La narration est désormais pensée en **bacs / chapitres pilotés par les chansons** :

- un chapitre = un bloc narratif
- un chapitre porte une chanson
- la **durée réelle** de cette chanson (`durationSec`) détermine la capacité recommandée du chapitre

Pour éviter un montage trop rapide ou un effet stroboscopique, le pacing devient une règle **temporelle** :

```text
recommendedMediaCapacity = floor(durationSec / targetSecondsPerMedia)
```

Exemple avec une cible éditoriale `targetSecondsPerMedia = 6` :

| Chanson | `durationSec` | Cible | Capacité recommandée |
|---------|---------------|-------|----------------------|
| Piste courte | 120 s | 6 s / média | ~20 médias |
| Piste standard | 180 s | 6 s / média | ~30 médias |
| Piste longue | 240 s | 6 s / média | ~40 médias |

Conséquence UX :

- si l’utilisateur surcharge un chapitre, on affiche un **warning local** sur ce chapitre
- si plusieurs chapitres existent, le pacing se lit naturellement chanson par chanson
- les garde-fous globaux restent `maxMediaItems` et `maxSongs`

**Important :**

- le pivot `storyboard` + `durationSec` est désormais la direction produit validée
- `wizardState.ts` et l’autosave V2 sont déjà alignés sur ce modèle
- la mutation du manifeste TS de `maxMediaItemsPerSong` vers `targetSecondsPerMedia` est planifiée en **S4**
- l’enforcement UI / wizard vient dans les tickets `S5–S7`

---

## Extensions à la carte

Les extensions restent **séparées** du forfait dans le panier checkout. Elles s’ajoutent au **Gross Volume** Stripe et entrent dans le waterfall RevShare (Platform Fee 10 % → **Net Distribuable** → commission 30 %) lorsqu’elles sont payées par une famille invitée via un tenant freemium.

| Extension (marketing) | `id` technique | Prix (cents) | Commissionnable (B2B2C freemium) | Commission sur upsell Héritage* |
|-----------------------|----------------|--------------|----------------------------------|--------------------------------|
| Retouche IA | `aiRetouch` | 4 900 (49 $) | Oui | Inclus dans S3 : **5 346¢** total (pas 49 $ × 30 % isolé) |
| Licence Premium | `extendedLicense` | 3 900 (39 $) | Oui | Waterfall sur Gross session |
| USB collector | `collectorUsb` | 7 900 (79 $) | Oui | idem |
| Coffre-fort numérique | `digitalVault` | 9 900 (99 $) | Oui | idem |
| Pack Héritage | `heritagePack` | 14 900 (149 $) | Oui | idem |

\*Exemple chiffré Héritage + Retouche : Gross **19 800¢** → Net Distribuable **17 820¢** → commission **5 346¢** — voir [`QA_P6_COMMISSION_WATERFALL.md`](QA_P6_COMMISSION_WATERFALL.md) S3.

**Règle UI :** masquer ou désactiver les extensions **déjà incluses** dans le forfait sélectionné (ex. restauration IA sur Éternité).

**Source cents :** `pricingConfig.ts` · panier : `computeWizardCart()` + `sumCartLineItemsCents()`.

Le bundle marketing « économie 67 $ » (Héritage vs à la carte) reste valide pour le **positionnement B2C** ; recalculer après alignement `pricingConfig` v2.

---

## Règle des livrables vidéo

### Résolution & quotas photos

| Forfait | Export final | Médias max | Chansons max | Enforcement |
|---------|--------------|------------|--------------|-------------|
| **Souvenir** | **1080p** H.264 | **50** | **2** | Gate upload + pacing helper |
| **Héritage** | **1080p** H.264 | **125** | **4** | Gate upload + pacing helper |
| **Éternité** | **4K** H.264/H.265 | **175** | **5** | Gate upload + pacing helper + restauration IA |
| **Légendaire** | **4K** H.264/H.265 | **250** | **7** | Idem Éternité + workflow **boîte physique** (ops Odyssey) |

Proxy d’ingestion (pipeline) : conversion immédiate en proxy **1080p** minimum à l’upload — voir [`Manifesto-V10.4.md`](Manifesto-V10.4.md) · rendu final selon tier.

### Format Salon (hommage principal 16:9)

- **Ratio :** 16:9 (`salon.aspect`).
- **Musique :**
  - **SOUVENIR / HÉRITAGE :** catalogue **Stingray** par chapitre narratif — fondations state/autosave ✅ ; UI dynamique ⏳
  - **ÉTERNITÉ / LÉGENDAIRE :** **MP3 personnel** (`personal_mp3`) ou parcours salon dédié — gatekeeper juridique ⏳.
- **Rendu :** pipeline Creatomate (cible) — résolution = tier export.

### Format Social (9:16, ~45 s)

- **Musique :** **Safe Music uniquement** (`safe_music`).
- **Activation :** HÉRITAGE, ÉTERNITÉ et LÉGENDAIRE · **désactivé** pour SOUVENIR.
- **UI / rendu :** cible produit ⏳.

```text
Salon 16:9  → Stingray (Souvenir/Héritage) ou MP3 perso (Éternité)
Social 9:16 → Safe Music obligatoire si forfait l'inclut
Export      → 1080p / 4K selon tier
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

Le Scanner **n’est pas** une extension payante — c’est un **levier de conversion** vers les tiers IA.

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
| **`is_freemium = true`** | **Gratuit** · 0 jeton | Message acquisition · upsell famille 149 $ / 299 $ · admin : waterfall commission (30 % **Net Distribuable**) |
| **`is_freemium = false`** | **1 jeton** (legacy) | Jetons selon `granted_package` (2 / 4) |

Directeur (`partner`) : pas de solde wallet ni commissions — RBAC P5.5 inchangé.

---

## Matrice implémentation

| Capacité | Statut |
|----------|--------|
| Manifeste TS v2 (4 packages, listes par canal, caps médias/chansons, pacing) | ✅ |
| Fondations `storyboard` (`wizardState.ts` + autosave V2) | ✅ |
| `pricingConfig.ts` v2 (0 / 149 / 299 / 499) | ✅ |
| Forfait `legendary` (P6 SQL + manifeste) | ✅ |
| Légendaire Gants Blancs (fulfillment ops) | ⏳ |
| `tenants.is_freemium` | ✅ P6 SQL + propagation partner UI |
| Dashboard partenaire freemium (0 jeton Souvenir) | ✅ |
| Gate upload photos par tier | ⏳ |
| Moteur pacing temporel `durationSec / targetSecondsPerMedia` | ⏳ S4 |
| UI storyboard dynamique (chapitres / bacs par chanson) | ⏳ S5–S7 |
| Checkout saga v2 + RevShare | ⏳ |
| Scanner Compagnon (QR web) | ⏳ |
| Restauration IA pipeline | ⏳ |
| Gatekeeper MP3 Éternité | ⏳ |
| Double rendu Creatomate (Salon + Social) | ⏳ |

---

## Cohérence code — checklist migration v2

Lors de l’implémentation, mettre à jour dans l’ordre :

1. **`wizardState.ts`** + `autosave/route.ts` — fondations `storyboard` V2 + bridge runtime legacy
2. **`wizardDeliverables.ts`** — faire évoluer `pacing.maxMediaItemsPerSong` vers `pacing.targetSecondsPerMedia`
3. **`pricingConfig.ts`** — cents : Souvenir `0` (freemium) · Héritage `14900` · Éternité `29900` · Légendaire `49900` · B2C sans Souvenir
4. **`wizardPricing.ts`** — `computeB2B2CFamilyPricing()` · branche `is_freemium`
5. **`wizardDeliverables.utils.ts`** — cartes Salon = `PARTNER_PACKAGE_IDS`
6. **`dictionaries/fr.json` + `en.json`** — features forfaits et copy storyboard
7. **Ce document** + [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) + [`STORYBOARD_REFACTOR.md`](STORYBOARD_REFACTOR.md)

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
