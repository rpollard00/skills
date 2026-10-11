import { COLUMN_IDS, nameOf, type ColumnId, type Graph } from "./graph";
import { corners, countRun, cutMiddle, FRAME, markSpanOf, marksOf, monoAdvance, pathOf, pipRun, pipsOf, PRINCIPLE_PREFIX, round, type MarkKind, type Pip, type Point, type Rect } from "./layout";
import { relationKey, type Node, type NodeId, type RelationKey, type RouteId } from "./model";
import { GATE, lengthOf } from "./polyline";
import { traceOf } from "./view/trace";

export const GROUP_IDS = [...COLUMN_IDS, "files"] as const;
type GroupId = (typeof GROUP_IDS)[number];

export const GROUP_TITLES: { readonly [Group in GroupId]: string } = {
  router: "ROUTER",
  playbooks: "PLAYBOOKS",
  skills: "SKILLS",
  principles: "PRINCIPLES",
  files: "FILES",
};

const CAPTION_FONT_PX = 9.5;
const CAPTION_SPACING_EM = 0.14;

export const FOCUS = {
  /** The row of the selected node: the row of the router at rest, which is the middle of the rest map. */
  y: FRAME.top + FRAME.pitch * FRAME.columns.router.firstRow,
  /** The left port of the leftmost row: the left port of the router at rest. */
  left: FRAME.columns.router.x - FRAME.portGap,
  maxRows: FRAME.minRows,
  portToTrunk: 16,
  laneToPort: 104,
  columnToLane: 14,
  portReach: FRAME.glyphInset + FRAME.portGap,
  textReach: FRAME.labelInset - FRAME.glyphInset,
  maxChars: 44,
  maxPips: 8,
  captionFontPx: CAPTION_FONT_PX,
  captionSpacingEm: CAPTION_SPACING_EM,
  captionCharWidth: monoAdvance(CAPTION_FONT_PX) + CAPTION_FONT_PX * CAPTION_SPACING_EM,
  /** From the lane of a branch to the mark of a relation that goes both ways. */
  laneToBackMark: 13,
  pad: { x: 36, y: 30 },
} as const;

type Side = "left" | "centre" | "right";

/**
 * A node on stage in a focus arrangement. The fields that a seat of the rest map also has mean the same.
 * A row of the left zone is the mirror image of the others: its glyph and its port face the trunk on its right.
 */
export interface Row {
  readonly kind: "row";
  readonly mirrored: boolean;
  readonly centre: Point;
  readonly text: string;
  /** Quiet words after the name: the host of a hosted file, or `NAMED_BY_ROUTE`. */
  readonly note: string | null;
  /** Where the text starts. */
  readonly textX: number;
  /** Covers the text, the note, the pips, the count of folded pips, and the tool marks. */
  readonly label: Rect;
  readonly left: Point;
  readonly right: Point;
  readonly marks: readonly { readonly kind: MarkKind; readonly x: number }[];
  readonly foldedPips: { readonly count: number; readonly x: number } | null;
}

export interface Caption {
  readonly key: string;
  readonly group: GroupId;
  readonly count: number;
  /** The start of the text, or its end when `anchor` is `end`. */
  readonly at: Point;
  readonly anchor: "start" | "end";
  /** The x of the glyphs of the rows below it. */
  readonly column: number;
}

/** It runs from the right port of its source to the left port of its target. */
export interface Branch {
  readonly key: RelationKey;
  readonly points: readonly Point[];
  readonly d: string;
  readonly length: number;
  readonly end: Point;
  /** Where the gate sits when the relation is conditional. */
  readonly gate: Point;
  /** Where the mark of a relation that goes both ways sits. Null when the relation goes one way. */
  readonly back: Point | null;
}

export interface Arrangement {
  readonly bounds: Rect;
  readonly nodes: ReadonlyMap<NodeId, Row | Pip>;
  /** The keyboard order: the left zone from top to bottom, the selected node, the right zone from top to bottom. */
  readonly order: readonly NodeId[];
  readonly captions: readonly Caption[];
  readonly cables: ReadonlyMap<RelationKey, Branch>;
}

