import { HEADER_ROWS, LABEL_BAR_ROWS, MESSAGE_COLS, MESSAGE_ROWS } from "../../kit";
import { GRID } from "../../theme";

export const PLATE = { x: 0, y: HEADER_ROWS, w: GRID.cols, h: 180 } as const;
export const BAR = { y: PLATE.y + PLATE.h, h: LABEL_BAR_ROWS } as const;

const WINDOW_Y = BAR.y + BAR.h;
const MARGIN = 4;
const WINDOW_H = GRID.rows - WINDOW_Y - MARGIN;
const COMMANDS_W = 148;

export const COMMANDS = { x: MARGIN, y: WINDOW_Y, w: COMMANDS_W, h: WINDOW_H } as const;
export const PARTY = {
  x: MARGIN * 2 + COMMANDS_W,
  y: WINDOW_Y,
  w: GRID.cols - MARGIN * 3 - COMMANDS_W,
  h: WINDOW_H,
} as const;

export const CARD = { x: (GRID.cols - MESSAGE_COLS) / 2, y: PLATE.y + 2, w: MESSAGE_COLS, h: MESSAGE_ROWS } as const;
