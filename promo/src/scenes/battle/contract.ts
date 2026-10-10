import type { ActorId, CommandId } from "../../battle";

export type BattleContract = {
  readonly shots: {
    readonly intro: {
      readonly cues: "plate" | "windows" | "goal" | "steps";
      readonly labels:
        | "plateId"
        | "auto"
        | "party"
        | "context"
        | "goal"
        | "work"
        | "loaded"
        | "proven"
        | "stateUnproven"
        | "stateProven"
        | "stateFailed";
    };
    readonly how: { readonly cues: "brief" | "read" | "findings"; readonly labels: "brief" | "findings" };
    readonly architect: { readonly cues: "wireframe" | "signature"; readonly labels: "notImplemented" };
    readonly conditions: { readonly cues: never; readonly labels: never };
    readonly build: { readonly cues: "trigger"; readonly labels: "trigger" };
    readonly review: { readonly cues: "trigger" | "scan"; readonly labels: "trigger" | "finding" | "fixed" };
    readonly claim: { readonly cues: "banner"; readonly labels: "done" | "victory" };
    readonly reject: {
      readonly cues: "bounce";
      readonly labels: "checkedBoxes" | "successfulBuild" | "delegateSummary" | "notProof";
    };
    readonly verify: { readonly cues: "terminal"; readonly labels: never };
    readonly fix: { readonly cues: "recheck"; readonly labels: never };
    readonly open: { readonly cues: "burst" | "stamp"; readonly labels: "verified" };
  };
  readonly props: {
    readonly commands: readonly { readonly id: CommandId; readonly label: string }[];
    readonly actors: Readonly<Record<ActorId, string>>;
    readonly signature: string;
    readonly terminal: readonly string[];
  };
};
