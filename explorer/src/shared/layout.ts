import { COLUMN_IDS, type ColumnId, type Graph, type SeatedNode } from "./graph";
import { relationKey, type Node, type NodeId, type RelationKey } from "./model";

/** The advance of each character of the bundled monospace font, as a part of the font size. */
const MONO_ADVANCE_EM = 0.6;

export const monoAdvance = (fontPx: number): number => Math.round(fontPx * MONO_ADVANCE_EM * 100) / 100;

const LABEL_FONT_PX = 12;
const ROW_PITCH = 24;

/** World units are CSS px at scale 1. */
export const FRAME = {
  width: 1112,
  top: 64,
  bottom: 40,
  pitch: ROW_PITCH,
  minRows: 30,
  labelFontPx: LABEL_FONT_PX,
  charWidth: monoAdvance(LABEL_FONT_PX),
  glyphInset: 7,
  labelInset: 22,
  labelHeight: 14,
  portGap: 6,
  corner: 8,
  pipLead: 9,
  pipPitch: 11,
  pipTail: 3,
  smallFontPx: 10,
  countGap: 4,
  markLead: 8,
  markGap: 4,
  markWidth: { script: 6, command: 11 },
  titleRise: ROW_PITCH,
  lanes: [-25, -15, -5, 5, 15, 25],
  columns: {
    router: { x: 40, width: 96, firstRow: 14 },
    playbooks: { x: 216, width: 148, firstRow: 5 },
    skills: { x: 444, width: 236, firstRow: 0 },
    principles: { x: 760, width: 312, firstRow: 3 },
  },
} as const satisfies {
  readonly columns: { readonly [Column in ColumnId]: { readonly x: number; readonly width: number; readonly firstRow: number } };
  readonly [key: string]: unknown;
};

const RAIL_LANE = FRAME.lanes[0];
const LAST_LANE = FRAME.lanes[5];
const ROUTER_COLUMN = 0;
const LAST_COLUMN = COLUMN_IDS.length - 1;
export const PRINCIPLE_PREFIX = "principle-";
const COUNT_CHAR = monoAdvance(FRAME.smallFontPx);

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect extends Point {
  readonly width: number;
  readonly height: number;
}

export type Segment = readonly [Point, Point];

/** A part of a row, from the smaller x to the larger x. */
export interface Span {
  readonly from: number;
  readonly to: number;
}

/** From the leftmost to the rightmost thing of a row: its two ports and its label. */
export const rowExtent = (row: { readonly left: Point; readonly right: Point; readonly label: Rect }): Span => ({
  from: Math.min(row.left.x, row.label.x),
  to: Math.max(row.right.x, row.label.x + row.label.width),
});

export type MarkKind = keyof typeof FRAME.markWidth;

export interface Seat {
  readonly kind: "seat";
  readonly column: ColumnId;
  readonly row: number;
  /** Centre of the glyph. */
  readonly centre: Point;
  /** The label as drawn. A name longer than the column is cut in the middle. */
  readonly text: string;
  /** Where the text starts. */
  readonly textX: number;
  /** Covers the text, the pips, the count of folded pips, and the tool marks. */
  readonly label: Rect;
  readonly left: Point;
  readonly right: Point;
  readonly marks: readonly { readonly kind: MarkKind; readonly x: number }[];
  /** The hosted files that have no room for a pip of their own: how many, and where the count starts. */
  readonly foldedPips: { readonly count: number; readonly x: number } | null;
  /** From the right port to the edge of the column. */
  readonly leader: string;
}

/**
 * A hosted file sits on the row of its host. Its cables use the ports of the host.
 * A folded pip has no dot of its own: it sits on the count that stands for it.
 */
export interface Pip {
  readonly kind: "pip";
  readonly host: NodeId;
  readonly slot: number;
  readonly centre: Point;
  readonly folded: boolean;
}

export type Placed = Seat | Pip;

