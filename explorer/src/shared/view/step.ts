import { followFocus, clamp, resolveCamera, zoomedAbout } from "./camera";
import { wellFormed } from "./hash";
import { normalizePlace } from "./history";
import { focusTarget, type Reading, type Stage, type ViewEvent, type ViewState } from "./state";
import { entryOfTrace, traceOf } from "./trace";

interface Target {
  readonly path: string;
  readonly anchor: string | null;
  readonly line: number | null;
}

const open = (reading: Reading, target: Target): Reading => {
  if (reading.kind === "closed") return { kind: "open", ...target, back: [] };
  return { kind: "open", ...target, back: reading.path === target.path ? reading.back : [...reading.back, reading.path] };
};

/** Sends the reader to a target. The visit counter grows also when the target is the one on show, so the reader scrolls to it again. */
const sentTo = (state: ViewState, target: Target): Pick<ViewState, "reading" | "visit"> => ({
  reading: open(state.reading, target),
  visit: state.visit + 1,
});

/** The reader history after the address changes: the Back button of the browser pops it, and a new path extends it. */
const backAfterAddressChange = (from: Reading, to: Reading): readonly string[] => {
  if (from.kind === "closed" || to.kind === "closed") return [];
  if (to.path === from.path) return from.back;
  return from.back.at(-1) === to.path ? from.back.slice(0, -1) : [...from.back, from.path];
};

const reduce = (state: ViewState, event: ViewEvent, stage: Stage): ViewState => {
  const { graph } = stage;
  switch (event.kind) {
    case "pointed":
      return { ...state, hover: event.hover };
    case "picked": {
      const node = graph.nodes.get(event.id);
      if (node === undefined) return state;
      return followFocus({ ...state, focus: { kind: "node", id: node.id }, ...sentTo(state, { path: node.entry, anchor: null, line: null }) }, stage);
    }
    case "traced": {
      const trace = traceOf(graph, event.route);
      if (trace === null) return state;
      const entry = entryOfTrace(trace, graph);
      return followFocus(
        {
          ...state,
          focus: { kind: "route", route: event.route, cursor: 0 },
          ...(entry === null ? {} : sentTo(state, { path: entry, anchor: null, line: null })),
        },
        stage,
      );
    }
    case "stepped": {
      if (state.focus.kind !== "route") return state;
      const trace = traceOf(graph, state.focus.route);
      if (trace === null) return state;
      const cursor = clamp(state.focus.cursor + event.by, 0, trace.steps.length);
      if (cursor === state.focus.cursor) return state;
      const evidence = trace.steps[cursor - 1]?.evidence;
      const entry = entryOfTrace(trace, graph);
      const target: Target | null =
        evidence !== undefined ? { path: evidence.file, anchor: null, line: evidence.line } : entry !== null ? { path: entry, anchor: null, line: null } : null;
      return followFocus(
        { ...state, focus: { ...state.focus, cursor }, ...(state.reading.kind === "closed" || target === null ? {} : sentTo(state, target)) },
        stage,
      );
    }
    case "typed":
      return { ...state, query: wellFormed(event.query) };
    case "lensed":
      return { ...state, lens: event.lens };
    case "legendToggled": {
      const muted = new Set(state.muted);
      if (!muted.delete(event.cls)) muted.add(event.cls);
      return { ...state, muted };
    }
    case "linkFollowed": {
      const owner = graph.entries.get(event.path);
      return followFocus(
        {
          ...state,
          focus: owner === undefined ? state.focus : { kind: "node", id: owner },
          ...sentTo(state, { path: event.path, anchor: event.anchor, line: event.line }),
        },
        stage,
      );
    }
    case "inspected": {
      const relation = graph.relations.get(event.key);
      if (relation === undefined) return state;
      const evidence = relation.evidence[0];
      return followFocus({ ...state, ...sentTo(state, { path: evidence.file, anchor: null, line: evidence.line }) }, stage);
    }
    // The block that states a relation opens beside the selection. The selection stays: the block is evidence about it.
    case "evidenceOpened":
      return followFocus({ ...state, ...sentTo(state, { path: event.file, anchor: null, line: event.line }) }, stage);
    case "wentBack": {
      if (state.reading.kind === "closed") return state;
      const path = state.reading.back.at(-1);
      if (path === undefined) return state;
      const owner = graph.entries.get(path);
      return followFocus(
        {
          ...state,
          focus: owner === undefined ? state.focus : { kind: "node", id: owner },
          reading: { kind: "open", path, anchor: null, line: null, back: state.reading.back.slice(0, -1) },
          visit: state.visit + 1,
        },
        stage,
      );
    }
    case "readerClosed":
      return { ...state, reading: { kind: "closed" } };
    case "cleared":
      if (state.reading.kind === "open") return { ...state, reading: { kind: "closed" } };
      if (state.focus.kind !== "none") return { ...state, focus: { kind: "none" } };
      return state.query === "" ? state : { ...state, query: "" };
    case "fitted":
      return { ...state, camera: { kind: "fit" } };
    case "zoomed":
      return { ...state, camera: { kind: "free", ...zoomedAbout(resolveCamera(state, stage), event.factor, event.at) } };
    case "panned": {
      const from = resolveCamera(state, stage);
      return { ...state, camera: { kind: "free", scale: from.scale, tx: from.tx + event.dx, ty: from.ty + event.dy } };
    }
    case "restored": {
      const place = normalizePlace(event.place, graph);
      const back = backAfterAddressChange(state.reading, place.reading);
      return followFocus(
        { ...state, ...place, reading: place.reading.kind === "open" ? { ...place.reading, back } : place.reading, hover: { kind: "none" } },
        stage,
      );
    }
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
};

/**
 * Pure. No event changes a world position.
 * A hover on a cable ends when the focus changes, because the cable under the pointer is then possibly no longer lit.
 */
export const step = (state: ViewState, event: ViewEvent, stage: Stage): ViewState => {
  const next = reduce(state, event, stage);
  const litSetChanged = focusTarget(next.focus) !== focusTarget(state.focus);
  return litSetChanged && next.hover.kind === "cable" ? { ...next, hover: { kind: "none" } } : next;
};
