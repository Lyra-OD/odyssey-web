/**
 * Chrome interactif Sanctuaire — secondaire teal (ADN login / wizard).
 * Violet UV = ambiance ; teal = sélection, focus, respiration.
 */

export const SANCTUARY_HALO_UV =
  "radial-gradient(ellipse 100% 70% at 50% 42%, rgba(139, 92, 246, 0.16) 0%, rgba(91, 33, 182, 0.06) 46%, transparent 72%)";

export const SANCTUARY_HALO_TEAL =
  "radial-gradient(ellipse 90% 60% at 50% 48%, rgba(34, 211, 238, 0.22) 0%, rgba(45, 212, 191, 0.1) 38%, transparent 68%)";

export const sanctuaryFieldInput =
  "font-label mt-4 w-full border-0 border-b border-zinc-600 bg-transparent pb-3 text-base text-white outline-none transition-[border-color,box-shadow] placeholder:text-zinc-500 focus:border-teal-400/45 focus:shadow-[0_0_20px_rgba(45,212,191,0.14)]";

export const sanctuaryFieldTextarea =
  "font-label mt-4 w-full resize-y border-0 border-b border-zinc-600 bg-transparent pb-3 text-base text-white outline-none transition-[border-color,box-shadow] placeholder:text-zinc-500 focus:border-teal-400/45 focus:shadow-[0_0_20px_rgba(45,212,191,0.14)]";

/**
 * Anneau de focus clavier — une seule valeur pour tout le parcours.
 * Sans lui, naviguer au clavier ne montre rien sur fond noir.
 */
export const sanctuaryFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40";

export const sanctuarySubmitButton = `connexion-submit-breathe font-label border border-teal-400/35 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.4em] text-white transition-colors hover:border-teal-300/55 hover:text-teal-50 touch-manipulation transition-[colors,box-shadow,transform] hover:shadow-[0_0_28px_rgba(45,212,191,0.22)] active:scale-[0.985] ${sanctuaryFocusRing}`;

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
  "flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-400";

export const sanctuaryWizardField =
  "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-lg font-light text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border,box-shadow] placeholder:text-zinc-500 focus:border-teal-400/35 focus:shadow-[0_0_24px_rgba(45,212,191,0.14)]";

export const sanctuaryWizardTextarea =
  "w-full min-h-[7.5rem] resize-y rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-base font-light text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border,box-shadow] placeholder:text-zinc-500 focus:border-teal-400/35 focus:shadow-[0_0_24px_rgba(45,212,191,0.14)]";

export const sanctuaryGhostButton = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm border border-white/12 bg-white/[0.03] px-4 font-label text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-teal-400/25 hover:text-teal-100 ${sanctuaryFocusRing}`;

/** Mini-caps CSS — copy dictionnaire inchangé. */
export const wizardMiniCapsTitle =
  "font-[family-name:var(--font-label)] font-medium uppercase tracking-[0.08em]";

/** Titres d’étape 1–7 — 24 mobile / 26 desktop. */
export const wizardStepTitle = `${wizardMiniCapsTitle} text-balance text-2xl text-white md:text-[1.625rem]`;

/** Phrase sous le H2 — distincte du corps (400 · zinc-300 · 16/18). */
export const wizardStepLead =
  "text-base font-normal leading-relaxed text-zinc-300 md:text-lg";

/** Boutons d’action (N3, CTA, magie, Composer forts). Pas whispers / liens. */
export const wizardMiniCapsAction =
  "font-[family-name:var(--font-label)] uppercase tracking-[0.12em]";

/**
 * Gate composition — Création assistée au repos (paille).
 * Hover / active restent teal (`sanctuaryChrome`). Voir PALETTE_ARBITRAGE §7.
 */
export const sanctuaryMagicWheatCardRest =
  "border-[color:var(--wizard-magic-wheat-border)] bg-gradient-to-b from-[color:var(--wizard-magic-wheat-fill)] to-transparent";

export const sanctuaryMagicWheatIconRest =
  "border-[color:var(--wizard-magic-wheat-icon-border)] bg-[color:var(--wizard-magic-wheat-icon-fill)] text-[color:var(--wizard-magic-wheat)]";

/** CTA Composition Magique (banque) — paille, pas amber. */
export const sanctuaryMagicWheatButton =
  "border-[color:var(--wizard-magic-wheat-border)] bg-[color:var(--wizard-magic-wheat-fill)] text-[color:var(--wizard-magic-wheat)] hover:border-[color:var(--wizard-magic-wheat-border-hover)] hover:bg-[color:var(--wizard-magic-wheat-fill-hover)]";

/** Drop vers la banque pendant le montage — même teinte magie. */
export const sanctuaryMagicWheatDrop =
  "border-[color:var(--wizard-magic-wheat-border-hover)] ring-2 ring-[color:var(--wizard-magic-wheat-border)] shadow-[0_0_32px_var(--wizard-magic-wheat-glow)]";

/** Création manuelle au repos — violet (ambiance). */
export const sanctuaryManualVioletCardRest =
  "border-violet-400/25 bg-gradient-to-b from-violet-400/[0.10] to-transparent";

export const sanctuaryManualVioletIconRest =
  "border-violet-400/30 bg-violet-400/10 text-violet-300";

/** Hover / active partagés des deux cartes gate (choix = teal). */
export const sanctuaryMontageGateCardInteractive =
  "hover:border-teal-400/40 hover:from-teal-400/[0.10] hover:shadow-[0_0_48px_rgba(45,212,191,0.12)] active:border-teal-400/55 active:from-teal-400/[0.14] active:shadow-[0_0_48px_rgba(45,212,191,0.16)]";

export const sanctuaryMontageGateIconInteractive =
  "group-hover:border-teal-400/40 group-hover:bg-teal-400/[0.10] group-hover:text-teal-300 group-active:border-teal-400/55 group-active:text-teal-200";
