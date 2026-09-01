/**
 * Chemin 1 — chorégraphie hubFreezeTo2D / panelCloseToHub (E+A+D).
 * Capture canvas (B) = réutilisera la **même** courbe d’apparition KEEP.
 */

/** Beat 1 — étoile flash · invite out · breath hold. */
export const HUB_FREEZE_HOLD_MS = 200;
/** Plan B — capture canvas @ fin hold (frame WebGL stable). */
export const HUB_CAPTURE_AT_MS = HUB_FREEZE_HOLD_MS;
/** Beat 2 — crossfade WebGL → PNG (aller). */
export const HUB_FREEZE_FADE_MS = 560;
/** Panneau verre commence (pendant le fade). */
export const HUB_FREEZE_PANEL_AT_MS = 340;
/** Fin freeze → unmount WebGL. */
export const HUB_FREEZE_TOTAL_MS = HUB_FREEZE_HOLD_MS + HUB_FREEZE_FADE_MS;

/** D — panneau sort (legacy slide · remplacé par rituel collapse T2–T3). */
export const HUB_CLOSE_PANEL_OUT_MS = 400;
/** T2 — inspire stellaire sur capture (brightness + flash étoile). */
export const HUB_CLOSE_INSPIRE_MS = 220;
/** T3 — aspiration verre vers Hero. */
export const HUB_CLOSE_COLLAPSE_MS = 520;
/** T3 — beat @ étoile (crossfade déjà en cours). */
export const HUB_CLOSE_HOLD_MS = 80;
/** Début thaw KEEP pendant collapse (depuis début collapse). */
export const HUB_CLOSE_THAW_AT_MS = 140;
/** T-close-3f — impact verre→étoile (% durée collapse). */
export const HUB_CLOSE_IMPACT_COLLAPSE_U = 0.78;
/** T-close-3f — thaw bridge (% durée collapse, avant fin hold). */
export const HUB_CLOSE_THAW_COLLAPSE_U = 0.88;
/** T-close-3f — backdrop JPEG recule (% durée collapse). */
export const HUB_CLOSE_BACKDROP_FADE_COLLAPSE_U = 0.75;

/** Ms depuis début `closePanel` @ ratio u du collapse (après inspire). */
export function hubCloseMsAtCollapseU(u: number): number {
  return HUB_CLOSE_INSPIRE_MS + HUB_CLOSE_COLLAPSE_MS * u;
}
/** Fin rituel fermeture → panneau off. */
export const HUB_CLOSE_RITUAL_MS =
  HUB_CLOSE_INSPIRE_MS + HUB_CLOSE_COLLAPSE_MS + HUB_CLOSE_HOLD_MS;
/** Fondu rapide calque WebGL @ collapse (filante visible — pas KEEP 880 ms). */
export const HUB_CLOSE_STREAK_LAYER_FADE_MS = 180;
/** @deprecated silence retiré — conservé pour doc legacy. */
export const HUB_CLOSE_SILENCE_MS = 0;

/**
 * KEEP — courbe d’apparition du hub (thaw).
 * Une seule vérité : CSS + JS (breath / invite). B (capture) réutilisera ça.
 *
 * Forme : S organique — lent au réveil, fleurit, se pose.
 * Pour chercher : ne changer QUE `HUB_THAW_APPEAR_EASE_CSS` + `HUB_THAW_APPEAR_MS`.
 * Candidats :
 *  - (0.45, 0.02, 0.22, 1) ← actuel (bloom doux)
 *  - (0.37, 0, 0.63, 1)     ← S plus symétrique
 *  - (0.22, 1, 0.36, 1)     ← ease-out (plus vif au début)
 */
export const HUB_THAW_APPEAR_EASE_CSS = "cubic-bezier(0.45, 0.02, 0.22, 1)";
export const HUB_THAW_APPEAR_MS = 880;

/** Contrôle cubic-bezier CSS (x1,y1,x2,y2) — sync breath/invite. */
const THAW_BZ = [0.45, 0.02, 0.22, 1] as const;

/** D — total close (rituel + ramp KEEP après D1). */
export const HUB_CLOSE_TOTAL_MS =
  HUB_CLOSE_RITUAL_MS + HUB_THAW_APPEAR_MS;

