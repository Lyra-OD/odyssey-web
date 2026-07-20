# Contrat de Livrables & Packages (Manifeste) — Pivot Freemium V1

**Last updated: July 2026 · Version: Freemium V1 (purge jetons)**

**Canon pivot :** [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Soft Cap : [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) · Musique ToS : [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md).

Document canonique **produit** pour forfaits, livrables vidéo, add-ons Quiet Luxury, Soft Cap.  
**Implémentation TS (Phase 1) :** `wizardDeliverables.ts` · `pricingConfig.ts` — *code encore partiellement legacy jusqu’à Phase 1.*  
**Commerce :** [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) · **RevShare :** [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md).

> **V1 = freemium only.** Wholesale jetons 40 $, wallets, et coexistence `is_freemium = false` sont **obsolètes** (purge SQL Phase 2).

---

## Matrice de nommage

| Nom marketing (FR) | Nom marketing (EN) | `PackageId` | ID technique (`granted` / `intended`) |
|--------------------|--------------------|-------------|----------------------------------------|
| **Souvenir** | **Keepsake** | `SOUVENIR` | `essential` |
| **Héritage** | **Legacy** | `HERITAGE` | `signature` |
| **Éternité** | **Eternity** | `ETERNITE` | `heritage` |
| **Légendaire** | **Legendary** | `LEGENDAIRE` | `legendary` (B2C only) |

> **Souvenir** = lead-magnet B2B2C uniquement — jamais en B2C direct.  
> **Légendaire** = ancre Quiet Luxury B2C — hors catalogue partenaire.

### Listes runtime

| Liste TS | Contenu | Rôle |
|----------|---------|------|
| `PACKAGE_IDS` | SOUVENIR, HERITAGE, ETERNITE, LEGENDAIRE | Catalogue complet |
| `PARTNER_PACKAGE_IDS` | SOUVENIR, HERITAGE, ETERNITE | Invitations Salon |
| `B2C_DIRECT_PACKAGE_IDS` | HERITAGE, ETERNITE, LEGENDAIRE | Studio B2C |

État wizard V1 : **`grantedPackage`** + **`intendedPackage`** (migration depuis `basePackage` — Phase 1). Voir [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md).

---

## Grille forfaits V1 (figée)

| Forfait | ID | Prix | Médias | Chansons | Export | Musique |
|---------|-----|------|--------|----------|--------|---------|
| **Souvenir** | `essential` | **0 $** | 50 | 2 | **1080p** | Stingray **standard** ; catalogue officiel via Soft Cap |
| **Héritage** | `signature` | **149 $** | 125 | 4–5 | **4K** | **Catalogue Stingray officiel inclus** + soupape MP3/WAV |
| **Éternité** | `heritage` | **299 $** | 175 | 5–7 | **4K** | Idem + **IA complète** + **Coffre 50 ans** inclus |
| **Légendaire** | `legendary` | **499 $** | 250 | 7–10 | **4K** | Idem Éternité + boîte pré-affranchie (B2C) |

### Canaux

| Canal | Forfaits | Qui paie | RevShare |
|-------|----------|----------|----------|
| **B2B2C freemium** | Souvenir offert · upsell 149 / 299 $ + add-ons | Famille (Stripe) | **30 % Net Distribuable** |
| **B2C direct** | 149 / 299 / 499 $ + add-ons | Famille | Non |
| **Salon partenaire** | Compose invitation (Souvenir typique) | — (0 $ entrée) | Accrual sur paiements famille |

**Mode affichage :** dollars uniquement pour la famille ; Salon = commissions (pas de jetons).

---

## Add-ons Quiet Luxury (grille V1)

| Add-on | Prix | ID | Commissionnable | Notes |
|--------|------|-----|-----------------|-------|
| **Jeton du Sanctuaire** (NFC/QR) | 79 $ | `sanctuaryToken` | Oui | Remplace `collectorUsb` — [`SANCTUARY_TOKEN_NFC.md`](SANCTUARY_TOKEN_NFC.md) |
| **Voix de l’Histoire** | 39 $ | `storyVoice` | Oui | Narration IA — **≠** licence musique |
| **Licence Musique Premium Stingray** | 39 $ | `musicLicense` | Oui | Upsell **Souvenir** ; **strip** si `intended >= signature` (inclus forfait) |
| **Livre de Mémoire** | 149 $ | `memoryBook` | Oui | Print-on-Demand (Gelato) |
| Restauration IA | 49 $ | `aiRetouch` | Oui | Masquer si Éternité+ (inclus) |
| Coffre-fort 50 ans | 99 $ | `digitalVault` | Oui | Masquer si Éternité+ (inclus) |

**Migration TS Phase 1 :** `extendedLicense` → `musicLicense` · `collectorUsb` → `sanctuaryToken`.

Waterfall : Gross session (forfait + add-ons) → Platform 10 % → Net → RevShare 30 %. Ex. Héritage + IA : voir [`QA_P6_COMMISSION_WATERFALL.md`](QA_P6_COMMISSION_WATERFALL.md).

---

## Soft Cap & entitlements musique

| Déclencheur | Comportement |
|-------------|--------------|
| ≥ 50 médias | Soft Cap → `intendedPackage = signature` |
| Piste catalogue **officiel** depuis Souvenir | **Non bloquée** → choix **Licence 39 $** (`musicLicense`, reste Souvenir) **ou** **Héritage 149 $** |

```text
resolveMusicEntitlement(intended, extensions, paid):
  official =
       intended >= signature
    OR extensions.musicLicense
    OR paid.musicLicense
```

Export Creatomate / master Stingray : **uniquement** post-webhook avec entitlement payé.  
Détail : [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) · [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md).

---

## Musique Salon (16:9)

| Voie | Qui | Licence |
|------|-----|---------|
| **Catalogue Stingray officiel** | Héritage / Éternité inclus ; Souvenir via Soft Cap | Plateforme Odyssey |
| **Stingray standard** | Souvenir (sous-ensemble) | Plateforme |
| **Import MP3/WAV** | Héritage+ (masqué Souvenir) | User ToS — [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md) |

Social 9:16 (Safe Music) : Héritage+ — cible produit ⏳.

---

## Capacités manifeste (contrat TS cible)

```typescript
limits: { maxMediaItems; maxSongs }
rendering: { exportResolution: '1080p' | '4K' }
music: {
  catalog: 'standard' | 'official';  // official inclus signature+
  allowPersonalUpload: boolean;       // signature+
}
features: {
  aiRestoration: boolean;             // heritage+
  digitalVaultIncluded: boolean;      // heritage+
  scannerCompanion: boolean;          // heritage+
  whiteGloveDigitization: boolean;    // legendary
}
```

Pacing storyboard : `recommendedMediaCapacity = floor(durationSec / targetSecondsPerMedia)` — inchangé S4.

---

## Scanner Compagnon

Levier conversion vers Éternité / Légendaire — preview IA limitée tous forfaits ; full restore = Éternité+ ou `aiRetouch`. Doc : [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md).

---

## Affichage famille (« gant blanc »)

Jamais : jeton, commission, RevShare.

| Carte | Libellé |
|-------|---------|
| Souvenir | **Inclus** |
| Héritage | **149 $** |
| Éternité | **299 $** |
| Licence Stingray | **+39 $** (si Soft Cap Licence) |
| Autres add-ons | **+{prix} $** |

---

## Affichage Salon partenaire

| Action | Message |
|--------|---------|
| Invitation Souvenir | **Gratuit** — cadeau Sanctuaire |
| Upsell famille | 149 $ / 299 $ + add-ons → commission Net Distribuable |
| Solde | **Commissions** (`partner_commission_balances`) — plus de wallet jetons |

---

## Matrice implémentation (Pivot V1)

| Capacité | Statut |
|----------|--------|
| Canon docs FREEMIUM_V1 + Soft Cap + musique | ✅ Phase 0 |
| Manifeste TS grille 4K / musicLicense / sanctuaryToken | ⏳ Phase 1 |
| `grantedPackage` / `intendedPackage` | ⏳ Phase 1 |
| Purge SQL jetons + invitation sans débit | ⏳ Phase 2 |
| Soft Cap UI dual musique | ⏳ Phase 4 |
| Creatomate post-webhook | ⏳ Phase 5 |
| NFC / Voix / Livre fulfillment | ⏳ Phase 5 |

---

## Maintenance

Aligner ce fichier sur [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) à chaque changement de grille. Code = Phases 1–6.
