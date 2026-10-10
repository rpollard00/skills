import nodePath from "node:path";
import { Context, Effect, FileSystem, Layer, Option, Path, Schema, type PlatformError } from "effect";
import {
  Answer,
  CONDITIONAL_ANSWERS,
  DocNotFound,
  IndexUnavailable,
  Judgments,
  NodeId,
  Scan,
  Sha256,
  relationKey,
  type ExplorerIndex,
  type IndexRecord,
  type Judgment,
  type SkillDoc,
} from "../shared/model";
import { byCodeUnit } from "../shared/order";
import { readCorpus, readCorpusFile } from "./corpus";
import { sha256 } from "./digest";
import type { IndexState, Report } from "./report";
import { resolve, ticketsMatching, type Resolution } from "./resolve";
import { listingOf, scan } from "./scan";

/** No current pair has an id that starts with `ticket`. The text changed after the report, or the id is wrong. */
export class TicketNotCurrent extends Schema.TaggedError<TicketNotCurrent>()("TicketNotCurrent", {
  ticket: Schema.String,
}) {}

/** More than one current pair has an id that starts with `ticket`. `candidates` holds their full ids. */
export class TicketAmbiguous extends Schema.TaggedError<TicketAmbiguous>()("TicketAmbiguous", {
  ticket: Schema.String,
  candidates: Schema.Array(Schema.Struct({ key: Sha256, from: NodeId, to: NodeId })),
}) {}

/** A condition cannot guard this answer. `allowed` lists the answers that it can guard. */
export class ConditionalNotAllowed extends Schema.TaggedError<ConditionalNotAllowed>()("ConditionalNotAllowed", {
  kind: Answer,
  allowed: Schema.Array(Answer),
}) {}

/** A different command holds the lock on `judgments.json`, or a command that stopped left the lock file. */
export class JudgmentsLocked extends Schema.TaggedError<JudgmentsLocked>()("JudgmentsLocked", {
  lockFile: Schema.String,
}) {}

export const EMPTY_JUDGMENTS: Judgments = { version: 1, relations: [] };

const LOCK_RETRY_MILLIS = 50;
const LOCK_RETRIES = 200;

const canonical = (document: { readonly [key: string]: unknown }): string => {
  const fields = Object.entries(document).map(([key, value]) =>
    Array.isArray(value) && value.length > 0
      ? `  ${JSON.stringify(key)}: [\n${value.map((item) => `    ${JSON.stringify(item)}`).join(",\n")}\n  ]`
      : `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`,
  );
  return `{\n${fields.join(",\n")}\n}\n`;
};

const encodeScan = Schema.encodeSync(Scan);
const encodeJudgments = Schema.encodeSync(Judgments);
const decodeScan = Schema.decodeUnknownOption(Schema.fromJsonString(Scan));
const decodeJudgments = Schema.decodeUnknownOption(Schema.fromJsonString(Judgments));

export const canonicalScan = (scanned: Scan): string => canonical(encodeScan(scanned));

export const canonicalJudgments = (judgments: Judgments): string =>
  canonical(
    encodeJudgments({
      version: 1,
      relations: [...judgments.relations].sort((left, right) => byCodeUnit(left.from, right.from) || byCodeUnit(left.to, right.to)),
    }),
  );

/** An old `scan.json` that does not decode counts as missing: `npm run index` writes it again. */
const recordOf = (committed: string | null, fresh: Scan, bytes: string): IndexRecord => {
  if (committed === bytes) return { kind: "current" };
  const previous = committed === null ? Option.none() : decodeScan(committed);
  if (Option.isNone(previous)) return { kind: "missing" };
  const before = new Map(previous.value.nodes.map((node) => [node.id, node.digest]));
  const after = new Map(fresh.nodes.map((node) => [node.id, node.digest]));
  return {
    kind: "behind",
    added: fresh.nodes.filter((node) => !before.has(node.id)).map((node) => node.id),
    changed: fresh.nodes.filter((node) => before.has(node.id) && before.get(node.id) !== node.digest).map((node) => node.id),
    removed: previous.value.nodes.filter((node) => !after.has(node.id)).map((node) => node.id),
  };
};

const stateOf = (fresh: Scan, resolution: Resolution, record: IndexRecord): IndexState => ({
  counts: {
    skills: fresh.nodes.filter((node) => node.kind === "skill").length,
    playbooks: fresh.nodes.filter((node) => node.kind === "playbook").length,
    hosted: fresh.nodes.filter((node) => node.kind === "hosted").length,
    relations: resolution.relations.length,
  },
  tickets: resolution.tickets,
  judged: resolution.judged,
  orphans: resolution.orphans,
  record,
});

