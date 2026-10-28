import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetVideoEncodeSlotForTests, videoEncodeSlotsInUse } from "@/src/lib/media/videoEncodeSlot";

const PROJECT = "11111111-1111-4111-8111-111111111111";

const state = {
  insertError: null as { message: string } | null,
  storageUploads: [] as string[],
  thumbBlob: null as Blob | null,
  onStorageUpload: null as (() => void) | null,
  onDbWrite: null as (() => void) | null,
  onPoster: null as (() => void) | null,
  insertThrows: null as Error | null,
  uploadedNames: [] as string[],
  prepareCalls: [] as Array<{ name: string; trimStartSec: number }>,
  prepareImpl: null as
    | ((
        source: Blob,
        options?: { trimStartSec?: number; signal?: AbortSignal },
      ) => Promise<unknown>)
    | null,
};

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: async (path: string, file?: { name?: string }) => {
          state.storageUploads.push(path);
          if (file?.name) state.uploadedNames.push(file.name);
          state.onStorageUpload?.();
          return { error: null };
        },
        uploadToSignedUrl: async (
          path: string,
          _token: string,
          file?: { name?: string },
        ) => {
          state.storageUploads.push(path);
          if (file?.name) state.uploadedNames.push(file.name);
          state.onStorageUpload?.();
          return { error: null };
        },
      }),
    },
    from: () => ({
      upsert: () => ({
        select: () => ({
          maybeSingle: async () => {
            state.onDbWrite?.();
            if (state.insertThrows) throw state.insertThrows;
            return state.insertError
              ? { data: null, error: state.insertError }
              : { data: { id: "asset-1" }, error: null };
          },
        }),
      }),
    }),
  }),
}));
vi.mock("@/src/lib/media/resizeImageForUpload", () => ({
  resizeImageForUploadFile: async (file: File) => file,
}));
vi.mock("@/src/lib/media/generateImageThumbnail", () => ({
  generateImageThumbnailBlob: async () => state.thumbBlob,
}));
vi.mock("@/src/lib/media/generateVideoPoster", () => ({
  generateVideoPosterBlob: async () => {
    state.onPoster?.();
    return null;
  },
}));
vi.mock("@/src/lib/media/prepareVideoForUpload", () => ({
  prepareVideoForUpload: async (
    source: Blob,
    options?: { trimStartSec?: number },
  ) => {
    state.prepareCalls.push({
      name: source instanceof File ? source.name : "blob",
      trimStartSec: options?.trimStartSec ?? 0,
    });
    if (state.prepareImpl) return state.prepareImpl(source, options);
    const file =
      source instanceof File
        ? source
        : new File([source], "prepared.mp4", { type: "video/mp4" });
    return {
      ok: true,
      preparedFile: file,
      effectiveDurationSec: 5,
      audioPreserved: true,
    };
  },
}));

const {
  createLocalQueueItem,
  discardUploadedObjectsBestEffort,
  uploadMediaBatch,
  MEDIA_QUOTA_EXCEEDED_ERROR,
} = await import("@/src/lib/uploads/mediaUploadService");
const { thumbStoragePathFor } = await import("@/src/lib/media/thumbnailPath");

type FetchCall = { url: string; body: Record<string, unknown> };
let fetchCalls: FetchCall[] = [];
let registerResponse: () => Promise<Response>;
let discardResponse: () => Promise<Response>;
let reconcileResponse: () => Promise<Response>;
let signedCounter = 0;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function registerCount(): number {
  return fetchCalls.filter((c) => c.url.endsWith("/media/register")).length;
}

function reconcileCount(): number {
  return fetchCalls.filter((c) => c.url.endsWith("/media/reconcile")).length;
}

function discardCalls(): string[][] {
  return fetchCalls
    .filter((c) => c.url.endsWith("/media/discard"))
    .map((c) => c.body.storagePaths as string[]);
}

function photoItem() {
  const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", {
    type: "image/jpeg",
  });
  return createLocalQueueItem(file, 0);
}

