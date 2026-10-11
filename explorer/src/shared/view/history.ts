import type { Graph } from "../graph";
import { clamp } from "./camera";
import { decodeHash, encodeHash, wellFormed } from "./hash";
import { focusTarget, type Focus, type Pin, type Place, type Reading } from "./state";
import { traceOf } from "./trace";

const validFocus = (focus: Focus, graph: Graph): Focus => {
  if (focus.kind === "node") return graph.nodes.has(focus.id) ? focus : { kind: "none" };
  if (focus.kind === "none") return focus;
  const trace = traceOf(graph, focus.route);
  return trace === null ? { kind: "none" } : { ...focus, cursor: clamp(Math.trunc(focus.cursor), 0, trace.steps.length) };
};

const validPin = (pin: Pin, graph: Graph): Pin => {
  if (pin.kind === "unlocked" || pin.stage.kind === "rest") return pin;
  const isKnown = pin.stage.kind === "node" ? graph.nodes.has(pin.stage.id) : traceOf(graph, pin.stage.route) !== null;
  return isKnown ? pin : { kind: "unlocked" };
};

/**
 * The place that the app shows for an address: a focus or a locked stage that the index does not hold is dropped, and a cursor
 * past the last step goes to the last step. The open file stays, so the reader can say that the index does not list it.
 */
export const normalizePlace = (place: Place, graph: Graph): Place => ({
  ...place,
  focus: validFocus(place.focus, graph),
  pin: validPin(place.pin, graph),
  query: wellFormed(place.query),
});

export const samePlace = (a: Place, b: Place): boolean => encodeHash(a) === encodeHash(b);

const openPath = (reading: Reading): string | null => (reading.kind === "open" ? reading.path : null);

export const opensNewEntry = (from: Place, to: Place): boolean =>
  focusTarget(from.focus) !== focusTarget(to.focus) || openPath(from.reading) !== openPath(to.reading);

export type HistoryAction = "none" | "push" | "replace";

/** What to do with the browser history when the address shows `shown` and the app shows `place`. */
export const historyAction = (input: { readonly shown: Place; readonly place: Place; readonly graph: Graph }): HistoryAction => {
  if (samePlace(input.shown, input.place)) return "none";
  const normalized = normalizePlace(input.shown, input.graph);
  if (samePlace(normalized, input.place)) return "replace";
  return opensNewEntry(normalized, input.place) ? "push" : "replace";
};

export interface AddressBar {
  readonly hash: () => string;
  readonly push: (hash: string) => void;
  readonly replace: (hash: string) => void;
}

export const showInAddress = (bar: AddressBar, place: Place, graph: Graph): void => {
  const action = historyAction({ shown: decodeHash(bar.hash()), place, graph });
  if (action === "push") bar.push(encodeHash(place));
  if (action === "replace") bar.replace(encodeHash(place));
};
