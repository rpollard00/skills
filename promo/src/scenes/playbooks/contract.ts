import type { PlaybookName } from "../../catalog";

export type PlaybooksContract = {
  readonly shots: {
    readonly list: {
      readonly cues: "open" | "scan" | "back";
      readonly labels: "title" | "detailTitle" | "plate";
    };
    readonly pick: {
      readonly cues: "lock" | "dim" | "grow" | "detail" | "pulse";
      readonly labels: never;
    };
  };
  readonly props: {
    readonly selected: PlaybookName;
    readonly detail: string;
    readonly detailStep: number;
    readonly plateEvery: number;
    readonly plateScale: { readonly list: number; readonly pick: number };
  };
};
