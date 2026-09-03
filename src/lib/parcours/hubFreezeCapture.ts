/** Session capture gel hub (Plan B) — une URL active · null = void (jamais un autre ciel). */
export const hubFreezeCaptureRef = { url: null as string | null };

/**
 * Rendu synchrone + encodage, fourni par le Canvas hub.
 * Le contexte WebGL tourne sans `preserveDrawingBuffer` : le back buffer n'est
 * lisible que dans la tâche qui vient de peindre, d'où le couple render+encode.
 */
export type HubFrameCapture = () => string | null;

/** JPEG et pas PNG : l'encodage est synchrone et le PNG plein écran gèle le thread. */
export function encodeHubFrame(canvas: HTMLCanvasElement): string | null {
  if (canvas.width === 0 || canvas.height === 0) return null;
  const url = canvas.toDataURL("image/jpeg", 0.82);
  return url.startsWith("data:image/jpeg") ? url : null;
}

export function captureHubFrame(
  capture: HubFrameCapture | null,
): string | null {
  if (!capture) return null;
  try {
    revokeHubFreezeCapture();
    const url = capture();
    if (!url) return null;
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
