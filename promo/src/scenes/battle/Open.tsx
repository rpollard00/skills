import type { FC } from "react";
import { Box, GLYPH_HEIGHT, PixelText, pixelTextWidth, useTheme } from "../../kit";
import { GRID } from "../../theme";
import { PLATE } from "./layout";
import type { EventProps } from "./parts";

const SCALES = [12, 8, 4] as const;
const REST_SCALE = 4;
const CENTER = { x: GRID.cols / 2, y: PLATE.y + 112 } as const;
const PAD = 2;

export const Stamp: FC<EventProps> = ({ clock, state }) => {
  const theme = useTheme();
  const cue = clock.cue("open.stamp");
  if (state.gate.kind !== "open" || cue.since < 0) return null;
  const scale = SCALES[Math.floor(cue.since * clock.framesPerBeat)] ?? REST_SCALE;
  const text = clock.label("open.verified");
  const w = pixelTextWidth(text, scale) + PAD * 2 * scale;
  const h = (GLYPH_HEIGHT + PAD * 2) * scale;
  return (
    <Box x={CENTER.x - w / 2} y={CENTER.y - h / 2} w={w} h={h} fill={theme.chrome}>
      <PixelText x={PAD * scale} y={PAD * scale} text={text} scale={scale} color={theme.onChrome} />
    </Box>
  );
};

export const STAMP_SETTLE = 1;
