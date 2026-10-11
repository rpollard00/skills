/**
 * Writes the snapshot of `../skills` that the tests read:
 * `live-index.json`, the index as it is now, in the shape that `GET /api/index` returns, and `docs/`, the two files that the reader tests render.
 * A test that names a skill, a route, a file, or a count reads the snapshot and not the live skills, so an edit of `../skills` cannot fail it.
 * A refresh is a deliberate act: each list and each count in the tests that read the snapshot then needs a look.
 *
 * Usage, in `explorer/`: npx tsx test/fixtures/refresh-snapshot.ts
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import nodePath from "node:path";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Schema } from "effect";
import { SkillIndex } from "../../src/index/skill-index";
import { ExplorerIndex } from "../../src/shared/model";
import { SNAPSHOT_DOCS } from "./snapshot-docs";

const here = import.meta.dirname;
const LIVE_REPO = nodePath.resolve(here, "..", "..", "..");

// This file does not import `../support`: that module reads the snapshot when it loads, and a refresh must work when the snapshot is old or absent.
Effect.gen(function* () {
  const index = yield* (yield* SkillIndex).live;
  writeFileSync(nodePath.join(here, "live-index.json"), `${JSON.stringify(Schema.encodeSync(ExplorerIndex)(index))}\n`);
  mkdirSync(nodePath.join(here, "docs"), { recursive: true });
  for (const [name, path] of Object.entries(SNAPSHOT_DOCS)) copyFileSync(nodePath.join(LIVE_REPO, path), nodePath.join(here, "docs", name));
  yield* Effect.log(`Wrote ${index.nodes.length} nodes, ${index.routes.length} routes, ${index.relations.length} relations, and ${Object.keys(SNAPSHOT_DOCS).length} files to ${here}.`);
}).pipe(Effect.provide(SkillIndex.layer(LIVE_REPO)), Effect.provide(NodeServices.layer), NodeRuntime.runMain);
