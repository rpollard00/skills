import { createContext, useContext, type CSSProperties, type FC, type ReactNode } from "react";
import { GRID, THEMES, type Hex, type ThemeName, type UiTheme } from "../theme";

/** Cells to screen pixels. A fraction rounds to the nearest whole cell, so every edge stays on the grid. */
export const cells = (count: number): number => Math.round(count) * GRID.cell;

const ThemeContext = createContext<ThemeName>("dark");

export const useThemeName = (): ThemeName => useContext(ThemeContext);
/** The interface tokens of the theme that the nearest `Frame` or `ThemeScope` sets. */
export const useTheme = (): UiTheme => THEMES[useContext(ThemeContext)];

export const ThemeScope: FC<{ readonly theme: ThemeName; readonly children: ReactNode }> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

interface Origin {
  readonly x: number;
  readonly y: number;
}

const OriginContext = createContext<Origin>({ x: 0, y: 0 });

/** The frame cell of the top-left corner of the nearest `Box`. Dither parts use it to stay in phase. */
export const useOrigin = (): Origin => useContext(OriginContext);

const FILL: CSSProperties = { position: "absolute", left: 0, top: 0, overflow: "hidden" };

/** The root of a scene: the full 480x270 grid in the page color of `theme`. */
export const Frame: FC<{ readonly theme: ThemeName; readonly children?: ReactNode }> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>
    <OriginContext.Provider value={{ x: 0, y: 0 }}>
      <div style={{ ...FILL, width: cells(GRID.cols), height: cells(GRID.rows), backgroundColor: THEMES[theme].page }}>
        {children}
      </div>
    </OriginContext.Provider>
  </ThemeContext.Provider>
);

export interface BoxProps {
  /** Cells from the top-left corner of the parent `Box` or `Frame`. */
  readonly x: number;
  readonly y: number;
  /** Cells. */
  readonly w: number;
  readonly h: number;
  readonly fill?: Hex;
  readonly clip?: boolean;
  readonly children?: ReactNode;
}

/** A rectangle on the grid. Children position against its top-left corner. */
export const Box: FC<BoxProps> = ({ x, y, w, h, fill, clip = false, children }) => {
  const origin = useOrigin();
  const style: CSSProperties = {
    position: "absolute",
    left: cells(x),
    top: cells(y),
    width: cells(w),
    height: cells(h),
    overflow: clip ? "hidden" : "visible",
    ...(fill === undefined ? {} : { backgroundColor: fill }),
  };
  return (
    <OriginContext.Provider value={{ x: origin.x + Math.round(x), y: origin.y + Math.round(y) }}>
      <div style={style}>{children}</div>
    </OriginContext.Provider>
  );
};
