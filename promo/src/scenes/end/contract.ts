export type EndContract = {
  readonly shots: {
    readonly entry: { readonly cues: "stamp" | "rows" | "url"; readonly labels: "plateId" | "plateName" | "plateState" | "heading" };
    readonly card: { readonly cues: "card"; readonly labels: never };
  };
  readonly props: {
    readonly url: string;
    readonly charsPerHit: number;
  };
};
