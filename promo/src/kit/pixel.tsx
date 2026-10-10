import { useMemo, type FC } from "react";
import type { SkillKind } from "../catalog";
import { KIND_RAMPS, type Hex } from "../theme";
import { cellPath, Cells } from "./dither";
import { Box, useTheme } from "./grid";
import { bayer8, clamp01 } from "./motion";

const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
const GLYPH_ADVANCE = GLYPH_WIDTH + 1;

type Glyph = readonly [string, string, string, string, string, string, string];

const GLYPHS = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "....#", "....#", "....#", "....#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
} as const satisfies Record<string, Glyph>;

type GlyphChar = keyof typeof GLYPHS;

const isGlyphChar = (char: string): char is GlyphChar => Object.hasOwn(GLYPHS, char);

/** Characters that `PixelText` can draw: A to Z, 0 to 9, `/ . : -`, space, and lowercase `m a k o`. */
export const PIXEL_CHARS: readonly string[] = Object.keys(GLYPHS);

const glyphOf = (char: string): Glyph => {
  if (!isGlyphChar(char)) throw new Error(`PixelText has no glyph for "${char}". It has: ${PIXEL_CHARS.join("")}`);
  return GLYPHS[char];
};

/** Width in cells of pixel text at a scale. The height is `7 * scale`. */
export const pixelTextWidth = (text: string, scale = 1): number =>
  Math.max(0, text.length * GLYPH_ADVANCE - 1) * scale;

export interface PixelTextProps {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  /** Cells for each glyph pixel. A whole number. Default 1. */
  readonly scale?: number;
  /** Default: the theme pixel color. */
  readonly color?: Hex;
}

/** Text in the 5x7 pixel font, for the wordmark, large numerals, and stamps. */
export const PixelText: FC<PixelTextProps> = ({ x, y, text, scale = 1, color }) => {
  const theme = useTheme();
  const units = pixelTextWidth(text);
  const d = useMemo(() => {
    const glyphs = [...text].map(glyphOf);
    return cellPath(units, GLYPH_HEIGHT, (cx, cy) => {
      const column = cx % GLYPH_ADVANCE;
      return column < GLYPH_WIDTH && glyphs[Math.floor(cx / GLYPH_ADVANCE)]?.[cy]?.[column] === "#";
    });
  }, [text, units]);
  return <Cells x={x} y={y} w={units} h={GLYPH_HEIGHT} d={d} color={color ?? theme.pixel} scale={Math.round(scale)} />;
};

const WORDMARK = "mako";
const WORDMARK_PAD = 2;

/** Cells that the wordmark tile takes at a scale. */
export const wordmarkSize = (scale = 1): { readonly w: number; readonly h: number } => ({
  w: (pixelTextWidth(WORDMARK) + WORDMARK_PAD * 2) * scale,
  h: (GLYPH_HEIGHT + WORDMARK_PAD) * scale,
});

/**
 * The `mako` tile: pixels in the on-accent color on an accent fill. It has 2
 * glyph pixels of padding at the sides and the bottom and none at the top, so
 * the `k` touches the top edge.
 */
export const Wordmark: FC<{ readonly x: number; readonly y: number; readonly scale?: number }> = ({ x, y, scale = 1 }) => {
  const theme = useTheme();
  const size = wordmarkSize(scale);
  return (
    <Box x={x} y={y} w={size.w} h={size.h} fill={theme.accent}>
      <PixelText x={WORDMARK_PAD * scale} y={0} text={WORDMARK} scale={scale} color={theme.onAccent} />
    </Box>
  );
};

const ORB_LIGHT = [-0.5, 0.6, 0.62] as const;
const ORB_LIGHT_LENGTH = Math.hypot(...ORB_LIGHT);
const HIGHLIGHT = 4;

const ORB_MARKS = {
  engineering: ["###", "###", "###"],
  principle: [".#.", "###", ".#."],
  craft: ["...", "###", "..."],
} as const satisfies Record<SkillKind, readonly [string, string, string]>;

const orbCells = (kind: SkillKind, size: number, dim: number): readonly number[] => {
  const out: number[] = [];
  const center = (size - 1) / 2;
  const highlight = size >= 11 ? 2 : 1;
  const highlightX = Math.round(center - 0.35 * (size / 2) - highlight / 2);
  const highlightY = Math.round(center - 0.4 * (size / 2) - highlight / 2);
  for (let cy = 0; cy < size; cy++) {
    for (let cx = 0; cx < size; cx++) {
      const u = ((cx + 0.5) / size) * 2 - 1;
      const v = 1 - ((cy + 0.5) / size) * 2;
      const distance = Math.hypot(u, v);
      if (distance > 1) {
        out.push(-1);
        continue;
      }
      const markX = cx - (center - 1);
      const markY = cy - (center - 1);
      const inMark = size >= 11 && markX >= 0 && markX < 3 && markY >= 0 && markY < 3 && ORB_MARKS[kind][markY]?.[markX] === "#";
      const inHighlight = cx >= highlightX && cx < highlightX + highlight && cy >= highlightY && cy < highlightY + highlight;
      if (distance > 0.86 || inMark) {
        out.push(0);
        continue;
      }
      if (inHighlight && dim <= 0) {
        out.push(HIGHLIGHT);
        continue;
      }
      const normalZ = Math.sqrt(1 - distance * distance);
      const light = Math.max(0, (u * ORB_LIGHT[0] + v * ORB_LIGHT[1] + normalZ * ORB_LIGHT[2]) / ORB_LIGHT_LENGTH);
      const position = (0.15 + 0.85 * light) * 3;
      const lower = Math.min(2, Math.floor(position));
      const threshold = bayer8(cx, cy);
      const stop = position - lower > threshold ? lower + 1 : lower;
      out.push(dim > threshold ? Math.max(0, stop - 1) : stop);
    }
  }
  return out;
};

const orbPaths = new Map<string, readonly string[]>();

const orbSprite = (kind: SkillKind, size: number, dim: number): readonly string[] => {
  const level = Math.round(clamp01(dim) * 64);
  const key = `${kind}:${size}:${level}`;
  const cached = orbPaths.get(key);
  if (cached !== undefined) return cached;
  const grid = orbCells(kind, size, level / 64);
  const paths = [0, 1, 2, 3, HIGHLIGHT].map((stop) => cellPath(size, size, (cx, cy) => grid[cy * size + cx] === stop));
  orbPaths.set(key, paths);
  return paths;
};

export interface OrbProps {
  readonly x: number;
  readonly y: number;
  readonly kind: SkillKind;
  /** Cells across. Odd. Default 13. Below 11 the orb has no center mark. */
  readonly size?: number;
  /** 0 to 1: the share of cells that drop one ramp step, by ordered dither. */
  readonly dim?: number;
}

export const Orb: FC<OrbProps> = ({ x, y, kind, size = 13, dim = 0 }) => {
  const theme = useTheme();
  const ramp = KIND_RAMPS[kind];
  const paths = orbSprite(kind, Math.round(size), dim);
  const colors: readonly Hex[] = [...ramp, theme.onAccent];
  return (
    <Box x={x} y={y} w={size} h={size}>
      {paths.map((d, stop) => {
        const color = colors[stop];
        return d === "" || color === undefined ? null : <Cells key={stop} x={0} y={0} w={size} h={size} d={d} color={color} />;
      })}
    </Box>
  );
};
