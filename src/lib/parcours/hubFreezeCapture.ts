/** Session capture gel hub (Plan B) — une URL active · fallback JPEG statique si null. */
export const hubFreezeCaptureRef = { url: null as string | null };

export function captureHubCanvas(canvas: HTMLCanvasElement | null): string | null {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
  try {
    revokeHubFreezeCapture();
    const url = canvas.toDataURL("image/png");
    if (!url.startsWith("data:image/png")) return null;
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
