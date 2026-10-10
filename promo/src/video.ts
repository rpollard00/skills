import { GRID } from "./theme";

export const VIDEO = {
  width: GRID.cols * GRID.cell,
  height: GRID.rows * GRID.cell,
  fps: 30,
} as const;
