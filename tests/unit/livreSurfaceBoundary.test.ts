import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Frontières du package Livre (`src/surfaces/livre`) — imports réellement
 * résolus par le compilateur (alias `@/*`, `import type`, ré-exports, `import()`).
 */

const ROOT = path.resolve(__dirname, "../..");
const LIVRE_DIR = path.join(ROOT, "src/surfaces/livre");
const LIVRE_SURFACE = path.join(LIVRE_DIR, "LivreSurface.tsx");
const LIVRE_TYPES = path.join(LIVRE_DIR, "types.ts");
const LIVRE_COPY = path.join(LIVRE_DIR, "copy.ts");
const TRIBUTE_WIZARD = path.join(ROOT, "src/components/tribute/TributeWizard.tsx");
const GLOBAL_DICTIONARY_FILES = [
  path.join(ROOT, "lib/dictionaries.ts"),
  path.join(ROOT, "dictionaries"),
];
const LEGACY_REFERENCE = /\bStoryboardMontageStep\b|components\/tribute\/montage\//;

const compilerOptions = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(ROOT, "tsconfig.json"), ts.sys.readFile).config,
  ts.sys,
  ROOT,
).options;
const host = ts.createCompilerHost(compilerOptions);

type ResolvedImport = { specifier: string; resolved: string | null };

function resolveImports(file: string, sourceText?: string): ResolvedImport[] {
  const text = sourceText ?? fs.readFileSync(file, "utf8");
  const { importedFiles } = ts.preProcessFile(text, true, true);
  return importedFiles
    .filter(({ fileName }) => fileName.startsWith("@/") || fileName.startsWith("."))
    .map(({ fileName }) => {
      const result = ts.resolveModuleName(fileName, file, compilerOptions, host);
      const resolved = result.resolvedModule?.resolvedFileName;
      return {
        specifier: fileName,
        resolved: resolved ? path.resolve(resolved) : null,
      };
    });
}

function reachableFrom(entry: string, entryText?: string): Set<string> {
  const seen = new Set<string>();
  const stack: Array<{ file: string; text?: string }> = [{ file: entry, text: entryText }];
  while (stack.length > 0) {
    const { file, text } = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const { resolved } of resolveImports(file, text)) {
      if (resolved && !resolved.includes(`${path.sep}node_modules${path.sep}`)) {
        stack.push({ file: resolved });
      }
    }
  }
  seen.delete(entry);
  return seen;
}

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const isInsideLivre = (file: string) => file.startsWith(`${LIVRE_DIR}${path.sep}`);
const isGlobalDictionary = (file: string) =>
  GLOBAL_DICTIONARY_FILES.some(
    (target) => file === target || file.startsWith(`${target}${path.sep}`),
  );

function livreLeaksFrom(file: string, text?: string): string[] {
  return [...reachableFrom(file, text)].filter(isInsideLivre);
}

function unresolvedImports(file: string, text?: string): string[] {
  return resolveImports(file, text)
    .filter(({ resolved }) => resolved === null)
    .map(({ specifier }) => specifier);
}

function forbiddenLivreDependencies(file: string, text?: string): string[] {
  return [...reachableFrom(file, text)].filter(
    (dep) => dep === TRIBUTE_WIZARD || isGlobalDictionary(dep),
  );
}

const libAndHookFiles = [
  ...listSourceFiles(path.join(ROOT, "src/lib")),
  ...listSourceFiles(path.join(ROOT, "src/hooks")),
];
const livreFiles = listSourceFiles(LIVRE_DIR);

