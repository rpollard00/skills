import { registerRoot } from "remotion";
import { Playbooks } from "../scenes/playbooks/Playbooks";
import { sceneRoot } from "./root";

registerRoot(sceneRoot("playbooks", Playbooks));
