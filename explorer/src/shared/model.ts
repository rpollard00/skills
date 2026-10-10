import { Effect, Schema } from "effect";

/** The name of a directory under `skills/` that holds a `SKILL.md`. */
export const SkillName = Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.brand("SkillName"));
export type SkillName = typeof SkillName.Type;

/** `skill:architect`, `playbook:perf-issue`, `hosted:skills/mako/references/execution.md`. */
export const NodeId = Schema.String.pipe(Schema.check(Schema.isPattern(/^(skill|playbook|hosted):.+$/u)), Schema.brand("NodeId"));
export type NodeId = typeof NodeId.Type;

/** Repo-relative POSIX path under `skills/`. No segment starts with a dot, so `..` and `.artifacts` cannot occur. */
export const DocPath = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^skills(?:\/(?!\.)[^/\\\r\n\u2028\u2029]+)+$/)),
  Schema.brand("DocPath"),
);
export type DocPath = typeof DocPath.Type;

export const Sha256 = Schema.String.pipe(Schema.check(Schema.isPattern(/^[0-9a-f]{64}$/)), Schema.brand("Sha256"));
export type Sha256 = typeof Sha256.Type;

export const RouteId = Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.brand("RouteId"));
export type RouteId = typeof RouteId.Type;

/**
 * A prefix of the hash that names one judgeable pair: the shortest prefix, of 8 characters or more,
 * that no other current pair shares.
 */
export const TicketId = Schema.String.pipe(Schema.check(Schema.isPattern(/^[0-9a-f]{8,64}$/)), Schema.brand("TicketId"));
export type TicketId = typeof TicketId.Type;

export type RelationKey = string & { readonly __brand: "RelationKey" };
export const relationKey = (pair: { readonly from: NodeId; readonly to: NodeId }): RelationKey => `${pair.from}>${pair.to}` as RelationKey;

/** Kinds that position, path, or name prefix decide. Order is stroke precedence. */
export const MechanicalKind = Schema.Literals(["route", "trigger", "applies-principle", "reads", "artifact-path"]);
export type MechanicalKind = typeof MechanicalKind.Type;

/**
 * What `npm run judge` accepts, in decision order: a reader tests the answers from first to last and gives the first that fits.
 * `none` means the text is not a reference.
 */
export const Answer = Schema.Literals(["none", "boundary", "handoff", "runs", "requires", "see-also"]);
export type Answer = typeof Answer.Type;

/** The answers that `--conditional` can go with, in decision order. A condition can guard only a reference that the source acts on. */
export const CONDITIONAL_ANSWERS: readonly Answer[] = Answer.literals.filter(
  (answer) => answer === "handoff" || answer === "runs" || answer === "requires",
);

/** Order is stroke precedence. `mentions` means "found, not yet judged". */
export const EdgeKind = Schema.Literals([
  "route", "trigger", "runs", "requires", "handoff", "applies-principle", "reads", "artifact-path", "see-also", "boundary", "mentions",
]);
export type EdgeKind = typeof EdgeKind.Type;

export const Family = Schema.Literals(["router", "principle", "skill"]);
export type Family = typeof Family.Type;

/** The client makes a link from this value, so no other scheme can pass. */
export const HttpUrl = Schema.String.pipe(Schema.check(Schema.isPattern(/^https?:\/\/\S+$/)), Schema.brand("HttpUrl"));
export type HttpUrl = typeof HttpUrl.Type;

export const Origin = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("original") }),
  Schema.Struct({
    kind: Schema.Literal("imported"),
    upstream: Schema.String,
    repository: HttpUrl,
    revision: Schema.String,
    source: Schema.String,
  }),
  Schema.Struct({ kind: Schema.Literal("unknown") }),
]);
export type Origin = typeof Origin.Type;

export const Script = Schema.Struct({
  path: DocPath,
  interpreter: Schema.String,
  /** Command lines in shell fences that start with this script. */
  uses: Schema.Int,
  /** Every line of the skill's markdown that names the script's basename. */
  invokedAt: Schema.Array(Schema.Struct({ file: DocPath, line: Schema.Int })),
});
export type Script = typeof Script.Type;

export const Tooling = Schema.Struct({
  scripts: Schema.Array(Script),
  commands: Schema.Array(Schema.Struct({ name: Schema.String, uses: Schema.Int })),
});
export type Tooling = typeof Tooling.Type;

export const SkillNode = Schema.Struct({
  kind: Schema.Literal("skill"),
  id: NodeId,
  name: SkillName,
  title: Schema.String,
  description: Schema.String,
  family: Family,
  modelInvocable: Schema.Boolean,
  origin: Origin,
  entry: DocPath,
  /** Covers every file the node owns. */
  digest: Sha256,
  tooling: Tooling,
  defects: Schema.Array(Schema.String),
});
export type SkillNode = typeof SkillNode.Type;

export const PlaybookNode = Schema.Struct({
  kind: Schema.Literal("playbook"),
  id: NodeId,
  name: Schema.String,
  title: Schema.String,
  purpose: Schema.String,
  host: NodeId,
  entry: DocPath,
  digest: Sha256,
});
export type PlaybookNode = typeof PlaybookNode.Type;

/** A file that is not a node's entry and that a different node links to. It is a target only. */
export const HostedNode = Schema.Struct({
  kind: Schema.Literal("hosted"),
  id: NodeId,
  host: NodeId,
  title: Schema.String,
  entry: DocPath,
  digest: Sha256,
});
export type HostedNode = typeof HostedNode.Type;

