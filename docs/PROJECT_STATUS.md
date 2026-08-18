# Odyssey Frontend — Project Status

**Type :** living · **Vérité pour :** où on en est, dette acceptée, prochain sprint.  
**Dernière MAJ :** 18 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 18 août 2026 — Funnel B2B2C QA : replay webhook → checkout `completed` / commission `accrued` · P17 `project_status.submitted`.
- 18 août 2026 — P0-02 : webhook Stripe `charge.refunded` (clawback ledger + révocation export).
- 18 août 2026 — HQ Slice D : formulaire `/partners` + alerte Resend (SQL P15).
- 17 août 2026 — HQ C.3 : drill directeurs sur `/hq/salons/[id]` (Mes performances, lecture).
- 17 août 2026 — HQ C.2 : fiche `/hq/salons/[tenantId]` (miroir commissions + payout).

Onboarding : [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md) · Canon : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Carte : [`README.md`](README.md).  
**Histoire (juin–août, rien jeté) :** [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md).

Mettre à jour **ce fichier** après un milestone. Le récit long va dans le log.

---

## 1. Executive summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| **Family Studio (wizard)** | 🟢 | **7** étapes (`TOTAL_STEPS = 7`, Extensions au checkout). Autosave, Stingray, Livre Ouvert, Soft Cap, Inviter, Co-Créateur |
| **Partner Salon** | 🟢 | Invitation Souvenir-only · mes perfs conseiller · solde = **commissions** admin |
| **Freemium V1 commerce** | 🟢 Phases 0–5 | Soft Cap + entitlements + gate export + MP3/ToS — [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Héritage **1080p** · 4K dès Éternité · Phase 6 QA ⏳ |
| **Checkout Stripe** | 🟢 | `/api/checkout` B2C + B2B2C Soft Cap + webhook entitlements / accrual / **`charge.refunded`**. QA replay `checkout.session.completed` ✅ (P17 `submitted`). |
| **RevShare** | 🟢 UI | Spec + SQL P6/P8 + webhook ✅ · UI Salon + `GET /api/partner/commissions` 🟢 · payout ops ⏳ |
| **Export Creatomate** | 🟡 P0 / master ⏳ | **P0 livré** (gate, P9/P9.1, `src/lib/creatomate/`, drain, webhook fail-closed). **Pas** « documented only ». Master Stingray / rendu cinéma ⏳ |
| **Boucle virale** | 🟢 produit | Sanctuaire, dépôts, Fonds, share invité = **livrés**. Flag tenant `viral_loop_enabled` = opt-in (défaut SQL `false`). « Viral OFF » du Business Case = *what-if*, pas l’état produit |
| **UX mobile** | 🟡 | [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md) M0–M6 |
| **Étape 5 polish** | 🟡 | PR-1/2/3 ✅ · S5-J/K/L ⏳ |
| **Scanner** | 🟡 | Phase A+B (QR, aperçu → `aiRetouch`) 🟡 · job IA serveur ⏳ |
| **Marque Éclipse** | 🟢 | Play A–B KEEP · mark + exports · brancher UI ⚪ · wormhole = lab |
| **Tests & CI** | 🟡 | Vitest business 🟢 · CI GitHub ⏳ |
| **Security** | 🟡 | RLS, gate Salon, entitlements never-trust, webhook Creatomate fail-closed |

**Suite :** ops P16 + Stripe listen · CI GitHub · master Stingray · pilote 1 tenant flag ON.

---

## 2. Surfaces (vérité unique)

| Surface | Status | Detail |
|---------|--------|--------|
| Landing / connexions | 🟢 | Halo-Éclipse |
| Wizard 7 étapes | 🟢 | Étape 5 = Livre Ouvert · Co-Créateur 3–5 |
| Marque Éclipse + ODYSSEY | 🟢 | [`ODYSSEY_ECLIPSE_LOGO.md`](ODYSSEY_ECLIPSE_LOGO.md) · brancher produit ⚪ |
| Ciel Sanctuaire / intro | 🟡 | Craft ✅ · `scene.intro` OFF |
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
| **Export / render** | 🟡 | P0 🟢 · master / cinéma ⏳ — **pas** 🔴 |
| `app-backend/` | ⚪ | Hors périmètre Next |

**Schéma vivant (post-P8) :** commissions `partner_commission_*` · Soft Cap quota · entitlements · invitations · fonds. **Pas** `partner_token_wallets`. Ordre SQL : [`sql/README.md`](sql/README.md).

---

## 10. Next

*(Ancre conservée : d’autres docs pointent encore « STATUS §10 ».)*

| Priorité | Quoi | Done when |
|----------|------|-----------|
| **Ops demain** | Jouer **P16** (RLS invitations) si pas encore en SQL Editor · confirmer P13–P15 | Policies salon scope conseiller |
| **Ops demain** | Stripe CLI `stripe login` + `stripe listen` local · activer `charge.refunded` endpoint prod | Webhook local sans script replay |
| **Ops demain** | Factu Supabase (bandeau *Grace period is over*) | Quota / billing OK |
| A | Phase 6 : CI `npm test` sur PR | Pipeline vert |
| A | Master Stingray + preuve rendu | Héritage 1080p / Éternité+ 4K gated |
| B | Flag `viral_loop_enabled` sur **1 tenant** démo/pilote | Fonds visible en démo — [`ops/VIRAL_LOOP_PILOT_RUNBOOK.md`](ops/VIRAL_LOOP_PILOT_RUNBOOK.md) |
| C | Rails UX | Mobile M0 · S5-J/K/L · Scanner job IA serveur |
| — | Labs wormhole / eclipse | Internes — jamais une démo VP |

**Ne plus faire :** débit jetons, wholesale 40 $, coexistence `is_freemium=false`, saga checkout « v1 jetons ».

**Dette acceptée :** Preview/Checkout lisent encore le pont `actTracks` jusqu’à S8/S9 · mark Éclipse pas partout · intro ciel OFF.

**Différé :** Stripe Connect auto-payout · Scanner Phase B · Gants Blancs ops · Lyra produit · verticales pets UI.

Canon next commerce : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) Phase 6. Leviers R1–R6 (récit juillet) : [log §10](_archive/PROJECT_STATUS_LOG.md#10-next-sprint--freemium-v1-phase-6--rails-ux).

---

## Ancres historiques

Les §3–9, §11–13 (diagramme wallets, P5.5, dette jetons, SQL P5.5, revue Jon) : [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md) — **figé**.

### 4.1 Supabase Storage egress

🟢 thumbs WebP. Détail : [log §4.1](_archive/PROJECT_STATUS_LOG.md#41-supabase-storage-egress-juin-2026).
