import { NodeRuntime } from "@effect/platform-node";
import { SkillIndex } from "../index/skill-index";
import { failWith } from "../reported-failure";
import { PORT, portFrom } from "../shared/address";
import { serve } from "./server";

const choice = portFrom({ name: "EXPLORER_PORT", value: process.env["EXPLORER_PORT"], fallback: PORT });

(choice.kind === "ok" ? serve({ port: choice.port, skills: SkillIndex.layerRepository }) : failWith(choice.message)).pipe(NodeRuntime.runMain);
