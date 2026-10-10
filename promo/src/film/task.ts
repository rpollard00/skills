import type { ENTRY_POINTS, PlaybookName, SkillName } from "../catalog";

interface TaskShape {
  readonly entry: (typeof ENTRY_POINTS)[number]["command"];
  readonly goal: string;
  readonly playbook: PlaybookName;
  readonly loadout: readonly SkillName[];
  readonly conditions: readonly [Condition, Condition, Condition];
  readonly report: { readonly result: string; readonly risk: string; readonly delivery: string };
}

interface Condition {
  readonly id: string;
  readonly text: string;
}

export const TASK = {
  entry: "/mako",
  goal: "add cancellation to export jobs",
  playbook: "feature",
  loadout: ["how", "architect", "codebase-design"],
  conditions: [
    { id: "stops", text: "CANCEL STOPS THE EXPORT" },
    { id: "cleanup", text: "PARTIAL FILE REMOVED" },
    { id: "idempotent", text: "SECOND CANCEL IS SAFE" },
  ],
  report: {
    result: "CANCELLATION ADDED",
    risk: "NOT LOAD TESTED",
    delivery: "LOCAL. NOT PUBLISHED.",
  },
} as const satisfies TaskShape;

export type Task = typeof TASK;
export type ConditionId = Task["conditions"][number]["id"];
