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

Atteinte / dépassement de **50** photos (Souvenir) → Soft Cap Quiet Luxury → `intendedPackage = signature` (après acceptation) + autosave. Upload non bloqué après acceptation.

---

## Déclencheur musique → Soft Cap **dual-choice** (Souvenir)

Sélection d’une piste du **catalogue Stingray officiel** depuis Souvenir :

1. **Ne pas bloquer** la piste (frustration positive — la famille l’entend déjà).
2. Afficher une modale à **deux options** :

| Option | Effet state | Panier virtuel | Ce qui se débloque |
|--------|-------------|----------------|--------------------|
| **Licence Musique Premium Stingray — 39 $** | `intended` reste `essential` | `extensions.musicLicense = true` | Catalogue officiel uniquement (reste 50 médias / 1080p) |
| **Écrin Héritage — 149 $** | `intendedPackage = signature` | Forfait Héritage ; **pas** de line item Licence | Musique officielle **incluse** + 4K + 125 médias |

Helper d’accès catalogue (Phase 1) :

```text
officialCatalog =
  intendedPackage >= signature
  OR extensions.musicLicense
  OR paidEntitlements.musicLicense
```

Import MP3/WAV : **masqué sur Souvenir** ; disponible dès `intended >= signature` (+ ToS).

---

## Moment de vérité (étape 8)

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
