import { describe, expect, it } from "vitest";

import {
  UPLOAD_CHAIN_CANCELLED,
  UploadChainCancelledError,
  assertUploadChainOpen,
  classifyDatabaseCommitFailure,
  databaseGateDecision,
  runPrepareStep,
  storageGateDecision,
} from "@/src/lib/uploads/uploadChainGate";

describe("uploadChainGate", () => {
  it("une file ouverte laisse passer, une file annulée bloque l’étape nommée", () => {
    const open = new AbortController();
    expect(() => assertUploadChainOpen(open.signal, "storage")).not.toThrow();

    const closed = new AbortController();
    closed.abort();
    expect(() => assertUploadChainOpen(closed.signal, "database")).toThrow(
      UploadChainCancelledError,
    );
    try {
      assertUploadChainOpen(closed.signal, "database");
    } catch (error) {
      expect(error).toMatchObject({
        step: "database",
        message: UPLOAD_CHAIN_CANCELLED,
      });
    }
  });

  it("Storage déjà écrit et annulation : discard, la base ne démarre pas", () => {
    const closed = new AbortController();
    closed.abort();
    expect(storageGateDecision(closed.signal)).toBe("discard");
    expect(storageGateDecision(undefined)).toBe("continue");
  });

  it("base déjà OK : on garde la ligne, même si l’annulation est tombée pendant l’attente", () => {
    const closed = new AbortController();
    closed.abort();
    expect(databaseGateDecision(closed.signal)).toEqual({
      status: "uploaded",
      discardStorage: false,
      reason: "committed_during_abort",
    });
    expect(databaseGateDecision(undefined).reason).toBe("committed");
  });

  it("sans prepare, le fichier de la file est celui qui partira, pas l’original", async () => {
    const current = new File([new Uint8Array([1])], "prepared.mp4", {
      type: "video/mp4",
    });
    const original = new File([new Uint8Array([2])], "clip.mov", {
      type: "video/quicktime",
    });
    const file = await runPrepareStep({ file: current, originalFile: original });
    expect(file).toBe(current);
  });

  it("prepare annulé après coup : on ne renvoie pas le fichier vers Storage", async () => {
    const original = new File([new Uint8Array([2])], "clip.mov", {
      type: "video/quicktime",
    });
    const prepared = new File([new Uint8Array([1])], "prepared.mp4", {
      type: "video/mp4",
    });
    const controller = new AbortController();
    await expect(
      runPrepareStep({
        file: prepared,
        originalFile: original,
        signal: controller.signal,
        prepare: async (source) => {
          expect(source).toBe(original);
          controller.abort();
          return prepared;
        },
      }),
    ).rejects.toBeInstanceOf(UploadChainCancelledError);
  });

  it("prepare déjà annulé : la fonction prepare n’est pas appelée", async () => {
    const controller = new AbortController();
    controller.abort();
    let called = false;
    await expect(
      runPrepareStep({
        file: new File([new Uint8Array([1])], "a.mp4", { type: "video/mp4" }),
        signal: controller.signal,
        prepare: async () => {
          called = true;
          return new File([], "x.mp4");
        },
      }),
    ).rejects.toBeInstanceOf(UploadChainCancelledError);
    expect(called).toBe(false);
  });

  it("distingue un échec base certain d’un résultat réseau incertain", () => {
    expect(classifyDatabaseCommitFailure(new Error("media_register_failed"))).toBe(
      "certain",
    );
    expect(
      classifyDatabaseCommitFailure(new Error("media_assets upsert failed: boom")),
    ).toBe("certain");
    expect(classifyDatabaseCommitFailure(new TypeError("Failed to fetch"))).toBe(
      "uncertain",
    );
    expect(classifyDatabaseCommitFailure(new Error("Load failed"))).toBe(
      "uncertain",
    );
  });
});
