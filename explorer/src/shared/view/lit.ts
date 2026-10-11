import { WORD_BOX, wordWidthOf, type Arrangement, type Branch } from "../focus-layout";
import type { Graph } from "../graph";
import { cablesOnOneTrunk, pathOf, type Cable, type Placement, type Point, type Span } from "../layout";
import { relationKey, type NodeId, type Relation, type RelationKey } from "../model";
import { crosses, GATE, gateOn, isOneLine, lengthOf, levelRunsOf, pointsOf, uprightsOf, WORD_CLEAR, wordOn } from "../polyline";
import { latticeOf, routeInPlace, type Lattice } from "../stage-lattice";
import { classOf, isShown, weightOf, wordsOf } from "./cable-class";
import { nodesInMapOrder } from "./finder";
import type { CableTone, CableView, NodeTone } from "./scene";
import { stageTargetOf, type StageTarget, type ViewState } from "./state";
import { traceOf, type Trace } from "./trace";

/** What a locked stage cannot draw, because one end is a node that is not on it. */
export type Hidden = { readonly kind: "none" } | { readonly kind: "relations"; readonly count: number } | { readonly kind: "steps"; readonly count: number };

/** A lit cable in place that has no room for its word. The word then goes beside the name of `neighbour`. */
export interface Unworded {
  readonly key: RelationKey;
  readonly text: string;
  readonly tone: CableTone;
  /** The node at the other end from the selection. For a trace, the target of the cable. */
  readonly neighbour: NodeId;
  readonly bright: boolean;
}

export interface Lit {
  readonly tones: ReadonlyMap<NodeId, NodeTone>;
  /** The cables of the selection, of the node under the pointer, and of the quiet frame. The resting weave is not here. */
  readonly cables: readonly CableView[];
  readonly unworded: readonly Unworded[];
  readonly trace: Trace | null;
  readonly hidden: Hidden;
  /** The selected node, when a lock holds a stage that does not have it. */
  readonly absent: NodeId | null;
  readonly dimsTheRest: boolean;
}

interface Wire {
  readonly d: string;
  readonly points: readonly Point[];
  readonly length: number;
  readonly end: Point;
  readonly arrives: 1 | -1;
}

interface OnStage {
  readonly has: (id: NodeId) => boolean;
  readonly placeOf: (id: NodeId) => number;
  /** `laneOwner` is the node whose cables share a trunk: the selected node, or the source of a step. */
  readonly wire: (relation: Relation, laneOwner: NodeId) => Wire | null;
}

const wireOfCable = (cable: Cable | undefined): Wire | null =>
  cable === undefined ? null : { d: cable.d, points: pointsOf(cable.segments), length: cable.length, end: cable.end, arrives: cable.arrives };

const wireOfPoints = (points: readonly Point[] | null): Wire | null => {
  const end = points?.at(-1);
  const beforeEnd = points?.at(-2);
  if (points === null || end === undefined || beforeEnd === undefined) return null;
  return { d: pathOf(points), points, length: lengthOf(points), end, arrives: end.x >= beforeEnd.x ? 1 : -1 };
};

const onRestMap = (graph: Graph, placement: Placement): OnStage => {
  const place = new Map(nodesInMapOrder(graph).map((node, index) => [node.id, index]));
  const outOf = new Map<NodeId, ReadonlyMap<RelationKey, Cable>>();
  const onOneTrunk = (source: NodeId): ReadonlyMap<RelationKey, Cable> => {
    const known = outOf.get(source) ?? cablesOnOneTrunk(graph, placement, source);
    outOf.set(source, known);
    return known;
  };
  return {
    has: (id) => placement.nodes.has(id),
    placeOf: (id) => place.get(id) ?? 0,
    wire: (relation, laneOwner) => {
      const key = relationKey(relation);
      return wireOfCable(laneOwner === relation.from ? (onOneTrunk(laneOwner).get(key) ?? placement.cables.get(key)) : placement.cables.get(key));
    },
  };
};

const lattices = new WeakMap<Arrangement, Lattice>();

const onArrangement = (arrangement: Arrangement): OnStage => {
  const place = new Map(arrangement.order.map((id, index) => [id, index]));
  const lattice = lattices.get(arrangement) ?? latticeOf(arrangement);
  lattices.set(arrangement, lattice);
  return {
    has: (id) => arrangement.nodes.has(id),
    placeOf: (id) => place.get(id) ?? 0,
    wire: (relation) => wireOfPoints(routeInPlace(arrangement, lattice, relation.from, relation.to)),
  };
};

