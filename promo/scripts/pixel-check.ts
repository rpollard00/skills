import { execFileSync } from "node:child_process";
import { SPECIMEN, type Region } from "../src/dev/specimen";
import { allColors, GRID, rgb } from "../src/theme";
import { VIDEO } from "../src/video";

const [file, ...rest] = process.argv.slice(2);
if (file === undefined || rest.length === 0) {
  process.stderr.write("Usage: pixel-check.ts <still.png> (--specimen | name=x,y,w,h ...)\n");
  process.exit(2);
}

const parseRegion = (argument: string): Region => {
  const [name, numbers] = argument.split("=");
  const [x, y, w, h] = (numbers ?? "").split(",").map(Number);
  const values = [x, y, w, h];
  if (name === undefined || x === undefined || y === undefined || w === undefined || h === undefined || !values.every(Number.isInteger)) {
    throw new Error(`"${argument}" is not name=x,y,w,h with whole numbers of cells.`);
  }
  return { name, x, y, w, h };
};

const regions: readonly Region[] = rest.includes("--specimen") ? Object.values(SPECIMEN) : rest.map(parseRegion);

const pixels = execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], {
  maxBuffer: VIDEO.width * VIDEO.height * 3 + 1024,
});
if (pixels.length !== VIDEO.width * VIDEO.height * 3) {
  throw new Error(`${file} is not ${VIDEO.width}x${VIDEO.height}.`);
}

const key = (red: number, green: number, blue: number): number => (red << 16) | (green << 8) | blue;
const palette = new Set(allColors().map((hex) => key(...rgb(hex))));
const colorAt = (px: number, py: number): number => {
  const offset = (py * VIDEO.width + px) * 3;
  return key(pixels[offset] ?? 0, pixels[offset + 1] ?? 0, pixels[offset + 2] ?? 0);
};

let failed = false;
for (const region of regions) {
  let mixed = 0;
  let offPalette = 0;
  const seen = new Set<number>();
  for (let cy = region.y; cy < region.y + region.h; cy++) {
    for (let cx = region.x; cx < region.x + region.w; cx++) {
      const first = colorAt(cx * GRID.cell, cy * GRID.cell);
      let uniform = true;
      for (let dy = 0; dy < GRID.cell; dy++) {
        for (let dx = 0; dx < GRID.cell; dx++) {
          if (colorAt(cx * GRID.cell + dx, cy * GRID.cell + dy) !== first) uniform = false;
        }
      }
      if (!uniform) mixed += 1;
      else if (!palette.has(first)) offPalette += 1;
      seen.add(first);
    }
  }
  const ok = mixed === 0 && offPalette === 0 && seen.size > 1;
  failed ||= !ok;
  const colors = [...seen].map((color) => `#${color.toString(16).padStart(6, "0")}`).join(" ");
  process.stdout.write(
    `${ok ? "ok  " : "FAIL"} ${region.name}: ${region.w * region.h} cells at (${region.x}, ${region.y}), ` +
      `${mixed} not uniform, ${offPalette} off palette, ${seen.size} colors: ${colors}\n`,
  );
}
process.exit(failed ? 1 : 0);
