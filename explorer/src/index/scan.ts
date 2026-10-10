import { Array as Arr, Option, Schema } from "effect";
import { isScalar, parseDocument } from "yaml";
import { blocks, collapseWhitespace, lineOffset, links, plainText, resolveLink, slugger, splitFrontmatter, type Block } from "../shared/markdown";
import {
  DocPath,
  HttpUrl,
  MechanicalKind,
  NodeId,
  RouteId,
  SkillName,
  type Evidence,
  type EvidenceRule,
  type Family,
  type FileRecord,
  type Node,
  type Origin,
  type Reference,
  type Route,
  type Scan,
  type Sha256,
  type Trigger,
} from "../shared/model";
import { byCodeUnit, sortedBy } from "../shared/order";
import type { Corpus, CorpusFile } from "./corpus";
import { escapeForRegExp, lexicon, nameHits, PRINCIPLE_PREFIX } from "./detect";
import { sha256 } from "./digest";
import { toolingOf } from "./tooling";

const ENTRY = "SKILL.md";
const PLAYBOOK_FILE = /^playbooks\/([^/]+)\.md$/;
const ROUTE_HEADING = "Playbooks";
const TRIGGER_HEADING = "Phase triggers";
const PRINCIPLE_INDEX = "references/principles.md";
const VALID_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_REPOSITORY = "The upstream repository in docs/upstream-imports.json is not an http or https URL.";

const toDocPath = Schema.decodeUnknownOption(DocPath);
const toHttpUrl = Schema.decodeUnknownOption(HttpUrl);
const toNodeId = Schema.decodeUnknownSync(NodeId);
const toSkillName = Schema.decodeUnknownSync(SkillName);
const toRouteId = Schema.decodeUnknownSync(RouteId);
const isText = Schema.is(Schema.String);
const isMapping = Schema.is(Schema.Record(Schema.String, Schema.Unknown));

const Imports = Schema.fromJsonString(
  Schema.Struct({
    upstreams: Schema.Record(Schema.String, Schema.Struct({ repository: Schema.String, revision: Schema.String })),
    files: Schema.Array(Schema.Struct({ source: Schema.String, destination: Schema.String, upstream: Schema.String })),
  }),
);
const readImports = Schema.decodeUnknownOption(Imports);

interface OwnedFile {
  readonly path: DocPath;
  readonly file: CorpusFile;
  readonly skill: SkillName;
  readonly pathInSkill: string;
  readonly owner: NodeId;
  readonly isEntry: boolean;
  readonly sha256: Sha256;
}

interface Unit {
  readonly kind: "description" | "heading" | "paragraph" | "item";
  readonly line: number;
  readonly text: string;
  /** The text of each heading above the unit, outermost first. */
  readonly headingPath: readonly string[];
}

interface Frontmatter {
  readonly data: { readonly [key: string]: unknown } | null;
  readonly problem: string | null;
  readonly description: { readonly text: string; readonly line: number } | null;
}

interface Doc {
  readonly owned: OwnedFile;
  readonly meta: Frontmatter;
  readonly blocks: readonly Block[];
  readonly units: readonly Unit[];
}

interface Occurrence {
  readonly from: NodeId;
  readonly to: NodeId;
  readonly basis: "detected" | "candidate";
  readonly mechanical: MechanicalKind | null;
  readonly rule: EvidenceRule;
  readonly file: DocPath;
  readonly line: number;
  readonly unit: Unit;
}

const skillId = (name: string): NodeId => toNodeId(`skill:${name}`);
const hostedId = (path: DocPath): NodeId => toNodeId(`hosted:${path}`);

/** `skills/<directory>/<path in skill>`, or null for a path that is not below a directory of `skills/`. */
const placeOf = (path: string): { readonly path: DocPath; readonly directory: string; readonly pathInSkill: string } | null => {
  const docPath = Option.getOrUndefined(toDocPath(path));
  const [, directory, ...below] = docPath?.split("/") ?? [];
  return docPath === undefined || directory === undefined || below.length === 0 ? null : { path: docPath, directory, pathInSkill: below.join("/") };
};

/** A path is listed only below a directory of `skills/` that holds the entry file. Null for a path that no skill can own. */
export const listingOf = (path: string): { readonly path: DocPath; readonly entry: string } | null => {
  const place = placeOf(path);
  return place === null ? null : { path: place.path, entry: `skills/${place.directory}/${ENTRY}` };
};

