# Carte documentation Odyssey

**Type :** living · **Vérité pour :** index des docs, types, « ne pas copier ».  
**Dernière MAJ :** 21 août 2026 · **Carte :** ce fichier.

**Changelog** (max 5)
- 26 août 2026 — runbook revert egress démo VP : [`ops/DEMO_VP_EGRESS_REVERT.md`](ops/DEMO_VP_EGRESS_REVERT.md).
- 21 août 2026 — regroupement **logique** (business / product / design…) · règle nouveaux docs · chemins inchangés.
- 21 août 2026 — dossier [`TEMP/`](TEMP/README.md) : rush démo Patrice / brouillons.
- 19 août 2026 — GTM B2C + plan session : [`B2C_GO_TO_MARKET.md`](B2C_GO_TO_MARKET.md).
- 19 août 2026 — DA Vague 1 : [`DA_SCREENS.md`](DA_SCREENS.md) (frames Figma ↔ URLs).
- 19 août 2026 — copy écran : `COPY.md` + catalogue généré.

Hiérarchie développeur (ordre de lecture code) : [`CONVENTIONS.md`](CONVENTIONS.md).  
Hub onboarding : [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md).  
État vivant : [`PROJECT_STATUS.md`](PROJECT_STATUS.md).

---

## Regroupement logique (chemins inchangés)

Les fichiers **restent** à `docs/FOO.md` (sauf dossiers déjà physiques : `sql/`, `ops/`, `TEMP/`, `brand/`, `_archive/`).  
Les catégories ci-dessous = **carte mentale** + index. Pas de big bang `business/` pour l’existant.

| Catégorie | Contenu | Dossier pour **nouveaux** docs |
|-----------|---------|--------------------------------|
| **Portes** | Carte, conventions, onboarding, STATUS, Manifesto | racine `docs/` seulement |
| **business** | Prix, RevShare, GTM, playbooks VP, snapshots partenaires, HQ | [`business/`](business/README.md) |
| **product** | Wizard, Sanctuaire, Scanner, Cascade, musique, mobile | [`product/`](product/README.md) |
| **design** | DA Figma, copy, design system | [`design/`](design/README.md) |
| **craft** | Labs éclipse / wormhole / ciel | [`craft/`](craft/README.md) · exports [`brand/`](brand/odyssey-eclipse/README.md) |
| **vision** | CPL / Lyra · cinéma Creatomate (2 « Phase 2 » distinctes) | [`vision/`](vision/README.md) |
| **ops** | SQL, runbooks, QA | [`sql/`](sql/README.md) · [`ops/`](ops/) |
| **TEMP** | Rush, mails, notes session | [`TEMP/`](TEMP/README.md) |
| **archive** | Historique | [`_archive/`](_archive/README.md) |

**Nouveaux fichiers :** naître dans le dossier de la catégorie (§ ci-dessous + [`CONVENTIONS.md`](CONVENTIONS.md)).  
**Existants :** ne pas déplacer sans stubs + décision CEO. Première vague physique possible plus tard = snapshots → `business/` seulement.

---

## Où naît un nouveau doc (étape 2)

| Tu écris… | Créer dans | Exemple |
|-----------|------------|---------|
| Rush démo, mail, notes call / Figma | `TEMP/` | `TEMP/DEMO_….md` |
| Runbook, checklist QA | `ops/` | `ops/….md` |
| Migration SQL | `sql/` | `sql/odyssey_p….sql` |
| Brief partenaire, GTM, business case **neuf** | `business/` | `business/….md` |
| Spec wizard / Sanctuaire / Scanner **neuve** | `product/` | `product/….md` |
| Playbook DA, tokens, copy process **neuf** | `design/` | `design/….md` |
| Lab craft **neuf** | `craft/` | `craft/….md` |
| Vision stratégique **neuve** | `vision/` | `vision/….md` |
| Porte d’entrée (STATUS, conventions) | racine `docs/` | rare |

Toujours : en-tête type · **une ligne dans cette carte** · même commit si code produit.  
Ne **jamais** créer un 2ᵉ FREEMIUM / COPY dans un sous-dossier.

---

## Modèle d’en-tête

À coller sous le H1 des **docs utiles** (canon, living, vision, playbook, temp). Max 5 puces changelog, plus récent en haut.

```
**Type :** canon | living | vision | playbook | temp | …
**Vérité pour :** <une ligne>
**Dernière MAJ :** <date> · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- <date> — <pourquoi>
```

**Pas d’en-tête à réécrire :** [`Manifesto-V10.4.md`](Manifesto-V10.4.md) = bible, lecture seule.  
**Snapshots :** bandeau figé · grille live = FREEMIUM §2.  
**Déménagement physique de masse :** non — [`.cursor/rules/docs-same-commit.mdc`](../.cursor/rules/docs-same-commit.mdc).

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
| **temp** | Provisoire (`TEMP/`). Promouvoir ou jeter. |
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

