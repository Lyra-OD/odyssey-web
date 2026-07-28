/**
 * Lecture Quiet Luxury des settings Boucle Virale (JSONB tenants.settings).
 * Pure — testable sans Supabase.
 */

export type TenantViralSettings = {
  viralLoopEnabled: boolean;
  ownerFloorCents: number;
};

export function parseTenantViralSettings(
  settings: Record<string, unknown> | null | undefined,
): TenantViralSettings {
  const raw = settings ?? {};
  const floor = raw.owner_floor_cents;
  return {
    viralLoopEnabled: raw.viral_loop_enabled === true,
    ownerFloorCents:
      typeof floor === "number" && Number.isFinite(floor) && floor >= 0
        ? Math.floor(floor)
        : 0,
  };
}
