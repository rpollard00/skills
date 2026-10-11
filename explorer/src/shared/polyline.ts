import { distance, FRAME, pathOf, toward, type Point, type Rect, type Segment } from "./layout";

export const pointsOf = (segments: readonly Segment[]): Point[] => {
  const first = segments[0];
  return first === undefined ? [] : [first[0], ...segments.map(([, to]) => to)];
};

export const lengthOf = (points: readonly Point[]): number => {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from !== undefined && to !== undefined) total += distance(from, to);
  }
  return total;
};

/** A part of a line that goes up or down. */
export interface Upright {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
}

export const uprightsOf = (points: readonly Point[]): Upright[] =>
  points.flatMap((point, index) => {
    const before = points[index - 1];
    return before !== undefined && before.x === point.x && before.y !== point.y ? [{ x: point.x, top: Math.min(before.y, point.y), bottom: Math.max(before.y, point.y) }] : [];
  });

/** A line goes through a rect or touches it. */
export const crosses = (points: readonly Point[], rect: Rect): boolean =>
  points.some((point, index) => {
    const before = points[index - 1];
    return (
      before !== undefined &&
      Math.max(before.x, point.x) >= rect.x &&
      Math.min(before.x, point.x) <= rect.x + rect.width &&
      Math.max(before.y, point.y) >= rect.y &&
      Math.min(before.y, point.y) <= rect.y + rect.height
    );
  });

/** The start of an axis-aligned line, as far as a distance along it. The last point is where that distance ends. */
export const headOf = (points: readonly Point[], along: number): Point[] => {
  const head: Point[] = [];
  let left = Math.max(0, along);
  for (const [index, point] of points.entries()) {
    const before = points[index - 1];
    if (before === undefined) {
      head.push(point);
      continue;
    }
    const span = distance(before, point);
    if (span <= left) {
      head.push(point);
      left -= span;
      continue;
    }
    if (left > 0) head.push({ x: before.x + ((point.x - before.x) * left) / span, y: before.y + ((point.y - before.y) * left) / span });
    break;
  }
  return head;
};

/** The path of a cable that has grown to a part of its length: 0 is nothing, 1 is the whole cable. */
export const grownPath = (points: readonly Point[], progress: number): string => {
  const head = headOf(points, lengthOf(points) * progress);
  return head.length < 2 ? "" : pathOf(head);
};

export const tipOf = (points: readonly Point[], progress: number): Point => headOf(points, lengthOf(points) * progress).at(-1) ?? { x: 0, y: 0 };

/** `arrowRoom`: what the arrowhead at the end of a cable takes of its last run, also when a bar sets the arrowhead back. */
export const GATE = { radius: 3, setBack: 15, arrowRoom: 11 } as const;

/**
 * Where the gate of a conditional cable sits, next to one end of the cable: the first of these places that `isFree`.
 * On the run next to that end, when the run has room. For a run that is too short: on the bend after it,
 * then in the middle of the straight part of the run. Null when no place is free.
 */
export const gateOn = (points: readonly Point[], near: "start" | "end", isFree: (spot: Point) => boolean): Point | null => {
  const fromEnd = near === "end" ? points.toReversed() : points;
  const [end, corner, beyond] = fromEnd;
  if (end === undefined || corner === undefined) return null;
  const run = distance(end, corner);
  const places: Point[] = [];
  if (beyond === undefined || run >= GATE.setBack + GATE.radius + FRAME.corner) {
    places.push(toward(end, corner, Math.min(GATE.setBack, run / 2)));
  } else {
    places.push(toward(corner, beyond, Math.min(FRAME.corner + GATE.radius + 2, distance(corner, beyond) / 2)));
    const straightFrom = near === "end" ? GATE.arrowRoom : 0;
    const straightTo = run - Math.min(FRAME.corner, run / 2);
    if (straightTo - straightFrom >= GATE.radius * 2) places.push(toward(end, corner, (straightFrom + straightTo) / 2));
  }
  return places.find(isFree) ?? null;
};
