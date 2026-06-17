/** Courbe cinématographique — slow ease-out dramatique (A24 / Quiet Luxury). */
export const SALON_CINEMA_EASE = [0.22, 1, 0.36, 1] as const;

/** Travelling avant (Camera Dolly) — carte entière */
export const SALON_CARD_DOLLY = {
  type: "tween" as const,
  duration: 0.8,
  ease: SALON_CINEMA_EASE,
};

/** Néon supérieur — réveil lent */
export const SALON_NEON_TUBE = {
  type: "tween" as const,
  duration: 0.5,
  ease: SALON_CINEMA_EASE,
};

/** Lumière sur typographie secondaire */
export const SALON_TYPO_LIGHT = {
  type: "tween" as const,
  duration: 0.5,
  ease: SALON_CINEMA_EASE,
};

/** Survol discret (non accentué) */
export const SALON_CARD_HOVER = {
  type: "tween" as const,
  duration: 0.6,
  ease: SALON_CINEMA_EASE,
};

/** Entrée cascade — conteneur invitation */
export const SALON_INVITE_STAGGER_CONTAINER = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.08,
    },
  },
};

/** Entrée cascade — item (titre, courriel, CTA) */
export const SALON_INVITE_STAGGER_ITEM = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween" as const,
      duration: 0.7,
      ease: SALON_CINEMA_EASE,
    },
  },
};

/** Entrée cascade — carte (gauche → droite via prop `custom`) */
export const SALON_INVITE_CARD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "tween" as const,
      duration: 0.7,
      ease: SALON_CINEMA_EASE,
      delay: index * 0.12,
    },
  }),
};

/** Halo mauve UV — Héritage au repos (Option A : pas à la sélection). */
export const SALON_UV_RADIAL =
  "radial-gradient(circle at 50% 35%, rgba(124,58,237,0.32) 0%, rgba(88,28,135,0.14) 42%, transparent 72%)";

export function getSalonTierCardMotionState(
  isSelected: boolean,
  isDefaultPopularGlow: boolean,
  prefersReducedMotion: boolean | null,
  hasSelection = false,
) {
  const isAccent = isSelected || isDefaultPopularGlow;
  const reduced = prefersReducedMotion === true;

  const scale = reduced
    ? 1
    : isSelected
      ? 1.04
      : isDefaultPopularGlow
        ? 1.02
        : 1;

  const instant = { duration: 0 } as const;

  return {
    isAccent,
    showRadialBlur: isDefaultPopularGlow && !hasSelection && !reduced,

    cardAnimate: {
      scale,
      borderColor: isSelected
        ? "rgba(255, 255, 255, 0.14)"
        : "rgba(255, 255, 255, 0.10)",
      backgroundColor: isSelected
        ? "rgba(255, 255, 255, 0.035)"
        : "rgba(255, 255, 255, 0.02)",
      boxShadow: isSelected ? "0 12px 32px rgba(0, 0, 0, 0.35)" : "none",
    },

    cardTransition: {
      scale: SALON_CARD_DOLLY,
      borderColor: SALON_CARD_DOLLY,
      backgroundColor: SALON_CARD_DOLLY,
      boxShadow: SALON_CARD_DOLLY,
    },

    neonAnimate: {
      opacity: isAccent ? 1 : 0,
    },

    neonTransition: reduced ? instant : SALON_NEON_TUBE,

    radialAnimate: {
      opacity: isDefaultPopularGlow ? 0.65 : 0,
    },

    radialTransition: reduced ? instant : SALON_NEON_TUBE,

    secondaryTextAnimate: {
      opacity: isSelected ? 0.9 : isDefaultPopularGlow ? 0.65 : 0.4,
    },

    secondaryTextTransition: reduced ? instant : SALON_TYPO_LIGHT,

    hoverScale: reduced ? 1 : 1.015,
    hoverTransition: SALON_CARD_HOVER,
  };
}