interface Shown {
  readonly graph: Graph;
  readonly muted: ViewState["muted"];
  readonly isBright: (key: RelationKey) => boolean;
}

const viewOf = (input: {
  readonly relation: Relation;
  readonly wire: Wire;
  readonly tone: CableTone;
  readonly order: number;
  readonly words: CableView["words"];
  readonly gate: Point | null;
  readonly back: CableView["back"];
  readonly bright: boolean;
}): CableView => {
  const cls = classOf(input.relation.kinds[0]);
  return {
    key: relationKey(input.relation),
    d: input.wire.d,
    points: input.wire.points,
    rest: "",
    cls,
    weight: weightOf(cls),
    tone: input.tone,
    conditional: input.relation.conditional,
    words: input.words,
    gate: input.gate,
    back: input.back,
    end: input.wire.end,
    arrives: input.wire.arrives,
    length: input.wire.length,
    order: input.order,
    bright: input.bright,
  };
};

interface Marked {
  readonly cables: CableView[];
  readonly unworded: readonly Unworded[];
}

/** A cable of the selection that is drawn where its two nodes are. `far` is its end at the other node. */
interface InPlaceLine {
  readonly relation: Relation;
  readonly wire: Wire;
  readonly tone: CableTone;
  readonly order: number;
  readonly far: "start" | "end";
}

const GATE_REACH = GATE.radius + 1;

const passesUnderAGateAt = (points: readonly Point[], spot: Point): boolean =>
  crosses(points, { x: spot.x - GATE_REACH, y: spot.y - GATE_REACH, width: GATE_REACH * 2, height: GATE_REACH * 2 });

const farPortOf = (line: InPlaceLine): Point | undefined => (line.far === "end" ? line.wire.end : line.wire.points[0]);

const nameOfPort = (port: Point | undefined): string => (port === undefined ? "" : `${port.x},${port.y}`);

/**
 * The word and the gate of a cable are next to the other node, on the run that ends at the port of that node.
 * The cables that end at one port share that run: a relation and the relation back, or the cables to a skill and to its file.
 * Thus one port has one word and one gate, those of the first cable in `lines`. Each other cable at the port has neither.
 * A gate on a run that a cable to a different port also uses reads as the condition of that cable, so a gate has no place there.
 * A word on a part of the run that a different line also uses reads as the word of that line, so a word has no place there.
 * Two cables between the same two ports are one line, and the word of the first one is the word of that line.
 * A word has the color of the ground behind it, so it keeps clear of each upright of `lines` and of `frame`, and of each word before it.
 */
const withMarks = (lines: readonly InPlaceLine[], frame: readonly CableView[], shown: Shown, hasWords: boolean): Marked => {
  const uprights = [...frame.map((cable) => cable.points), ...lines.map((line) => line.wire.points)].flatMap(uprightsOf);
  const portsWithASpeaker = new Set<string>();
  const words: { readonly y: number; readonly span: Span }[] = [];
  const isOnRow = (y: number, top: number, bottom: number): boolean => top <= y + WORD_BOX.height / 2 && bottom >= y - WORD_BOX.height / 2;
  const unworded: Unworded[] = [];
  const isTheRelationBack = (line: InPlaceLine): boolean =>
    line.far === "start" && lines.some((other) => other.far === "end" && other.relation.from === line.relation.to && other.relation.to === line.relation.from);

  const cables = lines.map((line) => {
    const { relation, wire } = line;
    const port = farPortOf(line);
    const portName = nameOfPort(port);
    const speaks = !portsWithASpeaker.has(portName);
    portsWithASpeaker.add(portName);
    const isOnlyOnCablesOfThisPort = (spot: Point): boolean => !lines.some((other) => nameOfPort(farPortOf(other)) !== portName && passesUnderAGateAt(other.wire.points, spot));

    const text = wordsOf(relation);
    const width = wordWidthOf(text);
    const taken: Span[] =
      port === undefined
        ? []
        : [
            ...uprights.filter((upright) => isOnRow(port.y, upright.top, upright.bottom)).map((upright) => ({ from: upright.x - WORD_CLEAR.corner, to: upright.x + WORD_CLEAR.corner })),
            ...words.filter((word) => isOnRow(port.y, word.y, word.y)).map((word) => word.span),
            ...lines
              .filter((other) => other !== line && !isOneLine(other.wire.points, wire.points))
              .flatMap((other) => levelRunsOf(other.wire.points))
              .filter((run) => isOnRow(port.y, run.y, run.y))
              .map((run) => ({ from: run.from - WORD_CLEAR.line, to: run.to + WORD_CLEAR.line })),
          ];
    const gate = speaks && relation.conditional ? gateOn(wire.points, line.far, isOnlyOnCablesOfThisPort) : null;
    const isGateOnTheRunOfTheWord = gate !== null && gate.y === port?.y;
    const air = { atEnd: isGateOnTheRunOfTheWord ? WORD_CLEAR.gate : WORD_CLEAR.arrow, atCorner: WORD_CLEAR.corner };
    const at = speaks && hasWords ? wordOn(wire.points, line.far, width, air, taken) : null;
    if (at !== null) words.push({ y: at.y, span: { from: at.x - width / 2 - WORD_CLEAR.word, to: at.x + width / 2 + WORD_CLEAR.word } });
    if (at === null && hasWords && !isTheRelationBack(line)) {
      unworded.push({ key: relationKey(relation), text, tone: line.tone, neighbour: line.far === "end" ? relation.to : relation.from, bright: shown.isBright(relationKey(relation)) });
    }

    return viewOf({
      relation,
      wire,
      tone: line.tone,
      order: line.order,
      words: at === null ? null : { text, at },
      gate,
      back: null,
      bright: shown.isBright(relationKey(relation)),
    });
  });
  return { cables, unworded };
};

