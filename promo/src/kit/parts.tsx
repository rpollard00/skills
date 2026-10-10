import type { FC } from "react";
import { ENERGY, ON_ENERGY, TYPE, type Hex } from "../theme";
import { cellPath, Cells, Checker } from "./dither";
import { Box, useTheme } from "./grid";
import { clamp01 } from "./motion";
import { Label, labelWidth } from "./type";

export const CHIP_ROWS = 7;
const CHIP_PAD = 2;

export type ChipTone = "accent" | "proven" | "chrome" | "quiet";

/** Cells that a chip takes for a text. */
export const chipWidth = (text: string): number => labelWidth(text) + CHIP_PAD * 2;

export interface ChipProps {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  /**
   * `accent`: the one accent fill. `proven`: energy fill, for PROVEN states only.
   * `chrome`: a tag on a chrome fill. `quiet`: muted text and no fill, for a state that is not set.
   */
  readonly tone?: ChipTone;
  readonly keepCase?: boolean;
}

/** A tag: one label, 7 cells high, on a flat fill. */
export const Chip: FC<ChipProps> = ({ x, y, text, tone = "accent", keepCase = false }) => {
  const theme = useTheme();
  const colors: Record<ChipTone, { readonly fill: Hex | null; readonly text: Hex }> = {
    accent: { fill: theme.accent, text: theme.onAccent },
    proven: { fill: ENERGY[2], text: ON_ENERGY },
    chrome: { fill: theme.chrome, text: theme.onChrome },
    quiet: { fill: null, text: theme.muted },
  };
  const color = colors[tone];
  return (
    <Box x={x} y={y} w={chipWidth(text)} h={CHIP_ROWS} {...(color.fill === null ? {} : { fill: color.fill })}>
      <Label x={CHIP_PAD} y={0} h={CHIP_ROWS} text={text} color={color.text} keepCase={keepCase} />
    </Box>
  );
};

export const ROW_ROWS = 8;
const ROW_PAD = 2;
const CURSOR = 4;
/** The cursor square of a selected row, in cells from the top-left corner of the row. */
export const ROW_CURSOR = { x: ROW_PAD, y: (ROW_ROWS - CURSOR) / 2, size: CURSOR } as const;
const TICK = ["....#", "...#.", "#.#..", ".#..."] as const;
const TICK_PATH = cellPath(5, TICK.length, (x, y) => TICK[y]?.[x] === "#");

export interface RowProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly label: string;
  /** The cursor: a full-row accent fill with a square at its left. */
  readonly selected?: boolean;
  /** One ramp step down, for rows that are not in use. */
  readonly dim?: boolean;
  /** A number before the label, for example `07`. */
  readonly index?: string;
  /** Text at the right end. */
  readonly value?: string;
  /** A pixel tick at the right end: the row is finished. */
  readonly done?: boolean;
  readonly keepCase?: boolean;
}

/** One line of a list, 8 cells high. */
export const Row: FC<RowProps> = ({ x, y, w, label, selected = false, dim = false, index, value, done = false, keepCase = false }) => {
  const theme = useTheme();
  const color = selected ? theme.onAccent : dim ? theme.muted : theme.text;
  const indexWidth = index === undefined ? 0 : labelWidth(index) + TYPE.labelPitch;
  const textX = ROW_PAD + CURSOR + ROW_PAD;
  const tickWidth = done ? 5 + ROW_PAD : 0;
  return (
    <Box x={x} y={y} w={w} h={ROW_ROWS} {...(selected ? { fill: theme.accent } : {})}>
      {selected ? <Box x={ROW_CURSOR.x} y={ROW_CURSOR.y} w={ROW_CURSOR.size} h={ROW_CURSOR.size} fill={theme.onAccent} /> : null}
      {index === undefined ? null : <Label x={textX} y={0} h={ROW_ROWS} text={index} color={selected ? color : theme.muted} />}
      <Label x={textX + indexWidth} y={0} h={ROW_ROWS} text={label} color={color} keepCase={keepCase} />
      {value === undefined ? null : (
        <Label x={0} y={0} w={w - ROW_PAD - tickWidth} h={ROW_ROWS} align="right" text={value} color={color} />
      )}
      {done ? <Cells x={w - ROW_PAD - 5} y={2} w={5} h={TICK.length} d={TICK_PATH} color={color} /> : null}
    </Box>
  );
};

export interface GaugeProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  /** 0 to 1. The fill steps by one checker square. */
  readonly value: number;
}

const GAUGE_ROWS = 4;

export const Gauge: FC<GaugeProps> = ({ x, y, w, value }) => {
  const theme = useTheme();
  const filled = Math.round((clamp01(value) * w) / 2) * 2;
  return (
    <Box x={x} y={y} w={w} h={GAUGE_ROWS}>
      {filled > 0 ? <Box x={0} y={0} w={filled} h={GAUGE_ROWS} fill={ENERGY[2]} /> : null}
      {filled < w ? <Checker x={filled} y={0} w={w - filled} h={GAUGE_ROWS} color={theme.muted} /> : null}
    </Box>
  );
};
