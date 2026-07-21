# Odyssey — Technical Onboarding V1

**Dernière révision : juillet 2026 · Freemium V1 (post-purge jetons)**

Hub d’entrée pour développeurs. Canon produit : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md).  
Ancien hub (pré-purge) : [`_archive/TECHNICAL_ONBOARDING_ODYSSEY_PRE_FREEMIUM.md`](_archive/TECHNICAL_ONBOARDING_ODYSSEY_PRE_FREEMIUM.md) — **ne plus onboards dessus**.

---

## 1. En 60 secondes

Odyssey = wizard 8 étapes (famille) + Salon partenaire (invitations) + checkout Stripe.

| Canal | Flux |
|-------|------|
| **B2B2C** | Salon invite → famille reçoit **Souvenir 0 $** (`grantedPackage = essential`) → Soft Cap construit `intendedPackage` / `musicLicense` → Stripe (delta) ou `freemium_free` → entitlements serveur |
| **B2C** | Famille paie forfait plein (Héritage / Éternité / Légendaire) + add-ons |

**Jetons wholesale = morts.** Solde partenaire = `partner_commission_*` uniquement (RevShare Bulletproof).

---

## 2. Stack & lancement

| Couche | Techno |
|--------|--------|
| App | Next.js 14 App Router, React 18, TypeScript, Tailwind |
| Data | Supabase Auth + RLS + Storage |
| Pay | Stripe Checkout + webhook idempotent |
| i18n | `dictionaries/fr.json` · `dictionaries/en.json` |

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # gate avant merge
```

### Env (minimum)

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin serveur (webhook, entitlements) |
| `STRIPE_SECRET_KEY` | Checkout |
| `STRIPE_WEBHOOK_SECRET` | Signature webhook |
| `STINGRAY_*` / `STINGRAY_MODE` | Musique live ou `mock` |

Détail routes : [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md).

---

## 3. Contrats Freemium V1 (à connaître avant de coder)

### État wizard

| Champ | Règle |
|-------|--------|
| `grantedPackage` | Cadeau salon — **immuable** côté client |
| `intendedPackage` | Forfait construit Soft Cap — mutable sans CB |
| `basePackage` | Miroir de `intendedPackage` (compat UI) |
| `extensions.musicLicense` | Add-on 39 $ — catalogue officiel **sans** monter le forfait |

Quotas runtime = manifeste de `max(granted, intended)`. Licence musique **≠** +médias / 4K.

### Musique

```text
officialCatalog =
  intendedPackage >= signature
  OR extensions.musicLicense
  OR paidEntitlements.musicLicense
