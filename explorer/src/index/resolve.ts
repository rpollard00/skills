import { Array as Arr, Schema } from "effect";
import {
  CONDITIONAL_ANSWERS,
  EdgeKind,
  TicketId,
  relationKey,
  type Answer,
  type Evidence,
  type Judgment,
  type Judgments,
  type MechanicalKind,
  type Node,
  type NodeId,
  type Reference,
  type Relation,
  type Scan,
  type Sha256,
} from "../shared/model";
import { byCodeUnit } from "../shared/order";
import { sha256 } from "./digest";

export interface Verdict {
  readonly kind: Answer;
  readonly conditional: boolean;
}

/**
 * `new`: the pair has no answer. `changed`: the evidence changed after the answer in `was`.
 * `invalid`: the stored answer in `was` is not a legal combination. `judged`: the answer applies.
 */
type TicketStatus =
  | { readonly kind: "new" }
  | { readonly kind: "changed" | "invalid"; readonly was: Verdict }
  | { readonly kind: "judged"; readonly answer: Verdict };

/** One question about one ordered pair. `kind` asks what the reference is. `refers` asks whether it is one. */
export interface Ticket {
  /** The printed id: the shortest prefix of `key` that names this ticket alone among the current ones. */
  readonly id: TicketId;
  /** The identity: a hash of the pair and its evidence hash. It changes when the evidence changes. */
  readonly key: Sha256;
  readonly from: NodeId;
  readonly to: NodeId;
  readonly reason: "kind" | "refers";
  readonly status: TicketStatus;
  /** What the target is, in its own words. */
  readonly target: string;
  readonly evidence: readonly [Evidence, ...Evidence[]];
  readonly evidenceHash: Sha256;
}

export interface Resolution {
  readonly relations: readonly Relation[];
  /** Open tickets. */
  readonly tickets: readonly Ticket[];
  /** Answered tickets. */
  readonly judged: readonly Ticket[];
  /** Judgments that answer no question: the pair is gone, or the pair needs no judgment. */
  readonly orphans: readonly Judgment[];
}

const SHORTEST_TICKET_ID = 8;

const toTicketId = Schema.decodeUnknownSync(TicketId);

const ticketKey = (reference: Pick<Reference, "from" | "to" | "evidenceHash">): Sha256 =>
  sha256(`${reference.from}>${reference.to}:${reference.evidenceHash}`);

const sharedPrefixLength = (left: string, right: string): number => {
  let length = 0;
  while (length < left.length && left[length] === right[length]) length += 1;
  return length;
};

/** In sorted order, the keys that share the most with a key are its two neighbours. */
const shortestUniquePrefixes = (keys: readonly Sha256[]): Map<Sha256, TicketId> => {
  const sorted = [...keys].sort(byCodeUnit);
  return new Map(
    sorted.map((key, index) => {
      const neighbours = [sorted[index - 1], sorted[index + 1]].flatMap((neighbour) => (neighbour === undefined ? [] : [neighbour]));
      const length = Math.max(SHORTEST_TICKET_ID, ...neighbours.map((neighbour) => sharedPrefixLength(key, neighbour) + 1));
      return [key, toTicketId(key.slice(0, length))];
    }),
  );
};

/** The current tickets, open or answered, whose key starts with what a person typed. */
export const ticketsMatching = (resolution: Resolution, typed: string): readonly Ticket[] =>
  typed.length < SHORTEST_TICKET_ID ? [] : [...resolution.tickets, ...resolution.judged].filter((ticket) => ticket.key.startsWith(typed));

const strokeOrder = (kind: EdgeKind): number => EdgeKind.literals.indexOf(kind);

/** `artifact-path` records a path in a code span. It does not say what the pair is. */
const saysWhatThePairIs = (kind: MechanicalKind): boolean => kind !== "artifact-path";

const isOnlyAnArtifactPath = (evidence: Evidence): boolean => evidence.rules.every((rule) => rule === "artifact-path");

