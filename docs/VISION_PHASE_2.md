# Odyssey — Vision produit : Phase 1 · Phase 2 (Licorne) · Phase 3 (Marketplace)

**Type :** vision · **Vérité pour :** stratégie CPL / MRR / Lyra / **Marketplace agrégateur**. **Pas** le checkout V1. ≠ [`ROADMAP_PHASE2.md`](ROADMAP_PHASE2.md) (cinéma).  
**Dernière MAJ :** 10 sept 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 10 sept 2026 — **Phase 3** Agrégateur / Marketplace · **LYRA** = graphe + **chef d’orchestre IA** (admin / légal guidé · directeur + famille).
- 17 août 2026 — en-tête type + carte.
- juillet 2026 — session stratégique partenaires.

Document canonique pour la **feuille de route stratégique** au-delà du sprint commerce P6.  
Complète le [`Manifesto-V10.4.md`](Manifesto-V10.4.md) (constitution technique — **ne pas éditer** ; ce fichier = addendum stratégique).  
**Positionnement émotionnel V1** : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md).  
**Pivot produit V1 (freemium only)** : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md).  
**Moteur cinématographique avancé (vision)** : [`ROADMAP_PHASE2.md`](ROADMAP_PHASE2.md).  
**Pitchs :** [`business/NARRATIVE_VP_ATHOS_SEP2026.md`](business/NARRATIVE_VP_ATHOS_SEP2026.md) · [`business/INVESTOR_NARRATIVE_SANJI_SEP2026.md`](business/INVESTOR_NARRATIVE_SANJI_SEP2026.md).

> **Hiérarchie doc :** ce fichier = **vision & intention produit**. Checkout / pricing / SQL = docs techniques.  
> **Creatomate / A24** = [`ROADMAP_PHASE2.md`](ROADMAP_PHASE2.md) — distinct du commerce Phase 2–3 ci-dessous.

---

## Sommaire

