import { describe, expect, it } from "vitest";

import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import { resolveSessionPosterUrl } from "@/src/lib/wizard/sessionPosterImage";
import { emptyStoryboardState } from "@/src/lib/wizard/wizardState";

function photo(id: string): MontageMediaItem {
  return {
    assetId: id,
    displayName: `${id}.jpg`,
    previewUrl: `https://example.com/${id}.jpg`,
    fullPreviewUrl: `https://example.com/${id}-full.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 1000,
    orderIndex: 0,
    isVideo: false,
  };
}

function video(id: string): MontageMediaItem {
  return {
    assetId: id,
    displayName: `${id}.mp4`,
    previewUrl: `https://example.com/${id}-thumb.jpg`,
    fullPreviewUrl: null,
    mimeType: "video/mp4",
    sizeBytes: 5000,
    orderIndex: 0,
    isVideo: true,
  };
}

describe("resolveSessionPosterUrl", () => {
  it("priorise le portrait famille", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [
      { id: "c1", label: "A", mediaIds: ["p1"] },
    ];
    const mediaById = new Map([["p1", photo("p1")]]);
    expect(
      resolveSessionPosterUrl({
        openingPortraitUrl: "https://example.com/portrait.jpg",
        storyboard,
        mediaById,
      }),
    ).toBe("https://example.com/portrait.jpg");
  });

  it("prend la dernière photo du montage", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [
      { id: "c1", label: "A", mediaIds: ["p1", "p2"] },
      { id: "c2", label: "B", mediaIds: ["p3"] },
    ];
    const mediaById = new Map([
      ["p1", photo("p1")],
      ["p2", photo("p2")],
      ["p3", photo("p3")],
    ]);
    expect(
      resolveSessionPosterUrl({
        openingPortraitUrl: null,
        storyboard,
        mediaById,
      }),
    ).toBe("https://example.com/p3-full.jpg");
  });

  it("si fin = vidéo, remonte à la dernière photo", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [
      { id: "c1", label: "A", mediaIds: ["p1", "v1"] },
    ];
    const mediaById = new Map([
      ["p1", photo("p1")],
      ["v1", video("v1")],
    ]);
    expect(
      resolveSessionPosterUrl({
        openingPortraitUrl: "",
        storyboard,
        mediaById,
      }),
    ).toBe("https://example.com/p1-full.jpg");
  });

  it("ignore plusieurs vidéos de fin jusqu’à une photo", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [
      { id: "c1", label: "A", mediaIds: ["p1", "v1", "v2"] },
    ];
    const mediaById = new Map([
      ["p1", photo("p1")],
      ["v1", video("v1")],
      ["v2", video("v2")],
    ]);
    expect(
      resolveSessionPosterUrl({
        openingPortraitUrl: null,
        storyboard,
        mediaById,
      }),
    ).toBe("https://example.com/p1-full.jpg");
  });

  it("film 100 % vidéo → thumb de la dernière vidéo", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [
      { id: "c1", label: "A", mediaIds: ["v1", "v2"] },
    ];
    const mediaById = new Map([
      ["v1", video("v1")],
      ["v2", video("v2")],
    ]);
    expect(
      resolveSessionPosterUrl({
        openingPortraitUrl: null,
        storyboard,
        mediaById,
      }),
    ).toBe("https://example.com/v2-thumb.jpg");
  });

  it("ignore les médias exclus", () => {
    const storyboard = emptyStoryboardState();
    storyboard.excludedIds = ["p2"];
    storyboard.chapters = [
      { id: "c1", label: "A", mediaIds: ["p1", "p2"] },
    ];
    const mediaById = new Map([
      ["p1", photo("p1")],
      ["p2", photo("p2")],
    ]);
    expect(
      resolveSessionPosterUrl({
        openingPortraitUrl: null,
        storyboard,
        mediaById,
      }),
    ).toBe("https://example.com/p1-full.jpg");
  });

  it("retourne null si aucun média résolu", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [{ id: "c1", label: "A", mediaIds: ["missing"] }];
    expect(
      resolveSessionPosterUrl({
        openingPortraitUrl: null,
        storyboard,
        mediaById: new Map(),
      }),
    ).toBeNull();
  });
});
