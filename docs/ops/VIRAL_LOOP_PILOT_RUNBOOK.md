# Runbook — Pilote Boucle Virale (`viral_loop_enabled`)

**Dernière révision : 28 juillet 2026**  
**Statut :** prêt staging · flag **OFF** en prod jusqu’à activation manuelle **1 tenant**.

Canon : [`IMPLEMENTATION_CASCADE_VFINAL.md`](../IMPLEMENTATION_CASCADE_VFINAL.md) · plafonds [`sanctuaryLimits.ts`](../../src/lib/contribute/sanctuaryLimits.ts) · SQL P10.3 [`odyssey_p10_3_guest_photo_quota.sql`](../sql/odyssey_p10_3_guest_photo_quota.sql).

---

## 0. Préflight code (juillet 2026)

| Élément | Statut |
|---------|--------|
| UI Sanctuaire 3a + multi-photos | ✅ |
| Enforce 5 photos API | ✅ |
| `GET …/fund-balance` lit settings via **admin** (famille voit le flag) | ✅ |
| Checkout amputation **exclut** médias `contributor_type = guest` | ✅ |
| Soft Cap CRO consent ≥50 | ✅ |

---

## 1. Prérequis techniques (ops)

| Élément | Action |
|---------|--------|
| P10 + P10.1 + P10.2 | Déjà appliqués (Fonds + guests hors Soft Cap famille SQL) |
| **P10.3** | Appliquer `docs/sql/odyssey_p10_3_guest_photo_quota.sql` sur Supabase **si pas déjà fait** |
| App déployée | Inclure le fix `fund-balance` (admin settings) avant le flip flag |
| Soft Cap famille | **Ne pas toucher** — guests restent exclus du quota dur register / amputation |

Vérif trigger P10.3 :

```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_media_assets_guest_photo_quota';
-- attendu : 1 ligne, tgenabled = 'O'
```

---

## 2. Feature flag

Clé JSONB : `tenants.settings.viral_loop_enabled`

| Valeur | Effet |
|--------|--------|
| `false` (défaut) | Checkout famille **sans** crédit Fonds ; thermomètre à 0 |
| `true` | Crédit Fonds Commémoratif actif pour ce tenant (empreintes → paywall famille) |

Le plafond **5 photos / invité** s’applique **dès que P10.3 + app sont déployés**, indépendamment du flag (anti-dump Quiet Luxury).

---

## 3. Activation pilote (1 tenant)

Tenant freemium de test recommandé : slug **`partner-qa-demo`** (vérifier `is_freemium = true`).

```sql
UPDATE public.tenants
SET settings = settings || jsonb_build_object('viral_loop_enabled', true)
WHERE slug = 'partner-qa-demo'
  AND is_freemium = true
RETURNING id, slug, settings->>'viral_loop_enabled' AS viral_loop;
-- attendu : viral_loop = 'true'
```

Par UUID :

```sql
UPDATE public.tenants
SET settings = settings || '{"viral_loop_enabled": true}'::jsonb
WHERE id = '<pilote_tenant_id>';
```

---

## 4. Parcours QA staging (ordre)

### A. Lien Sanctuaire
1. Salon / famille sur un projet du tenant pilote.  
2. Wizard → **Inviter** → générer lien contribute.  
3. Ouvrir le lien en navigation privée.

### B. Dépôts gratuits
1. 1 dépôt gratuit photo **ou** mot → OK.  
2. Déposer **5** photos `guest_photo` (même token) → OK.  
3. **6ᵉ** photo → **403** `{ "error": "guest_photo_limit_reached" }`.

### C. Empreinte payante → fonds
1. Invité paie une empreinte légère (ex. **Lueur 19 $** ou **Voix 69 $**) — Stripe test.  
2. Retour Sanctuaire → phase **catalogue** (pas dépôt) + merci + invitation à un autre geste (optionnel).  
3. Webhook `checkout.session.completed` → RPC `accrue_guest_micro_checkout`.  
4. SQL : solde `family_tribute_fund_balances` pour le `project_id` > 0.  
5. (Optionnel) 2ᵉ empreinte séquentielle (ex. Mécène) — même token, nouveau checkout.

### D. Famille voit le crédit (flag ON)
1. Owner ouvre Checkout (étape 7).  
2. `GET /api/projects/:id/fund-balance` → `viralLoopEnabled: true` + `availableCents` > 0.  
3. Thermomètre Fonds visible · Rider si 0 $ · paiement / `fund_free` selon scénario.

### E. Soft Cap famille intact
1. Uploads **owner** toujours plafonnés 50/125.  
2. Médias guests **non** comptés dans l’amputation freemium_free.

---

## 5. Rollback pilote

```sql
UPDATE public.tenants
SET settings = settings || '{"viral_loop_enabled": false}'::jsonb
WHERE slug = 'partner-qa-demo';
```

Le trigger P10.3 peut rester actif (sécurité anti-dump) même si le flag est OFF.

---

## 6. Hors scope pilote

- Mini-clip 15–30 s / témoignage live (Phase 3b)  
- Activation prod multi-tenants  
- UI multi-photos : **déjà livrée**
