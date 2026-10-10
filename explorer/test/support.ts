import nodePath from "node:path";
import { Effect, FileSystem, type Console } from "effect";
import { corpusFile, type Corpus } from "../src/index/corpus";
import { SkillIndex } from "../src/index/skill-index";
import type { Reference, Scan } from "../src/shared/model";

export const FIXTURE_REPO = nodePath.resolve(import.meta.dirname, "fixtures", "repo");
export const LIVE_REPO = nodePath.resolve(import.meta.dirname, "..", "..");

export const skill = (name: string, body = ""): string => `---\nname: ${name}\ndescription: The ${name} fixture.\n---\n\n# ${name}\n\n${body}\n`;

/** A corpus from a map of path below `skills/` to text. */
export const corpus = (files: { readonly [path: string]: string }, imports: string | null = null): Corpus => ({
  files: Object.entries(files).map(([path, text]) =>
    corpusFile({ path: `skills/${path}`, bytes: new TextEncoder().encode(text), executable: false }),
  ),
  imports,
});

export const pairs = (scanned: Scan): string[] => scanned.references.map((reference) => `${reference.from}>${reference.to}`);

export const referenceOf = (scanned: Scan, from: string, to: string): Reference | undefined =>
  scanned.references.find((reference) => reference.from === from && reference.to === to);

export const temporaryRepo = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "skill-explorer-" });
  yield* fs.copy(FIXTURE_REPO, root, { overwrite: true });
  return root;
});

export const indexAt = (root: string) =>
  Effect.gen(function* () {
    return yield* SkillIndex;
  }).pipe(Effect.provide(SkillIndex.layer(root)));

export const snapshotOf = (directory: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const names = (yield* fs.readDirectory(directory, { recursive: true })).sort();
    const entries = yield* Effect.forEach(names, (name) =>
      fs.readFileString(nodePath.join(directory, name)).pipe(
        Effect.map((text) => [name, text] as const),
        Effect.orElseSucceed(() => [name, "<directory>"] as const),
      ),
    );
    return Object.fromEntries(entries);
  });

/** A console that keeps what a command prints, so a test can read it and the test output stays clean. */
export const captureInto = (lines: string[]): Console.Console => ({
  ...globalThis.console,
  log: (...parts: readonly unknown[]) => void lines.push(parts.join(" ")),
  error: (...parts: readonly unknown[]) => void lines.push(parts.join(" ")),
});
