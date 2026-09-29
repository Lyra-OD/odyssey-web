import { describe, expect, it } from "vitest";

import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import { buildTeaserFromStoryboard } from "@/src/lib/wizard/teaserHelpers";
import { emptyStoryboardState } from "@/src/lib/wizard/wizardState";

const titles = {
  chapter1: "Ch1",
  chapter2: "Ch2",
  chapter3: "Ch3",
  chapter4: "Ch4",
  chapter5Plus: "Ch+",
  trackCredit: "{title} — {artist}",
  trackCreditTitleOnly: "{title}",
};

function media(id: string): MontageMediaItem {
  return {
    assetId: id,
    previewUrl: `https://example.com/${id}.jpg`,
    fullPreviewUrl: `https://example.com/${id}-full.jpg`,
    isVideo: false,
  } as MontageMediaItem;
}

describe("buildTeaserFromStoryboard — skip empty chapters", () => {
  it("exclut un chapitre avec piste mais sans médias résolus", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [
      {
        id: "c1",
        label: "Racines",
        mediaIds: ["m1"],
        song: {
          source: "upload",
          title: "Acte 1",
          artist: "A",
          storagePath: "a/1.mp3",
          durationSec: 180,
        },
      },
      {
        id: "c2",
        label: "Liens",
        mediaIds: [],
        song: {
          source: "upload",
          title: "Fantôme",
          artist: "B",
          storagePath: "a/2.mp3",
          durationSec: 200,
        },
      },
      {
        id: "c3",
        label: "Chemin",
        mediaIds: ["m2"],
        song: {
          source: "upload",
          title: "Acte 2",
          artist: "C",
          storagePath: "a/3.mp3",
          durationSec: 190,
        },
      },
    ];

    const map = new Map<string, MontageMediaItem>([
      ["m1", media("m1")],
      ["m2", media("m2")],
    ]);

    const built = buildTeaserFromStoryboard(storyboard, map, titles, "SOUVENIR");
    expect(built.chapterOrder).toEqual(["c1", "c3"]);
    expect(built.chapterMeta.c2).toBeUndefined();
    expect(built.tracks.c2).toBeUndefined();
    expect(built.slides).toHaveLength(2);
  });
});