describe("frontières du package Livre", () => {
  it("le package contient LivreSurface, copy, types et index", () => {
    for (const file of [LIVRE_SURFACE, LIVRE_COPY, LIVRE_TYPES, path.join(LIVRE_DIR, "index.ts")]) {
      expect(fs.existsSync(file), file).toBe(true);
    }
  });

  it("src/lib et src/hooks n'atteignent jamais le package Livre", () => {
    const leaks = libAndHookFiles.flatMap((file) =>
      livreLeaksFrom(file).map((dep) => `${path.relative(ROOT, file)} -> ${path.relative(ROOT, dep)}`),
    );
    expect(leaks).toEqual([]);
  });

  it("types.ts et copy.ts n'atteignent pas LivreSurface", () => {
    expect(reachableFrom(LIVRE_TYPES).has(LIVRE_SURFACE)).toBe(false);
    expect(reachableFrom(LIVRE_COPY).has(LIVRE_SURFACE)).toBe(false);
  });

  it("chaque import interne du package Livre se résout vers un fichier existant", () => {
    const broken = livreFiles.flatMap((file) =>
      unresolvedImports(file).map((spec) => `${path.relative(ROOT, file)}: ${spec}`),
    );
    expect(broken).toEqual([]);
  });

  it("le package Livre ne dépend ni de TributeWizard ni du dictionnaire global", () => {
    const forbidden = livreFiles.flatMap((file) =>
      forbiddenLivreDependencies(file).map(
        (dep) => `${path.relative(ROOT, file)} -> ${path.relative(ROOT, dep)}`,
      ),
    );
    expect(forbidden).toEqual([]);
  });

  it("plus aucune référence à StoryboardMontageStep ni à components/tribute/montage/", () => {
    const self = path.resolve(__filename);
    const offenders = ["src", "app", "lib", "tests"]
      .flatMap((dir) => listSourceFiles(path.join(ROOT, dir)))
      .filter((file) => path.resolve(file) !== self)
      .filter((file) => LEGACY_REFERENCE.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});

describe("frontières du package Livre — cas négatifs (le garde détecte les violations)", () => {
  it("détecte un fichier de src/lib qui importe un composant Livre", () => {
    const fake = path.join(ROOT, "src/lib/wizard/__fake__.ts");
    const leaks = livreLeaksFrom(
      fake,
      'import { storyboardChapterDomId } from "@/src/surfaces/livre/storyboard/StoryboardChapterBlock";',
    );
    expect(leaks).toContain(path.join(LIVRE_DIR, "storyboard/StoryboardChapterBlock.tsx"));
  });

  it("détecte un import de type seul depuis types.ts vers LivreSurface", () => {
    const deps = reachableFrom(LIVRE_TYPES, 'import type { LivreSurface } from "./LivreSurface";');
    expect(deps.has(LIVRE_SURFACE)).toBe(true);
  });

  it("détecte une dépendance indirecte de copy.ts vers LivreSurface", () => {
    const deps = reachableFrom(LIVRE_COPY, 'export type { LivreHostProps } from "./index";');
    expect(deps.has(LIVRE_SURFACE)).toBe(true);
  });

  it("détecte un import Livre qui ne se résout pas", () => {
    const fake = path.join(LIVRE_DIR, "storyboard/__fake__.tsx");
    expect(
      unresolvedImports(fake, 'import { Nope } from "@/src/surfaces/livre/storyboard/Nope";'),
    ).toEqual(["@/src/surfaces/livre/storyboard/Nope"]);
  });

  it("détecte une dépendance du package Livre vers TributeWizard ou le dictionnaire global", () => {
    const fake = path.join(LIVRE_DIR, "__fake__.tsx");
    expect(
      forbiddenLivreDependencies(fake, 'import type { AppDictionary } from "@/lib/dictionaries";'),
    ).toContain(path.join(ROOT, "lib/dictionaries.ts"));
    expect(
      forbiddenLivreDependencies(
        fake,
        'import { TributeWizard } from "@/src/components/tribute/TributeWizard";',
      ),
    ).toContain(TRIBUTE_WIZARD);
  });

  it("détecte une ancienne référence StoryboardMontageStep", () => {
    expect(
      LEGACY_REFERENCE.test(
        'import { StoryboardMontageStep } from "@/src/components/tribute/StoryboardMontageStep";',
      ),
    ).toBe(true);
    expect(LEGACY_REFERENCE.test('import x from "@/src/components/tribute/montage/MontageMediaCard";')).toBe(true);
    expect(LEGACY_REFERENCE.test("type X = StoryboardMontageStepCopy;")).toBe(false);
  });
});
