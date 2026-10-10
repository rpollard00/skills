const INDEX = `
float stop(float index) {
  return index / float(RAMP_SIZE - 1);
}
`;

export const SCREEN_VERTEX = `
in vec3 position;
uniform float uDepth;
out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, uDepth * 0.99999, 1.0);
}
`;

export const SKY_FRAGMENT = `
in vec2 vUv;
uniform float uGlow;

void shade(out float t, out float a) {
  float down = 1.0 - vUv.y;
  float middle = 1.0 - min(1.0, abs(vUv.x - 0.5) * 3.2);
  a = 1.0;
  t = clamp(0.42 * down * down + 0.06 * down + 0.5 * middle * middle * (0.5 + 0.6 * down) + uGlow, 0.0, 1.0);
}
`;

export const STREAM_VERTEX = `
in vec3 position;
uniform mat4 uViewProjection;
uniform vec4 uPlane;
out vec2 vPlane;
out float vUp;

void main() {
  vec3 world = vec3((position.x * 2.0 - 1.0) * uPlane.x, mix(uPlane.y, uPlane.z, position.y), uPlane.w);
  vPlane = world.xy;
  vUp = position.y;
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

export const STREAM_FRAGMENT = `
in vec2 vPlane;
in float vUp;
uniform vec4 uPlane;
uniform vec4 uShape;
uniform float uTime;

void shade(out float t, out float a) {
  int seed = int(uShape.y);
  t = 0.0;
  a = 0.0;
  for (int index = 0; index < 24; index++) {
    if (float(index) >= uShape.x) break;
    float place = hash(ivec2(index, seed));
    float reach = hash(ivec2(index, seed + 7));
    float bend = hash(ivec2(index, seed + 13));
    float girth = hash(ivec2(index, seed + 29));
    float top = 0.5 + 0.5 * reach;
    if (vUp > top) continue;
    float along = vUp / top;
    float sway = uShape.w * (0.4 + bend) * sin(0.16 * (0.6 + girth) * vPlane.y + 6.283 * reach + (0.25 + 0.4 * bend) * uTime);
    float middle = (place * 2.0 - 1.0) * uPlane.x + sway * along;
    float halfWidth = uShape.z * (0.5 + girth) * (1.0 - 0.75 * along);
    if (abs(vPlane.x - middle) < halfWidth) {
      t = fract(0.06 * vPlane.y - (0.35 + 0.5 * place) * uTime + bend);
      a = 1.0 - along * along * along;
    }
  }
}
`;

export const MOTE_FRAGMENT = `
in vec2 vUv;
uniform float uSeconds;
uniform float uLevel;

void shade(out float t, out float a) {
  ivec2 cell = stageCell();
  int column = cell.x / 2;
  t = 0.0;
  a = 0.0;
  if (hash(ivec2(column, 17)) >= 0.3 * uLevel) return;
  float speed = 70.0 + 130.0 * hash(ivec2(column, 31));
  float pitch = 60.0 + 90.0 * hash(ivec2(column, 53));
  float row = mod(float(cell.y) + floor(uSeconds * speed) + pitch * hash(ivec2(column, 71)), pitch);
  if (row < 6.0) {
    a = 1.0;
    t = row < 2.0 ? 1.0 : 0.0;
  }
}
`;

export const RISE_FRAGMENT = `
in vec2 vUv;
uniform float uRise;

void shade(out float t, out float a) {
  a = 0.7 * clamp((0.75 * uRise - vUv.y) / 0.5, 0.0, 1.0);
  t = 0.0;
}
`;

export const FLASH_FRAGMENT = `
in vec2 vUv;
uniform float uLevel;

void shade(out float t, out float a) {
  a = uLevel;
  t = 1.0;
}
`;

export const FLOOR_VERTEX = `
in vec3 position;
uniform mat4 uViewProjection;
out vec2 vPlane;

void main() {
  vPlane = position.xz;
  gl_Position = uViewProjection * vec4(position, 1.0);
}
`;

export const FLOOR_FRAGMENT = `
${INDEX}
in vec2 vPlane;
uniform float uRadius;
uniform float uGlow;
uniform vec2 uRing;

