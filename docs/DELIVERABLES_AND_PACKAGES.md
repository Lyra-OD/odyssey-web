# Contrat de Livrables & Packages (Manifeste)

**Last updated: June 2026**

Document canonique pour l’architecture **« gant blanc »** B2C / B2B2C : forfaits, livrables vidéo, double tarification (jetons vs dollars).  
**Implémentation TypeScript :** `src/lib/wizard/wizardDeliverables.ts` · présentation UI partenaire : `src/lib/wizard/wizardDeliverables.utils.ts`.

Complète [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md), [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) et [`sql/README.md`](sql/README.md).

---

## Matrice de nommage (Option A — règle d’or)

Les **noms marketing** sont la façade UI (FR/EN). Les **IDs techniques** restent inchangés dans `wizard_state`, `pricingConfig`, SQL P5 et Stripe — **ne pas les renommer** sans migration dédiée.

| Nom marketing (FR) | Nom marketing (EN) | `PackageId` (manifeste TS) | ID technique (`basePackage` / `granted_package`) |
|--------------------|--------------------|----------------------------|--------------------------------------------------|
| **Souvenir** | **Keepsake** | `SOUVENIR` | `essential` |
| **Héritage** | **Legacy** | `HERITAGE` | `signature` |
| **Éternité** | **Eternity** | `ETERNITE` | `heritage` |

**Ponts code :**

- `manifestPackageFromLegacy('essential')` → `SOUVENIR`
- `legacyGrantedFromManifest('HERITAGE')` → `signature`
- SQL `partner_tokens_for_granted_package('signature')` → **2** jetons (forfait **Héritage** marketing)

### i18n (façade UI)

Les noms marketing **ne sont pas** codés en dur dans les composants : ils vivent dans `dictionaries/fr.json` et `dictionaries/en.json` sous `packages.names` (clés = IDs techniques).

| ID technique | Clé i18n | FR (`packages.names`) | EN (`packages.names`) |
|--------------|----------|------------------------|------------------------|
| `essential` | `packages.names.essential` | Souvenir | Keepsake |
| `signature` | `packages.names.signature` | Héritage | Legacy |
| `heritage` | `packages.names.heritage` | Éternité | Eternity |

Styles carte (sous-titre) : `packages.styles.{essential|signature|heritage}`.  
Wizard (étapes 1–2) : `tributeWizard.basePackageEssential` / `Signature` / `Heritage` — alignés sur les mêmes libellés.  
Helpers : `src/lib/wizard/packageI18n.ts` (`packageNameFromLabels`, etc.).

---

## Double tarification

| Contexte | Mode (`TransactionMode`) | Règle | Utilitaires |
|----------|--------------------------|-------|-------------|
| **Partenaire B2B** (dashboard, parcours funérarium) | `tokens` | Débit du wallet partenaire en **jetons** selon le forfait choisi ou offert | `resolveTransactionMode({ isPartnerAccount: true })`, `formatPackagePriceForMode(..., 'tokens')` |
| **Famille B2C** (achat direct) | `dollars` | Paiement Stripe en **dollars** (forfait + extensions) | `resolveTransactionMode({ checkoutMode: 'b2c' })` |
| **Famille B2B2C** (invitation) | `dollars` (affichage) + jetons côté partenaire | Partenaire débité en **jetons** sur `granted_package` uniquement ; famille paie le **delta** en $ si upsell | `familyPackageDeltaCents(granted, selected)` · voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) |

Wholesale partenaire : **40 $ / jeton** (`PARTNER_TOKEN_COST_CENTS` dans `pricingConfig.ts`).

**Checkout runtime (aujourd’hui) :** les montants en **centimes** et le panier extensions restent dans `pricingConfig.ts` + `wizardPricing.ts`. Le manifeste expose les **dollars entiers** et **jetons** pour l’UI et le contrat produit. Alignement vérifié par `assertManifestPricingAlignedWithLegacyConfig()` (à exécuter en dev/CI).

