/**
 * C5 — précalcul focale image (client).
 * 1) Shape Detection `FaceDetector` si dispo (flag Chrome / certains OS)
 * 2) sinon BlazeFace (tfjs) en lazy import — marche Chrome/Safari desktop.
 */

export type DetectedFocalPoint = {
  /** 0..1 depuis le bord gauche. */
  x: number;
  /** 0..1 depuis le bord haut. */
  y: number;
};

export type DetectImageFocalResult = {
  point: DetectedFocalPoint | null;
  /** `faceDetector` | `blazeface` | `unavailable` | `skipped` */
  engine: "faceDetector" | "blazeface" | "unavailable" | "skipped";
};

export function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Centroïde visage, biais léger vers les yeux (35 % de la hauteur du box).
 * Pur / testable sans DOM.
 */
export function focalFromFaceBox(
  box: FaceBox,
  imageWidth: number,
  imageHeight: number,
): DetectedFocalPoint {
  const w = Math.max(1, imageWidth);
  const h = Math.max(1, imageHeight);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.35;
  return {
    x: clampUnit(cx / w),
    y: clampUnit(cy / h),
  };
}

const MAX_FOCAL_DETECT_BYTES = 12 * 1024 * 1024;

type FaceDetectorLike = {
  detect: (
    image: ImageBitmap,
  ) => Promise<Array<{ boundingBox: FaceBox }>>;
};

function getFaceDetectorCtor():
  | (new (options?: {
      fastMode?: boolean;
      maxDetectedFaces?: number;
    }) => FaceDetectorLike)
  | null {
  if (typeof window === "undefined") return null;
  const ctor = (
    window as unknown as {
      FaceDetector?: new (options?: {
        fastMode?: boolean;
        maxDetectedFaces?: number;
      }) => FaceDetectorLike;
    }
  ).FaceDetector;
  return typeof ctor === "function" ? ctor : null;
}

async function detectWithFaceDetector(
  blob: Blob,
): Promise<DetectedFocalPoint | null> {
  const FaceDetectorCtor = getFaceDetectorCtor();
  if (!FaceDetectorCtor) return null;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
    const detector = new FaceDetectorCtor({
      fastMode: true,
      maxDetectedFaces: 3,
    });
    const faces = await detector.detect(bitmap);
    if (!faces?.length) return null;

    let best = faces[0]!;
    let bestArea = best.boundingBox.width * best.boundingBox.height;
    for (let i = 1; i < faces.length; i += 1) {
      const face = faces[i]!;
      const area = face.boundingBox.width * face.boundingBox.height;
      if (area > bestArea) {
        best = face;
        bestArea = area;
      }
    }

    return focalFromFaceBox(
      best.boundingBox,
      bitmap.width,
      bitmap.height,
    );
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

function shouldSkipBlob(blob: Blob): boolean {
  const mime = (blob.type || "").toLowerCase();
  if (!mime.startsWith("image/")) return true;
  if (mime.includes("heic") || mime.includes("heif")) return true;
  if (blob.size <= 0 || blob.size > MAX_FOCAL_DETECT_BYTES) return true;
  return false;
}

/**
 * Détecte une focale sur un blob image (FaceDetector → BlazeFace).
 */
export async function detectImageFocalDetailed(
  blob: Blob,
): Promise<DetectImageFocalResult> {
  if (shouldSkipBlob(blob)) {
    return { point: null, engine: "skipped" };
  }

  if (getFaceDetectorCtor()) {
    const native = await detectWithFaceDetector(blob);
    if (native) return { point: native, engine: "faceDetector" };
  }

  try {
    const { detectImageFocalWithBlazeFace } = await import(
      "@/src/lib/media/detectImageFocalBlaze"
    );
    const blaze = await detectImageFocalWithBlazeFace(blob);
    return {
      point: blaze,
      engine: blaze ? "blazeface" : "blazeface",
    };
  } catch {
    return { point: null, engine: "unavailable" };
  }
}

/** Compat — point seul. */
export async function detectImageFocalFromBlob(
  blob: Blob,
): Promise<DetectedFocalPoint | null> {
  const { point } = await detectImageFocalDetailed(blob);
  return point;
}
