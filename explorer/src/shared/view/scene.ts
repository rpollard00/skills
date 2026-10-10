import { nameOf, type Graph } from "../graph";
import { cutMiddle, FRAME, monoAdvance, type MarkKind, type Placed, type Placement, type Point } from "../layout";
import { relationKey, type EdgeKind, type Node, type NodeId, type RelationKey } from "../model";
import { classOf, isShown, type CableClass } from "./cable-class";
import { resolveCamera } from "./camera";
import { findHits, matchedNodes, nodesInMapOrder, tokensOf, type FinderHit } from "./finder";
import type { Focus, Lens, Stage, Transform, ViewState } from "./state";
import { stripOf, type Strip } from "./strip";
import { cursorNodeOf, traceOf, type Trace } from "./trace";

/** Every glyph. The Key draws one row for each, so a new glyph cannot be absent from it. */
export const GLYPHS = ["hub", "square", "ring", "disc", "diamond", "diamond-solid", "pip"] as const;
export type Glyph = (typeof GLYPHS)[number];

/**
 * `needs` and `step` carry the cable that lights the node: its place in the sequence, and for `needs` its length.
 * The glyph lights when that cable arrives, so the motion shows the cause.
 */
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
  readonly at: Placed;
  /** The full name. The seat holds the label as drawn. */
  readonly name: string;
  readonly glyph: Glyph;
  readonly tone: NodeTone;
  /** A mark on the left port that stands in for a cable from the router. */
  readonly mako: "route" | "trigger" | "named" | "none";
  /** Tool marks unfolded by the tools lens. */
  readonly chips: readonly Chip[];
  readonly changed: boolean;
  readonly defective: boolean;
  readonly hovered: boolean;
  /** The pointer is on this name in the reader. */
  readonly ringing: boolean;
  /** Range of the label that the query matches. */
  readonly match: readonly [start: number, end: number] | null;
}

export type CableTone = "weave" | "out" | "in" | "step" | "previewOut" | "previewIn";

export interface CableView {
  readonly key: RelationKey;
  readonly d: string;
  /** The path of the resting weave. */
  readonly rest: string;
  readonly cls: CableClass;
  readonly tone: CableTone;
  readonly conditional: boolean;
  readonly end: Point;
  readonly arrives: 1 | -1;
  readonly length: number;
  /** Position in the sequence that the motion plays. */
  readonly order: number;
  readonly bright: boolean;
}

