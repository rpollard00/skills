import { distance, FRAME, pathOf, toward, type Point, type Segment } from "./layout";

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

export const WORD_CLEAR = { arrow: 12, gate: GATE.setBack + GATE.radius + 4, corner: 10, word: 2 } as const;

/** A part of a row, from the smaller x to the larger x. */
export interface Span {
  readonly from: number;
  readonly to: number;
}

/**
 * Where a word of a given width sits on a cable that is drawn in place. The word is on the run next to one end of the cable,
 * in the middle of the free part of that run that is nearest to that end. `taken` are the parts that are not free.
 * Null when that run goes up or down, or when no free part has room.
 */
export const wordOn = (points: readonly Point[], near: "start" | "end", width: number, hasGate: boolean, taken: readonly Span[]): Point | null => {
  const fromEnd = near === "end" ? points.toReversed() : points;
  const [end, corner] = fromEnd;
  if (end === undefined || corner === undefined || end.y !== corner.y) return null;
  const direction = Math.sign(corner.x - end.x);
  const awayFromEnd = (x: number): number => (x - end.x) * direction;
  const last = awayFromEnd(corner.x) - WORD_CLEAR.corner;
  const blocks = taken
    .map((span) => ({ from: Math.min(awayFromEnd(span.from), awayFromEnd(span.to)), to: Math.max(awayFromEnd(span.from), awayFromEnd(span.to)) }))
    .sort((a, b) => a.from - b.from);

  let first = hasGate ? WORD_CLEAR.gate : WORD_CLEAR.arrow;
  for (const block of [...blocks, { from: last, to: last }]) {
    const free = Math.min(block.from, last) - first;
    if (free >= width) return { x: end.x + direction * (first + free / 2), y: end.y };
    first = Math.max(first, block.to);
  }
  return null;
};
