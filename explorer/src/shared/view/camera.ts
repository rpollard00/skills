import type { Placed, Placement, Rect } from "../layout";
import type { Reading, Stage, Transform, ViewState, Viewport } from "./state";
import { focusedNode } from "./trace";

export const ZOOM = { min: 0.35, max: 4, fitMin: 0.8, fitMax: 1.5, margin: 20, ignoredShiftPx: 0.5 } as const;

export const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

interface Area {
  readonly width: number;
  readonly height: number;
}

/** The part of the map area that the reader does not cover. */
const clearArea = (reading: Reading, viewport: Viewport): Area => ({
  width: Math.max(1, viewport.width - (reading.kind === "open" ? viewport.reader : 0)),
  height: Math.max(1, viewport.height),
});

/** One axis of the least move that puts a span inside the area. */
const shiftToShow = (start: number, end: number, extent: number): number => {
  const low = ZOOM.margin;
  const high = extent - ZOOM.margin;
  const isTooLongToFit = end - start > high - low;
  const startsBeforeTheArea = start < low;
  const endsAfterTheArea = end > high;

  // A span that is too long keeps its start in view: the glyph and the first letters of a name say more than its end.
  if (isTooLongToFit || startsBeforeTheArea) return unlessTiny(low - start);
  if (endsAfterTheArea) return unlessTiny(high - end);
  return 0;
};

/** A move of less than half a pixel is rounding, and a camera that answers to it never comes to rest. */
const unlessTiny = (shift: number): number => (Math.abs(shift) < ZOOM.ignoredShiftPx ? 0 : shift);

const keepClear = (transform: Transform, rect: Rect, area: Area): Transform => ({
  scale: transform.scale,
  tx: transform.tx + shiftToShow(transform.tx + rect.x * transform.scale, transform.tx + (rect.x + rect.width) * transform.scale, area.width),
  ty: transform.ty + shiftToShow(transform.ty + rect.y * transform.scale, transform.ty + (rect.y + rect.height) * transform.scale, area.height),
});

/** The row of a node: its glyph and its label. A hosted file uses the row of its host. */
const rowRect = (placed: Placed, placement: Placement): Rect => {
  const host = placed.kind === "pip" ? placement.nodes.get(placed.host) : placed;
  if (host === undefined || host.kind === "pip") return { x: placed.centre.x - 8, y: placed.centre.y - 12, width: 16, height: 24 };
  const start = host.centre.x - 12;
  return { x: start, y: host.centre.y - 12, width: host.label.x + host.label.width - start, height: 24 };
};

/**
 * The one rule that keeps the focused node clear of the reader. A fitted camera gets it each time it is resolved,
 * because it follows the window. A free camera gets it one time, when the focus or the reader changes, so a later
 * drag can leave the focus.
 */
const keepFocusClear = (base: Transform, state: Pick<ViewState, "reading" | "focus">, stage: Stage): Transform => {
  const id = focusedNode(state.focus, stage.graph);
  const placed = id === null ? undefined : stage.placement.nodes.get(id);
  return placed === undefined ? base : keepClear(base, rowRect(placed, stage.placement), clearArea(state.reading, stage.viewport));
};

/** Centres a length in an extent. A length that is too long starts at the start, so the top-left of the world stays in view. */
const startIn = (extent: number, length: number): number => (length <= extent ? (extent - length) / 2 : 0);

/** The whole world beside the reader. Below the smallest fit scale the world does not fit, and the fit shows its top-left. */
const fitTransform = (reading: Reading, stage: Stage): Transform => {
  const area = clearArea(reading, stage.viewport);
  const world = stage.placement.world;
  const scale = clamp(Math.min(area.width / world.width, area.height / world.height), ZOOM.fitMin, ZOOM.fitMax);
  return { scale, tx: startIn(area.width, world.width * scale), ty: startIn(area.height, world.height * scale) };
};

/** The camera on screen. */
export const resolveCamera = (state: Pick<ViewState, "camera" | "reading" | "focus">, stage: Stage): Transform =>
  state.camera.kind === "free"
    ? { scale: state.camera.scale, tx: state.camera.tx, ty: state.camera.ty }
    : keepFocusClear(fitTransform(state.reading, stage), state, stage);

/** After a change of focus or of the reader: a free camera makes the least move that keeps the focused node in view. */
export const followFocus = (state: ViewState, stage: Stage): ViewState =>
  state.camera.kind === "fit" ? state : { ...state, camera: { kind: "free", ...keepFocusClear(state.camera, state, stage) } };

export const zoomedAbout = (from: Transform, factor: number, at: { readonly x: number; readonly y: number }): Transform => {
  const scale = clamp(from.scale * factor, ZOOM.min, ZOOM.max);
  const ratio = scale / from.scale;
  return { scale, tx: at.x - (at.x - from.tx) * ratio, ty: at.y - (at.y - from.ty) * ratio };
};
