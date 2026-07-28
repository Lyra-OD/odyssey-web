/**
 * Rate limiting contribute (préparation Upstash / Vercel KV).
 *
 * Aujourd’hui : no-op documenté — les plafonds métier par token
 * (photos, messages, checkouts pending) restent la 1ʳᵉ ligne de défense.
 * Brancher ici un compteur Redis (clé = IP + tokenHash) sans changer les routes.
 */

export type ContributeRateLimitAction =
  | "contribute_get"
  | "contribute_deposit"
  | "contribute_checkout";

export type ContributeRateLimitInput = {
  action: ContributeRateLimitAction;
  /** SHA-256 hex du token opaque, ou "unknown". */
  tokenHash?: string;
  /** IP client (x-forwarded-for), optionnel. */
  clientIp?: string;
};

export type ContributeRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec?: number };

/**
 * Stub : toujours autorise.
 * TODO(prod): Upstash / Vercel KV — ex. 30 req/min / IP+action, 10 deposit/min / token.
 */
export async function assertContributeRateLimit(
  _input: ContributeRateLimitInput,
): Promise<ContributeRateLimitResult> {
  return { ok: true };
}

/** Extrait une IP approximative depuis les headers edge (best-effort). */
export function clientIpFromRequest(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || undefined;
}
