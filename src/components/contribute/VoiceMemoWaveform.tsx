"use client";

import { useId } from "react";

/**
 * Waveform SVG Quiet Luxury — trait fin + glow / breathe teal (ADN boutons).
 *
 * Breathe : shell externe (box-shadow, PAS d’overflow-hidden) + halo interne
 * en opacity seule. Même nombre de shadows aux keyframes pour éviter le strobe.
 * L’arrondi + clip du SVG vivent sur une couche intérieure.
 */

const SAMPLE_COUNT = 72;
const VIEW_W = 400;
const VIEW_H = 88;

export type VoiceMemoWaveformProps = {
  /** Niveaux 0–1 (live ou peaks). */
  levels: number[];
  /** Progression lecture 0–1 (null = pas de playhead). */
  progress?: number | null;
  live?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function emptyWaveLevels(count = SAMPLE_COUNT): number[] {
  return Array.from({ length: count }, () => 0.04);
}

export function normalizeWaveLevels(
  values: number[],
  count = SAMPLE_COUNT,
): number[] {
  if (values.length === 0) return emptyWaveLevels(count);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i / count) * values.length);
    const v = values[Math.min(idx, values.length - 1)] ?? 0;
    out.push(Math.min(1, Math.max(0.03, v)));
  }
  return out;
}

/**
 * Peaks 0–1 depuis AudioBuffer — courbe sqrt pour garder du détail à bas volume.
 */
export function peaksFromAudioBuffer(
  buffer: AudioBuffer,
  count = SAMPLE_COUNT,
): number[] {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const block = Math.max(1, Math.floor(length / count));
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * block;
    const end = Math.min(length, start + block);
    let peak = 0;
    for (let c = 0; c < channels; c++) {
      const data = buffer.getChannelData(c);
      for (let j = start; j < end; j++) {
        const a = Math.abs(data[j] ?? 0);
        if (a > peak) peak = a;
      }
    }
    peaks.push(peak);
  }
  const max = Math.max(...peaks, 0.0008);
  return peaks.map((p) => {
    const n = Math.sqrt(p / max);
    return Math.min(1, Math.max(0.04, n * 0.98));
  });
}

/** Polygone miroir (enveloppe) + trait supérieur fin (courbes Q). */
function buildPaths(levels: number[]): { fill: string; stroke: string } {
  const n = levels.length;
  const mid = VIEW_H / 2;
  if (n < 2) {
    return {
      fill: `M 0 ${mid} L ${VIEW_W} ${mid} L ${VIEW_W} ${mid} Z`,
      stroke: `M 0 ${mid} L ${VIEW_W} ${mid}`,
    };
  }
  const ampMax = VIEW_H * 0.38;
  const up: { x: number; y: number }[] = [];
  const down: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * VIEW_W;
    const amp = (levels[i] ?? 0) * ampMax;
    up.push({ x, y: mid - amp });
    down.push({ x, y: mid + amp });
  }

  const smooth = (pts: { x: number; y: number }[]) => {
    let d = `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]!;
      const cur = pts[i]!;
      const cpx = ((prev.x + cur.x) / 2).toFixed(2);
      d += ` Q ${cpx} ${prev.y.toFixed(2)} ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`;
    }
    return d;
  };

  const stroke = smooth(up);
  const downRev = [...down].reverse();
  let fill = stroke;
  fill += ` L ${down[down.length - 1]!.x.toFixed(2)} ${down[down.length - 1]!.y.toFixed(2)}`;
  for (let i = 1; i < downRev.length; i++) {
    const prev = downRev[i - 1]!;
    const cur = downRev[i]!;
    const cpx = ((prev.x + cur.x) / 2).toFixed(2);
    fill += ` Q ${cpx} ${prev.y.toFixed(2)} ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`;
  }
  fill += " Z";

  return { fill, stroke };
}

export function VoiceMemoWaveform({
  levels,
  progress = null,
  live = false,
  className = "",
  "aria-label": ariaLabel,
}: VoiceMemoWaveformProps) {
  const uid = useId().replace(/:/g, "");
  const fillId = `voiceFill-${uid}`;
  const glowId = `voiceGlow-${uid}`;
  const clipId = `voiceClip-${uid}`;
  const samples = levels.length >= 8 ? levels : emptyWaveLevels();
  const { fill, stroke } = buildPaths(samples);
  const playX =
    progress != null
      ? Math.min(VIEW_W, Math.max(0, progress * VIEW_W))
      : null;

  return (
    // Shell externe : glow/breathe visible (PAS d’overflow-hidden ici).
    <div
      className={`voice-memo-wave relative w-full rounded-2xl border border-teal-400/35 bg-black/30 p-[1px] ${
        live ? "voice-memo-wave-breathe-live" : "voice-memo-wave-breathe"
      } ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Couche intérieure : coins arrondis + clip du SVG */}
      <div className="relative overflow-hidden rounded-2xl bg-black/50">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div
            className="voice-memo-halo-breathe absolute left-1/2 top-1/2 h-[150%] w-[95%] -translate-x-1/2 -translate-y-1/2 blur-[32px]"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(34, 211, 238, 0.32) 0%, rgba(45, 212, 191, 0.14) 42%, transparent 72%)",
            }}
          />
        </div>

        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="relative z-[1] h-20 w-full md:h-[5.5rem]"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x="0"
                y="0"
                width={VIEW_W}
                height={VIEW_H}
                rx="18"
                ry="18"
              />
            </clipPath>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="rgb(45, 212, 191)"
                stopOpacity={live ? 0.34 : 0.22}
              />
              <stop
                offset="55%"
                stopColor="rgb(34, 211, 238)"
                stopOpacity={live ? 0.12 : 0.08}
              />
              <stop
                offset="100%"
                stopColor="rgb(45, 212, 191)"
                stopOpacity={0.02}
              />
            </linearGradient>
            <filter
              id={glowId}
              x="-20%"
              y="-40%"
              width="140%"
              height="180%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={live ? 2.4 : 1.8}
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g clipPath={`url(#${clipId})`}>
            <path d={fill} fill={`url(#${fillId})`} />

            <path
              d={stroke}
              fill="none"
              stroke="rgba(0, 232, 240, 0.5)"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.4}
            />

            <path
              d={stroke}
              fill="none"
              stroke={
                live ? "rgba(153, 246, 228, 0.98)" : "rgba(94, 234, 212, 0.9)"
              }
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              filter={`url(#${glowId})`}
            />

            {playX != null ? (
              <g filter={`url(#${glowId})`}>
                <line
                  x1={playX}
                  x2={playX}
                  y1={4}
                  y2={VIEW_H - 4}
                  stroke="rgba(153, 246, 228, 0.95)"
                  strokeWidth={1.35}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ) : null}
          </g>
        </svg>

        {live ? (
          <span
            className="absolute right-3 top-3 z-[2] h-1.5 w-1.5 animate-pulse rounded-full bg-teal-200 shadow-[0_0_10px_rgba(45,212,191,0.9)]"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

export { SAMPLE_COUNT as VOICE_MEMO_BAR_COUNT };
