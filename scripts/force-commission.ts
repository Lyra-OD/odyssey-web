/**
 * QA ops — insert manuel partner_commission_ledger (service_role).
 * Ne pas utiliser en prod : préférer le webhook + RPC accrue_partner_commission_for_checkout.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

/** Valeur demandée QA — UUID invalide (segment tronqué). Corrigé via projet en base. */
const TENANT_ID_REQUESTED = "aabeac6d-0f78-4c04-8604-14250890759";
/** tenant_id réel de `projects` pour PROJECT_ID (Supabase). */
const TENANT_ID = "aabeac6d-0f78-4e3d-91ac-a37f993f2635";
const PROJECT_ID = "8e5df5c9-d5c3-412f-8c5f-f7452ff405a4";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    /* .env.local absent — variables déjà exportées */
  }
}

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  loadEnvLocal();
  const supabase = createServiceRoleClient();

  const row = {
    tenant_id: TENANT_ID,
    project_id: PROJECT_ID,
    reason: "commission_accrual" as const,
    delta_cents: 20682,
    gross_payment_cents: 76600,
    commission_rate_bps: 3000,
    commission_cents: 20682,
    status: "confirmed" as const,
    platform_fee_bps: 1000,
    platform_fee_cents: 7660,
    net_distributable_cents: 68940,
    stripe_event_id: `qa_force_${Date.now()}`,
    metadata: { source: "scripts/force-commission.ts", qa: true },
  };

  console.log("[force-commission] Insert partner_commission_ledger…", {
    tenant_id: row.tenant_id,
    tenant_id_requested: TENANT_ID_REQUESTED,
    project_id: row.project_id,
    commission_cents: row.commission_cents,
    stripe_event_id: row.stripe_event_id,
  });

  const { data, error } = await supabase
    .from("partner_commission_ledger")
    .insert(row)
    .select("id, tenant_id, project_id, reason, commission_cents, created_at")
    .single();

  if (error) {
    console.error("[force-commission] Échec insert:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    process.exitCode = 1;
    return;
  }

  console.log("[force-commission] Succès:", data);
}

void main().catch((error) => {
  console.error(
    "[force-commission] Erreur fatale:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
