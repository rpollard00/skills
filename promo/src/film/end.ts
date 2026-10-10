import { ENTRY_POINTS } from "../catalog";
import { cut, quote, type SceneSpecOf } from "../timeline";

const url = "github.com/rpollard00/skills";
const charsPerHit = 2;

export const end: SceneSpecOf<"end"> = {
  kind: "end",
  theme: "paper",
  music: "outro",
  exit: cut,
  shots: {
    entry: {
      beats: 8,
      card: {
        lines: ["MAKO INSTRUCTS.", "IT DOES NOT ENFORCE."],
        source: quote("README.md", "it does not add runtime mission enforcement"),
      },
      labels: { plateId: "PL. 00", plateName: "THE WELL", plateState: "DAY", heading: "NEW GAME" },
      cues: {
        stamp: { at: 0, sfx: "stamp" },
        rows: { at: 1, sfx: "cursor", repeat: { count: ENTRY_POINTS.length, every: 1 } },
        url: { at: 4.5, sfx: "type", repeat: { count: Math.ceil(url.length / charsPerHit), every: 0.25 } },
      },
    },
    card: {
      beats: 12,
      card: {
        lines: ["OWN THE GOAL THROUGH", "VERIFIED COMPLETION."],
        source: quote("skills/mako/SKILL.md", "Own the goal through verified completion."),
      },
      labels: {},
      cues: { card: { at: 0, sfx: "window" } },
    },
  },
  props: { url, charsPerHit },
};
