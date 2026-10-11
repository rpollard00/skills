import type { CableView, NodeTone } from "../shared/view/scene";

export const TIMING = {
  nodeTravelSeconds: 0.4,
  cableFadeSeconds: 0.1,
  fadeInSeconds: 0.14,
  growGapSeconds: 0.012,
  growBaseSeconds: 0.26,
  growSecondsPerPx: 1 / 2400,
  growMaxSeconds: 0.55,
  headTravelSeconds: 0.45,
  stepGapSeconds: 0.15,
  stepTravelSeconds: 0.42,
  portMarkSeconds: 0.1,
  mapSettleSeconds: 0.18,
  chipTextSeconds: 0.12,
  chipTextDelaySeconds: 0.08,
  ringOnceSeconds: 0.55,
  gestureWindowMs: 120,
} as const;

export const GROW_EASE = [0.25, 0.5, 0.6, 1] as const;

export const QUICK_SPRING = { type: "spring", stiffness: 520, damping: 30, mass: 0.7 } as const;
export const TRAVEL_SPRING = { type: "spring", duration: TIMING.nodeTravelSeconds, bounce: 0 } as const;
export const CAMERA_SPRING = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const;
export const AT_ONCE = { duration: 0 } as const;

export interface CableTiming {
  readonly delaySeconds: number;
  readonly travelSeconds: number;
}

const growTiming = (order: number, lengthPx: number): CableTiming => ({
  delaySeconds: order * TIMING.growGapSeconds,
  travelSeconds: Math.min(TIMING.growMaxSeconds, TIMING.growBaseSeconds + lengthPx * TIMING.growSecondsPerPx),
});

const stepTiming = (order: number): CableTiming =>
  order === 0
    ? { delaySeconds: 0, travelSeconds: TIMING.headTravelSeconds }
    : { delaySeconds: TIMING.headTravelSeconds + (order - 1) * TIMING.stepGapSeconds, travelSeconds: TIMING.stepTravelSeconds };

export const cableTiming = (cable: Pick<CableView, "tone" | "order" | "length">): CableTiming =>
  cable.tone === "step" ? stepTiming(cable.order) : growTiming(cable.order, cable.length);

export const arrivalSeconds = (timing: CableTiming): number => timing.delaySeconds + timing.travelSeconds;

export const glyphArrivalSeconds = (tone: NodeTone): number => {
  if (tone.kind === "needs") return arrivalSeconds(growTiming(tone.order, tone.length));
  if (tone.kind === "step") return arrivalSeconds(stepTiming(tone.order));
  return 0;
};
