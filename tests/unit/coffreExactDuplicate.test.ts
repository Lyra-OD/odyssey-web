import { describe, expect, it, vi } from "vitest";

import {
  contentSha256ForRow,
  decideExactDuplicate,
  hashFileSha256,
  parseContentHashLookup,
  reviewCoffreDrop,
} from "@/src/lib/media/coffreExactDuplicate";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function video(name = "clip.mov") {
  return new File([new Uint8Array([1, 2, 3])], name, {
    type: "video/quicktime",
  });
}

function photo(name = "photo.jpg") {
  return new File([new Uint8Array([4, 5])], name, { type: "image/jpeg" });
}

describe("empreinte exacte du Coffre", () => {
  it("calcule un SHA-256 hex du fichier", async () => {
    const sha = await hashFileSha256(new Blob([new Uint8Array([1, 2, 3])]));
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashFileSha256(new Blob([new Uint8Array([1, 2, 3])]))).toBe(
      sha,
    );
    expect(await hashFileSha256(new Blob([new Uint8Array([1, 2, 4])]))).not.toBe(
      sha,
    );
  });

  it("refuse une empreinte qui n’est pas 64 hex", () => {
    expect(contentSha256ForRow("ABC")).toBeNull();
    expect(contentSha256ForRow(SHA_A.toUpperCase())).toBe(SHA_A);
  });

  it("une erreur serveur n’est pas une absence", () => {
    expect(parseContentHashLookup(false, { status: "absent" })).toBe("unknown");
    expect(parseContentHashLookup(true, null)).toBe("unknown");
    expect(parseContentHashLookup(true, { status: "maybe" })).toBe("unknown");
    expect(parseContentHashLookup(true, { status: "absent" })).toBe("absent");
    expect(parseContentHashLookup(true, { status: "present" })).toBe("present");
  });

  it("la file est consultée avant le serveur", () => {
    const lookup = vi.fn();
    const decision = decideExactDuplicate({
      sha256: SHA_A,
      inQueue: true,
      server: "absent",
    });
    expect(decision).toEqual({ action: "ask", reason: "duplicate" });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("Ne pas ajouter : aucun fichier à préparer", async () => {
    const lookup = vi.fn(async () => "present" as const);
    const accepted = await reviewCoffreDrop({
      files: [video(), photo()],
      queueHashes: new Set(),
      lookup,
      hashFile: async () => SHA_A,
      choose: async () => "skip",
    });
    expect(accepted).toEqual([]);
    expect(lookup).toHaveBeenCalled();
  });

  it("Ajouter quand même conserve deux copies et prépare ensuite", async () => {
    const lookup = vi.fn(async () => "absent" as const);
    const choices: string[] = [];
    const accepted = await reviewCoffreDrop({
      files: [video("a.mov"), video("a-copy.mov")],
      queueHashes: new Set(),
      lookup,
      hashFile: async () => SHA_A,
      choose: async (input) => {
        choices.push(input.kind);
        return "keep";
      },
    });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(choices).toEqual(["video"]);
    expect(accepted).toHaveLength(2);
    expect(accepted.every((entry) => entry.contentSha256 === SHA_A)).toBe(true);
  });

  it("un souvenir déjà en base demande un choix, un nom identique avec une autre empreinte non", async () => {
    const sameNameOtherBytes = new File([new Uint8Array([9, 9, 9])], "same.jpg", {
      type: "image/jpeg",
    });
    const lookup = vi.fn(async (sha: string) =>
      sha === SHA_A ? ("present" as const) : ("absent" as const),
    );
    const asked: string[] = [];
    const accepted = await reviewCoffreDrop({
      files: [photo("same.jpg"), sameNameOtherBytes],
      queueHashes: new Set(),
      lookup,
      hashFile: async (file) => (file.size === 2 ? SHA_A : SHA_B),
      choose: async (input) => {
        asked.push(`${input.kind}:${input.reason}`);
        return "skip";
      },
    });
    expect(asked).toEqual(["photo:duplicate"]);
    expect(accepted.map((entry) => entry.contentSha256)).toEqual([SHA_B]);
  });

  it("une lecture serveur impossible ne passe pas pour une absence", async () => {
    const lookup = vi.fn(async () => "unknown" as const);
    const reasons: string[] = [];
    const skipped = await reviewCoffreDrop({
      files: [video()],
      queueHashes: new Set(),
      lookup,
      hashFile: async () => SHA_A,
      choose: async (input) => {
        reasons.push(input.reason);
        return "skip";
      },
    });
    const kept = await reviewCoffreDrop({
      files: [photo()],
      queueHashes: new Set(),
      lookup,
      hashFile: async () => SHA_B,
      choose: async () => "keep",
    });
    expect(reasons).toEqual(["unknown"]);
    expect(skipped).toEqual([]);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.kind).toBe("photo");
  });

  it("la file locale déclenche le choix sans lecture serveur", async () => {
    const lookup = vi.fn(async () => "absent" as const);
    const accepted = await reviewCoffreDrop({
      files: [video()],
      queueHashes: new Set([SHA_A]),
      lookup,
      hashFile: async () => SHA_A,
      choose: async () => "skip",
    });
    expect(lookup).not.toHaveBeenCalled();
    expect(accepted).toEqual([]);
  });
});
