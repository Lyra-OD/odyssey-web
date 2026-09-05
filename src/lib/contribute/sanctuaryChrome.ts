/**
 * Chrome interactif Sanctuaire — secondaire teal (ADN login / wizard).
 * Violet UV = ambiance ; teal = sélection, focus, respiration.
 */

export const SANCTUARY_HALO_UV =
  "radial-gradient(ellipse 100% 70% at 50% 42%, rgba(139, 92, 246, 0.16) 0%, rgba(91, 33, 182, 0.06) 46%, transparent 72%)";

export const SANCTUARY_HALO_TEAL =
  "radial-gradient(ellipse 90% 60% at 50% 48%, rgba(34, 211, 238, 0.22) 0%, rgba(45, 212, 191, 0.1) 38%, transparent 68%)";

export const sanctuaryFieldInput =
  "font-label mt-4 w-full border-0 border-b border-zinc-700 bg-transparent pb-3 text-base text-white outline-none transition-[border-color,box-shadow] placeholder:text-zinc-600 focus:border-teal-400/45 focus:shadow-[0_0_20px_rgba(45,212,191,0.14)]";

export const sanctuaryFieldTextarea =
  "font-label mt-4 w-full resize-y border-0 border-b border-zinc-700 bg-transparent pb-3 text-base text-white outline-none transition-[border-color,box-shadow] placeholder:text-zinc-600 focus:border-teal-400/45 focus:shadow-[0_0_20px_rgba(45,212,191,0.14)]";

/**
 * Anneau de focus clavier — une seule valeur pour tout le parcours.
 * Sans lui, naviguer au clavier ne montre rien sur fond noir.
 */
export const sanctuaryFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40";

export const sanctuarySubmitButton = `connexion-submit-breathe font-label border border-teal-400/35 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.4em] text-white transition-colors hover:border-teal-300/55 hover:text-teal-50 touch-manipulation ${sanctuaryFocusRing}`;

/** Carte / toggle sélectionné (surface statique). */
export const sanctuarySelectedSurface =
  "border-teal-400/40 bg-teal-400/[0.06] shadow-[0_0_28px_rgba(45,212,191,0.12)]";

/**
 * Sélection d'une vignette (média, souvenir) — l'anneau se pose sur une image,
 * pas sur une surface : il lui faut plus d'opacité que `sanctuarySelectedSurface`.
 */
export const sanctuarySelectedRing = "ring-teal-400/70";

/**
 * Respiration de sélection — uniquement sur l’élément actif (1 / zone).
 * Partage les keyframes soft avec le waveform voix.
 */
export const sanctuarySelectBreathe = "sanctuary-select-breathe";

/** sessionStorage : dernière empreinte avant redirect Stripe (rituel Lueur). */
export const SANCTUARY_LAST_IMPRINT_KEY = "odyssey_sanctuary_last_imprint";

export const sanctuarySelectedLabel = "text-teal-300/90";

export const sanctuaryHoverDashed =
  "hover:border-teal-400/35 hover:bg-teal-400/[0.04]";

/** Surface carte Quiet Luxury (dépôt / QR). */
export const sanctuaryCardSurface =
  "rounded-sm border border-white/10 bg-white/[0.03] backdrop-blur-sm";

export const sanctuarySecondaryButton = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm border border-teal-400/30 bg-teal-400/[0.06] px-4 font-label text-[11px] font-medium uppercase tracking-[0.22em] text-teal-100 transition-colors hover:border-teal-400/45 ${sanctuaryFocusRing}`;

/** Champs alignés wizard orga (monolithe indigo). */
export const sanctuaryWizardLabel =
  "flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500";

export const sanctuaryWizardField =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-lg font-light text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border,box-shadow] placeholder:text-zinc-600 focus:border-teal-400/35 focus:shadow-[0_0_24px_rgba(45,212,191,0.14)]";

export const sanctuaryWizardTextarea =
  "w-full min-h-[7.5rem] resize-y rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base font-light text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border,box-shadow] placeholder:text-zinc-600 focus:border-teal-400/35 focus:shadow-[0_0_24px_rgba(45,212,191,0.14)]";

export const sanctuaryGhostButton = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm border border-white/12 bg-white/[0.03] px-4 font-label text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-teal-400/25 hover:text-teal-100 ${sanctuaryFocusRing}`;
