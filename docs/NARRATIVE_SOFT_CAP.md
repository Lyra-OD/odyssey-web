# Soft Cap — Expansion Narrative

**Dernière révision : juillet 2026**

Parent : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Émotion : [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md).

---

## Contrat d’état

| Champ | Définition |
|-------|------------|
| `grantedPackage` | Forfait offert par le salon (`essential` typiquement). Immuable côté client. |
| `intendedPackage` | Forfait que la famille construit via Soft Cap. Mutable **sans** carte bancaire. |
| Quotas runtime | Manifeste de `max(granted, intended)`. |
| Checkout | Facture `intended` si `intended > granted` ; sinon chemin Souvenir 0 $. |

Ne **jamais** écraser `grantedPackage` lors d’un Soft Cap.

---

## Déclencheurs Soft Cap → `signature` (Héritage)

1. **Médias** — atteinte / dépassement de 50 photos (Souvenir). Message Quiet Luxury, pas de paywall. Upload continue après acceptation + autosave `intended`.
2. **Musique** — sélection d’une piste du **catalogue Stingray officiel** (Héritage) depuis Souvenir.

Import MP3/WAV : **masqué sur Souvenir** ; disponible dès `intended >= signature` (+ attestation ToS — [`MUSIC_RIGHTS_ATTESTATION.md`](MUSIC_RIGHTS_ATTESTATION.md)).

---

## Moment de vérité (étape 8)

- Synthèse du chef-d’œuvre déjà vécu + prix du palier `intended`.
- **Payer** → Stripe → entitlements webhook → export.
- **Rester à 0 $** → parcours d’**amputation** : retirer médias au-delà de 50 + retirer** pistes catalogue officiel / uploads → revalidation serveur → `freemium_free`.

---

## COGS

Preview / Composition Magique = proxy basse résolution, caps de regen.  
Creatomate 4K + master Stingray = **uniquement** après `checkout.session.completed`.

---

## SQL / quotas

Le trigger `enforce_media_asset_quota` doit lire `intendedPackage ?? basePackage ?? granted` (évolution P7) — sinon Soft Cap cassé côté DB.