export interface Cable {
  readonly key: RelationKey;
  /** Port to port. */
  readonly d: string;
  /** Column edge to column edge. */
  readonly rest: string;
  /** The seats whose leader joins the resting path to the label. */
  readonly leaders: readonly NodeId[];
  /** Axis-aligned, before the corners are rounded. */
  readonly segments: readonly Segment[];
  readonly length: number;
  readonly heading: "forward" | "within" | "back";
  readonly start: Point;
  readonly end: Point;
  /** Unit direction of the last segment: 1 arrives from the left, -1 from the right. */
  readonly arrives: 1 | -1;
}

export interface ColumnFrame {
  readonly id: ColumnId;
  readonly x: number;
  readonly width: number;
  readonly count: number;
  /** Baseline of the column title. */
  readonly title: Point;
}

export interface Placement {
  readonly world: { readonly width: number; readonly height: number };
  readonly columns: readonly ColumnFrame[];
  readonly nodes: ReadonlyMap<NodeId, Placed>;
  readonly cables: ReadonlyMap<RelationKey, Cable>;
  /** The outbound playbook cables of the router as one path. */
  readonly rail: string;
}

const rowY = (row: number): number => FRAME.top + FRAME.pitch * row;

const gutterCentre = (left: number): number => {
  const from = FRAME.columns[COLUMN_IDS[left] ?? "router"];
  const to = FRAME.columns[COLUMN_IDS[left + 1] ?? "principles"];
  return (from.x + from.width + to.x) / 2;
};

const laneOf = (row: number): number => FRAME.lanes[row % FRAME.lanes.length] ?? RAIL_LANE;

export const cutMiddle = (text: string, capacity: number): string => {
  if (text.length <= capacity) return text;
  if (capacity <= 1) return "…";
  const head = Math.ceil((capacity - 1) / 2);
  return `${text.slice(0, head)}…${text.slice(text.length - (capacity - 1 - head))}`;
};

export const marksOf = (node: Node): MarkKind[] => {
  if (node.kind !== "skill") return [];
  const kinds: MarkKind[] = [];
  if (node.tooling.scripts.length > 0) kinds.push("script");
  if (node.tooling.commands.length > 0) kinds.push("command");
  return kinds;
};

export const round = (value: number): number => Math.round(value * 100) / 100;

export const pipRun = (shown: number): number => (shown === 0 ? 0 : FRAME.pipLead + FRAME.pipPitch * (shown - 1) + FRAME.pipTail);

export const countRun = (folded: number): number => (folded === 0 ? 0 : FRAME.countGap + `+${folded}`.length * COUNT_CHAR);

const pipsThatFit = (total: number, room: number): number => {
  for (let shown = total; shown > 0; shown -= 1) if (pipRun(shown) + countRun(total - shown) <= room) return shown;
  return 0;
};

const roomForHostedFileCount = (hosted: number): number => countRun(hosted);

export const markSpanOf = (kinds: readonly MarkKind[]): number =>
  kinds.reduce((span, kind) => span + FRAME.markWidth[kind] + FRAME.markGap, kinds.length === 0 ? 0 : FRAME.markLead - FRAME.markGap);

