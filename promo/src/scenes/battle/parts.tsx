import type { FC } from "react";
import type { BattleState } from "../../battle";
import type { Cell } from "./world";
import { Box, Label, labelWidth, useTheme } from "../../kit";
import { TYPE } from "../../theme";
import type { SceneClock, SceneOf } from "../../useSceneClock";
import type { StageView } from "./stage/view";

export interface EventProps {
  readonly scene: SceneOf<"battle">;
  readonly clock: SceneClock<"battle">;
  readonly state: BattleState;
  readonly view: StageView;
}

const PAD = 2;

export const paperChipRows = (pitch: number = TYPE.labelPitch): number => (pitch <= TYPE.labelPitch ? 7 : 10);
export const paperChipWidth = (text: string, pitch: number = TYPE.labelPitch): number => labelWidth(text, pitch) + PAD * 2;

export interface PaperChipProps {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly pitch?: number;
  readonly keepCase?: boolean;
}

export const PaperChip: FC<PaperChipProps> = ({ x, y, text, pitch = TYPE.labelPitch, keepCase = false }) => {
  const theme = useTheme();
  const h = paperChipRows(pitch);
  return (
    <Box x={x} y={y} w={paperChipWidth(text, pitch)} h={h} fill={theme.onChrome}>
      <Label x={PAD} y={0} h={h} text={text} color={theme.chrome} pitch={pitch} keepCase={keepCase} bold />
    </Box>
  );
};

export const over = (cell: Cell, width: number, above: number): Cell => ({ x: Math.round(cell.x - width / 2), y: cell.y - above });

export const lerpCell = (from: Cell, to: Cell, t: number): Cell => ({
  x: Math.round(from.x + (to.x - from.x) * t),
  y: Math.round(from.y + (to.y - from.y) * t),
});
