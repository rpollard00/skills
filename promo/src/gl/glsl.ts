import { BAYER_8 } from "../kit/motion";

/** `float bayer8(ivec2 cell)`: the same 8x8 threshold as `bayer8` in kit/motion.ts, in (0, 1). */
export const GLSL_BAYER8 = `
const int BAYER_8[64] = int[64](${BAYER_8.join(", ")});

float bayer8(ivec2 cell) {
  ivec2 m = cell & 7;
  return (float(BAYER_8[m.y * 8 + m.x]) + 0.5) / 64.0;
}
`;

/** `uint hashU(uvec2)`, `float hash(ivec2)` in [0, 1). Integer math, so every GL backend gives the same bits. */
export const GLSL_HASH = `
uint hashU(uvec2 p) {
  uint h = p.x * 0x9E3779B1u ^ p.y * 0x85EBCA77u;
  h ^= h >> 15;
  h *= 0x2C1B3C6Du;
  h ^= h >> 12;
  h *= 0x297A2D39u;
  h ^= h >> 15;
  return h;
}

float hash(ivec2 p) {
  return float(hashU(uvec2(p)) >> 8) / 16777216.0;
}
`;

/** `float valueNoise(vec2)` and `float fbm(vec2)` (5 octaves), both in [0, 1]. Needs GLSL_HASH. */
export const GLSL_NOISE = `
float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = p - cell;
  vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 i = ivec2(cell);
  return mix(
    mix(hash(i), hash(i + ivec2(1, 0)), u.x),
    mix(hash(i + ivec2(0, 1)), hash(i + ivec2(1, 1)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 5; octave++) {
    sum += amplitude * valueNoise(p);
    p = p * 2.03 + vec2(19.7, 7.3);
    amplitude *= 0.5;
  }
  return sum / 0.96875;
}
`;

/**
 * `ivec2 stageCell()`: the frame cell of this fragment, with the origin at the
 * top left, in phase with the DOM dither parts.
 * `vec3 rampPick(float t, ivec2 cell)`: one flat color of `uRamp` for a ramp
 * position in [0, 1]. Between two stops, the ordered threshold picks one.
 * Needs GLSL_BAYER8 and the define RAMP_SIZE.
 */
export const GLSL_RAMP = `
uniform vec3 uRamp[RAMP_SIZE];
uniform vec4 uStage;

ivec2 stageCell() {
  return ivec2(int(uStage.x) + int(gl_FragCoord.x), int(uStage.y) + int(uStage.w) - 1 - int(gl_FragCoord.y));
}

vec3 rampPick(float t, ivec2 cell) {
  float s = clamp(t, 0.0, 1.0) * float(RAMP_SIZE - 1);
  int lower = min(int(s), RAMP_SIZE - 2);
  return (s - float(lower)) > bayer8(cell) ? uRamp[lower + 1] : uRamp[lower];
}
`;

/** A quad that covers the stage. Use it with `<planeGeometry args={[2, 2]} />`. */
export const FULLSCREEN_VERTEX = `
in vec3 position;
out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