export type FocusTarget = { readonly kind: "node"; readonly id: NodeId } | { readonly kind: "route"; readonly route: RouteId };

interface Standing {
  readonly group: GroupId;
  readonly order: number;
}

const restOrderOf = (graph: Graph): Map<NodeId, Standing> => {
  const standing = new Map<NodeId, Standing>();
  const seated = COLUMN_IDS.flatMap((column: ColumnId) => graph.columns[column].map((node) => ({ id: node.id, group: column })));
  const files = seated.flatMap(({ id }) => (graph.hosted.get(id) ?? []).map((file) => ({ id: file.id, group: "files" as const })));
  [...seated, ...files].forEach(({ id, group }, order) => standing.set(id, { group, order }));
  return standing;
};

interface Group {
  readonly id: GroupId;
  readonly members: readonly NodeId[];
}

const groupsOf = (ids: Iterable<NodeId>, standing: ReadonlyMap<NodeId, Standing>): Group[] => {
  const ordered = [...ids].flatMap((id) => {
    const place = standing.get(id);
    return place === undefined ? [] : [{ id, ...place }];
  });
  ordered.sort((a, b) => a.order - b.order);
  return GROUP_IDS.flatMap((group) => {
    const members = ordered.filter((item) => item.group === group).map((item) => item.id);
    return members.length === 0 ? [] : [{ id: group, members }];
  });
};

const CAPTION_ROWS = 1;
const CAPTION_ROWS_ABOVE_THE_COLUMN = 1;

const rowsOf = (groups: readonly Group[]): number =>
  groups.reduce((rows, group) => rows + CAPTION_ROWS + group.members.length, -CAPTION_ROWS_ABOVE_THE_COLUMN);

const packed = (groups: readonly Group[]): Group[][] => {
  const columns: Group[][] = [];
  for (const group of groups) {
    const current = columns.at(-1);
    if (current === undefined || rowsOf([...current, group]) > FOCUS.maxRows) columns.push([group]);
    else current.push(group);
  }
  return columns;
};

interface Slot {
  readonly id: NodeId;
  readonly rowsBelowAnchor: number;
}

interface ColumnPlan {
  readonly slots: readonly Slot[];
  readonly headings: readonly { readonly group: GroupId; readonly rowsBelowAnchor: number; readonly count: number }[];
}

const firstRowOf = (rows: number): number => -Math.floor((rows - 1) / 2);

const groupedPlan = (groups: readonly Group[]): ColumnPlan => {
  const slots: Slot[] = [];
  const headings: { group: GroupId; rowsBelowAnchor: number; count: number }[] = [];
  let rowsBelowAnchor = firstRowOf(rowsOf(groups)) - CAPTION_ROWS_ABOVE_THE_COLUMN;
  for (const group of groups) {
    headings.push({ group: group.id, rowsBelowAnchor, count: group.members.length });
    rowsBelowAnchor += CAPTION_ROWS;
    for (const id of group.members) {
      slots.push({ id, rowsBelowAnchor });
      rowsBelowAnchor += 1;
    }
  }
  return { slots, headings };
};

const plainPlan = (ids: readonly NodeId[], firstRow: number): ColumnPlan => ({ slots: ids.map((id, index) => ({ id, rowsBelowAnchor: firstRow + index })), headings: [] });

export const shortNameOf = (node: Node): string => {
  const name = nameOf(node);
  return node.kind === "skill" && node.family === "principle" && name.startsWith(PRINCIPLE_PREFIX) ? name.slice(PRINCIPLE_PREFIX.length) : name;
};

/** A route can name a skill that is also a step of its playbook. The skill has one row, as the step, and the row says that the route names it. */
export const NAMED_BY_ROUTE = "the route names it";

