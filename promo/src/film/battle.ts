import { playbookNumber } from "../catalog";
import { quote, type SceneSpecOf } from "../timeline";
import { TASK } from "./task";

const EXECUTION = "skills/mako/references/execution.md";
const terminal = ["$ export start", "$ export cancel"] as const;
const commands = [
  { id: "how", label: "HOW" },
  { id: "architect", label: "ARCHITECT" },
  { id: "conditions", label: "CONDITIONS" },
  { id: "build", label: "BUILD" },
  { id: "review", label: "REVIEW" },
  { id: "verify", label: "VERIFY" },
  { id: "report", label: "REPORT" },
] as const;

export const battle: SceneSpecOf<"battle"> = {
  kind: "battle",
  theme: "dark",
  music: "battle",
  exit: { kind: "cover", color: "energy", from: "bottom", beats: 0.5 },
  shots: {
    intro: {
      beats: 8,
      card: {
        lines: ["PLAYBOOK STEPS", "BECOME THE CHECKLIST."],
        source: quote("skills/mako/SKILL.md", "Record its ordered steps in native tracking or a checklist."),
      },
      labels: {
        plateId: `PL. ${String(playbookNumber(TASK.playbook)).padStart(2, "0")}`,
        auto: "AUTO",
        party: "PARTY",
        context: "CONTEXT",
        goal: "GOAL",
        work: "WORK",
        loaded: "LOADED",
        proven: "PROVEN",
        stateUnproven: "UNPROVEN",
        stateProven: "PROVEN",
        stateFailed: "FAILED",
      },
      cues: {
        plate: { at: 0, span: 1 },
        windows: { at: 1, span: 1.5, sfx: "window" },
        goal: { at: 2, span: 0.5 },
        steps: { at: 3, sfx: "tally", repeat: { count: commands.length, every: 0.5 } },
      },
      effects: [],
    },
    how: {
      beats: 10,
      card: {
        lines: ["DELEGATES READ THE CODE.", "MAKO KEEPS ITS CONTEXT."],
        source: quote("skills/mako/SKILL.md", "to protect its context"),
      },
      labels: { brief: "BRIEF", findings: "FINDINGS" },
      cues: {
        brief: { at: 2, span: 1 },
        read: { at: 3, span: 4, sfx: "scan" },
        findings: { at: 7, span: 1 },
      },
      effects: [
        { kind: "cursor", at: 0, command: "how" },
        { kind: "spawn", at: 1, actor: "explorer" },
        { kind: "act", at: 3, actor: "explorer" },
        { kind: "context", at: 3, actor: "explorer", to: 0.875, over: 4 },
        { kind: "act", at: 8, actor: "mako" },
        { kind: "context", at: 8, actor: "mako", to: 0.125, over: 0.5 },
        { kind: "tick", at: 9, command: "how" },
      ],
    },
    architect: {
      beats: 8,
      card: {
        lines: ["TYPES AND SIGNATURES", "BEFORE CODE."],
        source: quote("skills/architect/SKILL.md", "Sketch types, signatures, and module structure before code"),
      },
      labels: { notImplemented: "not implemented" },
      cues: {
        wireframe: { at: 1, span: 3, sfx: "scan" },
        signature: { at: 4 },
      },
      effects: [
        { kind: "cursor", at: 0, command: "architect" },
        { kind: "tick", at: 7, command: "architect" },
      ],
    },
    conditions: {
      beats: 8,
      card: {
        lines: ["ACCEPTANCE CONDITIONS.", "RECORDED BEFORE EDITING."],
        source: quote(EXECUTION, "record observable acceptance conditions before editing"),
      },
      labels: {},
      cues: {},
      effects: [
        { kind: "cursor", at: 0, command: "conditions" },
        { kind: "record", at: 2, condition: "stops" },
        { kind: "record", at: 4, condition: "cleanup" },
        { kind: "record", at: 6, condition: "idempotent" },
        { kind: "tick", at: 7, command: "conditions" },
      ],
    },
    build: {
      beats: 12,
      card: {
        lines: ["MAKO STAYS IN THE LEAD.", "IMPLEMENTERS BUILD."],
        source: quote("skills/mako/playbooks/feature.md", "stay in the lead and delegate implementation"),
      },
      labels: { trigger: "TRIGGER · EDIT TYPESCRIPT" },
      cues: { trigger: { at: 2, span: 2, sfx: "trigger" } },
      effects: [
        { kind: "cursor", at: 0, command: "build" },
        { kind: "spawn", at: 1, actor: "implementer" },
        { kind: "load", at: 4, skill: "typescript-best-practices" },
        { kind: "context", at: 4, actor: "implementer", to: 0.75, over: 6 },
        { kind: "act", at: 5, actor: "implementer" },
        { kind: "hit", at: 6, actor: "implementer" },
        { kind: "work", at: 6, to: 1 / 3, over: 0.5 },
        { kind: "hit", at: 8, actor: "implementer" },
        { kind: "work", at: 8, to: 2 / 3, over: 0.5 },
        { kind: "hit", at: 10, actor: "implementer" },
        { kind: "work", at: 10, to: 1, over: 0.5 },
        { kind: "tick", at: 11, command: "build" },
      ],
    },
    review: {
      beats: 10,
      card: {
        lines: ["FRESH REVIEWERS.", "NOT SELF-REVIEW."],
        source: quote(EXECUTION, "Self-review is not independent review."),
      },
      labels: { trigger: "TRIGGER · BEFORE REVIEW", finding: "FINDING", fixed: "FIXED" },
      cues: {
        trigger: { at: 2, span: 1.5, sfx: "trigger" },
        scan: { at: 4, span: 2, sfx: "scan" },
      },
      effects: [
        { kind: "cursor", at: 0, command: "review" },
        { kind: "spawn", at: 1, actor: "reviewer" },
        { kind: "load", at: 3.5, skill: "no-comments" },
        { kind: "act", at: 4, actor: "reviewer" },
        { kind: "context", at: 4, actor: "reviewer", to: 0.625, over: 2 },
        { kind: "finding", at: 6 },
        { kind: "hit", at: 7, actor: "implementer" },
        { kind: "fixed", at: 8 },
        { kind: "tick", at: 9, command: "review" },
      ],
    },
    claim: {
      beats: 6,
      card: null,
      labels: { done: "DONE.", victory: "VICTORY" },
      cues: { banner: { at: 2, span: 4 } },
      effects: [{ kind: "claim", at: 0.5, actor: "implementer" }],
    },
    reject: {
      beats: 10,
      music: "proof",
      card: {
        lines: ["NEVER CLAIM COMPLETION", "FROM THESE."],
        source: quote(EXECUTION, "Never claim completion from checked boxes, a successful build, or a delegate's summary."),
      },
      labels: {
        checkedBoxes: "CHECKED BOXES",
        successfulBuild: "A SUCCESSFUL BUILD",
        delegateSummary: "A DELEGATE'S SUMMARY",
        notProof: "NOT PROOF",
      },
      cues: { bounce: { at: 2, span: 1, sfx: "reject", repeat: { count: 3, every: 2 } } },
      effects: [
        { kind: "reject", at: 0 },
        { kind: "load", at: 8.5, skill: "principle-prove-it-works" },
      ],
    },
    verify: {
      beats: 12,
      card: {
        lines: ["RUN THE REAL ENTRY POINT.", "COMPILATION IS NOT PROOF."],
        source: quote(EXECUTION, "Compilation alone does not prove behavior."),
      },
      labels: {},
      cues: { terminal: { at: 1, sfx: "type", repeat: { count: terminal.length, every: 1 } } },
      effects: [
        { kind: "cursor", at: 0, command: "verify" },
        { kind: "check", at: 4, condition: "stops", outcome: "proven" },
        { kind: "check", at: 6, condition: "cleanup", outcome: "proven" },
        { kind: "check", at: 8, condition: "idempotent", outcome: "failed" },
      ],
    },
    fix: {
      beats: 12,
      music: "build",
      card: {
        lines: ["ONE CHECK FAILS.", "FIX THE CAUSE. RERUN."],
        source: quote("skills/principle-fix-root-causes/SKILL.md", "Trace every problem to its root cause and fix it there."),
      },
      labels: {},
      cues: { recheck: { at: 7, span: 2, sfx: "scan" } },
      effects: [
        { kind: "load", at: 2.5, skill: "principle-fix-root-causes" },
        { kind: "act", at: 3, actor: "implementer" },
        { kind: "hit", at: 4, actor: "implementer" },
        { kind: "act", at: 6, actor: "mako" },
        { kind: "check", at: 9, condition: "idempotent", outcome: "proven" },
      ],
    },
    open: {
      beats: 12,
      music: "resolve",
      card: {
        lines: ["EVERY CONDITION MATCHED", "TO CURRENT EVIDENCE."],
        source: quote(EXECUTION, "Match each acceptance condition to current evidence"),
      },
      labels: { verified: "VERIFIED" },
      cues: {
        burst: { at: 0, span: 3, sfx: "gateOpen" },
        stamp: { at: 1, sfx: "stamp" },
      },
      effects: [
        { kind: "tick", at: 4, command: "verify" },
        { kind: "cursor", at: 5, command: "report" },
      ],
    },
  },
  props: {
    commands,
    actors: { mako: "MAKO", explorer: "EXPLORER", implementer: "IMPLEMENTER", reviewer: "REVIEWER" },
    signature: "cancel(id: JobId): Promise<void>",
    terminal,
  },
};

export const LOADED_COUNT =
  TASK.loadout.length +
  Object.values(battle.shots)
    .flatMap((turn) => turn.effects)
    .filter((effect) => effect.kind === "load").length;
