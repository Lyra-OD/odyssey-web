# Odyssey — Vision produit : Phase 1 (immédiat) & Phase 2 (Licorne)

**Last updated: June 2026 · Session stratégique partenaires d'affaires**

Document canonique pour la **feuille de route stratégique** au-delà du sprint commerce P6.  
Complète le [`Manifesto-V10.4.md`](Manifesto-V10.4.md) (constitution technique) et les specs d'implémentation courantes ([`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md), [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md)).  
**Positionnement émotionnel V1** : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md).  
**Pivot produit V1 (freemium only)** : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md).

> **Hiérarchie doc :** ce fichier = **vision & intention produit**. Le checkout, le pricing et le schéma SQL restent dans les docs techniques dédiées.

---

## Sommaire

| Section | Contenu |
|---------|---------|
| [§1](#1-cadrage) | Cadrage — Odyssey ≠ funéraire only |
| [§2](#2-phase-1--ajustements-immédiats-juin-2026) | Phase 1 — Scanner asynchrone + Family Tribute Fund |
| [§3](#3-phase-2--vision-licorne-roadmap-future) | Phase 2 — Lead-Gen CPL · Sanctuaire MRR · Data Graph LYRA |
| [§4](#4-décisions-architecturales-phase-1-pour-faciliter-la-phase-2) | Décisions archi à prendre dès Phase 1 |
| [§5](#5-risques--garde-fous) | Risques majeurs & garde-fous |
| [§6](#6-liens-implémentation) | Liens vers docs d'implémentation |

---

## 1. Cadrage

Odyssey est une plateforme **multi-vertical** (hommages humains, animaux de compagnie, mariages, événements) dont le back-end reste **agnostique** — voir [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) § Agnosticité backend.

La **Phase 1** (sprint immédiat) livre le moteur commerce B2B2C v2 (freemium, RevShare, checkout saga) et amorce le **Scanner Compagnon**.  
La **Phase 2** (vision Licorne) transforme chaque hommage en **actif récurrent** : leads pré-arrangements, abonnement sanctuaire, graphe social LYRA.

```text
Phase 1 (2026 H1)          Phase 2 (2026 H2 → 2027)
─────────────────          ─────────────────────────
Commerce v2 ✅ doc         Lead-Gen CPL (pré-arrangements)
Scanner web async          Sanctuaire numérique MRR 49$/an
Family Tribute Fund        Capsule anniversaire IA → invités
P6 checkout + RevShare     Data Graph LYRA (faces + arbre)
```

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

### Pilier 3 — Data Graph (Projet LYRA)

**Objectif :** construire l'actif **Deep Tech** pour M&A — graphe social et généalogique à partir des médias uploadés.

| Élément | Détail |
|---------|--------|
| **Input** | Photos/vidéos uploadées (famille + invités Scanner) |
| **Traitement** | Reconnaissance faciale · clustering · inférence relations (co-occurrence, métadonnées, déclarations invité) |
| **Output** | Arbre généalogique enrichi · graphe social (qui connaît qui) · vecteurs anonymisés pour insights agrégés |
| **Séparation Manifesto** | **Vault** (PII, visages bruts) vs **Refinery** (embeddings, patterns) vs **Market** (insights agrégés vendables) |

**Lien LYRA :** Odyssey = Emotional Engine + collecte ; LYRA Hub = services et monétisation du graphe (aligné [`Manifesto-V10.4.md`](Manifesto-V10.4.md) §1).

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
| **Family Fund — fiscalité / KYC** | 🟠 Élevé | Versements manuels Phase 1 · avis juridique avant automatisation · traçabilité ledger |
| **Modération contenu invité async** | 🟠 Élevé | `pending_review` · rate limit · signalement · Smart Pacing (Manifesto) |
| **Scope creep Phase 1** | 🟠 Élevé | Family Fund = **ledger + UI solde** only ; CPL / MRR / LYRA = **Phase 2** |
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

---

## Changelog

| Date | Changement |
|------|------------|
| Juin 2026 | Création — session stratégique partenaires : Scanner async, Family Tribute Fund, Phase 2 CPL / MRR / LYRA |
