import { registerRoot } from "remotion";
import { Title } from "../scenes/title/Title";
import { sceneRoot } from "./root";

registerRoot(sceneRoot("title", Title));
