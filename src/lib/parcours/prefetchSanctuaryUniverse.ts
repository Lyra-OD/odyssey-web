/** Précharge le chunk WebGL hub — évite le jank @ Esc si le canvas n’a jamais monté. */
let prefetchPromise: Promise<unknown> | null = null;

export function prefetchSanctuaryUniverse(): void {
  if (typeof window === "undefined") return;
  if (!prefetchPromise) {
    prefetchPromise = import("@/src/components/contribute/SanctuaryUniverse");
  }
}
