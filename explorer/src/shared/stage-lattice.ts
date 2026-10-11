import { captionWidth, FOCUS, type Arrangement, type Row } from "./focus-layout";
import { corners, FRAME, type Point } from "./layout";
import type { NodeId } from "./model";

/**
 * The columns of a focus arrangement from left to right, and the one upright channel in each gutter.
 * `lanes[i]` is the channel on the left of column `i`, so there is one lane more than there are columns.
 */
export interface Lattice {
  readonly columns: readonly LatticeColumn[];
  readonly lanes: readonly number[];
  readonly columnOf: ReadonlyMap<NodeId, number>;
}

export interface LatticeColumn {
  /** The left end and the right end of everything that the column draws: ports, labels, and captions. */
  readonly start: number;
  readonly end: number;
  /** A column of the left zone has its ports and its glyphs on the right. */
  readonly isMirrored: boolean;
}

const rowOf = (arrangement: Arrangement, id: NodeId): Row | undefined => {
  const placed = arrangement.nodes.get(id);
  const host = placed?.kind === "pip" ? arrangement.nodes.get(placed.host) : placed;
  return host?.kind === "row" ? host : undefined;
};

/**
 * The channel of the gutter between two columns: the upright of the arrangement that is there.
 * A gutter that the arrangement leaves empty gets a channel beside the column that is nearer to the selected node.
 */
const channelBetween = (left: LatticeColumn, right: LatticeColumn, uprights: readonly number[]): number =>
  uprights.find((x) => x > left.end && x < right.start) ?? (left.isMirrored ? right.start - FOCUS.columnToLane : left.end + FOCUS.columnToLane);

/** Pure. */
export const latticeOf = (arrangement: Arrangement): Lattice => {
  const byGlyph = new Map<number, Row[]>();
  for (const placed of arrangement.nodes.values()) {
    if (placed.kind !== "row") continue;
    byGlyph.set(placed.centre.x, [...(byGlyph.get(placed.centre.x) ?? []), placed]);
  }
  const glyphs = [...byGlyph.keys()].sort((a, b) => a - b);
  const columns = glyphs.map((glyph): LatticeColumn => {
    const rows = byGlyph.get(glyph) ?? [];
    const isMirrored = rows.some((row) => row.mirrored);
    const captions = arrangement.captions.filter((caption) => caption.column === glyph);
    const captionEnds = captions.map((caption) => caption.at.x + (isMirrored ? -1 : 1) * captionWidth(caption.group, caption.count));
    return {
      start: Math.min(...rows.map((row) => Math.min(row.left.x, row.label.x)), ...(isMirrored ? captionEnds : [])),
      end: Math.max(...rows.map((row) => Math.max(row.right.x, row.label.x + row.label.width)), ...(isMirrored ? [] : captionEnds)),
      isMirrored,
    };
  });

  const uprights = [...arrangement.cables.values()].flatMap((cable) =>
    cable.points.flatMap((point, index) => {
      const before = cable.points[index - 1];
      return before !== undefined && before.x === point.x && before.y !== point.y ? [point.x] : [];
    }),
  );
  const lanes = Array.from({ length: columns.length + 1 }, (_, gutter) => {
    const left = columns[gutter - 1];
    const right = columns[gutter];
    if (left === undefined) return (right?.start ?? 0) - FOCUS.columnToLane;
    if (right === undefined) return left.end + FOCUS.columnToLane;
    return channelBetween(left, right, uprights);
  });

  const columnOf = new Map<NodeId, number>();
  for (const id of arrangement.nodes.keys()) {
    const row = rowOf(arrangement, id);
    if (row !== undefined) columnOf.set(id, glyphs.indexOf(row.centre.x));
  }
  return { columns, lanes, columnOf };
};

/**
 * Pure. The corners of a cable between two nodes that stay where they are, from the source to the target.
 * Null when the two nodes share a row, and when one of them is not on the stage.
 */
export const routeInPlace = (arrangement: Arrangement, lattice: Lattice, from: NodeId, to: NodeId): Point[] | null => {
  const source = rowOf(arrangement, from);
  const target = rowOf(arrangement, to);
  const p = lattice.columnOf.get(from);
  const q = lattice.columnOf.get(to);
  if (source === undefined || target === undefined || p === undefined || q === undefined || source === target) return null;
  const lane = (gutter: number): number => lattice.lanes[gutter] ?? 0;
  const street = target.centre.y - FRAME.pitch / 2;
  const y = { out: source.centre.y, in: target.centre.y };

  if (p === q) {
    const loopsOnTheLeft = lattice.columns[p]?.isMirrored ?? false;
    const x = lane(loopsOnTheLeft ? p : p + 1);
    const [leave, enter] = loopsOnTheLeft ? [source.left, target.left] : [source.right, target.right];
    return corners([leave, { x, y: y.out }, { x, y: y.in }, enter]);
  }
  const goesRight = p < q;
  const [leave, enter] = goesRight ? [source.right, target.left] : [source.left, target.right];
  const first = lane(goesRight ? p + 1 : p);
  const last = lane(goesRight ? q : q + 1);
  const across: Point[] = first === last ? [] : [{ x: first, y: street }, { x: last, y: street }];
  return corners([leave, { x: first, y: y.out }, ...across, { x: last, y: y.in }, enter]);
};