const seat = (input: { readonly node: SeatedNode; readonly column: ColumnId; readonly rank: number; readonly hosted: number }): Seat => {
  const frame = FRAME.columns[input.column];
  const row = frame.firstRow + input.rank;
  const y = rowY(row);
  const edge = frame.x + frame.width;
  const kinds = marksOf(input.node);
  const markSpan = markSpanOf(kinds);

  const charsThatFitBesideMarksAndCount = Math.floor((frame.width - FRAME.labelInset - markSpan - roomForHostedFileCount(input.hosted)) / FRAME.charWidth);
  const name = input.column === "principles" && input.node.name.startsWith(PRINCIPLE_PREFIX) ? input.node.name.slice(PRINCIPLE_PREFIX.length) : input.node.name;
  const text = cutMiddle(name, charsThatFitBesideMarksAndCount);
  const textStart = frame.x + FRAME.labelInset;
  const textEnd = textStart + text.length * FRAME.charWidth;

  const shown = pipsThatFit(input.hosted, edge - textEnd - markSpan);
  const folded = input.hosted - shown;
  const pipsEnd = textEnd + pipRun(shown);
  const countEnd = pipsEnd + countRun(folded);

  const marks: { kind: MarkKind; x: number }[] = [];
  let cursor = countEnd + FRAME.markLead;
  for (const kind of kinds) {
    marks.push({ kind, x: cursor });
    cursor += FRAME.markWidth[kind] + FRAME.markGap;
  }
  const labelEnd = countEnd + markSpan;
  const port = labelEnd + FRAME.portGap;

  return {
    kind: "seat",
    column: input.column,
    row,
    centre: { x: frame.x + FRAME.glyphInset, y },
    text,
    textX: textStart,
    label: { x: textStart, y: y - FRAME.labelHeight / 2, width: labelEnd - textStart, height: FRAME.labelHeight },
    left: { x: frame.x - FRAME.portGap, y },
    right: { x: port, y },
    marks,
    foldedPips: folded === 0 ? null : { count: folded, x: pipsEnd + FRAME.countGap },
    leader: port < edge ? `M${round(port)},${y}H${edge}` : "",
  };
};

/** The pips of the hosted files of a row, after the end of what the row has written. */
export const pipsOf = (host: NodeId, row: Pick<Seat, "centre" | "foldedPips">, writtenEnd: number, hosted: number): Pip[] => {
  const shown = hosted - (row.foldedPips?.count ?? 0);
  const countCentre = row.foldedPips === null ? 0 : row.foldedPips.x + (countRun(row.foldedPips.count) - FRAME.countGap) / 2;
  return Array.from({ length: hosted }, (_, slot): Pip => {
    const folded = slot >= shown;
    return {
      kind: "pip",
      host,
      slot,
      centre: { x: folded ? countCentre : writtenEnd + FRAME.pipLead + FRAME.pipPitch * slot, y: row.centre.y },
      folded,
    };
  });
};

export const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const toward = (from: Point, to: Point, by: number): Point => {
  const span = distance(from, to);
  return span === 0 ? from : { x: from.x + ((to.x - from.x) * by) / span, y: from.y + ((to.y - from.y) * by) / span };
};

const isBetween = (a: Point, middle: Point, b: Point): boolean =>
  (a.x === middle.x && middle.x === b.x && (a.y - middle.y) * (middle.y - b.y) >= 0) ||
  (a.y === middle.y && middle.y === b.y && (a.x - middle.x) * (middle.x - b.x) >= 0);

export const corners = (points: readonly Point[]): Point[] => {
  const out: Point[] = [];
  for (const point of points) {
    const last = out.at(-1);
    if (last !== undefined && last.x === point.x && last.y === point.y) continue;
    const before = out.at(-2);
    if (before !== undefined && last !== undefined && isBetween(before, last, point)) out.pop();
    out.push(point);
  }
  return out;
};

/** The path through the corners of an axis-aligned line, with each corner rounded. */
export const pathOf = (points: readonly Point[]): string => {
  const parts: string[] = [];
  points.forEach((point, index) => {
    const before = points[index - 1];
    const after = points[index + 1];
    if (before === undefined) parts.push(`M${round(point.x)},${round(point.y)}`);
    else if (after === undefined) parts.push(`L${round(point.x)},${round(point.y)}`);
    else {
      const radius = Math.min(FRAME.corner, distance(before, point) / 2, distance(point, after) / 2);
      const entry = toward(point, before, radius);
      const exit = toward(point, after, radius);
      parts.push(`L${round(entry.x)},${round(entry.y)}Q${round(point.x)},${round(point.y)} ${round(exit.x)},${round(exit.y)}`);
    }
  });
  return parts.join("");
};

