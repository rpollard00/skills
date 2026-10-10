const SHAPING = `
float clean(float level) {
  return floor(clamp(level, 0.0, 1.0) * 4.0 + 0.5) / 4.0;
}

float terrace(float t, float stops, float soft) {
  float s = clamp(t, 0.0, 1.0) * stops;
  float lower = min(floor(s), stops - 1.0);
  return (lower + clean((s - lower - 0.5) / (2.0 * soft) + 0.5)) / stops;
}
`;

const DIMMING = `
uniform float uDimRows;

bool dimmed() {
  return float(stageCell().y) - uStage.y < uDimRows;
}

float lit(float t) {
  float full = 0.25 + 0.75 * clamp(t, 0.0, 1.0);
  return dimmed() ? max(floor(full * 4.0 + 0.5) / 4.0 - 0.75, 0.0) : full;
}

float cover(float a) {
  return dimmed() ? step(0.5, a) : a;
}
`;

export const SKY_VERTEX = `
in vec3 position;

void main() {
  gl_Position = vec4(position.xy * 2.0 - 1.0, 0.99999, 1.0);
}
`;

export const SKY_FRAGMENT = `
${DIMMING}
uniform float uHorizon;
uniform float uSkyRows;
uniform vec2 uStops;
uniform float uStars;
uniform float uDrift;

void shade(out float t, out float a) {
  ivec2 cell = stageCell();
  int row = cell.y - int(uStage.y);
  float above = uHorizon - float(row) - 0.5;
  float s = clamp(1.0 - above / uSkyRows, 0.0, 1.0) * uStops.y;
  float sky = s < uStops.x ? s / uStops.x : 1.0 + (s - uStops.x) / (uStops.y - uStops.x);
  t = min(sky, dimmed() ? 1.0 : 2.0) / 3.0;
  a = 1.0;
  ivec2 star = ivec2(cell.x - int(uDrift), int(uHorizon) - row);
  if (uStars > 0.0 && above > 0.5 * uSkyRows && hash(star) > 1.0 - uStars) t = 1.0;
}
`;

export const RIDGE_VERTEX = `
in vec3 position;

uniform mat4 uViewProjection;
uniform vec3 uSlab;

out vec2 vWorld;

void main() {
  vec3 world = vec3((position.x * 2.0 - 1.0) * uSlab.y, position.y * uSlab.z, uSlab.x);
  vWorld = world.xy;
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

export const RIDGE_FRAGMENT = `
uniform vec4 uShape;
uniform vec3 uPhase;

in vec2 vWorld;

void shade(out float t, out float a) {
  float u = vWorld.x / uShape.w * 6.2832;
  float wave =
    sin(u * uShape.z + uPhase.x) * 0.6 +
    sin(u * uShape.z * 2.3 + uPhase.y) * 0.3 +
    sin(u * uShape.z * 5.1 + uPhase.z) * 0.1;
  t = 0.0;
  a = vWorld.y <= uShape.x + uShape.y * wave ? 1.0 : 0.0;
}
`;

export const GROUND_VERTEX = `
in vec3 position;

uniform mat4 uViewProjection;
uniform vec3 uField;

out vec2 vGround;