const needsJudgment = (reference: Reference): boolean =>
  !reference.mechanical.some(saysWhatThePairIs) && !reference.evidence.every(isOnlyAnArtifactPath);

const describe = (node: Node | undefined): string => {
  if (node === undefined) return "";
  switch (node.kind) {
    case "skill":
      return node.description || node.title;
    case "playbook":
      return node.purpose || node.title;
    case "hosted":
      return node.title;
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
};

/** Pure join of the scan with the judgments. A judgment applies only while its evidence hash is the current one. */
export const resolve = (scanned: Scan, judgments: Judgments): Resolution => {
  const nodes = new Map(scanned.nodes.map((node) => [node.id, node]));
  const answers = new Map<string, Judgment>();
  const orphans: Judgment[] = [];
  for (const judgment of judgments.relations) {
    const key = relationKey(judgment);
    if (answers.has(key)) orphans.push(judgment);
    else answers.set(key, judgment);
  }

  const relations: Relation[] = [];
  const judgeable: { readonly reference: Reference; readonly stored: Judgment | undefined; readonly key: Sha256 }[] = [];
  for (const reference of scanned.references) {
    const stored = answers.get(relationKey(reference));
    answers.delete(relationKey(reference));
    if (needsJudgment(reference)) {
      judgeable.push({ reference, stored, key: ticketKey(reference) });
      continue;
    }
    const mechanical = [...reference.mechanical].sort((left, right) => strokeOrder(left) - strokeOrder(right));
    if (Arr.isArrayNonEmpty(mechanical)) {
      relations.push({ from: reference.from, to: reference.to, evidence: reference.evidence, kinds: mechanical, conditional: false, standing: "mechanical", ticket: null });
    }
    if (stored !== undefined) orphans.push(stored);
  }

  const ids = shortestUniquePrefixes(judgeable.map((entry) => entry.key));
  const tickets: Ticket[] = [];
  const judged: Ticket[] = [];
  for (const { reference, stored, key } of judgeable) {
    const pair = { from: reference.from, to: reference.to, evidence: reference.evidence };
    const mechanical = [...reference.mechanical].sort((left, right) => strokeOrder(left) - strokeOrder(right));
    const id = ids.get(key) ?? toTicketId(key);
    const answer: Verdict | null = stored === undefined ? null : { kind: stored.kind, conditional: stored.conditional };
    const status: TicketStatus =
      answer === null ? { kind: "new" }
      : stored?.evidenceHash !== reference.evidenceHash ? { kind: "changed", was: answer }
      : answer.conditional && !CONDITIONAL_ANSWERS.includes(answer.kind) ? { kind: "invalid", was: answer }
      : { kind: "judged", answer };
    const ticket: Ticket = {
      ...pair,
      id,
      key,
      reason: reference.basis === "candidate" ? "refers" : "kind",
      status,
      target: describe(nodes.get(reference.to)),
      evidenceHash: reference.evidenceHash,
    };

    if (status.kind === "judged") {
      judged.push(ticket);
      const kinds: EdgeKind[] = status.answer.kind === "none" ? mechanical : [status.answer.kind, ...mechanical];
      if (Arr.isArrayNonEmpty(kinds)) relations.push({ ...pair, kinds, conditional: status.answer.conditional, standing: "judged", ticket: id });
    } else {
      tickets.push(ticket);
      if (reference.basis === "detected") {
        relations.push({ ...pair, kinds: ["mentions", ...mechanical], conditional: false, standing: status.kind === "new" ? "unjudged" : "rejudge", ticket: id });
      }
    }
  }

  const order = (left: { from: NodeId; to: NodeId }, right: { from: NodeId; to: NodeId }): number =>
    byCodeUnit(left.from, right.from) || byCodeUnit(left.to, right.to);
  return {
    relations: relations.sort(order),
    tickets: tickets.sort(order),
    judged: judged.sort(order),
    orphans: [...orphans, ...answers.values()].sort(order),
  };
};
