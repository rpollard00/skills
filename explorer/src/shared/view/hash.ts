import { Schema } from "effect";
import { NodeId, RouteId } from "../model";
import { CABLE_CLASSES, type CableClass } from "./cable-class";
import { LENSES, type Focus, type Lens, type Place } from "./state";

const isNodeId = Schema.is(NodeId);
const isRouteId = Schema.is(RouteId);
const isLens = (value: string | null): value is Lens => LENSES.some((lens) => lens === value);
const isCableClass = (value: string): value is CableClass => CABLE_CLASSES.some((cls) => cls === value);

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Text that `encodeURIComponent` accepts: a lone surrogate, which a paste can hold, becomes U+FFFD. */
export const wellFormed = (text: string): string => text.replace(LONE_SURROGATE, "�");

const segment = (value: string): string => encodeURIComponent(wellFormed(value)).replace(/%2F/gi, "/").replace(/%3A/gi, ":");

/** `#/skill/architect?doc=skills/architect/SKILL.md&q=root&lens=tools`. Hover, reader history, and the camera are not in the hash. */
export const encodeHash = (place: Place): string => {
  const path =
    place.focus.kind === "node"
      ? `/${place.focus.id.replace(":", "/").split("/").map(segment).join("/")}`
      : place.focus.kind === "route"
        ? `/route/${encodeURIComponent(wellFormed(place.focus.route))}/${place.focus.cursor}`
        : "/";
  const params: string[] = [];
  if (place.reading.kind === "open") {
    params.push(`doc=${segment(place.reading.path)}`);
    if (place.reading.anchor !== null) params.push(`anchor=${segment(place.reading.anchor)}`);
    if (place.reading.line !== null) params.push(`line=${place.reading.line}`);
  }
  if (place.query !== "") params.push(`q=${segment(place.query)}`);
  if (place.lens !== "relations") params.push(`lens=${place.lens}`);
  if (place.muted.size > 0) params.push(`mute=${CABLE_CLASSES.filter((cls) => place.muted.has(cls)).join(",")}`);
  return `#${path}${params.length === 0 ? "" : `?${params.join("&")}`}`;
};

const decodePart = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const focusOf = (path: string): Focus => {
  const [head, ...rest] = path.split("/").filter((part) => part !== "").map(decodePart);
  if (head === undefined) return { kind: "none" };
  if (head === "route") {
    const [route, cursor] = rest;
    const at = Number(cursor ?? "0");
    return route !== undefined && isRouteId(route) ? { kind: "route", route, cursor: Number.isInteger(at) && at >= 0 ? at : 0 } : { kind: "none" };
  }
  const id = `${head}:${rest.join("/")}`;
  return isNodeId(id) ? { kind: "node", id } : { kind: "none" };
};

/** Total: text that is not a place gives the empty place. `normalizePlace` checks the ids against the index. */
export const decodeHash = (hash: string): Place => {
  const text = hash.startsWith("#") ? hash.slice(1) : hash;
  const mark = text.indexOf("?");
  const params = new URLSearchParams(mark === -1 ? "" : text.slice(mark + 1));
  const doc = params.get("doc");
  const line = Number(params.get("line") ?? "");
  const lens = params.get("lens");
  return {
    focus: focusOf(mark === -1 ? text : text.slice(0, mark)),
    reading:
      doc === null || doc === ""
        ? { kind: "closed" }
        : { kind: "open", path: doc, anchor: params.get("anchor"), line: params.has("line") && Number.isInteger(line) && line > 0 ? line : null, back: [] },
    query: wellFormed(params.get("q") ?? ""),
    lens: isLens(lens) ? lens : "relations",
    muted: new Set((params.get("mute") ?? "").split(",").filter(isCableClass)),
  };
};