beforeEach(() => {
  state.insertError = null;
  state.storageUploads = [];
  state.thumbBlob = null;
  state.onStorageUpload = null;
  state.onDbWrite = null;
  state.onPoster = null;
  state.insertThrows = null;
  state.uploadedNames = [];
  state.prepareCalls = [];
  state.prepareImpl = null;
  resetVideoEncodeSlotForTests();
  fetchCalls = [];
  signedCounter = 0;
  registerResponse = async () => {
    state.onDbWrite?.();
    return json({ ok: true, assetId: "asset-1" });
  };
  discardResponse = async () => json({ ok: true });
  reconcileResponse = async () => json({ status: "absent" });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      fetchCalls.push({ url, body });
      if (url.endsWith("/media/upload-url")) {
        signedCounter += 1;
        const path =
          body.kind === "thumb"
            ? thumbStoragePathFor(body.baseStoragePath)
            : `projects/${PROJECT}/2026/10/27/0-photo-${signedCounter}.jpg`;
        return json({ ok: true, path, token: "t" });
      }
      if (url.endsWith("/media/register")) return registerResponse();
      if (url.endsWith("/media/reconcile")) return reconcileResponse();
      if (url.endsWith("/media/discard")) return discardResponse();
      return json({}, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("discardUploadedObjectsBestEffort", () => {
  it("n'appelle pas la route pour une liste vide", async () => {
    await discardUploadedObjectsBestEffort(PROJECT, [null, undefined, ""]);
    expect(fetchCalls).toHaveLength(0);
  });

  it("déduplique et ne lève jamais (réponse en erreur ou réseau coupé)", async () => {
    discardResponse = async () => json({ error: "discard_failed" }, 500);
    await expect(
      discardUploadedObjectsBestEffort(PROJECT, ["a", "a"]),
    ).resolves.toBeUndefined();
    expect(discardCalls()).toEqual([["a"]]);

    discardResponse = async () => {
      throw new TypeError("Failed to fetch");
    };
    await expect(
      discardUploadedObjectsBestEffort(PROJECT, ["b"]),
    ).resolves.toBeUndefined();
  });
});

describe.each(["direct", "signed"] as const)("flux %s", (uploadStrategy) => {
  function failRegistration(message: string) {
    if (uploadStrategy === "direct") {
      state.insertError = { message };
    } else {
      registerResponse = async () =>
        json(
          {
            error: message.includes(MEDIA_QUOTA_EXCEEDED_ERROR)
              ? MEDIA_QUOTA_EXCEEDED_ERROR
              : "media_register_failed",
          },
          400,
        );
    }
  }

  it("succès : aucun nettoyage", async () => {
    state.thumbBlob = new Blob([new Uint8Array([9])], { type: "image/webp" });
    const { items } = await uploadMediaBatch({
      projectId: PROJECT,
      items: [photoItem()],
      uploadStrategy,
      maxRetries: 0,
    });
    expect(items[0].status).toBe("uploaded");
    expect(discardCalls()).toHaveLength(0);
  });

  it("quota : nettoie l'original envoyé et propage l'erreur initiale exacte", async () => {
    state.thumbBlob = new Blob([new Uint8Array([9])], { type: "image/webp" });
    failRegistration(`ERROR: ${MEDIA_QUOTA_EXCEEDED_ERROR}`);
    const { items } = await uploadMediaBatch({
      projectId: PROJECT,
      items: [photoItem()],
      uploadStrategy,
      maxRetries: 2,
    });

    expect(items[0].status).toBe("failed");
    expect(items[0].error).toBe(MEDIA_QUOTA_EXCEEDED_ERROR);

    const original = state.storageUploads[0];
    expect(state.storageUploads).toEqual([
      original,
      thumbStoragePathFor(original),
    ]);
    expect(discardCalls()).toEqual([[original]]);
  });

  it("échec du nettoyage : l'erreur initiale reste celle propagée", async () => {
    failRegistration(`ERROR: ${MEDIA_QUOTA_EXCEEDED_ERROR}`);
    discardResponse = async () => {
      throw new TypeError("Failed to fetch");
    };
    const { items } = await uploadMediaBatch({
      projectId: PROJECT,
      items: [photoItem()],
      uploadStrategy,
      maxRetries: 0,
    });
    expect(items[0].error).toBe(MEDIA_QUOTA_EXCEEDED_ERROR);
  });

  it("retries : un nettoyage par tentative ratée, chacun sur son propre chemin", async () => {
    failRegistration("boom");
    const { items } = await uploadMediaBatch({
      projectId: PROJECT,
      items: [photoItem()],
      uploadStrategy,
      maxRetries: 1,
    });
    expect(items[0].status).toBe("failed");
    const calls = discardCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).not.toBe(calls[1][0]);
    expect(calls.map((c) => c[0])).toEqual(state.storageUploads);
  });
});

describe("flux signed : enregistrement ambigu", () => {
  it("réponse perdue : réconcilie avant discard, et ne retente pas avant", async () => {
    registerResponse = async () => {
      throw new TypeError("Failed to fetch");
    };
    reconcileResponse = async () => {
      expect(discardCalls()).toHaveLength(0);
      expect(registerCount()).toBe(1);
      return json({ status: "absent" });
    };
    const { items } = await uploadMediaBatch({
      projectId: PROJECT,
      items: [photoItem()],
      uploadStrategy: "signed",
      maxRetries: 0,
    });
    expect(items[0].status).toBe("failed");
    expect(items[0].error).toBe("Failed to fetch");
    expect(registerCount()).toBe(1);
    expect(reconcileCount()).toBe(1);
    expect(discardCalls()).toEqual([[state.storageUploads[0]]]);
    expect(state.storageUploads).toHaveLength(1);
  });
});

describe("échec avant tout upload Storage", () => {
  it("URL signée refusée : rien à nettoyer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        fetchCalls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
        return json({ error: "signed_url_failed" }, 400);
      }),
    );
    const { items } = await uploadMediaBatch({
      projectId: PROJECT,
      items: [photoItem()],
      uploadStrategy: "signed",
      maxRetries: 0,
    });
    expect(items[0].error).toBe("signed_url_failed");
    expect(discardCalls()).toHaveLength(0);
  });
});

