export type GoalContract = {
  readonly shots: {
    readonly enter: { readonly cues: "open" | "type"; readonly labels: "title" | "tag" };
    readonly own: { readonly cues: "dialog" | "cut" | "accept"; readonly labels: "question" | "yes" | "no" | "accepted" };
  };
  readonly props: {
    readonly line: string;
    readonly charsPerHit: number;
  };
};
