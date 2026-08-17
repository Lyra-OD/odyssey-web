# Jeton du Sanctuaire (NFC / QR)

**Type :** canon · **Vérité pour :** add-on NFC `sanctuaryToken` 79 $.  
**Dernière MAJ :** 17 août 2026 (en-tête) · juillet 2026 (contenu) · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 17 août 2026 — en-tête type + carte.
- juillet 2026 — spec Phase 5.

Parent : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Prix : **79 $** · ID : `sanctuaryToken` (remplace `collectorUsb`).

---

## Produit

Objet physique neutre (NFC/QR) depuis un **stock global**, expédié **sans gravure**. La famille scanne à réception pour **associer** le jeton à son hommage.

---

## Cycle de vie (cible SQL Phase 2 / fulfillment Phase 5)

```text
inventory → shipped → claimed → locked
```

| Étape | Règle |
|-------|--------|
| Paiement | Line item Stripe `sanctuaryToken` → entitlements webhook |
| Ship | Ops / 3PL — status `shipped` + `claim_secret` haute entropie |
| Claim | RPC atomique `claim_sanctuary_token(id, secret, project_id)` — 1 projet max |
| URL | `/claim/[tokenId]?k=[secret]` — rate-limit + audit |

**Interdit :** claim pré-paiement · double association · URI prédictible sans secret.

---

## Hors scope V1 immédiat

Gravure personnalisée · multi-hommages par jeton · app native.
