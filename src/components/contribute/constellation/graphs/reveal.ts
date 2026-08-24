import {
  type LeoStrokeStep,
  strokeKey,
} from "@/src/components/contribute/constellation/graphs/leo";

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** Softer than cubic — less “steppy” for strokes. */
export function easeInOutQuad(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

export type ConstellationDrawState = {
  /** 0–1 appear per node id */
  nodeAppear: Record<string, number>;
  /** 0–1 draw progress per stroke key `from->to` */
  edgeDraw: Record<string, number>;
  /** Tip of the active stroke (current “flow”) — world lerp 0–1 on that edge */
  activeStroke: { from: string; to: string; t: number } | null;
};

/** Hero alone a bit longer — breath before the constellation grows. */
const HERO_SHARE = 0.24;
/** Overlap between consecutive strokes (less mechanical). */
const STROKE_OVERLAP = 0.42;

/**
 * Hero alone first, then overlapping strokes (current flows node → node).
 */
export function resolveStrokeDraw(
  revealT: number,
  sequence: readonly LeoStrokeStep[],
): ConstellationDrawState {
  const nodeAppear: Record<string, number> = {};
  const edgeDraw: Record<string, number> = {};
  let activeStroke: ConstellationDrawState["activeStroke"] = null;

  const t = Math.min(1, Math.max(0, revealT));
  if (t <= 0) {
    return { nodeAppear, edgeDraw, activeStroke };
  }

  const strokes = sequence.filter(
    (s): s is Extract<LeoStrokeStep, { kind: "stroke" }> => s.kind === "stroke",
  );

  const heroT = Math.min(1, t / HERO_SHARE);
  nodeAppear.hero = easeOutCubic(heroT);

  if (t <= HERO_SHARE) {
    return { nodeAppear, edgeDraw, activeStroke };
  }

  const u = (t - HERO_SHARE) / (1 - HERO_SHARE);
  const n = Math.max(1, strokes.length);
  const windowLen = Math.min(1, (1 + STROKE_OVERLAP) / n);
  const step =
    n <= 1 ? 0 : (1 - windowLen) / (n - 1);

  let bestActive = -1;
  let bestLocal = 0;

  for (let i = 0; i < strokes.length; i++) {
    const stroke = strokes[i];
    const key = strokeKey(stroke.from, stroke.to);
    const start = i * step;
    const end = start + windowLen;

    if (u <= start) {
      edgeDraw[key] = Math.max(edgeDraw[key] ?? 0, 0);
      continue;
    }
    if (u >= end) {
      edgeDraw[key] = 1;
      nodeAppear[stroke.to] = Math.max(nodeAppear[stroke.to] ?? 0, 1);
      nodeAppear[stroke.from] = Math.max(nodeAppear[stroke.from] ?? 0, 1);
      continue;
    }

    const local = easeInOutQuad((u - start) / (end - start));
    edgeDraw[key] = Math.max(edgeDraw[key] ?? 0, local);
    nodeAppear[stroke.from] = Math.max(nodeAppear[stroke.from] ?? 0, 1);
    nodeAppear[stroke.to] = Math.max(
      nodeAppear[stroke.to] ?? 0,
      easeOutCubic(Math.max(0, (local - 0.2) / 0.8)),
    );
    if (local > bestLocal && local < 0.99) {
      bestLocal = local;
      bestActive = i;
    }
  }

  if (bestActive >= 0) {
    const s = strokes[bestActive];
    activeStroke = {
      from: s.from,
      to: s.to,
      t: edgeDraw[strokeKey(s.from, s.to)] ?? bestLocal,
    };
  }

  if (t >= 1) {
    for (const stroke of strokes) {
      edgeDraw[strokeKey(stroke.from, stroke.to)] = 1;
      nodeAppear[stroke.from] = 1;
      nodeAppear[stroke.to] = 1;
    }
    activeStroke = null;
  }

  return { nodeAppear, edgeDraw, activeStroke };
}
