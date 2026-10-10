import { NodeRuntime } from "@effect/platform-node";
import { SkillIndex } from "../index/skill-index";
import { PORT } from "../shared/api";
import { serve } from "./server";

serve({ port: PORT, skills: SkillIndex.layerRepository }).pipe(NodeRuntime.runMain);
