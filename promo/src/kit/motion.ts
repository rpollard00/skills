import { GRID } from "../theme";

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export const clamp01 = (value: number): number => clamp(value, 0, 1);
export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/** The remainder that is never negative. */
export const mod = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;

/** 0 before `edge`, 1 from it. */
export const step = (edge: number, value: number): number => (value < edge ? 0 : 1);

/** 0 to 1 while `value` goes from `start` to `start + length`, clamped. A length of 0 is a step. */
export const progress = (value: number, start: number, length: number): number =>
  length <= 0 ? step(start, value) : clamp01((value - start) / length);

/** Rounds to `steps` equal levels, so a move lands on whole cells or a fade on whole dither levels. */
export const quantize = (value: number, steps: number): number => Math.round(value * steps) / steps;

/** A time or a length that the clock gives in beats, as whole frames. */
export const framesSince = (beats: number, framesPerBeat: number): number => Math.round(beats * framesPerBeat);

/** 0 to 1 in `frames` equal steps. `age` is frames since the event. The first step is on the frame of the event. */
export const stepped = (age: number, frames: number): number => clamp(Math.floor(age + 1) / frames, 0, 1);

/**
 * `stepped` with no floor and no clamp, for an `age` that is not on a whole frame:
 * `1 / frames` at age 0, and 1 at age `frames - 1`.
 */
export const fullOnLastFrame = (age: number, frames: number): number => (age + 1) / frames;

export const easeInCubic = (t: number): number => clamp01(t) ** 3;
export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};
export const easeOutExpo = (t: number): number => {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - 2 ** (-10 * x);
};
export const easeOutBack = (t: number): number => {
  const x = clamp01(t) - 1;
  return 1 + 2.70158 * x ** 3 + 1.70158 * x ** 2;
};

const bayerMatrix = (size: number): number[][] => {
  if (size === 1) return [[0]];
  const half = bayerMatrix(size / 2);
  return [
    ...half.map((row) => [...row.map((cell) => cell * 4), ...row.map((cell) => cell * 4 + 2)]),
    ...half.map((row) => [...row.map((cell) => cell * 4 + 3), ...row.map((cell) => cell * 4 + 1)]),
  ];
};

/** The 8x8 ordered matrix, row by row, values 0 to 63. */
export const BAYER_8: readonly number[] = bayerMatrix(8).flat();

/** The ordered threshold of a cell, in (0, 1). Paint where a level is above it. */
export const bayer8 = (x: number, y: number): number => ((BAYER_8[(y & 7) * 8 + (x & 7)] ?? 0) + 0.5) / 64;

/** Seeded random numbers in [0, 1). Call it in `useMemo`, never with a time-based seed. */
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const fnv1a = (text: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
};

const COVER_ORIGINS = ["bottom", "top", "left", "right", "center"] as const;
export type CoverFrom = (typeof COVER_ORIGINS)[number];

/**
 * The dither level of a frame cell for a cover that grows from `from`.
 * At progress 0 no cell is painted. At progress 1 every cell is painted.
 */
export const coverLevel = (from: CoverFrom, coverProgress: number, x: number, y: number): number => {
  const u = x / (GRID.cols - 1);
  const v = y / (GRID.rows - 1);
  const distance = ((): number => {
    switch (from) {
      case "bottom":
        return 1 - v;
      case "top":
        return v;
      case "left":
        return u;
      case "right":
        return 1 - u;
      case "center":
        return Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
      default: {
        const _exhaustive: never = from;
        return _exhaustive;
      }
    }
  })();
  return coverProgress * 2 - distance;
};
