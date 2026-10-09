export type Srgb8 = readonly [red: number, green: number, blue: number];

// Dark to bright. The shader writes these bytes to the framebuffer unchanged.
export const ENERGY_PALETTE = [
  [3, 11, 8],
  [7, 38, 26],
  [12, 74, 46],
  [18, 132, 72],
  [52, 211, 118],
  [200, 255, 217],
] as const satisfies readonly Srgb8[];

export const toCss = ([red, green, blue]: Srgb8): string =>
  `rgb(${red} ${green} ${blue})`;
