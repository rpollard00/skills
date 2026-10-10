import nodePath from "node:path";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Schema } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { SkillIndex } from "../src/index/skill-index";
import { ExplorerHandlers } from "../src/server/server";
import { ExplorerApi } from "../src/shared/api";
import { ExplorerIndex } from "../src/shared/model";
import { indexAt, temporaryRepo } from "./support";

const clientFor = (root: string) =>
  HttpApiTest.groups(ExplorerApi, ["explorer"]).pipe(
    Effect.provide(Layer.mergeAll(ExplorerHandlers.pipe(Layer.provide(SkillIndex.layer(root))), HttpServer.layerServices)),
  );

describe("HTTP API on a temporary copy of the fixture repository", () => {
  it.effect("returns an index that the shared schema accepts", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const client = yield* clientFor(root);
      const index = yield* client.explorer.index();

      assert.isTrue(Schema.is(ExplorerIndex)(index));
      assert.deepStrictEqual<unknown>(
        index.nodes.map((node) => node.id),
        [
          "hosted:skills/router/references/execution.md",
          "playbook:build",
          "skill:alpha",
          "skill:beta",
          "skill:principle-keep-small",
          "skill:router",
        ],
      );
      assert.deepStrictEqual<unknown>(
        index.relations.map((relation) => `${relation.from}>${relation.to}=${relation.kinds.join("+")}`),
        [
          "playbook:build>hosted:skills/router/references/execution.md=reads",
          "playbook:build>skill:alpha=mentions",
          "playbook:build>skill:beta=mentions",
          "skill:alpha>hosted:skills/router/references/execution.md=reads",
          "skill:alpha>skill:beta=mentions",
          "skill:alpha>skill:principle-keep-small=applies-principle",
          "skill:router>playbook:build=route",
          "skill:router>skill:alpha=route",
          "skill:router>skill:beta=route+trigger",
          "skill:router>skill:principle-keep-small=trigger",
        ],
      );
      assert.deepStrictEqual<unknown>([index.open, index.orphans, index.record], [3, 0, { kind: "missing" }]);

      const openIds = (yield* (yield* indexAt(root)).check).state.tickets.map((ticket) => ticket.id);
      assert.deepStrictEqual<unknown>(index.relations.filter((relation) => relation.standing !== "mechanical").map((relation) => relation.ticket), openIds);
      assert.deepStrictEqual<unknown>(
        index.relations.filter((relation) => relation.standing === "mechanical").map((relation) => relation.ticket),
        [null, null, null, null, null, null, null],
      );
      const beta = index.nodes.find((node) => node.id === "skill:beta");
      assert.deepStrictEqual<unknown>(beta?.kind === "skill" ? [beta.origin, beta.modelInvocable] : null, [
        { kind: "imported", upstream: "kit", repository: "https://example.invalid/kit", revision: "0".repeat(40), source: "kit/skills/beta/SKILL.md" },
        true,
      ]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("reports the record as current after an index run, and as behind after a file edit", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const client = yield* clientFor(root);
      yield* (yield* indexAt(root)).refresh({ prune: false });
      assert.deepStrictEqual<unknown>((yield* client.explorer.index()).record, { kind: "current" });

      yield* fs.writeFileString(nodePath.join(root, "skills", "router", "playbooks", "build.md"), "### Build\n\nRun `alpha`.\n");
      yield* fs.makeDirectory(nodePath.join(root, "skills", "gamma"));
      yield* fs.writeFileString(nodePath.join(root, "skills", "gamma", "SKILL.md"), "---\nname: gamma\ndescription: New.\n---\n");
      yield* fs.remove(nodePath.join(root, "skills", "beta"), { recursive: true });

      const index = yield* client.explorer.index();
      assert.deepStrictEqual<unknown>(index.record, {
        kind: "behind",
        added: ["skill:gamma"],
        changed: ["playbook:build"],
        removed: ["skill:beta"],
      });
      assert.isTrue(index.nodes.some((node) => node.id === "skill:gamma"));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("returns a listed document, and a typed 404 for any other path", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const client = yield* clientFor(root);

      const document = yield* client.explorer.doc({ query: { path: "skills/router/playbooks/build.md" } });
      assert.isTrue(document.text.startsWith("### Build\n"));
      assert.match(document.sha256, /^[0-9a-f]{64}$/);

      for (const path of ["skills/alpha/missing.md", "skills/../docs/upstream-imports.json", "skills/README.md"]) {
        const error = yield* client.explorer.doc({ query: { path } }).pipe(Effect.flip);
        assert.strictEqual(error._tag, "DocNotFound");
        assert.strictEqual(error._tag === "DocNotFound" ? error.path : null, path);
      }
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
