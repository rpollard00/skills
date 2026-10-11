import { nameOf, type Graph } from "../graph";
import { relationKey, type Evidence, type Node, type Relation } from "../model";
import { isShown } from "./cable-class";
import { purposeOf, type FinderHit } from "./finder";
import type { Hidden } from "./lit";
import { cutAtWord, sentenceOf } from "./sentence";
import type { ViewState } from "./state";
import { cursorNodeOf, type Trace } from "./trace";

/** Where the text of a strip is from: what the strip needs of an evidence line. A route gives the same for its own line. */
export type Source = Pick<Evidence, "file" | "line" | "headings">;

export type Strip =
  | { readonly kind: "idle"; readonly skills: number; readonly playbooks: number; readonly hosted: number; readonly relations: number }
  | { readonly kind: "purpose"; readonly name: string; readonly text: string; readonly hidden: Hidden }
  | { readonly kind: "evidence"; readonly from: string; readonly to: string; readonly relation: Relation; readonly shown: Evidence; readonly sentence: string }
  | {
      readonly kind: "trace";
      readonly task: string;
      readonly at: number;
      readonly total: number;
      readonly name: string;
      readonly shown: Source | null;
      readonly sentence: string;
      readonly conditional: boolean;
      readonly hidden: Hidden;
    }
  | { readonly kind: "onlyRouter"; readonly name: string; readonly router: string; readonly sentences: readonly string[]; readonly hidden: Hidden }
  | { readonly kind: "noMatch"; readonly query: string }
  | { readonly kind: "notInView"; readonly name: string };

export const evidenceOfStrip = (strip: Strip): Source | null => (strip.kind === "evidence" || strip.kind === "trace" ? strip.shown : null);

const evidenceStrip = (relation: Relation, graph: Graph): Strip => {
  const from = graph.nodes.get(relation.from);
  const to = graph.nodes.get(relation.to);
  const first = relation.evidence[0];
  return {
    kind: "evidence",
    from: from === undefined ? relation.from : nameOf(from),
    to: to === undefined ? relation.to : nameOf(to),
    relation,
    shown: first,
    sentence: to === undefined ? cutAtWord(first.text) : sentenceOf(first, to),
  };
};

const NOTHING_HIDDEN: Hidden = { kind: "none" };

const purposeStrip = (node: Node, hidden: Hidden): Strip => ({
  kind: "purpose",
  name: nameOf(node),
  text: node.kind !== "hosted" ? purposeOf(node) : node.title === nameOf(node) ? node.entry : `${node.title}. ${node.entry}`,
  hidden,
});

const traceStrip = (trace: Trace, cursor: number, graph: Graph, hidden: Hidden): Strip => {
  const current = trace.steps[cursor - 1];
  const at = cursorNodeOf(trace, cursor);
  const node = at === null ? undefined : graph.nodes.get(at);
  const { route } = trace;
  const isOfTheRoute = (item: Evidence): boolean => item.file === route.file && item.line === route.line;
  /** The line of the route as the index holds it. A second route can state the leg to the same playbook, and then that leg has the line of the first one only. Each relation that the route states has the line. */
  const lineOfTheRoute = trace.heads.flatMap((key) => graph.relations.get(key)?.evidence ?? []).find(isOfTheRoute);
  /** The route states the leg to its playbook, and each leg to a skill when it has no playbook. The index can hold a different line for such a pair: that of a second route. */
  const isALegThatTheRouteStates = current === undefined || trace.head === null;
  const quoted = current === undefined ? lineOfTheRoute : current.evidence;
  const evidence = quoted !== undefined && (!isALegThatTheRouteStates || isOfTheRoute(quoted)) ? quoted : null;
  return {
    kind: "trace",
    task: route.task,
    at: cursor,
    total: trace.steps.length,
    name: node === undefined ? "" : nameOf(node),
    shown: evidence ?? (isALegThatTheRouteStates ? { file: route.file, line: route.line, headings: [] } : null),
    sentence: evidence === null ? "" : node === undefined ? cutAtWord(evidence.text) : sentenceOf(evidence, node),
    conditional: current?.conditional ?? false,
    hidden,
  };
};

const onlyRouterStrip = (node: Node, graph: Graph, hidden: Hidden): Strip | null => {
  const sources = (graph.into.get(node.id) ?? []).map((relation) => relation.from);
  const first = sources[0];
  if (first === undefined || !sources.every((source) => graph.routers.has(source))) return null;
  const router = graph.nodes.get(first);
  if (router === undefined) return null;
  const sentences = [
    ...graph.index.triggers.filter((trigger) => trigger.target === node.id).map((trigger) => trigger.condition),
    ...graph.index.routes.filter((route) => route.playbook === node.id || route.skills.includes(node.id)).map((route) => route.task),
  ];
  return { kind: "onlyRouter", name: nameOf(node), router: nameOf(router), sentences: [...new Set(sentences)], hidden };
};

export const stripOf = (input: {
  readonly state: ViewState;
  readonly graph: Graph;
  readonly trace: Trace | null;
  readonly hits: readonly FinderHit[];
  /** The selected node, when it is not on the locked stage. */
  readonly absent: Node | null;
  /** What the stage cannot draw of the selection. Only a strip that describes the selection has it. */
  readonly hidden: Hidden;
}): Strip => {
  const { state, graph, trace, hits, hidden } = input;

  if (state.hover.kind === "cable") {
    const relation = graph.relations.get(state.hover.key);
    if (relation !== undefined) return evidenceStrip(relation, graph);
  }
  if (state.hover.kind === "node" || state.hover.kind === "ref") {
    const hovered = graph.nodes.get(state.hover.id);
    if (hovered !== undefined) {
      if (state.focus.kind === "node" && state.focus.id !== hovered.id) {
        const relation =
          graph.relations.get(relationKey({ from: state.focus.id, to: hovered.id })) ?? graph.relations.get(relationKey({ from: hovered.id, to: state.focus.id }));
        if (relation !== undefined && isShown(relation, state.muted)) return evidenceStrip(relation, graph);
      }
      const traced = trace?.steps.find((item) => item.node === hovered.id);
      const via = traced === undefined ? undefined : graph.relations.get(traced.via);
      const isTheSelection = state.focus.kind === "node" && state.focus.id === hovered.id;
      return via === undefined ? purposeStrip(hovered, isTheSelection ? hidden : NOTHING_HIDDEN) : evidenceStrip(via, graph);
    }
  }
  if (state.query.trim() !== "" && hits.length === 0) return { kind: "noMatch", query: state.query.trim() };
  if (state.focus.kind === "route" && trace !== null) return traceStrip(trace, state.focus.cursor, graph, hidden);
  if (input.absent !== null) return { kind: "notInView", name: nameOf(input.absent) };
  if (state.focus.kind === "node") {
    const node = graph.nodes.get(state.focus.id);
    if (node !== undefined) return onlyRouterStrip(node, graph, hidden) ?? purposeStrip(node, hidden);
  }
  return {
    kind: "idle",
    skills: graph.index.nodes.filter((node) => node.kind === "skill").length,
    playbooks: graph.columns.playbooks.length,
    hosted: [...graph.hosted.values()].flat().length,
    relations: graph.index.relations.length,
  };
};
