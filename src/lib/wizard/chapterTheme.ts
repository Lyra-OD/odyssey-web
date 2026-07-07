/**
 * Palette de couleurs par index de chapitre — remplace les 3 couleurs figées
 * par nom d'acte (`montageActTheme.ts`) puisque le nombre de chapitres est
 * désormais dynamique (2 à 10 selon le forfait). Le cycle se répète au-delà
 * de la longueur de la palette pour couvrir n'importe quel `maxSongs`.
 */

export type ChapterTabTheme = {
  ring: string;
  active: string;
  dot: string;
  text: string;
};

/** Thème carte média / modal directeur — dérivé de l'index de chapitre. */
export type ChapterCardTheme = {
  badgeBg: string;
  badgeText: string;
  focalBg: string;
  focalGlow: [string, string, string];
  overlayShadow: string;
  cardHoverShadow: string;
  focusRing: string;
};

const CHAPTER_CARD_THEME_PALETTE: ChapterCardTheme[] = [
  {
    badgeBg: "bg-amber-400/20",
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
  {
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
  {
    badgeBg: "bg-fuchsia-400/20",
    badgeText: "text-fuchsia-400",
    focalBg: "bg-fuchsia-400",
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
  {
    badgeBg: "bg-violet-400/20",
    badgeText: "text-violet-400",
    focalBg: "bg-violet-400",
    focalGlow: [
      "0 0 8px rgba(167,139,250,0.45)",
      "0 0 16px rgba(167,139,250,0.85)",
      "0 0 8px rgba(167,139,250,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(167,139,250,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(167, 139, 250, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-violet-400/35",
  },
  {
    badgeBg: "bg-cyan-400/20",
    badgeText: "text-cyan-400",
    focalBg: "bg-cyan-400",
    focalGlow: [
      "0 0 8px rgba(34,211,238,0.45)",
      "0 0 16px rgba(34,211,238,0.85)",
      "0 0 8px rgba(34,211,238,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(34,211,238,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(34, 211, 238, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-cyan-400/35",
  },
  {
    badgeBg: "bg-emerald-400/20",
    badgeText: "text-emerald-400",
    focalBg: "bg-emerald-400",
    focalGlow: [
      "0 0 8px rgba(52,211,153,0.45)",
      "0 0 16px rgba(52,211,153,0.85)",
      "0 0 8px rgba(52,211,153,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(52,211,153,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(52, 211, 153, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-emerald-400/35",
  },
  {
    badgeBg: "bg-rose-400/20",
    badgeText: "text-rose-400",
    focalBg: "bg-rose-400",
    focalGlow: [
      "0 0 8px rgba(251,113,133,0.45)",
      "0 0 16px rgba(251,113,133,0.85)",
      "0 0 8px rgba(251,113,133,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(251,113,133,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(251, 113, 133, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-rose-400/35",
  },
  {
    badgeBg: "bg-sky-400/20",
    badgeText: "text-sky-400",
    focalBg: "bg-sky-400",
    focalGlow: [
      "0 0 8px rgba(56,189,248,0.45)",
      "0 0 16px rgba(56,189,248,0.85)",
      "0 0 8px rgba(56,189,248,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(56,189,248,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(56, 189, 248, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-sky-400/35",
  },
  {
    badgeBg: "bg-orange-400/20",
    badgeText: "text-orange-400",
    focalBg: "bg-orange-400",
    focalGlow: [
      "0 0 8px rgba(251,146,60,0.45)",
      "0 0 16px rgba(251,146,60,0.85)",
      "0 0 8px rgba(251,146,60,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(251,146,60,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(251, 146, 60, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-orange-400/35",
  },
  {
    badgeBg: "bg-lime-400/20",
    badgeText: "text-lime-400",
    focalBg: "bg-lime-400",
    focalGlow: [
      "0 0 8px rgba(163,230,53,0.45)",
      "0 0 16px rgba(163,230,53,0.85)",
      "0 0 8px rgba(163,230,53,0.45)",
    ],
    overlayShadow:
      "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(163,230,53,0.14)",
    cardHoverShadow:
      "0 0 36px rgba(163, 230, 53, 0.16), 0 8px 32px rgba(0, 0, 0, 0.45)",
    focusRing: "focus-visible:ring-lime-400/35",
  },
];

const UNASSIGNED_CARD_THEME: ChapterCardTheme = {
  badgeBg: "bg-zinc-500/20",
  badgeText: "text-zinc-400",
  focalBg: "bg-zinc-400",
  focalGlow: [
    "0 0 8px rgba(161,161,170,0.45)",
    "0 0 16px rgba(161,161,170,0.75)",
    "0 0 8px rgba(161,161,170,0.45)",
  ],
  overlayShadow:
    "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(161,161,170,0.1)",
  cardHoverShadow:
    "0 0 36px rgba(161, 161, 170, 0.12), 0 8px 32px rgba(0, 0, 0, 0.45)",
  focusRing: "focus-visible:ring-zinc-400/30",
};

const CHAPTER_THEME_PALETTE: ChapterTabTheme[] = [
  {
    ring: "ring-amber-400/30",
    active: "border-amber-400/35 bg-amber-400/[0.05]",
    dot: "bg-amber-400",
    text: "text-amber-400",
  },
  {
    ring: "ring-teal-400/30",
    active: "border-teal-400/35 bg-teal-400/[0.05]",
    dot: "bg-teal-400",
    text: "text-teal-400",
  },
  {
    ring: "ring-fuchsia-400/30",
    active: "border-fuchsia-400/35 bg-fuchsia-400/[0.05]",
    dot: "bg-fuchsia-400",
    text: "text-fuchsia-400",
  },
  {
    ring: "ring-violet-400/30",
    active: "border-violet-400/35 bg-violet-400/[0.05]",
    dot: "bg-violet-400",
    text: "text-violet-400",
  },
  {
    ring: "ring-cyan-400/30",
    active: "border-cyan-400/35 bg-cyan-400/[0.05]",
    dot: "bg-cyan-400",
    text: "text-cyan-400",
  },
  {
    ring: "ring-emerald-400/30",
    active: "border-emerald-400/35 bg-emerald-400/[0.05]",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
  },
  {
    ring: "ring-rose-400/30",
    active: "border-rose-400/35 bg-rose-400/[0.05]",
    dot: "bg-rose-400",
    text: "text-rose-400",
  },
  {
    ring: "ring-sky-400/30",
    active: "border-sky-400/35 bg-sky-400/[0.05]",
    dot: "bg-sky-400",
    text: "text-sky-400",
  },
  {
    ring: "ring-orange-400/30",
    active: "border-orange-400/35 bg-orange-400/[0.05]",
    dot: "bg-orange-400",
    text: "text-orange-400",
  },
  {
    ring: "ring-lime-400/30",
    active: "border-lime-400/35 bg-lime-400/[0.05]",
    dot: "bg-lime-400",
    text: "text-lime-400",
  },
];

export function getChapterTheme(index: number): ChapterTabTheme {
  const safeIndex = ((index % CHAPTER_THEME_PALETTE.length) + CHAPTER_THEME_PALETTE.length) %
    CHAPTER_THEME_PALETTE.length;
  return CHAPTER_THEME_PALETTE[safeIndex];
}

export function getChapterCardTheme(chapterIndex: number): ChapterCardTheme {
  const safeIndex =
    ((chapterIndex % CHAPTER_CARD_THEME_PALETTE.length) +
      CHAPTER_CARD_THEME_PALETTE.length) %
    CHAPTER_CARD_THEME_PALETTE.length;
  return CHAPTER_CARD_THEME_PALETTE[safeIndex];
}

export function getUnassignedCardTheme(): ChapterCardTheme {
  return UNASSIGNED_CARD_THEME;
}
