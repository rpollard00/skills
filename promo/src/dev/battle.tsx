import { registerRoot } from "remotion";
import { Battle } from "../scenes/battle/Battle";
import { sceneRoot } from "./root";

registerRoot(sceneRoot("battle", Battle));