export const Node = Schema.Union([SkillNode, PlaybookNode, HostedNode]);
export type Node = typeof Node.Type;

export const EvidenceRule = Schema.Literals([
  "link", "backtick", "sigil", "named-skill", "bare-name", "short-principle", "artifact-path", "cue", "title-form", "short-name",
]);
export type EvidenceRule = typeof EvidenceRule.Type;

/**
 * One block that mentions the target. `line` is the line of the first mention in the block.
 * `headings` holds the text of each heading above the block, outermost first. It is empty for a block above
 * every heading and for a frontmatter description. An input without the key decodes as empty.
 * `rules` holds each rule that found the target there. `text` is the whole block with each run of white space as one space.
 */
export const Evidence = Schema.Struct({
  file: DocPath,
  line: Schema.Int,
  headings: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
  rules: Schema.NonEmptyArray(EvidenceRule),
  text: Schema.String,
});
export type Evidence = typeof Evidence.Type;

/** What the scan knows about one ordered pair. A `candidate` is a mention that the rules cannot confirm. */
export const Reference = Schema.Struct({
  from: NodeId,
  to: NodeId,
  basis: Schema.Literals(["detected", "candidate"]),
  mechanical: Schema.Array(MechanicalKind),
  evidence: Schema.NonEmptyArray(Evidence),
  /** Over the `headings` and the `text` of each evidence block. File, line, and rules are not hashed. */
  evidenceHash: Sha256,
});
export type Reference = typeof Reference.Type;

export const Route = Schema.Struct({
  id: RouteId,
  task: Schema.String,
  file: DocPath,
  line: Schema.Int,
  playbook: Schema.NullOr(NodeId),
  skills: Schema.Array(NodeId),
});
export type Route = typeof Route.Type;

/** `index` triggers come from the router's principle index. `phase` triggers come from its entry file. */
export const Trigger = Schema.Struct({
  list: Schema.Literals(["index", "phase"]),
  condition: Schema.String,
  target: NodeId,
  file: DocPath,
  line: Schema.Int,
});
export type Trigger = typeof Trigger.Type;

export const FileRecord = Schema.Struct({ path: DocPath, owner: NodeId, sha256: Sha256 });
export type FileRecord = typeof FileRecord.Type;

const shared = {
  version: Schema.Literal(1),
  /** Over every listed file's path and hash. */
  sourceDigest: Sha256,
  nodes: Schema.Array(Node),
  routes: Schema.Array(Route),
  triggers: Schema.Array(Trigger),
  files: Schema.Array(FileRecord),
};

export const Scan = Schema.Struct({ ...shared, references: Schema.Array(Reference) });
export type Scan = typeof Scan.Type;

/** A stored answer. A conditional record with an answer outside `CONDITIONAL_ANSWERS` can exist in the file, and it does not apply. */
export const Judgment = Schema.Struct({
  from: NodeId,
  to: NodeId,
  kind: Answer,
  conditional: Schema.Boolean,
  evidenceHash: Sha256,
});
export type Judgment = typeof Judgment.Type;

/** `explorer/index/judgments.json`. Written only through `npm run judge` and `npm run index -- --prune`. */
export const Judgments = Schema.Struct({ version: Schema.Literal(1), relations: Schema.Array(Judgment) });
export type Judgments = typeof Judgments.Type;

const Standing = Schema.Literals(["mechanical", "judged", "unjudged", "rejudge"]);
type Standing = typeof Standing.Type;

export const Relation = Schema.Struct({
  from: NodeId,
  to: NodeId,
  /** `kinds[0]` picks the stroke. */
  kinds: Schema.NonEmptyArray(EdgeKind),
  conditional: Schema.Boolean,
  standing: Standing,
  /** The id that the report prints and that `npm run judge` accepts for this pair now. Null when the standing is `mechanical`. */
  ticket: Schema.NullOr(TicketId),
  evidence: Schema.NonEmptyArray(Evidence),
});
export type Relation = typeof Relation.Type;

/** How the files on disk compare with the committed `scan.json`. */
export const IndexRecord = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("current") }),
  Schema.Struct({
    kind: Schema.Literal("behind"),
    added: Schema.Array(NodeId),
    changed: Schema.Array(NodeId),
    removed: Schema.Array(NodeId),
  }),
  Schema.Struct({ kind: Schema.Literal("missing") }),
]);
export type IndexRecord = typeof IndexRecord.Type;

export const ExplorerIndex = Schema.Struct({
  ...shared,
  relations: Schema.Array(Relation),
  open: Schema.Int,
  orphans: Schema.Int,
  record: IndexRecord,
});
export type ExplorerIndex = typeof ExplorerIndex.Type;

export const SkillDoc = Schema.Struct({ path: DocPath, text: Schema.String, sha256: Sha256 });
export type SkillDoc = typeof SkillDoc.Type;

export class IndexUnavailable extends Schema.TaggedError<IndexUnavailable>()(
  "IndexUnavailable",
  { reason: Schema.Literals(["unreadable", "corrupt", "unwritable"]), detail: Schema.String },
  { httpApiStatus: 503 },
) {}

export class DocNotFound extends Schema.TaggedError<DocNotFound>()(
  "DocNotFound",
  { path: Schema.String },
  { httpApiStatus: 404 },
) {}
