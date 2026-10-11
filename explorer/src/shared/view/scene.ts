import type { Caption } from "../focus-layout";
import { nameOf, type Graph } from "../graph";
import { cutMiddle, FRAME, monoAdvance, type MarkKind, type Point, type Rect } from "../layout";
import { relationKey, type EdgeKind, type Node, type NodeId, type RelationKey } from "../model";
import { crosses, GATE } from "../polyline";
import { arrangementOf, standOf, type Stand } from "./arranged";
import { classOf, isShown, weightOf, type CableClass, type Weight } from "./cable-class";
import { litOf } from "./lit";
import { resolveCamera } from "./camera";
import { findHits, matchedNodes, nodesInMapOrder, tokensOf, type FinderHit } from "./finder";
import { stageTargetOf, type Lens, type Stage, type StageTarget, type Transform, type ViewState } from "./state";
import { stripOf, type Strip } from "./strip";
import { cursorNodeOf, traceOf, type Trace } from "./trace";

export const GLYPHS = ["hub", "square", "ring", "disc", "diamond", "diamond-solid", "pip"] as const;
export type Glyph = (typeof GLYPHS)[number];

/** `needs` and `step` carry the cable that lights the node: its place in the sequence, and for `needs` its length. */
export type NodeTone =
  | { readonly kind: "rest" | "dim" | "match" | "selected" | "mutual" | "origin" }
  | { readonly kind: "needs"; readonly via: EdgeKind; readonly order: number; readonly length: number }
  | { readonly kind: "neededBy"; readonly via: EdgeKind; readonly order: number }
  | { readonly kind: "step"; readonly n: number; readonly order: number; readonly conditional: boolean };

export interface Chip {
  readonly kind: MarkKind;
  readonly text: string;
  readonly x: number;
  readonly width: number;
}

export interface NodeView {
  readonly id: NodeId;
  readonly at: Stand;
  /** The node is not on the stage: the stage shows a focus arrangement, and this node is not in it. */
  readonly offStage: boolean;
  /** The full name. The seat holds the label as drawn. */
  readonly name: string;
  readonly glyph: Glyph;
  readonly tone: NodeTone;
  /** A mark on the left port that stands in for a cable from the router. */
  readonly mako: "route" | "trigger" | "named" | "none";
  /** Tool marks unfolded by the tools lens. */
  readonly chips: readonly Chip[];
  /** What the chips of the row cover, from the start of the first one to the end of the last one. Null for a row that shows no chip. */
  readonly chipsBox: Rect | null;
  readonly changed: boolean;
  readonly defective: boolean;
  readonly hovered: boolean;
  /** The pointer is on this name in the reader. */
  readonly ringing: boolean;
  /** Range of the label that the query matches. */
  readonly match: readonly [start: number, end: number] | null;
}

/** `frame`: a cable of a locked arrangement at low strength. */
export type CableTone = "weave" | "frame" | "out" | "in" | "step" | "previewOut" | "previewIn";

export interface CableView {
  readonly key: RelationKey;
  readonly d: string;
  /** The corners of `d`, from the source to the target. */
  readonly points: readonly Point[];
  readonly rest: string;
  readonly cls: CableClass;
  readonly weight: Weight;
  readonly tone: CableTone;
  readonly conditional: boolean;
  /** Where the gate of a conditional relation sits. Null when the relation has no condition, and for the resting weave. */
  readonly gate: Point | null;
  /** Where the mark sits that says the target also needs the source. `conditional`: that relation back has a condition. */
  readonly back: (Point & { readonly conditional: boolean }) | null;
  readonly end: Point;
  readonly arrives: 1 | -1;
  readonly length: number;
  /** Position in the sequence that the motion plays. */
  readonly order: number;
  readonly bright: boolean;
}

export interface Scene {
  /** In keyboard order. In a focus arrangement: the left zone, the node in the middle, the right zone, then the nodes that are off the stage. */
  readonly nodes: readonly NodeView[];
  readonly cables: readonly CableView[];
  /** One quiet line from a label to the edge of its column, for each row that a resting cable leaves or enters on the right. */
  readonly leaders: readonly string[];
  readonly weave: "rest" | "low" | "off";
  /** The stage shows a focus arrangement, not the rest map. */
  readonly arranged: boolean;
  /** The stage follows the selection, so a new selection sends nodes to new rows and its cables start when they are there. */
  readonly travels: boolean;
  /** What a lock holds on the stage. Null when the stage follows the selection. */
  readonly locked: StageTarget | null;
  readonly captions: readonly Caption[];
  readonly camera: Transform;
  readonly strip: Strip;
  readonly hits: readonly FinderHit[];
  readonly trace: Trace | null;
  /** The node that the cursor of a trace is on. */
  readonly cursor: NodeId | null;
  readonly lens: Lens;
}