void main() {
  vec3 world = vec3((position.x * 2.0 - 1.0) * uField.x, 0.0, mix(uField.y, uField.z, position.y));
  vGround = world.xz;
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

export const GROUND_FRAGMENT = `
${SHAPING}
uniform float uTime;
uniform vec3 uMouth;

in vec2 vGround;

void shade(out float t, out float a) {
  float r = length(vGround);
  a = 1.0;
  if (r < uMouth.x) {
    float ring = 0.5 + 0.5 * sin(r * 2.4 - uTime * 3.0);
    t = 0.75 + 0.25 * clean(0.35 + 0.9 * ring * (r / uMouth.x));
  } else if (r < uMouth.y) {
    t = 0.5;
  } else {
    float reach = clamp(1.0 - (r - uMouth.y) / (uMouth.z - uMouth.y), 0.0, 1.0);
    t = terrace(reach * reach * 0.5, 4.0, 0.5);
  }
}
`;

export const CORE_VERTEX = `
in vec3 position;

uniform mat4 uViewProjection;
uniform vec3 uRight;
uniform vec2 uCore;

out vec2 vCore;

void main() {
  float side = position.x * 2.0 - 1.0;
  float height = position.y * uCore.y;
  vCore = vec2(side, height);
  gl_Position = uViewProjection * vec4(uRight * side * uCore.x + vec3(0.0, height, 0.0), 1.0);
}
`;

export const CORE_FRAGMENT = `
${SHAPING}
${DIMMING}
uniform float uTime;
uniform vec2 uCore;

in vec2 vCore;

void shade(out float t, out float a) {
  float height = vCore.y;
  float along = height / uCore.y;
  float width = mix(0.5, 1.0, smoothstep(0.0, 0.35, along));
  float sway = (valueNoise(vec2(height * 0.09 - uTime * 0.45, 5.0)) - 0.5) * 0.5 * smoothstep(0.0, 0.3, along);
  float x = (vCore.x - sway) / width;
  float d = abs(x);
  float flow = height * 0.3 - uTime * 2.4;
  float strand = valueNoise(vec2(x * 3.0 + 11.0, flow)) * 0.6 + valueNoise(vec2(x * 8.0, flow * 2.1 + 3.0)) * 0.4;
  float pulse = 0.5 + 0.5 * sin(height * 0.55 - uTime * 5.0);
  t = lit(terrace((1.0 - d) * 1.15 + (strand - 0.5) * 1.1 + pulse * 0.12 - 0.05, 3.0, 0.3));
  float edge = (1.0 - d) * 2.4 + (strand - 0.5) * 2.0;
  float top = 1.0 - smoothstep(0.55, 1.0, along);
  a = d >= 1.0 ? 0.0 : cover(clean(min(edge, top * 1.6)));
}
`;

export const RIBBON_VERTEX = `
in vec3 position;
in vec4 aRibbon;
in vec4 aStyle;

uniform mat4 uViewProjection;
uniform vec4 uStage;
uniform vec2 uToCamera;
uniform float uTime;
uniform vec3 uColumn;
uniform float uCellsPerUnit;

out float vSide;
out float vAlong;
out float vHeight;
out float vFront;
out vec2 vStyle;

vec3 pathAt(float height) {
  float theta = aRibbon.x + aRibbon.w * height + aRibbon.z * uTime;
  float sway = sin(0.33 * height + aStyle.x + 1.1 * uTime);
  float open = mix(0.5, 1.0, smoothstep(0.0, 7.0, height)) * (1.0 + 0.012 * max(height, 0.0));
  float rho = aRibbon.y * uColumn.y * open * (1.0 + 0.2 * sway);
  return vec3(rho * cos(theta), height, rho * sin(theta));
}

void main() {
  float height = uColumn.z + position.y * (uColumn.x - uColumn.z);
  vec3 center = pathAt(height);
  vec4 here = uViewProjection * vec4(center, 1.0);
  vec4 ahead = uViewProjection * vec4(pathAt(height + 0.3), 1.0);
  vec2 halfStage = 0.5 * uStage.zw;
  vec2 run = (ahead.xy / ahead.w - here.xy / here.w) * halfStage;
  float runLength = length(run);
  vec2 across = runLength > 0.00001 ? vec2(-run.y, run.x) / runLength : vec2(1.0, 0.0);
  float front = dot(normalize(center.xz + vec2(0.00001)), uToCamera);
  float taper = smoothstep(0.0, 0.06, position.y) * (1.0 - 0.55 * position.y);
  float halfCells = max(aStyle.y * taper * (0.5 + 0.5 * abs(front)) * uCellsPerUnit / max(here.w, 0.5), 0.75);
  float side = position.x * 2.0 - 1.0;
  here.xy += across * side * halfCells / halfStage * here.w;

  vSide = side;
  vAlong = position.y;
  vHeight = height;
  vFront = front;
  vStyle = aStyle.xz;
  gl_Position = here;
}
`;

export const RIBBON_FRAGMENT = `
${SHAPING}
${DIMMING}
uniform float uTime;

in float vSide;
in float vAlong;
in float vHeight;
in float vFront;
in vec2 vStyle;

void shade(out float t, out float a) {
  float band = fract(0.07 * vHeight - vStyle.y * uTime + vStyle.x);
  float head = smoothstep(0.45, 0.95, band);
  float light = 0.36 + 0.24 * vFront + 0.5 * head - 0.3 * step(0.62, abs(vSide));
  t = lit(terrace(light, 3.0, 0.3));
  a = cover(clean((1.0 - smoothstep(0.5, 1.0, vAlong)) * 1.3));
}
`;

export const MOTE_VERTEX = `
in vec3 position;
in vec4 aMote;
in float aPhase;

uniform mat4 uViewProjection;
uniform vec4 uStage;
uniform float uTime;
uniform vec2 uRise;

out float vLife;
out float vPhase;

void main() {
  float height = mod(aMote.y + aMote.w * uTime, uRise.x);
  float x = aMote.x + 0.3 * sin(0.7 * uTime + aPhase);
  vec4 clip = uViewProjection * vec4(x, height, aMote.z, 1.0);
  float size = clip.w < uRise.y ? 2.0 : 1.0;
  vec2 cell = floor((clip.xy / clip.w * 0.5 + 0.5) * uStage.zw);
  vec2 ndc = (cell + position.xy * size) / uStage.zw * 2.0 - 1.0;
  vLife = height / uRise.x;
  vPhase = aPhase;
  gl_Position = clip.w > 0.2 ? vec4(ndc * clip.w, clip.z, clip.w) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

export const MOTE_FRAGMENT = `
${SHAPING}
${DIMMING}
uniform float uTime;
uniform vec2 uLevels;

in float vLife;
in float vPhase;

void shade(out float t, out float a) {
  t = lit(fract(vPhase * 3.7 + uTime * 0.8) < 0.6 ? uLevels.x : uLevels.y);
  a = cover(clean((1.0 - smoothstep(0.6, 1.0, vLife)) * smoothstep(0.0, 0.04, vLife) * 1.4));
}
`;
