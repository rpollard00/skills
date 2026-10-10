export type TitleContract = {
  readonly shots: {
    readonly boot: { readonly cues: "open"; readonly labels: "plateId" | "plateName" | "plateState" };
    readonly mark: {
      readonly cues: "stamp" | "card" | "menu" | "confirm";
      readonly labels: "kind" | "role" | "newGame" | "continue";
    };
  };
  readonly props: Record<string, never>;
};
