import type { SceneFC } from "../useSceneClock";
import { Battle } from "./battle/Battle";
import type { SceneKind } from "./contracts";
import { End } from "./end/End";
import { Equip } from "./equip/Equip";
import { Goal } from "./goal/Goal";
import { Playbooks } from "./playbooks/Playbooks";
import { Report } from "./report/Report";
import { Title } from "./title/Title";

export const SCENES: { readonly [K in SceneKind]: SceneFC<K> } = {
  title: Title,
  goal: Goal,
  playbooks: Playbooks,
  equip: Equip,
  battle: Battle,
  report: Report,
  end: End,
};