---

## `PACKAGE_MANIFEST` — résumé

Source : `PACKAGE_MANIFEST` dans `wizardDeliverables.ts`.

| `PackageId` | Jetons (B2B) | Dollars (B2C public) | Format Salon (16:9) | Format Social (9:16, ~45 s) | Features |
|-------------|--------------|----------------------|---------------------|----------------------------|----------|
| **SOUVENIR** | 1 | 79 $ | Activé · audio **Stingray** (actes) | **Désactivé** | Coffre cloud **5 ans** · pas de restauration IA |
| **HERITAGE** | 2 | 149 $ | Activé · audio **Stingray** (actes) | Activé · audio **Safe Music** obligatoire | Coffre cloud **50 ans** · pas de restauration IA |
| **ETERNITE** | 4 | 299 $ | Activé · **MP3 personnel** *ou* parcours salon dédié | Activé · audio **Safe Music** obligatoire | Coffre cloud **50 ans** · **restauration IA** incluse |

Forfait **recommandé** (dashboard partenaire) : `HERITAGE` (`RECOMMENDED_PACKAGE_ID`).

---

## Règle des livrables vidéo

### Format Salon (hommage principal)

- **Ratio :** 16:9 (`salon.aspect`).
- **Musique :**
  - **SOUVENIR / HÉRITAGE :** catalogue licencié **Stingray** par acte narratif (`stingray_acts`) — implémenté aujourd’hui (wizard étape 5).
  - **ÉTERNITÉ :** **MP3 personnel** autorisé (`personal_mp3`) — usage **privé / salon / cérémonie** ; gatekeeper juridique et upload **à implémenter**.
- **Rendu final :** pipeline Creatomate (ou équivalent) — **documenté, non branché** (voir onboarding §10).

### Format Social (diffusion réseaux)

- **Ratio :** 9:16 · **durée cible :** 45 s (`social.duration`).
- **Musique :** **Safe Music uniquement** (`safe_music`) — jamais le MP3 personnel du Salon (éviter blocages plateformes).
- **Activation :** `social.enabled === true` (HERITAGE, ÉTERNITÉ) ; absent pour SOUVENIR.
- **UI / rendu :** étape Social et second template de rendu — **cible produit**, pas encore dans le wizard.

```text
Salon 16:9  → Stingray (Souvenir/Héritage) ou MP3 perso (Éternité)
Social 9:16 → Safe Music obligatoire si le forfait l’inclut
```

---

## État d’implémentation (manifeste → produit)

| Capacité | Statut |
|----------|--------|
| Manifeste TS + utils | ✅ |
| Dashboard partenaire (`InvitationComposer` sur manifeste) | ✅ |
| i18n noms commerciaux (`packages.names`) | ✅ |
| Wizard lit le manifeste (étapes MP3 / Social conditionnelles) | ⏳ |
| API invitations + magic link | ⏳ |
| Checkout 3 modes + RPC P5 | ⏳ |
| Gatekeeper MP3 + Safe Music catalogue | ⏳ |
| Double rendu Creatomate (Salon + Social) | ⏳ |

---

## Documents liés

| Document | Rôle |
|----------|------|
| [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) | Saga checkout, `granted_package`, delta famille |
| [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) | 8 étapes wizard, autosave, intégration manifeste |
| [`sql/README.md`](sql/README.md) | IDs SQL legacy — ne pas renommer |
| [`pricingConfig.ts`](../src/lib/wizard/pricingConfig.ts) | Cents, extensions, bundle marketing 67 $ |

---

## Quand modifier ce document

Tout changement de forfait, jetons, dollars, livrables Salon/Social ou règles B2B2C :

1. `src/lib/wizard/wizardDeliverables.ts`
2. **Ce fichier**
3. [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) + [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) si le flux wizard/checkout est touché
