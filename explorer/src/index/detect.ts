import { codeSpans, isInsideSpan, proseOnly, type Span } from "../shared/markdown";
import type { EvidenceRule, NodeId } from "../shared/model";
import { byCodeUnit } from "../shared/order";

/** A `candidate` is a mention that the rules cannot confirm. */
interface NameHit {
  readonly to: NodeId;
  readonly rule: EvidenceRule;
  /** Offset inside the scanned text. */
  readonly at: number;
  readonly basis: "detected" | "candidate";
}

interface Lexicon {
  readonly skills: ReadonlyMap<string, NodeId>;
  readonly anyName: RegExp;
  readonly namedList: RegExp;
  readonly bare: RegExp;
  readonly cue: RegExp;
  readonly shortNames: RegExp;
  /** One pattern with one group for each distinct form. `targets[n]` holds the nodes that group `n + 1` names. */
  readonly titleForms: { readonly pattern: RegExp; readonly targets: readonly (readonly NodeId[])[] };
}

export const PRINCIPLE_PREFIX = "principle-";

/** A name here is no ordinary English word, so a bare mention of it is a reference. */
const COINED_ONE_WORD_NAMES: readonly string[] = ["deslop", "mako", "unslop"];

const CUE_VERBS: readonly string[] = ["use", "run", "apply", "load", "invoke"];

const NEVER = /(?!)/g;
const BEFORE = String.raw`(?<![\w/.-])`;
const AFTER = String.raw`(?![\w/-])(?!\.\w)`;

export const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const alternation = (names: readonly string[]): string =>
  [...names].sort((left, right) => right.length - left.length || byCodeUnit(left, right)).map(escapeForRegExp).join("|");

const letterInAnyCase = (letter: string): string =>
  letter.toLowerCase() === letter.toUpperCase() ? escapeForRegExp(letter) : `[${letter.toUpperCase()}${letter.toLowerCase()}]`;

const inAnyCase = (word: string): string => [...word].map(letterInAnyCase).join("");

const capitalFirst = (word: string): string => `${inAnyCase(word.charAt(0))}${escapeForRegExp(word.slice(1))}`;

const titleForm = (words: readonly string[]): string | null => {
  const [first, ...rest] = words;
  if (first === undefined || rest.length === 0 || first.charAt(0).toUpperCase() === first.charAt(0).toLowerCase()) return null;
  return `${escapeForRegExp(first.charAt(0).toUpperCase())}${inAnyCase(first.slice(1))}${rest.map((word) => `[ -]${inAnyCase(word)}`).join("")}`;
};

export const lexicon = (input: {
  readonly skills: readonly { readonly name: string; readonly id: NodeId }[];
  readonly playbooks: readonly { readonly name: string; readonly id: NodeId }[];
}): Lexicon => {
  const names = input.skills.map((skill) => skill.name);
  const unambiguous = names.filter((name) => name.includes("-") || COINED_ONE_WORD_NAMES.includes(name));
  const ambiguous = names.filter((name) => !unambiguous.includes(name));
  const short = names.filter((name) => name.startsWith(PRINCIPLE_PREFIX)).map((name) => name.slice(PRINCIPLE_PREFIX.length));
  const any = alternation(names);
  const verbs = CUE_VERBS.map(capitalFirst).join("|");
  const compile = (source: string, when: boolean): RegExp => (when ? new RegExp(source, "g") : NEVER);

  const forms = new Map<string, NodeId[]>();
  const titled = [
    ...input.skills.map((skill) => ({
      words: (skill.name.startsWith(PRINCIPLE_PREFIX) ? skill.name.slice(PRINCIPLE_PREFIX.length) : skill.name).split("-"),
      to: skill.id,
    })),
    ...input.playbooks.map((playbook) => ({ words: playbook.name.split("-"), to: playbook.id })),
  ];
  for (const entry of titled) {
    const form = titleForm(entry.words);
    if (form !== null) forms.set(form, [...(forms.get(form) ?? []), entry.to]);
  }

  return {
    skills: new Map(input.skills.map((skill) => [skill.name, skill.id])),
    anyName: compile(String.raw`(?<![\w-])(${any})(?![\w-])`, names.length > 0),
    namedList: compile(
      String.raw`\b[Tt]he\s+((?:${any})(?:\s*,\s*(?:${any}))*(?:\s*,?\s+(?:and|or)\s+(?:${any}))?)\s+skills?\b`,
      names.length > 0,
    ),
    bare: compile(`${BEFORE}(${alternation(unambiguous)})${AFTER}`, unambiguous.length > 0),
    cue: compile(
      String.raw`(?:\b(?:${verbs})\s+(?:the\s+)?|\bskills?\s+(?:such\s+as|like)\s+)(${alternation(ambiguous)})${AFTER}`,
      ambiguous.length > 0,
    ),
    shortNames: compile(`${BEFORE}(${alternation(short.filter((name) => name.includes("-")))})${AFTER}`, short.some((name) => name.includes("-"))),
    titleForms: {
      pattern: compile(`${BEFORE}(?:${[...forms.keys()].map((form) => `(${form})`).join("|")})${AFTER}`, forms.size > 0),
      targets: [...forms.values()],
    },
  };
};