interface Anchor {
  readonly seat: NodeId;
  readonly column: number;
  readonly row: number;
  readonly left: Point;
  readonly right: Point;
  readonly edge: Point;
}

interface Routed {
  readonly points: Point[];
  readonly heading: Cable["heading"];
}

const laneX = (gutter: number, laneOwner: Anchor): number => gutterCentre(gutter) + laneOf(laneOwner.row);

const isRouter = (source: Anchor): boolean => source.column === ROUTER_COLUMN;

const RAIL_X = gutterCentre(ROUTER_COLUMN) + RAIL_LANE;

const streetAbove = (target: Anchor): number => target.left.y - FRAME.pitch / 2;

const routeWithinColumn = (source: Anchor, target: Anchor, laneOwner: Anchor): Routed => {
  const usesLeftGutter = source.column === LAST_COLUMN;
  const x = laneX(usesLeftGutter ? source.column - 1 : source.column, laneOwner);
  const [from, to] = usesLeftGutter ? [source.left, target.left] : [source.right, target.right];
  return { heading: "within", points: [from, { x, y: from.y }, { x, y: to.y }, to] };
};

const routeToNextColumn = (source: Anchor, target: Anchor, laneOwner: Anchor): Routed => {
  const x = isRouter(source) ? RAIL_X : laneX(source.column, laneOwner);
  return { heading: "forward", points: [source.right, { x, y: source.right.y }, { x, y: target.left.y }, target.left] };
};

const routeAcrossColumns = (source: Anchor, target: Anchor, laneOwner: Anchor): Routed => {
  const isOnTheTrunkOfTheRouter = isRouter(source) && laneOwner === source;
  const first = isOnTheTrunkOfTheRouter ? RAIL_X : laneX(source.column, laneOwner);
  const last = gutterCentre(target.column - 1) + LAST_LANE;
  const street = streetAbove(target);
  return {
    heading: "forward",
    points: [source.right, { x: first, y: source.right.y }, { x: first, y: street }, { x: last, y: street }, { x: last, y: target.left.y }, target.left],
  };
};

const routeBackOneColumn = (source: Anchor, target: Anchor, laneOwner: Anchor): Routed => {
  const x = laneX(target.column, laneOwner);
  return { heading: "back", points: [source.left, { x, y: source.left.y }, { x, y: target.right.y }, target.right] };
};

const routeBackAcrossColumns = (source: Anchor, target: Anchor, laneOwner: Anchor): Routed => {
  const first = laneX(source.column - 1, laneOwner);
  const last = gutterCentre(target.column) - LAST_LANE;
  const street = streetAbove(target);
  return {
    heading: "back",
    points: [source.left, { x: first, y: source.left.y }, { x: first, y: street }, { x: last, y: street }, { x: last, y: target.right.y }, target.right],
  };
};

const routeOf = (source: Anchor, target: Anchor, laneOwner: Anchor): Routed => {
  const columns = target.column - source.column;
  if (columns === 0) return routeWithinColumn(source, target, laneOwner);
  if (columns === 1) return routeToNextColumn(source, target, laneOwner);
  if (columns > 1) return routeAcrossColumns(source, target, laneOwner);
  if (columns === -1) return routeBackOneColumn(source, target, laneOwner);
  return routeBackAcrossColumns(source, target, laneOwner);
};

const cable = (key: RelationKey, source: Anchor, target: Anchor, laneOwner: Anchor = target): Cable | null => {
  const routed = routeOf(source, target, laneOwner);
  const points = corners(routed.points);
  const start = points[0];
  const end = points.at(-1);
  const beforeEnd = points.at(-2);
  if (start === undefined || end === undefined || beforeEnd === undefined) return null;

  const outside = (point: Point, anchor: Anchor): Point => (point === anchor.right ? anchor.edge : point);
  const trimmed = corners([outside(routed.points[0] ?? start, source), ...routed.points.slice(1, -1), outside(routed.points.at(-1) ?? end, target)]);

  const segments: Segment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from !== undefined && to !== undefined) segments.push([from, to]);
  }
  return {
    key,
    d: pathOf(points),
    rest: pathOf(trimmed),
    leaders: [...(start === source.right ? [source.seat] : []), ...(end === target.right ? [target.seat] : [])],
    segments,
    length: segments.reduce((total, [from, to]) => total + distance(from, to), 0),
    heading: routed.heading,
    start,
    end,
    arrives: end.x >= beforeEnd.x ? 1 : -1,
  };
};