interface InPlace extends Marked {
  readonly out: readonly { readonly relation: Relation; readonly order: number; readonly length: number }[];
  readonly into: readonly { readonly relation: Relation; readonly order: number }[];
  readonly elsewhere: number;
}

/** A cable out of the lead comes before a cable into it. Thus, of a pair that goes both ways, the cable out of the lead has the word. */
const relationsInPlace = (
  lead: NodeId,
  stage: OnStage,
  frame: readonly CableView[],
  shown: Shown,
  tones: { readonly out: CableTone; readonly into: CableTone },
  hasWords: boolean,
): InPlace => {
  const { graph } = shown;
  const allOut = (graph.out.get(lead) ?? []).filter((relation) => isShown(relation, shown.muted));
  const allInto = (graph.into.get(lead) ?? []).filter((relation) => isShown(relation, shown.muted));
  const out = allOut.filter((relation) => stage.has(relation.to)).sort((a, b) => stage.placeOf(a.to) - stage.placeOf(b.to));
  const into = allInto.filter((relation) => stage.has(relation.from)).sort((a, b) => stage.placeOf(a.from) - stage.placeOf(b.from));

  const lineOf = (relation: Relation, order: number, tone: CableTone, far: InPlaceLine["far"]): InPlaceLine[] => {
    const wire = stage.wire(relation, lead);
    return wire === null ? [] : [{ relation, wire, tone, order, far }];
  };
  const outLines = out.flatMap((relation, order) => lineOf(relation, order, tones.out, "end"));
  const intoLines = into.flatMap((relation, order) => lineOf(relation, order, tones.into, "start"));
  const lengthOfOut = new Map(outLines.map((line) => [line.relation, line.wire.length]));
  return {
    ...withMarks([...outLines, ...intoLines], frame, shown, hasWords),
    out: out.map((relation, order) => ({ relation, order, length: lengthOfOut.get(relation) ?? 0 })),
    into: into.map((relation, order) => ({ relation, order })),
    elsewhere: allOut.length - out.length + allInto.length - into.length,
  };
};

const frameOf = (arrangement: Arrangement | null, shown: Shown): CableView[] =>
  [...(arrangement?.cables.values() ?? [])].flatMap((branch) => {
    const relation = shown.graph.relations.get(branch.key);
    if (relation === undefined || !isShown(relation, shown.muted)) return [];
    return [viewOf({ relation, wire: { d: branch.d, points: branch.points, length: branch.length, end: branch.end, arrives: 1 }, tone: "frame", order: 0, words: null, gate: null, back: null, bright: false })];
  });

