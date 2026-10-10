import type { Graph } from "../graph";
import { clamp } from "./camera";
import { encodeHash, wellFormed } from "./hash";
import { focusTarget, type Focus, type Place, type Reading } from "./state";
import { traceOf } from "./trace";

const validFocus = (focus: Focus, graph: Graph): Focus => {
  if (focus.kind === "node") return graph.nodes.has(focus.id) ? focus : { kind: "none" };
  if (focus.kind === "none") return focus;
  const trace = traceOf(graph, focus.route);
  return trace === null ? { kind: "none" } : { ...focus, cursor: clamp(Math.trunc(focus.cursor), 0, trace.steps.length) };
};

/**
 * The place that the app shows for an address: a focus that the index does not hold is dropped, and a cursor
 * past the last step goes to the last step. The open file stays, so the reader can say that the index does not list it.
 */
export const normalizePlace = (place: Place, graph: Graph): Place => ({
  ...place,
  focus: validFocus(place.focus, graph),
  query: wellFormed(place.query),
});

export const samePlace = (a: Place, b: Place): boolean => encodeHash(a) === encodeHash(b);

const openPath = (reading: Reading): string | null => (reading.kind === "open" ? reading.path : null);

/** A new focus or a new file is a new entry. A step along a route, a query, a lens, a line, and an anchor are not. */
export const opensNewEntry = (from: Place, to: Place): boolean =>
  focusTarget(from.focus) !== focusTarget(to.focus) || openPath(from.reading) !== openPath(to.reading);

export type HistoryAction = "none" | "push" | "replace";

/**
 * What to do with the browser history when the address shows `shown` and the app shows `place`.
 * When the two differ only because the app normalized the address, the entry is replaced. A push there
 * leaves the address that cannot be shown in the history, and the Back button then never gets past it.
 */
export const historyAction = (input: { readonly shown: Place; readonly place: Place; readonly graph: Graph }): HistoryAction => {
  if (samePlace(input.shown, input.place)) return "none";
  const normalized = normalizePlace(input.shown, input.graph);
  if (samePlace(normalized, input.place)) return "replace";
  return opensNewEntry(normalized, input.place) ? "push" : "replace";
};
