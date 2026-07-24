# Odyssey — Rapport partenaire (juillet 2026)

**Confidentiel · Période couverte : 20–24 juillet 2026**  
**Auteur :** équipe produit/tech · **Destinataire :** partenaire stratégique  
**Canvas interactif :** ouvrir à côté du chat dans Cursor (`partner-report-jul2026.canvas.tsx`)

> **Honnêteté calendaire :** l’activité Git sur `main` est concentrée sur **5 jours** (20–24 juil.). Aucun commit produit entre le 10 et le 19. Ce rapport décrit ce sprint intensif, pas deux semaines vides.

**Sources de vérité runtime :** `src/lib/wizard/pricingConfig.ts`, `guestSupportPacks.ts`, checkouts/RevShare.  
**Projections $ :** hypothèses explicites — voir aussi [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md).

---

## 1. Verdict exécutif

En cinq jours, Odyssey a basculé d’un modèle « jetons + paywall précoce » vers un modèle **attachement d’abord, monétisation digne ensuite** :

1. **Freemium V1** — purge jetons, Soft Cap, RevShare seul.
2. **Cascade V-Final** — brouillon gratuit, paywall à l’export, Fonds Commémoratif.
3. **Sanctuaire + Co-Créateur** — le cercle (invités + co-éditeur) contribue au récit et au financement sans voir la caisse.

**Grille famille runtime :** **0 / 179 / 349 / 499 $**.  
**Boucle Virale en prod :** `viral_loop_enabled = false` — le code est là ; le levier revenue invité n’est **pas encore activé**.

---

## 2. Pourquoi on a changé

| Pression | Ancien modèle | Décision |
|----------|---------------|----------|
| Friction partenaire | Stock / débit de jetons opaque | Purge → commission claire 30 % Net |
| Abandon famille | Prix trop tôt, avant l’attachement | Brouillon gratuit → Soft Cap / export |
| Positionnement | Grille 149/299 trop « midmarket discount » | Quiet Luxury accessible **179/349** + ancre 499 |
| Financement collectif | Famille seule paie | Invités → Fonds (crédit produit, pas cash-out) |
| Qualité émotionnelle | Un seul craft Owner | Co-Créateur : craft sans prix ni checkout |

---

## 3. Timeline factuelle (commits `main`)

| Date | Pivot | Preuves (exemples) |
|------|-------|-------------------|
| **20 juil.** | Freemium V1 | Soft Cap, entitlements, docs pivot, purge jetons P8 |
| **21 juil.** | Cascade Data/Core | ChannelProfile, Fonds, webhook invité, crédit checkout |
| **22 juil.** | Phase 0 grille + Sanctuaire | `53112b4` grille 179/349 · UI contribute · Inviter |
| **23 juil.** | Fonds Rider + wizard 7 étapes | Extensions → checkout · Partager Inviter |
| **23–24 juil.** | Co-Créateur A–C | mint/redeem cookie · signed uploads · UI miroir Sanctuaire |

---

## 4. Avant / Après (business)

| Axe | Avant | Après (runtime) |
|-----|-------|-----------------|
| Entrée | Friction / jetons | Brouillon gratuit tous canaux |
| Forfaits | 149 / 299 (+ 0 Souvenir) | **0 / 179 / 349 / 499** |
| Invité | Packs legacy / absent | Voix **69** · Vidéo **119** · Copro **129** · Bougie **15** · Mécène **150–1000** |
| Soft Cap | — | ≥50 médias → Héritage ; musique officielle → Licence 39 $ ou Héritage |
| Partenaire | Wallets jetons | **RevShare only** (10 % platform → 30 % Net) |
| Studio | Owner seul | **Editor** steps 3–5, prix masqué |
| Wizard | 8 étapes documentées | **7 étapes** (Extensions dans checkout) |

### Waterfall famille (centimes) — runtime

Formule : Gross → Platform Fee **10 %** → Net → Partner **30 %** du Net.

| SKU | Gross | Fee | Net | Commission | Odyssey (Net − com.) |
|-----|-------|-----|-----|------------|----------------------|
| Héritage 179 $ | 17 900 | 1 790 | 16 110 | **4 833** (~48,33 $) | 11 277 |
| Éternité 349 $ | 34 900 | 3 490 | 31 410 | **9 423** (~94,23 $) | 21 987 |
| Licence musique 39 $ | 3 900 | 390 | 3 510 | **1 053** | 2 457 |

### Waterfall invité (ex. Voix 69 $, tenant freemium)

