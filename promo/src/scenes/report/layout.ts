import { GLYPH_HEIGHT, MESSAGE_COLS } from "../../kit";
import { GRID } from "../../theme";

export const COLUMN = { x: (GRID.cols - MESSAGE_COLS) / 2, w: MESSAGE_COLS } as const;

export const LABEL_ROWS = 8;
export const KICKER_Y = 27;
export const HEADING = { y: 38, scale: 4 } as const;
export const HEADING_RULE = { y: HEADING.y + GLYPH_HEIGHT * HEADING.scale + 4, h: 2 } as const;

export const ROW = {
  y: HEADING_RULE.y + HEADING_RULE.h,
  h: 28,
  textX: 18,
  labelY: 3,
  labelRows: LABEL_ROWS,
  valueY: 12,
  valueRows: 12,
  valuePitch: 8,
  detailY: 24,
  detailRows: 9,
  detailPitch: 5,
} as const;

const ROW_COUNT = 4;
const ROWS_WITH_DETAIL = 1;
const BAND_GAP = 16;

const BAND_Y = ROW.y + ROW.h * ROW_COUNT + ROW.detailRows * ROWS_WITH_DETAIL + BAND_GAP;

export const CARD = { x: COLUMN.x, y: BAND_Y } as const;

export const LOADED = {
  labelY: BAND_Y + 4,
  ruleY: BAND_Y + 14,
  ruleH: 2,
  orbDrop: 8,
  orbSize: 13,
  orbPitch: 17,
  countScale: 3,
} as const;
