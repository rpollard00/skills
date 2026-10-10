import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { battleProblems } from "../src/battle";
import { ENTRY_POINTS } from "../src/catalog";
import { FILM_PROBLEMS, TASK, TIMELINE } from "../src/film";
import { contrast, ENERGY, ON_ENERGY, THEME_NAMES, THEMES, type Hex } from "../src/theme";
import { sceneOf } from "../src/timeline";
import { syncCatalog } from "./sync-catalog";

const PROMO = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(PROMO, "..");
const SRC = path.join(PROMO, "src");
const MIN_CONTRAST = 4.5;

const failures: string[] = [];
const fail = (rule: string, where: string, message: string): void => void failures.push(`[${rule}] ${where}: ${message}`);

for (const problem of FILM_PROBLEMS) fail(problem.rule, problem.where, problem.message);

const normalize = (text: string): string => text.toLowerCase().replace(/\s+/g, " ").trim();
const fileText = new Map<string, string | null>();
const readNormalized = (file: string): string | null => {
  if (!fileText.has(file)) {
    const absolute = path.join(REPO, file);
    fileText.set(file, statSync(absolute, { throwIfNoEntry: false })?.isFile() === true ? normalize(readFileSync(absolute, "utf8")) : null);
  }
  return fileText.get(file) ?? null;
};
for (const scene of TIMELINE.scenes) {
  for (const shot of scene.shots) {
    const source = shot.card?.source;
    if (source === undefined || source.kind !== "quote") continue;
    const text = readNormalized(source.file);
    if (text === null) fail("2 claim", `${scene.kind}.${shot.id}`, `The source file ${source.file} does not exist.`);
    else if (!text.includes(normalize(source.text))) fail("2 claim", `${scene.kind}.${shot.id}`, `The quote "${source.text}" does not occur in ${source.file}.`);
  }
}

for (const failure of await syncCatalog("check")) fail("5 catalog", "catalog", failure);
const readme = readNormalized("README.md") ?? "";
for (const entry of ENTRY_POINTS) {
  for (const text of [entry.command, entry.harness]) {
    if (!readme.includes(normalize(text))) fail("5 catalog", "ENTRY_POINTS", `README.md does not contain "${text}".`);
  }
}

const pairs = (name: (typeof THEME_NAMES)[number]): readonly (readonly [string, Hex, Hex])[] => {
  const theme = THEMES[name];
  return [
    ["onAccent on accent", theme.onAccent, theme.accent],
    ["onChrome on chrome", theme.onChrome, theme.chrome],
    ["mutedOnChrome on chrome", theme.mutedOnChrome, theme.chrome],
    ["text on window", theme.text, theme.window],
    ["muted on window", theme.muted, theme.window],
    ["accentText on window", theme.accentText, theme.window],
    ["text on page", theme.text, theme.page],
    ["muted on page", theme.muted, theme.page],
  ];
};
for (const name of THEME_NAMES) {
  for (const [what, foreground, background] of pairs(name)) {
    const ratio = contrast(foreground, background);
    if (ratio < MIN_CONTRAST) fail("6 theme", `${name} theme`, `${what} (${foreground} on ${background}) is ${ratio.toFixed(2)}:1. The floor is ${MIN_CONTRAST}:1.`);
  }
}
if (contrast(ON_ENERGY, ENERGY[2]) < MIN_CONTRAST) {
  fail("6 theme", "energy", `ON_ENERGY on ENERGY[2] is ${contrast(ON_ENERGY, ENERGY[2]).toFixed(2)}:1. The floor is ${MIN_CONTRAST}:1.`);
}

for (const problem of battleProblems({ task: TASK, scene: sceneOf(TIMELINE, "battle") })) fail("7 battle", problem.where, problem.message);

const FONT_LOADER = "fonts.ts";
const THEME_FILE = "theme.ts";
const BANNED: readonly { readonly pattern: RegExp; readonly what: string; readonly browserOnly?: true; readonly except?: string }[] = [
  { pattern: /\bMath\.random\b/, what: "Math.random" },
  { pattern: /\bDate\.now\b/, what: "Date.now" },
  { pattern: /\bnew Date\(\s*\)/, what: "new Date()" },
  { pattern: /\bperformance\.now\b/, what: "performance.now" },
  { pattern: /\buseState\b/, what: "useState" },
  { pattern: /\buseReducer\b/, what: "useReducer" },
  { pattern: /\buseFrame\b/, what: "useFrame" },
  { pattern: /\bnew (?:THREE\.)?(?:Clock|Timer)\(/, what: "a three.js clock" },
  { pattern: /\.clock\b/, what: "the React Three Fiber clock" },
  { pattern: /\b(?:getElapsedTime|getElapsed|elapsedTime|getDelta)\b/, what: "a clock reading" },
  { pattern: /\buse(Layout|Insertion)?Effect\b/, what: "useEffect", except: FONT_LOADER },
  { pattern: /\b(transition|animation)[A-Za-z]*\s*:/, what: "a CSS transition or animation", browserOnly: true },
  { pattern: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/, what: "a hex color", except: THEME_FILE },
];

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.tsx?$/.test(entry.name) ? [absolute] : [];
  });

for (const file of sourceFiles(SRC)) {
  const relative = path.relative(SRC, file);
  const nodeOnly = relative.startsWith(`audio${path.sep}`);
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((text, index) => {
      for (const rule of BANNED) {
        if (rule.except === relative || (rule.browserOnly === true && nodeOnly)) continue;
        const match = rule.pattern.exec(text);
        if (match !== null) fail("8 purity", `src/${relative}:${index + 1}`, `${rule.what} is not allowed here (${match[0].trim()}).`);
      }
    });
}

if (failures.length > 0) {
  process.stderr.write(`check failed: ${failures.length} problem(s)\n${failures.map((failure) => `  - ${failure}\n`).join("")}`);
  process.exit(1);
}
process.stdout.write(
  `check passed: ${TIMELINE.scenes.length} scenes, ${TIMELINE.beats} beats, ${TIMELINE.durationFrames} frames, ${(TIMELINE.durationFrames / TIMELINE.tempo.fps).toFixed(1)} s. Rules 1 to 8 hold.\n`,
);