const locate = (corpus: Corpus): OwnedFile[] => {
  const inside = corpus.files.flatMap((file) => {
    const place = placeOf(file.path);
    return place === null ? [] : [{ ...place, file }];
  });
  const skills = new Set(inside.filter((entry) => entry.pathInSkill === ENTRY).map((entry) => entry.directory));
  const playbookHosts = new Map<string, Set<string>>();
  for (const entry of inside) {
    const playbook = PLAYBOOK_FILE.exec(entry.pathInSkill)?.[1];
    if (playbook === undefined || !skills.has(entry.directory)) continue;
    playbookHosts.set(playbook, (playbookHosts.get(playbook) ?? new Set()).add(entry.directory));
  }

  return inside
    .filter((entry) => skills.has(entry.directory))
    .map((entry) => {
      const playbook = PLAYBOOK_FILE.exec(entry.pathInSkill)?.[1];
      const isShared = playbook !== undefined && (playbookHosts.get(playbook)?.size ?? 0) > 1;
      return {
        path: entry.path,
        file: entry.file,
        skill: toSkillName(entry.directory),
        pathInSkill: entry.pathInSkill,
        owner:
          playbook === undefined ? skillId(entry.directory) : toNodeId(`playbook:${isShared ? `${entry.directory}/` : ""}${playbook}`),
        isEntry: playbook !== undefined || entry.pathInSkill === ENTRY,
        sha256: sha256(entry.file.bytes),
      };
    });
};

/** A document can parse with no error and still fail here: an unquoted `*.ts` is an alias with no anchor. */
const yamlValueOf = (
  document: ReturnType<typeof parseDocument>,
): { readonly kind: "value"; readonly value: unknown } | { readonly kind: "unresolved"; readonly message: string } => {
  try {
    return { kind: "value", value: document.toJS() };
  } catch (error) {
    return { kind: "unresolved", message: (error instanceof Error ? error.message : String(error)).split("\n", 1)[0] ?? "" };
  }
};

const readFrontmatter = (yaml: string | null): Frontmatter => {
  const invalid = (problem: string): Frontmatter => ({ data: null, problem, description: null });
  if (yaml === null) return invalid("The file has no frontmatter.");
  const document = parseDocument(yaml);
  const error = document.errors[0];
  if (error !== undefined) return invalid(`The frontmatter is not valid YAML: ${error.message.split("\n", 1)[0] ?? ""}`);
  const parsed = yamlValueOf(document);
  if (parsed.kind === "unresolved") return invalid(`The frontmatter is not valid YAML: ${parsed.message}`);
  const data = parsed.value;
  if (!isMapping(data)) return invalid("The frontmatter is not a mapping.");
  const node = document.get("description", true);
  const start = isScalar(node) ? node.range?.[0] : undefined;
  const text = data["description"];
  return {
    data,
    problem: null,
    description: isText(text) && text.trim() !== "" ? { text, line: 2 + lineOffset(yaml, start ?? 0) } : null,
  };
};

const readDoc = (owned: OwnedFile): Doc | null => {
  if (owned.file.text === null || !owned.pathInSkill.endsWith(".md")) return null;
  const split = splitFrontmatter(owned.file.text);
  const meta = readFrontmatter(split.frontmatter);
  const body = blocks(split.body, split.bodyLine);
  const units: Unit[] = meta.description === null ? [] : [{ kind: "description", ...meta.description, headingPath: [] }];
  const above: { readonly depth: number; readonly text: string }[] = [];
  for (const block of body) {
    if (block.kind === "fence") continue;
    if (block.kind === "heading") {
      while ((above.at(-1)?.depth ?? 0) >= block.depth) above.pop();
    }
    units.push({ kind: block.kind, line: block.line, text: block.text, headingPath: above.map((heading) => heading.text) });
    if (block.kind === "heading") above.push({ depth: block.depth, text: collapseWhitespace(plainText(block.text)) });
  }
  return { owned, meta, blocks: body, units };
};

/**
 * One line for each block: the JSON list of its headings and then its text. The lines are sorted and joined with a line feed.
 * A test pins this format. A change here makes every stored answer stale.
 */
const evidenceHashOf = (evidence: readonly Evidence[]): Sha256 =>
  sha256(
    evidence
      .map((block) => JSON.stringify([...block.headings, block.text]))
      .sort(byCodeUnit)
      .join("\n"),
  );

