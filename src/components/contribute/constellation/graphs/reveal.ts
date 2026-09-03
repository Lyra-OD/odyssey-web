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

export type ResolveStrokeDrawOptions = {
  /**
   * Share of timeline for hero alone (0–0.6). Default 0.24.
   * Pass **0** when birth choreography drives the Hero separately.
   */
  heroShare?: number;
  /** Overlap between consecutive strokes (0–0.85). Default 0.42 */
  strokeOverlap?: number;
};

export const DEFAULT_HERO_SHARE = 0.24;
export const DEFAULT_STROKE_OVERLAP = 0.42;
/**
 * Part du trait à parcourir avant que l'étoile d'arrivée commence à s'allumer.
 * L'étoile doit naître **sous** le trait qui l'atteint : plus bas, elle est
 * déjà visible pendant que le trait est encore en route (et avec l'overlap,
 * plusieurs étoiles s'allument dans le vide en même temps).
 */
export const DEFAULT_NODE_LANDING_START = 0.72;
/** Slow play: birth alone ~10s, then strokes. */
export const DEFAULT_CONSTELLATION_REVEAL_MS = 14000;

/** Invité (démo) — traits visibles tout de suite, sans le 14 s lab. */
export const GUEST_CONSTELLATION_REVEAL_MS = 2800;

/**
 * Hero alone first (unless heroShare === 0), then overlapping strokes.
 */
export function resolveStrokeDraw(
  revealT: number,
  sequence: readonly LeoStrokeStep[],
  options?: ResolveStrokeDrawOptions,
): ConstellationDrawState {
  const heroShare = Math.min(
    0.6,
    Math.max(0, options?.heroShare ?? DEFAULT_HERO_SHARE),
  );
  const strokeOverlap = Math.min(
    0.85,
    Math.max(0, options?.strokeOverlap ?? DEFAULT_STROKE_OVERLAP),
  );

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

  if (heroShare > 0) {
    const heroT = Math.min(1, t / heroShare);
    nodeAppear.hero = easeOutCubic(heroT);
    if (t <= heroShare) {
      return { nodeAppear, edgeDraw, activeStroke };
    }
  }

  const u = heroShare > 0 ? (t - heroShare) / (1 - heroShare) : t;
  const n = Math.max(1, strokes.length);
  const windowLen = Math.min(1, (1 + strokeOverlap) / n);
  const step = n <= 1 ? 0 : (1 - windowLen) / (n - 1);

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
      easeOutCubic(
        Math.max(0, (local - DEFAULT_NODE_LANDING_START) /
          (1 - DEFAULT_NODE_LANDING_START)),
      ),
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
