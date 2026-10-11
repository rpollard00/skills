import type { ReactNode } from "react";
import { nameOf, type Graph } from "../shared/graph";
import type { StageTarget } from "../shared/view/state";
import { LockClosed } from "./icons";

const heldBy = (locked: StageTarget, graph: Graph): string => {
  if (locked.kind === "rest") return "the rest map";
  if (locked.kind === "route") return graph.routes.get(locked.route)?.task ?? locked.route;
  const node = graph.nodes.get(locked.id);
  return node === undefined ? locked.id : nameOf(node);
};

export const StageCue = ({ locked, graph }: { readonly locked: StageTarget; readonly graph: Graph }): ReactNode => (
  <p className="stage-cue">
    <LockClosed />
    <span>
      Locked <span className="stage-cue-name">{heldBy(locked, graph)}</span>
    </span>
  </p>
);
