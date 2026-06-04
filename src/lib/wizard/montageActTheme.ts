import type { MontageActId } from "@/src/lib/wizard/wizardState";

export type MontageActTheme = {
  headerText: string;
  headerDivider: string;
  columnRing: string;
  columnDropRing: string;
  insertionLine: string;
  insertionGlow: string;
  badgeBg: string;
  badgeText: string;
  focalBg: string;
  focalGlow: [string, string, string];
  overlayShadow: string;
  cardHoverShadow: string;
  focusRing: string;
};

export const MONTAGE_ACT_THEME: Record<MontageActId, MontageActTheme> = {
  spark: {
    headerText: "text-amber-500",
    headerDivider: "bg-amber-500/45",
    columnRing: "ring-amber-500/10",
    columnDropRing: "ring-amber-500/35",
    insertionLine: "bg-amber-400",
    insertionGlow: "shadow-[0_0_14px_rgba(251,191,36,0.55)]",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-400",
    focalBg: "bg-amber-400",
    focalGlow: [
      "0 0 8px rgba(251,191,36,0.45)",
      "0 0 16px rgba(251,191,36,0.85)",
      "0 0 8px rgba(251,191,36,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(251,191,36,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(251, 191, 36, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-amber-400/35",
  },
  epic: {
    headerText: "text-teal-400",
    headerDivider: "bg-teal-400/45",
    columnRing: "ring-teal-400/10",
    columnDropRing: "ring-teal-400/35",
    insertionLine: "bg-teal-400",
    insertionGlow: "shadow-[0_0_14px_rgba(45,212,191,0.55)]",
    badgeBg: "bg-teal-400/20",
    badgeText: "text-teal-400",
    focalBg: "bg-teal-400",
    focalGlow: [
      "0 0 8px rgba(45,212,191,0.45)",
      "0 0 16px rgba(45,212,191,0.85)",
      "0 0 8px rgba(45,212,191,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(45,212,191,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(45, 212, 191, 0.14), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-teal-400/30",
  },
  legacy: {
    headerText: "text-fuchsia-500",
    headerDivider: "bg-fuchsia-500/45",
    columnRing: "ring-fuchsia-500/10",
    columnDropRing: "ring-fuchsia-500/35",
    insertionLine: "bg-fuchsia-400",
    insertionGlow: "shadow-[0_0_14px_rgba(232,121,249,0.55)]",
    badgeBg: "bg-fuchsia-500/20",
    badgeText: "text-fuchsia-400",
    focalBg: "bg-fuchsia-500",
    focalGlow: [
      "0 0 8px rgba(217,70,239,0.45)",
      "0 0 16px rgba(217,70,239,0.85)",
      "0 0 8px rgba(217,70,239,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(217,70,239,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(217, 70, 239, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-fuchsia-400/35",
  },
};

export function getMontageActTheme(actId: MontageActId): MontageActTheme {
  return MONTAGE_ACT_THEME[actId];
}
