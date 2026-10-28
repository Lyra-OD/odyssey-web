/**
 * Commit 4 S7 — preuve de décodage navigateur + dimensions orientées.
 *
 * Indépendant du probe conteneur (Commit 3) : un conteneur admissible
 * ne garantit pas un décodage réussi.
 *
 * 1) **WebCodecs / mediabunny** (prioritaire) : décode 1 frame sans `play()`
 *    → indispensable HFR iOS (geste utilisateur perdu après await).
 * 2) Fallback `<video>` + play + paint (HEVC HTML-only, tests host mock).
 *
 * @see docs/product/COFFRE_MONTAGE_MEDIA_INGEST.md §7.2–7.3
 */

import {
  ALL_FORMATS,
  BlobSource,
  Input,
  VideoSampleSink,
} from "mediabunny";

import {
  applyRotationToDimensions,
  assessOrientedDimensions,
  classifyFrameOrientation,
  type VideoFrameOrientation,
} from "@/src/lib/media/orientedVideoDimensions";

const DECODE_TIMEOUT_MS = 20_000;
/** Attente max des videoWidth/Height après nudge (HFR iOS). */
const DIMS_POLL_MS = 2_500;

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
  /** Optionnel : HTMLVideoElement réel (HFR iOS). */
  play?: () => Promise<void>;
  pause?: () => void;
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
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
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

