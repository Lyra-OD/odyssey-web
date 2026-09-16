import { describe, expect, it } from "vitest";

import {
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
    expect(durationSec).toBe(35);
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
