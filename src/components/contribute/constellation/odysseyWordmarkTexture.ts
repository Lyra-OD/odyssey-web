import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

/** Bande large : grosses lettres + tracking jusqu’aux bords. */
export const WM_H = 512;
export const WM_W = 3072;
/** Doit matcher le mapping UV shader (pas d’étirement). */
export const WM_ASPECT = WM_W / WM_H;

function quoteFontFamilyList(raw: string): string {
  return raw
    .split(",")
    .map((part) => {
      const t = part.trim().replace(/^["']|["']$/g, "");
      return t ? `"${t}"` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function resolveMontserratLightSpec(sizePx: number): {
  font: string;
  family: string;
  weight: string;
} {
  const probe = document.createElement("span");
  probe.className = "font-brand font-light";
  probe.setAttribute("aria-hidden", "true");
  probe.textContent = "ODYSSEY";
  probe.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `font-size:${sizePx}px`,
    "font-weight:300",
    "text-transform:uppercase",
    "visibility:hidden",
    "pointer-events:none",
    "white-space:nowrap",
  ].join(";");
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const family =
    cs.fontFamily ||
    quoteFontFamilyList(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-brand")
        .trim() || "Montserrat",
    );
  const weight =
    cs.fontWeight === "400" || cs.fontWeight === "normal"
      ? "300"
      : cs.fontWeight || "300";
  document.body.removeChild(probe);
  return {
    family,
    weight,
    font: `${weight} ${sizePx}px ${family}`,
  };
}

async function ensureFont(fontSpec: string) {
  if (!document.fonts?.load) return;
  try {
    await document.fonts.load(fontSpec);
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
}

/**
 * ODYSSEY — Montserrat Light, ~2× plus grand, espacé bord à bord
 * (O près du bord gauche, Y près du bord droit). Pas d’étirement.
 */
function paintOdysseyWordmark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  const text = "ODYSSEY";
  // ~2× plus grand ; puis on espace jusqu’aux bords
  let fontSize = Math.floor(h * 0.92);
  let { font } = resolveMontserratLightSpec(fontSize);
  ctx.font = font;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const sidePad = w * 0.015;
  const span = w - sidePad * 2;

  const measure = (size: number) => {
    const spec = resolveMontserratLightSpec(size);
    ctx.font = spec.font;
    const widths: number[] = [];
    let lettersW = 0;
    for (const ch of text) {
      const cw = ctx.measureText(ch).width;
      widths.push(cw);
      lettersW += cw;
    }
    return { widths, lettersW, font: spec.font };
  };

  let { widths, lettersW } = measure(fontSize);
  // Garde de la place pour de vrais espaces (sinon scale uniforme, jamais stretch)
  const maxLettersW = span * 0.58;
  if (lettersW > maxLettersW) {
    fontSize = Math.max(8, Math.floor(fontSize * (maxLettersW / lettersW)));
    ({ widths, lettersW, font } = measure(fontSize));
    ctx.font = font;
  }

  const gaps = text.length - 1;
  const gap = Math.max(0, (span - lettersW) / gaps);

  let x = sidePad;
  const y = h * 0.5;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i]!, x, y);
    x += widths[i]! + gap;
  }
}

export function createOdysseyWordmarkTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = WM_W;
  canvas.height = WM_H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (ctx) paintOdysseyWordmark(ctx, WM_W, WM_H);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export async function refreshOdysseyWordmarkTexture(tex: CanvasTexture) {
  const canvas = tex.image as HTMLCanvasElement | undefined;
  if (!canvas?.getContext) return;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const fontSize = Math.floor(canvas.height * 0.92);
  const { font } = resolveMontserratLightSpec(fontSize);
  await ensureFont(font);
  paintOdysseyWordmark(ctx, canvas.width, canvas.height);
  tex.needsUpdate = true;
}
