import type { CSSProperties, FC } from "react";
import { labelPx, TYPE, type Hex } from "../theme";
import { cells, useTheme } from "./grid";

export interface LabelProps {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  /** Default: the theme text color. */
  readonly color?: Hex;
  /** Height of the line box in cells. The text centers in it. Default 8. */
  readonly h?: number;
  /** With `w`, the text aligns inside that width. */
  readonly w?: number;
  readonly align?: "left" | "right" | "center";
  /** Cells for each character. Default 5 (28.57 px). Never below 5. */
  readonly pitch?: number;
  /** Commands, paths, and code keep their case. Other labels are uppercase. */
  readonly keepCase?: boolean;
  readonly bold?: boolean;
}

/** Cells that a label takes: each character advances exactly `pitch` cells. */
export const labelWidth = (text: string, pitch: number = TYPE.labelPitch): number => text.length * pitch;

export const Label: FC<LabelProps> = ({
  x,
  y,
  text,
  color,
  h = 8,
  w,
  align = "left",
  pitch = TYPE.labelPitch,
  keepCase = false,
  bold = false,
}) => {
  const theme = useTheme();
  const size = labelPx(pitch);
  const spacing = size * TYPE.labelSpacingEm;
  const style: CSSProperties = {
    position: "absolute",
    left: cells(x),
    top: cells(y),
    height: cells(h),
    lineHeight: `${cells(h)}px`,
    fontFamily: `"${TYPE.mono.family}"`,
    fontWeight: bold ? TYPE.mono.weightBold : TYPE.mono.weight,
    fontSize: size,
    letterSpacing: spacing,
    // Letter spacing follows each character. Half of it before the first one centers the text in its cells.
    paddingLeft: spacing / 2,
    boxSizing: "border-box",
    textTransform: keepCase ? "none" : "uppercase",
    whiteSpace: "pre",
    color: color ?? theme.text,
    textAlign: align,
    ...(w === undefined ? {} : { width: cells(w) }),
  };
  return <div style={style}>{text}</div>;
};

export interface DisplayProps {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  /** Font size in px. Default: the card size, 52. */
  readonly size?: number;
  /** Height of the line box in cells. Default: the card line, 14. */
  readonly h?: number;
}

// At the display width and weight, the font's own kerning makes the ink of
// these pairs touch or overlap. Measured for every pair of capitals, digits,
// and `.,:;!?-'/`. All other pairs keep the font's kerning.
const TOUCHING_PAIRS: ReadonlySet<string> = new Set(["W.", "W,", "KA", "KV", "KW", "KY", "XA", "AX", "XZ", "LX"]);

const splitAtTouchingPairs = (text: string): readonly string[] => {
  const parts: string[] = [];
  let start = 0;
  for (let index = 1; index < text.length; index++) {
    if (TOUCHING_PAIRS.has(text.slice(index - 1, index + 1))) {
      parts.push(text.slice(start, index));
      start = index;
    }
  }
  return [...parts, text.slice(start)];
};

/** Heavy, wide, uppercase display text. One line. Vector type, positioned on the grid. */
export const Display: FC<DisplayProps> = ({ x, y, text, size = TYPE.cardPx, h = TYPE.cardLineCells }) => {
  const theme = useTheme();
  const style: CSSProperties = {
    position: "absolute",
    left: cells(x),
    top: cells(y),
    height: cells(h),
    lineHeight: `${cells(h)}px`,
    fontFamily: `"${TYPE.display.family}"`,
    fontWeight: TYPE.display.weight,
    fontStretch: `${TYPE.display.stretch}%`,
    fontSize: size,
    textTransform: "uppercase",
    whiteSpace: "pre",
    color: theme.text,
    textAlign: "left",
  };
  const parts = splitAtTouchingPairs(text.toUpperCase());
  if (parts.length === 1) return <div style={style}>{text}</div>;
  return (
    <div style={style}>
      {parts.map((part, index) => (
        // An inline-block is shaped alone, so no kerning applies across the split.
        <span key={index} style={{ display: "inline-block" }}>
          {part}
        </span>
      ))}
    </div>
  );
};
