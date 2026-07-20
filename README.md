# Odyssey Frontend

Application Next.js 14 (App Router) pour le **Studio Odyssey** — hommages vidéo premium en B2C direct et via le canal partenaire funéraire (B2B2C).

## Résumé exécutif

- **Wizard hommage 8 étapes** — autosave, storyboard chapitres/chansons, **Étape 5 Livre Ouvert** (DnD + Composition Magique), musique Stingray, extensions à la carte, checkout Stripe.
- **Salon partenaire (B2B2C)** — co-branding, invitations famille, RBAC Admin/Directeur, wallet legacy jetons (P5.5 ✅ QA prod).
- **Modèle B2B2C v2 (Scrypta Killer)** — **Freemium** : le forfait **Souvenir** est offert gratuitement par le partenaire (lead-magnet) ; upsell famille en prix plein ; **Bulletproof** : Platform Fee 10 % → RevShare **30 % du Net Distribuable** au partenaire (P6.1).
- **B2C direct (Quiet Luxury)** — 3 forfaits premium : **Héritage 149 $** · **Éternité 299 $** · **Légendaire 499 $** (Gants Blancs) — sans tier gratuit.
- **Scanner Compagnon IA** — Killer App d’ingestion : QR Code sur le wizard desktop → session web mobile → scan photos papier → restauration IA Avant/Après → conversion vers Éternité ou Légendaire.
- **Stack** — Supabase (auth, RLS, Storage), Stripe (checkout + webhook), déploiement Vercel.

**État juillet 2026 :** fondations Salon **certifiées prod** (QA P5.5 ✅) · **Étape 5 Livre Ouvert** livrée (PR-1/2/3) · doc commerce v2 **complète** · implémentation P6 (saga checkout, RevShare, Scanner) = **prochain sprint**.

## Documentation principale

