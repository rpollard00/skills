import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import { explorerCommand } from "./commands";
import { SkillIndex } from "./index/skill-index";

/** A reader such as `head` can close the pipe before the report ends. The command still finishes with its own exit code. */
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code !== "EPIPE") throw error;
});

explorerCommand.pipe(
  Command.run({ version: "0.0.0" }),
  Effect.provide(SkillIndex.layerRepository.pipe(Layer.provideMerge(NodeServices.layer))),
  NodeRuntime.runMain,
);
