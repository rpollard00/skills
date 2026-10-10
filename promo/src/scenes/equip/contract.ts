import type { SkillKind } from "../../catalog";

export type EquipContract = {
  readonly shots: {
    readonly bag: {
      readonly cues: "open" | "fill" | "legend";
      readonly labels: "playbookTitle" | "skillsTitle" | "plateId";
    };
    readonly slot: { readonly cues: "first" | "second" | "third"; readonly labels: "loaded" };
    readonly triggers: {
      readonly cues: "rings" | "dim" | "bands";
      readonly labels: "onTrigger";
    };
  };
  readonly props: {
    readonly slots: number;
    readonly columns: number;
    readonly bands: number;
    readonly legend: readonly { readonly kind: SkillKind; readonly text: string }[];
    readonly pickLead: number;
    readonly landing: number;
  };
};