void shade(out float t, out float a) {
  float r = length(vPlane);
  a = 1.0;
  if (uRing.y > 0.0 && abs(r - uRing.x) < 1.0) {
    t = uRing.y > bayer8(stageCell()) ? stop(4.0) : stop(1.0);
    return;
  }
  if (r > uRadius - 0.7) {
    t = stop(2.0);
    return;
  }
  float near = 1.0 - clamp(r / uRadius, 0.0, 1.0);
  t = clamp(near * near * (0.4 + 0.5 * uGlow) + 0.02, 0.0, 0.74);
}
`;

const GATE_MOTION = `
uniform mat4 uViewProjection;
uniform float uSplit[3];
uniform float uLift[3];
uniform vec3 uShake;

vec3 gateWorld(vec3 local, float level, float side) {
  int index = int(level + 0.5);
  return local + vec3(side * uSplit[index], uLift[index], 0.0) + uShake;
}
`;

export const GATE_VERTEX = `
in vec3 position;
in vec3 aMeta;
in vec3 aEdge;
${GATE_MOTION}
out float vFace;
out vec3 vEdge;

void main() {
  vFace = aMeta.x;
  vEdge = aEdge;
  gl_Position = uViewProjection * vec4(gateWorld(position, aMeta.y, aMeta.z), 1.0);
}
`;

export const GATE_FRAGMENT = `
${INDEX}
in float vFace;
in vec3 vEdge;

void shade(out float t, out float a) {
  float face = floor(vFace + 0.5);
  a = 1.0;
  t = stop(face);
  if (face == 1.0) {
    vec3 cell = fwidth(vEdge);
    if (vEdge.z < 2.0 * cell.z) t = stop(4.0);
    else if (vEdge.x < cell.x || vEdge.y < cell.y) t = stop(3.0);
  }
}
`;

export const SEAL_VERTEX = `
in vec3 position;
in vec3 aMeta;
in vec2 aLocal;
${GATE_MOTION}
out vec2 vLocal;
out float vLevel;

void main() {
  vLocal = aLocal;
  vLevel = aMeta.y;
  gl_Position = uViewProjection * vec4(gateWorld(position, aMeta.y, aMeta.z), 1.0);
}
`;

export const SEAL_FRAGMENT = `
${INDEX}
in vec2 vLocal;
in float vLevel;
uniform float uCover[3];
uniform float uLit[3];
uniform float uFail[3];
uniform float uSeam;
uniform float uTime;
uniform float uCharge;

void shade(out float t, out float a) {
  int level = int(vLevel + 0.5);
  ivec2 cell = stageCell();
  float reach = abs(vLocal.x);
  float edge = 1.0 - uCover[level];
  vec2 px = fwidth(vLocal);
  a = 1.0;

  if (1.0 - reach < px.x || vLocal.y < px.y || 1.0 - vLocal.y < px.y) {
    t = stop(8.0);
    return;
  }

  if (uCover[level] > 0.0 && reach >= edge) {
    bool seam = uLit[level] < 0.5 && reach - edge < uSeam;
    bool dark = (((cell.x >> 1) + (cell.y >> 1)) & 1) == 0;
    float index = seam && dark ? 5.0 : 4.0;
    if (uFail[level] > bayer8(cell)) index = 6.0;
    t = stop(index);
    return;
  }
  if (uLit[level] < 0.5) {
    t = stop(7.0);
    return;
  }
  float flow = fract(2.0 * vLocal.y - 1.5 * uTime + 0.3 * sin(9.0 * vLocal.x));
  t = clamp(0.15 + 0.85 * flow + uCharge, 0.0, 1.0) * stop(3.0);
}
`;

export const CORE_VERTEX = `
in vec3 position;
uniform mat4 uViewProjection;
uniform vec3 uShake;
uniform vec4 uShape;
out vec2 vAcross;
out float vHeight;

