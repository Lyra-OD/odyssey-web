/**
 * Client HTTP Creatomate — rendu Odyssey (storyboard dynamique).
 *
 * Env :
 * - CREATOMATE_API_KEY
 * - CREATOMATE_WEBHOOK_URL (ou NEXT_PUBLIC_SITE_URL)
 */

import "server-only";

const CREATOMATE_RENDERS_URL = "https://api.creatomate.com/v1/renders";

export type CreatomateRenderStatus =
  | "planned"
  | "waiting"
  | "transcribing"
  | "rendering"
  | "succeeded"
  | "failed";

export type CreatomateRender = {
  id: string;
  status: CreatomateRenderStatus | string;
  url?: string | null;
  error_message?: string | null;
  metadata?: string | null;
};

export type CreateOdysseyRenderResult =
  | { ok: true; render: CreatomateRender }
  | { ok: false; message: string; status?: number };

function getApiKey(): string | null {
  const key = process.env.CREATOMATE_API_KEY?.trim();
  return key || null;
}

export function isCreatomateConfigured(): boolean {
  return Boolean(getApiKey());
}

/**
 * POST /v1/renders — body déjà assemblé par payloadBuilder
 * (tableau d’une entrée RenderScript).
 */
export async function createOdysseyRender(
  renderBody: Record<string, unknown>,
): Promise<CreateOdysseyRenderResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, message: "creatomate_api_key_missing" };
  }

  let response: Response;
  try {
    response = await fetch(CREATOMATE_RENDERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([renderBody]),
    });
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "creatomate_network_error",
    };
  }

  const raw = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const detail =
      raw && typeof raw === "object" && "message" in raw
        ? String((raw as { message: unknown }).message)
        : JSON.stringify(raw)?.slice(0, 300) || response.statusText;
    return {
      ok: false,
      message: `creatomate_render_failed: ${detail}`,
      status: response.status,
    };
  }

  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const first = list[0] as CreatomateRender | undefined;
  if (!first?.id) {
    return { ok: false, message: "creatomate_render_missing_id" };
  }

  return { ok: true, render: first };
}

export function resolveCreatomateWebhookUrl(): string | null {
  const explicit = process.env.CREATOMATE_WEBHOOK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!site) return null;
  return `${site}/api/webhooks/creatomate`;
}