const glyphOf = (node: Node): Glyph => {
  if (node.kind === "playbook") return "square";
  if (node.kind === "hosted") return "pip";
  if (node.family === "router") return "hub";
  if (node.family === "principle") return node.modelInvocable ? "diamond-solid" : "diamond";
  return node.modelInvocable ? "disc" : "ring";
};

const hasTooling = (node: Node): boolean => node.kind === "skill" && (node.tooling.scripts.length > 0 || node.tooling.commands.length > 0);

/**
 * `lead` and `half`: the box of a chip starts this far before its text, and it is this high above and below the middle of its row.
 * `air`: the ground between the chips of a row and a lit line. A line has a width and a chip has a border, so a line that only goes past the box of a chip is against it.
 */
export const CHIP = { pad: 5, icon: 12, gap: 5, reach: 62, lead: 3, half: 8, air: 3 } as const;
const CHIP_CHAR = monoAdvance(FRAME.smallFontPx);

const chipsOf = (node: Node, placed: Stand): Chip[] => {
  if (node.kind !== "skill" || placed.kind !== "seat") return [];
  const texts: { kind: MarkKind; text: string }[] = [
    ...node.tooling.scripts.map((script) => ({ kind: "script" as const, text: script.path.split("/").at(-1) ?? script.path })),
    ...node.tooling.commands.map((command) => ({ kind: "command" as const, text: command.name })),
  ];
  const frame = FRAME.columns[placed.column];
  const limit = frame.x + frame.width + CHIP.reach;
  const chips: Chip[] = [];
  let x = placed.marks[0]?.x ?? placed.label.x + placed.label.width;
  for (const [index, { kind, text }] of texts.entries()) {
    const fixed = (texts[index - 1]?.kind === kind ? 0 : CHIP.icon) + CHIP.pad * 2;
    const room = Math.floor((limit - x - fixed) / CHIP_CHAR);
    if (room < 3) break;
    const shown = cutMiddle(text, room);
    const width = fixed + shown.length * CHIP_CHAR;
    chips.push({ kind, text: shown, x, width });
    x += width + CHIP.gap;
  }
  return chips;
};

/** What the chips of one row cover. Null for a row without a chip. */
const boxOfChips = (chips: readonly Chip[], y: number): Rect | null => {
  const first = chips[0];
  const last = chips.at(-1);
  return first === undefined || last === undefined ? null : { x: first.x - CHIP.lead, y: y - CHIP.half, width: last.x + last.width - first.x, height: CHIP.half * 2 };
};

const grownBy = (rect: Rect, by: number): Rect => ({ x: rect.x - by, y: rect.y - by, width: rect.width + by * 2, height: rect.height + by * 2 });

/** A lit line, its arrowhead, or its ring is where the chips are, or has less than the air of a chip from them. The arrowhead is on the line, and the ring reaches past it. */
export const isAtChips = (cable: Pick<CableView, "points" | "gate">, box: Rect): boolean =>
  crosses(cable.points, grownBy(box, CHIP.air)) || (cable.gate !== null && crosses([cable.gate, cable.gate], grownBy(box, CHIP.air + GATE.radius)));

const matchRange = (label: string, query: string): readonly [number, number] | null => {
  const token = tokensOf(query)[0];
  if (token === undefined) return null;
  const at = label.toLowerCase().indexOf(token);
  return at === -1 ? null : [at, at + token.length];
};

const makoMark = (graph: Graph, id: NodeId): NodeView["mako"] => {
  const kinds = (graph.into.get(id) ?? []).filter((relation) => graph.routers.has(relation.from)).flatMap((relation) => relation.kinds);
  if (kinds.length === 0) return "none";
  return kinds.includes("route") ? "route" : kinds.includes("trigger") ? "trigger" : "named";
};