/** `back`: the relation from the target to the source, when the branch has the mark of a relation that goes both ways. */
const viewOfBranch = (branch: Branch, relation: Relation, tone: CableTone, order: number, bright: boolean, back: Relation | undefined): CableView =>
  viewOf({
    relation,
    wire: { d: branch.d, points: branch.points, length: branch.length, end: branch.end, arrives: 1 },
    tone,
    order,
    words: { text: wordsOf(relation), at: branch.word },
    gate: relation.conditional ? branch.gate : null,
    back: branch.back === null ? null : { ...branch.back, conditional: back?.conditional ?? false },
    bright,
  });

const NOTHING: Lit = { tones: new Map(), cables: [], unworded: [], trace: null, hidden: { kind: "none" }, absent: null, dimsTheRest: false };

const ownCombs = (id: NodeId, arrangement: Arrangement, shown: Shown): Lit => {
  const { graph } = shown;
  const place = new Map(arrangement.order.map((member, index) => [member, index]));
  const inZoneOrder = (a: NodeId, b: NodeId): number => (place.get(a) ?? 0) - (place.get(b) ?? 0);
  const out = (graph.out.get(id) ?? []).filter((relation) => isShown(relation, shown.muted)).sort((a, b) => inZoneOrder(a.to, b.to));
  const into = (graph.into.get(id) ?? []).filter((relation) => isShown(relation, shown.muted)).sort((a, b) => inZoneOrder(a.from, b.from));
  const tones = new Map<NodeId, NodeTone>();
  const cables: CableView[] = [];
  const draw = (relation: Relation, tone: CableTone, order: number): number => {
    const branch = arrangement.cables.get(relationKey(relation));
    if (branch !== undefined) cables.push(viewOfBranch(branch, relation, tone, order, shown.isBright(branch.key), graph.relations.get(relationKey({ from: relation.to, to: relation.from }))));
    return branch?.length ?? 0;
  };
  out.forEach((relation, order) => tones.set(relation.to, { kind: "needs", via: relation.kinds[0], order, length: draw(relation, "out", order) }));
  into.forEach((relation, order) => {
    tones.set(relation.from, tones.has(relation.from) ? { kind: "mutual" } : { kind: "neededBy", via: relation.kinds[0], order });
    draw(relation, "in", order);
  });
  tones.set(id, { kind: "selected" });
  return { tones, cables, unworded: [], trace: null, hidden: { kind: "none" }, absent: null, dimsTheRest: true };
};

const nodeInPlace = (id: NodeId, stage: OnStage, frame: readonly CableView[], shown: Shown): Lit => {
  if (!stage.has(id)) return { ...NOTHING, cables: [...frame], absent: id };
  const placed = relationsInPlace(id, stage, frame, shown, { out: "out", into: "in" }, true);
  const tones = new Map<NodeId, NodeTone>();
  for (const { relation, order, length } of placed.out) tones.set(relation.to, { kind: "needs", via: relation.kinds[0], order, length });
  for (const { relation, order } of placed.into) tones.set(relation.from, tones.has(relation.from) ? { kind: "mutual" } : { kind: "neededBy", via: relation.kinds[0], order });
  tones.set(id, { kind: "selected" });
  return {
    tones,
    cables: [...frame, ...placed.cables],
    unworded: placed.unworded,
    trace: null,
    hidden: placed.elsewhere === 0 ? { kind: "none" } : { kind: "relations", count: placed.elsewhere },
    absent: null,
    dimsTheRest: true,
  };
};

const isRouteWithoutPlaybook = (trace: Trace): boolean => trace.head === null;

/** The steps of a route without a playbook are the skills that the route names, and their cables start together. */
const orderOfStep = (trace: Trace, n: number): number => (isRouteWithoutPlaybook(trace) ? 0 : n);

interface TraceCable {
  readonly key: RelationKey;
  readonly to: NodeId;
  readonly tone: NodeTone;
  readonly order: number;
}

/** `heads`: the relations that the route states. A relation that is both a head and a step counts as the step, so it is in `steps` only. */
const cablesOfTrace = (trace: Trace, graph: Graph): { readonly heads: readonly TraceCable[]; readonly steps: readonly TraceCable[] } => {
  const steps = trace.steps.map((item): TraceCable => {
    const order = orderOfStep(trace, item.n);
    return { key: item.via, to: item.node, tone: { kind: "step", n: item.n, order, conditional: item.conditional }, order };
  });
  const isStep = new Set(steps.map((item) => item.key));
  const heads = trace.heads.flatMap((key): TraceCable[] => {
    const to = graph.relations.get(key)?.to;
    return to === undefined || isStep.has(key) ? [] : [{ key, to, tone: { kind: "step", n: 0, order: 0, conditional: false }, order: 0 }];
  });
  return { heads, steps };
};

