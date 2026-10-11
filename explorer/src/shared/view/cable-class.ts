import { Answer, MechanicalKind, type EdgeKind, type Relation } from "../model";

export const CABLE_CLASSES = ["flow", "cite", "reads", "aside", "avoid", "unjudged"] as const;
export type CableClass = (typeof CABLE_CLASSES)[number];

export const classOf = (kind: EdgeKind): CableClass => {
  switch (kind) {
    case "route":
    case "trigger":
    case "runs":
    case "requires":
    case "handoff":
      return "flow";
    case "applies-principle":
      return "cite";
    case "reads":
    case "artifact-path":
      return "reads";
    case "see-also":
      return "aside";
    case "boundary":
      return "avoid";
    case "mentions":
      return "unjudged";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
};

export const WEIGHTS = ["strong", "light"] as const;
export type Weight = (typeof WEIGHTS)[number];

export const weightOf = (cls: CableClass): Weight => (cls === "flow" ? "strong" : "light");

/** The name of a kind in the Key. */
export const wordOf = (kind: EdgeKind): string => kind.replace(/-principle$/, "").replaceAll("-", " ");

const drawnKinds: readonly EdgeKind[] = [
  ...MechanicalKind.literals,
  ...Answer.literals.filter((answer): answer is Exclude<Answer, "none"> => answer !== "none"),
  "mentions",
];

export const LEGEND: readonly { readonly cls: CableClass; readonly kinds: readonly EdgeKind[] }[] = CABLE_CLASSES.map((cls) => ({
  cls,
  kinds: drawnKinds.filter((kind) => classOf(kind) === cls),
}));

export const isShown = (relation: Relation, muted: ReadonlySet<CableClass>): boolean => !muted.has(classOf(relation.kinds[0]));