const rowOf = (input: { readonly graph: Graph; readonly node: Node; readonly side: Side; readonly centre: Point; readonly hostedFiles: number; readonly isNamedByRoute?: boolean }): Row => {
  const { node, centre } = input;
  const mirrored = input.side === "left";
  const text = cutMiddle(shortNameOf(node), FOCUS.maxChars);
  const host = node.kind === "hosted" ? input.graph.nodes.get(node.host) : undefined;
  const note = host !== undefined ? nameOf(host) : input.isNamedByRoute === true ? NAMED_BY_ROUTE : null;
  const written = (text.length + (note === null ? 0 : note.length + 1)) * FRAME.charWidth;
  const kinds = marksOf(node);
  const y = centre.y - FRAME.labelHeight / 2;
  const shared = { kind: "row" as const, mirrored, centre, text, note };

  if (mirrored) {
    const textEnd = centre.x - FOCUS.textReach;
    const textX = textEnd - written;
    const marks: { kind: MarkKind; x: number }[] = [];
    let cursor = textX - FRAME.markLead;
    for (const kind of kinds) {
      cursor -= FRAME.markWidth[kind];
      marks.push({ kind, x: cursor });
      cursor -= FRAME.markGap;
    }
    const start = textX - markSpanOf(kinds);
    return {
      ...shared,
      textX,
      label: { x: start, y, width: textEnd - start, height: FRAME.labelHeight },
      left: { x: start - FRAME.portGap, y: centre.y },
      right: { x: centre.x + FOCUS.portReach, y: centre.y },
      marks,
      foldedPips: null,
    };
  }

  const textX = centre.x + FOCUS.textReach;
  const shown = Math.min(input.hostedFiles, FOCUS.maxPips);
  const folded = input.hostedFiles - shown;
  const pipsEnd = textX + written + pipRun(shown);
  const countEnd = pipsEnd + countRun(folded);
  const marks: { kind: MarkKind; x: number }[] = [];
  let cursor = countEnd + FRAME.markLead;
  for (const kind of kinds) {
    marks.push({ kind, x: cursor });
    cursor += FRAME.markWidth[kind] + FRAME.markGap;
  }
  const end = countEnd + markSpanOf(kinds);
  return {
    ...shared,
    textX,
    label: { x: textX, y, width: end - textX, height: FRAME.labelHeight },
    left: { x: centre.x - FOCUS.portReach, y: centre.y },
    right: { x: end + FRAME.portGap, y: centre.y },
    marks,
    foldedPips: folded === 0 ? null : { count: folded, x: pipsEnd + FRAME.countGap },
  };
};

const writtenEndOf = (row: Row): number => row.textX + (row.text.length + (row.note === null ? 0 : row.note.length + 1)) * FRAME.charWidth;

interface Wire {
  readonly points: Point[];
  /** The x of the last upright before the row: the trunk for the first column of a zone, else the channel beside the column. */
  readonly lane: number;
}

interface Comb {
  readonly rows: Map<NodeId, Row>;
  readonly captions: Caption[];
  readonly wires: Map<NodeId, Wire>;
  readonly order: NodeId[];
}

type RowMaker = (id: NodeId, centre: Point) => Row | null;

export const hasCount = (group: GroupId): boolean => group !== "router";

const captionWidth = (group: GroupId, count: number): number =>
  (GROUP_TITLES[group].length + (hasCount(group) ? 1 + String(count).length : 0)) * FOCUS.captionCharWidth;

const endOf = (rect: Rect): number => rect.x + rect.width;

/** What a caption covers. It has the height of a label, because it is on a row of its column. */
export const captionRect = (caption: Pick<Caption, "group" | "count" | "at" | "anchor">): Rect => {
  const width = captionWidth(caption.group, caption.count);
  return { x: caption.anchor === "end" ? caption.at.x - width : caption.at.x, y: caption.at.y - FRAME.labelHeight / 2, width, height: FRAME.labelHeight };
};

