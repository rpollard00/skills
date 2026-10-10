import { bayer8, fnv1a, mulberry32 } from "../../kit/motion";
import { PLATE_SKIES, type Hex, type Sky } from "../../theme";

export const PLATE = { width: 160, height: 60 } as const;

const PLATE_SKY_NAMES = [
  "dusk",
  "dawn",
  "day",
  "night",
  "haze",
  "ember",
  "sea",
  "storm",
  "frost",
  "bloom",
  "desert",
] as const satisfies readonly (keyof typeof PLATE_SKIES)[];

export type PlateSkyName = (typeof PLATE_SKY_NAMES)[number];

export interface Plate {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Hex[];
}

const SKY_STOPS = { middle: 0.55, horizon: 0.85 } as const;

const skyColor = (sky: Sky, x: number, y: number, t: number): Hex => {
  if (t <= SKY_STOPS.middle) return t / SKY_STOPS.middle > bayer8(x, y) ? sky.middle : sky.top;
  if (t <= SKY_STOPS.horizon) {
    return (t - SKY_STOPS.middle) / (SKY_STOPS.horizon - SKY_STOPS.middle) > bayer8(x, y) ? sky.horizon : sky.middle;
  }
  return sky.horizon;
};

const TURN = 6.28;

const ridge = (args: {
  readonly random: () => number;
  readonly width: number;
  readonly height: number;
  readonly base: number;
  readonly amp: number;
  readonly freq: number;
}): readonly number[] => {
  const { random, width, height, base, amp, freq } = args;
  const first = random() * TURN;
  const second = random() * TURN;
  const third = random() * TURN;
  return Array.from({ length: width }, (_, x) => {
    const u = (x / width) * TURN;
    const wave =
      Math.sin(u * freq + first) * 0.6 + Math.sin(u * freq * 2.3 + second) * 0.3 + Math.sin(u * freq * 5.1 + third) * 0.1;
    return Math.trunc(height * base + height * amp * wave);
  });
};

export const renderPlate = (args: {
  readonly sky: Sky;
  readonly seed: number;
  readonly width?: number;
  readonly height?: number;
}): Plate => {
  const { sky, seed, width = PLATE.width, height = PLATE.height } = args;
  const random = mulberry32(seed);
  const below = (limit: number): number => Math.floor(random() * limit);
  const cells = new Array<Hex>(width * height).fill(sky.top);
  const put = (x: number, y: number, color: Hex): void => {
    cells[y * width + x] = color;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) put(x, y, skyColor(sky, x, y, y / (height - 1)));
  }

  if (sky.stars !== null) {
    const count = Math.floor((width * height) / 60);
    for (let star = 0; star < count; star++) {
      const x = below(width);
      const y = below(Math.floor(height * 0.5));
      put(x, y, sky.stars);
    }
  }

  const radius = Math.max(3, Math.floor(height / 7));
  const sunX = Math.trunc(width * (0.2 + random() * 0.6));
  const sunY = Math.trunc(height * (0.38 + random() * 0.14));
  if (sky.sun !== null) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = sunX + dx;
        const y = sunY + dy;
        const inside = dx * dx + dy * dy <= radius * radius + radius * 0.6;
        if (inside && x >= 0 && x < width && y >= 0 && y < height) put(x, y, sky.sun);
      }
    }
  }

  const back = ridge({ random, width, height, base: 0.64, amp: 0.1, freq: 1.3 });
  const front = ridge({ random, width, height, base: 0.8, amp: 0.07, freq: 2.1 });
  for (let x = 0; x < width; x++) {
    const backTop = back[x] ?? height;
    const frontTop = front[x] ?? height;
    for (let y = 0; y < height; y++) {
      if (y >= frontTop) put(x, y, sky.hills.front);
      else if (y >= backTop) put(x, y, sky.hills.back);
    }
  }

  return { width, height, cells };
};

export const plateFor = (slug: string): { readonly sky: PlateSkyName; readonly seed: number } => {
  const seed = fnv1a(slug);
  return { sky: PLATE_SKY_NAMES[seed % PLATE_SKY_NAMES.length] ?? PLATE_SKY_NAMES[0], seed };
};
