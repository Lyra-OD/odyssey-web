# Plan démo Patrice — prep opérationnelle

**Type :** temp · **Vérité pour :** checklists J-7 / J-1 / jour J · craft vidéo · kit QR — **pas** la vérité produit.  
**Session :** **mercredi 10 septembre 2026 · 8 h** · **Carte :** [`../README.md`](../README.md)

**Canon présentation :** [`../MEETING_PATRICE_VP.md`](../MEETING_PATRICE_VP.md) · **Vérité code :** [`product/SANCTUARY_USER_JOURNEY.md`](../product/SANCTUARY_USER_JOURNEY.md) §11b  
**Rush 6 beats :** [`DEMO_PATRICE_URGEL_RUSH.md`](DEMO_PATRICE_URGEL_RUSH.md) · **Adoption pilote :** [`../business/URGEL_ADOPTION_AND_PILOT.md`](../business/URGEL_ADOPTION_AND_PILOT.md)

**Règle :** ce fichier **expire** après la session. Le canon produit ne porte **pas** la date de démo — seulement l’état J1–J9.

**Changelog** (max 5)
- 28 août 2026 — Date fixée 10 sept. 8 h · calendrier J-13 → J · réaliste vs stretch.
- 26 août 2026 — Séparation canon / playbook démo (§11b journey).

---

## Vue d’ensemble — 13 jours (28 août → 10 sept.)

| Fenêtre | Focus |
|---------|--------|
| **28–31 août** | Environnement démo + données + 1er dry-run Mode A |
| **1–4 sept.** | Polish oral · marketing B2C restant · vidéo Mode B · Fonds ON |
| **5–6 sept.** (WE) | Dry-runs ×2 · script au chaud |
| **7 sept.** | Fête du Travail — **léger** : relire script, pas de dev risqué |
| **8–9 sept.** | Gel prod · J-1 checklist · secours Figma/tel |
| **10 sept. 8 h** | **Jour J** — Mode A live, business après émotion |

---

## Ce qu’on présente vs ce qu’on ne promet pas

### ✅ Réaliste et déjà là (Mode A — cœur de la démo)

| Beat | Surface | État code |
|------|---------|-----------|
| 1 | Salon → **1 invitation Souvenir** | 🟢 |
| 2 | **Sanctuaire mobile** (contribute) | 🟢 |
| 3 | Studio **Coffre** (étape 3) | 🟢 |
| 4 | Studio **Film** (étape 5 Livre Ouvert) | 🟢 |
| 5 | Studio **Finaliser** (étape 7 · Soft Cap) | 🟢 |
| 6 | **Commissions** Salon | 🟢 |
| — | Page **`/fr/partners`** (contexte B2B si question) | 🟢 livré 28 août |
| — | Accueil + CTA inscription studio | 🟢 |
| — | Pitch business (179/349 · 30 % net · Fonds) | 🟢 oral — [`MEETING_PATRICE_VP.md`](../MEETING_PATRICE_VP.md) |

**Durée cible Mode A :** 15–20 min live + 25–35 min business / objections / ask pilote.

### 🟡 Stretch réalisable d’ici le 10 (si bande passante)

| Item | Effort | Impact démo |
|------|--------|-------------|
| **`viral_loop_enabled` ON** sur tenant démo Urgel | ½ j · SQL + smoke | Fonds visible étape 7 — **fort pour pitch §1.5b** |
| **Vidéo Mode B** 60–90 s (prologue éclipse → wormhole) | ½ j capture + montage | Wow sans pari live |
| **Kit QR A6** PDF (invitation famille) | 2–3 h | Pont « conseiller en salon » |
| **8–12 vraies photos** dans Coffre démo | 1–2 h curation | Film crédible |
| **Marketing Phase 2** (copy zéro montage · Process 3 temps) | 1 session | Cohérence si Patrice ouvre `/fr` avant |
| **Dry-run ×3** enregistrés | 3 × 25 min | Confiance jour J |

### ❌ Hors scope d’ici le 10 (ne pas montrer live)

| Item | Pourquoi |
|------|----------|
| Labs `/test-wormhole`, `/test-eclipse*`, lueur craft | Instables · **vidéo seulement** |
| Wizard **J3 hub** post-reveal (carte Inviter) | Pas livré |
| **HQ** Odyssey | Pas l’audience VP salon |
| Master **Stingray / export Creatomate** final | P0 gate OK · rendu cinéma ⏳ |
| Scanner **job IA serveur** | Phase B partielle |
| **Stripe Connect** payout auto | Ops manuel · ledger suffit |
| **Lyra** produit long | Hors promesse |
| Prix **149/299 $** | **Faux** — canon 179/349 |

---

## Calendrier jour par jour

### Ven **28 août** (J-13 · aujourd’hui)

- [x] `/partners` B2B · CTA Hero cliquable · nav Manifesto
- [ ] **Fixer URL prod démo** (Vercel preview ou prod)
- [ ] Créer / vérifier **tenant démo Urgel** (logo, slug `?partenaire=`)
- [ ] Lister comptes : directeur salon · famille studio · tel secondaire

### Sam **29 août** · Dim **30 août** (WE — optionnel)

