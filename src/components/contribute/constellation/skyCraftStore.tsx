"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DeepPartial } from "./skyTheme";
import {
  type SkyCraftState,
  type SkyCraftVisualLayerId,
  type SkyLayersState,
} from "./skyCraftState";
import { defaultSkyCraftState } from "./skyCraftStateAdapter";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge(
  base: Record<string, unknown>,
  partial: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(partial)) {
    const pv = partial[key];
    const bv = base[key];
    if (pv === undefined) continue;
    if (isPlainObject(pv) && isPlainObject(bv)) {
      out[key] = deepMerge(bv, pv);
    } else {
      out[key] = pv;
    }
  }
  return out;
}

export function mergeSkyCraftState(
  base: SkyCraftState,
  partial?: DeepPartial<SkyCraftState>,
): SkyCraftState {
  if (!partial) return base;
  return deepMerge(
    base as unknown as Record<string, unknown>,
    partial as unknown as Record<string, unknown>,
  ) as unknown as SkyCraftState;
}

export type PatchSkyCraft = (partial: DeepPartial<SkyCraftState>) => void;

type SkyCraftStoreValue = {
  state: SkyCraftState;
  /** Snapshot avant Solo (restore). */
  soloBackup: SkyCraftState | null;
  soloId: SkyCraftUiTarget | null;
  patch: PatchSkyCraft;
  setState: (next: SkyCraftState) => void;
  reset: () => void;
  setLayerVisible: (id: SkyCraftUiTarget, visible: boolean) => void;
  setAllVisible: (visible: boolean) => void;
  enterSolo: (id: SkyCraftUiTarget) => void;
  exitSolo: () => void;
};

/** Cibles UI lab : scène + chips Fond/Fog + layers visuels. */
export type SkyCraftUiTarget =
  | "scene"
  | "fond"
  | "fog"
  | SkyCraftVisualLayerId;

const SkyCraftStoreContext = createContext<SkyCraftStoreValue | null>(null);

function withAllVisibility(state: SkyCraftState, visible: boolean): SkyCraftState {
  const layers = Object.fromEntries(
    Object.entries(state.layers).map(([id, layer]) => [
      id,
      { ...layer, isVisible: visible },
    ]),
  ) as SkyLayersState;
  return {
    ...state,
    scene: {
      ...state.scene,
      clearEnabled: visible,
      fog: { ...state.scene.fog, enabled: visible },
    },
    layers,
  };
}

function withSoloVisibility(
  state: SkyCraftState,
  id: SkyCraftUiTarget,
): SkyCraftState {
  const next = withAllVisibility(state, false);
  if (id === "scene") return next;
  if (id === "fond") {
    return {
      ...next,
      scene: { ...next.scene, clearEnabled: true },
    };
  }
  if (id === "fog") {
    return {
      ...next,
      scene: {
        ...next.scene,
        fog: { ...next.scene.fog, enabled: true },
      },
    };
  }
  return {
    ...next,
    layers: {
      ...next.layers,
      [id]: { ...next.layers[id], isVisible: true },
      ...(id === "milkyGroup"
        ? {
            cosmicDust: { ...next.layers.cosmicDust, isVisible: true },
            zodiacal: { ...next.layers.zodiacal, isVisible: true },
            dustLanes: { ...next.layers.dustLanes, isVisible: true },
            starsBand: { ...next.layers.starsBand, isVisible: true },
          }
        : id === "cosmicDust" ||
            id === "zodiacal" ||
            id === "dustLanes" ||
            id === "starsBand"
          ? {
              milkyGroup: {
                ...next.layers.milkyGroup,
                isVisible: true,
              },
            }
          : {}),
    },
  };
}

export function SkyCraftStoreProvider({
  children,
  initial = defaultSkyCraftState,
}: {
  children: ReactNode;
  initial?: SkyCraftState;
}) {
  const [state, setState] = useState(initial);
  const [soloBackup, setSoloBackup] = useState<SkyCraftState | null>(null);
  const [soloId, setSoloId] = useState<SkyCraftUiTarget | null>(null);

  const patch = useCallback((partial: DeepPartial<SkyCraftState>) => {
    setState((prev) => mergeSkyCraftState(prev, partial));
  }, []);

  const reset = useCallback(() => {
    setSoloBackup(null);
    setSoloId(null);
    setState(structuredClone(defaultSkyCraftState));
  }, []);

  const setLayerVisible = useCallback(
    (id: SkyCraftUiTarget, visible: boolean) => {
      setSoloBackup(null);
      setSoloId(null);
      setState((prev) => {
        if (id === "scene") return prev;
        if (id === "fond") {
          return {
            ...prev,
            scene: { ...prev.scene, clearEnabled: visible },
          };
        }
        if (id === "fog") {
          return {
            ...prev,
            scene: {
              ...prev.scene,
              fog: { ...prev.scene.fog, enabled: visible },
            },
          };
        }
        return {
          ...prev,
          layers: {
            ...prev.layers,
            [id]: { ...prev.layers[id], isVisible: visible },
          },
        };
      });
    },
    [],
  );

  const setAllVisible = useCallback((visible: boolean) => {
    setSoloBackup(null);
    setSoloId(null);
    setState((prev) => withAllVisibility(prev, visible));
  }, []);

  const enterSolo = useCallback((id: SkyCraftUiTarget) => {
    if (id === "scene") return;
    setState((prev) => {
      setSoloBackup(structuredClone(prev));
      setSoloId(id);
      return withSoloVisibility(prev, id);
    });
  }, []);

  const exitSolo = useCallback(() => {
    setSoloBackup((backup) => {
      if (backup) setState(backup);
      return null;
    });
    setSoloId(null);
  }, []);

  const value = useMemo(
    () => ({
      state,
      soloBackup,
      soloId,
      patch,
      setState,
      reset,
      setLayerVisible,
      setAllVisible,
      enterSolo,
      exitSolo,
    }),
    [
      state,
      soloBackup,
      soloId,
      patch,
      reset,
      setLayerVisible,
      setAllVisible,
      enterSolo,
      exitSolo,
    ],
  );

  return createElement(SkyCraftStoreContext.Provider, { value }, children);
}

export function useSkyCraftStore(): SkyCraftStoreValue {
  const ctx = useContext(SkyCraftStoreContext);
  if (!ctx) {
    throw new Error("useSkyCraftStore hors SkyCraftStoreProvider");
  }
  return ctx;
}

export function isUiTargetVisible(
  state: SkyCraftState,
  id: SkyCraftUiTarget,
): boolean {
  if (id === "scene") return true;
  if (id === "fond") return state.scene.clearEnabled;
  if (id === "fog") return state.scene.fog.enabled;
  return state.layers[id].isVisible;
}
