/**
 * Commit 4 S7 — preuve de décodage navigateur + dimensions orientées.
 *
 * Indépendant du probe conteneur (Commit 3) : un conteneur admissible
 * ne garantit pas un décodage réussi.
 *
 * - Charge métadonnées via `<video>`
 * - Seek + drawImage d'une frame (preuve de décodage)
 * - Dimensions = videoWidth/videoHeight (déjà orientées par le moteur)
 *   ou rotation optionnelle fournie (métadonnée conteneur)
 * - AbortSignal : résultat tardif ignoré → `video_prepare_cancelled`
 *
 * @see docs/product/COFFRE_MONTAGE_MEDIA_INGEST.md §7.2–7.3
 */

import {
  applyRotationToDimensions,
  assessOrientedDimensions,
  classifyFrameOrientation,
  type VideoFrameOrientation,
} from "@/src/lib/media/orientedVideoDimensions";

const DECODE_TIMEOUT_MS = 12_000;

export type VideoDecodeErrorCode =
  | "video_decode_failed"
  | "video_dimensions_invalid"
  | "video_dimensions_exceed_limit"
  | "video_prepare_cancelled";

export type VideoDecodeSuccess = {
  ok: true;
  orientedWidth: number;
  orientedHeight: number;
  orientation: VideoFrameOrientation;
  /** true si au moins une frame a été peinte sur un canvas */
  frameDecoded: true;
  durationSec: number | null;
};

export type VideoDecodeFailure = {
  ok: false;
  error: VideoDecodeErrorCode;
};

export type VideoDecodeResult = VideoDecodeSuccess | VideoDecodeFailure;

/** Surface minimale pour tests (pas de dépendance HTMLVideoElement réelle). */
export type BrowserCanvasLike = {
  width: number;
  height: number;
  getContext: (type: "2d") => BrowserCanvas2DContextLike | null;
};

export type BrowserCanvas2DContextLike = {
  drawImage: (
    image: unknown,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => void;
  getImageData: (sx: number, sy: number, sw: number, sh: number) => ImageData;
};

export type BrowserVideoDecodeHost = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createVideoElement: () => BrowserVideoElementLike;
  createCanvas: (width: number, height: number) => BrowserCanvasLike;
  now?: () => number;
  setTimeout?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout?: (id: ReturnType<typeof setTimeout>) => void;
};

export type BrowserVideoElementLike = {
  muted: boolean;
  playsInline: boolean;
  preload: string;
  src: string;
  readonly videoWidth: number;
  readonly videoHeight: number;
  readonly duration: number;
  currentTime: number;
  onloadeddata: ((ev?: Event) => void) | null;
  onerror: ((ev?: Event) => void) | null;
  addEventListener: (type: "seeked", listener: () => void) => void;
  removeEventListener: (type: "seeked", listener: () => void) => void;
  removeAttribute: (name: string) => void;
  load: () => void;
};

export type VerifyBrowserVideoDecodeOptions = {
  signal?: AbortSignal;
  /** Rotation conteneur en degrés (0/90/180/270). Défaut 0 = faire confiance au moteur. */
  rotationDegrees?: number;
  /**
   * Si false, une source trop grande (4K…) reste ok après preuve de frame :
   * l’orchestrateur pourra encoder pour rentrer dans les limites V1.
   * Défaut true (validation stricte Commit 4 / validation finale).
   */
  enforceDimensionLimits?: boolean;
  /** Injection tests. Défaut = APIs document/URL du navigateur. */
  host?: BrowserVideoDecodeHost;
};

function defaultHost(): BrowserVideoDecodeHost | null {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return null;
  }
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    createVideoElement: () => {
      const video = document.createElement("video");
      return video as unknown as BrowserVideoElementLike;
    },
    createCanvas: (width, height) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas as unknown as BrowserCanvasLike;
    },
    now: () => performance.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
}

function aborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

function cancelled(): VideoDecodeFailure {
  return { ok: false, error: "video_prepare_cancelled" };
}

