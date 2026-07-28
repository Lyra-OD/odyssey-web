# Contrat de Livrables & Packages (Manifeste) — Pivot Freemium V1

**Last updated: 24 juillet 2026 · Version: Freemium V1 + Cascade V-Final (grille Quiet Luxury)**

**Canon pivot :** [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Soft Cap : [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) · Musique ToS : [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md).

Document canonique **produit** pour forfaits, livrables vidéo, add-ons Quiet Luxury, Soft Cap.  
**Implémentation TS :** `pricingConfig.ts` (source de vérité prix) · `wizardDeliverables.ts` (capacités).  
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

État wizard V1 : **`grantedPackage`** + **`intendedPackage`**. Voir [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md).

---

## Grille forfaits V1 (figée — Quiet Luxury accessible)

| Forfait | ID | Prix | Médias | Chansons | Export | Musique |
|---------|-----|------|--------|----------|--------|---------|
| **Souvenir** | `essential` | **0 $** | 50 | 2 | **1080p** | Preview Stingray + **MP3 perso (ToS)** — 0 piste licenciée exportée |
| **Héritage** | `signature` | **179 $** | 125 | 4–5 | **1080p** | **Catalogue Stingray officiel inclus** + soupape MP3/WAV |
| **Éternité** | `heritage` | **349 $** | 175 | 5–7 | **4K** | Idem + **IA complète** + **Coffre 50 ans** inclus |
| **Légendaire** | `legendary` | **499 $** | 250 | 7–10 | **4K** | Idem Éternité + boîte pré-affranchie (B2C) |

> Source runtime : `src/lib/wizard/pricingConfig.ts` (17 900 / 34 900 / 49 900 ¢).

### Canaux

| Canal | Forfaits | Qui paie | RevShare |
|-------|----------|----------|----------|
| **B2B2C freemium** | Souvenir offert · upsell **179 / 349 $** + add-ons | Famille (Stripe) | **30 % Net Distribuable** |
| **B2C direct** | **179 / 349 / 499 $** + add-ons | Famille | Non |
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

**Migration TS :** `extendedLicense` → `musicLicense` · `collectorUsb` → `sanctuaryToken`.

Waterfall : Gross session (forfait + add-ons) → Platform 10 % → Net → RevShare 30 %. Ex. Héritage : voir [`QA_P6_COMMISSION_WATERFALL.md`](QA_P6_COMMISSION_WATERFALL.md).

---

## Empreintes Sanctuaire — Boucle Virale (Cascade V-Final)

Achetées par **les proches** sur `/[lang]/contribute/[token]`. Achat personnel à bénéfice collectif : le **Net Distribuable** devient un **crédit** qui fait fondre le paywall famille (cascade P1→P2→P3). Source : `src/lib/wizard/guestSupportPacks.ts` · canon [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md).

| Empreinte | Prix | `product_key` | Notes |
|-----------|------|---------------|-------|
| **Voix dans le film** | **69 $** | `guest_voice` | Ancre / cœur |
| **Témoignage filmé** (live) | **119 $** | `guest_video` | Capture live Phase 3b |
| **Coproduction** | **129 $** | `guest_heritage` | HD + social + générique |
| **Bougie** | **15 $** | `guest_candle` | Secondaire |
| **Mécène** | **150–1000 $** | `guest_patron` | Montant libre (sugg. 250 $) |
| Pack HD | ~~49 $~~ | `guest_hd` | **⚠️ DÉPRÉCIÉ** |

**Règles :** cap dur **1000 $/transaction** · commission Athos `guest_commission_accrual` (30 % du Net) **uniquement si tenant `is_freemium`** · crédit fonds = `Net × fund_conversion_bps` (défaut 100 %) · `viral_loop_enabled` **false** en prod jusqu’à pilote.

---

## Soft Cap & entitlements musique

| Déclencheur | Comportement |
|-------------|--------------|
| ≥ 50 médias | Soft Cap → `intendedPackage = signature` |
| Piste catalogue **officiel** depuis Souvenir | **Non bloquée** → choix **Licence 39 $** (`musicLicense`) **ou** **Héritage 179 $** |

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
| **Preview Stingray** | Souvenir (aperçu, non exporté) | Plateforme |
| **Import MP3/WAV** | **Tous forfaits** (Souvenir inclus) + attestation ToS | User ToS — [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md) |

Social 9:16 (Safe Music) : Héritage+ — cible produit ⏳.

---

## Capacités manifeste (contrat TS)

```typescript
limits: { maxMediaItems; maxSongs }
rendering: { exportResolution: '1080p' | '4K' }
music: {
  catalog: 'standard' | 'official';  // official inclus signature+
  allowPersonalUpload: boolean;       // true tous forfaits (ToS)
}
features: {
  aiRestoration: boolean;             // heritage+
  digitalVaultIncluded: boolean;      // heritage+
  scannerCompanion: boolean;          // heritage+
  whiteGloveDigitization: boolean;    // legendary
}
```

---

## Scanner Compagnon

Levier conversion vers Éternité / Légendaire — preview IA limitée tous forfaits ; full restore = Éternité+ ou `aiRetouch`. Doc : [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md).

---

## Affichage famille (« gant blanc »)

Jamais : jeton, commission, RevShare.

| Carte | Libellé |
|-------|---------|
| Souvenir | **Inclus** |
| Héritage | **179 $** |
| Éternité | **349 $** |
| Licence Stingray | **+39 $** (si Soft Cap Licence) |
| Autres add-ons | **+{prix} $** |

---

## Affichage Salon partenaire

| Action | Message |
|--------|---------|
| Invitation Souvenir | **Gratuit** — cadeau Sanctuaire |
| Upsell famille | **179 $ / 349 $** + add-ons → commission Net Distribuable |
| Solde | **Commissions** (`partner_commission_balances`) — plus de wallet jetons |

---

## Matrice implémentation (snapshot 24 juil. 2026)

| Capacité | Statut |
|----------|--------|
| Grille prix runtime | ✅ `pricingConfig` |
| Soft Cap médias / musique | ✅ |
| Empreintes Sanctuaire config | ✅ |
| UI Sanctuaire / Inviter / Fonds | ✅ Phase 3a (flag viral OFF) |
| Co-Créateur Studio | ✅ Phases A–C |
| Creatomate worker | ✅ P0 (mapping + drain + webhook fail-closed · master Stingray ⏳) |

*Document vivant — aligné grille Quiet Luxury 179/349/499 · rapport partenaire : [`PARTNER_REPORT_JUL2026.md`](PARTNER_REPORT_JUL2026.md) · business case : [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md).*
