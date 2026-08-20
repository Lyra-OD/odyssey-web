# Odyssey — B2C : GTM, viabilité, session Figma

**Type :** playbook · **Vérité pour :** canal direct (sans salon), priorités CEO, plan session.  
**Dernière MAJ :** 19 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 19 août 2026 — GTM B2C, viabilité, valorisation, plan session Figma + B2C.

**Comment y revenir :** ouvrir **ce fichier**. Ancre STATUS §10 · carte [`README.md`](README.md). En chat Cursor : `@docs/B2C_GO_TO_MARKET.md`. Canvas chiffres : `odyssey-valuation-patrice` (à côté du chat). Grille prix = [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) §2 — **ne pas recopier ici**. Checkout = [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) · Canal = [`IMPLEMENTATION_CASCADE_VFINAL.md`](IMPLEMENTATION_CASCADE_VFINAL.md) · `channelProfile.ts`.

---

## 0. Une phrase

Le **salon amène le volume** (CAC ≈ 0). **B2C amène la marge** (pas de RevShare) et la preuve sociale. On n’achète pas de familles tant qu’on n’a pas un **film qu’on ose envoyer à une tante**. B2C ≠ concurrent du directeur : familles **sans** invitation salon.

---

## 1. Plan session (demain) — ordre, pas tout en parallèle

**Ne pas** : ads, Lyra, 5 salons, labs éclipse, 18 frames Figma signées, changer un prix.

**Deux blocs le même jour.** Figma d’abord (layout), B2C ensuite (produit / copy). Le soir : 1 liste « à coder » issue des frames **ou** des trous B2C — pas les deux stacks.

### Bloc A — Figma (matin, ~2–3 h)

Canon frames : [`DA_SCREENS.md`](DA_SCREENS.md) · mapping Paul §8.

| # | Quoi | Done when |
|---|------|-----------|
| A1 | Fichier **Odyssey — Vague 1 Famille** · 6 pages + `Ref — Paul Rev-2` | Pages nommées comme le playbook |
| A2 | Importer PDF Paul, **verrouiller** | Lecture seule |
| A3 | Page `05 — Composants` : bouton, champ, **stepper 7** (jamais STEP X OF 8) | Composants Figma créés |
| A4 | Frame `studio-03-coffre` 1440 — copy catalogue (`tributeWizard.stepperVault`…) | Nom + description `/fr/studio` |
| A5 | Variante `studio-03-coffre / scan-qr` si le temps | QR dans le Coffre, pas 8ᵉ étape |
| A6 | Commentaire `WIP DA` (pas encore `OK DA`) | On ne code pas le wire ce jour-là sauf trou B2C §B |

Si Paul n’est pas dispo : Erik fait A1–A4 seul. On itère ensemble après.

### Bloc B — Arranger le B2C (après-midi, ~2–3 h)

Le **code canal existe** (`resolveChannelProfile` : direct = Héritage 179 $, `freeExport: false`, preview `watermarked`). Demain = **parcours humain + copy**, pas un 2ᵉ checkout.

| # | Quoi | Done when |
|---|------|-----------|
| B1 | Parcours **incognito** `/fr` → connexion Studio → wizard **sans** invitation | Capturer : où le prix apparaît trop tôt, Souvenir 0 $ visible par erreur, CTA « cadeau salon » |
| B2 | Landing `/fr` : 1 CTA famille = **commencer un hommage** (brouillon), pas 3 cartes forfait en hero | Écart noté → clés `hero` / `pricing` si besoin (FR+EN + catalogue, même commit) |
| B3 | Checkout B2C : plancher **Héritage**, Légendaire = ancre pas CTA #1, **pas** d’export Souvenir | Liste bugs vs `channelProfile` |
| B4 | Étape Cercle + lien Sanctuaire **avant** Finaliser : « les proches peuvent aider à financer le film » | Copy existante ou ticket JSON (pas inventer dans Figma) |
| B5 | Preview : filigrane B2C vs full B2B2C — **vérifier** que c’est vrai à l’écran | Bug = ticket code, pas une 8ᵉ frame |
| B6 | Écrire 5 lignes dans §6 (ce fichier) : ce qui est OK / à coder / hors scope | Session close |

**Hors session demain :** ads, SEO 12 pages, flag viral prod, master Creatomate (priorité **pilote**, autre jour), P16 SQL.

### Fin de journée

- [ ] Frames Coffre WIP dans Figma  
- [ ] §6 de ce doc mis à jour (constat B2C)  
- [ ] Si copy changée : JSON FR+EN + `node scripts/export-copy-catalog.mjs` + commit  
- [ ] Si code checkout/canal : tests + doc commerce **même commit**

---

## 2. Viabilité (opinion CEO, août 2026)

**Oui, viable** si le produit c’est la **vidéo livrée**, pas le wizard. Code commerce riche ; traction = 0.

