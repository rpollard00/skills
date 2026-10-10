import { cut, quote, type SceneSpecOf } from "../timeline";
import { TASK } from "./task";

const line = `${TASK.entry} ${TASK.goal}`;
const charsPerHit = 2;

export const goal: SceneSpecOf<"goal"> = {
  kind: "goal",
  theme: "dark",
  music: "pulse",
  exit: cut,
  shots: {
    enter: {
      beats: 8,
      card: {
        lines: ["YOU INVOKE IT", "WITH A GOAL."],
        source: quote("README.md", "Invoke it with a task."),
      },
      labels: { title: "ENTER GOAL", tag: "EXAMPLE" },
      cues: {
        open: { at: 0, sfx: "window" },
        type: { at: 1, sfx: "type", repeat: { count: Math.ceil(line.length / charsPerHit), every: 0.25 } },
      },
    },
    own: {
      beats: 12,
      card: {
        lines: ["IT ACTS, THEN REPORTS.", "EXPLICIT LIMITS STAY BINDING."],
        source: quote("README.md", "Explicit scope limits and dangerous-action boundaries remain binding."),
      },
      labels: { question: "PROCEED?", yes: "YES", no: "NO", accepted: "ACCEPTED" },
      cues: {
        dialog: { at: 1, span: 0.5, sfx: "window" },
        cut: { at: 3, span: 0.25, sfx: "deny" },
        accept: { at: 4, sfx: "confirm" },
      },
    },
  },
  props: { line, charsPerHit },
};
