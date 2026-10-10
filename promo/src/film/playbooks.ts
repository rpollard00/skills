import { CATALOG } from "../catalog";
import { cut, quote, type SceneSpecOf } from "../timeline";
import { TASK } from "./task";

const scan = { at: 1, every: 0.25 } as const;
const scanEnd = scan.at + CATALOG.playbooks.length * scan.every;

const detail = "BUILD NEW OR CHANGED BEHAVIOR";
const detailStep = 2;
const typing = { at: 3, every: 0.25, hits: Math.ceil(detail.length / detailStep) } as const;

const pickBeats = 12;
const holdFrom = Math.ceil(typing.at + typing.hits * typing.every);

export const playbooks: SceneSpecOf<"playbooks"> = {
  kind: "playbooks",
  theme: "dark",
  music: "menu",
  exit: cut,
  shots: {
    list: {
      beats: 8,
      card: {
        lines: ["{playbooks} PLAYBOOKS.", "MAKO SELECTS ONE."],
        source: quote("skills/mako/SKILL.md", "Select the playbook that best fits the task."),
      },
      labels: { title: "PLAYBOOKS", detailTitle: "DETAIL", plate: "PL." },
      cues: {
        open: { at: 0, sfx: "window" },
        scan: { at: scan.at, sfx: "cursor", repeat: { count: CATALOG.playbooks.length, every: scan.every } },
        back: { at: scanEnd, span: 0.25, endSfx: "cursor" },
      },
    },
    pick: {
      beats: pickBeats,
      card: {
        lines: ["FEATURE:", "DESIGN, BUILD, REVIEW, VERIFY."],
        source: quote("skills/mako/playbooks/feature.md", "Design, build, review, verify."),
      },
      labels: {},
      cues: {
        lock: { at: 0, span: 1, sfx: "confirm" },
        dim: { at: 1, span: 1 },
        grow: { at: 2 },
        detail: { at: typing.at, sfx: "type", repeat: { count: typing.hits, every: typing.every } },
        pulse: { at: holdFrom, span: 0.25, repeat: { count: pickBeats - holdFrom, every: 1 } },
      },
    },
  },
  props: {
    selected: TASK.playbook,
    detail,
    detailStep,
    plateEvery: 2,
    plateScale: { list: 4, pick: 5 },
  },
};
