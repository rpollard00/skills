import { rowExtent, type Rect } from "../layout";
import { arrangementOf, stageBoundsOf, standOnStage, type Stand } from "./arranged";
import { stageTargetOf, type Reading, type Stage, type Transform, type ViewState, type Viewport } from "./state";
import { focusedNode } from "./trace";

export const ZOOM = { min: 0.35, max: 4, fitMin: 0.8, focusFitMin: 0.6, fitMax: 1.5, margin: 20, ignoredShiftPx: 0.5 } as const;

export const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

interface Area {
  readonly width: number;
  readonly height: number;
}

const clearArea = (reading: Reading, viewport: Viewport): Area => ({
  width: Math.max(1, viewport.width - (reading.kind === "open" ? viewport.reader : 0)),
  height: Math.max(1, viewport.height),
});

const shiftToShow = (start: number, end: number, extent: number): number => {
  const low = ZOOM.margin;
  const high = extent - ZOOM.margin;
  const isTooLongToFit = end - start > high - low;
  const startsBeforeTheArea = start < low;
  const endsAfterTheArea = end > high;

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

const rowRect = (placed: Stand, hostOf: (pip: Extract<Stand, { kind: "pip" }>) => Stand | undefined): Rect => {
  const host = placed.kind === "pip" ? hostOf(placed) : placed;
  if (host === undefined || host.kind === "pip") return { x: placed.centre.x - 8, y: placed.centre.y - 12, width: 16, height: 24 };
  const { from, to } = rowExtent(host);
  return { x: from, y: host.centre.y - 12, width: to - from, height: 24 };
};

type Framed = Pick<ViewState, "reading" | "focus" | "pin">;

const keepFocusClear = (base: Transform, state: Framed, stage: Stage): Transform => {
  const id = focusedNode(state.focus, stage.graph);
  const arrangement = arrangementOf(stage.graph, stageTargetOf(state));
  const placed = id === null ? undefined : standOnStage(id, arrangement, stage.placement);
  if (placed === undefined) return base;
  const row = rowRect(placed, (pip) => standOnStage(pip.host, arrangement, stage.placement));
  return keepClear(base, row, clearArea(state.reading, stage.viewport));
};

const startIn = (extent: number, length: number): number => (length <= extent ? (extent - length) / 2 : 0);

const fitTransform = (state: Framed, stage: Stage): Transform => {
  const area = clearArea(state.reading, stage.viewport);
  const arrangement = arrangementOf(stage.graph, stageTargetOf(state));
  const frame = stageBoundsOf(arrangement, stage.placement);
  const scale = clamp(Math.min(area.width / frame.width, area.height / frame.height), arrangement === null ? ZOOM.fitMin : ZOOM.focusFitMin, ZOOM.fitMax);
  return {
    scale,
    tx: startIn(area.width, frame.width * scale) - frame.x * scale,
    ty: startIn(area.height, frame.height * scale) - frame.y * scale,
  };
};

export const resolveCamera = (state: Framed & Pick<ViewState, "camera">, stage: Stage): Transform =>
  state.camera.kind === "free"
    ? { scale: state.camera.scale, tx: state.camera.tx, ty: state.camera.ty }
    : keepFocusClear(fitTransform(state, stage), state, stage);

/** After a change of focus or of the reader: a free camera makes the least move that keeps the focused node in view. */
export const followFocus = (state: ViewState, stage: Stage): ViewState =>
  state.camera.kind === "fit" ? state : { ...state, camera: { kind: "free", ...keepFocusClear(state.camera, state, stage) } };

export const zoomedAbout = (from: Transform, factor: number, at: { readonly x: number; readonly y: number }): Transform => {
  const scale = clamp(from.scale * factor, ZOOM.min, ZOOM.max);
  const ratio = scale / from.scale;
  return { scale, tx: at.x - (at.x - from.tx) * ratio, ty: at.y - (at.y - from.ty) * ratio };
};
