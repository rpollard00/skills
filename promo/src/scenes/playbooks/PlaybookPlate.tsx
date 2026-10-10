import type { FC } from "react";
import { Box, cellPath, Cells } from "../../kit";
import { GRID, PLATE_SKIES, type Hex } from "../../theme";
import { PLATE, plateFor, renderPlate, type PlateSkyName } from "./plate";

interface PlateArt {
  readonly sky: PlateSkyName;
  readonly background: Hex;
  readonly layers: readonly { readonly color: Hex; readonly d: string }[];
}

const art = new Map<string, PlateArt>();

export const plateArt = (slug: string): PlateArt => {
  const cached = art.get(slug);
  if (cached !== undefined) return cached;

  const { sky, seed } = plateFor(slug);
  const plate = renderPlate({ sky: PLATE_SKIES[sky], seed });
  const counts = new Map<Hex, number>();
  for (const color of plate.cells) counts.set(color, (counts.get(color) ?? 0) + 1);
  const byCount = [...counts].sort((a, b) => b[1] - a[1]).map(([color]) => color);
  const [background = PLATE_SKIES[sky].top, ...rest] = byCount;
  const made: PlateArt = {
    sky,
    background,
    layers: rest.map((color) => ({
      color,
      d: cellPath(plate.width, plate.height, (x, y) => plate.cells[y * plate.width + x] === color),
    })),
  };
  art.set(slug, made);
  return made;
};

export const plateSize = (screenPx: number): { readonly w: number; readonly h: number } => ({
  w: (PLATE.width * screenPx) / GRID.cell,
  h: (PLATE.height * screenPx) / GRID.cell,
});

export interface PlaybookPlateProps {
  readonly x: number;
  readonly y: number;
  readonly slug: string;
  readonly screenPx: number;
}

export const PlaybookPlate: FC<PlaybookPlateProps> = ({ x, y, slug, screenPx }) => {
  const plate = plateArt(slug);
  const size = plateSize(screenPx);
  return (
    <Box x={x} y={y} w={size.w} h={size.h} fill={plate.background}>
      {plate.layers.map((layer) => (
        <Cells
          key={layer.color}
          x={0}
          y={0}
          w={PLATE.width}
          h={PLATE.height}
          d={layer.d}
          color={layer.color}
          scale={screenPx / GRID.cell}
        />
      ))}
    </Box>
  );
};
