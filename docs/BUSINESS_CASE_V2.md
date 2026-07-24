# Odyssey — Business Case V2 (juillet 2026)

**Confidentiel partenaire · Snapshot 24 juillet 2026**  
**Complète :** [`PARTNER_REPORT_JUL2026.md`](PARTNER_REPORT_JUL2026.md) · runtime [`pricingConfig.ts`](../src/lib/wizard/pricingConfig.ts)

> **Règle de lecture :** tout montant hors waterfall unitaire est une **hypothèse** (H1…Hn). Aucune projection n’est une prévision comptable. La Boucle Virale (`viral_loop_enabled`) est **OFF en prod** — les scénarios « viral » sont des *what-if*, pas du revenu acquis.

---

## 1. Thèse

Odyssey monétise l’**attachement** (brouillon gratuit → Soft Cap / export) plutôt que l’entrée payante.

Trois moteurs de panier :

1. **Famille** — forfaits Quiet Luxury **0 / 179 / 349 / 499 $** + add-ons.
2. **Invités** (quand flag ON) — empreintes → Fonds Commémoratif (crédit produit).
3. **Partenaire** — RevShare **30 % du Net** après Platform Fee **10 %**.

Le Co-Créateur n’ajoute pas de SKU : il augmente la **complétion émotionnelle** (plus de médias / musique) → plus de Soft Cap → plus de conversion Héritage+.

---

## 2. Unités runtime (figées)

### Forfaits famille

| SKU | Prix | Commission partenaire (B2B2C) |
|-----|------|-------------------------------|
| Souvenir | 0 $ | 0 |
| Héritage | **179 $** | **48,33 $** (4 833 ¢) |
| Éternité | **349 $** | **94,23 $** (9 423 ¢) |
| Légendaire | **499 $** | N/A (B2C only) |

Formule : `floor(gross × 0.10)` fee → `floor(net × 0.30)` commission.

### Empreintes invité (catalogue)

| SKU | Prix | Net (90 %) | Athos 30 % Net* | Fonds crédit (100 % Net) |
|-----|------|------------|-----------------|---------------------------|
| Bougie | 15 $ | 13,50 $ | 4,05 $ | 13,50 $ |
| Voix | 69 $ | 62,10 $ | 18,63 $ | 62,10 $ |
| Vidéo live | 119 $ | 107,10 $ | 32,13 $ | 107,10 $ |
| Coproduction | 129 $ | 116,10 $ | 34,83 $ | 116,10 $ |
| Mécène (ex. 250 $) | 250 $ | 225,00 $ | 67,50 $ | 225,00 $ |

\*Si tenant `is_freemium`. Odyssey porte le crédit Fonds sur sa marge.

### Add-ons famille (extraits)

Licence musique **39 $** · Voix Histoire **39 $** · Jeton NFC **79 $** · IA **49 $** · Coffre **99 $** · Livre **149 $**.

---

## 3. Hypothèses explicites (à valider CEO / partenaire)

| ID | Hypothèse | Conservateur | Base | Optimiste |
|----|-----------|--------------|------|-----------|
| **H1** | Checkouts famille payants / mois (tous canaux) | 40 | 120 | 280 |
| **H2** | Mix volume payant : Héritage / Éternité / Légendaire | 70 / 25 / 5 | 55 / 35 / 10 | 40 / 45 / 15 |
| **H3** | Part B2B2C (vs B2C) parmi payants | 80 % | 70 % | 60 % |
| **H4** | Attach rate add-ons (panier moyen add-on $) | 12 $ | 28 $ | 45 $ |
| **H5** | Soft Cap → Héritage depuis Souvenir (parmi projets freemium) | 35 % | 50 % | 65 % |
| **H6** | `viral_loop_enabled` | OFF | Pilote 30 % des projets | ON 80 % |
| **H7** | Invités payants / projet viral (ARPU invité) | 0 | 1,2 × ~80 $ | 2,5 × ~95 $ |
| **H8** | Taux Rider 0 $ (Fonds couvre Héritage) parmi viral | — | 15 % | 35 % |
| **H9** | Coûts variables (Stripe ~2,9 %+0,30, storage, Stingray COGS) | 12 % GMV | 11 % GMV | 10 % GMV |
| **H10** | Horizon | Mois M+3 | Mois M+6 | Mois M+12 |

**Panier moyen famille payant (formule) :**

```text
AOV_family ≈ mix_H×179 + mix_E×349 + mix_L×499 + attach_addons
```

| Scénario | AOV famille (hyp.) |
|----------|-------------------|
| Conservateur | 70%×179 + 25%×349 + 5%×499 + 12 ≈ **240 $** |
| Base | 55%×179 + 35%×349 + 10%×499 + 28 ≈ **275 $** |
| Optimiste | 40%×179 + 45%×349 + 15%×499 + 45 ≈ **325 $** |

