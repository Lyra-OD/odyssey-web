# Odyssey — Catalogue Monétisation complet (Cascade V-Final)

**Dernière révision : 21 juillet 2026**

Inventaire **exhaustif** de tout ce que le **client (famille)** peut acheter et de tout ce que
l'**invité** peut offrir — plus les leviers **documentés à venir** et les **idées à explorer**.

> **Source de vérité :** prix « livrés » = `src/lib/wizard/pricingConfig.ts` + `src/lib/wizard/guestSupportPacks.ts`.
> Stratégie : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) · [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) ·
> [`VISION_PHASE_2.md`](VISION_PHASE_2.md) · [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md).
> En cas de conflit de prix/canon : `FREEMIUM_V1_PIVOT.md` prime, puis `IMPLEMENTATION_CASCADE_VFINAL.md` pour la Boucle Virale.

**Règle d'or (SANCTUARY §2) :** chaque SKU s'accroche à un **moment émotionnel** — jamais à un écran « boutique ».

**Légende statut :** ✅ Livré (achetable) · 🔜 Documenté à venir · 💡 Idée à explorer (non tranchée) · ⚠️ Déprécié.

---

## Vue d'ensemble

| Dimension | Valeur |
|-----------|--------|
| SKUs livrés (achetables) | **13** (4 forfaits + 6 add-ons actifs + 3 Support Packs) |
| Leviers documentés à venir | **9** (V1.5 · Phase 2 · Phase 3) — dont **Mécène / Saisie libre** (cap déjà codé) |
| Idées à explorer (brainstorm) | **~32** |
| Amplitude prix forfait famille | **0 $ → 499 $** |
| Panier moyen invité cible | **~50 $** |

---

## A. Livré et achetable aujourd'hui

### A.1 Forfaits — la famille achète

Cœur du panier. Entrée en **brouillon gratuit** (B2B2C & B2C) ; paywall à l'export. Quotas médias
garantis par trigger DB (`odyssey_p7_media_quota_guard.sql`).

| Forfait | ID technique | Prix | Médias | Export | Inclus | Statut |
|---------|--------------|------|--------|--------|--------|--------|
| **Souvenir** | `essential` | **0 $** | 50 | 1080p | **Preview Stingray** (aperçu, non exporté) + **MP3 perso (ToS)** — aucune piste licenciée incluse | ✅ |
| **Héritage** | `signature` | **149 $** | 125 | 4K | Catalogue Stingray officiel inclus + soupape MP3/WAV | ✅ |
| **Éternité** | `heritage` | **299 $** | 175 | 4K | + IA complète + Coffre-fort 50 ans | ✅ |
| **Légendaire** | `legendary` | **499 $** | 250 | 4K | + boîte pré-affranchie (**B2C only**) | ✅ |

### A.2 Add-ons Quiet Luxury — la famille achète

Extensions émotionnelles à la carte. **Commissionnables** (RevShare 30 % du Net Distribuable).
Certains sont **inclus** dans les forfaits supérieurs (strip automatique du panier).

| Add-on | ID | Prix | Commission | Inclusion / note | Statut |
|--------|-----|------|------------|------------------|--------|
| **Restauration IA** | `aiRetouch` | 49 $ | Oui | Inclus dès Éternité | ✅ |
| **Licence Musique Premium Stingray** | `musicLicense` | 39 $ | Oui | Débloque le catalogue Stingray licencié sur Souvenir (gratuit = preview only). Inclus dès Héritage | ✅ |
| **Voix de l'Histoire** (narration IA) | `storyVoice` | 39 $ | Oui | — | ✅ |
| **Jeton du Sanctuaire** (NFC/QR) | `sanctuaryToken` | 79 $ | Oui | Fulfillment ops ⏳ | ✅ |
| **Coffre-fort 50 ans** | `digitalVault` | 99 $ | Oui | Inclus dès Éternité | ✅ |
| **Livre de Mémoire** (Gelato POD) | `memoryBook` | 149 $ | Oui | Fulfillment ops ⏳ | ✅ |
| Pack Héritage (bundle marketing) | `heritagePack` | 149 $ | Oui | Conservé pour paniers legacy | ⚠️ |

### A.3 Support Packs — l'invité offre (Boucle Virale)

Achat personnel à **bénéfice collectif** via `/[lang]/contribute/[token]`. Le Net Distribuable
devient un **crédit** qui fond le paywall famille (cascade P1→P2→P3). Source : `guestSupportPacks.ts`.

