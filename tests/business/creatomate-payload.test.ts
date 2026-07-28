import { describe, expect, it } from "vitest";

import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import {
  buildOdysseyRenderPlan,
} from "@/src/lib/creatomate/buildPlan";
import { buildCreatomateSource } from "@/src/lib/creatomate/payloadBuilder";
import {
  isMaster4kPackage,
  resolveCreatomateResolution,
} from "@/src/lib/creatomate/resolveResolution";
import {
  buildDuckedMusicSegments,
  buildTimelineClips,
} from "@/src/lib/creatomate/timeline";
import type { ResolvedMediaAsset } from "@/src/lib/creatomate/types";
import { emptyStoryboardState } from "@/src/lib/wizard/wizardState";
import {
  assertManifestPricingAlignedWithLegacyConfig,
  packageExportResolution,
} from "@/src/lib/wizard/wizardDeliverables";

describe("resolveCreatomateResolution", () => {
  it("force 1080p pour Souvenir et Héritage", () => {
    expect(resolveCreatomateResolution("essential").label).toBe("1080p");
    expect(resolveCreatomateResolution("signature")).toEqual({
      width: 1920,
      height: 1080,
      label: "1080p",
    });
    expect(isMaster4kPackage("signature")).toBe(false);
  });

  it("débloque 4K pour Éternité et Légendaire", () => {
    expect(resolveCreatomateResolution("heritage")).toEqual({
      width: 3840,
      height: 2160,
      label: "4K",
    });
    expect(resolveCreatomateResolution("legendary").label).toBe("4K");
    expect(isMaster4kPackage("legendary")).toBe(true);
  });
});

describe("cinematicTheme Quiet Luxury", () => {
  it("intro entre 6 et 9 secondes", () => {
    expect(cinematicTheme.intro.durationSec).toBeGreaterThanOrEqual(6);
    expect(cinematicTheme.intro.durationSec).toBeLessThanOrEqual(9);
  });

  it("typo en vmin (pas de px absolus)", () => {
    expect(cinematicTheme.typography.name.fontSizeVmin).toMatch(/vmin$/);
    expect(cinematicTheme.brand.fontSizeVmin).toMatch(/vmin$/);
  });
});

describe("timeline + ducking", () => {
  it("ducke la musique sur les intervalles vidéo", () => {
    const segments = buildDuckedMusicSegments({
      contentOffsetSec: 7.5,
      chapterContentStartSec: 0,
      chapterContentDurationSec: 20,
      duckIntervals: [{ startSec: 5, endSec: 12 }],
      bedVolume: "55%",
      duckVolume: "22%",
      attackSec: 0.5,
      releaseSec: 0.6,
    });
    expect(segments.length).toBeGreaterThanOrEqual(2);
    const ducked = segments.filter((s) => s.volume === "22%");
    const bed = segments.filter((s) => s.volume === "55%");
    expect(ducked.length).toBeGreaterThanOrEqual(1);
    expect(bed.length).toBeGreaterThanOrEqual(1);
  });

  it("construit des clips ordonnés hors excluded", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [
      {
        id: "chapter-1",
        mediaIds: ["a", "b"],
      },
    ];
    storyboard.excludedIds = ["b"];
    const mediaById = new Map<string, ResolvedMediaAsset>([
      [
        "a",
        {
          id: "a",
          kind: "image",
          url: "https://example.com/a.jpg",
          trimStartSec: 0,
          durationSec: 7,
          focalX: 0.5,
          focalY: 0.5,
          hasAudio: false,
        },
      ],
      [
        "b",
        {
          id: "b",
          kind: "image",
          url: "https://example.com/b.jpg",
          trimStartSec: 0,
          durationSec: 7,
          focalX: 0.5,
          focalY: 0.5,
          hasAudio: false,
        },
      ],
    ]);
    const { clips } = buildTimelineClips({ storyboard, mediaById });
    expect(clips).toHaveLength(1);
    expect(clips[0]?.mediaId).toBe("a");
  });
});

describe("payloadBuilder RenderScript", () => {
  it("émet width/height absolus + font_size en vmin", () => {
    const storyboard = emptyStoryboardState();
    storyboard.chapters = [{ id: "chapter-1", mediaIds: ["m1"] }];
    const mediaById = new Map<string, ResolvedMediaAsset>([
      [
        "m1",
        {
          id: "m1",
          kind: "image",
          url: "https://example.com/m1.jpg",
          trimStartSec: 0,
          durationSec: 7,
          focalX: 0.4,
          focalY: 0.6,
          hasAudio: false,
        },
      ],
    ]);
    const plan = buildOdysseyRenderPlan({
      jobId: "job-1",
      webhookUrl: "https://example.com/hook",
      paidPackage: "heritage",
      storyboard,
      mediaById,
      essentials: { displayName: "Marie Dupont", datesLine: "1948 — 2024" },
      chapterAudio: [],
    });
    expect(plan.resolution.label).toBe("4K");
    const source = buildCreatomateSource(plan);
    expect(source.width).toBe(3840);
    expect(source.height).toBe(2160);
    const elements = source.elements as Array<Record<string, unknown>>;
    const nameEl = elements.find((e) => e.id === "intro-name");
    expect(String(nameEl?.font_size)).toMatch(/vmin/);
    expect(elements.some((e) => e.id === "outro-wordmark")).toBe(true);
  });
});

describe("package manifest Creatomate canon", () => {
  it("reste aligné pricing + Héritage 1080p / Éternité 4K", () => {
    expect(() => assertManifestPricingAlignedWithLegacyConfig()).not.toThrow();
    expect(packageExportResolution("HERITAGE")).toBe("1080p");
    expect(packageExportResolution("ETERNITE")).toBe("4K");
  });
});
