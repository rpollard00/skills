import { registerRoot } from "remotion";
import { Equip } from "../scenes/equip/Equip";
import { sceneRoot } from "./root";

registerRoot(sceneRoot("equip", Equip));
