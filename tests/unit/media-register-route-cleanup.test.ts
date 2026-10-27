import { beforeEach, describe, expect, it, vi } from "vitest";

const discardUnreferencedStorageObjects = vi.fn();
let upsertError: { message: string } | null = null;

vi.mock("@/src/lib/api/projectAccess", () => ({
  resolveWizardCraftAccess: async () => ({ ok: true, role: "editor" }),
}));
vi.mock("@/utils/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({
    from: (table: string) =>
      table === "projects"
        ? {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: PROJECT, user_id: "owner-1", tenant_id: null },
                  error: null,
                }),
              }),
            }),
          }
        : {
            upsert: () => ({
              select: () => ({
                maybeSingle: async () =>
                  upsertError
                    ? { data: null, error: upsertError }
                    : { data: { id: "asset-1" }, error: null },
              }),
            }),
          },
  }),
}));
vi.mock("@/src/lib/uploads/discardStorageObjects", () => ({
  discardUnreferencedStorageObjects: (p: unknown) =>
    discardUnreferencedStorageObjects(p),
}));

const PROJECT = "11111111-1111-4111-8111-111111111111";
const ORIGINAL = `projects/${PROJECT}/2026/10/27/0-photo-abc.jpg`;

const { POST } = await import("@/app/api/projects/[id]/media/register/route");

function call() {
  return POST(
    new Request("http://test/api", {
      method: "POST",
      body: JSON.stringify({
        storagePath: ORIGINAL,
        mimeType: "image/jpeg",
        sizeBytes: 3,
        orderIndex: 0,
      }),
    }),
    { params: { id: PROJECT } },
  );
}

beforeEach(() => {
  upsertError = null;
  discardUnreferencedStorageObjects.mockReset();
  discardUnreferencedStorageObjects.mockResolvedValue({ failed: false });
});

describe("POST /media/register : nettoyage sur échec", () => {
  it("succès : aucun nettoyage", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(discardUnreferencedStorageObjects).not.toHaveBeenCalled();
  });

  it("quota : nettoyage protégé par le contrôle de référence, code inchangé", async () => {
    upsertError = { message: "media_quota_exceeded: limit reached" };
    const res = await call();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "media_quota_exceeded" });
    expect(discardUnreferencedStorageObjects).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: PROJECT, storagePaths: [ORIGINAL] }),
    );
  });

  it("échec du nettoyage : la réponse reste l'erreur initiale", async () => {
    upsertError = { message: "rls denied" };
    discardUnreferencedStorageObjects.mockResolvedValue({ failed: true });
    const res = await call();
    expect(await res.json()).toEqual({ error: "media_register_failed" });
  });
});
