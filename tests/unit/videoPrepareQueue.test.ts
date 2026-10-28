import { describe, expect, it } from "vitest";

import type { MediaGridItem } from "@/src/lib/media/mediaTypes";
import {
  beginVideoPrepare,
  failVideoPrepare,
  finishVideoPrepare,
  isQueueVideoFile,
  requeueVideoAfterFailure,
} from "@/src/lib/media/videoPrepareQueue";

function item(partial: Partial<MediaGridItem> & { file: File }): MediaGridItem {
  return {
    id: "1",
    origin: "local",
    status: "queued",
    orderIndex: 0,
    attempts: 0,
    error: null,
    ...partial,
  };
}

describe("videoPrepareQueue", () => {
  it("une vidéo queued passe en preparing et garde l’original", () => {
    const file = new File([new Uint8Array([1])], "clip.mov", {
      type: "video/quicktime",
    });
    const next = beginVideoPrepare(item({ file }));
    expect(next.status).toBe("preparing");
    expect(next.originalFile).toBe(file);
    expect(next.file).toBe(file);
  });

  it("une photo queued n’entre pas en preparing", () => {
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    const source = item({ file });
    expect(beginVideoPrepare(source)).toBe(source);
    expect(isQueueVideoFile(file)).toBe(false);
  });

  it("finish remplace le fichier à envoyer et revient en queued", () => {
    const original = new File([new Uint8Array([1])], "clip.mov", {
      type: "video/quicktime",
    });
    const prepared = new File([new Uint8Array([2, 2])], "prepared.mp4", {
      type: "video/mp4",
    });
    const preparing = beginVideoPrepare(item({ file: original }));
    const done = finishVideoPrepare(preparing, prepared);
    expect(done.status).toBe("queued");
    expect(done.file).toBe(prepared);
    expect(done.originalFile).toBe(original);
    expect(done.mimeType).toBe("video/mp4");
    expect(done.sizeBytes).toBe(2);
  });

  it("échec prepare revient au fichier original", () => {
    const original = new File([new Uint8Array([1, 1])], "clip.mov", {
      type: "video/quicktime",
    });
    const preparing = beginVideoPrepare(item({ file: original }));
    const failed = failVideoPrepare(preparing, "video_encode_failed");
    expect(failed.status).toBe("failed");
    expect(failed.file).toBe(original);
    expect(failed.error).toBe("video_encode_failed");
  });

  it("reprise après échec réutilise originalFile", () => {
    const original = new File([new Uint8Array([1])], "clip.mov", {
      type: "video/quicktime",
    });
    const prepared = new File([new Uint8Array([9])], "prepared.mp4", {
      type: "video/mp4",
    });
    const failed = failVideoPrepare(
      {
        ...beginVideoPrepare(item({ file: original })),
        file: prepared,
      },
      "video_encode_failed",
    );
    const again = requeueVideoAfterFailure(failed);
    expect(again.status).toBe("queued");
    expect(again.file).toBe(original);
    expect(again.error).toBeNull();
  });
});
