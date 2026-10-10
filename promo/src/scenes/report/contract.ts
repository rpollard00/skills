export type ReportContract = {
  readonly shots: {
    readonly ascent: { readonly cues: "rise" | "open" | "cover"; readonly labels: never };
    readonly sheet: {
      readonly cues: "rule" | "rows" | "chips";
      readonly labels:
        | "page"
        | "heading"
        | "result"
        | "verification"
        | "conditionsProven"
        | "risks"
        | "delivery"
        | "local"
        | "published"
        | "merged";
    };
    readonly stamp: { readonly cues: "stamp" | "line" | "count"; readonly labels: "verified" | "tag" | "loaded" };
  };
  readonly props: {
    readonly delivered: "local" | "published" | "merged";
  };
};
