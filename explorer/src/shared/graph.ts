import {
  relationKey,
  type ExplorerIndex,
  type FileRecord,
  type HostedNode,
  type Node,
  type NodeId,
  type PlaybookNode,
  type Relation,
  type RelationKey,
  type Route,
  type RouteId,
  type SkillNode,
} from "./model";
import { byCodeUnit } from "./order";

/** Left to right: distance from the request. */
export const COLUMN_IDS = ["router", "playbooks", "skills", "principles"] as const;
export type ColumnId = (typeof COLUMN_IDS)[number];

export type SeatedNode = SkillNode | PlaybookNode;

export interface Graph {
  readonly index: ExplorerIndex;
  readonly nodes: ReadonlyMap<NodeId, Node>;
  /** Each column in rank order. */
  readonly columns: { readonly [Column in ColumnId]: readonly SeatedNode[] };
  /** Host to its hosted files, by path. */
  readonly hosted: ReadonlyMap<NodeId, readonly HostedNode[]>;
  readonly relations: ReadonlyMap<RelationKey, Relation>;
  readonly out: ReadonlyMap<NodeId, readonly Relation[]>;
  readonly into: ReadonlyMap<NodeId, readonly Relation[]>;
  /** Skill name to node. */
  readonly names: ReadonlyMap<string, NodeId>;
  /** Entry path to node. */
  readonly entries: ReadonlyMap<string, NodeId>;
  readonly files: ReadonlyMap<string, FileRecord>;
  readonly routes: ReadonlyMap<RouteId, Route>;
  readonly routers: ReadonlySet<NodeId>;
  /** Nodes that differ from the committed record. */
  readonly changed: ReadonlySet<NodeId>;
}

const ranked = <T extends { readonly id: NodeId; readonly name: string }>(
  items: readonly T[],
  rankOf: ReadonlyMap<NodeId, number>,
): T[] =>
  [...items].sort((a, b) => {
    const left = rankOf.get(a.id) ?? Number.POSITIVE_INFINITY;
    const right = rankOf.get(b.id) ?? Number.POSITIVE_INFINITY;
    return left === right ? byCodeUnit(a.name, b.name) : left < right ? -1 : 1;
  });

const firstPosition = (ids: readonly (NodeId | null)[]): Map<NodeId, number> => {
  const positions = new Map<NodeId, number>();
  ids.forEach((id, position) => {
    if (id !== null && !positions.has(id)) positions.set(id, position);
  });
  return positions;
};

const grouped = (relations: readonly Relation[], end: "from" | "to"): Map<NodeId, Relation[]> => {
  const groups = new Map<NodeId, Relation[]>();
  for (const relation of relations) {
    const list = groups.get(relation[end]);
    if (list === undefined) groups.set(relation[end], [relation]);
    else list.push(relation);
  }
  return groups;
};

export const toGraph = (index: ExplorerIndex): Graph => {
  const skills: SkillNode[] = [];
  const playbooks: PlaybookNode[] = [];
  const hosted = new Map<NodeId, HostedNode[]>();
  for (const node of index.nodes) {
    if (node.kind === "skill") skills.push(node);
    else if (node.kind === "playbook") playbooks.push(node);
    else hosted.set(node.host, [...(hosted.get(node.host) ?? []), node]);
  }
  for (const files of hosted.values()) files.sort((a, b) => byCodeUnit(a.entry, b.entry));

  const routeRank = firstPosition(index.routes.map((route) => route.playbook));
  const triggerRank = firstPosition(index.triggers.map((trigger) => trigger.target));
  const none = new Map<NodeId, number>();

  return {
    index,
    nodes: new Map(index.nodes.map((node) => [node.id, node])),
    columns: {
      router: ranked(skills.filter((node) => node.family === "router"), none),
      playbooks: ranked(playbooks, routeRank),
      skills: ranked(skills.filter((node) => node.family === "skill"), none),
      principles: ranked(skills.filter((node) => node.family === "principle"), triggerRank),
    },
    hosted,
    relations: new Map(index.relations.map((relation) => [relationKey(relation), relation])),
    out: grouped(index.relations, "from"),
    into: grouped(index.relations, "to"),
    names: new Map(skills.map((node) => [node.name, node.id])),
    entries: new Map(index.nodes.map((node) => [node.entry, node.id])),
    files: new Map(index.files.map((file) => [file.path, file])),
    routes: new Map(index.routes.map((route) => [route.id, route])),
    routers: new Set(skills.filter((node) => node.family === "router").map((node) => node.id)),
    changed: new Set(index.record.kind === "behind" ? [...index.record.added, ...index.record.changed] : []),
  };
};

/** The name a person reads for a node. A hosted file shows its file name. */
export const nameOf = (node: Node): string => (node.kind === "hosted" ? (node.entry.split("/").at(-1) ?? node.entry) : node.name);

/** The skill that owns a node's files: the node itself, or the host of a playbook or of a hosted file. */
export const ownerOf = (graph: Graph, node: Node): Node => (node.kind === "skill" ? node : (graph.nodes.get(node.host) ?? node));
