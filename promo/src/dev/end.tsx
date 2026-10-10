import { registerRoot } from "remotion";
import { End } from "../scenes/end/End";
import { sceneRoot } from "./root";

registerRoot(sceneRoot("end", End));
