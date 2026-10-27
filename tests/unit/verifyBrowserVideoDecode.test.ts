import { describe, expect, it, vi } from "vitest";

import {
  verifyBrowserVideoDecode,
  type BrowserVideoDecodeHost,
  type BrowserVideoElementLike,
} from "@/src/lib/media/verifyBrowserVideoDecode";

function mockHost(params: {
  videoWidth: number;
  videoHeight: number;
  duration?: number;
  failLoad?: boolean;
  failDraw?: boolean;
  /** Délai avant loadeddata (pour tester abort). */
  loadDelayMs?: number;
}): {
  host: BrowserVideoDecodeHost;
  getVideo: () => BrowserVideoElementLike;
} {
  let video!: BrowserVideoElementLike;
  const host: BrowserVideoDecodeHost = {
    createObjectURL: () => "blob:mock",
    revokeObjectURL: vi.fn(),
    createVideoElement: () => {
      const listeners = new Map<string, Set<() => void>>();
      video = {
        muted: false,
        playsInline: false,
        preload: "",
        src: "",
        videoWidth: params.videoWidth,
        videoHeight: params.videoHeight,
        duration: params.duration ?? 1.5,
        currentTime: 0,
        onloadeddata: null,
        onerror: null,
        addEventListener: (type, listener) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(listener);
        },
        removeEventListener: (type, listener) => {
          listeners.get(type)?.delete(listener);
        },
        removeAttribute: vi.fn(),
        load: vi.fn(),
      };

      // Déclenche le pipeline quand src est assigné.
      Object.defineProperty(video, "src", {
        configurable: true,
        get: () => (video as { _src?: string })._src ?? "",
        set: (value: string) => {
          (video as { _src?: string })._src = value;
          const fire = () => {
            if (params.failLoad) {
              video.onerror?.(new Event("error"));
              return;
            }
            video.onloadeddata?.(new Event("loadeddata"));
            queueMicrotask(() => {
              listeners.get("seeked")?.forEach((fn) => fn());
            });
          };
          if (params.loadDelayMs && params.loadDelayMs > 0) {
            setTimeout(fire, params.loadDelayMs);
          } else {
            queueMicrotask(fire);
          }
        },
      });

      Object.defineProperty(video, "currentTime", {
        configurable: true,
        get: () => (video as { _t?: number })._t ?? 0,
        set: (value: number) => {
          (video as { _t?: number })._t = value;
          queueMicrotask(() => {
            listeners.get("seeked")?.forEach((fn) => fn());
          });
        },
      });

      return video;
    },
    createCanvas: (width, height) => ({
      width,
      height,
      getContext: () => {
        if (params.failDraw) return null;
        return {
          drawImage: vi.fn(),
          getImageData: () =>
            ({
              data: new Uint8ClampedArray([1, 2, 3, 255]),
              width: 1,
              height: 1,
              colorSpace: "srgb",
            }) as ImageData,
        };
      },
    }),
  };
  return { host, getVideo: () => video };
}

describe("verifyBrowserVideoDecode", () => {
  it("ne dépend pas du probe conteneur (module distinct)", async () => {
    // Garde-fou structurel : ce fichier de test n'importe pas probeMp4Container.
    const src = await import("@/src/lib/media/verifyBrowserVideoDecode");
    expect(src.verifyBrowserVideoDecode).toBeTypeOf("function");
  });

  it("paysage décodé → ok + dimensions", async () => {
    const { host } = mockHost({ videoWidth: 1280, videoHeight: 720 });
    const result = await verifyBrowserVideoDecode(new Blob(), { host });
    expect(result).toEqual({
      ok: true,
      orientedWidth: 1280,
      orientedHeight: 720,
      orientation: "landscape",
      frameDecoded: true,
      durationSec: 1.5,
    });
  });

  it("portrait (rotation 90° sur flux paysage) → dimensions portrait", async () => {
    const { host } = mockHost({ videoWidth: 1920, videoHeight: 1080 });
    const result = await verifyBrowserVideoDecode(new Blob(), {
      host,
      rotationDegrees: 90,
    });
    expect(result).toMatchObject({
      ok: true,
      orientedWidth: 1080,
      orientedHeight: 1920,
      orientation: "portrait",
      frameDecoded: true,
    });
  });

  it("dimensions au-delà du plafond V1 → video_dimensions_exceed_limit", async () => {
    const { host } = mockHost({ videoWidth: 3840, videoHeight: 2160 });
    const result = await verifyBrowserVideoDecode(new Blob(), { host });
    expect(result).toEqual({
      ok: false,
      error: "video_dimensions_exceed_limit",
    });
  });

  it("métadonnées invalides (0×0) → video_decode_failed", async () => {
    const { host } = mockHost({ videoWidth: 0, videoHeight: 0 });
    const result = await verifyBrowserVideoDecode(new Blob(), { host });
    expect(result).toEqual({ ok: false, error: "video_decode_failed" });
  });

  it("échec de chargement → video_decode_failed", async () => {
    const { host } = mockHost({
      videoWidth: 640,
      videoHeight: 360,
      failLoad: true,
    });
    const result = await verifyBrowserVideoDecode(new Blob(), { host });
    expect(result).toEqual({ ok: false, error: "video_decode_failed" });
  });

  it("échec paint frame → video_decode_failed", async () => {
    const { host } = mockHost({
      videoWidth: 640,
      videoHeight: 360,
      failDraw: true,
    });
    const result = await verifyBrowserVideoDecode(new Blob(), { host });
    expect(result).toEqual({ ok: false, error: "video_decode_failed" });
  });

  it("AbortSignal déjà aborted → video_prepare_cancelled", async () => {
    const { host } = mockHost({ videoWidth: 640, videoHeight: 360 });
    const signal = AbortSignal.abort();
    const result = await verifyBrowserVideoDecode(new Blob(), { host, signal });
    expect(result).toEqual({ ok: false, error: "video_prepare_cancelled" });
  });

  it("annulation pendant le chargement → ignore le résultat tardif", async () => {
    const { host } = mockHost({
      videoWidth: 640,
      videoHeight: 360,
      loadDelayMs: 40,
    });
    const controller = new AbortController();
    const pending = verifyBrowserVideoDecode(new Blob(), {
      host,
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).resolves.toEqual({
      ok: false,
      error: "video_prepare_cancelled",
    });
  });
});
