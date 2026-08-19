# Carte documentation Odyssey

**Type :** living · **Vérité pour :** index des docs, types, « ne pas copier ».  
**Dernière MAJ :** 17 août 2026 · **Carte :** ce fichier.

**Changelog** (max 5)
- 19 août 2026 — copy écran : `COPY.md` + catalogue généré.
- 17 août 2026 — étape 6 : règle Cursor code+doc même commit. Étape 5 (dossiers) **sautée**.
- 17 août 2026 — étape 4 : snapshots figés ; grilles hors FREEMIUM/DELIVERABLES → lien canon.
- 17 août 2026 — étape 3 : STATUS vivant / log archive ; 4 contradictions corrigées dans le vivant.
- 17 août 2026 — étape 2 : modèle d’en-tête sur les docs utiles (pas le Manifesto).

Hiérarchie développeur (ordre de lecture code) : [`CONVENTIONS.md`](CONVENTIONS.md).  
Hub onboarding : [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md).  
État vivant : [`PROJECT_STATUS.md`](PROJECT_STATUS.md).

---

## Modèle d’en-tête (étape 2)

À coller sous le H1 des **docs utiles** (canon, living, vision, playbook). Max 5 puces changelog, plus récent en haut.

```
**Type :** canon | living | vision | playbook | …
**Vérité pour :** <une ligne>
**Dernière MAJ :** <date> · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- <date> — <pourquoi>
```

**Pas d’en-tête à réécrire :** [`Manifesto-V10.4.md`](Manifesto-V10.4.md) = bible, lecture seule.  
**Snapshots (étape 4) :** bandeau figé · grille live = FREEMIUM §2. Texte long conservé.  
**Étape 5 :** dossiers `canon/` etc. — **non faite** (chemins inchangés).  
**Étape 6 :** [`.cursor/rules/docs-same-commit.mdc`](../.cursor/rules/docs-same-commit.mdc) — code + doc, même commit.

---

## Types

| Type | Signifie |
|------|----------|
| **bible** | Constitution. **Lecture seule — ne jamais éditer.** |
| **canon** | Source de vérité produit / commerce / tech. Corriger ici, pas ailleurs. |
| **living** | Snapshot d’état. À tenir à jour (sans y coller l’histoire longue). |
| **vision** | Feuille de route stratégique. **Pas** le checkout V1. |
| **craft** | Labs visuels (shaders, ciel, marque). Pas une démo VP. |
| **playbook** | Script de rencontre. Traduction orale, pas une 2ᵉ constitution. |
| **snapshot** | Figé à une date / un partenaire. Ne pas y copier les grilles. |
| **ops / QA** | Runbooks, checklists, SQL. |
| **stub** | Redirection. Lire la cible. |
| **archive** | Historique. Ne plus onboarder ni exécuter. |

---

## Ne pas copier depuis

| Sujet | Canon | Ne pas recopier depuis |
|-------|-------|-------------------------|
| Prix, forfaits, Soft Cap | [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) · `pricingConfig.ts` | BRIEF_JON, BUSINESS_CASE, snapshots partenaires |
| Waterfall / 30 % Net | [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) | QA_P6, BUSINESS_CASE (sauf citation datée) |
| Wizard (7 étapes) | [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) | Anciens « 8 steps » |
| Jetons / wallets salon | — (purgés P8) | `_archive/`, SQL P4 historique |
| « Phase 2 » cinéma | [`ROADMAP_PHASE2.md`](ROADMAP_PHASE2.md) | [`VISION_PHASE_2.md`](VISION_PHASE_2.md) (CPL / Lyra / MRR) |
| Lyra (ampleur) | [`Manifesto-V10.4.md`](Manifesto-V10.4.md) | Pitch Patrice (récit salon seulement) |
| Features livrées | [`PROJECT_STATUS.md`](PROJECT_STATUS.md) | Snapshots juillet, briefs |

---

## Index (chemins inchangés)

### Bible

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`Manifesto-V10.4.md`](Manifesto-V10.4.md) | bible | Brain / Engine, graphe, privacy, stack. **Ne pas éditer.** |

### Canon commerce & produit V1

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) | canon | Grille, Soft Cap, musique, phases Freemium |
| [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) | canon | Contrat livrables (code : `wizardDeliverables.ts`) |
| [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) | canon | Granted / intended, dual musique |
| [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) | canon | Waterfall, ledger, clawback |
| [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) | canon | Commerce Soft Cap / RevShare (post-purge) |
| [`MONETIZATION_CATALOG.md`](MONETIZATION_CATALOG.md) | canon | Catalogue leviers |
| [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md) | canon | MP3 perso / ToS |
| [`SANCTUARY_TOKEN_NFC.md`](SANCTUARY_TOKEN_NFC.md) | canon | Add-on NFC |
| [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) | canon | Positionnement Quiet Luxury |
| [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md) | canon | Cascade 3a / boucle / fonds |

