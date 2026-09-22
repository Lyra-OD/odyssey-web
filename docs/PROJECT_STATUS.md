# Odyssey Frontend — Project Status

**Type :** living · **Vérité pour :** où on en est, dette acceptée, prochain sprint.  
**Dernière MAJ :** 22 sept 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 22 sept 2026 — **Tranche 1+** pont musical (fade ~1,1 s, bridge 2,3 s) + crédit éditable — [`product/SOUVENIR_STREAM_MASTER_49.md`](product/SOUVENIR_STREAM_MASTER_49.md).
- 22 sept 2026 — **Tranche 1+** crédit musical éditable + toggle séance · précharge audio au pont (chap. 3+) — [`product/SOUVENIR_STREAM_MASTER_49.md`](product/SOUVENIR_STREAM_MASTER_49.md).
- 22 sept 2026 — **Tranche 1+** séance complète (tous médias, titres cinéma, pause KB, portrait+focal) — [`product/SOUVENIR_STREAM_MASTER_49.md`](product/SOUVENIR_STREAM_MASTER_49.md).
- 22 sept 2026 — **Tranche 1** capsule « Voir la séance » sur la film map (draft réel, fullscreen sans hang, hub simulé) — [`product/SOUVENIR_STREAM_MASTER_49.md`](product/SOUVENIR_STREAM_MASTER_49.md).
- 21 sept 2026 — **C8 hub lab** sortie post-séance sur `/test-player` — [`product/SOUVENIR_STREAM_MASTER_49.md`](product/SOUVENIR_STREAM_MASTER_49.md).

Onboarding : [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md) · Canon : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Carte : [`README.md`](README.md).  
**Histoire (juin–août, rien jeté) :** [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md).

Mettre à jour **ce fichier** après un milestone. Le récit long va dans le log.

---