export const deriveScene = (input: Stage & { readonly state: ViewState }): Scene => {
  const { graph, placement, state } = input;
  const hits = findHits(graph, state.query);
  const matched = matchedNodes(graph, hits);
  const searching = tokensOf(state.query).length > 0;
  const arrangement = arrangementOf(graph, stageTargetOf(state));
  const hoverId = state.hover.kind === "node" || state.hover.kind === "ref" ? state.hover.id : null;

  const brightKeys: readonly RelationKey[] =
    state.hover.kind === "cable"
      ? [state.hover.key]
      : hoverId !== null && state.focus.kind === "node"
        ? [relationKey({ from: state.focus.id, to: hoverId }), relationKey({ from: hoverId, to: state.focus.id })]
        : [];
  const traced = state.focus.kind === "route" ? traceOf(graph, state.focus.route) : null;
  const stepHover = hoverId === null ? undefined : traced?.steps.find((item) => item.node === hoverId)?.via;
  const lit = litOf({ graph, placement, arrangement, state, isBright: (key) => brightKeys.includes(key) || stepHover === key });

  const inMapOrder = nodesInMapOrder(graph);
  const onStage = new Set(arrangement?.order ?? []);
  const ordered = arrangement === null ? inMapOrder : [...arrangement.order.flatMap((id) => graph.nodes.get(id) ?? []), ...inMapOrder.filter((node) => !onStage.has(node.id))];

  const litLines = lit.cables.filter((cable) => cable.tone !== "frame");
  const pointedAt = state.focus.kind === "none" && state.hover.kind === "node" ? standOf(state.hover.id, arrangement, placement) : undefined;
  // The preview of a node folds no chip of its own row: a person who points at a row reads its tools there. A hosted file is on the row of its host.
  const rowOfThePreview = pointedAt === undefined ? null : pointedAt.kind === "pip" ? pointedAt.host : hoverId;
  const chips = new Map<NodeId, Chip[]>();
  const chipBoxes = new Map<NodeId, Rect>();
  if (state.lens === "tools") {
    for (const node of ordered) {
      const at = standOf(node.id, arrangement, placement);
      if (at === undefined || (arrangement !== null && !onStage.has(node.id))) continue;
      const unfolded = chipsOf(node, at);
      const box = boxOfChips(unfolded, at.centre.y);
      if (box === null) continue;
      // A chip is drawn over each line. Thus a row keeps its tool marks folded when a lit line, its arrowhead, or its ring would be under a chip.
      if (node.id !== rowOfThePreview && litLines.some((cable) => isAtChips(cable, box))) continue;
      chips.set(node.id, unfolded);
      chipBoxes.set(node.id, box);
    }
  }
  const nodes: NodeView[] = [];
  for (const node of ordered) {
    const at = standOf(node.id, arrangement, placement);
    if (at === undefined) continue;
    const offStage = arrangement !== null && !onStage.has(node.id);
    const fallback: NodeTone = searching
      ? { kind: matched.has(node.id) ? "match" : "dim" }
      : state.lens === "tools"
        ? { kind: hasTooling(node) ? "rest" : "dim" }
        : { kind: lit.dimsTheRest ? "dim" : "rest" };
    nodes.push({
      id: node.id,
      at,
      offStage,
      name: nameOf(node),
      glyph: glyphOf(node),
      tone: offStage ? { kind: "dim" } : (lit.tones.get(node.id) ?? fallback),
      mako: arrangement !== null || node.kind === "playbook" || graph.routers.has(node.id) ? "none" : makoMark(graph, node.id),
      chips: chips.get(node.id) ?? [],
      chipsBox: chipBoxes.get(node.id) ?? null,
      changed: graph.changed.has(node.id),
      defective: node.kind === "skill" && node.defects.length > 0,
      hovered: !offStage && hoverId === node.id,
      ringing: !offStage && state.hover.kind === "ref" && state.hover.id === node.id,
      match: searching && !offStage && at.kind !== "pip" && matched.has(node.id) ? matchRange(at.text, state.query) : null,
    });
  }

  const weave: CableView[] = [];
  const leaders = new Set<NodeId>();
  for (const relation of graph.index.relations) {
    const key = relationKey(relation);
    const atRest = placement.cables.get(key);
    const cls = classOf(relation.kinds[0]);
    if (atRest === undefined || !isShown(relation, state.muted) || graph.routers.has(relation.from) || cls === "reads") continue;
    for (const id of atRest.leaders) leaders.add(id);
    weave.push({
      key,
      d: atRest.d,
      points: [],
      rest: atRest.rest,
      cls,
      weight: weightOf(cls),
      tone: "weave",
      conditional: relation.conditional,
      gate: null,
      back: null,
      end: atRest.end,
      arrives: atRest.arrives,
      length: atRest.length,
      order: 0,
      bright: false,
    });
  }

  const absent = lit.absent === null ? undefined : graph.nodes.get(lit.absent);
  const cursor = state.focus.kind === "route" && lit.trace !== null ? cursorNodeOf(lit.trace, state.focus.cursor) : null;
  return {
    nodes,
    cables: [...weave, ...lit.cables],
    leaders: [...leaders].flatMap((id) => {
      const placed = placement.nodes.get(id);
      return placed?.kind === "seat" && placed.leader !== "" ? [placed.leader] : [];
    }),
    weave: arrangement !== null ? "off" : lit.dimsTheRest || searching || state.lens === "tools" ? "low" : "rest",
    arranged: arrangement !== null,
    travels: arrangement !== null && state.pin.kind === "unlocked",
    locked: state.pin.kind === "locked" ? state.pin.stage : null,
    captions: arrangement?.captions ?? [],
    camera: resolveCamera(state, input),
    strip: stripOf({ state, graph, trace: lit.trace, hits, absent: absent ?? null, hidden: lit.hidden }),
    hits,
    trace: lit.trace,
    cursor: cursor !== null && (arrangement === null || onStage.has(cursor)) ? cursor : null,
    lens: state.lens,
  };
};
