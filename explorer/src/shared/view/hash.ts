import { Schema } from "effect";
import { NodeId, RouteId } from "../model";
import { CABLE_CLASSES, type CableClass } from "./cable-class";
import { LENSES, type Focus, type Lens, type Pin, type Place, type StageTarget } from "./state";

const isNodeId = Schema.is(NodeId);
const isRouteId = Schema.is(RouteId);
const isLens = (value: string | null): value is Lens => LENSES.some((lens) => lens === value);
const isCableClass = (value: string): value is CableClass => CABLE_CLASSES.some((cls) => cls === value);

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Text that `encodeURIComponent` accepts: a lone surrogate, which a paste can hold, becomes U+FFFD. */
export const wellFormed = (text: string): string => text.replace(LONE_SURROGATE, "�");

const segment = (value: string): string => encodeURIComponent(wellFormed(value)).replace(/%2F/gi, "/").replace(/%3A/gi, ":");

const nodePath = (id: string): string => id.replace(":", "/").split("/").map(segment).join("/");

const REST_STAGE = "rest";

const stagePath = (stage: StageTarget): string =>
  stage.kind === "rest" ? REST_STAGE : stage.kind === "node" ? nodePath(stage.id) : `route/${encodeURIComponent(wellFormed(stage.route))}`;

/**
 * `#/skill/how?lock=skill/architect&doc=skills/how/SKILL.md&q=root&lens=tools`.
 * The path is what is selected. `lock` is the stage that a lock holds, and it is absent when the stage follows the selection.
 * Hover, reader history, and the camera are not in the hash.
 */
export const encodeHash = (place: Place): string => {
  const path =
    place.focus.kind === "node"
      ? `/${nodePath(place.focus.id)}`
      : place.focus.kind === "route"
        ? `/route/${encodeURIComponent(wellFormed(place.focus.route))}/${place.focus.cursor}`
        : "/";
  const params: string[] = [];
  if (place.pin.kind === "locked") params.push(`lock=${stagePath(place.pin.stage)}`);
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

/** The first value of a parameter as the address has it. `URLSearchParams` gives a value with its escapes already read. */
const writtenValue = (query: string, name: string): string | null => {
  const part = query.split("&").find((item) => item.startsWith(`${name}=`));
  return part === undefined ? null : part.slice(name.length + 1);
};

/** `written` has the form of a path, so it is split first and each part is read one time, as the path of the selection is. */
const pinOf = (written: string | null): Pin => {
  if (written === null) return { kind: "unlocked" };
  if (written === REST_STAGE) return { kind: "locked", stage: { kind: "rest" } };
  const focus = focusOf(written);
  if (focus.kind === "node") return { kind: "locked", stage: { kind: "node", id: focus.id } };
  if (focus.kind === "route") return { kind: "locked", stage: { kind: "route", route: focus.route } };
  return { kind: "unlocked" };
};

/** Total: text that is not a place gives the empty place. `normalizePlace` checks the ids against the index. */
export const decodeHash = (hash: string): Place => {
  const text = hash.startsWith("#") ? hash.slice(1) : hash;
  const mark = text.indexOf("?");
  const query = mark === -1 ? "" : text.slice(mark + 1);
  const params = new URLSearchParams(query);
  const doc = params.get("doc");
  const line = Number(params.get("line") ?? "");
  const lens = params.get("lens");
  return {
    focus: focusOf(mark === -1 ? text : text.slice(0, mark)),
    pin: pinOf(writtenValue(query, "lock")),
    reading:
      doc === null || doc === ""
        ? { kind: "closed" }
        : { kind: "open", path: doc, anchor: params.get("anchor"), line: params.has("line") && Number.isInteger(line) && line > 0 ? line : null, back: [] },
    query: wellFormed(params.get("q") ?? ""),
    lens: isLens(lens) ? lens : "relations",
    muted: new Set((params.get("mute") ?? "").split(",").filter(isCableClass)),
  };
};
