/**
 * Assembleur atomes Creatomate — charge les JSON craft, bind slots, offset timeline.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import { formatYearsLine } from "@/src/lib/creatomate/yearFromDate";
import type {
  OdysseyRenderPlan,
  TimelineMediaClip,
} from "@/src/lib/creatomate/types";

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

export function loadAtomElement(filename: string): CreatomateElement {
  const raw = readFileSync(join(ATOMS_DIR, filename), "utf8");
  return JSON.parse(raw) as CreatomateElement;
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

function suffixElementIds(elements: CreatomateElement[], suffix: string): void {
  walkElements(elements, (el) => {
    if (typeof el.id === "string" && el.id.length > 0) {
      el.id = `${el.id}${suffix}`;
    }
  });
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

function bindMediaElements(
  elements: CreatomateElement[],
  clip: TimelineMediaClip,
): void {
  walkElements(elements, (el) => {
    if (el.name === "Image-FQ3") {
      el.source = clip.url;
      return;
    }
    if (el.name === "Video-Clip") {
      el.source = clip.url;
      el.trim_start = clip.trimStartSec;
      if (!clip.hasAudio) {
        el.volume = "0%";
      }
    }
  });
}

function bindOutroElements(
  elements: CreatomateElement[],
  plan: OdysseyRenderPlan,
): void {
  const years =
    formatYearsLine(plan.essentials.birthYear, plan.essentials.deathYear) ??
    "";
  walkElements(elements, (el) => {
    const name = el.name;
    // Text-499 = nom · Text-BZ4 = années (atome UI Creatomate).
    if (name === "Text-499") {
      el.text = plan.essentials.displayName;
      return;
    }
    if (name === "Text-BZ4") {
      el.text = years;
    }
  });
}

export type AssembledIntro = {
  elements: CreatomateElement[];
  durationSec: number;
};

export type AssembledFilm = {
  elements: CreatomateElement[];
  durationSec: number;
  introDurationSec: number;
};

/**
 * Intro magazine atomique (docs/craft/atoms/intro.json).
 */
export function assembleIntroAtom(plan: OdysseyRenderPlan): AssembledIntro {
  const doc = loadAtomSource("intro.json");
  const elements = deepCloneAtom(doc.elements ?? []);
  bindIntroElements(elements, plan);
  const durationSec =
    typeof doc.duration === "number" && doc.duration > 0 ? doc.duration : 27;
  return { elements, durationSec };
}

function assembleMediaClipAtom(clip: TimelineMediaClip, index: number): {
  elements: CreatomateElement[];
  durationSec: number;
} {
  const filename =
    clip.kind === "video" ? "media-video.json" : "media-photo.json";
  const doc = loadAtomSource(filename);
  const elements = deepCloneAtom(doc.elements ?? []);
  bindMediaElements(elements, clip);
  suffixElementIds(elements, `-c${index}`);
  const fallback = clip.kind === "video" ? 10 : 6.98;
  const durationSec =
    typeof doc.duration === "number" && doc.duration > 0
      ? doc.duration
      : fallback;
  return { elements, durationSec };
}

/**
 * Outro carte mémoire (docs/craft/atoms/outro.json) — document comme l’intro.
 */
function assembleOutroAtom(
  plan: OdysseyRenderPlan,
  startSec: number,
): { elements: CreatomateElement[]; durationSec: number } {
  const doc = loadAtomSource("outro.json");
  const elements = deepCloneAtom(doc.elements ?? []);
  bindOutroElements(elements, plan);
  offsetRootTimes(elements, startSec);
  const durationSec =
    typeof doc.duration === "number" && doc.duration > 0 ? doc.duration : 10;
  return { elements, durationSec };
}

/**
 * Film complet : intro + N clips photo/vidéo + outro carte mémoire.
 */
export function assembleAtomFilm(plan: OdysseyRenderPlan): AssembledFilm {
  const fade = cinematicTheme.media.transitionFadeSec;
  const intro = assembleIntroAtom(plan);
  const elements: CreatomateElement[] = [...intro.elements];
  let cursor = intro.durationSec;

  for (let i = 0; i < plan.clips.length; i++) {
    cursor = Math.max(0, cursor - fade);
    const clip = plan.clips[i]!;
    const media = assembleMediaClipAtom(clip, i);
    offsetRootTimes(media.elements, cursor);
    elements.push(...media.elements);
    cursor += media.durationSec;
  }

  cursor = Math.max(0, cursor - fade);
  const outro = assembleOutroAtom(plan, cursor);
  elements.push(...outro.elements);
  cursor += outro.durationSec;

  return {
    elements,
    durationSec: cursor,
    introDurationSec: intro.durationSec,
  };
}
