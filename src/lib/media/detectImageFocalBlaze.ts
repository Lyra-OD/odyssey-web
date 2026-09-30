/**
 * Fallback C5 — BlazeFace (tfjs), chargé en lazy uniquement si FaceDetector absent.
 */

import type { DetectedFocalPoint } from "@/src/lib/media/detectImageFocal";
import { focalFromFaceBox } from "@/src/lib/media/detectImageFocal";

type BlazeModel = {
  estimateFaces: (
    input: HTMLCanvasElement | HTMLImageElement | ImageData,
    returnTensors?: boolean,
  ) => Promise<
    Array<{
      topLeft: [number, number] | Float32Array;
      bottomRight: [number, number] | Float32Array;
      probability?: number | Float32Array;
    }>
  >;
};

let modelPromise: Promise<BlazeModel> | null = null;

async function loadBlazeModel(): Promise<BlazeModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import("@tensorflow/tfjs");
      const blazeface = await import("@tensorflow-models/blazeface");
      return blazeface.load({ maxFaces: 3 }) as Promise<BlazeModel>;
    })();
  }
  return modelPromise;
}

function asPair(
  v: [number, number] | Float32Array,
): [number, number] {
  return [Number(v[0]), Number(v[1])];
}

/**
 * Détecte une focale via BlazeFace (centroïde du plus grand visage).
 */
export async function detectImageFocalWithBlazeFace(
  blob: Blob,
): Promise<DetectedFocalPoint | null> {
  if (typeof window === "undefined") return null;

  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);

    const model = await loadBlazeModel();
    const faces = await model.estimateFaces(canvas, false);
    if (!faces?.length) return null;

    let best: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null = null;
    let bestArea = 0;

    for (const face of faces) {
      const [x0, y0] = asPair(face.topLeft);
      const [x1, y1] = asPair(face.bottomRight);
      const width = Math.max(0, x1 - x0);
      const height = Math.max(0, y1 - y0);
      const area = width * height;
      if (area > bestArea) {
        bestArea = area;
        best = { x: x0, y: y0, width, height };
      }
    }

    if (!best || bestArea <= 0) return null;
    return focalFromFaceBox(best, bitmap.width, bitmap.height);
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}