const digestOf = (files: readonly OwnedFile[]): Sha256 =>
  sha256(sortedBy(files, (file) => file.path).map((file) => `${file.path} ${file.sha256}\n`).join(""));

const firstHeading = (doc: Doc | undefined, depth?: number): string | undefined => {
  const heading = doc?.blocks.find((block) => block.kind === "heading" && (depth === undefined || block.depth === depth));
  return heading?.kind === "heading" ? plainText(heading.text) : undefined;
};

const purposeOf = (doc: Doc | undefined): string => {
  const opening = doc?.blocks.find((block) => block.kind === "paragraph");
  if (opening?.kind !== "paragraph") return "";
  const lead = /^\*\*(.+?)\*\*/.exec(opening.text)?.[1];
  return plainText(lead ?? /^.*?[.!?](?=\s|$)/.exec(opening.text)?.[0] ?? opening.text);
};

const originOf = (skill: SkillName, imports: Option.Option<typeof Imports.Type>): { readonly origin: Origin; readonly defect: string | null } => {
  if (Option.isNone(imports)) return { origin: { kind: "unknown" }, defect: null };
  const prefix = `skills/${skill}/`;
  const mine = sortedBy(
    imports.value.files.filter((file) => file.destination.startsWith(prefix)),
    (file) => file.destination,
  );
  const lead = mine.find((file) => file.destination === `${prefix}${ENTRY}`) ?? mine[0];
  const upstream = lead === undefined ? undefined : imports.value.upstreams[lead.upstream];
  if (lead === undefined || upstream === undefined) return { origin: { kind: "original" }, defect: null };
  const repository = toHttpUrl(upstream.repository);
  if (Option.isNone(repository)) return { origin: { kind: "unknown" }, defect: UNSAFE_REPOSITORY };
  return {
    origin: { kind: "imported", upstream: lead.upstream, repository: repository.value, revision: upstream.revision, source: lead.source },
    defect: null,
  };
};

const defectsOf = (entryFile: OwnedFile, entry: Doc | undefined, directory: readonly OwnedFile[]): string[] => {
  const defects = directory.flatMap((file) =>
    file.file.unreadable === null ? [] : [`\`${file.pathInSkill}\` cannot be read (${file.file.unreadable}).`],
  );
  if (!VALID_NAME.test(entryFile.skill)) defects.push("The directory name is not lowercase words joined by hyphens.");
  if (entry === undefined) return entryFile.file.unreadable === null ? [...defects, `${ENTRY} is not UTF-8 text.`] : defects;
  if (entry.meta.problem !== null) return [...defects, entry.meta.problem];
  const name = entry.meta.data?.["name"];
  if (!isText(name)) defects.push("The frontmatter has no `name`.");
  else if (name !== entryFile.skill) defects.push(`The frontmatter name \`${name}\` is not the directory name.`);
  if (entry.meta.description === null) defects.push("The frontmatter has no `description`.");
  return defects;
};

const kindOrder = (kind: MechanicalKind): number => MechanicalKind.literals.indexOf(kind);

