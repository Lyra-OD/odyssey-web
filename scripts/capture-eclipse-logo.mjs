/**
 * Capture Odyssey Eclipse mark frames → PNG sequence for GIF/APNG.
 * Usage: node scripts/capture-eclipse-logo.mjs
 * Requires: local dev server on :3000, playwright.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = path.resolve("docs/brand/odyssey-eclipse/frames");
const URL =
  process.env.MARK_URL ||
  "http://localhost:3000/fr/contribute/test-eclipse-mark-export";
const FRAMES = 36;
const INTERVAL_MS = 80;
const SIZE = 512;

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: SIZE + 80, height: SIZE + 80 },
  deviceScaleFactor: 1,
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 120_000 });
await page.waitForSelector("canvas", { timeout: 60_000 });
// leave time for WebGL + first frames
await page.waitForTimeout(2500);

const canvas = page.locator("canvas").first();
const box = await canvas.boundingBox();
if (!box) throw new Error("canvas has no box");

for (let i = 0; i < FRAMES; i++) {
  const file = path.join(OUT, `frame_${String(i).padStart(3, "0")}.png`);
  await page.screenshot({
    path: file,
    clip: {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    },
  });
  await page.waitForTimeout(INTERVAL_MS);
  process.stdout.write(`frame ${i + 1}/${FRAMES}\n`);
}

await browser.close();
console.log(`Wrote ${FRAMES} frames to ${OUT}`);
