import { playbookNumber } from "../catalog";
import { cut, quote, type SceneSpecOf } from "../timeline";
import { TASK } from "./task";

const flight = { span: 1.5, sfx: "orbPick", endSfx: "slot" } as const;

const legend = [
  { kind: "engineering", text: "ENGINEERING" },
  { kind: "principle", text: "PRINCIPLES" },
  { kind: "craft", text: "DESIGN · VERSION CONTROL · WRITING" },
] as const;

export const equip: SceneSpecOf<"equip"> = {
  kind: "equip",
  theme: "dark",
  music: "menu",
  exit: cut,
  shots: {
    bag: {
      beats: 8,
      card: {
        lines: ["{skills} SKILLS. THREE KINDS."],
        source: quote("README.md", "The collection contains {skills} skills"),
      },
      labels: {
        playbookTitle: "PLAYBOOK",
        skillsTitle: "SKILLS",
        plateId: `PL. ${String(playbookNumber(TASK.playbook)).padStart(2, "0")}`,
      },
      cues: {
        open: { at: 0, sfx: "window" },
        fill: { at: 0, span: 1.5, sfx: "tally" },
        legend: { at: 3, span: 1, sfx: "tally", repeat: { count: legend.length, every: 1 } },
      },
    },
    slot: {
      beats: 10,
      card: {
        lines: ["MAKO LOADS ONLY WHAT", "THE PLAYBOOK NEEDS."],
        source: quote("skills/mako/SKILL.md", "Load only current dependencies, not every playbook."),
      },
      labels: { loaded: "LOADED" },
      cues: {
        first: { at: 1, ...flight },
        second: { at: 3, ...flight },
        third: { at: 5, ...flight },
      },
    },
    triggers: {
      beats: 10,
      card: {
        lines: ["OTHERS LOAD ON A TRIGGER.", "NOT BEFORE."],
        source: quote("skills/mako/SKILL.md", "Read a dependency before the action it governs."),
      },
      labels: { onTrigger: "ON TRIGGER" },
      cues: {
        rings: { at: 1, span: 1, sfx: "trigger" },
        dim: { at: 3, span: 2 },
        bands: { at: 8, span: 2, sfx: "encounter" },
      },
    },
  },
  props: { slots: 8, columns: 9, bands: 16, legend, pickLead: 0.5, landing: 0.75 },
};