| Document | Contenu |
|----------|---------|
| [`docs/B2B2C_COMMERCE.md`](docs/B2B2C_COMMERCE.md) | **Commerce v2 Bulletproof** — waterfall 10 % + 30 % Net Distribuable, freemium, saga checkout. |
| [`docs/SANCTUARY_STRATEGY.md`](docs/SANCTUARY_STRATEGY.md) | **Stratégie Sanctuaire** — Héros / Archiviste, monétisation V1 émotionnelle. |
| [`docs/FREEMIUM_V1_PIVOT.md`](docs/FREEMIUM_V1_PIVOT.md) | **Pivot CEO V1** — purge jetons, Soft Cap dual musique (`musicLicense` 39 $), grille 4K. |
| [`docs/NARRATIVE_SOFT_CAP.md`](docs/NARRATIVE_SOFT_CAP.md) | Soft Cap granted/intended + Licence vs Héritage + amputation. |
| [`docs/SANCTUARY_TOKEN_NFC.md`](docs/SANCTUARY_TOKEN_NFC.md) | Add-on Jeton Sanctuaire NFC 79 $. |
| [`docs/DELIVERABLES_AND_PACKAGES.md`](docs/DELIVERABLES_AND_PACKAGES.md) | Contrat livrables — Souvenir lead-magnet · Quiet Luxury B2C · Légendaire Gants Blancs. |
| [`docs/PARTNER_REVSHARE.md`](docs/PARTNER_REVSHARE.md) | Ledger commissions · **Net Distribuable** · webhook · clawback · payout. |
| [`docs/QA_P6_COMMISSION_WATERFALL.md`](docs/QA_P6_COMMISSION_WATERFALL.md) | QA chiffrée — 5 scénarios waterfall P6.1. |
| [`docs/SCANNER_COMPANION.md`](docs/SCANNER_COMPANION.md) | Architecture Scanner Compagnon (QR → mobile → IA → upsell). |
| [`docs/STORYBOARD_STEP5_LIVRE_OUVERT.md`](docs/STORYBOARD_STEP5_LIVRE_OUVERT.md) | **Étape 5** — Livre Ouvert, DnD, Composition Magique (canon). |
| [`docs/MOBILE_WIZARD_STRATEGY.md`](docs/MOBILE_WIZARD_STRATEGY.md) | **Stratégie mobile** — Forbes + Ferpection, Scanner, plan M0–M6. |
| [`docs/QA_S5_MONTAGE_STEP.md`](docs/QA_S5_MONTAGE_STEP.md) | Checklist QA régression Étape 5. |
| [`docs/STORYBOARD_REFACTOR.md`](docs/STORYBOARD_REFACTOR.md) | Plan refactor storyboard S1–S10. |
| [`docs/WIZARD_ARCHITECTURE.md`](docs/WIZARD_ARCHITECTURE.md) | Wizard 8 étapes, pricing v2, schéma DB P6. |
| [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) | Audit + plan sprint v2 (QA P5.5 terminée, spike checkout v1 annulé). |
| [`docs/TECHNICAL_ONBOARDING_ODYSSEY.md`](docs/TECHNICAL_ONBOARDING_ODYSSEY.md) | Hub technique — stack, structure, roadmap. |
| [`docs/ROUTES_AND_AUTH.md`](docs/ROUTES_AND_AUTH.md) | Routes Studio / Salon, auth, branding partenaire. |
| [`docs/STINGRAY_MUSIC_INTEGRATION.md`](docs/STINGRAY_MUSIC_INTEGRATION.md) | Musique licenciée Stingray (Standard / Premium). |
| [`docs/QA_P5_5_PARTNER_SALON.md`](docs/QA_P5_5_PARTNER_SALON.md) | Checklist QA Salon — **✅ terminée prod**. |
| [`docs/sql/README.md`](docs/sql/README.md) | Migrations SQL P0–P6. |
| [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | Conventions code + hiérarchie documentation. |

## Quickstart

```bash
npm install
npm run dev
```

Build de vérification (comme en déploiement) :

```bash
npm run build
```

## Vision architecture

Stratégie **moteur unique + multi-skins** :
- base métier commune (auth, médias, paiements, rendu),
- expériences cibles (famille, partenaires funéraires, verticales futures),
- branding adaptable sans fork de la logique cœur.

## Isolation des médias

- séparation forte par `project_id` (Storage + DB),
- `tenant_id` pour segmentation partenaire,
- aucune fuite inter-projets / inter-tenants (RLS P0–P5.5).

## Prochain sprint (implémentation v2)

Voir [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) §10 :

1. **Bugs UX Étape 5** + dimensions sensorielles **S5-J/K/L** (audio, focus, copy)
2. Migration SQL **P6** (déjà appliqué) → brancher **saga checkout v2** (freemium 0 $ + Stripe upsell)
3. Webhook Stripe → completed + **RevShare**
4. **Scanner Compagnon** Phase A (QR + mobile upload)
5. **S7–S10** — pacing UI, Preview/Checkout storyboard, purge legacy actes

## Pricing (cible v2 — doc canon)

Source : [`docs/DELIVERABLES_AND_PACKAGES.md`](docs/DELIVERABLES_AND_PACKAGES.md) · code actuel encore v1 dans `pricingConfig.ts`.

| Canal | Forfaits |
|-------|----------|
| **B2B2C freemium** | Souvenir **0 $** offert · upsell 149 $ / 299 $ · RevShare 30 % **Net Distribuable** |
| **B2C direct** | Héritage **149 $** · Éternité **299 $** · Légendaire **499 $** |
| **Legacy jetons** | Petits salons — wallet P5.5 (coexistence) |

Extensions à la carte (Retouche IA, Licence Premium, USB, Coffre…) — commissionnables en canal freemium.

## Roadmap produit

Détail : [`docs/TECHNICAL_ONBOARDING_ODYSSEY.md`](docs/TECHNICAL_ONBOARDING_ODYSSEY.md) section 10 — moteur vidéo Creatomate, tests CI, croissance virale, verticaliste animaux, sécurité P0–P2.
