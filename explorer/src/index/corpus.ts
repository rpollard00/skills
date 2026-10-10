import { Effect, FileSystem, Path, type PlatformError } from "effect";
import { IndexUnavailable } from "../shared/model";
import { byCodeUnit } from "../shared/order";

export interface CorpusFile {
  /** POSIX path relative to the repository root. */
  readonly path: string;
  readonly bytes: Uint8Array;
  /** Null when the bytes are not UTF-8 text. Each line ends with LF, also when the file has CRLF. */
  readonly text: string | null;
  readonly executable: boolean;
  /** The error tag for an entry that exists and cannot be read. Such an entry has no bytes. */
  readonly unreadable: string | null;
}

export interface Corpus {
  readonly files: readonly CorpusFile[];
  /** Text of `docs/upstream-imports.json`, or null when the file is absent. */
  readonly imports: string | null;
}

export const corpusFile = (input: { readonly path: string; readonly bytes: Uint8Array; readonly executable: boolean }): CorpusFile => {
  let text: string | null;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(input.bytes).replaceAll("\r\n", "\n");
  } catch {
    text = null;
  }
  return { ...input, text, unreadable: null };
};

const unreadableEntry = (path: string, error: PlatformError.PlatformError): CorpusFile => ({
  path,
  bytes: new Uint8Array(),
  text: null,
  executable: false,
  unreadable: error.reason._tag,
});

/** `.artifacts` holds licensed material. Every dot entry is private in the same way. */
const isPrivateEntry = (name: string): boolean => name.startsWith(".");

const isVendoredOrCacheFolder = (name: string): boolean => name === "node_modules" || name === "__pycache__";

const isWalked = (name: string): boolean => !isPrivateEntry(name) && !isVendoredOrCacheFolder(name);

const EXECUTE_BITS = 0o111;

const hasVanished = (error: PlatformError.PlatformError): boolean => error.reason._tag === "NotFound";

const fileReader = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const isLink = (absolute: string): Effect.Effect<boolean> =>
    fs.readLink(absolute).pipe(Effect.as(true), Effect.orElseSucceed(() => false));

  /** An entry that vanished after the listing gives nothing. An entry that cannot be read gives one marked record. */
  const readEntry = (repoRoot: string, relative: string): Effect.Effect<CorpusFile[]> =>
    Effect.gen(function* () {
      const absolute = path.join(repoRoot, relative);
      if (yield* isLink(absolute)) return [];
      const info = yield* fs.stat(absolute);
      if (info.type === "Directory") return yield* walk(repoRoot, relative);
      if (info.type !== "File") return [];
      return [corpusFile({ path: relative, bytes: yield* fs.readFile(absolute), executable: (info.mode & EXECUTE_BITS) !== 0 })];
    }).pipe(Effect.catch((error) => Effect.succeed(hasVanished(error) ? [] : [unreadableEntry(relative, error)])));

  const walk = (repoRoot: string, relative: string): Effect.Effect<CorpusFile[], PlatformError.PlatformError> =>
    fs.readDirectory(path.join(repoRoot, relative)).pipe(
      Effect.flatMap((names) => Effect.forEach(names.filter(isWalked), (name) => readEntry(repoRoot, `${relative}/${name}`), { concurrency: 16 })),
      Effect.map((found) => found.flat()),
    );

  /** The same rules as the walk, for one path: no skipped name and no symbolic link on the way. */
  const readOne = (repoRoot: string, relative: string): Effect.Effect<CorpusFile | null> =>
    Effect.gen(function* () {
      const names = relative.split("/");
      if (names[0] !== "skills" || !names.slice(1).every((name) => name !== "" && isWalked(name))) return null;
      for (let depth = 2; depth <= names.length; depth += 1) {
        if (yield* isLink(path.join(repoRoot, ...names.slice(0, depth)))) return null;
      }
      const info = yield* fs.stat(path.join(repoRoot, relative)).pipe(Effect.orElseSucceed(() => null));
      return info?.type === "File" ? ((yield* readEntry(repoRoot, relative))[0] ?? null) : null;
    });

  return { fs, path, walk, readOne };
});

/** Symbolic links are not followed. */
export const readCorpus = Effect.fn("readCorpus")(function* (repoRoot: string) {
  const { fs, path, walk } = yield* fileReader;
  const files = yield* walk(repoRoot, "skills").pipe(
    Effect.mapError((error) => new IndexUnavailable({ reason: "unreadable", detail: `Cannot read skills/: ${error.message}` })),
  );
  const imports = yield* fs
    .readFileString(path.join(repoRoot, "docs", "upstream-imports.json"))
    .pipe(Effect.orElseSucceed(() => null));
  return { files: files.sort((left, right) => byCodeUnit(left.path, right.path)), imports } satisfies Corpus;
});

/** One file by path, or null when the walk of `skills/` does not reach a regular file at that path. */
export const readCorpusFile = Effect.fn("readCorpusFile")(function* (repoRoot: string, relative: string) {
  const { readOne } = yield* fileReader;
  return yield* readOne(repoRoot, relative);
});
