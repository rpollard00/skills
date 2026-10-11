import { NodeRuntime } from "@effect/platform-node";
import { SkillIndex } from "../index/skill-index";
import { failWith } from "../reported-failure";
import { PORT, portFrom, STOP_WHEN_INPUT_ENDS } from "../shared/address";
import { serve } from "./server";

if (process.argv.includes(STOP_WHEN_INPUT_ENDS)) process.stdin.once("end", () => process.exit(0)).resume();

const choice = portFrom({ name: "EXPLORER_PORT", value: process.env["EXPLORER_PORT"], fallback: PORT });

(choice.kind === "ok" ? serve({ port: choice.port, skills: SkillIndex.layerRepository }) : failWith(choice.message)).pipe(NodeRuntime.runMain);