const SIGIL = /^(?:\/skill:|[/$@])(.+)$/;
const PATH_HEAD = /^([^/\s]+)\//;
const BOLD_NAME = /\*\*([a-z0-9]+(?:-[a-z0-9]+)*)\*\*/g;
const PRINCIPLE_SKILL = /\bprinciple skills?\b/;

/**
 * Links are not handled here, because a link needs the file list.
 * `home` is the skill that holds the text. A path into its own directory is not a reference.
 */
export const nameHits = (text: string, words: Lexicon, home: NodeId): NameHit[] => {
  const hits: NameHit[] = [];

  for (const span of codeSpans(text)) {
    const exact = words.skills.get(span.content);
    const sigil = words.skills.get(SIGIL.exec(span.content)?.[1] ?? "");
    const directory = words.skills.get(PATH_HEAD.exec(span.content)?.[1] ?? "");
    if (exact !== undefined) hits.push({ to: exact, rule: "backtick", at: span.start, basis: "detected" });
    else if (sigil !== undefined) hits.push({ to: sigil, rule: "sigil", at: span.start, basis: "detected" });
    else if (directory !== undefined && directory !== home) hits.push({ to: directory, rule: "artifact-path", at: span.start, basis: "detected" });
  }

  const prose = proseOnly(text);
  const taken: Span[] = [];

  for (const match of prose.matchAll(words.namedList)) {
    const list = match[1] ?? "";
    const listStart = match.index + match[0].indexOf(list);
    for (const name of list.matchAll(words.anyName)) {
      const to = words.skills.get(name[1] ?? "");
      if (to !== undefined) hits.push({ to, rule: "named-skill", at: listStart + name.index, basis: "detected" });
    }
    taken.push({ start: match.index, end: match.index + match[0].length });
  }

  for (const match of prose.matchAll(BOLD_NAME)) {
    const to = words.skills.get(`${PRINCIPLE_PREFIX}${match[1] ?? ""}`);
    if (to === undefined || !PRINCIPLE_SKILL.test(prose.slice(match.index))) continue;
    hits.push({ to, rule: "short-principle", at: match.index, basis: "detected" });
    taken.push({ start: match.index, end: match.index + match[0].length });
  }

  for (const match of prose.matchAll(words.bare)) {
    const to = words.skills.get(match[1] ?? "");
    if (to !== undefined && !isInsideSpan(taken, match.index)) hits.push({ to, rule: "bare-name", at: match.index, basis: "detected" });
  }

  for (const match of prose.matchAll(words.cue)) {
    const name = match[1] ?? "";
    const at = match.index + match[0].length - name.length;
    const to = words.skills.get(name);
    if (to !== undefined && !isInsideSpan(taken, at)) hits.push({ to, rule: "cue", at, basis: "candidate" });
  }

  for (const match of prose.matchAll(words.shortNames)) {
    const to = words.skills.get(`${PRINCIPLE_PREFIX}${match[1] ?? ""}`);
    if (to !== undefined && !isInsideSpan(taken, match.index)) hits.push({ to, rule: "short-name", at: match.index, basis: "candidate" });
  }

  for (const match of prose.matchAll(words.titleForms.pattern)) {
    if (isInsideSpan(taken, match.index)) continue;
    const group = match.findIndex((text, index) => index > 0 && text !== undefined);
    for (const to of words.titleForms.targets[group - 1] ?? []) hits.push({ to, rule: "title-form", at: match.index, basis: "candidate" });
  }

  return hits.sort((left, right) => left.at - right.at || byCodeUnit(left.rule, right.rule));
};
