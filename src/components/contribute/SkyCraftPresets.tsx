"use client";

import { useMemo, useState } from "react";

import {
  fingerprintSkyCraftState,
  parseSkyCraftPreset,
  stringifySkyCraftPreset,
} from "@/src/components/contribute/constellation/skyCraftPreset";
import {
  cloneSkyCraftState,
  getSkyNamedPreset,
  SKY_NAMED_PRESETS,
  type SkyNamedPresetId,
} from "@/src/components/contribute/constellation/skyPresets";
import { useSkyCraftStore } from "@/src/components/contribute/constellation/skyCraftStore";
import { defaultSkyCraftState } from "@/src/components/contribute/constellation/skyCraftStateAdapter";
import type { Locale } from "@/i18n.config";

type PresetsCopy = {
  presets: string;
  copyJson: string;
  importJson: string;
  importPrompt: string;
  copyOk: string;
  importOk: string;
  importFail: string;
  importCancel: string;
  modified: string;
  slotLoaded: string;
};

const COPY: Record<"fr" | "en", PresetsCopy> = {
  fr: {
    presets: "Presets",
    copyJson: "Copy JSON",
    importJson: "Import JSON",
    importPrompt: "Colle un preset SkyCraftState (JSON) :",
    copyOk: "JSON copié",
    importOk: "JSON chargé",
    importFail: "Import échoué",
    importCancel: "Import annulé",
    modified: "Modifié",
    slotLoaded: "Preset",
  },
  en: {
    presets: "Presets",
    copyJson: "Copy JSON",
    importJson: "Import JSON",
    importPrompt: "Paste a SkyCraftState preset (JSON):",
    copyOk: "JSON copied",
    importOk: "JSON loaded",
    importFail: "Import failed",
    importCancel: "Import cancelled",
    modified: "Modified",
    slotLoaded: "Preset",
  },
};

type SkyCraftPresetsBarProps = {
  locale?: Locale;
  onFlash?: (message: string) => void;
};

/**
 * Barre presets lab — Copy/Import JSON · slots nommés · indicateur Modifié.
 * Ne touche pas au rendu 3D (store only).
 */
export function SkyCraftPresetsBar({
  locale = "fr",
  onFlash,
}: SkyCraftPresetsBarProps) {
  const t = COPY[locale === "en" ? "en" : "fr"];
  const { state, setState, soloId, exitSolo } = useSkyCraftStore();

  const [activeSlotId, setActiveSlotId] = useState<SkyNamedPresetId | null>(
    "default",
  );
  const [baselineFp, setBaselineFp] = useState(() =>
    fingerprintSkyCraftState(defaultSkyCraftState),
  );

  const dirty = useMemo(
    () => fingerprintSkyCraftState(state) !== baselineFp,
    [state, baselineFp],
  );

  const flash = (message: string) => {
    onFlash?.(message);
  };

  const applyState = (
    next: typeof state,
    slotId: SkyNamedPresetId | null,
  ) => {
    if (soloId) exitSolo();
    const cloned = cloneSkyCraftState(next);
    setState(cloned);
    setActiveSlotId(slotId);
    setBaselineFp(fingerprintSkyCraftState(cloned));
  };

  const loadSlot = (id: SkyNamedPresetId) => {
    const preset = getSkyNamedPreset(id);
    applyState(preset.state, id);
    const label = locale === "en" ? preset.labelEn : preset.labelFr;
    flash(`${t.slotLoaded} · ${label}`);
  };

  const copyJson = async () => {
    const snapshot = {
      ...state,
      id: state.id || `craft-${new Date().toISOString().slice(0, 10)}`,
    };
    try {
      await navigator.clipboard.writeText(stringifySkyCraftPreset(snapshot));
      flash(t.copyOk);
    } catch {
      flash(t.importFail);
    }
  };

  const importJson = () => {
    const raw = window.prompt(t.importPrompt, "");
    if (raw == null) {
      flash(t.importCancel);
      return;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      flash(t.importFail);
      return;
    }
    const parsed = parseSkyCraftPreset(trimmed);
    if (!parsed.ok) {
      flash(`${t.importFail}: ${parsed.error}`);
      return;
    }
    applyState(parsed.preset, null);
    flash(`${t.importOk} · ${parsed.preset.id}`);
  };

  const btn =
    "rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
          {t.presets}
        </p>
        {dirty ? (
          <span className="rounded-sm border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber-100/90">
            * {t.modified}
          </span>
        ) : null}
        {activeSlotId && !dirty ? (
          <span className="font-mono text-[9px] text-white/30">
            {activeSlotId}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {SKY_NAMED_PRESETS.map((preset) => {
          const label = locale === "en" ? preset.labelEn : preset.labelFr;
          const selected = activeSlotId === preset.id && !dirty;
          const selectedDirty = activeSlotId === preset.id && dirty;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadSlot(preset.id)}
              className={`${btn} ${
                selected
                  ? "border-teal-400/50 bg-teal-500/10 text-teal-100"
                  : selectedDirty
                    ? "border-amber-400/45 bg-amber-500/10 text-amber-100"
                    : "border-white/15 text-white/55 hover:border-teal-400/40 hover:text-teal-100"
              }`}
            >
              {label}
              {selectedDirty ? " *" : ""}
            </button>
          );
        })}

        <span className="mx-0.5 h-3 w-px bg-white/15" aria-hidden />

        <button
          type="button"
          onClick={() => void copyJson()}
          className={`${btn} border-white/15 text-white/55 hover:border-teal-400/40 hover:text-teal-100`}
        >
          {t.copyJson}
        </button>
        <button
          type="button"
          onClick={importJson}
          className={`${btn} border-white/15 text-white/55 hover:border-teal-400/40 hover:text-teal-100`}
        >
          {t.importJson}
        </button>
      </div>
    </div>
  );
}
