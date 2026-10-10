import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TIMELINE } from "../src/film";

const PROMO = path.resolve(import.meta.dirname, "..");
const OUT = path.join(PROMO, "out", "stills");
const SEQUENCE = path.join(OUT, "sequence");
const SHEET = "contact-sheet.png";
const COLUMNS = 4;
const TILE_WIDTH = 640;

const everyShot = process.argv.includes("--all");

const stills = TIMELINE.scenes
  .flatMap((scene) => scene.shots.map((shot) => ({ scene, shot })))
  .filter(({ shot }) => everyShot || shot.card !== null)
  .map(({ scene, shot }, index) => ({
    name: `${String(index + 1).padStart(2, "0")}-${scene.kind}-${shot.id}.png`,
    frame: shot.startFrame + Math.floor(shot.durationFrames / 2),
  }));

const run = (command: string, args: readonly string[]): void => {
  try {
    execFileSync(command, args, { cwd: PROMO, stdio: ["ignore", "inherit", "inherit"] });
  } catch {
    process.stderr.write(`stills failed in: ${command} ${args.slice(0, 4).join(" ")}\n`);
    process.exit(1);
  }
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(SEQUENCE, { recursive: true });

const propsFile = path.join(SEQUENCE, "props.json");
writeFileSync(propsFile, JSON.stringify({ frames: stills.map((still) => still.frame) }));

run("npx", [
  "remotion",
  "render",
  "src/dev/stills.tsx",
  "Stills",
  SEQUENCE,
  "--sequence",
  "--image-format=png",
  `--props=${propsFile}`,
  `--frames=0-${stills.length - 1}`,
  "--bundle-cache=false",
  "--log=error",
]);

const frameNumber = (file: string): number => Number(/(\d+)\.png$/.exec(file)?.[1]);
const rendered = readdirSync(SEQUENCE)
  .filter((file) => file.endsWith(".png"))
  .sort((a, b) => frameNumber(a) - frameNumber(b));
if (rendered.length !== stills.length) {
  throw new Error(`Expected ${stills.length} stills, but the render wrote ${rendered.length}.`);
}
stills.forEach((still, index) => {
  const source = rendered[index];
  if (source !== undefined) renameSync(path.join(SEQUENCE, source), path.join(OUT, still.name));
});
rmSync(SEQUENCE, { recursive: true });

const digests = new Set(stills.map((still) => createHash("sha256").update(readFileSync(path.join(OUT, still.name))).digest("hex")));
if (digests.size !== stills.length) {
  throw new Error(`Only ${digests.size} of ${stills.length} stills are different pictures.`);
}

const rows = Math.ceil(stills.length / COLUMNS);
run("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-pattern_type",
  "glob",
  "-i",
  path.join(OUT, "[0-9][0-9]-*.png"),
  "-vf",
  `scale=${TILE_WIDTH}:-1:flags=neighbor,tile=${COLUMNS}x${rows}:padding=8:margin=8`,
  "-frames:v",
  "1",
  path.join(OUT, SHEET),
]);

process.stdout.write(
  [
    ...stills.map((still) => `out/stills/${still.name}  film frame ${still.frame}`),
    `out/stills/${SHEET}  ${stills.length} stills, ${COLUMNS} in a row`,
    "",
  ].join("\n"),
);
