import { collapseWhitespace } from "../shared/markdown";
import { Answer, type Evidence, type IndexRecord, type Judgment, type NodeId, type Sha256, type TicketId } from "../shared/model";
import type { Ticket, Verdict } from "./resolve";

export interface IndexState {
  /** `relations` counts the relations that the client draws: the scan joined with the judgments. */
  readonly counts: { readonly skills: number; readonly playbooks: number; readonly hosted: number; readonly relations: number };
  readonly tickets: readonly Ticket[];
  readonly judged: readonly Ticket[];
  readonly orphans: readonly Judgment[];
  readonly record: IndexRecord;
}

interface NodeChanges {
  readonly added: readonly NodeId[];
  readonly changed: readonly NodeId[];
  readonly removed: readonly NodeId[];
}

export type Report =
  | {
      readonly kind: "index";
      readonly state: IndexState;
      /** Nodes that differ from the `scan.json` that the command replaced. */
      readonly changes: NodeChanges;
      readonly written: boolean;
      readonly digest: Sha256;
      readonly pruned: readonly Judgment[];
    }
  | {
      readonly kind: "judge";
      readonly state: IndexState;
      readonly ticket: TicketId;
      readonly judgment: Judgment;
      /** The answer that this one replaced. Null for a first answer. */
      readonly replaced: Verdict | null;
    }
  | { readonly kind: "check"; readonly state: IndexState };

export const isComplete = (state: IndexState): boolean =>
  state.record.kind === "current" && state.tickets.length === 0 && state.orphans.length === 0;

const ANSWERS = Answer.literals.join("|");
const INDENT = "            ";
const GROUP_INDENT = "       ";
const GROUP_LIMIT = 10;
const TARGET_LENGTH = 160;

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;

const verdict = (answer: Verdict): string => (answer.conditional ? `${answer.kind}, conditional` : answer.kind);

const pairOf = (pair: { readonly from: string; readonly to: string }): string => `${pair.from} > ${pair.to}`;

const statusOf = (ticket: Ticket): string => {
  switch (ticket.status.kind) {
    case "new":
      return "new";
    case "changed":
    case "invalid":
      return `${ticket.status.kind}; was: ${verdict(ticket.status.was)}`;
    case "judged":
      return `judged: ${verdict(ticket.status.answer)}`;
    default: {
      const _exhaustive: never = ticket.status;
      return _exhaustive;
    }
  }
};

const oneLine = (text: string): string => {
  const flat = collapseWhitespace(text);
  if (flat.length <= TARGET_LENGTH) return flat;
  const wordEnd = flat.lastIndexOf(" ", TARGET_LENGTH);
  return `${flat.slice(0, wordEnd > 0 ? wordEnd : TARGET_LENGTH)} …`;
};

/** `skills/bug-fix/SKILL.md:39 › Fix`: the file, the line, then each heading above the block. */
const placeOf = (evidence: Evidence): string => [`${evidence.file}:${evidence.line}`, ...evidence.headings].join(" › ");

const ticketLines = (ticket: Ticket): string[] => [
  `  ${ticket.id}  ${ticket.reason.padEnd(7)}  ${pairOf(ticket)}  ${statusOf(ticket)}`,
  ...(ticket.target === "" ? [] : [`${INDENT}to: ${oneLine(ticket.target)}`]),
  ...ticket.evidence.flatMap((evidence) => [`${INDENT}${placeOf(evidence)}`, `${INDENT}| ${evidence.text}`]),
  `${INDENT}npm run judge -- ${ticket.id} <${ANSWERS}> [--conditional]`,
];

const countsLine = (state: IndexState): string =>
  [
    plural(state.counts.skills, "skill"),
    plural(state.counts.playbooks, "playbook"),
    plural(state.counts.hosted, "hosted file"),
    plural(state.counts.relations, "relation"),
  ].join("  ");