function loadAndSeekVideo(
  video: BrowserVideoElementLike,
  objectUrl: string,
  host: BrowserVideoDecodeHost,
  signal?: AbortSignal,
): Promise<void> {
  const setTimeoutFn = host.setTimeout ?? setTimeout;
  const clearTimeoutFn = host.clearTimeout ?? clearTimeout;

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeoutFn(() => {
      finish(new Error("video_decode_timeout"));
    }, DECODE_TIMEOUT_MS);

    const onAbort = () => finish(new Error("video_prepare_cancelled"));

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeoutFn(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      if (err) reject(err);
      else resolve();
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    if (aborted(signal)) {
      finish(new Error("video_prepare_cancelled"));
      return;
    }

    video.onerror = () => finish(new Error("video_decode_failed"));
    video.onloadeddata = () => {
      if (aborted(signal)) {
        finish(new Error("video_prepare_cancelled"));
        return;
      }
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const seekTo =
        duration > 0 ? Math.min(0.1, Math.max(0.01, duration * 0.01)) : 0.1;

      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        finish();
      };
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = seekTo;
      } catch {
        video.removeEventListener("seeked", onSeeked);
        // Certains moteurs livrent déjà une frame sur loadeddata.
        finish();
      }
    };

    video.src = objectUrl;
  });
}

function proveFrameDecoded(
  host: BrowserVideoDecodeHost,
  video: BrowserVideoElementLike,
  width: number,
  height: number,
): boolean {
  const canvas = host.createCanvas(Math.min(width, 16), Math.min(height, 16));
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const sample = ctx.getImageData(0, 0, 1, 1);
    return sample.data.byteLength >= 4;
  } catch {
    return false;
  }
}

/**
 * Décode une frame et valide les dimensions orientées V1.
 * N'importe pas / n'appelle pas `probeMp4Container`.
 */
export async function verifyBrowserVideoDecode(
  source: Blob,
  options: VerifyBrowserVideoDecodeOptions = {},
): Promise<VideoDecodeResult> {
  const {
    signal,
    rotationDegrees = 0,
    enforceDimensionLimits = true,
  } = options;

  if (aborted(signal)) return cancelled();

  const host = options.host ?? defaultHost();
  if (!host) {
    return { ok: false, error: "video_decode_failed" };
  }

  const objectUrl = host.createObjectURL(source);
  const video = host.createVideoElement();
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await loadAndSeekVideo(video, objectUrl, host, signal);

    if (aborted(signal)) return cancelled();

    const rawW = video.videoWidth;
    const rawH = video.videoHeight;
    if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW < 1 || rawH < 1) {
      return { ok: false, error: "video_decode_failed" };
    }

    const oriented = applyRotationToDimensions(rawW, rawH, rotationDegrees);
    const dims = assessOrientedDimensions(oriented.width, oriented.height);
    if (!dims.ok) {
      if (enforceDimensionLimits || dims.error === "video_dimensions_invalid") {
        return { ok: false, error: dims.error };
      }
      // Trop grand pour V1 : on prouve quand même le décodage pour permettre l'encode.
    }

    const orientedWidth = dims.ok ? dims.width : Math.round(oriented.width);
    const orientedHeight = dims.ok ? dims.height : Math.round(oriented.height);
    const orientation = dims.ok
      ? dims.orientation
      : classifyFrameOrientation(orientedWidth, orientedHeight);

    if (aborted(signal)) return cancelled();

    const frameDecoded = proveFrameDecoded(
      host,
      video,
      orientedWidth,
      orientedHeight,
    );
    if (!frameDecoded) {
      return { ok: false, error: "video_decode_failed" };
    }

    // Résultat tardif après annulation : ne jamais renvoyer ok.
    if (aborted(signal)) return cancelled();

    const durationSec = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : null;

    return {
      ok: true,
      orientedWidth,
      orientedHeight,
      orientation,
      frameDecoded: true,
      durationSec,
    };
  } catch (err) {
    if (aborted(signal) || (err instanceof Error && err.message === "video_prepare_cancelled")) {
      return cancelled();
    }
    return { ok: false, error: "video_decode_failed" };
  } finally {
    try {
      video.removeAttribute("src");
      video.load();
    } catch {
      // ignore
    }
    host.revokeObjectURL(objectUrl);
  }
}
