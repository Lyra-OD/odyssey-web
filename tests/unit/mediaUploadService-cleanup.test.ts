import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT = "11111111-1111-4111-8111-111111111111";

const state = {
  insertError: null as { message: string } | null,
  storageUploads: [] as string[],
  thumbBlob: null as Blob | null,
};

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: async (path: string) => {
          state.storageUploads.push(path);
          return { error: null };
        },
        uploadToSignedUrl: async (path: string) => {
          state.storageUploads.push(path);
          return { error: null };
        },
      }),
    },
    from: () => ({
      upsert: () => ({
        select: () => ({
          maybeSingle: async () =>
            state.insertError
              ? { data: null, error: state.insertError }
              : { data: { id: "asset-1" }, error: null },
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
  generateVideoPosterBlob: async () => null,
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
let signedCounter = 0;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
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
  fetchCalls = [];
  signedCounter = 0;
  registerResponse = async () => json({ ok: true, assetId: "asset-1" });
  discardResponse = async () => json({ ok: true });
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
  it("réponse perdue après register : le client demande le nettoyage, le serveur arbitre", async () => {
    registerResponse = async () => {
      throw new TypeError("Failed to fetch");
    };
    const { items } = await uploadMediaBatch({
      projectId: PROJECT,
      items: [photoItem()],
      uploadStrategy: "signed",
      maxRetries: 0,
    });
    expect(items[0].error).toBe("Failed to fetch");
    expect(discardCalls()).toEqual([[state.storageUploads[0]]]);
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
