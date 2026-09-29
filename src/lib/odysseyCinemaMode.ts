/**
 * Mode cinéma immersif — `html[data-odyssey-cinema="1"]`.
 * Ref-count : sas + projection peuvent coexister ; le flag ne tombe
 * que quand le dernier owner release (évite le trou Navbar au retour hub).
 */

export const ODYSSEY_CINEMA_ATTR = "data-odyssey-cinema";

let owners = 0;

function syncDom() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (owners > 0) {
    root.setAttribute(ODYSSEY_CINEMA_ATTR, "1");
  } else {
    root.removeAttribute(ODYSSEY_CINEMA_ATTR);
  }
}

/** Pose le mode cinéma. Retourne le release (idempotent si appelé 1×). */
export function acquireOdysseyCinemaMode(): () => void {
  if (typeof document === "undefined") return () => {};
  owners += 1;
  syncDom();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    owners = Math.max(0, owners - 1);
    syncDom();
  };
}

/** Test / debug — reset compteur (jamais en prod UI). */
export function __resetOdysseyCinemaModeForTests() {
  owners = 0;
  syncDom();
}

export function __odysseyCinemaOwnerCountForTests() {
  return owners;
}
