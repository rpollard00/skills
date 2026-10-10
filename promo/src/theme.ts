export type Hex = `#${string}`;
export type Rgb = readonly [red: number, green: number, blue: number];

/** One cell is `cell` screen pixels. The frame is `cols` x `rows` cells. */
export const GRID = { cell: 4, cols: 480, rows: 270 } as const;

export const THEME_NAMES = ["dark", "paper"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export interface UiTheme {
  readonly page: Hex;
  /** Window body. */
  readonly window: Hex;
  /** Window border. */
  readonly border: Hex;
  readonly text: Hex;
  readonly muted: Hex;
  /** The one interface accent, as a fill. */
  readonly accent: Hex;
  readonly onAccent: Hex;
  /** The accent as text on `page` or `window`. */
  readonly accentText: Hex;
  readonly chrome: Hex;
  readonly onChrome: Hex;
  readonly mutedOnChrome: Hex;
  /** Pixel text and pixel marks on `page` or `window`. */
  readonly pixel: Hex;
}

const CHROME = "#1c1a24";
const PAPER = "#f5f0e6";
const MUTED_ON_CHROME = "#a7a1b3";

export const THEMES = {
  dark: {
    page: "#3b3a45",
    window: "#232a6b",
    border: PAPER,
    text: "#e9e8ee",
    muted: "#b9b8c8",
    accent: "#cc0078",
    onAccent: PAPER,
    accentText: "#ff85c2",
    chrome: CHROME,
    onChrome: PAPER,
    mutedOnChrome: MUTED_ON_CHROME,
    pixel: PAPER,
  },
  paper: {
    page: PAPER,
    window: PAPER,
    border: CHROME,
    text: CHROME,
    muted: "#5f596b",
    accent: "#2b3dff",
    onAccent: PAPER,
    accentText: "#2b3dff",
    chrome: CHROME,
    onChrome: PAPER,
    mutedOnChrome: MUTED_ON_CHROME,
    pixel: CHROME,
  },
} as const satisfies Record<ThemeName, UiTheme>;

export type Ramp4 = readonly [Hex, Hex, Hex, Hex];
export type Ramp5 = readonly [Hex, Hex, Hex, Hex, Hex];

/** Mako energy, dark to light. Plates, orbs, gauges, and PROVEN states only. */
export const ENERGY = [
  "#0a2a22",
  "#0f5c46",
  "#19c37d",
  "#7dffb5",
  "#e9ffe9",
] as const satisfies Ramp5;

/** Text on an `ENERGY[2]` fill. */
export const ON_ENERGY: Hex = CHROME;

/** Orb ramps, dark to light. Stop 0 is the outline and the center mark. */
export const KIND_RAMPS = {
  engineering: [ENERGY[0], ENERGY[2], ENERGY[3], ENERGY[4]],
  principle: ["#4a1a26", "#f08a3c", "#ffe08a", "#fff4dc"],
  craft: ["#5f596b", "#b9b8c8", PAPER, "#ffffff"],
} as const satisfies Record<string, Ramp4>;

export interface Sky {
  readonly top: Hex;
  readonly middle: Hex;
  readonly horizon: Hex;
  readonly hills: { readonly back: Hex; readonly front: Hex };
  readonly sun: Hex | null;
  readonly stars: Hex | null;
}

/** The Well. */
export const SKIES = {
  night: {
    top: "#0b1020",
    middle: "#123c3a",
    horizon: ENERGY[2],
    hills: { back: "#0f3a30", front: "#07130f" },
    sun: ENERGY[4],
    stars: "#d9dcf0",
  },
  day: {
    top: "#7fb8a6",
    middle: "#cfe8d4",
    horizon: PAPER,
    hills: { back: "#5f8a6a", front: "#2f4f3e" },
    sun: null,
    stars: null,
  },
} as const satisfies Record<string, Sky>;

export const PLATE_SKIES = {
  dusk: { top: "#23264f", middle: "#6b4f86", horizon: "#e3907f", hills: { back: "#5b4271", front: "#271d3b" }, sun: "#f7d58e", stars: null },
  dawn: { top: "#7a6a9a", middle: "#e9a9a0", horizon: "#f6d6b0", hills: { back: "#b0798c", front: "#6a466b" }, sun: "#fff4dc", stars: null },
  day: { top: "#5f97b3", middle: "#a9d0dc", horizon: "#eef0e6", hills: { back: "#6f9199", front: "#355560" }, sun: "#f2b27a", stars: null },
  night: { top: "#0e1130", middle: "#1d2753", horizon: "#374777", hills: { back: "#243058", front: "#0b0d22" }, sun: "#ece6cf", stars: "#d9dcf0" },
  haze: { top: "#8c8499", middle: "#c9c0cf", horizon: "#ecdcc9", hills: { back: "#7a7188", front: "#4e4860" }, sun: "#f6efe2", stars: null },
  ember: { top: "#2a1020", middle: "#8a2d2a", horizon: "#f08a3c", hills: { back: "#4a1a26", front: "#1a0a12" }, sun: "#ffe08a", stars: null },
  sea: { top: "#0f3a4a", middle: "#2f8a8c", horizon: "#bfe6d6", hills: { back: "#1f5d63", front: "#0b2a33" }, sun: "#fff1c9", stars: null },
  storm: { top: "#2b2f3a", middle: "#56606e", horizon: "#a9b0a0", hills: { back: "#3a4250", front: "#1a1e26" }, sun: "#e8e36a", stars: null },
  frost: { top: "#4a6a9a", middle: "#a9c4e0", horizon: "#eef3f6", hills: { back: "#8aa3bf", front: "#4a6284" }, sun: "#ffffff", stars: null },
  bloom: { top: "#6e4a7e", middle: "#e59ab5", horizon: "#fbe1d6", hills: { back: "#5f8a6a", front: "#2f4f3e" }, sun: "#fff6e8", stars: null },
  desert: { top: "#3b2a4a", middle: "#c86a4a", horizon: "#f3c58a", hills: { back: "#a4553a", front: "#5a2a22" }, sun: "#fff0c0", stars: null },
} as const satisfies Record<string, Sky>;

/** The gate in the battle plate. Its other faces take interface tokens. */
export const GATE = {
  side: "#0b0a10",
} as const satisfies Record<string, Hex>;

/** Colors that a Bayer cover can have. Film data names them. */
export const COVER_COLORS = {
  chrome: CHROME,
  energy: ENERGY[3],
  paper: PAPER,
} as const satisfies Record<string, Hex>;
export type CoverColor = keyof typeof COVER_COLORS;

/**
 * Type tokens. A label is mono, uppercase, with 0.1em letter spacing. Its size
 * is set so that one character advances a whole number of cells: the mono
 * advance is 0.6em, so 0.7em is `labelPitch` cells and the size is 28.57 px.
 */
export const TYPE = {
  display: { family: "Mako Display", weight: 900, stretch: 125 },
  mono: { family: "Mako Mono", weight: 500, weightBold: 700 },
  cardPx: 52,
  cardLineCells: 14,
  headingPx: 72,
  headingLineCells: 19,
  labelPitch: 5,
  labelSpacingEm: 0.1,
  monoAdvanceEm: 0.6,
  labelMinPx: 28,
} as const;

/** Font size in px of a label with the given character pitch in cells. */
export const labelPx = (pitch: number): number =>
  (pitch * GRID.cell) / (TYPE.monoAdvanceEm + TYPE.labelSpacingEm);

export const rgb = (hex: Hex): Rgb => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
};

const channelLuminance = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: Hex): number => {
  const [red, green, blue] = rgb(hex);
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
};

/** WCAG 2 contrast ratio, 1 to 21. */
export const contrast = (a: Hex, b: Hex): number => {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

const skyColors = (sky: Sky): Hex[] =>
  [sky.top, sky.middle, sky.horizon, sky.hills.back, sky.hills.front, sky.sun, sky.stars].filter(
    (color) => color !== null,
  );

/** Every color a frame can contain outside vector type. */
export const allColors = (): readonly Hex[] => [
  ...new Set<Hex>([
    ...THEME_NAMES.flatMap((name) => Object.values(THEMES[name])),
    ...ENERGY,
    ON_ENERGY,
    ...Object.values(KIND_RAMPS).flat(),
    ...Object.values(SKIES).flatMap(skyColors),
    ...Object.values(PLATE_SKIES).flatMap(skyColors),
    ...Object.values(GATE),
    ...Object.values(COVER_COLORS),
  ]),
];