export function salonTierCardSurfaceClass(isSelected: boolean): string {
  return [
    "relative flex w-full cursor-pointer flex-col overflow-hidden rounded-sm border bg-white/[0.02] p-5 backdrop-blur-md outline-none will-change-transform md:p-7",
    "hover:border-white/20",
    "focus-visible:ring-2 focus-visible:ring-[var(--salon-cyan)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    isSelected ? "z-10" : "z-0",
  ].join(" ");
}

export function salonTierCardTitleClass(isSelected = false): string {
  return [
    "font-editorial text-lg font-medium uppercase tracking-[0.1em] text-white sm:text-xl md:text-2xl md:tracking-[0.12em]",
    isSelected ? "text-white" : "text-white/90",
  ].join(" ");
}

export function salonTierCardStyleClass(): string {
  return "font-label text-[9px] font-bold uppercase tracking-[0.38em] text-zinc-500";
}

export function salonTierCardPriceAmountClass(isAccent: boolean): string {
  return [
    "font-editorial text-4xl font-medium tracking-tight md:text-5xl",
    isAccent ? "text-[var(--salon-cyan)]" : "text-white",
  ].join(" ");
}

export function salonTierCardPriceSuffixClass(): string {
  return "font-label text-[10px] font-bold uppercase tracking-[0.36em] text-zinc-500";
}

export function salonTierTokenDebitClass(): string {
  return "font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--salon-cyan)]";
}

export function salonTierFeatureDividerClass(): string {
  return "my-4 border-t border-white/[0.06]";
}

export function salonTierFeatureIconClass(
  included: boolean,
  isSelected = false,
): string {
  void isSelected;
  if (!included) {
    return "mt-0.5 text-zinc-600/25";
  }
  return "mt-0.5 text-[var(--salon-cyan)]";
}

export function salonTierFeatureLabelClass(
  included: boolean,
  isAccent: boolean,
  isSelected = false,
): string {
  const base =
    "font-label text-[10px] font-medium uppercase tracking-[0.16em] leading-relaxed";

  if (!included) {
    return `${base} text-zinc-600/25`;
  }
  if (isSelected) {
    return `${base} text-white/85`;
  }
  if (isAccent) {
    return `${base} text-white/75`;
  }
  return `${base} text-white/65`;
}

export function salonTierCardCtaClass(isSelected = false): string {
  return [
    "flex w-full items-center justify-center border bg-transparent px-5 py-3 font-label text-[10px] font-bold uppercase tracking-[0.5em] text-white transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
    isSelected ? "border-white/25" : "border-white/15",
  ].join(" ");
}

export function salonRecommendedBadgeClass(): string {
  return "absolute right-3 top-3 border border-[var(--salon-cyan)]/40 bg-black/40 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-[var(--salon-cyan)] md:right-5 md:top-5 md:px-3 md:py-1 md:text-[10px] md:tracking-[0.32em]";
}

export function salonInviteEmailLabelClass(): string {
  return "font-label text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 md:text-[11px]";
}

export function salonInviteEmailBoxClass(): string {
  return [
    "w-full max-w-md rounded-sm border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-sm",
    "transition-[border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "focus-within:border-white/25",
  ].join(" ");
}

export function salonInviteEmailInputClass(): string {
  return "w-full bg-transparent text-center text-sm text-white/90 outline-none placeholder:text-white/30 disabled:opacity-50";
}

export function salonInviteSubmitCtaClass(isActive: boolean): string {
  const shared = [
    "font-label w-full max-w-md px-6 py-3.5 md:px-8 md:py-4",
    "text-[9px] font-bold uppercase tracking-[0.42em] md:text-[10px] md:tracking-[0.5em]",
    "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
  ];

  if (isActive) {
    return [
      ...shared,
      "bg-[var(--salon-cyan)] text-black",
      "shadow-[0_0_20px_rgba(0,232,240,0.35)]",
      "hover:tracking-[0.56em] hover:opacity-90",
    ].join(" ");
  }

  return [
    ...shared,
    "cursor-not-allowed border border-white/12 bg-transparent text-white/30 shadow-none",
  ].join(" ");
}