| Étape | Montant |
|-------|---------|
| Gross | 6 900 ¢ |
| Platform Fee 10 % | 690 ¢ |
| Net | 6 210 ¢ |
| Commission Athos 30 % Net | 1 863 ¢ |
| Marge Odyssey 70 % Net | 4 347 ¢ |
| **Crédit Fonds famille** | **6 210 ¢** (Net × 100 %, produit — pas de cash-out) |

> Odyssey porte le crédit sur sa marge : le Fonds est un **levier conversion**, pas un compte bancaire famille.

---

## 5. Changement émotionnel

### Famille (Owner)
- **Avant :** décider d’acheter avant d’avoir « senti » le film.
- **Après :** déposer, monter, prévisualiser ; le prix arrive au pic (checkout / Soft Cap). Le Co-Créateur laisse un proche remplir le Coffre ou la musique **sans** voir les tarifs.

### Cercle (invités)
- **Avant :** spectateurs passifs.
- **Après :** Sanctuaire — geste gratuit digne, puis empreinte volontaire qui **aide** la famille (Fonds), sans marchandisation agressive.

### Partenaire (salon)
- **Avant :** gérer des jetons / stock mental.
- **Après :** chaque upsell digne = commission transparente. Alignement : plus le récit est complet, plus le panier naturel monte.

---

## 6. Livré vs non activé

### Livré (code + QA locale significative)

| Capacité | Notes |
|----------|-------|
| Soft Cap médias / musique + entitlements | Phases Freemium |
| Grille Quiet Luxury runtime | `pricingConfig` 0/179/349/499 |
| Sanctuaire Phase 3a UI | Contribute, dépôt, catalogue, Mécène, Inviter |
| Fonds + Rider 0 $ checkout | API + wiring |
| Co-Créateur Phases A–C | Token one-shot, cookie httpOnly, signed uploads, UI mint |
| Wizard 7 étapes | Extensions au checkout |
| MP3 perso + ToS | Tous forfaits (Souvenir inclus) ; Stingray licencié = payant |

### Non activé / stub (ne pas vendre comme « en prod »)

| Capacité | Statut |
|----------|--------|
| `viral_loop_enabled` | **false** en prod |
| Enforce strict 5 photos / invité | Partiel |
| Capture live voix / témoignage (3b) | À venir |
| Creatomate worker réel | Gate stub |
| Fulfillment NFC / Livre POD | Ops ⏳ |
| UI commissions Salon complète | Partiel |

---

## 7. Business cases concrets (illustratifs)

### Cas A — Salon freemium → Héritage

1. Partenaire invite en **Souvenir 0 $**.
2. Famille dépasse 50 médias ou veut Stingray officiel → Soft Cap → **Héritage 179 $**.
3. Partenaire : **~48,33 $** commission ; Odyssey : fee 17,90 $ + ~112,77 $ sur Net.

### Cas B — B2C + Fonds (quand flag ON)

1. Famille construit gratuitement (plancher export Héritage).
2. 3 proches achètent Voix (69 $) → ~3 × 62,10 $ = **~186 $** de crédit Fonds.
3. Checkout famille : Héritage **179 $** largement couvert → **Rider 0 $** + compte/consentement.
4. Athos (si freemium) a déjà pris sa part sur chaque micro-txn ; Odyssey a porté le crédit.

### Cas C — Co-Créateur

1. Owner mint un lien (TTL 14 j, one-shot).
2. Sœur upload photos + choisit musique (signed URLs, pas de prix).
3. Owner revient à l’étape 7 → conversion plus probable car l’œuvre est **déjà riche**.

---

## 8. Risques & prochaines décisions

| Risque | Mitigation |
|--------|------------|
| Docs encore à 149/299 | Audit P0 en cours (même sprint) |
| Viral flag OFF | Pilote contrôlé post-3a ; ne pas projeter revenue invité comme acquis |
| Creatomate stub | Phase export = prochain levier « livrable perçu » |
| Soft Cap trop tôt | Copy Quiet Luxury + dual choice musique |

---

## 9. Annexes techniques courtes

| Domaine | Pointeur |
|---------|----------|
| Prix | `src/lib/wizard/pricingConfig.ts` |
| Empreintes | `src/lib/wizard/guestSupportPacks.ts` |
| Collab | [`WIZARD_EDITOR_COLLAB.md`](WIZARD_EDITOR_COLLAB.md) |
| Cascade | [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md) |
| RevShare | [`PARTNER_REVSHARE.md`](PARTNER_REVSHARE.md) |
| Canon pivot | [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) |

---

*Document vivant — snapshot 24 juillet 2026. Les projections multi-scénarios sont dans [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md).*
