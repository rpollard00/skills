// GLSL ES 3.00, compiled through RawShaderMaterial so three.js injects no
// tone mapping or colour-space code: palette bytes reach the framebuffer as-is.

export const flowVertexShader = /* glsl */ `
in vec3 position;

void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const flowFragmentShader = /* glsl */ `
precision highp float;
precision highp int;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uPalette[PALETTE_SIZE];

out vec4 outColor;

// Integer hash: bit-exact on every GL backend, unlike fract(sin()).
uint hash(uvec2 p) {
  uint h = p.x * 0x9E3779B1u ^ p.y * 0x85EBCA77u;
  h ^= h >> 15;
  h *= 0x2C1B3C6Du;
  h ^= h >> 12;
  h *= 0x297A2D39u;
  h ^= h >> 15;
  return h;
}

float lattice(ivec2 p) {
  return float(hash(uvec2(p)) >> 8) / 16777216.0;
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = p - cell;
  vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 i = ivec2(cell);
  return mix(
    mix(lattice(i), lattice(i + ivec2(1, 0)), u.x),
    mix(lattice(i + ivec2(0, 1)), lattice(i + ivec2(1, 1)), u.x),
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

const int BAYER_4X4[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);

float bayerThreshold(ivec2 pixel) {
  ivec2 m = pixel & 3;
  return (float(BAYER_4X4[m.y * 4 + m.x]) + 0.5) / 16.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = gl_FragCoord.xy / uResolution.y * 3.0;

  vec2 drift = vec2(uTime * 0.9, 0.0);
  vec2 warp = vec2(
    fbm(p - drift * 0.35 + vec2(0.0, uTime * 0.15)),
    fbm(p - drift * 0.2 + vec2(5.2, 1.3))
  );
  float stream = fbm(vec2(p.x * 0.55, p.y * 2.2) - drift + (warp - 0.5) * 1.6);

  float centre = 0.5 + (warp.x - 0.5) * 0.35;
  float band = exp(-pow((uv.y - centre) / 0.26, 2.0));
  float energy = clamp(pow(stream, 1.5) * band * 2.1, 0.0, 1.0);

  float level = energy * float(PALETTE_SIZE - 1);
  int index = min(int(level + bayerThreshold(ivec2(gl_FragCoord.xy))), PALETTE_SIZE - 1);
  outColor = vec4(uPalette[index], 1.0);
}
`;