- [ ] Curater **8–12 photos** hommage test (nom + dates cohérents)
- [ ] Relire [`SCRIPT_DE_FER_PATRICE.md`](../business/SCRIPT_DE_FER_PATRICE.md) 20 min
- [ ] 1 dry-run solo Mode A · noter les frictions

### Lun **31 août** (J-10)

- [ ] **Environnement démo stable** : build Vercel vert · smoke login studio/salon
- [ ] **Invitation Souvenir** test de bout en bout → lien Sanctuaire iPhone Safari
- [ ] Pré-remplir Studio (Coffre + quelques médias contribute)

### Mar **1er sept.** (J-9)

- [ ] **Dry-run Mode A #1** chronométré (< 20 min) · corriger blockers
- [ ] Décision **Fonds** : activer `viral_loop_enabled` sur tenant démo ? ([`../ops/VIRAL_LOOP_PILOT_RUNBOOK.md`](../ops/VIRAL_LOOP_PILOT_RUNBOOK.md))
- [ ] Marketing **Phase 2** copy (zéro montage · Process Coffre/Cercle/Film) — si 2 h dispo

### Mer **2 sept.** (J-8)

- [ ] **Capture vidéo Mode B** (éclipse → wormhole → hero → constellation) 60–90 s
- [ ] Export MP4 sur laptop démo · phrase secours : *« Prochaine MAJ — expérience immersive. »*
- [ ] Tester wizard **étape 1 ciel** — si lag → **exclure du live**

### Jeu **3 sept.** (J-7)

- [ ] **Dry-run Mode A #2** avec 2e personne (joue la famille sur tel)
- [ ] **`/fr/salon/commissions`** : s’assurer chiffres lisibles (même mock / historique test)
- [ ] Esquisse **PDF QR A6** (logo · QR invitation · phrase famille)

### Ven **4 sept.** (J-6)

- [ ] **Dry-run Mode A #3** = run of show complet (Mode A + clip Mode B + business 10 min)
- [ ] Onglets browser **ordre fixe** (Salon · Studio · Commissions · contribute · partners)
- [ ] 2e écran / notes : ce fichier + [`DEMO_PATRICE_URGEL_RUSH.md`](DEMO_PATRICE_URGEL_RUSH.md)

### Sam **5 sept.** · Dim **6 sept.** (WE)

- [ ] Reposer · **relire oral** §1 MEETING (3 phrases + objections Murder Board)
- [ ] Dernier smoke Sanctuaire mobile (Wi‑Fi + 4G)
- [ ] Batterie laptop + tel chargés · câble HDMI testé

### Lun **7 sept.** — **Fête du Travail** (J-3)

- [ ] **Pas de deploy risqué**
- [ ] Relire [`PATRICE_MURDER_BOARD_PITCH.md`](../business/PATRICE_MURDER_BOARD_PITCH.md)
- [ ] Préparer **ask pilote** (1 salon · 90 j · flag Fonds · point mensuel)

### Mar **8 sept.** (J-2)

- [ ] **Gel code** sauf hotfix démo
- [ ] Vérifier prod : CTA accueil · partners · salon branding
- [ ] Re-seed médias si session démo polluée
- [ ] NDA / DocuSign si requis ([`URGEL_ADOPTION`](../business/URGEL_ADOPTION_AND_PILOT.md))

### Mer **9 sept.** (J-1)

- [ ] **Dry-run final** même salle / même réseau si possible · 8 h = matin tôt
- [ ] Laptop : Mode A onglets · MP4 Mode B · PDF QR · Figma secours
- [ ] Désactiver notifs · mode Ne pas déranger · compte démo reconnecté
- [ ] Plan B : tel seul Sanctuaire + Studio pré-rempli ([`MEETING`](../MEETING_PATRICE_VP.md) §2 secours)

### Jeu **10 sept.** — **JOUR J · 8 h**

| Min | Contenu |
|-----|---------|
| 0–5 | Accroche · logo / écran noir |
| 5–22 | **Mode A live** (6 beats) |
| 22–25 | **Vidéo Mode B** *(si prête)* |
| 25–45 | Business §1 · Fonds · RevShare · hypothèses $/famille |
| 45–55 | Objections · Murder Board |
| 55–60 | **Ask pilote** |

**3 phrases à mémoriser :**

1. *« Vos conseillers offrent un geste. Odyssey fait le reste. »*  
2. *« Souvenir 0 $ · Héritage **179 $** · Éternité **349 $**. »*  
3. *« **30 % du net distribuable**. »*

---

## Priorités si manque de temps

1. **Mode A live** fiable ×3 dry-runs  
2. **Sanctuaire iPhone** + Studio pré-rempli  
3. **Oral + chiffres** 179/349 · pas 149/299  
4. **Commissions** écran (même vide)  
5. Vidéo Mode B  
6. Kit QR A6  
7. Marketing Phase 2 accueil  
8. Fonds flag ON  
9. Craft / ciel J2 live  

---

## Livrables fin de prep

| Livrable | Cible date | OK ? |
|----------|------------|------|
| Tenant démo + branding Urgel | 31 août | |
| 3 dry-runs Mode A | 4 sept. | |
| Oral + objections | 7 sept. | |
| MP4 Mode B ou « reporté » noté | 2 sept. | |
| PDF QR A6 v0 | 3 sept. | |
| Gel prod J-2 | 8 sept. | |

---

*Après la session : archiver ce TEMP.*
