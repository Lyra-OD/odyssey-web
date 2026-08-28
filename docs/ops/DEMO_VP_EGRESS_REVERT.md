# Démo VP — Egress revert (clôturé)

**Type :** ops stub · **Statut :** **REVERT FAIT** — 28 août 2026  
**Carte :** [`../README.md`](../README.md)

Egress Supabase payé : plus de `NEXT_PUBLIC_DEMO_MODE` ni de `src/lib/demoMode.ts`.

**Historique complet :** [`../_archive/DEMO_VP_EGRESS_REVERT.md`](../_archive/DEMO_VP_EGRESS_REVERT.md)

**Comportement actuel :**
- Poll Coffre wizard : **5000 ms** — [`src/lib/wizard/wizardMediaPoll.ts`](../../src/lib/wizard/wizardMediaPoll.ts)
- Preview Storage : fallback full-res si thumb 404 — [`StoragePreviewImage.tsx`](../../src/components/media/StoragePreviewImage.tsx)

**Action manuelle :** retirer `NEXT_PUBLIC_DEMO_MODE` de `.env.local` / Vercel si encore présent, puis redeploy.
