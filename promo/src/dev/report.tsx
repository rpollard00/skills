import { registerRoot } from "remotion";
import { Report } from "../scenes/report/Report";
import { sceneRoot } from "./root";

registerRoot(sceneRoot("report", Report));
