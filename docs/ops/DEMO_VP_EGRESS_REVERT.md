# Démo VP — Egress : activer / revert (checklist)

**Type :** ops · **Deadline revert :** **après démo VP** (cible 27 août 2026)  
**Commit egress :** `fb7ad1d` · **Carte :** [`../README.md`](../README.md)

> **Rappel équipe + agents Cursor :** tant que cette checklist n’est pas cochée « REVERT FAIT », ne pas considérer la prod « clean » si `NEXT_PUBLIC_DEMO_MODE=true`.

---

## Activer avant la démo

Dans `.env.local` (local) ou variables Vercel **preview démo uniquement** :

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Redémarrer le dev server / redeploy (les `NEXT_PUBLIC_*` sont lues au build).

---

## Tableau permanent vs temporaire

| Mesure | Statut | Action après démo |
|--------|--------|-------------------|
| Poll médias étape 3 **off** (`WIZARD_MEDIA_POLL_INTERVAL_MS = 0`) | **TEMPORAIRE** | Retirer ou `NEXT_PUBLIC_DEMO_MODE=false` → poll repasse à **5000 ms** |
| Pas de fallback full-res dans `StoragePreviewImage` | **TEMPORAIRE** | Idem — avec mode off, legacy sans thumb recharge l’original |
| `wizard_state` retiré de contribute / scanner / ledger salon | **PERMANENT** | **Rien à revert** — bonne pratique |
| Thumbs WebP + cache session 50 min | **PERMANENT** | Garder |
| Vidéos `/public` (éclipse, lueur) | **PERMANENT** | Garder |

**Code temporaire central :** [`src/lib/demoMode.ts`](../../src/lib/demoMode.ts)

---

## Checklist REVERT (à cocher après la démo)

Copier cette section dans le commit « revert démo » ou cocher ici :

- [ ] `.env.local` : **supprimer** `NEXT_PUBLIC_DEMO_MODE=true` (ou `=false`)
- [ ] Vercel prod / preview démo : **retirer** la variable ou la mettre à `false`
- [ ] Redeploy / restart dev server
- [ ] Smoke : wizard étape 3 → Network : `GET /api/projects/.../media` reprend ~toutes les **5 s** si poll actif (scanner compagnon)
- [ ] Smoke : grille Coffre avec média **legacy sans thumb** → preview full-res OK (hors démo)
- [ ] Salon → Sanctuaire : displayName toujours OK (colonnes SQL `first_name` / `last_name`)
- [ ] Mettre à jour ce doc : section « REVERT FAIT » ci-dessous + changelog [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)
- [ ] (Optionnel) Archiver ce fichier dans `docs/_archive/` une fois tout validé

### REVERT FAIT

| Date | Par | Notes |
|------|-----|-------|
| _à remplir_ | | |

---

## Pourquoi on a fait ça

- **Tueur silencieux egress :** `pollIntervalMs={5000}` sur le Coffre → `GET /media` en boucle → signed URLs + re-téléchargement Storage.
- **Secondaire :** fallback thumb → original 5 Mo sur vieux médias.
- **DB :** `wizard_state` JSON inutile sur endpoints publics (dizaines de Ko par hit).

Réf. historique : [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) §4.1 · log [`_archive/PROJECT_STATUS_LOG.md`](../_archive/PROJECT_STATUS_LOG.md) §4.1.

---

## Une phrase

**Avant démo : `DEMO_MODE=true` · Après démo : variable off + smoke poll — le reste on garde.**