/** Pure and total. Identical corpora give identical output, whatever the order of their files. */
export const scan = (corpus: Corpus): Scan => {
  const owned = sortedBy(locate(corpus), (file) => file.path);
  const byPath = new Map<string, OwnedFile>(owned.map((file) => [file.path, file]));
  const docs = owned.flatMap((file) => readDoc(file) ?? []);
  const docByPath = new Map(docs.map((doc) => [doc.owned.path, doc]));
  const imports = corpus.imports === null ? Option.none() : readImports(corpus.imports);

  const skillEntries = owned.filter((file) => file.pathInSkill === ENTRY);
  const playbookFiles = owned.filter((file) => file.isEntry && file.pathInSkill !== ENTRY);
  const routers = new Set(playbookFiles.map((file) => file.skill));
  const familyOf = (skill: SkillName): Family =>
    routers.has(skill) ? "router" : skill.startsWith(PRINCIPLE_PREFIX) ? "principle" : "skill";
  const principles = new Set(skillEntries.filter((file) => familyOf(file.skill) === "principle").map((file) => file.owner));
  const playbookName = (file: OwnedFile): string => PLAYBOOK_FILE.exec(file.pathInSkill)?.[1] ?? file.pathInSkill;

  const words = lexicon({
    skills: skillEntries.map((file) => ({ name: file.skill, id: file.owner })),
    playbooks: playbookFiles.map((file) => ({ name: playbookName(file), id: file.owner })),
  });

  const linkTarget = (doc: Doc, href: string): { readonly to: NodeId; readonly hosted: OwnedFile | null } | null => {
    const resolved = resolveLink({ from: doc.owned.path, href });
    if (resolved.kind !== "file") return null;
    const target = byPath.get(resolved.path) ?? byPath.get(`${resolved.path}/${ENTRY}`);
    if (target === undefined || target.owner === doc.owned.owner) return null;
    return target.isEntry ? { to: target.owner, hosted: null } : { to: hostedId(target.path), hosted: target };
  };

  const occurrences: Occurrence[] = [];
  const hosted = new Map<NodeId, OwnedFile>();
  const routes: Route[] = [];
  const triggers: Trigger[] = [];
  const routeSlug = slugger();

  for (const doc of docs) {
    const from = doc.owned.owner;
    const home = skillId(doc.owned.skill);
    const isRouterEntry = routers.has(doc.owned.skill) && doc.owned.pathInSkill === ENTRY;
    const isPrincipleIndex = routers.has(doc.owned.skill) && doc.owned.pathInSkill === PRINCIPLE_INDEX;

    for (const unit of doc.units) {
      const isBullet = unit.kind === "item";
      const nearestHeading = unit.headingPath.at(-1) ?? "";
      const role =
        isBullet && isRouterEntry && nearestHeading === ROUTE_HEADING ? "route"
        : isBullet && ((isRouterEntry && nearestHeading === TRIGGER_HEADING) || isPrincipleIndex) ? "trigger"
        : null;
      const colon = unit.text.indexOf(": ");

      const hits = [
        ...links(unit.text).flatMap((link) => {
          const target = linkTarget(doc, link.href);
          return target === null ? [] : [{ ...target, rule: "link" as const, at: link.start, basis: "detected" as const }];
        }),
        ...nameHits(unit.text, words, home).map((hit) => ({ ...hit, hosted: null })),
      ]
        .filter((hit) => hit.to !== from)
        .sort((left, right) => left.at - right.at || byCodeUnit(left.rule, right.rule));

      const triggerHit = role === "trigger" ? hits.find((hit) => hit.basis === "detected" && hit.to.startsWith("skill:") && hit.at > colon) : undefined;

      for (const hit of hits) {
        if (hit.hosted !== null) hosted.set(hit.to, hit.hosted);
        const mechanical: MechanicalKind | null =
          hit.basis === "candidate" ? null
          : hit.hosted !== null ? "reads"
          : role === "route" ? "route"
          : hit === triggerHit ? "trigger"
          : hit.rule === "artifact-path" ? "artifact-path"
          : principles.has(hit.to) ? "applies-principle"
          : null;
        occurrences.push({
          from,
          to: hit.to,
          basis: hit.basis,
          mechanical,
          rule: hit.rule,
          file: doc.owned.path,
          line: unit.line + (unit.kind === "description" ? 0 : lineOffset(unit.text, hit.at)),
          unit,
        });
      }

      const named = hits.filter((hit) => hit.basis === "detected" && hit.hosted === null);
      const label = plainText(colon === -1 ? unit.text : unit.text.slice(0, colon));
      if (role === "route" && named.length > 0) {
        const target = collapseWhitespace(plainText(colon === -1 ? "" : unit.text.slice(colon + 2))).toLowerCase();
        const unlinked = playbookFiles.find((file) => new RegExp(`^${escapeForRegExp(playbookName(file).replaceAll("-", " "))}\\b`).test(target));
        routes.push({
          id: toRouteId(routeSlug(label) || "route"),
          task: label,
          file: doc.owned.path,
          line: unit.line,
          playbook: named.find((hit) => hit.to.startsWith("playbook:"))?.to ?? unlinked?.owner ?? null,
          skills: [...new Set(named.filter((hit) => hit.to.startsWith("skill:")).map((hit) => hit.to))],
        });
      }
      if (triggerHit !== undefined) {
        triggers.push({ list: isPrincipleIndex ? "index" : "phase", condition: label, target: triggerHit.to, file: doc.owned.path, line: unit.line });
      }
    }
  }

  const pairs = new Map<string, Occurrence[]>();
  for (const occurrence of occurrences) {
    const key = `${occurrence.from}>${occurrence.to}`;
    pairs.set(key, [...(pairs.get(key) ?? []), occurrence]);
  }

  const references: Reference[] = [...pairs.values()].flatMap((all) => {
    const detected = all.filter((occurrence) => occurrence.basis === "detected");
    const used = detected.length > 0 ? detected : all;
    const first = used[0];
    if (first === undefined) return [];
    const byBlock = new Map<Unit, Occurrence[]>();
    for (const occurrence of used) byBlock.set(occurrence.unit, [...(byBlock.get(occurrence.unit) ?? []), occurrence]);
    const evidence = [...byBlock].flatMap(([unit, inBlock]): Evidence[] => {
      const rules = [...new Set(inBlock.map((occurrence) => occurrence.rule))].sort(byCodeUnit);
      const file = inBlock[0]?.file;
      if (file === undefined || !Arr.isArrayNonEmpty(rules)) return [];
      return [
        {
          file,
          line: Math.min(...inBlock.map((occurrence) => occurrence.line)),
          headings: unit.headingPath,
          rules,
          text: collapseWhitespace(unit.text),
        },
      ];
    });
    evidence.sort((left, right) => byCodeUnit(left.file, right.file) || left.line - right.line);
    if (!Arr.isArrayNonEmpty(evidence)) return [];
    return [
      {
        from: first.from,
        to: first.to,
        basis: detected.length > 0 ? ("detected" as const) : ("candidate" as const),
        mechanical: [...new Set(used.flatMap((occurrence) => occurrence.mechanical ?? []))].sort((left, right) => kindOrder(left) - kindOrder(right)),
        evidence,
        evidenceHash: evidenceHashOf(evidence),
      },
    ];
  });

  const skillNodes: Node[] = skillEntries.map((entryFile) => {
    const entry = docByPath.get(entryFile.path);
    const directory = owned.filter((file) => file.skill === entryFile.skill);
    const { origin, defect: originDefect } = originOf(entryFile.skill, imports);
    return {
      kind: "skill",
      id: entryFile.owner,
      name: entryFile.skill,
      title: firstHeading(entry, 1) ?? firstHeading(entry) ?? entryFile.skill,
      description: entry?.meta.description?.text.trim() ?? "",
      family: familyOf(entryFile.skill),
      modelInvocable: entry?.meta.data?.["disable-model-invocation"] !== true,
      origin,
      entry: entryFile.path,
      digest: digestOf(directory.filter((file) => file.owner === entryFile.owner)),
      tooling: toolingOf(
        directory.map((file) => ({
          path: file.path,
          pathInSkill: file.pathInSkill,
          text: file.file.text,
          executable: file.file.executable,
          blocks: docByPath.get(file.path)?.blocks ?? null,
        })),
      ),
      defects: [...defectsOf(entryFile, entry, directory), ...(originDefect === null ? [] : [originDefect])],
    };
  });

  const playbookNodes: Node[] = playbookFiles.map((file) => {
    const doc = docByPath.get(file.path);
    return {
      kind: "playbook",
      id: file.owner,
      name: playbookName(file),
      title: firstHeading(doc) ?? playbookName(file),
      purpose: purposeOf(doc),
      host: skillId(file.skill),
      entry: file.path,
      digest: digestOf([file]),
    };
  });

  const hostedNodes: Node[] = [...hosted].map(([id, file]) => ({
    kind: "hosted",
    id,
    host: skillId(file.skill),
    title: firstHeading(docByPath.get(file.path)) ?? file.pathInSkill.slice(file.pathInSkill.lastIndexOf("/") + 1),
    entry: file.path,
    digest: file.sha256,
  }));

  const files: FileRecord[] = owned.map((file) => ({ path: file.path, owner: file.owner, sha256: file.sha256 }));

  return {
    version: 1,
    sourceDigest: digestOf(owned),
    nodes: sortedBy([...skillNodes, ...playbookNodes, ...hostedNodes], (node) => node.id),
    routes: routes.sort((left, right) => byCodeUnit(left.file, right.file) || left.line - right.line),
    triggers: triggers.sort((left, right) => byCodeUnit(left.list, right.list) || byCodeUnit(left.file, right.file) || left.line - right.line),
    files,
    references: references.sort((left, right) => byCodeUnit(left.from, right.from) || byCodeUnit(left.to, right.to)),
  };
};