function hasDimensions(video: BrowserVideoElementLike): boolean {
  return (
    Number.isFinite(video.videoWidth) &&
    Number.isFinite(video.videoHeight) &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

function delay(
  host: BrowserVideoDecodeHost,
  ms: number,
  signal?: AbortSignal,
): Promise<void> {
  const setTimeoutFn = host.setTimeout ?? setTimeout;
  const clearTimeoutFn = host.clearTimeout ?? clearTimeout;
  return new Promise((resolve, reject) => {
    if (aborted(signal)) {
      reject(new Error("video_prepare_cancelled"));
      return;
    }
    const id = setTimeoutFn(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeoutFn(id);
      reject(new Error("video_prepare_cancelled"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Charge loadeddata (ou error / timeout).
 */
function waitLoadedData(
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
      video.onloadeddata = null;
      video.onerror = null;
      if (err) reject(err);
      else resolve();
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    if (aborted(signal)) {
      finish(new Error("video_prepare_cancelled"));
      return;
    }

    video.onerror = () => finish(new Error("video_decode_failed"));
    video.onloadeddata = () => finish();
    video.src = objectUrl;
  });
}

/**
 * Attend qu’au moins une frame soit présentée (HFR iOS = noir tant que pas play).
 */
async function waitForPresentedFrame(
  video: BrowserVideoElementLike,
  host: BrowserVideoDecodeHost,
  signal?: AbortSignal,
): Promise<void> {
  if (aborted(signal)) throw new Error("video_prepare_cancelled");

  const el = video as BrowserVideoElementLike & {
    requestVideoFrameCallback?: (
      cb: (now: number, meta: unknown) => void,
    ) => number;
    cancelVideoFrameCallback?: (id: number) => void;
  };

  if (typeof el.requestVideoFrameCallback === "function") {
    await new Promise<void>((resolve, reject) => {
      const setTimeoutFn = host.setTimeout ?? setTimeout;
      const clearTimeoutFn = host.clearTimeout ?? clearTimeout;
      let done = false;
      const finish = (err?: Error) => {
        if (done) return;
        done = true;
        clearTimeoutFn(timer);
        signal?.removeEventListener("abort", onAbort);
        if (typeof id === "number") {
          try {
            el.cancelVideoFrameCallback?.(id);
          } catch {
            // ignore
          }
        }
        if (err) reject(err);
        else resolve();
      };
      const onAbort = () => finish(new Error("video_prepare_cancelled"));
      signal?.addEventListener("abort", onAbort, { once: true });
      const timer = setTimeoutFn(
        () => finish(), // timeout soft : on tentera paint quand même
        2_500,
      );
      const id = el.requestVideoFrameCallback!(() => finish());
    });
    return;
  }

  // Fallback : quelques frames rAF pendant lecture.
  for (let i = 0; i < 18; i += 1) {
    if (aborted(signal)) throw new Error("video_prepare_cancelled");
    await delay(host, 32, signal);
    if (hasDimensions(video)) return;
  }
}

/**
 * HFR iOS : play obligatoire (preview noire sinon), puis frame présentée.
 * Pas de dépendance au `seeked` (souvent mort à ~120 fps).
 */
async function ensureDecodableFrame(
  video: BrowserVideoElementLike,
  host: BrowserVideoDecodeHost,
  signal?: AbortSignal,
): Promise<void> {
  if (aborted(signal)) throw new Error("video_prepare_cancelled");

  if (typeof video.play !== "function") {
    // Host de test : dims déjà là ou échec plus bas.
    if (hasDimensions(video)) return;
    throw new Error("video_decode_failed");
  }

  try {
    await video.play();
  } catch {
    throw new Error("video_decode_failed");
  }

  try {
    await waitForPresentedFrame(video, host, signal);

    const nowFn = host.now ?? (() => Date.now());
    const deadline = nowFn() + DIMS_POLL_MS;
    while (!hasDimensions(video) && nowFn() < deadline) {
      if (aborted(signal)) throw new Error("video_prepare_cancelled");
      await delay(host, 50, signal);
    }
  } finally {
    try {
      video.pause?.();
    } catch {
      // ignore
    }
  }

  if (!hasDimensions(video)) {
    throw new Error("video_decode_failed");
  }
}

function proveFrameDecoded(
  host: BrowserVideoDecodeHost,
  video: BrowserVideoElementLike,
  width: number,
  height: number,
): boolean {
  const canvas = host.createCanvas(Math.min(width, 64), Math.min(height, 64));
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const sample = ctx.getImageData(0, 0, 1, 1);
      return sample.data.byteLength >= 4;
    } catch {
      // iOS parfois bloque getImageData ; drawImage sans throw = frame OK.
      return true;
    }
  } catch {
    return false;
  }
}

function finalizeOrientedResult(
  rawW: number,
  rawH: number,
  rotationDegrees: number,
  enforceDimensionLimits: boolean,
  durationSec: number | null,
): VideoDecodeResult {
  if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW < 1 || rawH < 1) {
    return { ok: false, error: "video_decode_failed" };
  }

  const oriented = applyRotationToDimensions(rawW, rawH, rotationDegrees);
  const dims = assessOrientedDimensions(oriented.width, oriented.height);
  if (!dims.ok) {
    if (enforceDimensionLimits || dims.error === "video_dimensions_invalid") {
      return { ok: false, error: dims.error };
    }
  }

  const orientedWidth = dims.ok ? dims.width : Math.round(oriented.width);
  const orientedHeight = dims.ok ? dims.height : Math.round(oriented.height);
  const orientation = dims.ok
    ? dims.orientation
    : classifyFrameOrientation(orientedWidth, orientedHeight);

  return {
    ok: true,
    orientedWidth,
    orientedHeight,
    orientation,
    frameDecoded: true,
    durationSec,
  };
}

/**
 * Preuve frame via VideoDecoder (mediabunny). Pas de geste / play HTML.
 * Retourne null si indécodable → fallback `<video>`.
 */
async function tryVerifyViaWebCodecs(
  source: Blob,
  options: {
    signal?: AbortSignal;
    rotationDegrees: number;
    enforceDimensionLimits: boolean;
  },
): Promise<VideoDecodeResult | null> {
  if (aborted(options.signal)) return cancelled();
  if (typeof VideoDecoder === "undefined") return null;

  try {
    const input = new Input({
      source: new BlobSource(source),
      formats: ALL_FORMATS,
    });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return null;
    if (!(await track.canDecode())) return null;
    if (aborted(options.signal)) return cancelled();

    const displayW = await track.getDisplayWidth();
    const displayH = await track.getDisplayHeight();
    if (aborted(options.signal)) return cancelled();

    // getSample sur ~120 fps peut rester bloqué (iOS) : plafond 5 s,
    // puis dimensions d’affichage si le décodeur est quand même capable.
    const sink = new VideoSampleSink(track);
    const sample = await new Promise<Awaited<
      ReturnType<VideoSampleSink["getSample"]>
    > | null>((resolve, reject) => {
      const timer = setTimeout(() => resolve(null), 5_000);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new Error("video_prepare_cancelled"));
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });
      void sink
        .getSample(0)
        .then((value) => {
          clearTimeout(timer);
          options.signal?.removeEventListener("abort", onAbort);
          resolve(value);
        })
        .catch(() => {
          clearTimeout(timer);
          options.signal?.removeEventListener("abort", onAbort);
          resolve(null);
        });
    });

    if (aborted(options.signal)) {
      sample?.close();
      return cancelled();
    }

    const rawW = sample?.displayWidth || displayW;
    const rawH = sample?.displayHeight || displayH;
    sample?.close();
    if (!(rawW > 0) || !(rawH > 0)) return null;

    let durationSec: number | null = null;
    try {
      const d = await input.computeDuration();
      if (Number.isFinite(d) && d > 0) durationSec = d;
    } catch {
      durationSec = null;
    }

    return finalizeOrientedResult(
      rawW,
      rawH,
      options.rotationDegrees,
      options.enforceDimensionLimits,
      durationSec,
    );
  } catch {
    return null;
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

  // Prod : WebCodecs d’abord (HFR 60/120 iOS — play() HTML échoue sans geste).
  // Tests : `host` injecté → chemin mock HTML uniquement.
  if (!options.host) {
    const viaWc = await tryVerifyViaWebCodecs(source, {
      signal,
      rotationDegrees,
      enforceDimensionLimits,
    });
    if (viaWc) return viaWc;
  }

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
    await waitLoadedData(video, objectUrl, host, signal);
    if (aborted(signal)) return cancelled();

    await ensureDecodableFrame(video, host, signal);
    if (aborted(signal)) return cancelled();

    const rawW = video.videoWidth;
    const rawH = video.videoHeight;

    // Paint pendant play (HFR : frame noire avant lecture).
    let frameDecoded = false;
    if (typeof video.play === "function") {
      try {
        await video.play();
        await waitForPresentedFrame(video, host, signal);
        frameDecoded = proveFrameDecoded(host, video, rawW || 64, rawH || 64);
      } catch (err) {
        if (
          aborted(signal) ||
          (err instanceof Error && err.message === "video_prepare_cancelled")
        ) {
          return cancelled();
        }
        frameDecoded = proveFrameDecoded(host, video, rawW || 64, rawH || 64);
      } finally {
        try {
          video.pause?.();
        } catch {
          // ignore
        }
      }
    } else {
      frameDecoded = proveFrameDecoded(host, video, rawW || 64, rawH || 64);
    }
    if (!frameDecoded) {
      return { ok: false, error: "video_decode_failed" };
    }

    if (aborted(signal)) return cancelled();

    const durationSec =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : null;

    return finalizeOrientedResult(
      video.videoWidth,
      video.videoHeight,
      rotationDegrees,
      enforceDimensionLimits,
      durationSec,
    );
  } catch (err) {
    if (
      aborted(signal) ||
      (err instanceof Error && err.message === "video_prepare_cancelled")
    ) {
      return cancelled();
    }
    return { ok: false, error: "video_decode_failed" };
  } finally {
    try {
      video.pause?.();
      video.removeAttribute("src");
      video.load();
    } catch {
      // ignore
    }
    host.revokeObjectURL(objectUrl);
  }
}