## Index par catégorie (chemins inchangés)

### Portes d’entrée

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`Manifesto-V10.4.md`](Manifesto-V10.4.md) | bible | Brain / Engine — **ne pas éditer** |
| [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md) | canon | Hub onboarding |
| [`CONVENTIONS.md`](CONVENTIONS.md) | canon | Règles repo + docs |
| [`PROJECT_STATUS.md`](PROJECT_STATUS.md) | living | Où on en est. Log : [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md) |
| [`TECHNICAL_ONBOARDING_ODYSSEY.md`](TECHNICAL_ONBOARDING_ODYSSEY.md) | stub | → `TECHNICAL_ONBOARDING_V1.md` |

### business — commerce, partenaires, GTM

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) | canon | Grille, Soft Cap, phases Freemium |
| [`DELIVERABLES_AND_PACKAGES.md`](DELIVERABLES_AND_PACKAGES.md) | canon | Contrat livrables |
| [`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md) | canon | Granted / intended |
| [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) | canon | Waterfall, ledger, clawback |
| [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) | canon | Soft Cap / RevShare post-purge |
| [`MONETIZATION_CATALOG.md`](MONETIZATION_CATALOG.md) | canon | Leviers |
| [`HQ_ODYSSEY.md`](HQ_ODYSSEY.md) | canon | Tour de contrôle `/hq` |
| [`MEETING_PATRICE_VP.md`](MEETING_PATRICE_VP.md) | playbook | Rencontre VP 60 min |
| [`business/URGEL_ADOPTION_AND_PILOT.md`](business/URGEL_ADOPTION_AND_PILOT.md) | business | Adoption conseillers · pilote Urgel |
| [`business/PATRICE_MURDER_BOARD_PITCH.md`](business/PATRICE_MURDER_BOARD_PITCH.md) | business | Pré-mortem · objections · revenu/famille |
| [`B2C_GO_TO_MARKET.md`](B2C_GO_TO_MARKET.md) | playbook | Canal direct |
| [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md) | snapshot | Projections juil. 2026 — **figé** |
| [`PARTNER_BRIEF_JON_JUL2026.md`](PARTNER_BRIEF_JON_JUL2026.md) | snapshot | Brief Jon, figé |
| [`PARTNER_REPORT_JUL2026.md`](PARTNER_REPORT_JUL2026.md) | snapshot | Rapport partenaire, figé |
| *Nouveaux* | → | [`business/`](business/README.md) |

### product — wizard, Sanctuaire, Scanner

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) | canon | Wizard **7** étapes |
| [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md) | canon | Étape 5 + Composition Magique |
| [`STORYBOARD_REFACTOR.md`](STORYBOARD_REFACTOR.md) | canon | Chapitres / chansons |
| [`WIZARD_EDITOR_COLLAB.md`](WIZARD_EDITOR_COLLAB.md) | canon | Collab éditeur |
| [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md) | canon | UX mobile M0–M6 |
| [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) | canon | Quiet Luxury |
| [`SANCTUARY_SKY_LUEURS.md`](SANCTUARY_SKY_LUEURS.md) | produit | Ciel économique — teal · Lueurs colorées · valeur |
| [`product/SANCTUARY_USER_JOURNEY.md`](product/SANCTUARY_USER_JOURNEY.md) | produit | Parcours User X — prologue · hub · tiroir · nav |
| [`SANCTUARY_TOKEN_NFC.md`](SANCTUARY_TOKEN_NFC.md) | canon | Add-on NFC |
| [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) | canon | Scanner Phase A+B |
| [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md) | canon | Boucle / Fonds |
| [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md) | canon | Proxy musique |
| [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md) | canon | MP3 / ToS |
| [`ROUTES_AND_AUTH.md`](ROUTES_AND_AUTH.md) | canon | URLs / auth |
| [`COMMUNICATIONS_MVP.md`](COMMUNICATIONS_MVP.md) | canon | Courriels pilote |
| *Nouveaux* | → | [`product/`](product/README.md) |

### design — DA, copy, tokens

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`DA_SCREENS.md`](DA_SCREENS.md) | playbook | Frames Figma ↔ URLs |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | canon | Palette, Halo-Éclipse |
| [`COPY.md`](COPY.md) | canon | Copy écran · source JSON |
| [`COPY_CATALOG.md`](COPY_CATALOG.md) | living | Liste FR/EN générée — **pas à la main** |
| *Nouveaux* | → | [`design/`](design/README.md) |

### craft — labs (pas démo VP)

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`ODYSSEY_LUEUR_CRAFT.md`](ODYSSEY_LUEUR_CRAFT.md) | craft | Lab Lueur — Hero · Constellation · Produit |
| [`ODYSSEY_WORMHOLE_CRAFT.md`](ODYSSEY_WORMHOLE_CRAFT.md) | craft | Lab wormhole |
| [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md) | craft | Play A–B KEEP |
| [`ODYSSEY_ECLIPSE_PLAY_AUDIO.md`](ODYSSEY_ECLIPSE_PLAY_AUDIO.md) | craft | Audio / die-cut |
| [`ODYSSEY_ECLIPSE_LOGO.md`](ODYSSEY_ECLIPSE_LOGO.md) | craft | Logo |
| [`ECLIPSE_CRAFT_LAB_NOTES.md`](ECLIPSE_CRAFT_LAB_NOTES.md) | craft | Notes lab |
| [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) | craft | Promesse ciel |
| [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) | craft | WebGL ciel |
| [`SANCTUARY_SKY_THEME.md`](SANCTUARY_SKY_THEME.md) | craft | Knobs ciel |
| [`SANCTUARY_SKY_SCREENSAVER.md`](SANCTUARY_SKY_SCREENSAVER.md) | craft | Screensaver (`scene.intro` OFF) |
| [`SANCTUARY_LUEUR_ORB.md`](SANCTUARY_LUEUR_ORB.md) | craft | Lueur |
| [`brand/odyssey-eclipse/README.md`](brand/odyssey-eclipse/README.md) | craft | Exports DA |
| *Nouveaux labs* | → | [`craft/`](craft/README.md) |

### vision

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`VISION_PHASE_2.md`](VISION_PHASE_2.md) | vision | CPL / MRR / Lyra produit |
| [`ROADMAP_PHASE2.md`](ROADMAP_PHASE2.md) | vision | Moteur cinéma — **autre** Phase 2 |
| *Nouveaux* | → | [`vision/`](vision/README.md) |

### ops / SQL / QA

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`sql/README.md`](sql/README.md) | ops | Migrations P0→P11 |
| [`ops/VIRAL_LOOP_PILOT_RUNBOOK.md`](ops/VIRAL_LOOP_PILOT_RUNBOOK.md) | ops | Pilote `viral_loop_enabled` |
| [`QA_S5_MONTAGE_STEP.md`](QA_S5_MONTAGE_STEP.md) | ops / QA | Checklist Étape 5 |
| [`QA_P6_COMMISSION_WATERFALL.md`](QA_P6_COMMISSION_WATERFALL.md) | ops / QA | QA waterfall |

### TEMP

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`TEMP/README.md`](TEMP/README.md) | ops | Règles TEMP |
| [`TEMP/DEMO_PATRICE_URGEL_RUSH.md`](TEMP/DEMO_PATRICE_URGEL_RUSH.md) | temp | Rush démo Patrice + courriel Paul |
| [`TEMP/NDA_UNILATERAL_BROUILLON_QC.md`](TEMP/NDA_UNILATERAL_BROUILLON_QC.md) | temp | NDA — guide **A / B / C / D** |
| [`TEMP/NDA_A_VALIDEE_LEGALE.md`](TEMP/NDA_A_VALIDEE_LEGALE.md) | temp | NDA **A** validée légale |
| [`TEMP/NDA_B_FREEMIUM_REVSHARE.md`](TEMP/NDA_B_FREEMIUM_REVSHARE.md) | temp | NDA **B** Freemium / RevShare (archive ; préférer D) |
| [`TEMP/NDA_D_RENFORCE.md`](TEMP/NDA_D_RENFORCE.md) | temp | NDA **D** renforcé (cible Patrice, FR) |
| [`TEMP/NDA_D_RENFORCE_EN.md`](TEMP/NDA_D_RENFORCE_EN.md) | temp | NDA **D ENG** miroir anglais (séparé) |
| [`TEMP/NDA_C_ROBUSTE.md`](TEMP/NDA_C_ROBUSTE.md) | temp | NDA **C** = D + non-sollicitation + feedback |

### Archive

| Fichier | Type | Vérité pour |
|---------|------|-------------|
| [`_archive/README.md`](_archive/README.md) | archive | Index historique |
| [`_archive/PROJECT_STATUS_LOG.md`](_archive/PROJECT_STATUS_LOG.md) | archive | Journal STATUS |

---

## Règle de cette carte

- **Ajouter** un fichier docs → une ligne ici (bonne catégorie), même commit si possible.
- **Nouveau** doc → dossier de catégorie (§ « Où naît »), pas forcément la racine.
- **Ne pas** déplacer les chemins existants `docs/FOO.md` sans stubs + décision.
- **Ne jamais** modifier [`Manifesto-V10.4.md`](Manifesto-V10.4.md).
- Code produit → doc + changelog : [`.cursor/rules/docs-same-commit.mdc`](../.cursor/rules/docs-same-commit.mdc).
