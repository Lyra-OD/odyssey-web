# Odyssey Frontend — Project Status

**Type :** living · **Vérité pour :** où on en est, dette acceptée, prochain sprint.  
**Dernière MAJ :** 6 sept 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 6 sept 2026 — **Palette Étape 5 figée** (décision produit, code demain 7 sept) : carte **Composition Magique** en paille `#E4D96F`, carte **Je compose moi-même** en violet (les deux cartes partageaient le même violet au repos jusqu'ici, sans distinction visuelle avant sélection). Teal/cyan inchangé pour sélection/hover/focus et halos. Détail + implémentation prévue : [`design/PALETTE_ARBITRAGE.md`](design/PALETTE_ARBITRAGE.md) §7. Hors scope volontaire : `montageActTheme.ts` (thème `spark` du Studio, système narratif sans rapport) et les autres `amber-*` d'alerte.
- 6 sept 2026 — **« Inviter le cercle » ne créait pas de lien** malgré un compte valide, y compris sur Vercel : bug racine trouvé dans `updateSession` (middleware) — le clone des headers de requête était figé **avant** le rafraîchissement des cookies, donc la session rafraîchie ne redescendait jamais vers le handler dans la même requête, qui retentait alors son propre refresh avec un refresh token déjà consommé → 401 dès l'expiration de l'access token, à chaque fois, pas juste sous concurrence. Corrigé (re-clone des headers *après* la mutation des cookies) + verrou anti-course sur `getUser()` en filet de sécurité + 401 rendus explicites avec reconnexion en un clic (panneau Inviter + poll média) + le déclencheur du menu retente la création du brouillon au lieu de rester désactivé sans explication.
- 6 sept 2026 — En-tête wizard : « Immortaliser » (personne ne comprenait l'action) devient **Inviter famille et amis**, déplacé sous le nom/années (à gauche) au lieu du 3e bloc empilé à droite — c'est l'action la plus importante de l'en-tête. « Co-Créateur / Inviter » devient **Aide création / Confier la réalisation** pour ne plus dire « Inviter » deux fois à des endroits différents.
- 5 sept 2026 — Mobile : barre utilitaire haute (Retour · langue · Déconnexion) qui ne chevauche plus le lockup de marque · choix de composition (Étape 5) présenté en feuille ancrée en bas, posée sur le Studio flouté. Desktop inchangé.
- 6 sept 2026 — **KPI Partenaire/Commissions/HQ invisibles au lieu d'afficher des zéros** : les 3 écrans remplaçaient tout le bloc de chiffres par un simple texte dès qu'un appel échouait (403/500), alors que les KPI sont déjà initialisés à 0 par défaut côté code. Corrigé : les cartes s'affichent toujours (à 0 si besoin), l'erreur devient un bandeau discret au-dessus au lieu d'un remplacement total.

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
| **Étape 5 polish** | 🟡 | PR-1/2/3 ✅ · **S5-L** copy ✅ · S5-J/K ⏳ |
| **Scanner** | 🟡 | Phase A+B (QR, aperçu → `aiRetouch`) 🟡 · job IA serveur ⏳ |
| **Marque Éclipse** | 🟢 | Play A–B KEEP · mark + exports · brancher UI ⚪ · wormhole = lab |
| **Tests & CI** | 🟢 | Vitest business 🟢 · CI GitHub `npm test` + **`next build`** sur `main` + PR |
| **Security** | 🟡 | RLS, gate Salon, entitlements never-trust, webhook Creatomate fail-closed |

**Suite :** ops P16 (quand Supabase dégelé) · master Stingray · pilote 1 tenant flag ON.

---

## 2. Surfaces (vérité unique)

| Surface | Status | Detail |
|---------|--------|--------|
| Landing / connexions | 🟢 | Halo-Éclipse |
| Wizard 7 étapes | 🟢 | Étape 5 = Livre Ouvert · Co-Créateur 3–5 |
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
| **Export / render** | 🟡 | P0 🟢 · master / cinéma ⏳ — **pas** 🔴 |
| `app-backend/` | ⚪ | Hors périmètre Next |

**Schéma vivant (post-P8) :** commissions `partner_commission_*` · Soft Cap quota · entitlements · invitations · fonds. **Pas** `partner_token_wallets`. Ordre SQL : [`sql/README.md`](sql/README.md).

---

## 10. Next

*(Ancre conservée : d’autres docs pointent encore « STATUS §10 ».)*

| Priorité | Quoi | Done when |
|----------|------|-----------|
| **P0** | Slice invité démo **10 sept** (ciel d’abord · étoile nommée stub · courriel · packs) | Script §0 du plan technique vert |
| **Ops** | Stripe CLI `stripe login` + `stripe listen` local · activer `charge.refunded` endpoint prod | Webhook local sans script replay |
| **Ops** | Factu / quota egress Supabase | 🟢 egress payé · revert DEMO_MODE **28 août** — [`ops/DEMO_VP_EGRESS_REVERT.md`](ops/DEMO_VP_EGRESS_REVERT.md) (clôturé) |
| A | Master Stingray + preuve rendu | Héritage 1080p / Éternité+ 4K gated |
| B | Flag `viral_loop_enabled` sur **1 tenant** démo/pilote | Fonds visible en démo — [`ops/VIRAL_LOOP_PILOT_RUNBOOK.md`](ops/VIRAL_LOOP_PILOT_RUNBOOK.md) |
| C | Rails UX | Mobile M0 · S5-J/K · Scanner job IA serveur |
| **DA** | Vague 1 Figma ([`DA_SCREENS.md`](DA_SCREENS.md)) — Coffre / Film / Checkout / Sanctuaire / Scanner | Frames signées → code |
| **B2C** | Canal direct : GTM + session ([`B2C_GO_TO_MARKET.md`](B2C_GO_TO_MARKET.md)) — pas d’ads V1 | Landing + paywall Héritage, zéro Souvenir 0 $ |
| — | Labs wormhole / eclipse | Internes — jamais une démo VP |

**Ne plus faire :** débit jetons, wholesale 40 $, coexistence `is_freemium=false`, saga checkout « v1 jetons ».

**Dette acceptée :** Preview/Checkout lisent encore le pont `actTracks` jusqu’à S8/S9 · mark Éclipse pas partout · intro ciel OFF · étape 1 code exige **nom** vs D1 CEO (prénom + 2 dates) — [`SANCTUARY_USER_JOURNEY.md`](product/SANCTUARY_USER_JOURNEY.md) §11b.

**Différé :** Stripe Connect auto-payout · Scanner Phase B · Gants Blancs ops · Lyra produit · verticales pets UI.

Canon next commerce : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) Phase 6. Leviers R1–R6 (récit juillet) : [log §10](_archive/PROJECT_STATUS_LOG.md#10-next-sprint--freemium-v1-phase-6--rails-ux).

---

## Ancres historiques

Les §3–9, §11–13 (diagramme wallets, P5.5, dette jetons, SQL P5.5, revue Jon) : [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md) — **figé**.

### 4.1 Supabase Storage egress

🟢 thumbs WebP · poll Coffre **5 s** · fallback full-res legacy OK. Détail : [log §4.1](_archive/PROJECT_STATUS_LOG.md#41-supabase-storage-egress-juin-2026).
