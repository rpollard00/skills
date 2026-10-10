import { ThreeCanvas } from "@remotion/three";
import { createContext, useContext, type FC, type ReactNode } from "react";
import { GRID } from "../theme";
import { cells, useOrigin } from "../kit/grid";

export interface Stage {
  /** Frame cell of the top-left corner of the canvas. */
  readonly x: number;
  readonly y: number;
  readonly cols: number;
  readonly rows: number;
}

const StageContext = createContext<Stage>({ x: 0, y: 0, cols: GRID.cols, rows: GRID.rows });

export const useStage = (): Stage => useContext(StageContext);

export interface PixelStageProps {
  /** Canvas size in cells, for example 480x270 or 480x180. */
  readonly cols: number;
  readonly rows: number;
  /** Cells from the top-left corner of the parent `Box` or `Frame`. Default 0. */
  readonly x?: number;
  readonly y?: number;
  /** React Three Fiber elements. */
  readonly children: ReactNode;
}

/**
 * A WebGL canvas with one texel for each cell, shown 4x with no smoothing and
 * no anti-aliasing. The clear color is transparent, so the frame shows where a
 * fragment discards. Use one stage in a scene: each one is a WebGL context.
 */
export const PixelStage: FC<PixelStageProps> = ({ cols, rows, x = 0, y = 0, children }) => {
  const origin = useOrigin();
  const stage: Stage = { x: origin.x + Math.round(x), y: origin.y + Math.round(y), cols, rows };
  return (
    // dpr is fixed so that --scale cannot change the texel count.
    <ThreeCanvas
      width={cols}
      height={rows}
      dpr={1}
      gl={{ antialias: false, alpha: true }}
      style={{
        position: "absolute",
        left: cells(x),
        top: cells(y),
        transform: `scale(${GRID.cell})`,
        transformOrigin: "0 0",
        imageRendering: "pixelated",
      }}
    >
      <StageContext.Provider value={stage}>{children}</StageContext.Provider>
    </ThreeCanvas>
  );
};
