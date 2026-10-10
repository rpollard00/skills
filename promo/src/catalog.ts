import { PLAYBOOKS, SKILLS } from "./catalog.generated";

export type SkillName = (typeof SKILLS)[number];
export type PlaybookName = (typeof PLAYBOOKS)[number];

export const SKILL_KINDS = ["engineering", "principle", "craft"] as const;
export type SkillKind = (typeof SKILL_KINDS)[number];

/** Hand-kept: the design, version-control, and writing skills. */
export const CRAFT_SKILLS = [
  "ui-design",
  "refine-ui",
  "jj",
  "writing",
  "simple-technical-english",
  "unslop",
] as const satisfies readonly SkillName[];

const CRAFT: ReadonlySet<string> = new Set(CRAFT_SKILLS);

const kindOfName = (name: string): SkillKind => {
  if (name.startsWith("principle-")) return "principle";
  return CRAFT.has(name) ? "craft" : "engineering";
};

export const kindOf = (name: SkillName): SkillKind => kindOfName(name);

export interface KindCounts {
  readonly skills: number;
  readonly engineering: number;
  readonly principles: number;
  readonly craft: number;
}

export const countKinds = (names: readonly string[]): KindCounts => {
  const count = (kind: SkillKind): number => names.filter((name) => kindOfName(name) === kind).length;
  return {
    skills: names.length,
    engineering: count("engineering"),
    principles: count("principle"),
    craft: count("craft"),
  };
};

export interface Skill {
  readonly name: SkillName;
  readonly kind: SkillKind;
}

export const CATALOG = {
  /** Grouped by kind in `SKILL_KINDS` order, then by name. */
  skills: SKILL_KINDS.flatMap((kind) =>
    SKILLS.filter((name) => kindOf(name) === kind).map((name): Skill => ({ name, kind })),
  ),
  playbooks: PLAYBOOKS,
  /** By copy token name. */
  counts: { ...countKinds(SKILLS), playbooks: PLAYBOOKS.length },
  kindCounts: {
    engineering: countKinds(SKILLS).engineering,
    principle: countKinds(SKILLS).principles,
    craft: countKinds(SKILLS).craft,
  } satisfies Record<SkillKind, number>,
} as const;

export type CopyToken = keyof typeof CATALOG.counts;
const COPY_TOKENS: readonly CopyToken[] = ["skills", "playbooks", "engineering", "principles", "craft"];

/** Replaces `{skills}`, `{playbooks}`, `{engineering}`, `{principles}`, `{craft}`. Other text is unchanged. */
export const resolveCopy = (text: string): string =>
  COPY_TOKENS.reduce((result, token) => result.replaceAll(`{${token}}`, String(CATALOG.counts[token])), text);

/** From README.md, "Native entry points". Prose, so it is kept by hand. `npm run check` finds each command in README.md. */
export const ENTRY_POINTS = [
  { command: "/mako", harness: "CLAUDE CODE" },
  { command: "/skill:mako", harness: "PI" },
  { command: "$mako", harness: "CODEX" },
  { command: "@mako", harness: "OPENCODE 2" },
] as const;

export const skillLabel = (name: SkillName): string => name.toUpperCase();

/** 1-based position in the playbook list, for numbered rows. */
export const playbookNumber = (name: PlaybookName): number => PLAYBOOKS.indexOf(name) + 1;

export const playbookLabel = (name: PlaybookName): string => name.replaceAll("-", " ").toUpperCase();
