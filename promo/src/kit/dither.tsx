import { useMemo, type FC } from "react";
import { COVER_COLORS, GRID, type CoverColor, type Hex } from "../theme";
import { Box, cells, useOrigin } from "./grid";
import { bayer8, coverLevel, mod, type CoverFrom } from "./motion";

/** SVG path data, in cell units, for the cells of a `w` x `h` block where `on` is true. */
export const cellPath = (w: number, h: number, on: (x: number, y: number) => boolean): string => {
  const runs: string[] = [];
  for (let y = 0; y < h; y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const filled = x < w && on(x, y);
      if (filled && start === -1) start = x;
      if (!filled && start !== -1) {
        runs.push(`M${start} ${y}h${x - start}v1h${start - x}z`);
        start = -1;
      }
    }
  }
  return runs.join("");
};

export interface CellsProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Path data in cell units, for example from `cellPath`. */
  readonly d: string;
  readonly color: Hex;
  /** Screen cells for each path unit. Default 1. */
  readonly scale?: number;
  readonly evenOdd?: boolean;
}

export const Cells: FC<CellsProps> = ({ x, y, w, h, d, color, scale = 1, evenOdd = false }) => (
  <svg
    width={cells(w * scale)}
    height={cells(h * scale)}
    viewBox={`0 0 ${w} ${h}`}
    shapeRendering="crispEdges"
    style={{ position: "absolute", left: cells(x), top: cells(y), display: "block" }}
  >
    <path d={d} fill={color} fillRule={evenOdd ? "evenodd" : "nonzero"} />
  </svg>
);

export interface DitherFieldProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: Hex;
  /**
   * 0 paints no cell, 1 paints every cell. A function gets the cell inside the
   * field and gives its level. The Bayer phase follows the frame, so fields
   * that touch stay regular.
   */
  readonly level: number | ((x: number, y: number) => number);
}

export const DitherField: FC<DitherFieldProps> = ({ x, y, w, h, color, level }) => {
  const origin = useOrigin();
  const phaseX = origin.x + Math.round(x);
  const phaseY = origin.y + Math.round(y);
  const flat = typeof level === "number" ? level : null;
  const flatPath = useMemo(
    () => (flat === null ? null : cellPath(w, h, (cx, cy) => flat > bayer8(phaseX + cx, phaseY + cy))),
    [flat, w, h, phaseX & 7, phaseY & 7],
  );
  const d = typeof level === "number" ? flatPath : cellPath(w, h, (cx, cy) => level(cx, cy) > bayer8(phaseX + cx, phaseY + cy));
  return d === null || d === "" ? null : <Cells x={x} y={y} w={w} h={h} d={d} color={color} />;
};

export const EDGE_ROWS = 12;

export interface DitherEdgeProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly color: Hex;
  /** `down`: solid at the top row, fading down. `up`: solid at the bottom row, fading up. */
  readonly toward: "down" | "up";
  /** Default 12. */
  readonly rows?: number;
}

export const DitherEdge: FC<DitherEdgeProps> = ({ x, y, w, color, toward, rows = EDGE_ROWS }) => (
  <DitherField
    x={x}
    y={y}
    w={w}
    h={rows}
    color={color}
    level={(_, cy) => 1 - ((toward === "down" ? cy : rows - 1 - cy) + 0.5) / rows}
  />
);

export interface CheckerProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: Hex;
}

const SQUARE = 2;

const stripes = (length: number, offset: number, parity: number): readonly (readonly [number, number])[] => {
  const runs: [number, number][] = [];
  let start = -1;
  for (let position = 0; position <= length; position++) {
    const on = position < length && mod(Math.floor((offset + position) / SQUARE), 2) === parity;
    if (on && start === -1) start = position;
    if (!on && start !== -1) {
      runs.push([start, position - start]);
      start = -1;
    }
  }
  return runs;
};

/** A checkerboard of flat 2-cell squares. It means "not proven". Its phase follows the frame. */
export const Checker: FC<CheckerProps> = ({ x, y, w, h, color }) => {
  const origin = useOrigin();
  const phaseX = mod(origin.x + Math.round(x), SQUARE * 2);
  const phaseY = mod(origin.y + Math.round(y), SQUARE * 2);
  const d = useMemo(
    () =>
      [
        ...stripes(w, phaseX, 0).map(([start, length]) => `M${start} 0h${length}v${h}h${-length}z`),
        ...stripes(h, phaseY, 1).map(([start, length]) => `M0 ${start}h${w}v${length}h${-w}z`),
      ].join(""),
    [w, h, phaseX, phaseY],
  );
  return <Cells x={x} y={y} w={w} h={h} d={d} color={color} evenOdd />;
};

export interface CoverProps {
  readonly color: CoverColor;
  readonly from: CoverFrom;
  /** 0 paints nothing. 1 paints the full frame flat. */
  readonly progress: number;
}

/** Put it at the frame root. */
export const Cover: FC<CoverProps> = ({ color, from, progress }) => {
  if (progress <= 0) return null;
  if (progress >= 1) return <Box x={0} y={0} w={GRID.cols} h={GRID.rows} fill={COVER_COLORS[color]} />;
  return (
    <DitherField
      x={0}
      y={0}
      w={GRID.cols}
      h={GRID.rows}
      color={COVER_COLORS[color]}
      level={(cx, cy) => coverLevel(from, progress, cx, cy)}
    />
  );
};
