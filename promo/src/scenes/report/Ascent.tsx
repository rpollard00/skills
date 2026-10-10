import type { FC } from "react";
import { Vector2 } from "three";
import { FULLSCREEN_VERTEX, PixelStage, RampMaterial } from "../../gl";
import { Box, clamp01, easeOutCubic } from "../../kit";
import { COVER_COLORS, ENERGY, GRID, type Hex } from "../../theme";

const RAMP: readonly Hex[] = [ENERGY[1], ENERGY[2], COVER_COLORS.energy, ENERGY[4], COVER_COLORS.paper];

const FRAME_ASPECT = GRID.cols / GRID.rows;
const HALF_ROWS = GRID.rows / 2;

const OPEN_RIM = 48;

const FRAGMENT = `
uniform float uOpen;
uniform float uTravel;
uniform vec2 uDay;
uniform float uAspect;
uniform float uLift;
uniform vec2 uCenter;

const float DEEP = 0.0;
const float BODY = 0.25;
const float FLOOD = 0.5;
const float LIGHT = 0.75;
const float DAY = 1.0;

const float TAU = 6.28318530718;
const int RIBBONS = 40;
const float FOCAL = 60.0;
const float SHAFT_LEVELS = 6.0;
const float OPEN_RIM = ${OPEN_RIM.toFixed(1)};
const float FRAME_ASPECT = ${FRAME_ASPECT.toFixed(6)};

float pick(int ribbon, int salt, float least, float most) {
  return mix(least, most, hash(ivec2(ribbon, salt)));
}

void shade(out float t, out float a) {
  a = 1.0;
  ivec2 cell = stageCell();
  float threshold = bayer8(cell);
  vec2 p = vec2(cell) + 0.5 - uCenter;

  float sun = max(abs(p.x) / uAspect, abs(p.y));
  float day = sun < uDay.x ? 1.0 : (uDay.y - sun) / max(uDay.y - uDay.x, 0.001);
  if (day > threshold) {
    t = DAY;
    return;
  }

  if ((uOpen - max(abs(p.x) / FRAME_ASPECT, abs(p.y))) / OPEN_RIM <= threshold) {
    t = FLOOD;
    return;
  }

  float square = max(abs(p.x), abs(p.y));
  float shaft = max(smoothstep(18.0, 124.0, square), uLift);
  t = mix(DEEP, BODY, floor(shaft * SHAFT_LEVELS + 0.5) / SHAFT_LEVELS);

  float r = length(p);
  float theta = atan(p.y, p.x);
  float nearest = 1.0e9;
  for (int i = 0; i < RIBBONS; i++) {
    float rho = pick(i, 3, 0.7, 1.8);
    if (rho >= nearest || square < pick(i, 23, 20.0, 56.0)) continue;
    float height = uTravel + FOCAL * rho / r;
    float angle = TAU * (float(i) + pick(i, 5, 0.0, 0.7)) / float(RIBBONS) + pick(i, 7, 0.2, 0.55) * height;
    float off = abs(mod(theta - angle + 0.5 * TAU, TAU) - 0.5 * TAU);
    bool dark = hash(ivec2(i, 19)) < 0.2;
    float halfWidth = (dark ? 0.016 : pick(i, 17, 0.014, 0.05)) / rho;
    if (off * r > max(halfWidth * r, 0.7)) continue;
    nearest = rho;
    float along = fract(pick(i, 11, 2.2, 3.4) * height / rho + hash(ivec2(i, 13)));
    t = dark ? DEEP : mix(LIGHT, FLOOD, smoothstep(0.0, 0.7, along));
  }
}
`;

const CENTER = new Vector2(GRID.cols / 2, HALF_ROWS);

const DAY = {
  first: 2,
  atCover: 14,
  full: HALF_ROWS + 1,
  band: 60,
} as const;

const SPEED = { first: 0.016, last: 0.09 } as const;

const climbed = (frames: number, totalFrames: number): number => {
  const growth = Math.log(SPEED.last / SPEED.first) / totalFrames;
  return (SPEED.first / growth) * (Math.exp(growth * frames) - 1);
};

export interface AscentProps {
  readonly frames: number;
  readonly totalFrames: number;
  readonly open: number;
  readonly approach: number;
  readonly cover: number;
}

export const Ascent: FC<AscentProps> = ({ frames, totalFrames, open, approach, cover }) => {
  if (open <= 0) return <Box x={0} y={0} w={GRID.cols} h={GRID.rows} fill={COVER_COLORS.energy} />;
  if (cover >= 1) return <Box x={0} y={0} w={GRID.cols} h={GRID.rows} fill={COVER_COLORS.paper} />;

  const solid =
    cover <= 0
      ? DAY.first + (DAY.atCover - DAY.first) * clamp01(approach) ** 2
      : DAY.atCover + (DAY.full - DAY.atCover) * cover ** 2;
  const dithered = solid + DAY.band * (1 - (1 - cover) ** 2);

  return (
    <PixelStage cols={GRID.cols} rows={GRID.rows}>
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <RampMaterial
          ramp={RAMP}
          vertex={FULLSCREEN_VERTEX}
          fragment={FRAGMENT}
          uniforms={{
            uOpen: easeOutCubic(open) * (HALF_ROWS + OPEN_RIM),
            uTravel: climbed(frames, totalFrames),
            uDay: new Vector2(solid, dithered),
            uAspect: 1 + (FRAME_ASPECT - 1) * cover,
            uLift: clamp01(cover * 2),
            uCenter: CENTER,
          }}
        />
      </mesh>
    </PixelStage>
  );
};
