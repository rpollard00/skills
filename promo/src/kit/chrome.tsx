import type { FC } from "react";
import { GRID } from "../theme";
import { DitherEdge, EDGE_ROWS } from "./dither";
import { Box, useTheme } from "./grid";
import { Chip, CHIP_ROWS, chipWidth } from "./parts";
import { Wordmark, wordmarkSize } from "./pixel";
import { Label } from "./type";

export const HEADER_ROWS = 11;
export const LABEL_BAR_ROWS = 9;
const PAD = 2;

export interface ChromeHeaderProps {
  /** Text after the wordmark tile. */
  readonly label?: string;
  /** Text at the right end, in the muted color. */
  readonly right?: string;
  /** The 12-row dither edge under the header. Default true. */
  readonly edge?: boolean;
}

/** The chrome field in rows 0 to 10, with the wordmark tile. Put it at the frame root. */
export const ChromeHeader: FC<ChromeHeaderProps> = ({ label, right, edge = true }) => {
  const theme = useTheme();
  const tile = wordmarkSize();
  return (
    <>
      <Box x={0} y={0} w={GRID.cols} h={HEADER_ROWS} fill={theme.chrome}>
        <Wordmark x={PAD * 2} y={0} />
        {label === undefined ? null : <Label x={PAD * 2 + tile.w + PAD * 2} y={0} h={HEADER_ROWS} text={label} color={theme.onChrome} />}
        {right === undefined ? null : (
          <Label x={0} y={0} w={GRID.cols - PAD * 2} h={HEADER_ROWS} align="right" text={right} color={theme.mutedOnChrome} />
        )}
      </Box>
      {edge ? <DitherEdge x={0} y={HEADER_ROWS} w={GRID.cols} color={theme.chrome} toward="down" /> : null}
    </>
  );
};

export interface LabelBarProps {
  readonly x?: number;
  readonly y: number;
  /** Default: the frame width. */
  readonly w?: number;
  /** The accent chip, for example `PL. 07`. */
  readonly chip?: string;
  readonly caption?: string;
  /** Text at the right end, in the muted color. */
  readonly right?: string;
  /** A 12-row dither edge above or below the bar. It draws outside the 9 rows. Default none. */
  readonly edge?: "none" | "above" | "below";
}

/** The plate label bar: a 9-row chrome strip with a chip, a caption, and a note. */
export const LabelBar: FC<LabelBarProps> = ({ x = 0, y, w = GRID.cols, chip, caption, right, edge = "none" }) => {
  const theme = useTheme();
  const captionX = PAD * 2 + (chip === undefined ? 0 : chipWidth(chip) + PAD * 2);
  return (
    <>
      {edge === "above" ? <DitherEdge x={x} y={y - EDGE_ROWS} w={w} color={theme.chrome} toward="up" /> : null}
      <Box x={x} y={y} w={w} h={LABEL_BAR_ROWS} fill={theme.chrome}>
        {chip === undefined ? null : <Chip x={PAD * 2} y={(LABEL_BAR_ROWS - CHIP_ROWS) / 2} text={chip} />}
        {caption === undefined ? null : <Label x={captionX} y={0} h={LABEL_BAR_ROWS} text={caption} color={theme.onChrome} />}
        {right === undefined ? null : (
          <Label x={0} y={0} w={w - PAD * 2} h={LABEL_BAR_ROWS} align="right" text={right} color={theme.mutedOnChrome} />
        )}
      </Box>
      {edge === "below" ? <DitherEdge x={x} y={y + LABEL_BAR_ROWS} w={w} color={theme.chrome} toward="down" /> : null}
    </>
  );
};