const changeLines = (changes: NodeChanges): string[] =>
  (["added", "changed", "removed"] as const).flatMap((group) => {
    const ids = changes[group];
    const shown = ids.slice(0, GROUP_LIMIT).join(", ");
    const more = ids.length > GROUP_LIMIT ? `, and ${ids.length - GROUP_LIMIT} more` : "";
    return ids.length === 0 ? [] : [`${GROUP_INDENT}${group.padEnd(9)}${shown}${more}`];
  });

const orphanLines = (state: IndexState): string[] => [
  `orphans ${state.orphans.length}`,
  ...state.orphans.map((orphan) => `  ${pairOf(orphan)}  ${verdict(orphan)}`),
  ...(state.orphans.length === 0 ? [] : [`${INDENT}npm run index -- --prune`]),
];

const failures = (state: IndexState): string[] => {
  const out: string[] = [];
  if (state.record.kind === "missing") out.push("  index/scan.json is missing or not readable. Run `npm run index`.");
  if (state.record.kind === "behind") {
    const { added, changed, removed } = state.record;
    out.push(
      `  index/scan.json is behind the files: ${added.length} added, ${changed.length} changed, ${removed.length} removed. Run \`npm run index\`.`,
      ...changeLines(state.record),
    );
  }
  if (state.tickets.length > 0) out.push(`  Open tickets: ${state.tickets.length}. Run the judge command of each ticket.`);
  if (state.orphans.length > 0) out.push(`  Judgments without a question: ${state.orphans.length}. Run \`npm run index -- --prune\`.`);
  return out;
};

/**
 * Each open item carries the exact command that closes it.
 * With `judged`, an index report also lists each answered ticket, so that a reader can find the id that revises an answer.
 */
export const renderReport = (report: Report, options: { readonly judged?: boolean } = {}): string => {
  const { state } = report;
  const lines: string[] = [];

  switch (report.kind) {
    case "index": {
      const { added, changed, removed } = report.changes;
      lines.push(
        `scan   ${countsLine(state)}   +${added.length} added  ~${changed.length} changed  -${removed.length} removed`,
        ...changeLines(report.changes),
        `${report.written ? "wrote" : "unchanged"}  index/scan.json  digest ${report.digest.slice(0, 8)}`,
      );
      if (report.pruned.length > 0) {
        lines.push(`pruned ${report.pruned.length}`, ...report.pruned.map((orphan) => `  ${pairOf(orphan)}  ${verdict(orphan)}`));
      }
      lines.push(`open   ${state.tickets.length}`, ...state.tickets.flatMap(ticketLines));
      if (options.judged === true) lines.push(`judged ${state.judged.length}`, ...state.judged.flatMap(ticketLines));
      lines.push(...orphanLines(state));
      break;
    }
    case "judge": {
      const next = state.tickets[0];
      const answer = verdict(report.judgment);
      lines.push(
        report.replaced === null
          ? `judged ${report.ticket}  ${pairOf(report.judgment)}  ${answer}`
          : `revised ${report.ticket}  ${pairOf(report.judgment)}  ${verdict(report.replaced)} -> ${answer}`,
        `open   ${state.tickets.length}`,
      );
      if (next !== undefined) lines.push(...ticketLines(next));
      if (state.tickets.length > 1) lines.push(`${INDENT}Run \`npm run check\` to list all ${state.tickets.length} open tickets.`);
      break;
    }
    case "check": {
      lines.push(`open   ${state.tickets.length}`, ...state.tickets.flatMap(ticketLines), ...orphanLines(state));
      if (isComplete(state)) {
        lines.push(
          `check ok  ${plural(state.counts.skills, "skill")}  ${plural(state.counts.relations, "relation")}  0 open  0 orphans  scan.json current`,
        );
      } else {
        lines.push("check failed", ...failures(state));
      }
      break;
    }
    default: {
      const _exhaustive: never = report;
      return _exhaustive;
    }
  }
  return lines.join("\n");
};
