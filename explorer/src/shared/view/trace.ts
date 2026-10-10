import type { Graph } from "../graph";
import { relationKey, type Evidence, type NodeId, type Relation, type RelationKey, type Route, type RouteId } from "../model";
import { byCodeUnit } from "../order";
import type { Focus } from "./state";

export interface TraceStep {
  readonly n: number;
  readonly node: NodeId;
  readonly via: RelationKey;
  readonly evidence: Evidence;
  readonly conditional: boolean;
}

export interface Trace {
  readonly route: Route;
  /** The router. */
  readonly origin: NodeId | null;
  /** The playbook of the route, when it has one. */
  readonly head: NodeId | null;
  /** The relations that the route bullet states: the router to the playbook and to each named skill. */
  readonly heads: readonly RelationKey[];
  readonly steps: readonly TraceStep[];
}

const firstLine = (relation: Relation): number => relation.evidence[0].line;

const stepsFrom = (graph: Graph, from: NodeId): TraceStep[] =>
  [...(graph.out.get(from) ?? [])]
    .filter((relation) => !relation.kinds.includes("boundary"))
    .sort((a, b) => firstLine(a) - firstLine(b) || byCodeUnit(a.to, b.to))
    .map((relation, index) => ({
      n: index + 1,
      node: relation.to,
      via: relationKey(relation),
      evidence: relation.evidence[0],
      conditional: relation.conditional,
    }));

/**
 * The router, the playbook of the route, then each outbound relation of the playbook except `boundary`, by first evidence line.
 * A route without a playbook gives the skills that the route names.
 */
export const traceOf = (graph: Graph, routeId: RouteId): Trace | null => {
  const route = graph.routes.get(routeId);
  if (route === undefined) return null;
  const origin = graph.files.get(route.file)?.owner ?? null;
  const named = origin === null ? [] : [route.playbook, ...route.skills].flatMap((to) => (to === null ? [] : [relationKey({ from: origin, to })]));
  const heads = named.filter((key) => graph.relations.has(key));
  if (route.playbook !== null) return { route, origin, head: route.playbook, heads, steps: stepsFrom(graph, route.playbook) };

  const steps = heads.flatMap((key): Omit<TraceStep, "n">[] => {
    const relation = graph.relations.get(key);
    if (relation === undefined) return [];
    const evidence = relation.evidence.find((item) => item.file === route.file && item.line === route.line) ?? relation.evidence[0];
    return [{ node: relation.to, via: key, evidence, conditional: relation.conditional }];
  });
  return { route, origin, head: null, heads, steps: steps.map((step, index) => ({ ...step, n: index + 1 })) };
};

/** The node that the cursor of a trace is on: a step, else the playbook, else the router. */
export const cursorNodeOf = (trace: Trace, cursor: number): NodeId | null => trace.steps[cursor - 1]?.node ?? trace.head ?? trace.origin;

/** The node that the camera keeps in view. */
export const focusedNode = (focus: Focus, graph: Graph): NodeId | null => {
  if (focus.kind === "node") return focus.id;
  if (focus.kind === "none") return null;
  const trace = traceOf(graph, focus.route);
  return trace === null ? null : cursorNodeOf(trace, focus.cursor);
};

export const entryOfTrace = (trace: Trace, graph: Graph): string | null => {
  const first = trace.head ?? trace.steps[0]?.node ?? null;
  return first === null ? null : (graph.nodes.get(first)?.entry ?? null);
};
