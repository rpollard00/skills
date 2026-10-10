import type { FC } from "react";
import { Box, GLYPH_HEIGHT, PixelText, pixelTextWidth, useTheme } from "../../kit";

const SCALES = [6, 4, 3] as const;
const REST = SCALES[2];

const PAD = 3;
const LINE_INSET = 1;

export const stampSize = (text: string): { readonly w: number; readonly h: number } => ({
  w: (pixelTextWidth(text) + PAD * 2) * REST,
  h: (GLYPH_HEIGHT + PAD * 2) * REST,
});

export interface StampProps {
  readonly centerX: number;
  readonly centerY: number;
  readonly text: string;
  readonly age: number;
}

export const Stamp: FC<StampProps> = ({ centerX, centerY, text, age }) => {
  const theme = useTheme();
  if (age < 0) return null;
  const scale = SCALES[Math.min(Math.floor(age), SCALES.length - 1)] ?? REST;
  const w = (pixelTextWidth(text) + PAD * 2) * scale;
  const h = (GLYPH_HEIGHT + PAD * 2) * scale;
  const inset = LINE_INSET * scale;
  return (
    <Box x={Math.floor(centerX - w / 2)} y={Math.floor(centerY - h / 2)} w={w} h={h} fill={theme.accent}>
      <Box x={inset} y={inset} w={w - inset * 2} h={h - inset * 2} fill={theme.onAccent}>
        <Box x={scale} y={scale} w={w - (inset + scale) * 2} h={h - (inset + scale) * 2} fill={theme.accent} />
      </Box>
      <PixelText x={PAD * scale} y={PAD * scale} text={text} scale={scale} color={theme.onAccent} />
    </Box>
  );
};
