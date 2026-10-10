import { COLUMN_IDS, nameOf, type Graph } from "../graph";
import type { Node, NodeId, RouteId } from "../model";

export type FinderHit =
  | { readonly kind: "node"; readonly id: NodeId; readonly field: "name" | "title" | "description" }
  | { readonly kind: "route"; readonly route: RouteId }
  | { readonly kind: "trigger"; readonly target: NodeId; readonly condition: string };

export const tokensOf = (query: string): string[] => query.toLowerCase().split(/\s+/).filter((token) => token !== "");

const holds = (text: string, tokens: readonly string[]): boolean => {
  const lower = text.toLowerCase();
  return tokens.every((token) => lower.includes(token));
};

/** What a node is for, in the words of its file. A skill with no description gives its defects. */
export const purposeOf = (node: Node): string => {
  switch (node.kind) {
    case "skill":
      return node.description !== "" ? node.description : node.defects.join(" ");
    case "playbook":
      return node.purpose;
    case "hosted":
      return node.title;
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
};

/**
 * Every node by column, then by row, with each hosted file after its host. Two things depend on this order:
 * the order of the hits in the finder, and the order in which the Tab key goes through the map.
 */
export const nodesInMapOrder = (graph: Graph): Node[] =>
  COLUMN_IDS.flatMap((column) => graph.columns[column].flatMap((node): Node[] => [node, ...(graph.hosted.get(node.id) ?? [])]));

/** Names first, then titles, route tasks, trigger conditions, and descriptions. */
export const findHits = (graph: Graph, query: string): readonly FinderHit[] => {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return [];
  const nodes = nodesInMapOrder(graph);
  const first = tokens[0] ?? "";
  const named = nodes.filter((node) => holds(nameOf(node), tokens));
  const startsWith = (node: Node): number => (nameOf(node).toLowerCase().startsWith(first) ? 0 : 1);
  const taken = new Set(named.map((node) => node.id));
  const titled = nodes.filter((node) => !taken.has(node.id) && holds(node.title, tokens));
  for (const node of titled) taken.add(node.id);

  return [
    ...[...named].sort((a, b) => startsWith(a) - startsWith(b)).map((node): FinderHit => ({ kind: "node", id: node.id, field: "name" })),
    ...titled.map((node): FinderHit => ({ kind: "node", id: node.id, field: "title" })),
    ...graph.index.routes.filter((route) => holds(route.task, tokens)).map((route): FinderHit => ({ kind: "route", route: route.id })),
    ...graph.index.triggers
      .filter((trigger) => holds(trigger.condition, tokens) && graph.nodes.has(trigger.target))
      .map((trigger): FinderHit => ({ kind: "trigger", target: trigger.target, condition: trigger.condition })),
    ...nodes
      .filter((node) => !taken.has(node.id) && node.kind !== "hosted" && holds(purposeOf(node), tokens))
      .map((node): FinderHit => ({ kind: "node", id: node.id, field: "description" })),
  ];
};

export const matchedNodes = (graph: Graph, hits: readonly FinderHit[]): Set<NodeId> => {
  const ids = new Set<NodeId>();
  for (const hit of hits) {
    if (hit.kind === "node") ids.add(hit.id);
    else if (hit.kind === "trigger") ids.add(hit.target);
    else {
      const route = graph.routes.get(hit.route);
      if (route === undefined) continue;
      if (route.playbook !== null) ids.add(route.playbook);
      for (const id of route.skills) ids.add(id);
    }
  }
  return ids;
};