| Fait | Lecture |
|------|---------|
| Alignement salon (cadeau + share, pas licence) | Fort |
| Prix 179–349 $ au pic émotionnel | Crédible |
| Cercle + Scanner + Sanctuaire | Diff vs wire Paul / montage cheap |
| Master Creatomate ⏳ | **Kill** si on vend sans film |
| Conversion 50 % = hypothèse | Mesurer 90 j pilote ; &lt; 25 % sur salon mature → CRO, pas plus de features |
| Egress Supabase gelé | Bloque démo live |

**Mieux avec ce qu’on a (sans pivot) :** 1 promesse, 1 pilote, 1 métrique conversion, Coffre → Film → Finaliser → export réel. Pas 18 frames + Lyra en parallèle du cash.

---

## 3. Valorisation (hypothèses — pas comptable)

Chiffres salon : snapshot [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md) §0. Canvas interactif (scénarios) à côté du chat.

| Étape | Odyssey / an (ordre) | Fourchette vente boîte | Condition |
|-------|----------------------|------------------------|-----------|
| **Aujourd’hui** | 0 $ encaissé | **75–250 k$** | Asset code · pas de scale |
| **Pilote 12 mo** Base, 50 % volume | ~150 k$ | **150 k$ – 1,2 M$** | Checkouts réels + film livré |
| **1 salon mature** Base | ~294 k$ | **800 k$ – 1,5 M$** | Conversion ~50 % tenue |
| **5 salons an 2** Base | ~1,5 M$ | **4–10 M$** | Playbook répliqué |

B2C **améliore la marge** (100 % Odyssey hors COGS) mais **pas** ces volumes tant que le CAC n’est pas organique (share Sanctuaire, `/watch`).

Phrase Patrice (Base, salon mature) : ~**11 k$ / mois** commission groupe ; pilote moitié vitesse ~**5 k$ / mois**. Dire : hypothèses, pas encaissé.

---

## 4. Stratégie B2C (canon produit déjà là)

### 4.1 Règles (ne pas réinventer)

| Sujet | Vérité |
|-------|--------|
| Entrée | Brouillon gratuit |
| Export | Paywall **strict**, min Héritage **179 $** — pas de Souvenir 0 $ |
| Preview | Filigranée (`previewMode: watermarked`) |
| Forfaits UI | Héritage · Éternité · Légendaire — [`WIZARD_ARCHITECTURE.md`](WIZARD_ARCHITECTURE.md) |
| Fonds | Invité achète **son** empreinte ; Net = crédit famille — Cascade |
| Ads cold | **Non** tant que conversion preview→pay et film ne sont pas prouvés |

### 4.2 Funnel cible

```text
Landing (voix film, pas grille)
  → Compte + essentiels (photo + prénom avant le prix)
  → Coffre + Cercle (≥2 proches) + lien Sanctuaire
  → Le film (preview filigranée)
  → Paywall Héritage 179 $  (− crédit Fonds)
  → Export
```

SKU d’entrée = **Héritage**. Légendaire = ancre Quiet Luxury, pas hero.

### 4.3 Acquisition (ordre)

**Année 1 :** zéro campagne. Share Sanctuaire, bouche-à-oreille `/watch`, SEO étroit **plus tard** (8–12 pages).  
**Année 2 :** retargeting **brouillons** seulement ; budget ads ≤ 30 % de la marge B2C du mois précédent.

**Jamais V1 :** app native, marketplace obits, ads « funérailles » génériques, Souvenir 0 $ B2C.

### 4.4 Mix (hypothèse, à remplacer par Stripe)

100 comptes B2C → ~12–20 payants (plus dur que le 50 % salon). AOV ~240–280 $. Marge unitaire **supérieure** au B2B2C.

### 4.5 Séquence vs pilote salon

| Quand | B2C |
|-------|-----|
| **Maintenant → pilote Patrice** | Landing + wizard. **Zéro ads.** Lien « commencer un hommage » |
| **J+90 / salon qui facture** | Sanctuaire sur projets direct (même flag). KPI : % qui invitent ≥2 proches avant checkout |
| **Preview→pay ≥ 40 %** | SEO étroit + retargeting brouillons |
| **Hors V1** | CPL / Lyra = [`VISION_PHASE_2.md`](VISION_PHASE_2.md) — **pas** ce playbook |

---

## 5. Après demain (90 jours) — pas le 20 août

1. **Film** : 1 export 1080p montrable (master).  
2. **Pilote Patrice** : invitations / Coffre rempli / conversion Héritage / GMV réel.  
3. **B2C** : corriger les trous §6 ; pas de budget ads.  
4. **DA** : signer Coffre → Film → Finaliser (`OK DA`) puis code.

Kill : Soft Cap UX casse la confiance · export perçu nul · salon n’invite pas.

---

## 6. Constat session B2C (à remplir demain)

| Item | OK / trou | Action |
|------|-----------|--------|
| Prix trop tôt sur `/fr` | | |
| Souvenir visible en direct | | |
| Filigrane preview | | |
| CTA Cercle / Sanctuaire | | |
| Copy à ajouter (clés) | | |

*Vide jusqu’à la session. Ne pas inventer des bugs ici.*