### Canon studio & technique

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md) | canon | Hub onboarding (porte développeur) |
| [`CONVENTIONS.md`](CONVENTIONS.md) | canon | Règles repo + hiérarchie lecture |
| [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) | canon | Wizard **7** étapes |
| [`COPY.md`](COPY.md) | canon | Copy écran · source = `dictionaries/*.json` |
| [`COPY_CATALOG.md`](COPY_CATALOG.md) | living | Liste FR/EN générée — **ne pas éditer à la main** |
| [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md) | canon | Étape 5 + Composition Magique |
| [`STORYBOARD_REFACTOR.md`](STORYBOARD_REFACTOR.md) | canon | Modèle chapitres / chansons |
| [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md) | canon | Proxy musique |
| [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) | canon | Studio / Salon / auth |
| [`HQ_ODYSSEY.md`](HQ_ODYSSEY.md) | canon | Tour de contrôle `/hq` (allowlist, macro/micro, payout) |
| [`COMMUNICATIONS_MVP.md`](COMMUNICATIONS_MVP.md) | canon | Copy + courriels pilote (Relance, Stripe, Auth, lead) |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | canon | Palette, Halo-Éclipse |
| [`WIZARD_EDITOR_COLLAB.md`](WIZARD_EDITOR_COLLAB.md) | canon | Collab éditeur |
| [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md) | canon | UX mobile M0–M6 |
| [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) | canon | Spec scanner (Phase A+B aperçu `aiRetouch` 🟡 · job IA ⏳) |
| [`sql/README.md`](sql/README.md) | ops | Migrations P0→P11 |

### Living & vision

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`PROJECT_STATUS.md`](PROJECT_STATUS.md) | living | Où on en est (1–2 pages). Histoire : [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md) |
| [`VISION_PHASE_2.md`](VISION_PHASE_2.md) | vision | Stratégie CPL / MRR / Lyra produit |
| [`ROADMAP_PHASE2.md`](ROADMAP_PHASE2.md) | vision | Moteur cinéma (Creatomate / A24) — **autre** « Phase 2 » |

### Playbook & snapshots partenaires

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`MEETING_PATRICE_VP.md`](MEETING_PATRICE_VP.md) | playbook | Rencontre VP 60 min. Chiffres = modèle V2. Lyra orale ≠ Manifesto |
| [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md) | snapshot | Projections juil. 2026 (1 salon). **Figé** — grille live = FREEMIUM §2 |
| [`PARTNER_BRIEF_JON_JUL2026.md`](PARTNER_BRIEF_JON_JUL2026.md) | snapshot | Brief Jon, figé 31 juil. — ne pas copier la grille |
| [`PARTNER_REPORT_JUL2026.md`](PARTNER_REPORT_JUL2026.md) | snapshot | Rapport partenaire, figé 24 juil. |

### Craft (labs internes)

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`ODYSSEY_WORMHOLE_CRAFT.md`](ODYSSEY_WORMHOLE_CRAFT.md) | craft | Lab wormhole `/fr/contribute/test-wormhole` |
| [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md) | craft | Play A–B KEEP |
| [`ODYSSEY_ECLIPSE_PLAY_AUDIO.md`](ODYSSEY_ECLIPSE_PLAY_AUDIO.md) | craft | Audio / die-cut play |
| [`ODYSSEY_ECLIPSE_LOGO.md`](ODYSSEY_ECLIPSE_LOGO.md) | craft | Matière vivante logo |
| [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md) | craft | Notes lab éclipse |
| [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) | craft | Promesse ciel Sanctuaire |
| [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) | craft | Layers WebGL ciel |
| [`SANCTUARY_SKY_THEME.md`](SANCTUARY_SKY_THEME.md) | craft | Knobs / presets ciel |
| [`SANCTUARY_SKY_SCREENSAVER.md`](SANCTUARY_SKY_SCREENSAVER.md) | craft | Screensaver + intro Éclipse (`scene.intro` OFF) |
| [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md) | craft | Lueur : un composant, deux contextes (carte / ciel) |
| [`brand/odyssey-eclipse/README.md`](brand/odyssey-eclipse/README.md) | craft | Exports DA disc / lockup |

### Ops / QA

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`QA_S5_MONTAGE_STEP.md`](QA_S5_MONTAGE_STEP.md) | ops / QA | Checklist Étape 5 |
| [`QA_P6_COMMISSION_WATERFALL.md`](QA_P6_COMMISSION_WATERFALL.md) | ops / QA | QA waterfall (lire RevShare d’abord) |
| [`ops/VIRAL_LOOP_PILOT_RUNBOOK.md`](ops/VIRAL_LOOP_PILOT_RUNBOOK.md) | ops | Pilote 1 tenant `viral_loop_enabled` (flip / QA / rollback) |

### Stubs & archive

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) | stub | → `TECHNICAL_ONBOARDING_V1.md` |
| [`_archive/README.md`](_archive/README.md) | archive | Index des fichiers historiques |
| [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md) | archive | Journal STATUS (copie 17 août 2026) |

---

## Règle de cette carte

- **Ajouter** un fichier docs → une ligne ici, même commit si possible.
- **Ne pas** déplacer les chemins `docs/FOO.md` (étape 5 sautée).
- **Ne jamais** modifier [`Manifesto-V10.4.md`](Manifesto-V10.4.md).
- Code produit → doc + changelog : [`.cursor/rules/docs-same-commit.mdc`](../.cursor/rules/docs-same-commit.mdc).