export type HubFreezeFx = {
  /** 1 → 0 flash soft sur Hero (hold). */
  flash: number;
  /** true = respiration figée (retenir le souffle). */
  holdBreath: boolean;
  /** 0–1 mul invite Html. */
  inviteMul: number;
  /**
   * 0→1 pendant thaw appear (courbe KEEP).
   * 1 = hub pleinement vivant (idle / hors thaw).
   */
  thawAppearU: number;
  /** performance.now() début ramp appear · null = inactif. */
  thawAppearStartedAt: number | null;
};

/** Lu dans le Canvas (useFrame) — pas de setState. */
export const hubFreezeFxRef: HubFreezeFx = {
  flash: 0,
  holdBreath: false,
  inviteMul: 1,
  thawAppearU: 1,
  thawAppearStartedAt: null,
};

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/**
 * Échantillonne y = bezier(x) pour cubic-bezier CSS (Newton).
 * Même courbe que `HUB_THAW_APPEAR_EASE_CSS`.
 */
export function hubThawAppearEase(t: number): number {
  const x = clamp01(t);
  const [x1, y1, x2, y2] = THAW_BZ;
  let guess = x;
  for (let i = 0; i < 6; i++) {
    const u = 1 - guess;
    const bx =
      3 * u * u * guess * x1 + 3 * u * guess * guess * x2 + guess * guess * guess;
    const dx =
      3 * u * u * x1 +
      6 * u * guess * (x2 - x1) +
      3 * guess * guess * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    guess -= (bx - x) / dx;
    guess = clamp01(guess);
  }
  const u = 1 - guess;
  return (
    3 * u * u * guess * y1 +
    3 * u * guess * guess * y2 +
    guess * guess * guess
  );
}

export function resetHubFreezeFx() {
  hubFreezeFxRef.flash = 0;
  hubFreezeFxRef.holdBreath = false;
  hubFreezeFxRef.inviteMul = 1;
  hubFreezeFxRef.thawAppearU = 1;
  hubFreezeFxRef.thawAppearStartedAt = null;
}

/** Démarre le rite clic étoile. */
export function beginHubFreezeFx() {
  hubFreezeFxRef.flash = 1;
  hubFreezeFxRef.holdBreath = true;
  hubFreezeFxRef.inviteMul = 0;
  hubFreezeFxRef.thawAppearU = 1;
  hubFreezeFxRef.thawAppearStartedAt = null;
}

/** Fin hold → laisse le flash mourir, breath reste hold jusqu’à unmount. */
export function softenHubFreezeFx() {
  hubFreezeFxRef.flash = 0;
}

/** Fermeture T2 — flash étoile miroir (inspire) · breath libre pour reprise. */
export function beginHubCloseInspire() {
  hubFreezeFxRef.flash = 1;
  hubFreezeFxRef.holdBreath = false;
  hubFreezeFxRef.inviteMul = 0;
}

export function softenHubCloseInspire() {
  hubFreezeFxRef.flash = 0;
}

/** T-close-3f — kiss étoile @ impact (sync CSS + canvas Hero). */
export function pulseHubCloseStarKiss() {
  hubFreezeFxRef.flash = 1;
  hubFreezeFxRef.holdBreath = false;
}

/**
 * Début ramp d’apparition hub (après silence).
 * Breath + invite suivent `hubThawAppearEase` dans useFrame.
 */
export function beginHubThawAppear() {
  hubFreezeFxRef.flash = 0;
  hubFreezeFxRef.holdBreath = true;
  hubFreezeFxRef.inviteMul = 0;
  hubFreezeFxRef.thawAppearU = 0;
  hubFreezeFxRef.thawAppearStartedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Tick Canvas — avance thawAppearU sur la courbe KEEP. */
export function tickHubThawAppear(now = performance.now()): number {
  const start = hubFreezeFxRef.thawAppearStartedAt;
  if (start == null) return hubFreezeFxRef.thawAppearU;
  const raw = clamp01((now - start) / HUB_THAW_APPEAR_MS);
  const u = hubThawAppearEase(raw);
  hubFreezeFxRef.thawAppearU = u;
  hubFreezeFxRef.holdBreath = u < 0.18;
  /** Invite après le réveil étoile. */
  hubFreezeFxRef.inviteMul = clamp01((u - 0.42) / 0.38);
  if (raw >= 1) {
    hubFreezeFxRef.thawAppearStartedAt = null;
    hubFreezeFxRef.thawAppearU = 1;
    hubFreezeFxRef.holdBreath = false;
    hubFreezeFxRef.inviteMul = 1;
  }
  return u;
}
