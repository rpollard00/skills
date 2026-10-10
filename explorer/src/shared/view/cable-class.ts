import { Answer, MechanicalKind, type EdgeKind, type Relation } from "../model";

/** One stroke pattern for each class. */
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

const drawnKinds: readonly EdgeKind[] = [
  ...MechanicalKind.literals,
  ...Answer.literals.filter((answer): answer is Exclude<Answer, "none"> => answer !== "none"),
  "mentions",
];

/** The kinds of each class, in the order of the lists in the model. */
export const LEGEND: readonly { readonly cls: CableClass; readonly kinds: readonly EdgeKind[] }[] = CABLE_CLASSES.map((cls) => ({
  cls,
  kinds: drawnKinds.filter((kind) => classOf(kind) === cls),
}));

/** A relation whose class the Key has switched off is absent from the map: no cable, and no node lit through it. */
export const isShown = (relation: Relation, muted: ReadonlySet<CableClass>): boolean => !muted.has(classOf(relation.kinds[0]));
