/** Shaders / helpers partagés — layers gaz séparés (teal / mauve / rose). */

import {
  DataTexture,
  LinearFilter,
  RedFormat,
  RepeatWrapping,
  UnsignedByteType,
} from "three";

export const nebulaVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Noise + blobs partagés (préfixe commun des fragment shaders). */
export const nebulaNoiseGlsl = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

vec2 loopWarp(float phase, float radius) {
  return vec2(cos(phase), sin(phase)) * radius;
}

float cloudBlob(vec2 p, vec2 center, float radius, vec2 alongDir, vec2 perpDir) {
  vec2 d = p - center;
  float u = dot(d, alongDir);
  float v = dot(d, perpDir);
  float dist = length(vec2(u * 0.55, v * 1.35));
  return 1.0 - smoothstep(radius * 0.2, radius, dist);
}

float softBlob(vec2 p, vec2 center, float radius, float stretch) {
  vec2 d = p - center;
  d.x *= stretch;
  float dist = length(d);
  return 1.0 - smoothstep(radius * 0.25, radius, dist);
}
`;

export const GAS_LOOP_PERIOD = 38; // legacy — préférer skyTheme.baseLoopPeriod

/** Texture soft value-noise (détail « photo » pour les 3 gaz). */
export function makeSoftNoiseTexture(size = 128): DataTexture {
  const data = new Uint8Array(size * size);
  const grid = 16;
  const cell = size / grid;
  const corners = new Float32Array((grid + 1) * (grid + 1));
  for (let i = 0; i < corners.length; i++) {
    corners[i] = Math.random();
  }
  const corner = (gx: number, gy: number) =>
    corners[gy * (grid + 1) + gx] ?? 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = x / cell;
      const gy = y / cell;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const fx = gx - ix;
      const fy = gy - iy;
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);
      const a = corner(ix, iy);
      const b = corner(ix + 1, iy);
      const c = corner(ix, iy + 1);
      const d = corner(ix + 1, iy + 1);
      const v =
        a + (b - a) * ux + (c - a) * uy * (1 - ux) + (d - b) * ux * uy;
      data[y * size + x] = Math.floor(v * 255);
    }
  }

  const tex = new DataTexture(data, size, size, RedFormat, UnsignedByteType);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