const rightward = (source: Point, side: Side, plans: readonly ColumnPlan[], make: RowMaker, columnEnd: number = source.x): Comb => {
  const comb: Comb = { rows: new Map(), captions: [], wires: new Map(), order: [] };
  const trunk = Math.max(source.x, columnEnd) + FOCUS.portToTrunk;
  let lane = trunk;
  plans.forEach((plan, index) => {
    const cx = lane + FOCUS.laneToPort + FOCUS.portReach;
    let end = cx;
    for (const slot of plan.slots) {
      const y = source.y + FRAME.pitch * slot.rowsBelowAnchor;
      const row = make(slot.id, { x: cx, y });
      if (row === null) continue;
      comb.rows.set(slot.id, row);
      comb.order.push(slot.id);
      end = Math.max(end, row.label.x + row.label.width);
      const street = y - FRAME.pitch / 2;
      const through: Point[] = index === 0 ? [{ x: trunk, y }] : [{ x: trunk, y: street }, { x: lane, y: street }, { x: lane, y }];
      comb.wires.set(slot.id, { points: corners([source, { x: trunk, y: source.y }, ...through, row.left]), lane });
    }
    for (const heading of plan.headings) {
      const at = { x: cx + FOCUS.textReach, y: source.y + FRAME.pitch * heading.rowsBelowAnchor };
      const caption: Caption = { key: `${side}:${heading.group}`, group: heading.group, count: heading.count, at, anchor: "start", column: cx };
      comb.captions.push(caption);
      end = Math.max(end, endOf(captionRect(caption)));
    }
    lane = end + FOCUS.columnToLane;
  });
  return comb;
};

const leftward = (target: Point, plans: readonly ColumnPlan[], make: RowMaker): Comb => {
  const comb: Comb = { rows: new Map(), captions: [], wires: new Map(), order: [] };
  const trunk = target.x - FOCUS.portToTrunk;
  const columns: NodeId[][] = [];
  let lane = trunk;
  plans.forEach((plan, index) => {
    const cx = lane - FOCUS.laneToPort - FOCUS.portReach;
    const ids: NodeId[] = [];
    let start = cx;
    for (const slot of plan.slots) {
      const y = target.y + FRAME.pitch * slot.rowsBelowAnchor;
      const row = make(slot.id, { x: cx, y });
      if (row === null) continue;
      comb.rows.set(slot.id, row);
      ids.push(slot.id);
      start = Math.min(start, row.label.x);
      const street = y - FRAME.pitch / 2;
      const through: Point[] = index === 0 ? [{ x: trunk, y }] : [{ x: lane, y }, { x: lane, y: street }, { x: trunk, y: street }];
      comb.wires.set(slot.id, { points: corners([row.right, ...through, { x: trunk, y: target.y }, target]), lane });
    }
    for (const heading of plan.headings) {
      const at = { x: cx - FOCUS.textReach, y: target.y + FRAME.pitch * heading.rowsBelowAnchor };
      const caption: Caption = { key: `left:${heading.group}`, group: heading.group, count: heading.count, at, anchor: "end", column: cx };
      comb.captions.push(caption);
      start = Math.min(start, captionRect(caption).x);
    }
    columns.unshift(ids);
    lane = start - FOCUS.columnToLane;
  });
  comb.order.push(...columns.flat());
  return comb;
};

const branchOf = (input: { readonly key: RelationKey; readonly wire: Wire; readonly gateAt: "source" | "target"; readonly goesBothWays: boolean }): Branch | null => {
  const { wire } = input;
  const start = wire.points[0];
  const end = wire.points.at(-1);
  if (start === undefined || end === undefined) return null;
  const atTarget = input.gateAt === "target";
  const y = atTarget ? end.y : start.y;
  return {
    key: input.key,
    points: wire.points,
    d: pathOf(wire.points),
    length: lengthOf(wire.points),
    end,
    gate: { x: atTarget ? end.x - GATE.setBack : start.x + GATE.setBack, y },
    back: input.goesBothWays && atTarget ? { x: wire.lane + FOCUS.laneToBackMark, y } : null,
  };
};

interface Draft {
  readonly rows: readonly (readonly [NodeId, Row])[];
  readonly pips: readonly (readonly [NodeId, Pip])[];
  readonly order: readonly NodeId[];
  readonly captions: readonly Caption[];
  readonly branches: readonly Branch[];
}

const moved = (point: Point, dx: number): Point => ({ x: round(point.x + dx), y: point.y });

