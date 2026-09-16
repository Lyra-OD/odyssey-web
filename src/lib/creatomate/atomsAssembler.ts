/**
 * Assembleur atomes Creatomate — charge les JSON craft, bind slots, offset timeline.
 * Étape 2 : intro seule. Étape 3 : médias + outro.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { formatYearsLine } from "@/src/lib/creatomate/yearFromDate";
import type { OdysseyRenderPlan } from "@/src/lib/creatomate/types";

export type CreatomateElement = Record<string, unknown>;

type AtomSourceDoc = {
  duration?: number;
  elements?: CreatomateElement[];
};

const ATOMS_DIR = join(process.cwd(), "docs", "craft", "atoms");

/** Fallback sandbox si pas d’avatar ni photo storyboard. */
export const DEMO_PORTRAIT_URL =
  "https://cdn.creatomate.com/demo/woman.jpg";

export function loadAtomSource(filename: string): AtomSourceDoc {
  const raw = readFileSync(join(ATOMS_DIR, filename), "utf8");
  return JSON.parse(raw) as AtomSourceDoc;
}

export function deepCloneAtom<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function walkElements(
  elements: CreatomateElement[],
  visit: (el: CreatomateElement) => void,
): void {
  for (const el of elements) {
    visit(el);
    const nested = el.elements;
    if (Array.isArray(nested)) {
      walkElements(nested as CreatomateElement[], visit);
    }
  }
}

/** Décale le `time` des éléments racine uniquement (enfants restent relatifs). */
export function offsetRootTimes(
  elements: CreatomateElement[],
  offsetSec: number,
): void {
  if (!offsetSec) return;
  for (const el of elements) {
    const t = el.time;
    const base = typeof t === "number" ? t : 0;
    el.time = base + offsetSec;
  }
}

export function resolvePortraitUrl(plan: OdysseyRenderPlan): string {
  const fromEssentials = plan.essentials.portraitUrl?.trim();
  if (fromEssentials) return fromEssentials;

  const firstImage = plan.clips.find((c) => c.kind === "image" && c.url);
  if (firstImage?.url) return firstImage.url;

  return DEMO_PORTRAIT_URL;
}

function bindIntroElements(
  elements: CreatomateElement[],
  plan: OdysseyRenderPlan,
): void {
  const years =
    formatYearsLine(plan.essentials.birthYear, plan.essentials.deathYear) ??
    "";
  const portraitUrl = resolvePortraitUrl(plan);

  walkElements(elements, (el) => {
    const name = el.name;
    if (name === "Text-CFQ") {
      el.text = plan.essentials.displayName;
      return;
    }
    if (name === "Text-F5F") {
      el.text = years;
      return;
    }
    if (name === "Image-VZZ") {
      el.source = portraitUrl;
    }
  });
}

export type AssembledIntro = {
  elements: CreatomateElement[];
  durationSec: number;
};

/**
 * Intro magazine atomique (docs/craft/atoms/intro.json).
 * Médias / outro restent hors scope (étape 3).
 */
export function assembleIntroAtom(plan: OdysseyRenderPlan): AssembledIntro {
  const doc = loadAtomSource("intro.json");
  const elements = deepCloneAtom(doc.elements ?? []);
  bindIntroElements(elements, plan);
  const durationSec =
    typeof doc.duration === "number" && doc.duration > 0 ? doc.duration : 35;
  return { elements, durationSec };
}
