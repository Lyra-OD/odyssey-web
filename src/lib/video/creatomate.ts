/**
 * Client Creatomate — spike export (plomberie async uniquement).
 * Payload minimal hardcodé : texte court, pas de mapping storyboard.
 *
 * Env :
 * - CREATOMATE_API_KEY (requis pour appels réels)
 * - CREATOMATE_WEBHOOK_URL (URL publique du webhook Odyssey)
 * - CREATOMATE_TEMPLATE_ID (optionnel — sinon source JSON minimale)
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

export type CreateSpikeRenderParams = {
  /** Corrélation webhook → job Odyssey (stocké dans metadata Creatomate). */
  jobId: string;
  /** URL absolue POST /api/webhooks/creatomate */
  webhookUrl: string;
  allow4k?: boolean;
};

export type CreateSpikeRenderResult =
  | { ok: true; render: CreatomateRender }
  | { ok: false; message: string; status?: number };

function getApiKey(): string | null {
  const key = process.env.CREATOMATE_API_KEY?.trim();
  return key || null;
}

export function isCreatomateConfigured(): boolean {
  return Boolean(getApiKey());
}

/** Source JSON minimale — valide le pipeline sans template métier. */
function buildSpikeSource(allow4k: boolean): Record<string, unknown> {
  return {
    output_format: "mp4",
    width: allow4k ? 1920 : 1280,
    height: allow4k ? 1080 : 720,
    duration: 3,
    elements: [
      {
        type: "text",
        text: "Odyssey Creatomate spike",
        font_family: "Aileron",
        font_weight: "700",
        font_size: "64 px",
        fill_color: "#ffffff",
        x: "50%",
        y: "50%",
        width: "90%",
        height: "100%",
        x_alignment: "50%",
        y_alignment: "50%",
      },
    ],
  };
}

function buildRenderBody(params: CreateSpikeRenderParams): Record<string, unknown> {
  const templateId = process.env.CREATOMATE_TEMPLATE_ID?.trim();
  const base: Record<string, unknown> = {
    webhook_url: params.webhookUrl,
    metadata: params.jobId,
  };

  if (templateId) {
    return {
      ...base,
      template_id: templateId,
      modifications: {
        Text: "Odyssey Creatomate spike",
      },
    };
  }

  return {
    ...base,
    source: buildSpikeSource(Boolean(params.allow4k)),
  };
}

/**
 * POST /v1/renders — payload spike (texte ou template_id optionnel).
 */
export async function createSpikeRender(
  params: CreateSpikeRenderParams,
): Promise<CreateSpikeRenderResult> {
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
      body: JSON.stringify([buildRenderBody(params)]),
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
