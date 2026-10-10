import { cut, quote, type SceneSpecOf } from "../timeline";
import { LOADED_COUNT } from "./battle";

export const report: SceneSpecOf<"report"> = {
  kind: "report",
  theme: "paper",
  music: "resolve",
  exit: cut,
  shots: {
    ascent: {
      beats: 4,
      card: null,
      labels: {},
      cues: {
        rise: { at: 0, span: 4, sfx: "rise" },
        open: { at: 0, span: 1 },
        cover: { at: 2, span: 2, sfx: "wipe" },
      },
    },
    sheet: {
      beats: 16,
      music: "report",
      card: {
        lines: ["THE REPORT SHOWS EVIDENCE", "AND REMAINING RISKS."],
        source: quote("skills/mako/SKILL.md", "Report the result, verification, remaining risks, and delivery state."),
      },
      labels: {
        page: "REPORT",
        heading: "GOAL COMPLETE",
        result: "RESULT",
        verification: "VERIFICATION",
        conditionsProven: "CONDITIONS PROVEN",
        risks: "REMAINING RISKS",
        delivery: "DELIVERY",
        local: "LOCAL",
        published: "PUBLISHED",
        merged: "MERGED",
      },
      cues: {
        rule: { at: 0, span: 1 },
        rows: { at: 1, sfx: "tally", repeat: { count: 4, every: 1.5 } },
        chips: { at: 6, repeat: { count: 3, every: 0.25 } },
      },
    },
    stamp: {
      beats: 8,
      card: null,
      labels: { verified: "VERIFIED", tag: "EXAMPLE RUN", loaded: "SKILLS LOADED" },
      cues: {
        stamp: { at: 0, sfx: "stamp" },
        line: { at: 1 },
        count: { at: 2, sfx: "slot", repeat: { count: LOADED_COUNT, every: 0.25 } },
      },
    },
  },
  props: { delivered: "local" },
};
