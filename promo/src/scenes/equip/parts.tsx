import { useMemo, type FC, type ReactNode } from "react";
import { bayer8, Box, cellPath, Cells, clamp01, easeInCubic, mod, useTheme } from "../../kit";
import { GRID, type Hex } from "../../theme";
import { cornerOf, ORB, SOCKET, type Point } from "./layout";

const inDisc = (cx: number, cy: number, size: number, across: number): boolean =>
  Math.hypot(cx + 0.5 - size / 2, cy + 0.5 - size / 2) <= across / 2;

const inSocketRing = (cx: number, cy: number): boolean => inDisc(cx, cy, SOCKET, SOCKET) && !inDisc(cx, cy, SOCKET, ORB);

const RING_PATH = cellPath(SOCKET, SOCKET, inSocketRing);
const CHECK = 2;

export type SocketState = "empty" | "waiting" | "loaded";

export interface SocketProps {
  readonly at: Point;
  readonly state: SocketState;
}

export const Socket: FC<SocketProps> = ({ at, state }) => {
  const theme = useTheme();
  const phaseX = mod(at.x, CHECK * 2);
  const phaseY = mod(at.y, CHECK * 2);
  const checker = useMemo(
    () =>
      cellPath(
        SOCKET,
        SOCKET,
        (cx, cy) => inSocketRing(cx, cy) && (Math.floor((phaseX + cx) / CHECK) + Math.floor((phaseY + cy) / CHECK)) % 2 === 0,
      ),
    [phaseX, phaseY],
  );
  return (
    <Cells
      x={at.x}
      y={at.y}
      w={SOCKET}
      h={SOCKET}
      d={state === "waiting" ? checker : RING_PATH}
      color={state === "loaded" ? theme.onChrome : theme.mutedOnChrome}
    />
  );
};

export interface DitherDiscProps {
  readonly center: Point;
  readonly size: number;
  readonly level: number;
  readonly color: Hex;
  readonly hole?: number;
}

export const DitherDisc: FC<DitherDiscProps> = ({ center, size, level, color, hole = 0 }) => {
  const corner = cornerOf(center, size);
  const d = cellPath(
    size,
    size,
    (cx, cy) => inDisc(cx, cy, size, size) && !inDisc(cx, cy, size, hole) && level > bayer8(corner.x + cx, corner.y + cy),
  );
  return d === "" ? null : <Cells x={corner.x} y={corner.y} w={size} h={size} d={d} color={color} />;
};

const MARK = { size: ORB + 6, arm: 5 } as const;
const MARK_PATH = cellPath(MARK.size, MARK.size, (cx, cy) => {
  const last = MARK.size - 1;
  const onEdge = cx === 0 || cy === 0 || cx === last || cy === last;
  const nearCorner = (cx < MARK.arm || cx > last - MARK.arm) && (cy < MARK.arm || cy > last - MARK.arm);
  return onEdge && nearCorner;
});

export const PickMark: FC<{ readonly center: Point }> = ({ center }) => {
  const theme = useTheme();
  const corner = cornerOf(center, MARK.size);
  return <Cells x={corner.x} y={corner.y} w={MARK.size} h={MARK.size} d={MARK_PATH} color={theme.pixel} />;
};

export interface BandsProps {
  readonly count: number;
  readonly step: number;
  readonly steps: number;
  readonly behind: Hex;
  readonly children: ReactNode;
}

export const Bands: FC<BandsProps> = ({ count, step, steps, behind, children }) => {
  const theme = useTheme();
  if (step <= 0) return <>{children}</>;

  const stagger = Math.floor(steps / (count * 1.5));
  const slide = Math.max(1, steps - (count - 1) * stagger);
  const rowOf = (band: number): number => Math.round((band * GRID.rows) / count);
  const travel = (band: number): number => clamp01((step - band * stagger) / slide);
  const whole = (top: number, rows: number, shift: number, key: string): ReactNode => (
    <Box key={key} x={shift} y={top} w={GRID.cols} h={rows} fill={theme.page} clip>
      <Box x={0} y={-top} w={GRID.cols} h={GRID.rows}>
        {children}
      </Box>
    </Box>
  );

  const bands = Array.from({ length: count }, (_, band) => band);
  const firstStill = bands.find((band) => travel(band) <= 0) ?? count;
  return (
    <>
      <Box x={0} y={0} w={GRID.cols} h={GRID.rows} fill={behind} />
      {bands.slice(0, firstStill).map((band) => {
        const moved = travel(band);
        if (moved >= 1) return null;
        const shift = Math.round(GRID.cols * easeInCubic(moved)) * (band % 2 === 0 ? -1 : 1);
        return whole(rowOf(band), rowOf(band + 1) - rowOf(band), shift, `band-${band}`);
      })}
      {firstStill < count ? whole(rowOf(firstStill), GRID.rows - rowOf(firstStill), 0, "still") : null}
    </>
  );
};
