import type { FC } from "react";
import type { SkillKind } from "../../catalog";
import { Box, Chip, chipWidth, GLYPH_HEIGHT, Label, Orb, PixelText, pixelTextWidth, useTheme } from "../../kit";
import { COLUMN, LABEL_ROWS, LOADED } from "./layout";

const FALL = [17, 10] as const;

const COUNT_GAP = 3;

export interface LoadedOrb {
  readonly kind: SkillKind;
  readonly age: number;
}

export interface LoadedProps {
  readonly label: string;
  readonly tag: string;
  readonly orbs: readonly LoadedOrb[];
  readonly total: number;
}

export const Loaded: FC<LoadedProps> = ({ label, tag, orbs, total }) => {
  const theme = useTheme();
  const landed = orbs.filter((orb) => orb.age >= 0).length;
  const parts = [String(landed), "/", String(total)];
  const gap = COUNT_GAP * LOADED.countScale;
  const partX = (index: number): number =>
    parts.slice(0, index).reduce((sum, part) => sum + pixelTextWidth(part, LOADED.countScale) + gap, 0);
  const countW = partX(parts.length) - gap;
  const top = LOADED.ruleY + LOADED.ruleH;
  const countH = GLYPH_HEIGHT * LOADED.countScale;
  const rest = LOADED.orbDrop;
  return (
    <>
      <Label x={COLUMN.x} y={LOADED.labelY} h={LABEL_ROWS} text={label} />
      <Chip x={COLUMN.x + COLUMN.w - chipWidth(tag)} y={LOADED.labelY} text={tag} />
      <Box x={COLUMN.x} y={LOADED.ruleY} w={COLUMN.w} h={LOADED.ruleH} fill={theme.text} />
      <Box x={COLUMN.x} y={top} w={COLUMN.w} h={rest + LOADED.orbSize} clip>
        {orbs.map((orb, index) => {
          const above = orb.age >= 0 ? 0 : FALL[FALL.length + Math.ceil(orb.age)];
          return above === undefined ? null : (
            <Orb key={index} x={index * LOADED.orbPitch} y={rest - above} kind={orb.kind} size={LOADED.orbSize} />
          );
        })}
      </Box>
      <Box x={COLUMN.x + COLUMN.w - countW} y={top + rest + Math.floor((LOADED.orbSize - countH) / 2)} w={countW} h={countH}>
        {parts.map((part, index) => (
          <PixelText key={index} x={partX(index)} y={0} text={part} scale={LOADED.countScale} />
        ))}
      </Box>
    </>
  );
};
