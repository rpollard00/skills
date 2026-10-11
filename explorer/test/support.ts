import { readFileSync } from "node:fs";
import nodePath from "node:path";
import { Effect, FileSystem, Schema, type Console } from "effect";
import { corpusFile, type Corpus } from "../src/index/corpus";
import { SkillIndex } from "../src/index/skill-index";
import { ExplorerIndex, type Reference, type Scan } from "../src/shared/model";
import { SNAPSHOT_DOCS } from "./fixtures/snapshot-docs";

export const FIXTURE_REPO = nodePath.resolve(import.meta.dirname, "fixtures", "repo");
export const LIVE_REPO = nodePath.resolve(import.meta.dirname, "..", "..");

/**
 * The index of `LIVE_REPO` as it was at the last refresh: `fixtures/refresh-snapshot.ts` writes the file.
 * A test that names a skill, a route, a file, or a count reads this and not the live index, so an edit of the skills cannot fail it.
 * A test on the live index states only a rule that holds for each content of the skills.
 */
export const snapshotIndex: ExplorerIndex = Schema.decodeUnknownSync(ExplorerIndex)(JSON.parse(readFileSync(nodePath.join(import.meta.dirname, "fixtures", "live-index.json"), "utf8")));

/** A file of the skills that the reader tests render, as it was at the last refresh. */
export const snapshotDoc = (name: keyof typeof SNAPSHOT_DOCS): { readonly path: string; readonly text: string } => ({
  path: SNAPSHOT_DOCS[name],
  text: readFileSync(nodePath.join(import.meta.dirname, "fixtures", "docs", name), "utf8"),
});

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