| Section | Contenu |
|---------|---------|
| [§1](#1-cadrage) | Cadrage — Odyssey ≠ funéraire only · stack 1→2→3 |
| [§2](#2-phase-1--ajustements-immédiats-juin-2026) | Phase 1 — Scanner asynchrone + Family Tribute Fund |
| [§3](#3-phase-2--vision-licorne-roadmap-future) | Phase 2 — Lead-Gen CPL · Sanctuaire MRR · Data Graph LYRA |
| [§3bis](ROADMAP_PHASE2.md) | **Moteur Cinématographique Avancé** (autre « Phase 2 ») |
| [§3ter](#3ter-phase-3--agrégateur-global-marketplace--platform-play) | **Phase 3** — Marketplace / longue traîne / take-rate |
| [§4](#4-décisions-architecturales-phase-1-pour-faciliter-la-phase-2) | Décisions archi Phase 1 → 2 (et seeds Phase 3) |
| [§5](#5-risques--garde-fous) | Risques majeurs & garde-fous |
| [§6](#6-liens-implémentation) | Liens vers docs d'implémentation |

---

## 1. Cadrage

Odyssey est une plateforme **multi-vertical** (hommages humains, animaux de compagnie, mariages, événements) dont le back-end reste **agnostique** — voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) § Agnosticité backend.

| Phase | Rôle économique | Preuve |
|-------|-----------------|--------|
| **1 Studio B2B2C** | **Acquisition** — familles via salons (CAC ≈ 0) | Distribution |
| **2 Lyra / MRR / graphe** | **Rétention** — héritage vivant + data consent | Stickiness · multiple |
| **3 Marketplace** | **Extraction plateforme** — agrégateur longue traîne + lead-gen retour partenaires | Take-rate · Platform Play |

```text
Phase 1 (wedge)              Phase 2 (licorne data/MRR)         Phase 3 (agrégateur)
─────────────────            ─────────────────────────         ────────────────────
Commerce freemium            Lead-Gen CPL (pré-arrangements)   Marketplace mondiale
Scanner + Fonds              Sanctuaire MRR 49$/an             Longue traîne (urne → orbite)
Soft Cap / RevShare          Data Graph LYRA                   Take-rate · rabais famille
                             (+ cinéma = autre doc)            Lead-gen salles / terrains → salons
```

**Métaphore investisseur (à doser) :** on commence par les « livres » (film / souvenirs) ; on devient le hub qui route **toute** intention d’achat mémoire / fin de vie — sans inventaire.

**Métaphore partenaire :** Odyssey **remplit leurs salles et terrains** — allié, pas concurrent.
---

## 2. Phase 1 — Ajustements immédiats (juin 2026)

### 2.1 Scanner Web asynchrone (contribution invités)

**Décision stratégique :** le Scanner n'est plus limité à la cérémonie « sur place ». Les **invités** doivent pouvoir contribuer **avant**, **pendant** et **à distance** (diaspora, proches à l'étranger).

| Dimension | Spec v1 (originale) | Spec Phase 1 (ajustée) |
|-----------|-------------------|------------------------|
| **Qui contribue** | Famille / conseiller sur desktop + 1 mobile lié | **Invités multiples** via lien ou QR partageable |
| **Quand** | Session live pendant wizard (TTL ~2 h) | **Fenêtre étendue** : pré-cérémonie → post-cérémonie (jours/semaines) |
| **Où** | Même salle, même réseau | **Async / remote** — PWA web, pas d'app native |
| **Sync desktop** | Temps réel pendant wizard | Realtime **+** notification famille · reprise différée OK |

**Principes produit :**

1. **Lien invité dédié** — URL stable par projet ou par « campagne de collecte » (ex. `/[lang]/contribute/[projectToken]`) en plus du QR wizard desktop.
2. **Sessions longue durée** — `scan_sessions` (ou équivalent) avec `expires_at` configurable par tenant (default 30 jours, pas 2 h).
3. **Contribution sans compte** — token opaque + rate limit ; email optionnel à l'upload (cf. Phase 2 Lead-Gen — consentement explicite).
4. **Modération famille** — uploads invités en statut `pending_review` jusqu'à approbation (Smart Pacing, pas delete — aligné Manifesto).
5. **Badge provenance** — « Via Scanner · Invité · [prénom ou anonyme] » sur chaque média.

**Ciel du Sanctuaire (juil. 2026) :** les souvenirs invités deviennent des **étoiles-mémoire** autour d’une Lueur pure centrale ; la famille les accueille dans le film via **Mettre dans le film** / **Garder seulement ici** / **Retirer du ciel**. Canon : [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md).

**Impact doc technique :** mettre à jour [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) Phase A → **Phase A+** (async guests). Voir [§4](#4-décisions-architecturales-phase-1-pour-faciliter-la-phase-2).

---

### 2.2 Family Tribute Fund (incitation conseiller + aide famille)

**Décision stratégique :** une partie de la **marge Odyssey** (après Platform Fee et RevShare partenaire) finance un solde d’aide à la famille — argument de vente pour le conseiller funéraire. **Le fonds n’impacte jamais la commission partenaire.**

> **⚠️ MISE À JOUR CEO — Cascade V-Final (21 juillet 2026) :** le Family Tribute Fund est
> **remonté de V1.5 → V1** sous le nom **Fonds Commémoratif**, avec une sémantique **CRÉDIT**
> (remise sur le paywall famille) et non plus un versement comptant. **Deux règles ci-dessous sont
> inversées** par [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md), qui **prime** :
> (1) les micro-transactions invités **alimentent désormais** `partner_commission_ledger`
> (30 % du Net à Athos, reason `guest_commission_accrual`) ; (2) le crédit famille =
> `Net Distribuable × fundConversionRate` (défaut 1.0), **porté par Odyssey** (coût marginal ≈ 0 $).

| Élément | Détail |
|---------|--------|
| **Sources de revenus (Phase 1)** | Micro-transactions invités (`guest_micro_checkouts`) — livre photos, HD, extensions portail |
| **Sources de revenus (Phase 2+)** | Option : % de `odyssey_margin_cents` sur `tribute_checkouts` famille — décision produit à confirmer |
| **Allocation Family Fund** | Pourcentage configurable sur la **marge Odyssey** (ex. 10–20 % du net après commission partenaire sur micro-transactions) |
| **Bénéficiaire** | Famille porteuse du projet (`projects.user_id`) — versement manuel ou crédit Stripe (Phase 1 : ledger + ops) |
| **Visibilité conseiller** | Dashboard Salon : « Ce hommage a généré X $ pour la famille via les contributions invités » |
| **RevShare partenaire (Bulletproof)** | 30 % du **Net Distribuable** — sur upsell forfait B2B2C **ET** (V-Final) sur micro-transactions invités (`guest_commission_accrual`). Le crédit Fonds Commémoratif est porté par la **marge Odyssey**, jamais par la commission Athos. |

**Waterfall et Family Fund :**

```text
Gross → Platform Fee 10% → Net Distribuable → Partner Commission 30%
                                              → Odyssey Margin 70%
                                                    → Family Fund (subset)
```

**Principes produit :**

1. **Transparence** — la famille voit le solde Family Fund ; le conseiller voit l'impact commercial.
2. **Séparation comptable** — ledger dédié (`family_tribute_fund_ledger`) — **ne pas mélanger** avec `partner_commission_ledger`.
3. **Phase 1 scope** — spec ledger + affichage solde ; payout automatique = Phase 2.
4. **Garantie CEO (révisée V-Final)** — le **crédit** Fonds Commémoratif est porté par la marge
   Odyssey et ne réduit **jamais** la commission cash d'Athos. Les micro-transactions invités, elles,
   **alimentent** `partner_commission_ledger` (Athos gagne 30 % du Net aussi sur les contributions).
   L'ancienne règle « `allocate_family_tribute_fund_*` ne touche jamais `partner_commission_ledger` »
   est **remplacée** par [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md).

**Argument conseiller (pitch) :** « Odyssey ne coûte pas seulement rien en freemium — il **rapporte** à la famille pendant que vos invités contribuent. »

---

## 3. Phase 2 — Vision Licorne (roadmap future)

> **Statut :** intention stratégique validée CEO / partenaires — **pas d'implémentation** avant clôture Phase 1 commerce + Scanner async MVP.

### Pilier 1 — Lead-Gen (Pré-arrangements) · Modèle CPL

**Objectif :** convertir les invités du hommage en **leads qualifiés** pour le partenaire funéraire (vente de pré-arrangements funéraires).

| Élément | Détail |
|---------|--------|
| **Capture** | Adresse courriel (et consentements) lors de l'upload Scanner / contribution invité |
| **Reciblage** | Campagnes email / retargeting **Odyssey + partenaire** — segments par proximité géographique, âge estimé, lien avec défunt |
| **Monétisation** | **CPL** (Cost Per Lead) — le funérarium paie Odyssey par lead qualifié transmis |
| **Qualification** | Score lead (engagement upload, relation déclarée, ouverture email) — pas de vente directe par Odyssey |

**Garde-fous Loi 25 / GDPR :** consentement marketing **séparé** du consentement transactionnel · opt-in explicite · droit de retrait · voir [§5](#5-risques--garde-fous).

---

### Pilier 2 — Sanctuaire Numérique & MRR

**Objectif :** transformer le projet hommage en **actif SaaS récurrent** après la période de deuil active.

| Élément | Détail |
|---------|--------|
| **Gratuité initiale** | Projet accessible **1 an** post-création (inclus dans forfait ou freemium) |
| **Abonnement** | **49 $/an** « Sanctuaire Numérique » — hébergement, accès invités, mises à jour légères |
| **Rétention killer feature** | **Capsule vidéo anniversaire IA** — générée automatiquement le jour anniversaire du défunt · envoyée à **tous les invités** enregistrés |
| **Stack** | Stripe Billing (subscription) · job scheduler (anniversary cron) · pipeline rendu vidéo (Creatomate / équivalent) |

**Flywheel :** anniversaire → email invités → ré-engagement → contributions / leads CPL → MRR.

---

### Pilier 3 — Projet LYRA (Data Graph + **Chef d’orchestre IA**)

**Objectif double :**

1. **Data Graph (Deep Tech / M&A)** — graphe social et généalogique à partir des médias (Manifesto Vault / Refinery / Market).  
2. **Orchestrateur IA (produit Phase 2+)** — un agent formé pour **assister le directeur funéraire et la famille en ligne** sur le labyrinthe post-décès : démarches administratives, checklists légales, résiliations (téléphone, internet, abonnements…), préparation de dossiers — **sans remplacer** notaire / avocat / conseiller.

| Couche | Rôle | Exemples |
|--------|------|----------|
| **Graphe** | Qui connaît qui · arbre · embeddings | Faces / co-occurrence (consentement explicite) |
| **Orchestrateur** | Chef d’orchestre du parcours admin | Formulaires guidés · checklists QC · lettres de résiliation · rappels · handoff humain |
| **Surfaces** | Deux utilisateurs | **Directeur** (ops salon) · **Famille** (parcours en ligne digne) |

#### Orchestrateur — principe produit

```text
Événement (décès / hommage Odyssey)
  → Lyra propose un plan de tâches (légal / admin / mémoire)
  → Famille ou directeur valide chaque geste
  → Lyra prépare brouillons / envois / tickets fournisseurs Marketplace (P3)
  → Humain signe / notaire / salon reste responsable légal
```

- **Pas d’autonomie totale** sur actes juridiques engageants — Lyra **prépare et orchestre** ; l’humain **scelle**.  
- **Quiet Luxury** — ton digne, pas « robot qui ferme le compte Hydro ».  
- **Pont Phase 3** — quand une tâche = « commander une urne / réserver une salle », Lyra **route** vers la Marketplace (partenaire first).

| Élément graphe | Détail |
|----------------|--------|
| **Input** | Photos/vidéos uploadées (famille + invités Scanner) |
| **Traitement** | Reconnaissance faciale · clustering · inférence relations |
| **Output** | Arbre · graphe social · vecteurs anonymisés agrégés |
| **Séparation Manifesto** | **Vault** (PII) vs **Refinery** (embeddings) vs **Market** (insights) |

**Lien Manifesto :** Odyssey = Emotional Engine + collecte ; **LYRA Hub** = services, graphe, et (vision sept. 2026) **orchestration assistée** — aligné Brain vs Engine ([`Manifesto-V10.4.md`](Manifesto-V10.4.md) §1). Brain = politiques / prompts Lyra ; Engine = exécution déterministe (envois, templates).

**Risques spécifiques orchestrateur :** responsabilité civile si mauvais formulaire · usurpation · phishing via « faux Lyra » — mitigation : validation humaine · périmètre QC d’abord · pas de credentials bancaires en clair · audit trail.
---

## 3ter. Phase 3 — Agrégateur global (Marketplace · Platform Play)

> **Statut :** intention stratégique CEO (sept. 2026) — **pas d’implémentation** avant Phase 1 prouvée (activation + Soft Cap + export digne) et amorces Phase 2 (MRR / CPL / consent).  
> **Pas** dans le texte figé du Manifesto V10.4 table juin 2026 — **ce § est la source canon** ; le Manifesto pointe déjà ici pour la feuille de route stratégique.

### Thèse

Phase 1 capte l’utilisateur à coût quasi nul. Phase 2 le fidélise autour de l’héritage.  
**Phase 3** transforme cette attention en **place de marché transactionnelle** de la mémoire / fin de vie : Odyssey = **routeur central** entre une **demande captive** et une **offre mondiale hyper-fragmentée** (longue traîne).

- **Pas d’inventaire** Odyssey.  
- **Take-rate / affiliation** sur intention d’achat.  
- **Rabais exclusif** famille (valeur perçue).  
- **Lead-gen retour** vers les partenaires funéraires (salles, concessions, terrains) → Odyssey = **allié**, pas concurrent.

### Couverture (masse → ultra-niche)

| Couche | Exemples | Rôle |
|--------|----------|------|
| **Économie circulaire B2B** | Leads vers **nos** partenaires : salles de réception, concessions cimetière | Remplir Athos / réseau |
| **Manufacturier mondial** | Urnes / cercueils flux tendu (ex. scale Asie) | Volume · prix |
| **Artisanat hyper-local** | Ébéniste 3 cercueils/mois sans budget ads | Longue traîne · découverte |
| **Innovation / ultra-luxe** | Diamants de cendres · bio-urnes arbres · niches extrêmes (ex. orbital) | Aspiration · PR · marge |

### Modèle économique

```text
Intention famille (hub Odyssey)
  → Matching fournisseur vérifié (local / mondial / partenaire salon)
  → Prix affiché avec rabais exclusif famille
  → Take-rate Odyssey + (option) revshare réseau funéraire sur lead / vente
  → Zéro stock Odyssey
```

| Levier | Qui gagne |
|--------|-----------|
| Commission / take-rate | Odyssey (marge plateforme) |
| Rabais catalogue | Famille (perception Quiet Luxury, pas discount deuil agressif) |
| Priorité algo salles / terrains | Partenaire funéraire (lead-gen) |
| Accès audience captive | Fournisseur (CPL ou % vente) |

### Pont Phase 2 → Phase 3

Le **CPL pré-arrangements** (Phase 2) est déjà une **marketplace thin** B2B vers le salon.  
Phase 3 **élargit** hors funéraire pur + catalogue produit mondial, tout en **renforçant** le flux retour partenaire.

### Garde-fous Phase 3 (non négociables)

1. **Dignité** — curated · opt-in · jamais spam affilié jour J.  
2. **Partenaire first** — salles / terrains réseau **priorisés** dans le matching.  
3. **Trust** — vetting fournisseurs · SLA · notation.  
4. **Consentement** — marketing / offres séparés du flux transactionnel hommage.  
5. **Séquençage** — pas de build Marketplace avant wedge Phase 1 vert.

### Pitch (renvoi)

- Investisseur : [`business/INVESTOR_NARRATIVE_SANJI_SEP2026.md`](business/INVESTOR_NARRATIVE_SANJI_SEP2026.md) § Phase 3.  
- VP Athos : [`business/NARRATIVE_VP_ATHOS_SEP2026.md`](business/NARRATIVE_VP_ATHOS_SEP2026.md) — **une phrase** lead-gen salles ; pas Chine/SpaceX en ouverture.

---

## 4. Décisions architecturales Phase 1 pour faciliter la Phase 2

Ces choix **ne bloquent pas** le sprint P6 mais doivent être pris **dès la conception** du Scanner async et du schéma médias.

| Décision | Pourquoi maintenant | Artefact cible |
|----------|---------------------|----------------|
| **`contributor_type` + `contributor_email` sur médias** | Distinguer famille / invité / conseiller ; alimenter CPL et Family Fund | `media_assets` ALTER — **inclus T1 P6** |
| **Table `consent_records`** | Opt-in marketing séparé · preuve Loi 25 | **Stub T1 P6** — pas de RPC |
| **`project_access_tokens` longue durée** | Scanner async diaspora sans login | **Stub T1 P6** |
| **`guest_micro_checkouts` séparés de `tribute_checkouts`** | Family Fund + RevShare partenaire sur flux différents | **Stub T1 P6** |
| **`family_tribute_fund_balances` + ledger** | Allocation % micro-transactions invités | **Stub T1 P6** |
| **`persons` + `person_faces` stub (nullable FK)** | Préparer LYRA sans activer reconnaissance | **Stub T1 P6** |
| **`projects.lifecycle_status`** | `active` → `grace_period` → `subscription_required` → `archived` | **Stub T1 P6** |
| **Idempotence & audit sur tout webhook** | MRR + CPL + commissions = multiples flux Stripe | Pattern existant `webhook_events` |
| **Ne jamais hardcoder vertical ou modèle commercial** | Pets / mariage / funéraire sur même schéma | Déjà dans [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) |

---

## 5. Risques & garde-fous

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| **Loi 25 / GDPR — emails invités + CPL** | 🔴 Critique | Consentement granulaire · DPO review · pas de revente PII · registre `consent_records` |
| **Biométrie (reconnaissance faciale)** | 🔴 Critique | Consentement explicite · opt-out · stockage embeddings chiffré · pas de profilage sans base légale (QC + EU) |
| **LYRA orchestrateur — responsabilité légale** | 🔴 Critique | Humain scelle · périmètre QC d’abord · pas credentials bancaires · audit trail · disclaimer notaire/avocat |
| **Family Fund — fiscalité / KYC** | 🟠 Élevé | Versements manuels Phase 1 · avis juridique avant automatisation · traçabilité ledger |
| **Modération contenu invité async** | 🟠 Élevé | `pending_review` · rate limit · signalement · Smart Pacing (Manifesto) |
| **Scope creep Phase 1** | 🟠 Élevé | Family Fund = **ledger + UI solde** only ; CPL / MRR / LYRA = **Phase 2** ; Marketplace = **Phase 3** |
| **Marketplace — perception « vendre le deuil »** | 🔴 Critique | Curated · Quiet Luxury · opt-in · partenaire first · pas jour J |
| **Marketplace — conflit salon** | 🟠 Élevé | Priorité leads salles/terrains réseau · revshare explicite |
| **Marketplace — qualité / fraude fournisseurs** | 🟠 Élevé | Vetting · escrow éventuel · notation · assurance |
| **Complexité ledger (3 flux : RevShare, Family Fund, jetons)** | 🟡 Moyen | 3 tables ledger séparées · jamais mélanger centimes et jetons |
| **Anniversary video — coût rendu** | 🟡 Moyen | Cache template · limite durée · tier subscription couvre COGS |
| **Sessions Scanner longues — abus** | 🟡 Moyen | TTL max · captcha · quota uploads/jour · révocation token |

---

## 6. Liens implémentation

| Sujet Phase 1 | Doc technique |
|---------------|---------------|
| Commerce freemium + RevShare | [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) |
| Scanner (à étendre async) | [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) |
| Sprint P6 T1–T7 | [`PROJECT_STATUS.md`](PROJECT_STATUS.md) §10 |
| Constitution Brain/Engine | [`Manifesto-V10.4.md`](Manifesto-V10.4.md) |
| Multi-vertical tenant-driven | [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) § Agnosticité |
| Pitch VP / investisseur | [`business/`](business/README.md) |

---

## Changelog

| Date | Changement |
|------|------------|
| **10 sept 2026** | **Phase 3** Agrégateur / Marketplace Platform Play (longue traîne · take-rate · lead-gen retour salons) |
| Juin 2026 | Création — session stratégique partenaires : Scanner async, Family Tribute Fund, Phase 2 CPL / MRR / LYRA |
