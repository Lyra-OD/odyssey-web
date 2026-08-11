/**
 * Capture Odyssey Eclipse mark frames → PNG sequence, then assemble GIF / APNG / MP4 / still.
 *
 * Usage:
 *   node scripts/capture-eclipse-logo.mjs              # lockup (avec ODYSSEY)
 *   node scripts/capture-eclipse-logo.mjs --variant=disc
 *
 * Requires: local dev server on :3000, playwright, ffmpeg.
 *
 * Outputs (docs/brand/odyssey-eclipse/) :
 *   lockup → odyssey-eclipse-lockup.{gif,apng.png,mp4} + -still.png
 *   disc   → odyssey-eclipse-logo.{gif,apng.png,mp4} + -still.png  (matière seule)
 */
import { chromium } from "playwright";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = path.resolve("docs/brand/odyssey-eclipse");
const FRAMES_DIR = path.join(ROOT, "frames");

const variantArg =
  process.argv.find((a) => a.startsWith("--variant="))?.split("=")[1] ||
  process.env.VARIANT ||
  "lockup";
const VARIANT = variantArg === "disc" ? "disc" : "lockup";

const PREFIX =
  VARIANT === "disc" ? "odyssey-eclipse-logo" : "odyssey-eclipse-lockup";

const URL =
  process.env.MARK_URL ||
  `http://localhost:3000/fr/contribute/test-eclipse-mark-export?variant=${VARIANT}`;

const FRAMES = 36;
const INTERVAL_MS = 80;
const FPS = 1000 / INTERVAL_MS; // 12.5
const SIZE = 512;

fs.mkdirSync(FRAMES_DIR, { recursive: true });
for (const f of fs.readdirSync(FRAMES_DIR)) {
  if (f.endsWith(".png")) fs.unlinkSync(path.join(FRAMES_DIR, f));
}

console.log(`Variant: ${VARIANT} → ${PREFIX}.*`);
console.log(`URL: ${URL}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: SIZE + 80, height: SIZE + 80 },
  deviceScaleFactor: 1,
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 120_000 });
await page.waitForSelector("canvas", { timeout: 60_000 });
await page.waitForTimeout(2500);

const canvas = page.locator("canvas").first();
const box = await canvas.boundingBox();
if (!box) throw new Error("canvas has no box");

for (let i = 0; i < FRAMES; i++) {
  const file = path.join(FRAMES_DIR, `frame_${String(i).padStart(3, "0")}.png`);
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
console.log(`Wrote ${FRAMES} frames to ${FRAMES_DIR}`);

const still = path.join(ROOT, `${PREFIX}-still.png`);
fs.copyFileSync(path.join(FRAMES_DIR, "frame_000.png"), still);
console.log(`Still → ${still}`);

const palette = path.join(ROOT, "palette.png");
const gif = path.join(ROOT, `${PREFIX}.gif`);
const apng = path.join(ROOT, `${PREFIX}.apng.png`);
const mp4 = path.join(ROOT, `${PREFIX}.mp4`);
const pattern = path.join(FRAMES_DIR, "frame_%03d.png");

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-vf",
    "palettegen=reserve_transparent=0",
    palette,
  ],
  { stdio: "inherit" },
);

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-i",
    palette,
    "-lavfi",
    "paletteuse=dither=bayer:bayer_scale=3",
    gif,
  ],
  { stdio: "inherit" },
);
console.log(`GIF → ${gif}`);

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-plays",
    "0",
    "-f",
    "apng",
    apng,
  ],
  { stdio: "inherit" },
);
console.log(`APNG → ${apng}`);

execFileSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    "-movflags",
    "+faststart",
    mp4,
  ],
  { stdio: "inherit" },
);
console.log(`MP4 → ${mp4}`);

console.log("Done.");
