import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveWizardCraftAccess = vi.fn();
const discardUnreferencedStorageObjects = vi.fn();

vi.mock("@/src/lib/api/projectAccess", () => ({
  resolveWizardCraftAccess: (id: string) => resolveWizardCraftAccess(id),
}));
vi.mock("@/utils/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({}),
}));
vi.mock("@/src/lib/uploads/discardStorageObjects", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/src/lib/uploads/discardStorageObjects")>();
  return {
    ...actual,
    discardUnreferencedStorageObjects: (p: unknown) =>
      discardUnreferencedStorageObjects(p),
  };
});

const { POST } = await import("@/app/api/projects/[id]/media/discard/route");

const PROJECT = "11111111-1111-4111-8111-111111111111";
const ORIGINAL = `projects/${PROJECT}/2026/10/27/0-photo-abc.jpg`;

function call(body: unknown) {
  return POST(
    new Request("http://test/api", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: { id: PROJECT } },
  );
}

beforeEach(() => {
  resolveWizardCraftAccess.mockReset();
  discardUnreferencedStorageObjects.mockReset();
  discardUnreferencedStorageObjects.mockResolvedValue({
    removed: [],
    skippedReferenced: [],
    rejected: [],
    failed: false,
  });
});

describe("POST /api/projects/[id]/media/discard", () => {
  it("refuse sans accès craft (ni Titulaire ni Co-Créateur)", async () => {
    resolveWizardCraftAccess.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    });
    const res = await call({ storagePaths: [ORIGINAL] });
    expect(res.status).toBe(401);
    expect(discardUnreferencedStorageObjects).not.toHaveBeenCalled();
  });

  it.each(["owner", "editor"])("accepte le rôle %s", async (role) => {
    resolveWizardCraftAccess.mockResolvedValue({ ok: true, role });
    const res = await call({ storagePaths: [ORIGINAL] });
    expect(res.status).toBe(200);
    expect(discardUnreferencedStorageObjects).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: PROJECT, storagePaths: [ORIGINAL] }),
    );
  });

  it("refuse un chemin hors du projet autorisé", async () => {
    resolveWizardCraftAccess.mockResolvedValue({ ok: true, role: "owner" });
    const res = await call({
      storagePaths: ["projects/22222222-2222-4222-8222-222222222222/a.jpg"],
    });
    expect(res.status).toBe(400);
    expect(discardUnreferencedStorageObjects).not.toHaveBeenCalled();
  });

  it("refuse une miniature passée directement", async () => {
    resolveWizardCraftAccess.mockResolvedValue({ ok: true, role: "owner" });
    const res = await call({
      storagePaths: [`projects/${PROJECT}/2026/10/27/0-photo-abc-thumb.webp`],
    });
    expect(res.status).toBe(400);
  });

  it("refuse plus de 2 chemins", async () => {
    resolveWizardCraftAccess.mockResolvedValue({ ok: true, role: "owner" });
    const res = await call({ storagePaths: [ORIGINAL, ORIGINAL, ORIGINAL] });
    expect(res.status).toBe(400);
  });
});
