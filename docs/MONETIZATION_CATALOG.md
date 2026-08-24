# Odyssey — Catalogue Monétisation complet (Cascade V-Final)

**Type :** canon · **Vérité pour :** inventaire leviers. Prix live = `pricingConfig.ts`, pas ce fichier seul.  
**Dernière MAJ :** 17 août 2026 (en-tête) · 22 juillet 2026 (contenu) · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 24 août 2026 — lien ciel économique Lueurs (prix égal / palette).
- 17 août 2026 — étape 4 : A.1 forfaits → FREEMIUM §2 (add-ons / empreintes restent ici).
- 17 août 2026 — en-tête type + carte.
- 22 juillet 2026 — plafonds dépôt Sanctuaire + témoignage live.

Inventaire **exhaustif** de tout ce que le **client (famille)** peut acheter et de tout ce que
l'**invité** peut offrir — plus les leviers **documentés à venir** et les **idées à explorer**.

> **Source de vérité :** prix « livrés » = `src/lib/wizard/pricingConfig.ts` + `src/lib/wizard/guestSupportPacks.ts`.
> Stratégie : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) · [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) ·
> [`VISION_PHASE_2.md`](VISION_PHASE_2.md) · [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md).
> En cas de conflit de prix/canon : `FREEMIUM_V1_PIVOT.md` prime, puis `IMPLEMENTATION_CASCADE_VFINAL.md` pour la Boucle Virale.

**Règle d'or (SANCTUARY §2) :** chaque SKU s'accroche à un **moment émotionnel** — jamais à un écran « boutique ».

**Légende statut :** ✅ Livré (config/runtime) · 🔜 À venir · 💡 Idée · ⚠️ Déprécié.

---

## Vue d'ensemble

| Dimension | Valeur |
|-----------|--------|
| Forfaits famille | Voir [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) §2 |
| Empreintes Sanctuaire actives | **5** (voix, vidéo, coproduction, lueur, mécène) |
| Panier moyen invité cible | **~80–100 $** ARPU payant |
| Soft Cap médias famille | **50** — médias **invités exclus** |
| Feature flag | `viral_loop_enabled` = **false** jusqu'à fin Phase 3a |

---

## A. Livré (config runtime)

### A.1 Forfaits — la famille achète

Grille : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) §2 · contrat [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) · cents `pricingConfig.ts`. Ne pas recopier 0 / 179 / 349 / 499 ici.

### A.2 Add-ons Quiet Luxury — la famille achète

| Add-on | ID | Prix | Commission | Inclusion / note | Statut |
|--------|-----|------|------------|------------------|--------|
| **Restauration IA** | `aiRetouch` | 49 $ | Oui | Inclus dès Éternité | ✅ |
| **Licence Musique Premium Stingray** | `musicLicense` | 39 $ | Oui | Soft Cap Souvenir ; inclus dès Héritage | ✅ |
| **Voix de l'Histoire** (narration IA) | `storyVoice` | 39 $ | Oui | ≠ voix invité Sanctuaire | ✅ |
| **Jeton du Sanctuaire** (NFC/QR) | `sanctuaryToken` | 79 $ | Oui | Fulfillment ops ⏳ | ✅ |
| **Coffre-fort 50 ans** | `digitalVault` | 99 $ | Oui | Inclus dès Éternité | ✅ |
| **Livre de Mémoire** (Gelato POD) | `memoryBook` | 149 $ | Oui | Fulfillment ops ⏳ | ✅ |
| Pack Héritage (bundle marketing) | `heritagePack` | 149 $ | Oui | Conservé paniers legacy | ⚠️ |

### A.3 Empreintes Sanctuaire — l'invité offre (Boucle Virale)

Tunnel **Sanctuaire d'abord (0 $)** → empreinte payante. Ordre d'affichage UX = ancre haut.

