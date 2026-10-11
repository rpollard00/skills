import { focusLayout, type Arrangement, type Row } from "../focus-layout";
import type { Graph } from "../graph";
import type { Placed, Placement } from "../layout";
import type { NodeId } from "../model";
import { stageName, type StageTarget } from "./state";

export type Stand = Placed | Row;

const arrangements = new WeakMap<Graph, Map<string, Arrangement | null>>();

/** The focus arrangement that a stage shows, and null for the rest map. */
export const arrangementOf = (graph: Graph, target: StageTarget): Arrangement | null => {
  if (target.kind === "rest") return null;
  const known = arrangements.get(graph) ?? new Map<string, Arrangement | null>();
  arrangements.set(graph, known);
  const key = stageName(target);
  if (!known.has(key)) known.set(key, focusLayout(graph, target));
  return known.get(key) ?? null;
};

/** Where a node is on the stage. Undefined when a focus arrangement is on the stage and the node is not in it. */
export const standOnStage = (id: NodeId, arrangement: Arrangement | null, placement: Placement): Stand | undefined =>
  arrangement === null ? placement.nodes.get(id) : arrangement.nodes.get(id);

/** Where a node is drawn. A node that is off the stage keeps its seat of the rest map, where it is not in view. */
export const standOf = (id: NodeId, arrangement: Arrangement | null, placement: Placement): Stand | undefined => arrangement?.nodes.get(id) ?? placement.nodes.get(id);