```

- Preview Soft Cap : OK avant paiement.
- **Master Creatomate Stingray** : uniquement si **payé** (Phase 5).

### Checkout

- Invitation B2B2C : `computeWizardCartWithGrant` (delta granted → intended + add-ons).
- Total 0 $ freemium : amputation (médias ≤ granted, clear `musicLicense`) → mode `freemium_free`.
- Entitlements : table / snapshot **`project_paid_entitlements`** post-webhook — **never trust** `wizard_state` pour l’export.

Specs : [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) · [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md).

---

## 4. Chemins code (high-signal)

| Zone | Path |
|------|------|
| Orchestrateur wizard | `src/components/tribute/TributeWizard.tsx` |
| Soft Cap UI | `src/components/tribute/SoftCapModal.tsx` · `src/lib/wizard/softCap.ts` |
| État / coerce | `src/lib/wizard/wizardState.ts` |
| Prix / panier Soft Cap | `src/lib/wizard/pricingConfig.ts` · `wizardPricing.ts` (`resolveWizardDisplayCart`) |
| Livrables (quotas, 4K) | `src/lib/wizard/wizardDeliverables.ts` |
| Étape 4 musique | `StoryboardChaptersStep.tsx` · `ChapterMusicPanel.tsx` |
| Étape 5 Livre Ouvert | `StoryboardMontageStep.tsx` · `src/components/tribute/storyboard/*` |
| Checkout API | `app/api/checkout/route.ts` |
| Webhook Stripe | `app/api/stripe/webhook/route.ts` |
| Musique proxy | `app/api/music/*` · `src/lib/music/stingrayClient.ts` |
| Autosave | `app/api/projects/[id]/autosave/route.ts` |
| Routes canon | `src/lib/appRoutes.ts` |
| **Init projet (V-Final)** | `src/lib/wizard/channelProfile.ts` (`resolveChannelProfile` + `buildInitialWizardState`, consommé par `app/api/projects/draft`) |
| **Cascade Fonds (V-Final)** | `src/lib/wizard/memorialFund.ts` (`computeCascade`, pur) · `guestSupportPacks.ts` (catalogue) |
| **Contribution invité (V-Final)** | `src/lib/contribute/{contributeToken,accessToken}.ts` · `app/api/contribute/[token]/*` · `app/api/projects/[id]/contribute-link` |
| **SQL Fonds (V-Final)** | `docs/sql/odyssey_p10_memorial_fund.sql` + `odyssey_p10_1_memorial_fund_rpc.sql` · flag `tenants.settings.viral_loop_enabled` |

Hors périmètre wizard : `app-backend/` (Brain/Engine legacy).

---

## 5. Wizard — 8 étapes

| # | Étape | Notes V1 |
|---|--------|----------|
| 1 | Essentiels | Identité + portrait |
| 2 | Sources | Réseaux (skip OK) |
| 3 | Coffre-fort | Upload ; Soft Cap filet à 50 |
| 4 | Musique | Chapitres Stingray ; Soft Cap dual si piste officielle |
| 5 | Montage | **Livre Ouvert** + Composition Magique → Soft Cap principal |
| 6 | Extensions | Add-ons Quiet Luxury |
| 7 | Aperçu | Teaser |
| 8 | Checkout | Panier Soft Cap · rester à 0 $ · Stripe |

Canon Étape 5 : [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md).

---

## 6. SQL — ordre mental

Voir [`sql/README.md`](sql/README.md).

| Migration clé | Rôle |
|---------------|------|
| P0–P5.5 | Auth, media, Salon RBAC (historique) |
| **P6** | Freemium flag + `partner_commission_*` |
| **P8** | **Purge jetons** · Soft Cap quota `intendedPackage` · entitlements · NFC stubs — **appliqué prod** |

Ne plus seed / QA sur `partner_token_wallets` (DROP P8).

---

## 7. Phases livrées / remaining

| Phase | Statut | Contenu |
|-------|--------|---------|
| 0 Docs canon | ✅ | FREEMIUM + filles |
| 1 Manifeste TS | ✅ | `musicLicense`, granted/intended, Héritage 4K |
| 2 SQL P8 | ✅ | Appliqué Supabase |
| 3 Checkout / webhook | ✅ | Soft Cap cart + entitlements |
| 4 Soft Cap UX | ✅ | Médias · magie · musique dual · stay free |
| **5** | ⏳ | Creatomate gate entitlements · NFC · Voix · Livre · import MP3+ToS |
| **6** | ⏳ | QA Soft Cap dual · pas de double facturation · RevShare 39 $ |

---

## 8. Carte documentation

| Besoin | Lire |
|--------|------|
| Vision CEO | [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) |
| Soft Cap UX / amputation | [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) |
| Livrables / prix | [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) |
| RevShare | [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) |
| Wizard détail | [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) *(peut encore contenir drift jetons — privilégier ce hub + FREEMIUM)* |
| Musique | [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md) · [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md) |
| NFC | [`SANCTUARY_TOKEN_NFC.md`](SANCTUARY_TOKEN_NFC.md) |
| Design | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) |
| Hiérarchie | [`CONVENTIONS.md`](CONVENTIONS.md) |
| Status living | [`PROJECT_STATUS.md`](PROJECT_STATUS.md) *(drift possible — croiser FREEMIUM)* |

> En cas de conflit doc : **FREEMIUM_V1_PIVOT gagne**. Archive pré-purge : [`_archive/`](_archive/).

---

## 9. Règles d’équipe

1. Toujours `npm run build` avant merge.
2. Webhook = idempotent ; entitlements écrits côté serveur uniquement.
3. Soft Cap : ne jamais muter `grantedPackage`.
4. Après touch wizard / pricing / checkout / musique / Soft Cap : mettre à jour **FREEMIUM** + **ce fichier** + annexes touchées (`CONVENTIONS.md`).
5. Ne pas réintroduire `partner_token_*` ni wholesale 40 $ dans le code ou la doc vivante.

---

## 10. Prochaine priorité produit

**Phase 5 ✅** — gate export stub (`POST /api/projects/[id]/export` + P9) · MP3/ToS · fulfillment Quiet Luxury stub · **worker Creatomate réel = follow-up**.  
**Phase 6** — QA Soft Cap / RevShare / cutover.

Puis **Phase 6** QA / cutover.
