import { afterEach, describe, expect, it, vi } from "vitest";

import {
  discardUnreferencedStorageObjects,
  isDiscardableOriginalPath,
  normalizeStoragePaths,
} from "@/src/lib/uploads/discardStorageObjects";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ORIGINAL = `projects/${PROJECT}/2026/10/27/0-photo-abc.jpg`;
const ORIGINAL_THUMB = `projects/${PROJECT}/2026/10/27/0-photo-abc-thumb.webp`;

type FakeOptions = {
  referenced?: string[];
  lookupError?: string;
  removeError?: string;
  removeThrows?: boolean;
};

function fakeAdmin(opts: FakeOptions = {}) {
  const remove = vi.fn(async () => {
    if (opts.removeThrows) throw new Error("network down");
    return {
      data: [],
      error: opts.removeError ? { message: opts.removeError } : null,
    };
  });
  const inFilter = vi.fn(async (_col: string, values: string[]) => ({
    data: opts.lookupError
      ? null
      : values
          .filter((v) => opts.referenced?.includes(v))
          .map((storage_path) => ({ storage_path })),
    error: opts.lookupError ? { message: opts.lookupError } : null,
  }));
  const eq = vi.fn(() => ({ in: inFilter }));
  const select = vi.fn(() => ({ eq }));
  const admin = {
    from: vi.fn(() => ({ select })),
    storage: { from: vi.fn(() => ({ remove })) },
  };
  return { admin: admin as never, remove, eq, inFilter };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeStoragePaths", () => {
  it("filtre vides/null et déduplique", () => {
    expect(
      normalizeStoragePaths([ORIGINAL, null, undefined, "", "  ", ORIGINAL]),
    ).toEqual([ORIGINAL]);
  });
});

describe("isDiscardableOriginalPath", () => {
  it("refuse hors projet, traversée et miniature en entrée", () => {
    expect(isDiscardableOriginalPath(PROJECT, ORIGINAL)).toBe(true);
    expect(
      isDiscardableOriginalPath(PROJECT, `projects/${OTHER}/2026/a.jpg`),
    ).toBe(false);
    expect(
      isDiscardableOriginalPath(PROJECT, `projects/${PROJECT}/../${OTHER}/a.jpg`),
    ).toBe(false);
    expect(isDiscardableOriginalPath(PROJECT, `projects/${PROJECT}/`)).toBe(
      false,
    );
    expect(isDiscardableOriginalPath(PROJECT, ORIGINAL_THUMB)).toBe(false);
  });
});

describe("discardUnreferencedStorageObjects", () => {
  it("supprime l'original non référencé et sa miniature dérivée", async () => {
    const { admin, remove, eq } = fakeAdmin();
    const result = await discardUnreferencedStorageObjects({
      admin,
      bucket: "user-assets",
      projectId: PROJECT,
      storagePaths: [ORIGINAL, ORIGINAL],
    });
    expect(eq).toHaveBeenCalledWith("project_id", PROJECT);
    expect(remove).toHaveBeenCalledWith([ORIGINAL, ORIGINAL_THUMB]);
    expect(result.removed).toEqual([ORIGINAL, ORIGINAL_THUMB]);
    expect(result.failed).toBe(false);
  });

  it("ne supprime jamais un chemin référencé (enregistrement ambigu ou quota sur conflit)", async () => {
    const { admin, remove } = fakeAdmin({ referenced: [ORIGINAL] });
    const result = await discardUnreferencedStorageObjects({
      admin,
      bucket: "user-assets",
      projectId: PROJECT,
      storagePaths: [ORIGINAL],
    });
    expect(remove).not.toHaveBeenCalled();
    expect(result.skippedReferenced).toEqual([ORIGINAL]);
  });

  it("ne supprime rien si la lecture des références échoue", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { admin, remove } = fakeAdmin({ lookupError: "db down" });
    const result = await discardUnreferencedStorageObjects({
      admin,
      bucket: "user-assets",
      projectId: PROJECT,
      storagePaths: [ORIGINAL],
    });
    expect(remove).not.toHaveBeenCalled();
    expect(result.failed).toBe(true);
  });

  it("n'appelle rien pour des chemins hors projet", async () => {
    const { admin, remove, inFilter } = fakeAdmin();
    const result = await discardUnreferencedStorageObjects({
      admin,
      bucket: "user-assets",
      projectId: PROJECT,
      storagePaths: [`projects/${OTHER}/a.jpg`, ORIGINAL_THUMB],
    });
    expect(inFilter).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(result.rejected).toHaveLength(2);
  });

  it("journalise sans lever si remove renvoie { error }", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { admin } = fakeAdmin({ removeError: "denied" });
    const result = await discardUnreferencedStorageObjects({
      admin,
      bucket: "user-assets",
      projectId: PROJECT,
      storagePaths: [ORIGINAL],
    });
    expect(result.failed).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it("journalise sans lever si remove rejette", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { admin } = fakeAdmin({ removeThrows: true });
    await expect(
      discardUnreferencedStorageObjects({
        admin,
        bucket: "user-assets",
        projectId: PROJECT,
        storagePaths: [ORIGINAL],
      }),
    ).resolves.toMatchObject({ failed: true });
    expect(warn).toHaveBeenCalled();
  });
});
