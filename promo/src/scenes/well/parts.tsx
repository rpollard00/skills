import type { FC } from "react";
import { Box, clamp, Label, labelWidth, useTheme, Wordmark, wordmarkSize } from "../../kit";
import type { Hex } from "../../theme";

export const POSTER_SCALE = 9;

const FLASH_FRAMES = 3;

export const flashing = (age: number, count: number): boolean =>
  age >= 0 && age < count * FLASH_FRAMES * 2 && Math.floor(age / FLASH_FRAMES) % 2 === 0;

export interface TypedLineProps {
  readonly x: number;
  readonly y: number;
  readonly h: number;
  readonly text: string;
  readonly shown: number;
  readonly pitch: number;
  readonly caret: boolean;
  readonly color?: Hex;
  readonly bold?: boolean;
}

export const TypedLine: FC<TypedLineProps> = ({ x, y, h, text, shown, pitch, caret, color, bold = false }) => {
  const theme = useTheme();
  const count = clamp(Math.floor(shown), 0, text.length);
  const caretRows = Math.round(pitch * 1.5);
  return (
    <>
      <Label x={x} y={y} h={h} text={text.slice(0, count)} pitch={pitch} color={color ?? theme.text} bold={bold} keepCase />
      {caret ? <Box x={x + count * pitch + 1} y={y + (h - caretRows) / 2} w={pitch - 2} h={caretRows} fill={color ?? theme.text} /> : null}
    </>
  );
};

export interface StampProps {
  readonly x: number;
  readonly anchor: "left" | "right";
  readonly middle: number;
  readonly scale: number;
  readonly age: number;
}

export const Stamp: FC<StampProps> = ({ x, anchor, middle, scale, age }) => {
  if (age < 0) return null;
  const size = scale + Math.max(0, 2 - age);
  const tile = wordmarkSize(size);
  return <Wordmark x={anchor === "left" ? x : x - tile.w} y={middle - tile.h / 2} scale={size} />;
};

export const CHOICE = { rows: 12, pitch: 7, pad: 2, cursor: 4 } as const;

export const choiceWidth = (labels: readonly string[]): number =>
  CHOICE.pad * 4 + CHOICE.cursor + 1 + Math.max(...labels.map((label) => labelWidth(label, CHOICE.pitch)));

export type ChoiceState = "idle" | "selected" | "flash";

export interface ChoiceRowProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly text: string;
  readonly state: ChoiceState;
}

export const ChoiceRow: FC<ChoiceRowProps> = ({ x, y, w, text, state }) => {
  const theme = useTheme();
  const fill = state === "selected" ? theme.accent : state === "flash" ? theme.onAccent : null;
  const ink = state === "selected" ? theme.onAccent : state === "flash" ? theme.chrome : theme.text;
  return (
    <Box x={x} y={y} w={w} h={CHOICE.rows} {...(fill === null ? {} : { fill })}>
      {state === "idle" ? null : <Box x={CHOICE.pad + 1} y={(CHOICE.rows - CHOICE.cursor) / 2} w={CHOICE.cursor} h={CHOICE.cursor} fill={ink} />}
      <Label x={CHOICE.pad * 2 + CHOICE.cursor + 1} y={0} h={CHOICE.rows} text={text} pitch={CHOICE.pitch} color={ink} bold />
    </Box>
  );
};
