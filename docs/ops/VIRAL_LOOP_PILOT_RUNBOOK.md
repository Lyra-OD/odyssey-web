# Runbook — Pilote Boucle Virale (`viral_loop_enabled`)

**Dernière révision : 27 juillet 2026**  
**Statut :** prêt staging · flag **OFF** en prod jusqu’à activation manuelle 1 tenant.

Canon : [`IMPLEMENTATION_CASCADE_VFINAL.md`](../IMPLEMENTATION_CASCADE_VFINAL.md) · plafonds [`sanctuaryLimits.ts`](../../src/lib/contribute/sanctuaryLimits.ts) · SQL P10.3 [`odyssey_p10_3_guest_photo_quota.sql`](../sql/odyssey_p10_3_guest_photo_quota.sql).

---

## 1. Prérequis techniques

| Élément | Action |
|---------|--------|
| P10 + P10.1 + P10.2 | Déjà appliqués (Fonds + guests hors Soft Cap famille) |
| **P10.3** | Appliquer `docs/sql/odyssey_p10_3_guest_photo_quota.sql` sur Supabase |
| App | `POST /api/contribute/[token]/deposit` enforce 5 photos (403 `guest_photo_limit_reached`) |
| Soft Cap famille | **Ne pas toucher** — guests restent exclus du quota 50/125 |

---

## 2. Feature flag

Clé JSONB : `tenants.settings.viral_loop_enabled`

| Valeur | Effet |
|--------|--------|
| `false` (défaut) | Checkout famille **sans** crédit Fonds ; waterfall invité / UI Fonds gated |
| `true` | Crédit Fonds Commémoratif actif pour ce tenant (empreintes → paywall famille) |

Le plafond **5 photos / invité** s’applique **dès que P10.3 + app sont déployés**, indépendamment du flag (anti-dump Quiet Luxury).

---

## 3. Activation pilote (1 tenant)

Remplacer `<pilote_tenant_id>` par l’UUID du tenant freemium de test :

```sql
UPDATE public.tenants
SET settings = settings || '{"viral_loop_enabled": true}'::jsonb
WHERE id = '<pilote_tenant_id>';
```

Variante par slug :

```sql
UPDATE public.tenants
SET settings = settings || jsonb_build_object('viral_loop_enabled', true)
WHERE slug = 'partner-qa-demo';
```

Vérification :

```sql
SELECT id, slug, settings->>'viral_loop_enabled' AS viral_loop
FROM public.tenants
WHERE id = '<pilote_tenant_id>';
-- attendu : viral_loop = 'true'
```

---

## 4. Checklist QA staging

1. Lien Sanctuaire (`contributeToken`) → 1 dépôt gratuit photo|mot OK.  
2. Déposer **5** photos `guest_photo` pour le **même** token → OK.  
3. **6ᵉ** photo → API **403** `{ "error": "guest_photo_limit_reached" }` (et/ou erreur trigger SQL).  
4. Soft Cap famille : uploads owner toujours plafonnés 50/125 — guests **non** comptés.  
5. Empreinte payante (ex. Voix) → webhook → crédit fonds visible si flag ON.  
6. Checkout famille : application crédit / Rider 0 $ selon scénario.

---

## 5. Rollback pilote

```sql
UPDATE public.tenants
SET settings = settings || '{"viral_loop_enabled": false}'::jsonb
WHERE id = '<pilote_tenant_id>';
```

Le trigger P10.3 peut rester actif (sécurité anti-dump) même si le flag est OFF.

---

## 6. Hors scope pilote

- UI multi-photos « aider la famille » (Phase 3b UX)  
- Mini-clip 15–30 s  
- Activation prod multi-tenants
