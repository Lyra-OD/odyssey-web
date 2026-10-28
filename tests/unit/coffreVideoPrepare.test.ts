import { describe, expect, it } from "vitest";

import {
  prepareCoffreVideoFile,
  splitDropForCoffre,
} from "@/src/lib/media/coffreVideoPrepare";
import { UploadChainCancelledError } from "@/src/lib/uploads/uploadChainGate";

function photo() {
  return new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
}

function video(name = "clip.mov") {
  return new File([new Uint8Array([2])], name, { type: "video/quicktime" });
}

describe("splitDropForCoffre", () => {
  it("laisse passer une photo et un film déjà dans les 10 secondes", () => {
    const still = photo();
    const short = video("court.mov");
    const split = splitDropForCoffre([
      { file: still, durationSec: null },
      { file: short, durationSec: 8 },
    ]);
    expect(split.needsTrim).toEqual([]);
    expect(split.immediate).toEqual([
      { file: still },
      { file: short, trimStartSec: 0 },
    ]);
  });

  it("une durée illisible n’impose pas un extrait à zéro", () => {
    const clip = video("inconnu.mov");
    const split = splitDropForCoffre([{ file: clip, durationSec: null }]);
    expect(split.needsTrim).toEqual([]);
    expect(split.immediate).toEqual([{ file: clip }]);
  });

  it("un film plus long que 10 secondes attend le choix, sans extrait silencieux", () => {
    const long = video("long.mov");
    const split = splitDropForCoffre([{ file: long, durationSec: 12.4 }]);
    expect(split.immediate).toEqual([]);
    expect(split.needsTrim).toEqual([{ file: long, durationSec: 12.4 }]);
  });
});

describe("prepareCoffreVideoFile", () => {
  it("renvoie le fichier préparé, pas la source", async () => {
    const source = video();
    const prepared = new File([new Uint8Array([9])], "prepared.mp4", {
      type: "video/mp4",
    });
    const file = await prepareCoffreVideoFile({
      source,
      trimStartSec: 3,
      prepare: async (blob, options) => {
        expect(blob).toBe(source);
        expect(options?.trimStartSec).toBe(3);
        expect(options?.explicitTrimStart).toBe(true);
        return {
          ok: true,
          preparedFile: prepared,
          path: "webcodecs",
          sourceDurationSec: 12,
          effectiveDurationSec: 9.9,
          orientedWidth: 100,
          orientedHeight: 100,
          reusedOriginal: false,
          audioPreserved: true,
        };
      },
    });
    expect(file).toBe(prepared);
  });

  it("un échec ne renvoie pas l’original", async () => {
    const source = video();
    await expect(
      prepareCoffreVideoFile({
        source,
        prepare: async () => ({ ok: false, error: "video_encode_failed" }),
      }),
    ).rejects.toThrow("video_encode_failed");
  });

  it("une annulation ne devient pas un fichier à envoyer", async () => {
    await expect(
      prepareCoffreVideoFile({
        source: video(),
        prepare: async () => ({ ok: false, error: "video_prepare_cancelled" }),
      }),
    ).rejects.toBeInstanceOf(UploadChainCancelledError);
  });

  it("refuse une durée effective au-dessus de 10 secondes, même si le fichier est l’original", async () => {
    const source = video();
    await expect(
      prepareCoffreVideoFile({
        source,
        trimStartSec: 0,
        prepare: async () => ({
          ok: true,
          preparedFile: source,
          path: "fast",
          sourceDurationSec: 12,
          effectiveDurationSec: 10.4,
          orientedWidth: 100,
          orientedHeight: 100,
          reusedOriginal: true,
          audioPreserved: true,
        }),
      }),
    ).rejects.toThrow("video_output_duration_exceeds_limit");
  });

  it("refuse une sortie muette quand le contrat audio n’est pas tenu", async () => {
    const prepared = new File([new Uint8Array([9])], "prepared.mp4", {
      type: "video/mp4",
    });
    await expect(
      prepareCoffreVideoFile({
        source: video(),
        trimStartSec: 0,
        prepare: async () => ({
          ok: true,
          preparedFile: prepared,
          path: "webcodecs",
          sourceDurationSec: 8,
          effectiveDurationSec: 8,
          orientedWidth: 100,
          orientedHeight: 100,
          reusedOriginal: false,
          audioPreserved: false,
        }),
      }),
    ).rejects.toThrow("video_encode_failed");
  });

  it("refuse un succès sans fichier", async () => {
    await expect(
      prepareCoffreVideoFile({
        source: video(),
        trimStartSec: 0,
        prepare: async () =>
          ({
            ok: true,
            preparedFile: undefined,
            effectiveDurationSec: 5,
            audioPreserved: true,
          }) as never,
      }),
    ).rejects.toThrow("video_encode_failed");
  });
});
