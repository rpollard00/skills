import { COLUMN_IDS, type ColumnId, type Graph, type SeatedNode } from "./graph";
import { relationKey, type NodeId, type RelationKey } from "./model";

/** The advance of each character of the bundled monospace font, as a part of the font size. */
const MONO_ADVANCE_EM = 0.6;

/** Width of one character at a font size. A label has no other measure: the layout never measures text. */
export const monoAdvance = (fontPx: number): number => Math.round(fontPx * MONO_ADVANCE_EM * 100) / 100;

/** The one source of the font size of a label: the layout takes the width of a character from it, and the map sets the CSS from it. */
const LABEL_FONT_PX = 12;

/**
 * World units are CSS px at scale 1.
 * `firstRow` shapes the silhouette. It is not a capacity: a column that grows makes the world taller.
 * `smallFontPx` is the one source of the font size of the hosted-file count and of the tool chips.
 */
export const FRAME = {
  width: 1112,
  top: 64,
  bottom: 40,
  pitch: 24,
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
  /** The baseline of a title is one row above the first row. Its capitals are thus between two streets, and no cable that crosses the column goes through them. */
  titleRise: 24,
  /** x offsets from the centre of a gutter. */
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
const LAST_COLUMN = COLUMN_IDS.length - 1;
const PRINCIPLE_PREFIX = "principle-";
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

export type MarkKind = keyof typeof FRAME.markWidth;

export interface Seat {
  readonly kind: "seat";
  readonly column: ColumnId;
  readonly row: number;
  /** Centre of the glyph. */
  readonly centre: Point;
  /** The label as drawn. A name longer than the column is cut in the middle. */
  readonly text: string;
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
  /** Port to port. A lit cable draws this path, so it touches its two nodes. */
  readonly d: string;
  /** Column edge to column edge. The resting weave draws this path, and each row gets one leader in place of many. */
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

const marksOf = (node: SeatedNode): MarkKind[] => {
  if (node.kind !== "skill") return [];
  const kinds: MarkKind[] = [];
  if (node.tooling.scripts.length > 0) kinds.push("script");
  if (node.tooling.commands.length > 0) kinds.push("command");
  return kinds;
};

const round = (value: number): number => Math.round(value * 100) / 100;

const pipRun = (shown: number): number => (shown === 0 ? 0 : FRAME.pipLead + FRAME.pipPitch * (shown - 1) + FRAME.pipTail);

const countRun = (folded: number): number => (folded === 0 ? 0 : FRAME.countGap + `+${folded}`.length * COUNT_CHAR);

/** As many pips as the room holds beside the count of the others. */
const pipsThatFit = (total: number, room: number): number => {
  for (let shown = total; shown > 0; shown -= 1) if (pipRun(shown) + countRun(total - shown) <= room) return shown;
  return 0;
};

/**
 * The name comes first. Hosted files take the room that the name leaves: one pip each while they fit, and a count
 * for the rest. A host keeps room for that count only. So the room for its name gets smaller by one digit of the count
 * at 10 and at 100 hosted files, and by nothing between them.
 */
const seat = (input: { readonly node: SeatedNode; readonly column: ColumnId; readonly rank: number; readonly hosted: number }): Seat => {
  const frame = FRAME.columns[input.column];
  const row = frame.firstRow + input.rank;
  const y = rowY(row);
  const edge = frame.x + frame.width;
  const kinds = marksOf(input.node);
  const markSpan = kinds.reduce((span, kind) => span + FRAME.markWidth[kind] + FRAME.markGap, kinds.length === 0 ? 0 : FRAME.markLead - FRAME.markGap);

  const capacity = Math.floor((frame.width - FRAME.labelInset - markSpan - countRun(input.hosted)) / FRAME.charWidth);
  const name = input.column === "principles" && input.node.name.startsWith(PRINCIPLE_PREFIX) ? input.node.name.slice(PRINCIPLE_PREFIX.length) : input.node.name;
  const text = cutMiddle(name, capacity);
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
    label: { x: textStart, y: y - FRAME.labelHeight / 2, width: labelEnd - textStart, height: FRAME.labelHeight },
    left: { x: frame.x - FRAME.portGap, y },
    right: { x: port, y },
    marks,
    foldedPips: folded === 0 ? null : { count: folded, x: pipsEnd + FRAME.countGap },
    leader: port < edge ? `M${round(port)},${y}H${edge}` : "",
  };
};

/** The shown pips run on from the name. Each folded pip sits on the middle of the count. */
const pipsOf = (host: NodeId, placed: Seat, hosted: number): Pip[] => {
  const textEnd = placed.label.x + placed.text.length * FRAME.charWidth;
  const shown = hosted - (placed.foldedPips?.count ?? 0);
  const countCentre = placed.foldedPips === null ? 0 : placed.foldedPips.x + (countRun(placed.foldedPips.count) - FRAME.countGap) / 2;
  return Array.from({ length: hosted }, (_, slot): Pip => {
    const folded = slot >= shown;
    return {
      kind: "pip",
      host,
      slot,
      centre: { x: folded ? countCentre : textEnd + FRAME.pipLead + FRAME.pipPitch * slot, y: placed.centre.y },
      folded,
    };
  });
};

const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const toward = (from: Point, to: Point, by: number): Point => {
  const span = distance(from, to);
  return span === 0 ? from : { x: from.x + ((to.x - from.x) * by) / span, y: from.y + ((to.y - from.y) * by) / span };
};

const isBetween = (a: Point, middle: Point, b: Point): boolean =>
  (a.x === middle.x && middle.x === b.x && (a.y - middle.y) * (middle.y - b.y) >= 0) ||
  (a.y === middle.y && middle.y === b.y && (a.x - middle.x) * (middle.x - b.x) >= 0);

/** Drops repeated points and points on a straight run. */
const corners = (points: readonly Point[]): Point[] => {
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

const pathOf = (points: readonly Point[]): string => {
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
  /** Where the row leaves its column on the right. */
  readonly edge: Point;
}

interface Routed {
  readonly points: Point[];
  readonly heading: Cable["heading"];
}

/** Every cable into a node uses the lane and the street of that node, so a hub reads as one bright comb. */
const laneX = (gutter: number, target: Anchor): number => gutterCentre(gutter) + laneOf(target.row);

/** A street runs between two rows, clear of the text in every column that it crosses. */
const streetAbove = (target: Anchor): number => target.left.y - FRAME.pitch / 2;

/** Out on the right, along a lane, and back in on the right. The last column has no gutter on its right, so it uses its left. */
const routeWithinColumn = (source: Anchor, target: Anchor): Routed => {
  const usesLeftGutter = source.column === LAST_COLUMN;
  const x = laneX(usesLeftGutter ? source.column - 1 : source.column, target);
  const [from, to] = usesLeftGutter ? [source.left, target.left] : [source.right, target.right];
  return { heading: "within", points: [from, { x, y: from.y }, { x, y: to.y }, to] };
};

/** One gutter: out on the right, down the lane of the target, in on its left. The router's cables to its playbooks share one rail. */
const routeToNextColumn = (source: Anchor, target: Anchor): Routed => {
  const x = source.column === 0 ? gutterCentre(0) + RAIL_LANE : laneX(source.column, target);
  return { heading: "forward", points: [source.right, { x, y: source.right.y }, { x, y: target.left.y }, target.left] };
};

/** Out on the right, along the street of the target across the columns between, then in on its left from the last lane. */
const routeAcrossColumns = (source: Anchor, target: Anchor): Routed => {
  const first = laneX(source.column, target);
  const last = gutterCentre(target.column - 1) + LAST_LANE;
  const street = streetAbove(target);
  return {
    heading: "forward",
    points: [source.right, { x: first, y: source.right.y }, { x: first, y: street }, { x: last, y: street }, { x: last, y: target.left.y }, target.left],
  };
};

/** The mirror of `routeToNextColumn`: out on the left, in on the right of the target. */
const routeBackOneColumn = (source: Anchor, target: Anchor): Routed => {
  const x = laneX(target.column, target);
  return { heading: "back", points: [source.left, { x, y: source.left.y }, { x, y: target.right.y }, target.right] };
};

/** The mirror of `routeAcrossColumns`. */
const routeBackAcrossColumns = (source: Anchor, target: Anchor): Routed => {
  const first = laneX(source.column - 1, target);
  const last = gutterCentre(target.column) - LAST_LANE;
  const street = streetAbove(target);
  return {
    heading: "back",
    points: [source.left, { x: first, y: source.left.y }, { x: first, y: street }, { x: last, y: street }, { x: last, y: target.right.y }, target.right],
  };
};

/** Every vertical run is on a gutter lane, and every run across a column is on a street. */
const routeOf = (source: Anchor, target: Anchor): Routed => {
  const columns = target.column - source.column;
  if (columns === 0) return routeWithinColumn(source, target);
  if (columns === 1) return routeToNextColumn(source, target);
  if (columns > 1) return routeAcrossColumns(source, target);
  if (columns === -1) return routeBackOneColumn(source, target);
  return routeBackAcrossColumns(source, target);
};

const cable = (key: RelationKey, source: Anchor, target: Anchor): Cable | null => {
  const routed = routeOf(source, target);
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

/**
 * Pure. A seat is its column constant plus its rank, so relations, selection, and the viewport move no node.
 * No simulation, no randomness, no text measurement.
 */
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
      const anchor: Anchor = {
        seat: node.id,
        column: columnIndex,
        row: placed.row,
        left: placed.left,
        right: placed.right,
        edge: { x: Math.max(placed.right.x, frame.x + frame.width), y: placed.centre.y },
      };
      anchors.set(node.id, anchor);
      lastRow = Math.max(lastRow, placed.row);

      pipsOf(node.id, placed, files.length).forEach((pip, slot) => {
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