export class SkillIndex extends Context.Service<SkillIndex, {
  /** What is on disk now, joined with the judgments and compared with the committed record. */
  readonly live: Effect.Effect<ExplorerIndex, IndexUnavailable>;
  /** Rescans and writes `scan.json`. With `prune` it also removes orphaned judgments. */
  readonly refresh: (options: { readonly prune: boolean }) => Effect.Effect<Report, IndexUnavailable | JudgmentsLocked>;
  /**
   * Records one answer. `ticket` is the start of the id of one current pair, 8 characters or more.
   * An answer to an answered ticket replaces the record.
   */
  readonly judge: (verdict: {
    readonly ticket: string;
    readonly kind: Answer;
    readonly conditional: boolean;
  }) => Effect.Effect<Report, IndexUnavailable | TicketNotCurrent | TicketAmbiguous | ConditionalNotAllowed | JudgmentsLocked>;
  readonly check: Effect.Effect<Report, IndexUnavailable>;
  /** The text of a file, only for a path that the live scan lists and that holds UTF-8 text. */
  readonly document: (path: string) => Effect.Effect<SkillDoc, DocNotFound>;
}>()("explorer/SkillIndex") {
  /** `repoRoot` holds `skills/`. The index files go to `explorer/index/` below it. */
  static readonly layer = (repoRoot: string): Layer.Layer<SkillIndex, never, FileSystem.FileSystem | Path.Path> =>
    Layer.effect(
      SkillIndex,
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const indexDirectory = path.join(repoRoot, "explorer", "index");
        const scanFile = path.join(indexDirectory, "scan.json");
        const judgmentsFile = path.join(indexDirectory, "judgments.json");
        const lockFile = `${judgmentsFile}.lock`;
        const withFiles = <A, E>(effect: Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>): Effect.Effect<A, E> =>
          effect.pipe(Effect.provideService(FileSystem.FileSystem, fs), Effect.provideService(Path.Path, path));

        const unavailable = (reason: IndexUnavailable["reason"], action: string, file: string) => (error: PlatformError.PlatformError) =>
          new IndexUnavailable({ reason, detail: `Cannot ${action} index/${path.basename(file)}: ${error.message}` });

        /** Only "not found" means absent. A file that exists and cannot be read must not look empty to a writer. */
        const readIfPresent = (file: string): Effect.Effect<string | null, IndexUnavailable> =>
          fs.readFileString(file).pipe(
            Effect.catch((error) => (error.reason._tag === "NotFound" ? Effect.succeed(null) : Effect.fail(unavailable("unreadable", "read", file)(error)))),
          );

        /** A crash leaves the old file or the new file, and never a part of one. */
        const writeAtomic = (file: string, text: string): Effect.Effect<void, IndexUnavailable> => {
          const temporary = `${file}.${crypto.randomUUID()}.tmp`;
          return fs.makeDirectory(indexDirectory, { recursive: true }).pipe(
            Effect.andThen(fs.writeFileString(temporary, text)),
            Effect.andThen(fs.rename(temporary, file)),
            Effect.tapError(() => Effect.ignore(fs.remove(temporary, { force: true }))),
            Effect.mapError(unavailable("unwritable", "write", file)),
          );
        };

        const takeLock = (retriesLeft: number): Effect.Effect<void, IndexUnavailable | JudgmentsLocked> =>
          fs.makeDirectory(indexDirectory, { recursive: true }).pipe(
            Effect.andThen(fs.writeFileString(lockFile, `${process.pid}\n`, { flag: "wx" })),
            Effect.catch((error) =>
              error.reason._tag !== "AlreadyExists" ? Effect.fail(unavailable("unwritable", "lock", judgmentsFile)(error))
              : retriesLeft === 0 ? Effect.fail(new JudgmentsLocked({ lockFile: "index/judgments.json.lock" }))
              : Effect.sleep(LOCK_RETRY_MILLIS).pipe(Effect.andThen(takeLock(retriesLeft - 1))),
            ),
          );

        /** One writer at a time reads `judgments.json`, changes it, and writes it. */
        const whileHoldingTheLock = <A, E>(readModifyWrite: Effect.Effect<A, E>): Effect.Effect<A, E | IndexUnavailable | JudgmentsLocked> =>
          Effect.acquireUseRelease(
            takeLock(LOCK_RETRIES),
            () => readModifyWrite,
            () => Effect.ignore(fs.remove(lockFile, { force: true })),
          );

        const readJudgments = Effect.gen(function* () {
          const text = yield* readIfPresent(judgmentsFile);
          if (text === null) return EMPTY_JUDGMENTS;
          const decoded = decodeJudgments(text);
          if (Option.isSome(decoded)) return decoded.value;
          return yield* new IndexUnavailable({ reason: "corrupt", detail: "index/judgments.json does not match the judgment format. The file is not changed." });
        });

        const snapshot = Effect.gen(function* () {
          const fresh = scan(yield* withFiles(readCorpus(repoRoot)));
          const judgments = yield* readJudgments;
          const bytes = canonicalScan(fresh);
          const committed = yield* readIfPresent(scanFile);
          return { fresh, judgments, bytes, committed, record: recordOf(committed, fresh, bytes), resolution: resolve(fresh, judgments) };
        });

        const live = Effect.map(snapshot, ({ fresh, record, resolution }): ExplorerIndex => {
          const { references: _references, ...shared } = fresh;
          return { ...shared, relations: resolution.relations, open: resolution.tickets.length, orphans: resolution.orphans.length, record };
        });

        const rescan = (options: { readonly prune: boolean }) =>
          Effect.gen(function* () {
            const { fresh, judgments, bytes, committed, record, resolution } = yield* snapshot;
            const pruned = options.prune ? resolution.orphans : [];
            const kept: Judgments = { version: 1, relations: judgments.relations.filter((judgment) => !pruned.includes(judgment)) };
            if (pruned.length > 0) yield* writeAtomic(judgmentsFile, canonicalJudgments(kept));
            if (committed !== bytes) yield* writeAtomic(scanFile, bytes);
            return {
              kind: "index",
              state: stateOf(fresh, resolve(fresh, kept), { kind: "current" }),
              changes:
                record.kind === "behind" ? record
                : { added: record.kind === "missing" ? fresh.nodes.map((node) => node.id) : [], changed: [], removed: [] },
              written: committed !== bytes,
              digest: fresh.sourceDigest,
              pruned,
            } satisfies Report;
          });

        const refresh = (options: { readonly prune: boolean }) => (options.prune ? whileHoldingTheLock(rescan(options)) : rescan(options));

        const record = (verdict: { readonly ticket: string; readonly kind: Answer; readonly conditional: boolean }) =>
          Effect.gen(function* () {
            const { fresh, judgments, record: indexRecord, resolution } = yield* snapshot;
            const [ticket, ...others] = ticketsMatching(resolution, verdict.ticket);
            if (ticket === undefined) return yield* new TicketNotCurrent({ ticket: verdict.ticket });
            if (others.length > 0) {
              return yield* new TicketAmbiguous({
                ticket: verdict.ticket,
                candidates: [ticket, ...others].map((candidate) => ({ key: candidate.key, from: candidate.from, to: candidate.to })),
              });
            }
            const judgment: Judgment = {
              from: ticket.from,
              to: ticket.to,
              kind: verdict.kind,
              conditional: verdict.conditional,
              evidenceHash: ticket.evidenceHash,
            };
            const next: Judgments = {
              version: 1,
              relations: [...judgments.relations.filter((existing) => relationKey(existing) !== relationKey(judgment)), judgment],
            };
            yield* writeAtomic(judgmentsFile, canonicalJudgments(next));
            return {
              kind: "judge",
              state: stateOf(fresh, resolve(fresh, next), indexRecord),
              ticket: ticket.id,
              judgment,
              replaced: ticket.status.kind === "judged" ? ticket.status.answer : null,
            } satisfies Report;
          });

        const judge = (verdict: { readonly ticket: string; readonly kind: Answer; readonly conditional: boolean }) =>
          verdict.conditional && !CONDITIONAL_ANSWERS.includes(verdict.kind)
            ? Effect.fail(new ConditionalNotAllowed({ kind: verdict.kind, allowed: CONDITIONAL_ANSWERS }))
            : whileHoldingTheLock(record(verdict));

        const check = Effect.map(
          snapshot,
          ({ fresh, record: indexRecord, resolution }): Report => ({ kind: "check", state: stateOf(fresh, resolution, indexRecord) }),
        );

        /** Reads the entry file of the skill and the one file. A scan of all of `skills/` is not necessary to know that a path is listed. */
        const document = (requested: string) =>
          Effect.gen(function* () {
            const listing = listingOf(requested);
            const entry = listing === null ? null : yield* withFiles(readCorpusFile(repoRoot, listing.entry));
            const file = listing === null || entry === null ? null : yield* withFiles(readCorpusFile(repoRoot, listing.path));
            if (listing === null || file === null || file.text === null) return yield* new DocNotFound({ path: requested });
            return { path: listing.path, text: file.text, sha256: sha256(file.bytes) } satisfies SkillDoc;
          });

        return SkillIndex.of({ live, refresh, judge, check, document });
      }),
    );

  /** The repository that holds this file. The process working directory plays no part. */
  static readonly layerRepository = SkillIndex.layer(nodePath.resolve(import.meta.dirname, "..", "..", ".."));
}