describe.each(["direct", "signed"] as const)(
  "annulation de chaîne (%s)",
  (uploadStrategy) => {
    function videoItem() {
      const file = new File([new Uint8Array([1])], "clip.mov", {
        type: "video/quicktime",
      });
      return createLocalQueueItem(file, 0);
    }

    it("déjà annulé : Storage et la base ne démarrent pas", async () => {
      const controller = new AbortController();
      controller.abort();
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [photoItem()],
        uploadStrategy,
        maxRetries: 2,
        signal: controller.signal,
      });
      expect(items[0].status).toBe("cancelled");
      expect(state.storageUploads).toEqual([]);
      expect(discardCalls()).toHaveLength(0);
      expect(fetchCalls.some((c) => c.url.endsWith("/media/register"))).toBe(
        false,
      );
    });

    it("Storage répondu puis annulation : discard, pas de base, pas de retry", async () => {
      const controller = new AbortController();
      state.onStorageUpload = () => controller.abort();
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [photoItem()],
        uploadStrategy,
        maxRetries: 2,
        signal: controller.signal,
      });
      expect(items[0].status).toBe("cancelled");
      expect(items[0].error).toBe("upload_chain_cancelled");
      expect(state.storageUploads).toHaveLength(1);
      expect(discardCalls()).toEqual([[state.storageUploads[0]]]);
      expect(fetchCalls.some((c) => c.url.endsWith("/media/register"))).toBe(
        false,
      );
    });

    it("annulation pendant le poster : l’objet Storage est jeté, la base ne s’ouvre pas", async () => {
      const controller = new AbortController();
      state.onPoster = () => controller.abort();
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [videoItem()],
        uploadStrategy,
        maxRetries: 2,
        signal: controller.signal,
      });
      expect(items[0].status).toBe("cancelled");
      expect(state.storageUploads).toHaveLength(1);
      expect(discardCalls()).toEqual([[state.storageUploads[0]]]);
      expect(fetchCalls.some((c) => c.url.endsWith("/media/register"))).toBe(
        false,
      );
    });

    it("annulation pendant l’écriture base : la ligne reste, pas de discard", async () => {
      const controller = new AbortController();
      state.onDbWrite = () => controller.abort();
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [photoItem()],
        uploadStrategy,
        maxRetries: 2,
        signal: controller.signal,
      });
      expect(items[0].status).toBe("uploaded");
      expect(items[0].assetId).toBe("asset-1");
      expect(discardCalls()).toHaveLength(0);
      expect(state.storageUploads).toHaveLength(1);
      if (uploadStrategy === "signed") expect(registerCount()).toBe(1);
      expect(reconcileCount()).toBe(0);
    });

    it("annulation pendant un POST qui aboutit quand même : une ligne, objet conservé", async () => {
      const controller = new AbortController();
      if (uploadStrategy === "signed") {
        registerResponse = async () => {
          controller.abort();
          return json({ ok: true, assetId: "asset-1" });
        };
      } else {
        state.onDbWrite = () => controller.abort();
      }
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [photoItem()],
        uploadStrategy,
        maxRetries: 2,
        signal: controller.signal,
      });
      expect(items[0].status).toBe("uploaded");
      expect(items[0].assetId).toBe("asset-1");
      expect(items[0].error).toBeNull();
      expect(discardCalls()).toHaveLength(0);
      expect(state.storageUploads).toHaveLength(1);
      if (uploadStrategy === "signed") expect(registerCount()).toBe(1);
    });

    it("POST incertain : pas de discard ni de second essai avant une réconciliation inconnue", async () => {
      const controller = new AbortController();
      reconcileResponse = async () => {
        expect(discardCalls()).toHaveLength(0);
        if (uploadStrategy === "signed") expect(registerCount()).toBe(1);
        expect(state.storageUploads).toHaveLength(1);
        return json({ error: "reconcile_failed" }, 500);
      };
      if (uploadStrategy === "signed") {
        registerResponse = async () => {
          controller.abort();
          throw new TypeError("Failed to fetch");
        };
      } else {
        state.insertThrows = new TypeError("Failed to fetch");
        state.onDbWrite = () => controller.abort();
      }
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [photoItem()],
        uploadStrategy,
        maxRetries: 2,
        signal: controller.signal,
      });
      expect(items[0].status).toBe("cancelled");
      expect(items[0].error).toBe("upload_commit_uncertain");
      expect(discardCalls()).toHaveLength(0);
      expect(state.storageUploads).toHaveLength(1);
      expect(reconcileCount()).toBe(1);
      if (uploadStrategy === "signed") expect(registerCount()).toBe(1);
    });

    it("échec certain du POST après annulation : discard, pas de retry", async () => {
      const controller = new AbortController();
      if (uploadStrategy === "signed") {
        registerResponse = async () => {
          controller.abort();
          return json({ error: "media_register_failed" }, 400);
        };
      } else {
        state.insertError = { message: "media_assets upsert failed: boom" };
        state.onDbWrite = () => controller.abort();
      }
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [photoItem()],
        uploadStrategy,
        maxRetries: 2,
        signal: controller.signal,
      });
      expect(items[0].status).toBe("cancelled");
      expect(discardCalls()).toHaveLength(1);
      expect(state.storageUploads).toHaveLength(1);
      expect(reconcileCount()).toBe(0);
      if (uploadStrategy === "signed") expect(registerCount()).toBe(1);
    });
  },
);