/** A node that the route names and that is also a step has the tone of the step: the later tone wins. */
const tonesOfTrace = (trace: Trace, cables: ReturnType<typeof cablesOfTrace>, isOnStage: (id: NodeId) => boolean): Map<NodeId, NodeTone> => {
  const tones = new Map<NodeId, NodeTone>();
  if (trace.origin !== null && isOnStage(trace.origin)) tones.set(trace.origin, { kind: "origin" });
  for (const item of [...cables.heads, ...cables.steps]) if (isOnStage(item.to)) tones.set(item.to, item.tone);
  return tones;
};

const ownTrace = (trace: Trace, arrangement: Arrangement, shown: Shown): Lit => {
  const traced = cablesOfTrace(trace, shown.graph);
  const cables = [...traced.heads, ...traced.steps].flatMap((item) => {
    const branch = arrangement.cables.get(item.key);
    const relation = shown.graph.relations.get(item.key);
    return branch === undefined || relation === undefined ? [] : [viewOfBranch(branch, relation, "step", item.order, shown.isBright(item.key), undefined)];
  });
  return { tones: tonesOfTrace(trace, traced, () => true), cables, unworded: [], trace, hidden: { kind: "none" }, absent: null, dimsTheRest: true };
};

const traceInPlace = (trace: Trace, stage: OnStage, frame: readonly CableView[], shown: Shown): Lit => {
  const traced = cablesOfTrace(trace, shown.graph);
  const lineOf = (item: TraceCable): InPlaceLine[] => {
    const relation = shown.graph.relations.get(item.key);
    const wire = relation === undefined || !stage.has(relation.from) || !stage.has(relation.to) ? null : stage.wire(relation, relation.from);
    return relation === undefined || wire === null ? [] : [{ relation, wire, tone: "step", order: item.order, far: "end" }];
  };
  const stepsBeforeHeadsSoThatAStepHasTheWordOfASharedPort = [...traced.steps, ...traced.heads].flatMap(lineOf);
  const absentSteps = trace.steps.filter((item) => !stage.has(item.node)).length;
  const marked = withMarks(stepsBeforeHeadsSoThatAStepHasTheWordOfASharedPort, frame, shown, true);
  return {
    tones: tonesOfTrace(trace, traced, stage.has),
    cables: [...frame, ...marked.cables],
    unworded: marked.unworded,
    trace,
    hidden: absentSteps === 0 ? { kind: "none" } : { kind: "steps", count: absentSteps },
    absent: null,
    dimsTheRest: true,
  };
};

const isArrangedFor = (target: StageTarget, focus: ViewState["focus"]): boolean =>
  (target.kind === "node" && focus.kind === "node" && target.id === focus.id) || (target.kind === "route" && focus.kind === "route" && target.route === focus.route);

/** Pure. */
export const litOf = (input: {
  readonly graph: Graph;
  readonly placement: Placement;
  readonly arrangement: Arrangement | null;
  readonly state: Pick<ViewState, "focus" | "pin" | "hover" | "muted">;
  readonly isBright: (key: RelationKey) => boolean;
}): Lit => {
  const { graph, arrangement, state } = input;
  const shown: Shown = { graph, muted: state.muted, isBright: input.isBright };
  const target = stageTargetOf(state);
  const isOwn = isArrangedFor(target, state.focus);
  const stage = arrangement === null ? onRestMap(graph, input.placement) : onArrangement(arrangement);
  const frame = isOwn ? [] : frameOf(arrangement, shown);

  if (state.focus.kind === "node") {
    return isOwn && arrangement !== null ? ownCombs(state.focus.id, arrangement, shown) : nodeInPlace(state.focus.id, stage, frame, shown);
  }
  if (state.focus.kind === "route") {
    const trace = traceOf(graph, state.focus.route);
    if (trace === null) return { ...NOTHING, cables: frame };
    return isOwn && arrangement !== null ? ownTrace(trace, arrangement, shown) : traceInPlace(trace, stage, frame, shown);
  }
  const under = state.hover.kind === "node" && stage.has(state.hover.id) ? state.hover.id : null;
  const preview = under === null ? [] : relationsInPlace(under, stage, frame, shown, { out: "previewOut", into: "previewIn" }, false).cables;
  return { ...NOTHING, cables: [...frame, ...preview] };
};
