import { describe, expect, it } from "vitest";

import {
  FRAME_TARGET_HALF_HEIGHT,
  FRAME_TARGET_HALF_WIDTH,
  drawnBounds,
  normalizeTemplateFrame,
  templateBounds,
} from "@/src/components/contribute/constellation/graphs/frame";
import { LEO_TEMPLATE } from "@/src/components/contribute/constellation/graphs/leo";
import { LIBRA_TEMPLATE } from "@/src/components/contribute/constellation/graphs/libra";
import {
  resolveConstellationTemplate,
  resolveStrokeSequence,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import { resolveRevealCamera } from "@/src/components/contribute/constellation/graphs/revealCamera";

const SIGNS = [LEO_TEMPLATE, LIBRA_TEMPLATE];

describe("cadre canonique des constellations", () => {
  it("recentre chaque signe sur sa boîte", () => {
    for (const sign of SIGNS) {
      const b = templateBounds(normalizeTemplateFrame(sign));
      expect(Math.abs(b.centerX)).toBeLessThan(1e-6);
      expect(Math.abs(b.centerY)).toBeLessThan(1e-6);
    }
  });

  it("ramène chaque signe dans la boîte cible sans le déformer", () => {
    for (const sign of SIGNS) {
      const before = templateBounds(sign);
      const after = templateBounds(normalizeTemplateFrame(sign));

      expect(after.halfWidth).toBeLessThanOrEqual(FRAME_TARGET_HALF_WIDTH + 1e-6);
      expect(after.halfHeight).toBeLessThanOrEqual(
        FRAME_TARGET_HALF_HEIGHT + 1e-6,
      );

      // Échelle uniforme : le rapport largeur/hauteur est préservé.
      expect(after.width / after.height).toBeCloseTo(
        before.width / before.height,
        6,
      );
    }
  });

  it("garde le Hero à sa place dans la figure", () => {
    // Le Lion a son étoile principale excentrée : la normalisation ne doit pas
    // la ramener au centre, sinon la silhouette du signe est trahie.
    const hero = normalizeTemplateFrame(LEO_TEMPLATE).nodes.find(
      (n) => n.role === "hero",
    );
    expect(hero).toBeDefined();
    expect(Math.abs(hero!.position[0])).toBeGreaterThan(0.2);
  });
});

describe("caméra reveal", () => {
  const VIEW = { fov: 42, aspect: 1.5 };

  it("contient à chaque instant la portion déjà tracée", () => {
    const template = resolveConstellationTemplate("leo");
    const sequence = resolveStrokeSequence("leo");
    const halfFov = (VIEW.fov * Math.PI) / 360;

    for (let i = 0; i <= 40; i++) {
      const drawU = i / 40;
      // revealT dans la fenêtre de tracé (après la naissance).
      const revealT = 0.72 + drawU * 0.28;
      const pose = resolveRevealCamera(
        revealT,
        1,
        drawU,
        template,
        VIEW,
        sequence,
      );

      const halfH = pose.camZ * Math.tan(halfFov);
      const halfW = halfH * VIEW.aspect;

      // Boîte monde du tracé : offset groupe (-0.45, -0.7) comme au rendu.
      const drawn = drawnBounds(template, sequence, drawU);
      const minX = -0.45 + drawn.minX;
      const maxX = -0.45 + drawn.maxX;
      const minY = -0.7 + drawn.minY;
      const maxY = -0.7 + drawn.maxY;

      expect(maxX - pose.lookX).toBeLessThanOrEqual(halfW + 1e-6);
      expect(pose.lookX - minX).toBeLessThanOrEqual(halfW + 1e-6);
      expect(maxY - pose.lookY).toBeLessThanOrEqual(halfH + 1e-6);
      expect(pose.lookY - minY).toBeLessThanOrEqual(halfH + 1e-6);
    }
  });

  it("recule sans à-coup de zoom", () => {
    const template = resolveConstellationTemplate("leo");
    const sequence = resolveStrokeSequence("leo");
    const samples: number[] = [];
    for (let i = 0; i <= 60; i++) {
      const drawU = i / 60;
      samples.push(
        resolveRevealCamera(
          0.72 + drawU * 0.28,
          1,
          drawU,
          template,
          VIEW,
          sequence,
        ).camZ,
      );
    }

    // Le mouvement d'ensemble est un recul.
    expect(samples[samples.length - 1]).toBeGreaterThan(samples[0]);

    // La consigne de recul reste bornée d'un échantillon à l'autre. Elle n'est
    // pas parfaitement lisse : avec le chevauchement des traits, un nouveau
    // trait part d'une étoile encore éteinte, donc l'étendue tracée fait un
    // pas. `RevealCamera` amortit (lerp ~0,05/frame), mais on veut garder ce
    // pas assez petit pour qu'il reste absorbable.
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i] - samples[i - 1])).toBeLessThan(1);
    }
  });

  it("ne recule pas avant le premier trait", () => {
    const template = resolveConstellationTemplate("leo");
    const birth = resolveRevealCamera(0.4, 1, 0, template, VIEW);
    const paced = resolveRevealCamera(0.4, 1, 0, template);
    expect(birth.camZ).toBeCloseTo(paced.camZ, 6);
  });
});

describe("signes zodiacaux", () => {
  it("Balance et Lion sont deux figures distinctes", () => {
    const libra = resolveConstellationTemplate("libra");
    const leo = resolveConstellationTemplate("leo");
    expect(libra.id).not.toBe(leo.id);
  });

  it("les 10 signes non dessinés retombent encore sur le Lion", () => {
    // Garde-fou : ce test devra tomber signe par signe au fur et à mesure
    // qu'on dessine les gabarits manquants.
    const missing = [
      "aries",
      "taurus",
      "gemini",
      "cancer",
      "virgo",
      "scorpio",
      "sagittarius",
      "capricorn",
      "aquarius",
      "pisces",
    ] as const;
    for (const sign of missing) {
      expect(resolveConstellationTemplate(sign).id).toBe("leo");
    }
  });
});
