# Démo VP — Egress : revert egress (archivé)

**Type :** archive ops · **REVERT FAIT :** 28 août 2026  
**Raison clôture :** quota egress Supabase payé — plus de hacks `NEXT_PUBLIC_DEMO_MODE`.

---

## REVERT FAIT

| Date | Par | Notes |
|------|-----|-------|
| 28 août 2026 | Équipe | `demoMode.ts` supprimé · poll Coffre **5000 ms** permanent · fallback full-res réactivé · règle Cursor retirée |

---

## Historique — pourquoi on avait fait ça

- **Poll médias** étape 3 en boucle → signed URLs + re-téléchargement Storage.
- **Fallback** thumb → original 5 Mo sur vieux médias.
- **Mitigation temporaire :** `NEXT_PUBLIC_DEMO_MODE=true` désactivait poll + fallback.

## Ce qui reste permanent (ne pas revert)

- Retrait `wizard_state` sur contribute / scanner / ledger salon
- Thumbs WebP + cache session médias (~50 min)

Réf. : [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) §4.1 · log [`_archive/PROJECT_STATUS_LOG.md`](PROJECT_STATUS_LOG.md) §4.1.

Commit egress initial : `fb7ad1d` · revert code : _voir git log « revert egress DEMO_MODE »_.