---

## 4. Trois scénarios mensuels (GMV & marge indicative)

### Méthode

```text
GMV_family     = H1 × AOV_family
GMV_guest      = projets_viral × H7   (0 si flag OFF)
GMV_total      = GMV_family + GMV_guest

Platform_fee   ≈ 10 % × GMV_total          (assiette contractuelle)
Partner_payout ≈ 30 % × (0.9 × GMV_b2b2c)  (approx. ; B2C exclus)
Odyssey_gross  ≈ GMV − Partner_payout − Stripe/COGS(H9)
```

Les chiffres ci-dessous sont **arrondis** à la centaine / millier près.

### Conservateur (M+3) — viral OFF

| Métrique | Valeur |
|----------|--------|
| Checkouts payants | 40 |
| AOV famille | ~240 $ |
| **GMV famille** | **~9 600 $** |
| GMV invité | **0 $** (flag OFF) |
| Commission partenaires (≈80 % B2B2C) | ~2 100 $ |
| Odyssey après fee + com. + COGS (ordre de grandeur) | **~5 000–5 500 $** |

**Lecture :** prouve le Soft Cap / Héritage sans compter sur les invités.

### Base (M+6) — pilote viral 30 %

| Métrique | Valeur |
|----------|--------|
| Checkouts payants | 120 |
| AOV famille | ~275 $ |
| **GMV famille** | **~33 000 $** |
| Projets avec viral | ~36 |
| GMV invité (1,2 × 80 $) | **~3 500 $** |
| **GMV total** | **~36 500 $** |
| Commission partenaires | ~7 000 $ |
| Odyssey ordre de grandeur | **~18 000–20 000 $** |

**Lecture :** le Fonds commence à tirer des Rider 0 $ (H8 ≈ 15 %) → volume émotionnel plus que marge unitaire sur ces deals.

### Optimiste (M+12) — viral large

| Métrique | Valeur |
|----------|--------|
| Checkouts payants | 280 |
| AOV famille | ~325 $ |
| **GMV famille** | **~91 000 $** |
| Projets viral 80 % | ~224 |
| GMV invité (2,5 × 95 $) | **~53 000 $** |
| **GMV total** | **~144 000 $** |
| Commission partenaires | ~22 000–28 000 $ (mix B2B2C) |
| Odyssey ordre de grandeur | **~70 000–85 000 $** |

**Lecture :** le GMV invité devient un second moteur ; Odyssey absorbe plus de crédits Fonds (surveillance marge/projet H9).

---

## 5. Pourquoi ça fonctionne (mécanique, pas wishful thinking)

1. **Ancre prix digne** — Héritage **179 $** (vs ancien 149 $) + Soft Cap : le freemium n’est plus un cul-de-sac à 0 $.
2. **Paywall au pic émotionnel** — checkout après craft ; Co-Créateur remplit le Coffre sans friction prix.
3. **Alignement partenaire** — plus de jetons ; chaque upsell = commission claire (~48 $ sur Héritage).
4. **Invité = financement, pas cannibalisation** — l’empreinte achète *sa* valeur ; le Net devient crédit famille.
5. **Quiet Luxury** — panier moyen cible ~275 $ Base, pas course au low-cost.

---

## 6. Sensibilité (une variable à la fois, scénario Base)

| Variable | −20 % | Base | +20 % |
|----------|-------|------|-------|
| Volume H1 (120) | GMV fam. ~26 k$ | ~33 k$ | ~40 k$ |
| AOV | ~22 k$ | ~33 k$ | ~40 k$ |
| Mix vers Éternité (+10 pts) | — | +~2–3 k$ GMV | — |
| Viral OFF vs Base | −3,5 k$ GMV | Base | — |

Le levier le plus sûr sans flag viral : **volume Soft Cap → Héritage (H5)** et **attach add-ons (H4)**.

---

## 7. Conditions de succès & kill criteria

| Doit être vrai | Kill / pause |
|----------------|--------------|
| Creatomate / export perçu livré | Soft Cap UX casse la confiance |
| Pilote viral avec marge/projet > seuil (à fixer) | Crédit Fonds > marge Odyssey de façon systémique |
| Partenaire comprend RevShare (pas jetons) | Confusion salon → churn invite |
| Docs = runtime (179/349) | Drift commercial |

---

## 8. Prochaines décisions (pas dans ce doc)

1. Date d’activation `viral_loop_enabled` (pilote 1–2 tenants).
2. Objectif volume M+3 réel (remplacer H1).
3. Budget Creatomate / COGS Stingray pour affiner H9.

---

*Business Case V2 — hypothèses H1–H10. Mettre à jour après premiers 30 jours de données Stripe réelles. Rapport narratif : [`PARTNER_REPORT_JUL2026.md`](PARTNER_REPORT_JUL2026.md).*