| Support Pack | `product_key` | Prix | Friction | Statut |
|--------------|---------------|------|----------|--------|
| **Pack Héritage** (HD + Version Sociale + Page Livre d'or) | `guest_heritage` | 89 $ | Ancre panier | ✅ |
| **Pack Soutien Numérique** (Copie HD) | `guest_hd` | 49 $ | Moyenne | ✅ |
| **Bougie Commémorative Digitale** | `guest_candle` | 15 $ | Basse | ✅ |

**Mécanisme Fonds Commémoratif (levier, pas un SKU) :** cap **1000 $/transaction** · commission Athos
`guest_commission_accrual` (30 % du Net) **uniquement si tenant `is_freemium`** · crédit fonds =
`Net × fund_conversion_bps` (défaut 100 %), **porté par la marge Odyssey**. Cascade : P1 couvrir le
forfait de base → P2 auto-élévation au tier supérieur → P3 surplus vers add-ons.

---

## B. Documenté — à venir (V1.5 · Phase 2 · Phase 3)

Leviers déjà écrits dans les canons mais **non implémentés**. Plusieurs sont **récurrents** (MRR / LTV).

| Levier / SKU | Prix | Horizon | Source doc | Statut |
|--------------|------|---------|------------|--------|
| Social Cut (format court réseaux) | 19 $ | V1.5 | SANCTUARY §5 | 🔜 |
| Livre invité / diaspora | à définir | V1.5 | SANCTUARY §5 · VISION | 🔜 |
| **Sanctuaire Numérique** (abonnement hébergement) | 49 $/an | Phase 2 (MRR) | VISION §3 · Pilier 2 | 🔜 |
| **Capsule anniversaire IA** (Jour-365 → invités) | inclus abo | Phase 2 | VISION §3 · rétention | 🔜 |
| **Lead-Gen CPL** (pré-arrangements funéraires) | CPL (funérarium paie) | Phase 2 | VISION §3 · Pilier 1 | 🔜 |
| Data Graph **LYRA** (insights agrégés, M&A) | licensing B2B | Phase 2+ | VISION §3 · Pilier 3 | 🔜 |
| Gant Blanc Premium (avance commissions partenaire) | couche B2B | Post-freemium | SANCTUARY §7 | 🔜 |
| % marge Odyssey → Fonds (checkouts famille) | configurable | Phase 2+ | VISION §2.2 | 🔜 |
| **Mécène / Saisie libre** (contribution invité montant libre → éponge le forfait famille) | **99 $ → 1000 $** | **V1.5 quick-win** | Cap `1000 $/txn` **déjà codé** (`guestSupportPacks.ts`) · cascade | 🔜 |

---

## C. Idées à explorer — brainstorm (non documenté, à valider)

> Prix **indicatifs**. Chaque piste s'accroche à un moment émotionnel existant ; **aucune n'est
> tranchée ni chiffrée officiellement**. À prioriser (quick-win ROI vs gros chantier) avant décision.

### C.1 Support Packs invités (nouveaux)

| Idée | Prix indicatif |
|------|----------------|
| Mur d'hommage / fleurs virtuelles | 5–15 $ |
| Message vidéo invité intégré au montage | ~29 $ |
| Don caritatif au nom du défunt (Odyssey % traitement) | % du don |
| Dédicace / page contributeur premium | ~19 $ |
| **Générique de fin collaboratif (End Credits)** — section cinématique listant contributeurs/signataires (levier viral) | inclus / premium |
| **Témoignage audio spatialisé** — mémo vocal invité (denoise studio) sur timeline acoustique | ~29 $ |
| **Fonds Philanthropique / Leg** — surplus du fonds au-delà du forfait max (Éternité) redirigé vers cause / fondation / bourse au nom du défunt | **% traitement** — *cascade « P4 » (à trancher dans `IMPLEMENTATION_CASCADE_VFINAL.md`)* |
| *Enrichissement Bougie* — + message de condoléances **mis en avant** | inclus `guest_candle` |
| *Enrichissement Pilier* — + **badge distinctif** sur le livre d'or (reconnaissance) | inclus `guest_heritage` |
| *Clarif. Soutien HD* — distinguer **copie perso** (actuel `guest_hd`) vs **contribution au mémorial collaboratif** (2 valeurs) | — |

### C.2 Add-ons famille (extensions produit)

| Idée | Prix indicatif |
|------|----------------|
| Sous-titres / doublage multilingue (diaspora) | ~39 $ |
| Version longue « Documentaire » | ~99 $ |
| Musique originale composée par IA | ~59 $ |
| Narration multi-voix (plusieurs proches) | +29 $/voix |
| Album audio / podcast mémoriel | ~39 $ |
| Livre premium cuir gravé | ~299 $ |
| **Capsule temporelle programmée par la famille** — contenus cachés débloqués à J+1 / 5 / 10 ans (≠ capsule IA auto de la section B) | ~39 $ |
| **Restauration par lot / VHS-vidéo** — tiering de `aiRetouch` (cassettes abîmées, stabilisation, étalonnage) | par lot |
| **Livre d'Or invités imprimé** — compilation des messages/photos/poèmes du mémorial (≠ `memoryBook` hommage) | POD |

### C.3 Objets physiques & hardware

| Idée | Prix indicatif |
|------|----------------|
| Bijou NFC (réplique portable du Jeton) | ~129 $ |
| Cadre photo numérique connecté | ~149 $ |
| Plaque / QR extérieur pierre tombale (NFC durci) | ~99 $ |
| Vinyle / CD de la bande-son | ~49 $ |
| **Coffret Collector** — clé USB cryptée, boîtier alu noir mat gravé, film 4K brut **sans cloud** (réintro de l'ex-`collectorUsb`, à arbitrer vs Jeton NFC) | ~129 $ |

### C.4 Récurrent / anniversaire (LTV)

| Idée | Prix indicatif |
|------|----------------|
| Sanctuaire Éternel (paiement unique à vie) | ~299 $ |
| Bougie annuelle automatique | ~9 $/an |
| Envoi fleurs physiques anniversaire (dropship) | marge |
| Capsule anniversaire premium (nouveau montage/an) | ~49 $ |

### C.5 B2B / partenaire

| Idée | Prix indicatif |
|------|----------------|
| Marque blanche salon (SaaS mensuel) | abo B2B |
| Palier de commission au volume | % dégressif |
| Pack « campagne de collecte » (mariages, mémoriaux publics) | événementiel |

---

## Maintenance

Mettre à jour ce fichier quand :
- Un SKU change de prix / statut (aligner `pricingConfig.ts` + `guestSupportPacks.ts`).
- Une idée de la section C est tranchée → la promouvoir en B (documenté) puis A (livré).
- Un canon (SANCTUARY, VISION, DELIVERABLES, CASCADE_VFINAL) évolue.

Cross-références : [`PROJECT_STATUS.md`](PROJECT_STATUS.md) · [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md).

*Document vivant — catalogue monétisation Odyssey.*
