import type { Graph } from "../graph";
import type { Placement, Point } from "../layout";
import type { NodeId, RelationKey, RouteId } from "../model";
import type { CableClass } from "./cable-class";

/** Sticky. `cursor` 0 is the head of the route. `cursor` n is step n. */
export type Focus =
  | { readonly kind: "none" }
  | { readonly kind: "node"; readonly id: NodeId }
  | { readonly kind: "route"; readonly route: RouteId; readonly cursor: number };

/** Transient. `ref` is a skill name in the reader text. */
export type Hover =
  | { readonly kind: "none" }
  | { readonly kind: "node" | "ref"; readonly id: NodeId }
  | { readonly kind: "cable"; readonly key: RelationKey };

/** `path` comes from the URL hash, so it is a plain string until the reader finds it in the index. */
export type Reading =
  | { readonly kind: "closed" }
  | {
      readonly kind: "open";
      readonly path: string;
      readonly anchor: string | null;
      readonly line: number | null;
      readonly back: readonly string[];
    };

export type StageTarget = { readonly kind: "rest" } | { readonly kind: "node"; readonly id: NodeId } | { readonly kind: "route"; readonly route: RouteId };

/**
 * What is arranged, as a fact apart from what is selected.
 * `unlocked`: the stage follows the selection, so a pick moves nodes.
 * `locked`: the stage is the one that was on show when the user locked it. No pick, trace, or Escape changes it.
 */
export type Pin = { readonly kind: "unlocked" } | { readonly kind: "locked"; readonly stage: StageTarget };

const stageOfFocus = (focus: Focus): StageTarget =>
  focus.kind === "none" ? { kind: "rest" } : focus.kind === "node" ? { kind: "node", id: focus.id } : { kind: "route", route: focus.route };

export const stageTargetOf = (state: Pick<ViewState, "focus" | "pin">): StageTarget => (state.pin.kind === "locked" ? state.pin.stage : stageOfFocus(state.focus));

export const stageName = (target: StageTarget): string => (target.kind === "rest" ? "rest" : target.kind === "node" ? `node ${target.id}` : `route ${target.route}`);

/** What is lit depends on this and not on the cursor: each step of a trace has the same lit set as its route. */
export const focusTarget = (focus: Focus): string => stageName(stageOfFocus(focus));

export const LENSES = ["relations", "tools"] as const;
export type Lens = (typeof LENSES)[number];

export interface Transform {
  readonly scale: number;
  readonly tx: number;
  readonly ty: number;
}

/** `fit` follows the window. */
export type Camera = { readonly kind: "fit" } | ({ readonly kind: "free" } & Transform);

export interface ViewState {
  readonly focus: Focus;
  readonly pin: Pin;
  readonly hover: Hover;
  readonly reading: Reading;
  /** Grows each time the reader is sent to a target, also to the target that it shows. The reader scrolls again when it grows. */
  readonly visit: number;
  readonly query: string;
  readonly lens: Lens;
  readonly muted: ReadonlySet<CableClass>;
  readonly camera: Camera;
}

/** The part of the state that the URL hash holds. */
export type Place = Pick<ViewState, "focus" | "pin" | "reading" | "query" | "lens" | "muted">;

export const INITIAL: ViewState = {
  focus: { kind: "none" },
  pin: { kind: "unlocked" },
  hover: { kind: "none" },
  reading: { kind: "closed" },
  visit: 0,
  query: "",
  lens: "relations",
  muted: new Set(),
  camera: { kind: "fit" },
};

export const placeOf = (state: ViewState): Place => ({
  focus: state.focus,
  pin: state.pin,
  reading: state.reading,
  query: state.query,
  lens: state.lens,
  muted: state.muted,
});

export type ViewEvent =
  | { readonly kind: "pointed"; readonly hover: Hover }
  | { readonly kind: "picked"; readonly id: NodeId }
  | { readonly kind: "traced"; readonly route: RouteId }
  | { readonly kind: "stepped"; readonly by: 1 | -1 }
  | { readonly kind: "typed"; readonly query: string }
  | { readonly kind: "lensed"; readonly lens: Lens }
  | { readonly kind: "legendToggled"; readonly cls: CableClass }
  | { readonly kind: "linkFollowed"; readonly path: string; readonly anchor: string | null; readonly line: number | null }
  | { readonly kind: "inspected"; readonly key: RelationKey }
  | { readonly kind: "evidenceOpened"; readonly file: string; readonly line: number }
  | { readonly kind: "wentBack" | "cleared" | "deselected" | "readerClosed" | "fitted" | "lockToggled" }
  | { readonly kind: "zoomed"; readonly factor: number; readonly at: Point }
  | { readonly kind: "panned"; readonly dx: number; readonly dy: number }
  | { readonly kind: "restored"; readonly place: Place };

/** The map area in CSS px. `reader` is the width that the reader covers on the right while it is open. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly reader: number;
}

export interface Stage {
  readonly graph: Graph;
  readonly placement: Placement;
  readonly viewport: Viewport;
}
