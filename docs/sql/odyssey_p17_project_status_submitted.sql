-- =====================================================================
-- Odyssey P17 — projects.status : valeur enum « submitted »
-- =====================================================================
-- Pourquoi : le webhook checkout.session.completed et POST /api/checkout
--            écrivent status = 'submitted'. L’enum Postgres project_status
--            ne l’avait pas → 500 project_submit_failed (accrual bloqué
--            avant P17 ; l’app loggue désormais l’échec sans abort).
-- Prérequis : table public.projects + type public.project_status.
-- Ne change PAS les lignes existantes (les draft restent draft).
-- Ops : SQL Editor — onglet « P17 — project_status submitted ».
-- Note : ADD VALUE IF NOT EXISTS hors transaction (usage immédiat OK).
-- =====================================================================

ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'submitted';

COMMENT ON TYPE public.project_status IS
  'Cycle wizard : draft (édition) → submitted (payé / webhook / freemium_free).';

-- Vérif lecture seule — labels attendus : au moins draft + submitted
SELECT t.typname AS enum_type, e.enumlabel AS valeur
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname = 'project_status'
ORDER BY e.enumsortorder;
