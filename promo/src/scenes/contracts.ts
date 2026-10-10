import type { BattleContract } from "./battle/contract";
import type { EndContract } from "./end/contract";
import type { EquipContract } from "./equip/contract";
import type { GoalContract } from "./goal/contract";
import type { PlaybooksContract } from "./playbooks/contract";
import type { ReportContract } from "./report/contract";
import type { TitleContract } from "./title/contract";

const SCENE_KINDS = ["title", "goal", "playbooks", "equip", "battle", "report", "end"] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

export type ShotContract = { readonly cues: string; readonly labels: string };

export type SceneContract = {
  readonly shots: { readonly [shotId: string]: ShotContract };
  readonly props: object;
};

type Checked<T extends Record<SceneKind, SceneContract>> = T;

export type SceneContracts = Checked<{
  readonly title: TitleContract;
  readonly goal: GoalContract;
  readonly playbooks: PlaybooksContract;
  readonly equip: EquipContract;
  readonly battle: BattleContract;
  readonly report: ReportContract;
  readonly end: EndContract;
}>;
