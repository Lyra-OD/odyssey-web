# Soft Cap — Expansion Narrative

**Dernière révision : juillet 2026**

Parent : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Émotion : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) · Musique : [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md).

---

## Contrat d’état

| Champ | Définition |
|-------|------------|
| `grantedPackage` | Forfait offert par le salon (`essential` typiquement). Immuable côté client. |
| `intendedPackage` | Forfait construit (médias / upgrade Héritage). Mutable **sans** CB. |
| `extensions.musicLicense` | Add-on **39 $** — accès catalogue Stingray officiel **sans** monter le forfait. |
| Quotas runtime | Manifeste de `max(granted, intended)` (Licence musique **ne** relève **pas** le plafond médias / 4K). |
| Checkout | Line items = delta forfait (`intended` vs `granted`) **+** add-ons panier ; strip `musicLicense` si `intended >= signature`. |

Ne **jamais** écraser `grantedPackage` lors d’un Soft Cap.

---

## Déclencheur médias → Héritage

Atteinte / dépassement de **50** photos (Souvenir) → Soft Cap Quiet Luxury → `intendedPackage = signature` (après **acceptation UI**) + autosave. Upload non bloqué après le seuil (plafond runtime Héritage tant que freemium).

> **Ne jamais** auto-bumber `intended` en silence : cela désactive le filet 50 et le Soft Cap post-Composition Magique.

### Moment préféré : après Composition Magique

Ne pas se contenter d’un toast froid à la 51ᵉ photo. **Le Soft Cap médias le plus puissant** s’affiche quand la famille a **déjà vécu** le chef-d’œuvre :

1. Ils déposent / scannent (éventuellement au-delà de 50 avec Soft Cap soft ou plafond intended déjà monté).
2. Ils lancent la **Composition Magique** (Livre Ouvert) — placement automatique des médias.
3. **Ensuite** : modale Quiet Luxury du type :

> *« Votre histoire compte déjà 110 souvenirs tissés ensemble. Pour ne laisser aucun moment dans l’ombre, débloquez la toile Héritage (jusqu’à 125 médias, export 1080p). »*

Règles :

- Soft Cap **à 50** : auto-modale filet + bandeau étape Médias avec CTA — copy courte, pas de prix froid.
- Soft Cap **post-Composition Magique** = moment d’aversion à la perte principal (Phase 4 UX) — exige que `intended` soit encore Souvenir.
- Soft Cap **Preview** : ancre valeur Héritage avant checkout si engagement Soft Cap ou dépassement quota cadeau.
- Si `intended` est déjà `signature`+, ne pas re-spammer la modale.

---

## Déclencheur musique → Soft Cap **dual-choice** (Souvenir)

Sélection d’une piste du **catalogue Stingray officiel** depuis Souvenir :

1. **Ne pas bloquer** la piste (frustration positive — la famille l’entend déjà).
2. Afficher une modale à **deux options** :

| Option | Effet state | Panier virtuel | Ce qui se débloque |
|--------|-------------|----------------|--------------------|
| **Licence Musique Premium Stingray — 39 $** | `intended` reste `essential` | `extensions.musicLicense = true` | Catalogue officiel uniquement (reste 50 médias / 1080p) |
| **Écrin Héritage — 179 $** | `intendedPackage = signature` | Forfait Héritage ; **pas** de line item Licence | Musique officielle **incluse** + **1080p** + 125 médias (Master **4K** = Éternité+) |

Helper d’accès catalogue (Phase 1) :

```text
officialCatalog =
  intendedPackage >= signature
  OR extensions.musicLicense
  OR paidEntitlements.musicLicense
```

Import MP3/WAV : **disponible tous forfaits** (Souvenir inclus) + attestation ToS. Stingray licencié reste payant (Licence 39 $ ou Héritage+).

---

## Moment de vérité (étape 7 — Checkout)

Synthèse du chef-d’œuvre + lignes dues (Héritage et/ou Licence 39 $ et/ou autres add-ons).

| Choix famille | Action |
|---------------|--------|
| Payer | Stripe → entitlements webhook → export (master Stingray si package ≥ Héritage **ou** `musicLicense` payé) |
| Rester à 0 $ | **Amputation** : médias ≤ 50 ; retirer pistes catalogue officiel **et** clear `musicLicense` ; revalidation serveur → `freemium_free` |

---

## COGS

Preview = proxy ; master Stingray Creatomate = post-paiement avec entitlement musique valide (forfait **ou** Licence).

---

## SQL / quotas

Trigger P7 : plafond médias = `intendedPackage ?? basePackage ?? granted`.  
La Licence 39 $ **n’augmente pas** `maxMediaItems`.
