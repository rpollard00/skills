export interface Region {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const SPECIMEN = {
  headerEdge: { name: "dither edge under the header", x: 0, y: 11, w: 480, h: 12 },
  checker: { name: "checker", x: 8, y: 30, w: 40, h: 24 },
  levels: { name: "dither levels", x: 56, y: 30, w: 144, h: 24 },
  orbs: { name: "orbs", x: 208, y: 30, w: 126, h: 24 },
  pixelText: { name: "pixel text", x: 8, y: 60, w: 208, h: 26 },
  wordmark: { name: "wordmark tile", x: 342, y: 30, w: 81, h: 27 },
  gauge: { name: "gauge", x: 224, y: 62, w: 110, h: 4 },
  windowEdge: { name: "dither edge in a window", x: 9, y: 102, w: 198, h: 12 },
  barEdge: { name: "dither edge above the label bar", x: 0, y: 249, w: 480, h: 12 },
} as const satisfies Record<string, Region>;
