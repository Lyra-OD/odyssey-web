import { LOCOMOTIVE_EASE } from "./cinematicMotion";

/** Radial UV halo — même langage que `Pricing.tsx`. */
export const UV_RADIAL =
  "radial-gradient(circle at 30% 20%, rgba(124,58,237,0.42) 0%, rgba(139,92,246,0.22) 38%, transparent 72%)";

export const TIER_CARD_SELECT_TRANSITION = {
  duration: 0.85,
  ease: LOCOMOTIVE_EASE,
} as const;

export function getTierCardMotionState(
  isSelected: boolean,
  isDefaultPopularGlow: boolean,
  prefersReducedMotion: boolean | null,
) {
  const isUltraviolet = isSelected || isDefaultPopularGlow;

  return {
    isUltraviolet,
    showRadialBlur: isUltraviolet,
    animate: {
      scale: isSelected && prefersReducedMotion !== true ? 1.045 : 1,
      borderColor: isSelected
        ? "rgba(192, 132, 252, 0.65)"
        : isDefaultPopularGlow
          ? "rgba(168, 85, 247, 0.38)"
          : "rgba(255, 255, 255, 0.1)",
      backgroundColor: isSelected
        ? "rgba(88, 28, 135, 0.14)"
        : isDefaultPopularGlow
          ? "rgba(46, 16, 78, 0.35)"
          : "rgba(255, 255, 255, 0.02)",
      boxShadow: isSelected
        ? "0 0 0 1px rgba(192,132,252,0.45), 0 0 90px rgba(124,58,237,0.48), 0 0 120px rgba(88,28,135,0.2), 0 20px 50px rgba(0,0,0,0.55)"
        : isDefaultPopularGlow
          ? "0 0 0 1px rgba(168,85,247,0.18), 0 0 65px rgba(124,58,237,0.28)"
          : "0 0 0 rgba(0,0,0,0)",
    },
  };
}

export function tierCardSurfaceClass(
  isUltraviolet: boolean,
  isSelected: boolean,
): string {
  return [
    "relative cursor-pointer overflow-hidden rounded-sm border bg-white/[0.02] p-7 backdrop-blur-md outline-none will-change-transform",
    !isUltraviolet && "hover:border-purple-500/35",
    "focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    isSelected ? "z-10" : "z-0",
  ]
    .filter(Boolean)
    .join(" ");
}

export function tierCardTitleClass(isSelected: boolean): string {
  return isSelected
    ? "font-label text-[11px] font-bold uppercase tracking-[0.46em] text-violet-100"
    : "font-label text-[11px] font-bold uppercase tracking-[0.46em] text-zinc-300";
}

export function tierCardPriceClass(isSelected: boolean): string {
  return isSelected
    ? "font-editorial text-5xl font-medium tracking-tight text-white drop-shadow-[0_0_28px_rgba(167,139,250,0.35)]"
    : "font-editorial text-5xl font-medium tracking-tight text-white";
}

export function tierCardStyleClass(isSelected: boolean): string {
  return isSelected
    ? "font-label text-[10px] font-bold uppercase tracking-[0.36em] text-violet-300/90"
    : "font-label text-[10px] font-bold uppercase tracking-[0.36em] text-zinc-500";
}

export function tierCardFeatureClass(isSelected: boolean): string {
  return isSelected
    ? "font-label text-xs font-medium uppercase tracking-[0.22em] text-violet-100/85"
    : "font-label text-xs font-medium uppercase tracking-[0.22em] text-zinc-400";
}

export function tierCardCtaClass(isSelected: boolean): string {
  return [
    "flex w-full items-center justify-center border px-5 py-3 font-label text-[10px] font-bold uppercase tracking-[0.5em] transition-colors",
    isSelected
      ? "border-purple-400/70 bg-purple-500/25 text-white shadow-[0_0_32px_rgba(139,92,246,0.35)]"
      : "border-white/10 bg-black/30 text-white",
  ].join(" ");
}
