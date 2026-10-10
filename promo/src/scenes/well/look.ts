import { ENERGY, SKIES, type Hex } from "../../theme";

export interface RidgeShape {
  readonly z: number;
  readonly base: number;
  readonly amp: number;
  readonly freq: number;
  readonly span: number;
  readonly color: Hex;
}

export interface WellLook {
  readonly sky: readonly [Hex, Hex, Hex, Hex];
  readonly stops: readonly [middle: number, horizon: number];
  /** Rows from the top stop down to the horizon. `null`: the top stop is the top row of the stage. */
  readonly skyRows: number | null;
  readonly stars: number;
  readonly ridges: readonly [back: RidgeShape, front: RidgeShape];
  readonly ground: readonly [Hex, Hex, Hex, Hex, Hex];
  readonly pool: number;
  readonly moteLevels: readonly [number, number];
  readonly ribbonCount: number;
  readonly moteCount: number;
  readonly spread: number;
  readonly flow: number;
}

export const MOUTH = { inner: 6, outer: 7 } as const;

export const NIGHT: WellLook = {
  sky: [SKIES.night.top, SKIES.night.middle, SKIES.night.horizon, SKIES.night.stars],
  stops: [0.55, 0.85],
  skyRows: 194,
  stars: 0.0015,
  ridges: [
    { z: -60, base: 16.5, amp: 5.5, freq: 1.3, span: 115, color: SKIES.night.hills.back },
    { z: -35, base: 7, amp: 2.8, freq: 2.1, span: 85, color: SKIES.night.hills.front },
  ],
  ground: [SKIES.night.hills.front, ENERGY[0], ENERGY[1], ENERGY[3], ENERGY[4]],
  pool: 24,
  moteLevels: [2 / 3, 1],
  ribbonCount: 18,
  moteCount: 240,
  spread: 1,
  flow: 1,
};

export const DAY: WellLook = {
  sky: [SKIES.day.top, SKIES.day.middle, SKIES.day.horizon, SKIES.day.horizon],
  stops: [0.55, 0.85],
  skyRows: null,
  stars: 0,
  ridges: [
    { z: -60, base: 8.1, amp: 2.2, freq: 1.3, span: 150, color: SKIES.day.hills.back },
    { z: -35, base: 4.4, amp: 0.85, freq: 2.1, span: 110, color: SKIES.day.hills.front },
  ],
  ground: [SKIES.day.hills.front, SKIES.day.hills.front, ENERGY[1], ENERGY[3], ENERGY[4]],
  pool: 8,
  moteLevels: [1 / 3, 2 / 3],
  ribbonCount: 11,
  moteCount: 90,
  spread: 0.9,
  flow: 0.45,
};
