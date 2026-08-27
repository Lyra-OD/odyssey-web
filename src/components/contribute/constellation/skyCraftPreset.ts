import {
  SKY_CRAFT_STATE_VERSION,
  type SkyCraftState,
} from "./skyCraftState";
import { defaultSkyCraftState } from "./skyCraftStateAdapter";
import { mergeSkyCraftState } from "./skyCraftStore";
import type { DeepPartial } from "./skyTheme";

/** Preset lab = snapshot `SkyCraftState` (contrat unique). */
export type SkyCraftPresetV1 = SkyCraftState;

export type SkyCraftPresetParseOk = {
  ok: true;
  preset: SkyCraftPresetV1;
};

export type SkyCraftPresetParseErr = {
  ok: false;
  error: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function stringifySkyCraftPreset(state: SkyCraftState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export function parseSkyCraftPreset(
  raw: string,
): SkyCraftPresetParseOk | SkyCraftPresetParseErr {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "JSON invalide" };
  }
  if (!isRecord(data)) {
    return { ok: false, error: "Preset : objet attendu" };
  }
  if (data.v !== SKY_CRAFT_STATE_VERSION) {
    return {
      ok: false,
      error: `Version ${String(data.v)} non supportée (attendu ${SKY_CRAFT_STATE_VERSION})`,
    };
  }
  if (!isRecord(data.scene) || !isRecord(data.layers)) {
    return { ok: false, error: "Preset : scene/layers manquants" };
  }
  const id =
    typeof data.id === "string" && data.id.trim() ? data.id.trim() : "imported";

  const merged = mergeSkyCraftState(defaultSkyCraftState, {
    ...(data as DeepPartial<SkyCraftState>),
    id,
    v: SKY_CRAFT_STATE_VERSION,
  });

  return { ok: true, preset: merged };
}
