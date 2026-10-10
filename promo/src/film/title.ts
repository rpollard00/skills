import { cut, quote, type SceneSpecOf } from "../timeline";

export const title: SceneSpecOf<"title"> = {
  kind: "title",
  theme: "dark",
  music: "well",
  exit: cut,
  shots: {
    boot: {
      beats: 4,
      card: null,
      labels: { plateId: "PL. 00", plateName: "THE WELL", plateState: "NIGHT" },
      cues: { open: { at: 0, span: 4, sfx: "boot" } },
    },
    mark: {
      beats: 12,
      card: {
        lines: ["OWN THE GOAL THROUGH", "VERIFIED COMPLETION."],
        source: quote("skills/mako/SKILL.md", "Own the goal through verified completion."),
      },
      labels: { kind: "CODING-AGENT SKILL", role: "SOFTWARE-ENGINEERING ROUTER", newGame: "NEW GAME", continue: "CONTINUE" },
      cues: {
        stamp: { at: 0, sfx: "stamp" },
        card: { at: 1, sfx: "window" },
        menu: { at: 2, sfx: "cursor" },
        confirm: { at: 9, span: 1, sfx: "confirm" },
      },
    },
  },
  props: {},
};
