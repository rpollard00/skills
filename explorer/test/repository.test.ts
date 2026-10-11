import nodePath from "node:path";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, FileSystem, Layer, PlatformError } from "effect";
import { indexAt, LIVE_REPO } from "./support";

const refuse = (method: string) => (path: string) =>
  Effect.fail(PlatformError.systemError({ _tag: "PermissionDenied", module: "FileSystem", method, pathOrDescriptor: path }));

/**
 * The real file system, with every change refused. It also hides the committed `scan.json`,
 * so that code which writes when the record is behind must try to write.
 */
const ReadOnlyFileSystem = Layer.effect(
  FileSystem.FileSystem,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return {
      ...fs,
      readFileString: (path: string, encoding?: string) =>
        path.endsWith(nodePath.join("index", "scan.json"))
          ? Effect.fail(PlatformError.systemError({ _tag: "NotFound", module: "FileSystem", method: "readFileString", pathOrDescriptor: path }))
          : fs.readFileString(path, encoding),
      writeFile: refuse("writeFile"),
      writeFileString: refuse("writeFileString"),
      rename: refuse("rename"),
      remove: refuse("remove"),
      makeDirectory: refuse("makeDirectory"),
    };
  }),
);

/** Read-only checks of the real repository. They hold for each content of `skills/`: no skill, no router, and no playbook is necessary. */
describe("the live repository", () => {
  it.effect("refuses every change, so this file cannot write to the repository", () =>
    Effect.gen(function* () {
      const skills = yield* indexAt(LIVE_REPO).pipe(Effect.provide(ReadOnlyFileSystem));
      const refreshed = yield* Effect.flip(skills.refresh({ prune: false }));
      const judged = yield* Effect.flip(skills.judge({ ticket: "ffffffff", kind: "runs", conditional: false }));
      assert.deepStrictEqual<unknown>(
        [refreshed, judged].map((error) => (error._tag === "IndexUnavailable" ? error.reason : error._tag)),
        ["unwritable", "unwritable"],
      );
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("keeps its invariants", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const index = yield* (yield* indexAt(LIVE_REPO).pipe(Effect.provide(ReadOnlyFileSystem))).live;
      const ids = index.nodes.map((node) => node.id as string);
      const known = new Set(ids);

      const directories = yield* fs.readDirectory(nodePath.join(LIVE_REPO, "skills"));
      const withEntry = yield* Effect.filter(directories, (name) =>
        fs.exists(nodePath.join(LIVE_REPO, "skills", name, "SKILL.md")).pipe(Effect.orElseSucceed(() => false)),
      );
      assert.deepStrictEqual(
        index.nodes.flatMap((node) => (node.kind === "skill" ? [node.name as string] : [])).sort(),
        [...withEntry].sort(),
      );

      // A skill with a `playbooks` directory is a router. The repository can have no such skill, and then it has no playbook.
      const playbooksOf = (skill: string) =>
        fs.readDirectory(nodePath.join(LIVE_REPO, "skills", skill, "playbooks")).pipe(
          Effect.orElseSucceed((): string[] => []),
          Effect.map((names) => names.filter((name) => name.endsWith(".md")).map((name) => `skills/${skill}/playbooks/${name}`)),
        );
      const playbooks = (yield* Effect.forEach(withEntry, playbooksOf)).flat();
      assert.deepStrictEqual(index.nodes.flatMap((node) => (node.kind === "playbook" ? [node.entry as string] : [])).sort(), playbooks.sort());
      assert.deepStrictEqual(
        index.nodes.flatMap((node) => (node.kind === "skill" && node.family === "router" ? [node.name as string] : [])).sort(),
        [...new Set(playbooks.map((path) => path.split("/")[1] ?? ""))].sort(),
        "the routers are the skills that have a playbook",
      );

      assert.strictEqual(known.size, ids.length, "a node id appears twice");
      assert.deepStrictEqual(index.relations.filter((relation) => !known.has(relation.from) || !known.has(relation.to)), []);
      assert.deepStrictEqual(index.relations.filter((relation) => relation.kinds.includes("reads") && !relation.to.startsWith("hosted:")), [], "a `reads` relation goes to a hosted file only, and thus never to a router");
      assert.deepStrictEqual(index.files.filter((file) => file.path.split("/").some((part) => part.startsWith("."))), []);
      assert.deepStrictEqual(index.files.filter((file) => !known.has(file.owner)), []);
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