## 1. Executive summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| **Family Studio (wizard)** | 🟢 | **7** étapes (`TOTAL_STEPS = 7` — plus d’étape 8 boutique). Extensions au checkout. Autosave, Stingray, Livre Ouvert, Soft Cap, Inviter, Co-Créateur |
| **Partner Salon** | 🟢 | Invitation Souvenir-only · mes perfs conseiller · solde = **commissions** admin |
| **Freemium V1 commerce** | 🟢 Phases 0–5 | Soft Cap + entitlements + gate export + MP3/ToS — [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Héritage **1080p** · 4K dès Éternité · Phase 6 QA ⏳ |
| **Checkout Stripe** | 🟢 | `/api/checkout` B2C + B2B2C Soft Cap + webhook entitlements / accrual / **`charge.refunded`**. QA replay `checkout.session.completed` ✅ (P17 `submitted`). |
| **RevShare** | 🟢 UI | Spec + SQL P6/P8 + webhook ✅ · UI Salon + `GET /api/partner/commissions` 🟢 · payout ops ⏳ |
| **Export Creatomate** | 🟡 | **C0–C4** ✅ · ML/hub **C5+** — [`product/SOUVENIR_STREAM_MASTER_49.md`](product/SOUVENIR_STREAM_MASTER_49.md) |
| **Boucle virale** | 🟢 produit | Sanctuaire, dépôts, Fonds, share invité = **livrés**. Flag tenant `viral_loop_enabled` = opt-in (défaut SQL `false`). « Viral OFF » du Business Case = *what-if*, pas l’état produit |
| **UX mobile** | 🟡 | Wizard : [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md). **Sanctuaire invité** : HTML still immédiat, WebGL en amélioration |
| **Étape 5 polish** | 🟡 | PR-1/2/3 ✅ · **S5-L partiel** (titre d’étape OK ; titres chapitre défaut encore Étincelle / Épopée / Héritage) · S5-J/K ⏳ |
| **Scanner** | 🟡 | Phase A+B (QR, aperçu → `aiRetouch`) 🟡 · job IA serveur ⏳ |
| **Marque Éclipse** | 🟢 | Play A–B KEEP · mark + exports · brancher UI ⚪ · wormhole = lab |
| **Tests & CI** | 🟢 | Vitest business 🟢 · CI GitHub `npm test` + **`next build`** sur `main` + PR |
| **Security** | 🟡 | RLS, gate Salon, entitlements never-trust, webhook Creatomate fail-closed |

**Suite (après démo 18 sept) :** S5-L2 titres chapitre · S5-clean orphelins · S5-J/K · pas de mix BA cette semaine.

---

## 2. Surfaces (vérité unique)

| Surface | Status | Detail |
|---------|--------|--------|
| Landing / connexions | 🟢 | Halo-Éclipse |
| Wizard **7** étapes | 🟢 | 1 Essentiels · 2 Inviter · 3 Coffre · 4 Son · 5 Livre Ouvert · 6 Aperçu · 7 Checkout. **Plus d’étape 8.** Co-Créateur 3–5 |
| Marque Éclipse + ODYSSEY | 🟢 | [`ODYSSEY_ECLIPSE_LOGO.md`](ODYSSEY_ECLIPSE_LOGO.md) · brancher produit ⚪ |
| Ciel Sanctuaire / intro | 🟡 | Craft ✅ · **J2** wizard étape 1 (ciel + birth + reveal) 🟡 · hub J3 ⏳ · prologue J1 labs · `scene.intro` OFF |
| Médias / Storage | 🟢 | Thumbs WebP + cache session — récit [log §4.1](_archive/PROJECT_STATUS_LOG.md#41-supabase-storage-egress-juin-2026) |
| Stingray preview | 🟢 | MAPI + mock |
| Checkout famille (Stripe) | 🟢 | Soft Cap, `freemium_free`, entitlements |
| Checkout jetons B2B | — | **N/A** — purgé P8. Ne plus planifier |
| Salon invitations | 🟢 | Souvenir 0 $ — **un geste**, pas de picker forfait |
| Salon commissions | 🟢 | `/salon/commissions` + API caisse + pilotage GMV/ouverture/conversion · `/facturation` → redirect |
| Salon mes performances | 🟢 | taux perso + relance `pending` ≥ 3 j (1 e-mail au clic, pas de drip) |
| Odyssey HQ | 🟢 A–D | Formulaire `/partners` + alerte HQ · CRM / onboarding auto ⏳ — [`HQ_ODYSSEY.md`](HQ_ODYSSEY.md) |
| Fonds / packs invité | 🟢 gated | Code 3a livré · visible si `viral_loop_enabled` sur le tenant |
| Scanner Compagnon | 🟡 | Phase A+B (QR, aperçu → `aiRetouch`) 🟡 · job IA serveur ⏳ |
| **Export / render** | 🟡 | Smoke Creatomate ✅ · recette DA + musique ⏳ |
| `app-backend/` | ⚪ | Hors périmètre Next |

**Schéma vivant (post-P8) :** commissions `partner_commission_*` · Soft Cap quota · entitlements · invitations · fonds. **Pas** `partner_token_wallets`. Ordre SQL : [`sql/README.md`](sql/README.md).

---

## 10. Next

*(Ancre conservée : d’autres docs pointent encore « STATUS §10 ».)*

| Priorité | Quoi | Done when |
|----------|------|-----------|
| **P0** | Démo **18 sept 2026** — wizard 7 étapes, Livre Ouvert, aperçu-pont (pas le master) | Famille parcourt 1→7 sans silent-fail autosave ; teaser ≠ film Creatomate |
| **Later** | Étape 6 **mix BA** (bande-annonce + voir un chapitre) — pas le teaser-film actuel | Plan dédié · [`product/WIZARD_PREVIEW_BA.md`](product/WIZARD_PREVIEW_BA.md) |
| **Later** | Étape 6 bandeau Soft Cap **« pourquoi »** (faits, pas alerte générique) | Plan dédié · [`product/WIZARD_PREVIEW_SOFTCAP.md`](product/WIZARD_PREVIEW_SOFTCAP.md) |
| **Ops** | Stripe CLI `stripe login` + `stripe listen` local · activer `charge.refunded` endpoint prod | Webhook local sans script replay |
| **Ops** | Factu / quota egress Supabase | 🟢 egress payé · revert DEMO_MODE **28 août** — [`ops/DEMO_VP_EGRESS_REVERT.md`](ops/DEMO_VP_EGRESS_REVERT.md) (clôturé) |
| A | Master Stingray + preuve rendu | Héritage 1080p / Éternité+ 4K gated |
| B | Flag `viral_loop_enabled` sur **1 tenant** démo/pilote | Fonds visible en démo — [`ops/VIRAL_LOOP_PILOT_RUNBOOK.md`](ops/VIRAL_LOOP_PILOT_RUNBOOK.md) |
| C | Rails UX | Mobile M0 · S5-J/K · Scanner job IA serveur |
| **DA** | Vague 1 Figma ([`DA_SCREENS.md`](DA_SCREENS.md)) — Coffre / Film / Checkout / Sanctuaire / Scanner | Frames signées → code |
| **B2C** | Canal direct : GTM + session ([`B2C_GO_TO_MARKET.md`](B2C_GO_TO_MARKET.md)) — pas d’ads V1 | Landing + paywall Héritage, zéro Souvenir 0 $ |
| — | Labs wormhole / eclipse | Internes — jamais une démo VP |

**Ne plus faire :** débit jetons, wholesale 40 $, coexistence `is_freemium=false`, saga checkout « v1 jetons ».

**Dette acceptée — pont Preview / Checkout (hybride, temporaire) :**
- Étape 6 **lit le storyboard live** (`PreviewStep` + `buildTeaserFromStoryboard` — N chapitres, musiques, ordre). Ce n’est **pas** un teaser 3 actes, **ni** le master Creatomate.
- L’autosave **envoie encore** `montage` + `musicalAmbiance` (miroir 3 actes) à côté du `storyboard` canon.
- Le checkout Stripe **sérialise encore** `act_tracks` (compact) en plus de `storyboard` — [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md).
- Cible aperçu : mix BA, plan plus tard — [`product/WIZARD_PREVIEW_BA.md`](product/WIZARD_PREVIEW_BA.md).

**Dette acceptée (reste) :** S5-L titres 3 actes par défaut · mark Éclipse pas partout · intro ciel OFF · étape 1 code exige **nom** vs D1 CEO (prénom + 2 dates) — [`SANCTUARY_USER_JOURNEY.md`](product/SANCTUARY_USER_JOURNEY.md) §11b.

**Différé :** Stripe Connect auto-payout · Scanner Phase B · Gants Blancs ops · Lyra produit · verticales pets UI.

Canon next commerce : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) Phase 6. Leviers R1–R6 (récit juillet) : [log §10](_archive/PROJECT_STATUS_LOG.md#10-next-sprint--freemium-v1-phase-6--rails-ux).

---

## Ancres historiques

Les §3–9, §11–13 (diagramme wallets, P5.5, dette jetons, SQL P5.5, revue Jon) : [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md) — **figé**.

### 4.1 Supabase Storage egress

🟢 thumbs WebP · poll Coffre **5 s** · fallback full-res legacy OK. Détail : [log §4.1](_archive/PROJECT_STATUS_LOG.md#41-supabase-storage-egress-juin-2026).
