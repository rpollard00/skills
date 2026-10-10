import { clamp01, lerp } from "../../kit/motion";
import type { Point } from "./layout";

const FLIGHT = {
  lift: 36,
  pull: 1.4,
  swell: 8,
  pop: 4,
  popLength: 0.1,
  trail: 6,
  trailStep: 0.022,
} as const;

export interface Pose {
  readonly center: Point;
  readonly size: number;
}

const odd = (value: number): number => {
  const whole = Math.round(value);
  return whole % 2 === 1 ? whole : whole + 1;
};

export const flightPose = (args: { readonly from: Point; readonly to: Point; readonly u: number; readonly size: number }): Pose => {
  const { from, to, size } = args;
  const u = clamp01(args.u);
  const along = u ** FLIGHT.pull;
  const arc = 4 * along * (1 - along);
  const pop = FLIGHT.pop * Math.max(0, 1 - u / FLIGHT.popLength);
  return {
    center: {
      x: Math.round(lerp(from.x, to.x, along)),
      y: Math.round(lerp(from.y, to.y, along) - FLIGHT.lift * arc),
    },
    size: odd(size + FLIGHT.swell * arc + pop),
  };
};

export interface Ghost extends Pose {
  readonly level: number;
}

export const flightTrail = (args: { readonly from: Point; readonly to: Point; readonly u: number; readonly size: number }): readonly Ghost[] =>
  Array.from({ length: FLIGHT.trail }, (_, index) => index + 1).flatMap((step) => {
    const u = args.u - step * FLIGHT.trailStep;
    if (u <= 0) return [];
    const pose = flightPose({ ...args, u });
    const fade = 1 - step / (FLIGHT.trail + 1);
    return [{ center: pose.center, size: odd(pose.size * (0.45 + 0.55 * fade)), level: fade }];
  });