const anchorOf = (id: NodeId, placed: Seat, columnIndex: number): Anchor => {
  const frame = FRAME.columns[placed.column];
  return {
    seat: id,
    column: columnIndex,
    row: placed.row,
    left: placed.left,
    right: placed.right,
    edge: { x: Math.max(placed.right.x, frame.x + frame.width), y: placed.centre.y },
  };
};

/** Pure. */
export const layout = (graph: Graph): Placement => {
  const nodes = new Map<NodeId, Placed>();
  const anchors = new Map<NodeId, Anchor>();
  let lastRow = FRAME.minRows - 1;

  const columns = COLUMN_IDS.map((id, columnIndex): ColumnFrame => {
    const frame = FRAME.columns[id];
    graph.columns[id].forEach((node, rank) => {
      const files = graph.hosted.get(node.id) ?? [];
      const placed = seat({ node, column: id, rank, hosted: files.length });
      nodes.set(node.id, placed);
      const anchor = anchorOf(node.id, placed, columnIndex);
      anchors.set(node.id, anchor);
      lastRow = Math.max(lastRow, placed.row);

      pipsOf(node.id, placed, placed.textX + placed.text.length * FRAME.charWidth, files.length).forEach((pip, slot) => {
        const file = files[slot];
        if (file === undefined) return;
        nodes.set(file.id, pip);
        anchors.set(file.id, anchor);
      });
    });
    return {
      id,
      x: frame.x,
      width: frame.width,
      count: graph.columns[id].length,
      title: { x: frame.x, y: rowY(frame.firstRow) - FRAME.titleRise },
    };
  });

  const cables = new Map<RelationKey, Cable>();
  const rail: string[] = [];
  for (const relation of graph.index.relations) {
    const source = anchors.get(relation.from);
    const target = anchors.get(relation.to);
    if (source === undefined || target === undefined || source === target) continue;
    if (source.column === target.column && source.row === target.row) continue;
    const key = relationKey(relation);
    const placed = cable(key, source, target);
    if (placed === null) continue;
    cables.set(key, placed);
    if (graph.routers.has(relation.from) && graph.nodes.get(relation.to)?.kind === "playbook") rail.push(placed.d);
  }

  return {
    world: { width: FRAME.width, height: rowY(lastRow) + FRAME.bottom },
    columns,
    nodes,
    cables,
    rail: rail.join(""),
  };
};

const anchorIn = (placement: Placement, id: NodeId): Anchor | null => {
  const placed = placement.nodes.get(id);
  const seatId = placed?.kind === "pip" ? placed.host : id;
  const seated = placement.nodes.get(seatId);
  return seated?.kind === "seat" ? anchorOf(seatId, seated, COLUMN_IDS.indexOf(seated.column)) : null;
};

export const cablesOnOneTrunk = (graph: Graph, placement: Placement, from: NodeId): ReadonlyMap<RelationKey, Cable> => {
  const cables = new Map<RelationKey, Cable>();
  const source = anchorIn(placement, from);
  if (source === null) return cables;
  for (const relation of graph.out.get(from) ?? []) {
    const target = anchorIn(placement, relation.to);
    if (target === null || (source.column === target.column && source.row === target.row)) continue;
    const key = relationKey(relation);
    const placed = cable(key, source, target, source);
    if (placed !== null) cables.set(key, placed);
  }
  return cables;
};
