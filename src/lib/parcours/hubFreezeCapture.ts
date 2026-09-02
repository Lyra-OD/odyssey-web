/** Session capture gel hub (Plan B) — une URL active · fallback JPEG statique si null. */
export const hubFreezeCaptureRef = { url: null as string | null };

export function captureHubCanvas(canvas: HTMLCanvasElement | null): string | null {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
  try {
    revokeHubFreezeCapture();
    /**
     * JPEG et pas PNG : l'encodage est synchrone et bloque le thread principal.
     * En PNG plein écran ça coûte plusieurs secondes de gel + une data URL de
     * plusieurs Mo que le compositeur doit ensuite redécoder.
     */
    const url = canvas.toDataURL("image/jpeg", 0.82);
    if (!url.startsWith("data:image/jpeg")) return null;
    hubFreezeCaptureRef.url = url;
    return url;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[parcours] hub freeze capture failed", err);
    }
    return null;
  }
}

export function revokeHubFreezeCapture() {
  hubFreezeCaptureRef.url = null;
}

export function resolveHubFreezeBackdropSrc(
  captureUrl: string | null,
  fallbackSrc: string,
): string {
  return captureUrl ?? fallbackSrc;
}
