import { describe, expect, it } from "vitest";

import {
  assembleAtomFilm,
  assembleIntroAtom,
  DEMO_PORTRAIT_URL,
  resolvePortraitUrl,
} from "@/src/lib/creatomate/atomsAssembler";
import type { OdysseyRenderPlan } from "@/src/lib/creatomate/types";

function basePlan(
  overrides: Partial<OdysseyRenderPlan> = {},
): OdysseyRenderPlan {
  return {
    jobId: "job-test",
    webhookUrl: "https://example.com/hook",
    paidPackage: "signature",
    resolution: { width: 1920, height: 1080, label: "1080p" },
    essentials: {
      displayName: "Jean-Paul Gaudreault",
      datesLine: "1940-06-01 · 2026-01-10",
      birthYear: "1940",
      deathYear: "2026",
      portraitUrl: null,
    },
    clips: [],
    audioStems: [],
    duckIntervals: [],
    ...overrides,
  };
}

describe("assembleIntroAtom", () => {
  it("charge intro.json et bind nom / années / portrait démo", () => {
    const { elements, durationSec } = assembleIntroAtom(basePlan());
    expect(durationSec).toBe(27);
    expect(elements.some((e) => e.name === "Composition-Portrait")).toBe(true);

    const flat: Array<Record<string, unknown>> = [];
    const walk = (els: Array<Record<string, unknown>>) => {
      for (const e of els) {
        flat.push(e);
        if (Array.isArray(e.elements)) walk(e.elements as typeof flat);
      }
    };
    walk(elements);

    expect(flat.find((e) => e.name === "Text-CFQ")?.text).toBe(
      "Jean-Paul Gaudreault",
    );
    expect(flat.find((e) => e.name === "Text-F5F")?.text).toBe("1940 - 2026");
    expect(flat.find((e) => e.name === "Image-VZZ")?.source).toBe(
      DEMO_PORTRAIT_URL,
    );
  });

  it("préfère portraitUrl essentials", () => {
    const url = "https://cdn.example/avatar.jpg";
    expect(
      resolvePortraitUrl(
        basePlan({
          essentials: {
            displayName: "A",
            datesLine: null,
            birthYear: null,
            deathYear: null,
            portraitUrl: url,
          },
        }),
      ),
    ).toBe(url);
  });
});

describe("assembleAtomFilm", () => {
  it("enchaîne intro + photo + vidéo + outro sans Odyssey", () => {
    const film = assembleAtomFilm(
      basePlan({
        clips: [
          {
            mediaId: "p1",
            kind: "image",
            url: "https://cdn.example/p1.jpg",
            timeSec: 0,
            durationSec: 7,
            trimStartSec: 0,
            focalX: 0.5,
            focalY: 0.5,
            hasAudio: false,
          },
          {
            mediaId: "v1",
            kind: "video",
            url: "https://cdn.example/v1.mp4",
            timeSec: 7,
            durationSec: 10,
            trimStartSec: 1.5,
            focalX: 0.5,
            focalY: 0.5,
            hasAudio: true,
          },
        ],
      }),
    );

    expect(film.introDurationSec).toBe(27);
    expect(film.durationSec).toBeGreaterThan(27 + 6);
    expect(film.elements.some((e) => e.name === "Composition-Portrait")).toBe(
      true,
    );
    expect(film.elements.some((e) => e.name === "Composition-XWX")).toBe(true);
    expect(film.elements.some((e) => e.name === "Composition-Video")).toBe(
      true,
    );
    expect(film.elements.some((e) => e.id === "outro-composition")).toBe(true);
    expect(film.elements.some((e) => e.id === "outro-wordmark")).toBe(false);

    const flat: Array<Record<string, unknown>> = [];
    const walk = (els: Array<Record<string, unknown>>) => {
      for (const e of els) {
        flat.push(e);
        if (Array.isArray(e.elements)) walk(e.elements as typeof flat);
      }
    };
    walk(film.elements);

    expect(flat.find((e) => e.name === "Image-FQ3")?.source).toBe(
      "https://cdn.example/p1.jpg",
    );
    const video = flat.find((e) => e.name === "Video-Clip");
    expect(video?.source).toBe("https://cdn.example/v1.mp4");
    expect(video?.trim_start).toBe(1.5);
    expect(flat.find((e) => e.id === "outro-name")?.text).toBe(
      "Jean-Paul Gaudreault",
    );
    expect(flat.find((e) => e.id === "outro-dates")?.text).toBe("1940 - 2026");
  });
});
