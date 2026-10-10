import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Console, Effect, Runtime } from "effect";
import { Command } from "effect/cli";
import { explorerCommand } from "../src/commands";
import { SkillIndex } from "../src/index/skill-index";
import { captureInto, temporaryRepo } from "./support";

/** Runs the command line as `src/cli.ts` does, and gives the exit code that the process would end with. */
const run = (root: string, ...words: readonly string[]) => {
  const printed: string[] = [];
  return Command.runWith(explorerCommand, { version: "0.0.0" })(words).pipe(
    Effect.provide(SkillIndex.layer(root)),
    Effect.provideService(Console.Console, captureInto(printed)),
    Effect.exit,
    Effect.map((exit) => {
      let code = -1;
      Runtime.defaultTeardown(exit, (exitCode) => {
        code = exitCode;
      });
      return { code, output: printed.join("\n") };
    }),
  );
};

describe("the commands", () => {
  it.effect("exit with 1 while the index is incomplete, and with 0 when it is complete", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;

      const noRecord = yield* run(root, "check");
      assert.strictEqual(noRecord.code, 1);
      assert.include(noRecord.output, "check failed\n  index/scan.json is missing or not readable. Run `npm run index`.");

      const indexed = yield* run(root, "index");
      assert.strictEqual(indexed.code, 0);
      const openTickets = yield* run(root, "check");
      assert.strictEqual(openTickets.code, 1);
      assert.include(openTickets.output, "check failed\n  Open tickets: 3. Run the judge command of each ticket.");

      for (const [, id] of indexed.output.matchAll(/npm run judge -- ([0-9a-f]+) </g)) {
        assert.strictEqual((yield* run(root, "judge", id ?? "", "runs")).code, 0);
      }
      const complete = yield* run(root, "check");
      assert.strictEqual(complete.code, 0);
      assert.isTrue(complete.output.endsWith("check ok  4 skills  10 relations  0 open  0 orphans  scan.json current"));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("say in one plain message why a judge command changed nothing, and exit with 1", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const id = /npm run judge -- ([0-9a-f]+) </.exec((yield* run(root, "index")).output)?.[1] ?? "";

      assert.deepStrictEqual(yield* run(root, "judge", id, "boundary", "--conditional"), {
        code: 1,
        output: "`--conditional` is not legal with `boundary`. It is legal only with `handoff`, `runs`, and `requires`. No file changed.",
      });
      assert.deepStrictEqual(yield* run(root, "judge", "ffffffff", "runs"), {
        code: 1,
        output: "Ticket ffffffff is not current. No file changed. The text changed after the report, or the id is wrong. Run `npm run index` to print the current tickets.",
      });
      const judged = yield* run(root, "judge", id, "runs", "--conditional");
      assert.deepStrictEqual([judged.code, judged.output.split("\n")[0]], [0, `judged ${id}  playbook:build > skill:alpha  runs, conditional`]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