const settled = (draft: Draft): Arrangement => {
  const leftEdge = Math.min(
    ...draft.rows.map(([, row]) => row.left.x),
    ...draft.captions.map((caption) => captionRect(caption).x),
  );
  const dx = FOCUS.left - leftEdge;
  const nodes = new Map<NodeId, Row | Pip>();
  for (const [id, row] of draft.rows) {
    nodes.set(id, {
      ...row,
      centre: moved(row.centre, dx),
      textX: round(row.textX + dx),
      label: { ...row.label, x: round(row.label.x + dx) },
      left: moved(row.left, dx),
      right: moved(row.right, dx),
      marks: row.marks.map((mark) => ({ kind: mark.kind, x: round(mark.x + dx) })),
      foldedPips: row.foldedPips === null ? null : { count: row.foldedPips.count, x: round(row.foldedPips.x + dx) },
    });
  }
  for (const [id, pip] of draft.pips) nodes.set(id, { ...pip, centre: moved(pip.centre, dx) });
  const captions = draft.captions.map((caption) => ({ ...caption, at: moved(caption.at, dx), column: round(caption.column + dx) }));
  const cables = new Map<RelationKey, Branch>();
  for (const branch of draft.branches) {
    const points = branch.points.map((point) => moved(point, dx));
    cables.set(branch.key, {
      ...branch,
      points,
      d: pathOf(points),
      end: moved(branch.end, dx),
      gate: moved(branch.gate, dx),
      back: branch.back === null ? null : moved(branch.back, dx),
    });
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (const placed of nodes.values()) {
    if (placed.kind === "pip") continue;
    xs.push(placed.left.x, placed.right.x);
    ys.push(placed.centre.y);
  }
  for (const caption of captions) {
    const rect = captionRect(caption);
    xs.push(caption.anchor === "end" ? rect.x : endOf(rect));
    ys.push(caption.at.y);
  }
  for (const cable of cables.values()) for (const point of cable.points) ys.push(point.y);
  const left = Math.min(...xs) - FOCUS.pad.x;
  const top = Math.min(...ys) - FRAME.pitch / 2 - FOCUS.pad.y;
  return {
    bounds: { x: left, y: top, width: Math.max(...xs) + FOCUS.pad.x - left, height: Math.max(...ys) + FRAME.pitch / 2 + FOCUS.pad.y - top },
    nodes,
    order: draft.order,
    captions,
    cables,
  };
};

const branchesOf = (input: {
  readonly wires: ReadonlyMap<NodeId, Wire>;
  readonly keyOf: (id: NodeId) => RelationKey;
  readonly gateAt: "source" | "target";
  readonly bothWays: ReadonlySet<NodeId>;
}): Branch[] =>
  [...input.wires].flatMap(([id, wire]) => {
    const branch = branchOf({ key: input.keyOf(id), wire, gateAt: input.gateAt, goesBothWays: input.bothWays.has(id) });
    return branch === null ? [] : [branch];
  });

const NONE: ReadonlySet<NodeId> = new Set();

const aroundNode = (graph: Graph, id: NodeId): Arrangement | null => {
  const node = graph.nodes.get(id);
  if (node === undefined) return null;
  const standing = restOrderOf(graph);
  const ownFiles = graph.hosted.get(id) ?? [];

  const targets = new Set((graph.out.get(id) ?? []).map((relation) => relation.to));
  const needers = (graph.into.get(id) ?? []).map((relation) => relation.from);
  const bothWays = new Set(needers.filter((from) => targets.has(from)));
  const sources = new Set(needers.filter((from) => !targets.has(from)));

  const make =
    (side: Side): RowMaker =>
    (member, centre) => {
      const memberNode = graph.nodes.get(member);
      return memberNode === undefined ? null : rowOf({ graph, node: memberNode, side, centre, hostedFiles: 0 });
    };
  const centre = rowOf({ graph, node, side: "centre", centre: { x: 0, y: FOCUS.y }, hostedFiles: ownFiles.length });
  const left = leftward(centre.left, packed(groupsOf(sources, standing)).map(groupedPlan).toReversed(), make("left"));
  const right = rightward(centre.right, "right", packed(groupsOf(targets, standing)).map(groupedPlan), make("right"));
  const pips = pipsOf(id, centre, writtenEndOf(centre), ownFiles.length).flatMap((pip, slot): (readonly [NodeId, Pip])[] => {
    const file = ownFiles[slot];
    return file === undefined ? [] : [[file.id, pip]];
  });

  return settled({
    rows: [...left.rows, [id, centre], ...right.rows],
    pips,
    order: [...left.order, id, ...pips.map(([file]) => file), ...right.order],
    captions: [...left.captions, ...right.captions],
    branches: [
      ...branchesOf({ wires: left.wires, keyOf: (from) => relationKey({ from, to: id }), gateAt: "source", bothWays: NONE }),
      ...branchesOf({ wires: right.wires, keyOf: (to) => relationKey({ from: id, to }), gateAt: "target", bothWays }),
    ],
  });
};

const alongRoute = (graph: Graph, route: RouteId): Arrangement | null => {
  const trace = traceOf(graph, route);
  const origin = trace === null || trace.origin === null ? undefined : graph.nodes.get(trace.origin);
  if (trace === null || origin === undefined) return null;
  const rowMaker =
    (isNamedByRoute: (member: NodeId) => boolean): RowMaker =>
    (member, centre) => {
      const memberNode = graph.nodes.get(member);
      return memberNode === undefined ? null : rowOf({ graph, node: memberNode, side: "right", centre, hostedFiles: 0, isNamedByRoute: isNamedByRoute(member) });
    };
  const start = rowOf({ graph, node: origin, side: "centre", centre: { x: 0, y: FOCUS.y }, hostedFiles: 0 });
  const isAlreadyOnStage = (node: NodeId): boolean => node === origin.id || node === trace.head;
  const stepsToARowOfTheirOwn = trace.steps.filter((step) => !isAlreadyOnStage(step.node));
  const stepIds = stepsToARowOfTheirOwn.map((step) => step.node);
  const viaOf = new Map(stepsToARowOfTheirOwn.map((step) => [step.node, step.via]));
  const stepKey = (to: NodeId): RelationKey => viaOf.get(to) ?? relationKey({ from: trace.head ?? origin.id, to });
  const stepColumn = [plainPlan(stepIds, firstRowOf(stepIds.length))];
  const plain = rowMaker(() => false);

  if (trace.head === null) {
    const comb = rightward(start.right, "right", stepColumn, plain);
    return settled({
      rows: [[origin.id, start], ...comb.rows],
      pips: [],
      order: [origin.id, ...comb.order],
      captions: [],
      branches: branchesOf({ wires: comb.wires, keyOf: stepKey, gateAt: "target", bothWays: NONE }),
    });
  }

  const named = trace.heads.flatMap((key) => {
    const to = graph.relations.get(key)?.to;
    return to === undefined || to === trace.head ? [] : [to];
  });
  const namedSteps = new Set(named.filter((to) => stepIds.includes(to)));
  const heads = rightward(start.right, "right", [plainPlan([trace.head, ...named.filter((to) => !namedSteps.has(to))], 0)], plain);
  const head = heads.rows.get(trace.head);
  const headColumnEnd = Math.max(...[...heads.rows.values()].map((row) => row.right.x));
  const comb = head === undefined ? null : rightward(head.right, "right", stepColumn, rowMaker((member) => namedSteps.has(member)), headColumnEnd);
  return settled({
    rows: [[origin.id, start], ...heads.rows, ...(comb?.rows ?? [])],
    pips: [],
    order: [origin.id, ...heads.order, ...(comb?.order ?? [])],
    captions: [],
    branches: [
      ...branchesOf({ wires: heads.wires, keyOf: (to) => relationKey({ from: origin.id, to }), gateAt: "target", bothWays: NONE }),
      ...(comb === null ? [] : branchesOf({ wires: comb.wires, keyOf: stepKey, gateAt: "target", bothWays: NONE })),
    ],
  });
};

/** Pure. Null when the index does not hold the selection. */
export const focusLayout = (graph: Graph, focus: FocusTarget): Arrangement | null =>
  focus.kind === "node" ? aroundNode(graph, focus.id) : alongRoute(graph, focus.route);