export interface Scene {
  readonly nodes: readonly NodeView[];
  readonly cables: readonly CableView[];
  /** One quiet line from a label to the edge of its column, for each row that a resting cable leaves or enters on the right. */
  readonly leaders: readonly string[];
  /** The resting weave is lower while something is in focus. */
  readonly weave: "rest" | "low";
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

export const CHIP = { pad: 5, icon: 12, gap: 5, reach: 62 } as const;
const CHIP_CHAR = monoAdvance(FRAME.smallFontPx);

/** One chip for each script and each command. The chips can use the gutter, and a name that is too long is cut in the middle. */
const chipsOf = (node: Node, placed: Placed): Chip[] => {
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

const matchRange = (label: string, query: string): readonly [number, number] | null => {
  const token = tokensOf(query)[0];
  if (token === undefined) return null;
  const at = label.toLowerCase().indexOf(token);
  return at === -1 ? null : [at, at + token.length];
};

interface Lit {
  readonly tones: ReadonlyMap<NodeId, NodeTone>;
  readonly cables: ReadonlyMap<RelationKey, { readonly tone: CableTone; readonly order: number }>;
  readonly trace: Trace | null;
}

/** Left to right, then top to bottom: the order in which the cables of a selection grow. */
const byMapPosition =
  (placement: Placement) =>
  (a: NodeId, b: NodeId): number => {
    const first = placement.nodes.get(a)?.centre;
    const second = placement.nodes.get(b)?.centre;
    if (first === undefined || second === undefined) return 0;
    return first.x - second.x || first.y - second.y;
  };

const litByNode = (id: NodeId, state: ViewState, stage: Pick<Stage, "graph" | "placement">): Lit => {
  const { graph, placement } = stage;
  const inMapOrder = byMapPosition(placement);
  const out = (graph.out.get(id) ?? []).filter((relation) => isShown(relation, state.muted)).sort((a, b) => inMapOrder(a.to, b.to));
  const into = (graph.into.get(id) ?? []).filter((relation) => isShown(relation, state.muted)).sort((a, b) => inMapOrder(a.from, b.from));
  const tones = new Map<NodeId, NodeTone>();
  const cables = new Map<RelationKey, { tone: CableTone; order: number }>();

  out.forEach((relation, order) => {
    const key = relationKey(relation);
    tones.set(relation.to, { kind: "needs", via: relation.kinds[0], order, length: placement.cables.get(key)?.length ?? 0 });
    cables.set(key, { tone: "out", order });
  });
  into.forEach((relation, order) => {
    tones.set(relation.from, tones.has(relation.from) ? { kind: "mutual" } : { kind: "neededBy", via: relation.kinds[0], order });
    cables.set(relationKey(relation), { tone: "in", order });
  });
  tones.set(id, { kind: "selected" });
  const focused = graph.nodes.get(id);
  if (focused?.kind === "hosted" && !tones.has(focused.host)) tones.set(focused.host, { kind: "match" });
  return { tones, cables, trace: null };
};

/**
 * The cables that the route bullet states leave the router first, at order 0. The steps of the playbook follow in their order.
 * A route without a playbook has no second leg: its steps are the cables of the router, so they also leave at order 0.
 */
const litByRoute = (focus: Extract<Focus, { kind: "route" }>, graph: Graph): Lit => {
  const trace = traceOf(graph, focus.route);
  const tones = new Map<NodeId, NodeTone>();
  const cables = new Map<RelationKey, { tone: CableTone; order: number }>();
  if (trace === null) return { tones, cables, trace };

  if (trace.origin !== null) tones.set(trace.origin, { kind: "origin" });
  for (const key of trace.heads) {
    cables.set(key, { tone: "step", order: 0 });
    const to = graph.relations.get(key)?.to;
    if (to !== undefined) tones.set(to, { kind: "step", n: 0, order: 0, conditional: false });
  }
  for (const item of trace.steps) {
    const order = trace.head === null ? 0 : item.n;
    cables.set(item.via, { tone: "step", order });
    tones.set(item.node, { kind: "step", n: item.n, order, conditional: item.conditional });
  }
  return { tones, cables, trace };
};

const NOTHING_LIT: Lit = { tones: new Map(), cables: new Map(), trace: null };

const makoMark = (graph: Graph, id: NodeId): NodeView["mako"] => {
  const kinds = (graph.into.get(id) ?? []).filter((relation) => graph.routers.has(relation.from)).flatMap((relation) => relation.kinds);
  if (kinds.length === 0) return "none";
  return kinds.includes("route") ? "route" : kinds.includes("trigger") ? "trigger" : "named";
};

/** Appearance comes from state, never from position. */
export const deriveScene = (input: Stage & { readonly state: ViewState }): Scene => {
  const { graph, placement, state } = input;
  const hits = findHits(graph, state.query);
  const matched = matchedNodes(graph, hits);
  const searching = tokensOf(state.query).length > 0;
  const lit = state.focus.kind === "node" ? litByNode(state.focus.id, state, input) : state.focus.kind === "route" ? litByRoute(state.focus, graph) : NOTHING_LIT;
  const focused = state.focus.kind !== "none";
  const hoverId = state.hover.kind === "node" || state.hover.kind === "ref" ? state.hover.id : null;
  /** Only a node on the map previews its relations. A name in the reader rings its node and brightens one cable. */
  const mapHoverId = state.hover.kind === "node" ? state.hover.id : null;

  const nodes: NodeView[] = [];
  for (const node of nodesInMapOrder(graph)) {
    const at = placement.nodes.get(node.id);
    if (at === undefined) continue;
    const fallback: NodeTone = searching
      ? { kind: matched.has(node.id) ? "match" : "dim" }
      : state.lens === "tools"
        ? { kind: hasTooling(node) ? "rest" : "dim" }
        : { kind: focused ? "dim" : "rest" };
    nodes.push({
      id: node.id,
      at,
      name: nameOf(node),
      glyph: glyphOf(node),
      tone: lit.tones.get(node.id) ?? fallback,
      mako: node.kind === "playbook" || graph.routers.has(node.id) ? "none" : makoMark(graph, node.id),
      chips: state.lens === "tools" ? chipsOf(node, at) : [],
      changed: graph.changed.has(node.id),
      defective: node.kind === "skill" && node.defects.length > 0,
      hovered: hoverId === node.id,
      ringing: state.hover.kind === "ref" && state.hover.id === node.id,
      match: searching && at.kind === "seat" && matched.has(node.id) ? matchRange(at.text, state.query) : null,
    });
  }

  const brightKeys: readonly RelationKey[] =
    state.hover.kind === "cable"
      ? [state.hover.key]
      : hoverId !== null && state.focus.kind === "node"
        ? [relationKey({ from: state.focus.id, to: hoverId }), relationKey({ from: hoverId, to: state.focus.id })]
        : [];
  const stepHover = hoverId === null ? undefined : lit.trace?.steps.find((item) => item.node === hoverId)?.via;

  const cables: CableView[] = [];
  const leaders = new Set<NodeId>();
  for (const relation of graph.index.relations) {
    const key = relationKey(relation);
    const cable = placement.cables.get(key);
    if (cable === undefined || !isShown(relation, state.muted)) continue;
    const cls = classOf(relation.kinds[0]);
    const active = lit.cables.get(key);
    const preview: CableTone | null =
      active !== undefined || mapHoverId === null ? null : relation.from === mapHoverId ? "previewOut" : relation.to === mapHoverId ? "previewIn" : null;
    const resting = !graph.routers.has(relation.from) && cls !== "reads";
    const tone = active?.tone ?? preview ?? (resting ? "weave" : null);
    if (tone === null) continue;
    if (tone === "weave") for (const id of cable.leaders) leaders.add(id);
    cables.push({
      key,
      d: cable.d,
      rest: cable.rest,
      cls,
      tone,
      conditional: relation.conditional,
      end: cable.end,
      arrives: cable.arrives,
      length: cable.length,
      order: active?.order ?? 0,
      bright: brightKeys.includes(key) || stepHover === key,
    });
  }

  return {
    nodes,
    cables,
    leaders: [...leaders].flatMap((id) => {
      const placed = placement.nodes.get(id);
      return placed?.kind === "seat" && placed.leader !== "" ? [placed.leader] : [];
    }),
    weave: focused || searching || state.lens === "tools" ? "low" : "rest",
    camera: resolveCamera(state, input),
    strip: stripOf({ state, graph, trace: lit.trace, hits }),
    hits,
    trace: lit.trace,
    cursor: state.focus.kind === "route" && lit.trace !== null ? cursorNodeOf(lit.trace, state.focus.cursor) : null,
    lens: state.lens,
  };
};