| Empreinte | `product_key` | Prix | Rôle UX | Statut |
|-----------|---------------|------|---------|--------|
| **Voix dans le film** | `guest_voice` | **69 $** | Ancre / cœur | ✅ config · ✅ capture avant paiement (3b V1) |
| **Témoignage filmé** (live caméra) | `guest_video` | **119 $** | Staple cérémonie | ✅ config · ✅ capture avant paiement (3b V1) |
| **Coproduction** (HD + social + générique) | `guest_heritage` | **129 $** | Statut | ✅ |
| **Lueur** | **19 $** | `guest_candle` | Secondaire (jamais CTA #1) | ✅ présence V1 |
| **Mécène** (montant libre) | `guest_patron` | **150–1000 $** (sugg. **250 $**) | Asymétrie | ✅ config · 🔜 checkout amount |
| Pack HD | `guest_hd` | ~~49 $~~ | — | ⚠️ **DÉPRÉCIÉ** |

**Couleurs Lueur (produit) :** palette curatée · **même prix** toutes teintes · teal = défunt seul — [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md).

**Dépôt gratuit & plafonds (canon) —** `src/lib/contribute/sanctuaryLimits.ts` :

| Geste | Règle | Statut |
|-------|--------|--------|
| Photo **ou** mot | **1** slot gratuit rituel (lien public) | ✅ UI 3a |
| Photos (aide famille) | **Max 5 / invité** (inclut la photo gratuite) · multi-select UI | ✅ enforce API + P10.3 |
| Mini-clip fichier 15–30 s | **Max 1 / invité** — souvenir uploadé, ≠ live | 🔜 Phase 3b |
| Témoignage `guest_video` | **Enregistrement live** in-app (tél. / webcam) | ✅ Phase 3b V1 |

**Promesse voix / témoignage / mini-clip V1 :** *soumis à la famille pour intégration* (pas de garantie absolue).

**Fonds Commémoratif :** Net × 100 % → crédit cascade P1→P2→P3 · **surplus = plus de produit** (pas de cash-out) · pas de mini-% extra sur le fonds · commission Athos 30 % du Net si `is_freemium` · cap 1000 $/txn.

---

## B. Documenté — à venir

| Levier / SKU | Prix | Horizon | Statut |
|--------------|------|---------|--------|
| UI Sanctuaire + Inviter + Fonds checkout (Phase 3a) | — | **Livré** | ✅ (flag viral OFF) |
| Enforce plafonds 5 photos + multi-dépôt | — | Fin 3a | ✅ (flag viral OFF · pilote tenant ⏳) |
| Capture voix + **témoignage live** + mini-clip 30 s (Phase 3b) | inclus packs / 1 clip | Après 3a | 🔜 |
| Aide IA rédaction du **mot** (suggestions optionnelles) | coût API | Phase 3b+ | 💡 → 🔜 |
| Social Cut | 19 $ | V1.5 | 🔜 |
| Sanctuaire Numérique (abo) | 49 $/an | Phase 2 MRR | 🔜 |
| Capsule anniversaire IA Jour-365 | inclus abo | Phase 2 | 🔜 |
| Lead-Gen CPL | CPL | Phase 2 | 🔜 |
| Data Graph LYRA | licensing B2B | Phase 2+ | 🔜 |
| Fonds Philanthropique / Leg (P4) | % | Différé | 💡 |

---

## C. Idées à explorer (extrait)

**Aide IA — rédiger le mot (Sanctuaire) :** bouton optionnel sur le dépôt « Un mot » — 2–3 amorces courtes (ton laïc, prénom honoré, FR/EN), invité édite toujours. Pas de ghostwriter forcé. Slot UI : `SanctuaryDepositForm` (mode message). Horizon Phase 3b+.

End Credits filmiques · témoignage audio spatialisé enrichi · Livre d'Or invités POD · Coffret USB collector · capsule temporelle famille · bijou NFC — voir brainstorm antérieur ; **ne pas charger** le Sanctuaire V1.

---

## Maintenance

- Prix livrés = `pricingConfig.ts` + `guestSupportPacks.ts` uniquement.
- Promouvoir C → B → A quand tranché.
- Canon Boucle Virale : [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md).

*Document vivant — catalogue monétisation Odyssey.*
