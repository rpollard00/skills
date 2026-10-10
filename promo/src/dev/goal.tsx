import { registerRoot } from "remotion";
import { Goal } from "../scenes/goal/Goal";
import { sceneRoot } from "./root";

registerRoot(sceneRoot("goal", Goal));