describe.each(["direct", "signed"] as const)(
  "préparation vidéo Coffre (%s)",
  (uploadStrategy) => {
    function clip() {
      const original = new File([new Uint8Array([2])], "clip.mov", {
        type: "video/quicktime",
      });
      const item = createLocalQueueItem(original, 0);
      item.originalFile = original;
      item.trimStartSec = 4;
      return item;
    }

    it("envoie le fichier préparé, jamais l’original", async () => {
      const prepared = new File([new Uint8Array([9])], "prepared.mp4", {
        type: "video/mp4",
      });
      state.prepareImpl = async (source) => {
        expect(source).toBeInstanceOf(File);
        expect((source as File).name).toBe("clip.mov");
        return {
          ok: true,
          preparedFile: prepared,
          effectiveDurationSec: 9.5,
          audioPreserved: true,
        };
      };
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [clip()],
        uploadStrategy,
        maxRetries: 2,
      });
      expect(items[0].status).toBe("uploaded");
      expect(items[0].file?.name).toBe("prepared.mp4");
      expect(items[0].originalFile?.name).toBe("clip.mov");
      expect(state.uploadedNames).toContain("prepared.mp4");
      expect(state.uploadedNames).not.toContain("clip.mov");
      expect(state.prepareCalls).toEqual([{ name: "clip.mov", trimStartSec: 4 }]);
      expect(discardCalls()).toHaveLength(0);
    });

    it("échec de préparation : pas de Storage, pas de retry", async () => {
      state.prepareImpl = async () => ({ ok: false, error: "video_encode_failed" });
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [clip()],
        uploadStrategy,
        maxRetries: 2,
      });
      expect(items[0].status).toBe("failed");
      expect(items[0].error).toBe("video_encode_failed");
      expect(items[0].originalFile?.name).toBe("clip.mov");
      expect(state.storageUploads).toEqual([]);
      expect(state.prepareCalls).toHaveLength(1);
      expect(discardCalls()).toHaveLength(0);
    });

    it("annulation pendant la préparation : pas de Storage", async () => {
      state.prepareImpl = async () => ({
        ok: false,
        error: "video_prepare_cancelled",
      });
      const { items } = await uploadMediaBatch({
        projectId: PROJECT,
        items: [clip()],
        uploadStrategy,
        maxRetries: 2,
      });
      expect(items[0].status).toBe("cancelled");
      expect(state.storageUploads).toEqual([]);
      expect(state.prepareCalls).toHaveLength(1);
      expect(discardCalls()).toHaveLength(0);
    });

    it.each([
      ["échec", { ok: false, error: "video_encode_failed" }, "failed"],
      ["annulation", { ok: false, error: "video_prepare_cancelled" }, "cancelled"],
      [
        "durée effective trop longue",
        {
          ok: true,
          preparedFile: new File([new Uint8Array([3])], "clip.mov", {
            type: "video/quicktime",
          }),
          effectiveDurationSec: 10.4,
          audioPreserved: true,
        },
        "failed",
      ],
      [
        "audio perdu",
        {
          ok: true,
          preparedFile: new File([new Uint8Array([4])], "prepared.mp4", {
            type: "video/mp4",
          }),
          effectiveDurationSec: 8,
          audioPreserved: false,
        },
        "failed",
      ],
      [
        "fichier absent",
        {
          ok: true,
          preparedFile: undefined,
          effectiveDurationSec: 5,
          audioPreserved: true,
        },
        "failed",
      ],
    ] as const)(
      "%s : ni l’original ni un fichier invalide ne part au Storage",
      async (_label, payload, status) => {
        state.prepareImpl = async () => payload as never;
        const { items } = await uploadMediaBatch({
          projectId: PROJECT,
          items: [clip()],
          uploadStrategy,
          maxRetries: 2,
        });
        expect(items[0].status).toBe(status);
        expect(items[0].status).not.toBe("queued");
        expect(items[0].status).not.toBe("uploaded");
        expect(state.storageUploads).toEqual([]);
        expect(state.uploadedNames).not.toContain("clip.mov");
        expect(state.prepareCalls).toHaveLength(1);
        expect(discardCalls()).toHaveLength(0);
        if (uploadStrategy === "signed") expect(registerCount()).toBe(0);
      },
    );

    it("un résultat tardif après annulation ne part pas au Storage et libère le créneau seulement à la fin", async () => {
      const controller = new AbortController();
      let release: ((value: unknown) => void) | undefined;
      state.prepareImpl = () =>
        new Promise((resolve) => {
          release = resolve;
        });
      const pending = uploadMediaBatch({
        projectId: PROJECT,
        items: [clip()],
        uploadStrategy,
        maxRetries: 2,
        signal: controller.signal,
      });
      await vi.waitUntil(() => videoEncodeSlotsInUse() === 1);
      controller.abort();
      await Promise.resolve();
      expect(videoEncodeSlotsInUse()).toBe(1);
      expect(state.storageUploads).toEqual([]);

      release?.({
        ok: true,
        preparedFile: new File([new Uint8Array([9])], "prepared.mp4", {
          type: "video/mp4",
        }),
        effectiveDurationSec: 9,
        audioPreserved: true,
      });
      const { items } = await pending;
      expect(items[0].status).toBe("cancelled");
      expect(items[0].status).not.toBe("queued");
      expect(state.storageUploads).toEqual([]);
      expect(state.uploadedNames).not.toContain("prepared.mp4");
      expect(state.uploadedNames).not.toContain("clip.mov");
      expect(videoEncodeSlotsInUse()).toBe(0);
      if (uploadStrategy === "signed") expect(registerCount()).toBe(0);
    });
  },
);

describe("photo", () => {
  it("ne passe pas par la préparation vidéo", async () => {
    const { items } = await uploadMediaBatch({
      projectId: PROJECT,
      items: [photoItem()],
      uploadStrategy: "direct",
      maxRetries: 0,
    });
    expect(items[0].status).toBe("uploaded");
    expect(state.prepareCalls).toEqual([]);
  });
});