void main() {
  vec3 world = vec3((position.x * 2.0 - 1.0) * uShape.x, mix(uShape.y, uShape.z, position.y), uShape.w) + uShake;
  vAcross = vec2(position.x * 2.0 - 1.0, position.y);
  vHeight = world.y;
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

export const CORE_FRAGMENT = `
in vec2 vAcross;
in float vHeight;
uniform float uTime;
uniform vec2 uLevel;
uniform float uSoft;
uniform float uSlabs;

void shade(out float t, out float a) {
  float flow = fract(0.22 * vHeight - 1.5 * uTime + 0.25 * sin(5.0 * vAcross.x));
  float side = abs(vAcross.x);
  float lane = floor(vAcross.x * 3.0);
  float slab = fract(0.045 * vHeight - 0.5 * uTime + 0.37 * lane);
  a = 1.0 - uSoft * side * side * side;
  t = uSlabs > 0.5 && slab > 0.72 ? 1.0 : mix(uLevel.x, uLevel.y, flow);
}
`;

export const PRISM_VERTEX = `
in vec3 position;
in float aFace;
uniform mat4 uViewProjection;
uniform vec3 uBase;
uniform vec2 uSize;
out float vFace;
out float vUp;

void main() {
  vFace = aFace;
  vUp = position.y;
  vec3 world = uBase + vec3(position.x * uSize.x, position.y * uSize.y, position.z * uSize.x);
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

export const PRISM_FRAGMENT = `
${INDEX}
in float vFace;
in float vUp;
uniform float uAlpha;
uniform vec2 uBand;

void shade(out float t, out float a) {
  a = uAlpha;
  float face = floor(vFace + 0.5);
  bool band = face < 1.5 && vUp > uBand.x && vUp < uBand.y;
  t = stop(band ? 3.0 : face);
}
`;

export const BEAM_VERTEX = `
in vec3 position;
uniform mat4 uViewProjection;
uniform vec3 uFrom;
uniform vec3 uTo;
uniform vec3 uUp;
uniform float uHalf;
out float vAlong;

void main() {
  vAlong = position.x;
  vec3 world = mix(uFrom, uTo, position.x) + uUp * position.y * uHalf;
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

export const BEAM_FRAGMENT = `
${INDEX}
in float vAlong;
uniform vec2 uSpan;
uniform vec2 uDash;
uniform float uTone;
uniform float uAlpha;

void shade(out float t, out float a) {
  bool inside = vAlong >= uSpan.x && vAlong <= uSpan.y;
  bool gap = uDash.x > 0.0 && fract(vAlong * uDash.x - uDash.y) > 0.5;
  a = inside && !gap ? uAlpha : 0.0;
  t = stop(uTone);
}
`;

export const BILLBOARD_VERTEX = `
in vec3 position;
uniform mat4 uViewProjection;
uniform vec3 uAt;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec2 uHalf;
out vec2 vUv;

void main() {
  vUv = position.xy;
  vec3 world = uAt + uRight * position.x * uHalf.x + uUp * position.y * uHalf.y;
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

export const SPARK_FRAGMENT = `
${INDEX}
in vec2 vUv;
uniform float uAge;
uniform float uTone;
uniform float uRays;

void shade(out float t, out float a) {
  vec2 p = abs(vUv);
  float reach = max(p.x, p.y);
  float thin = min(p.x, p.y);
  t = stop(uTone);
  if (uRays > 0.5) {
    float tip = 0.3 + 0.7 * uAge;
    bool straight = thin < 0.11 && reach < tip && reach > tip - 0.35;
    bool slanted = abs(p.x - p.y) < 0.11 && reach < 0.72 * tip && reach > 0.72 * tip - 0.25;
    a = straight || slanted ? 1.0 - uAge * uAge : 0.0;
    return;
  }
  bool core = uAge < 0.12 && reach < 0.3;
  bool ring = abs(reach - (0.3 + 0.7 * uAge)) < 0.12;
  a = core ? 1.0 : ring ? 1.0 - uAge : 0.0;
}
`;

export const SCAN_FRAGMENT = `
${INDEX}
in vec2 vUv;
uniform float uAlpha;

void shade(out float t, out float a) {
  float up = vUv.y * 0.5 + 0.5;
  a = up < 0.14 ? uAlpha : uAlpha * 0.55 * (1.0 - up);
  t = stop(up < 0.14 ? 1.0 : 0.0);
}
`;

export const WIRE_VERTEX = `
in vec3 position;
uniform mat4 uViewProjection;
out float vHeight;

void main() {
  vHeight = position.y;
  gl_Position = uViewProjection * vec4(position, 1.0);
}
`;

export const WIRE_FRAGMENT = `
in float vHeight;
uniform float uReveal;
uniform float uAlpha;

void shade(out float t, out float a) {
  a = vHeight >= uReveal ? uAlpha : 0.0;
  t = 1.0;
}
`;
