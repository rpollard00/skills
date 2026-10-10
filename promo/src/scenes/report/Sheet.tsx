import type { FC, ReactNode } from "react";
import { Box, Chip, chipWidth, CHIP_ROWS, easeOutCubic, Label, PixelText, useTheme } from "../../kit";
import { COLUMN, HEADING, HEADING_RULE, KICKER_Y, LABEL_ROWS, ROW } from "./layout";

const PRINT_RATE = 4;
const DETAIL_GAP = "   ";

export interface SheetRow {
  readonly label: string;
  readonly value: string;
  readonly detail?: readonly string[];
  readonly age: number;
  readonly aside?: ReactNode;
}

const detailLine = (row: SheetRow): string => (row.detail ?? []).join(DETAIL_GAP);

export const sheetRowHeight = (row: SheetRow): number => ROW.h + (detailLine(row) === "" ? 0 : ROW.detailRows);

const SheetLine: FC<{ readonly index: number; readonly y: number; readonly row: SheetRow }> = ({ index, y, row }) => {
  const theme = useTheme();
  if (row.age < 0) return null;
  const detail = detailLine(row);
  const h = sheetRowHeight(row);
  const budget = (Math.floor(row.age) + 1) * PRINT_RATE;
  const printed = Math.min(row.value.length, budget);
  const detailPrinted = Math.min(detail.length, Math.max(0, budget - row.value.length));
  const caret =
    printed < row.value.length
      ? { x: printed * ROW.valuePitch, y: ROW.valueY + 1, w: ROW.valuePitch, h: ROW.valueRows - 2 }
      : detailPrinted < detail.length
        ? { x: detailPrinted * ROW.detailPitch, y: ROW.detailY + 1, w: ROW.detailPitch, h: LABEL_ROWS - 2 }
        : null;
  return (
    <Box x={COLUMN.x} y={y} w={COLUMN.w} h={h}>
      <Label x={0} y={ROW.labelY} h={ROW.labelRows} text={String(index + 1).padStart(2, "0")} />
      <Label x={ROW.textX} y={ROW.labelY} h={ROW.labelRows} text={row.label} color={theme.muted} />
      <Label
        x={ROW.textX}
        y={ROW.valueY}
        h={ROW.valueRows}
        pitch={ROW.valuePitch}
        text={row.value.slice(0, printed)}
        bold
      />
      {detailPrinted > 0 ? (
        <Label
          x={ROW.textX}
          y={ROW.detailY}
          h={LABEL_ROWS}
          pitch={ROW.detailPitch}
          text={detail.slice(0, detailPrinted)}
          keepCase
        />
      ) : null}
      {caret === null ? null : <Box x={ROW.textX + caret.x} y={caret.y} w={caret.w} h={caret.h} fill={theme.accent} />}
      {row.aside}
      <Box x={0} y={h - 1} w={COLUMN.w} h={1} fill={theme.text} />
    </Box>
  );
};

export interface StateChip {
  readonly text: string;
  readonly set: boolean;
  readonly shown: boolean;
}

const CHIP_GAP = 3;

export const StateChips: FC<{ readonly chips: readonly StateChip[] }> = ({ chips }) => {
  const widths = chips.map((chip) => chipWidth(chip.text));
  const total = widths.reduce((sum, width) => sum + width, 0) + CHIP_GAP * Math.max(0, chips.length - 1);
  const y = ROW.valueY + Math.ceil((ROW.valueRows - CHIP_ROWS) / 2);
  return (
    <>
      {chips.map((chip, index) => {
        const before = widths.slice(0, index).reduce((sum, width) => sum + width + CHIP_GAP, 0);
        return chip.shown ? (
          <Chip key={chip.text} x={COLUMN.w - total + before} y={y} text={chip.text} tone={chip.set ? "accent" : "quiet"} />
        ) : null;
      })}
    </>
  );
};

export interface SheetProps {
  readonly kicker: string;
  readonly heading: string;
  readonly rule: number;
  readonly rows: readonly SheetRow[];
}

export const Sheet: FC<SheetProps> = ({ kicker, heading, rule, rows }) => {
  const theme = useTheme();
  const tops = rows.map((_, index) => rows.slice(0, index).reduce((y, above) => y + sheetRowHeight(above), ROW.y));
  return (
    <>
      <Label x={COLUMN.x} y={KICKER_Y} h={LABEL_ROWS} text={kicker} color={theme.accentText} keepCase />
      <PixelText x={COLUMN.x} y={HEADING.y} text={heading} scale={HEADING.scale} />
      <Box x={COLUMN.x} y={HEADING_RULE.y} w={COLUMN.w * easeOutCubic(rule)} h={HEADING_RULE.h} fill={theme.text} />
      {rows.map((row, index) => (
        <SheetLine key={row.label} index={index} y={tops[index] ?? ROW.y} row={row} />
      ))}
    </>
  );
};
