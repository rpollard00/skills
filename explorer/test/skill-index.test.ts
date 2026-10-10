import nodePath from "node:path";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Fiber, FileSystem, Layer, PlatformError } from "effect";
import { TestClock } from "effect/testing";
import { readCorpus } from "../src/index/corpus";
import { isComplete, renderReport } from "../src/index/report";
import { canonicalJudgments, EMPTY_JUDGMENTS } from "../src/index/skill-index";
import { indexAt, snapshotOf, temporaryRepo } from "./support";

const ALPHA = ["skills", "alpha", "SKILL.md"] as const;

const edit = (root: string, file: readonly string[], change: (text: string) => string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const target = nodePath.join(root, ...file);
    yield* fs.writeFileString(target, change(yield* fs.readFileString(target)));
  });

const readIndexFile = (root: string, name: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(nodePath.join(root, "explorer", "index", name)).pipe(Effect.orElseSucceed(() => null));
  });

const judgeAll = (skills: Effect.Success<ReturnType<typeof indexAt>>) =>
  Effect.gen(function* () {
    const { state } = yield* skills.check;
    yield* Effect.forEach(state.tickets, (ticket) => skills.judge({ ticket: ticket.id, kind: "runs", conditional: false }));
  });

describe("SkillIndex on a temporary copy of the fixture repository", () => {
  it.effect("writes identical bytes on a second refresh, and writes nothing below skills/", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const skillFiles = yield* snapshotOf(nodePath.join(root, "skills"));

      const first = yield* skills.refresh({ prune: false });
      const firstBytes = yield* readIndexFile(root, "scan.json");
      const second = yield* skills.refresh({ prune: false });
      const secondBytes = yield* readIndexFile(root, "scan.json");

      assert.deepStrictEqual<unknown>([first.kind === "index" && first.written, second.kind === "index" && second.written], [true, false]);
      assert.isNotNull(firstBytes);
      assert.strictEqual(secondBytes, firstBytes);
      assert.notInclude(firstBytes ?? "", root);
      assert.deepStrictEqual<unknown>(yield* snapshotOf(nodePath.join(root, "skills")), skillFiles);
      assert.deepStrictEqual<unknown>((yield* snapshotOf(nodePath.join(root, "explorer", "index"))), { "scan.json": firstBytes });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("fails check while a ticket is open, after a file edit, and passes again after refresh", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);

      yield* skills.refresh({ prune: false });
      const open = yield* skills.check;
      assert.deepStrictEqual<unknown>(
        open.state.tickets.map((ticket) => `${ticket.from}>${ticket.to}`),
        ["playbook:build>skill:alpha", "playbook:build>skill:beta", "skill:alpha>skill:beta"],
      );
      assert.isFalse(isComplete(open.state));

      yield* judgeAll(skills);
      assert.isTrue(isComplete((yield* skills.check).state));

      yield* edit(root, ["skills", "beta", "SKILL.md"], (text) => `${text}\nOne more sentence.\n`);
      const behind = yield* skills.check;
      assert.isFalse(isComplete(behind.state));
      assert.deepStrictEqual<unknown>(behind.state.record, { kind: "behind", added: [], changed: ["skill:beta"], removed: [] });
      assert.deepStrictEqual<unknown>(behind.state.tickets, []);

      yield* skills.refresh({ prune: false });
      assert.isTrue(isComplete((yield* skills.check).state));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("prints, for each open ticket, its evidence and a command that closes it", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const printed = renderReport(yield* skills.refresh({ prune: false }));

      assert.include(
        printed,
        [
          "scan   4 skills  1 playbook  1 hosted file  10 relations   +6 added  ~0 changed  -0 removed",
          "       added    hosted:skills/router/references/execution.md, playbook:build, skill:alpha, skill:beta, skill:principle-keep-small, skill:router",
          "wrote  index/scan.json",
        ].join("\n"),
      );
      assert.include(
        printed,
        [
          "kind     skill:alpha > skill:beta  new",
          "            to: Fixture skill with no outbound reference.",
          "            skills/alpha/SKILL.md:13 › Alpha",
          "            | If the fix crosses a boundary, apply `beta`.",
        ].join("\n"),
      );
      assert.include(printed, "            skills/router/playbooks/build.md:5 › Build\n            | Run `alpha` over the change.");
      assert.notInclude(printed, "judged");

      const commands = [...printed.matchAll(/npm run judge -- ([0-9a-f]{8}) <([a-z|-]+)> \[--conditional\]/g)];
      assert.strictEqual(commands.length, 3);
      assert.strictEqual(commands[0]?.[2], "none|boundary|handoff|runs|requires|see-also");
      for (const command of commands) yield* skills.judge({ ticket: command[1] ?? "", kind: "handoff", conditional: true });

      const done = renderReport(yield* skills.check);
      assert.isTrue(done.endsWith("check ok  4 skills  10 relations  0 open  0 orphans  scan.json current"));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("reopens exactly the pair whose judged evidence block was edited", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      yield* skills.refresh({ prune: false });
      yield* judgeAll(skills);

      yield* edit(root, ALPHA, (text) => text.replace("crosses a boundary", "crosses a module boundary"));
      const { state } = yield* skills.refresh({ prune: false });
      assert.deepStrictEqual<unknown>(
        state.tickets.map((ticket) => [`${ticket.from}>${ticket.to}`, ticket.status]),
        [["skill:alpha>skill:beta", { kind: "changed", was: { kind: "runs", conditional: false } }]],
      );
      assert.deepStrictEqual<unknown>(state.orphans, []);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("rejects a stale or unknown ticket and changes no byte", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      yield* skills.refresh({ prune: false });
      const tickets = (yield* skills.check).state.tickets;
      const stale = tickets.find((ticket) => ticket.from === "skill:alpha");
      const kept = tickets.find((ticket) => ticket.to === "skill:alpha");
      assert.isDefined(stale);
      assert.isDefined(kept);

      yield* skills.judge({ ticket: kept?.id ?? "", kind: "requires", conditional: true });
      yield* skills.judge({ ticket: stale?.id ?? "", kind: "runs", conditional: false });
      const before = yield* snapshotOf(nodePath.join(root, "explorer", "index"));
      assert.include(before["judgments.json"], '"kind":"requires","conditional":true');

      yield* edit(root, ALPHA, (text) => text.replace("crosses a boundary", "crosses a module boundary"));
      const openStale = yield* skills.judge({ ticket: stale?.id ?? "", kind: "handoff", conditional: false }).pipe(Effect.flip);
      const unknown = yield* skills.judge({ ticket: "ffffffff", kind: "runs", conditional: false }).pipe(Effect.flip);

      assert.deepStrictEqual<unknown>([openStale._tag, unknown._tag], ["TicketNotCurrent", "TicketNotCurrent"]);
      assert.deepStrictEqual<unknown>(yield* snapshotOf(nodePath.join(root, "explorer", "index")), before);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("replaces the record when an answered ticket is answered again", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const ticket = (yield* skills.refresh({ prune: false })).state.tickets.find((open) => open.from === "skill:alpha");
      assert.isDefined(ticket);
      const id = ticket?.id ?? "";

      const first = yield* skills.judge({ ticket: id, kind: "runs", conditional: true });
      assert.strictEqual(renderReport(first).split("\n")[0], `judged ${id}  skill:alpha > skill:beta  runs, conditional`);
      assert.deepStrictEqual<unknown>(first.state.judged.map((judged) => [judged.id, judged.status]), [
        [id, { kind: "judged", answer: { kind: "runs", conditional: true } }],
      ]);

      const second = yield* skills.judge({ ticket: id, kind: "requires", conditional: false });
      assert.strictEqual(renderReport(second).split("\n")[0], `revised ${id}  skill:alpha > skill:beta  runs, conditional -> requires`);
      assert.strictEqual(second.state.tickets.length, first.state.tickets.length);

      const stored = yield* readIndexFile(root, "judgments.json");
      assert.strictEqual(stored?.match(/"from":"skill:alpha","to":"skill:beta"/g)?.length, 1);
      assert.include(stored ?? "", '"from":"skill:alpha","to":"skill:beta","kind":"requires","conditional":false');
      const relation = (yield* skills.live).relations.find((drawn) => drawn.from === "skill:alpha" && drawn.to === "skill:beta");
      assert.deepStrictEqual<unknown>([relation?.kinds, relation?.ticket], [["requires"], id]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("lists every judged pair in the ticket layout when asked, and not otherwise", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const ticket = (yield* skills.refresh({ prune: false })).state.tickets.find((open) => open.from === "skill:alpha");
      yield* skills.judge({ ticket: ticket?.id ?? "", kind: "runs", conditional: true });

      const report = yield* skills.refresh({ prune: false });
      assert.notInclude(renderReport(report), "judged");
      assert.include(
        renderReport(report, { judged: true }),
        [
          "judged 1",
          `  ${ticket?.id ?? ""}  kind     skill:alpha > skill:beta  judged: runs, conditional`,
          "            to: Fixture skill with no outbound reference.",
          "            skills/alpha/SKILL.md:13 › Alpha",
          "            | If the fix crosses a boundary, apply `beta`.",
          `            npm run judge -- ${ticket?.id ?? ""} <none|boundary|handoff|runs|requires|see-also> [--conditional]`,
          "orphans 0",
        ].join("\n"),
      );
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("rejects conditional with none, boundary, or see-also and changes no byte", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const tickets = (yield* skills.refresh({ prune: false })).state.tickets;
      const [first, second] = tickets;
      yield* skills.judge({ ticket: first?.id ?? "", kind: "runs", conditional: true });
      const before = yield* snapshotOf(nodePath.join(root, "explorer", "index"));

      for (const kind of ["none", "boundary", "see-also"] as const) {
        const onOpen = yield* skills.judge({ ticket: second?.id ?? "", kind, conditional: true }).pipe(Effect.flip);
        const onJudged = yield* skills.judge({ ticket: first?.id ?? "", kind, conditional: true }).pipe(Effect.flip);
        assert.deepStrictEqual<unknown>([onOpen._tag, onJudged._tag], ["ConditionalNotAllowed", "ConditionalNotAllowed"]);
        assert.deepStrictEqual<unknown>(onOpen._tag === "ConditionalNotAllowed" ? [onOpen.kind, onOpen.allowed] : null, [kind, ["handoff", "runs", "requires"]]);
      }
      assert.deepStrictEqual<unknown>(yield* snapshotOf(nodePath.join(root, "explorer", "index")), before);

      yield* skills.judge({ ticket: second?.id ?? "", kind: "boundary", conditional: false });
      assert.strictEqual((yield* skills.check).state.tickets.length, tickets.length - 2);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("opens the ticket of a stored record with an illegal combination as invalid, and fails check until it is answered", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      yield* skills.refresh({ prune: false });
      yield* judgeAll(skills);
      assert.isTrue(isComplete((yield* skills.check).state));

      const file = nodePath.join(root, "explorer", "index", "judgments.json");
      const stored = yield* fs.readFileString(file);
      const record = '"from":"skill:alpha","to":"skill:beta","kind":"runs","conditional":false';
      assert.include(stored, record);
      yield* fs.writeFileString(file, stored.replace(record, '"from":"skill:alpha","to":"skill:beta","kind":"boundary","conditional":true'));

      const failed = yield* skills.check;
      assert.isFalse(isComplete(failed.state));
      assert.deepStrictEqual<unknown>(failed.state.tickets.map((ticket) => [`${ticket.from}>${ticket.to}`, ticket.status]), [
        ["skill:alpha>skill:beta", { kind: "invalid", was: { kind: "boundary", conditional: true } }],
      ]);
      const printed = renderReport(failed);
      assert.include(printed, "kind     skill:alpha > skill:beta  invalid; was: boundary, conditional");
      assert.include(printed, "check failed\n  Open tickets: 1.");

      yield* skills.judge({ ticket: failed.state.tickets[0]?.id ?? "", kind: "boundary", conditional: false });
      assert.isTrue(isComplete((yield* skills.check).state));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("counts the same relations in the index summary, in the check line, and in the live index", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const tickets = (yield* skills.refresh({ prune: false })).state.tickets;
      yield* Effect.forEach(tickets, (ticket, index) => skills.judge({ ticket: ticket.id, kind: index === 0 ? "none" : "runs", conditional: false }));

      const indexed = yield* skills.refresh({ prune: false });
      const checked = yield* skills.check;
      const live = yield* skills.live;
      assert.strictEqual(live.relations.length, 9);
      assert.deepStrictEqual<unknown>([indexed.state.counts.relations, checked.state.counts.relations], [9, 9]);
      assert.include(renderReport(indexed), "9 relations");
      assert.isTrue(renderReport(checked).endsWith("check ok  4 skills  9 relations  0 open  0 orphans  scan.json current"));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("names the nodes that were added, changed, and removed", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      yield* skills.refresh({ prune: false });

      yield* edit(root, ["skills", "router", "playbooks", "build.md"], (text) => `${text}\nOne more sentence.\n`);
      yield* fs.remove(nodePath.join(root, "skills", "principle-keep-small"), { recursive: true });
      for (let count = 0; count < 12; count += 1) {
        const name = `new-${String(count).padStart(2, "0")}`;
        yield* fs.makeDirectory(nodePath.join(root, "skills", name));
        yield* fs.writeFileString(nodePath.join(root, "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: New.\n---\n`);
      }

      const behind = renderReport(yield* skills.check);
      assert.include(behind, "index/scan.json is behind the files: 12 added, 1 changed, 1 removed. Run `npm run index`.");
      const printed = renderReport(yield* skills.refresh({ prune: false }));
      assert.include(
        printed,
        [
          "+12 added  ~1 changed  -1 removed",
          "       added    skill:new-00, skill:new-01, skill:new-02, skill:new-03, skill:new-04, skill:new-05, skill:new-06, skill:new-07, skill:new-08, skill:new-09, and 2 more",
          "       changed  playbook:build",
          "       removed  skill:principle-keep-small",
        ].join("\n"),
      );
      assert.include(behind, "       changed  playbook:build\n       removed  skill:principle-keep-small");
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("leaves no judgments file behind when the first judge call is rejected", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      yield* skills.judge({ ticket: "ffffffff", kind: "runs", conditional: false }).pipe(Effect.flip);
      assert.isNull(yield* readIndexFile(root, "judgments.json"));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("fails, and replaces nothing, when judgments.json cannot be read or does not decode", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const tickets = (yield* skills.refresh({ prune: false })).state.tickets;
      yield* skills.judge({ ticket: tickets[0]?.id ?? "", kind: "runs", conditional: false });
      const file = nodePath.join(root, "explorer", "index", "judgments.json");
      const answers = yield* fs.readFileString(file);
      const reasonsOfEveryCommand = Effect.all([
        Effect.flip(skills.check),
        Effect.flip(skills.live),
        Effect.flip(skills.refresh({ prune: false })),
        Effect.flip(skills.refresh({ prune: true })),
        Effect.flip(skills.judge({ ticket: tickets[1]?.id ?? "", kind: "runs", conditional: false })),
      ]).pipe(Effect.map((errors) => errors.map((error) => (error._tag === "IndexUnavailable" ? error.reason : error._tag))));

      yield* fs.chmod(file, 0o000);
      const unreadable = yield* reasonsOfEveryCommand;
      yield* fs.chmod(file, 0o644);
      assert.deepStrictEqual(unreadable, ["unreadable", "unreadable", "unreadable", "unreadable", "unreadable"]);
      assert.strictEqual(yield* fs.readFileString(file), answers);

      yield* fs.writeFileString(file, '{ "version": 1, "relations": [ { "from": "skill:alpha" } ] }\n');
      assert.deepStrictEqual(yield* reasonsOfEveryCommand, ["corrupt", "corrupt", "corrupt", "corrupt", "corrupt"]);
      assert.strictEqual(yield* fs.readFileString(file), '{ "version": 1, "relations": [ { "from": "skill:alpha" } ] }\n');
      assert.deepStrictEqual(Object.keys(yield* snapshotOf(nodePath.join(root, "explorer", "index"))), ["judgments.json", "scan.json"]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("turns a file that cannot be read into a defect of its skill, and scans the rest", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const clean = yield* skills.live;

      yield* fs.chmod(nodePath.join(root, "skills", "alpha", "references", "notes.md"), 0o000);
      yield* fs.chmod(nodePath.join(root, "skills", "router", "playbooks", "build.md"), 0o000);
      const partial = yield* skills.live;

      const defectsOf = (index: typeof partial) => Object.fromEntries(index.nodes.flatMap((node) => (node.kind === "skill" ? [[node.name, node.defects]] : [])));
      assert.deepStrictEqual<unknown>(defectsOf(clean), { alpha: [], beta: [], "principle-keep-small": [], router: [] });
      assert.deepStrictEqual<unknown>(defectsOf(partial), {
        alpha: ["`references/notes.md` cannot be read (PermissionDenied)."],
        beta: [],
        "principle-keep-small": [],
        router: ["`playbooks/build.md` cannot be read (PermissionDenied)."],
      });
      assert.deepStrictEqual(partial.nodes.map((node) => node.id), clean.nodes.map((node) => node.id));
      assert.isTrue(partial.relations.some((relation) => relation.from === "skill:alpha" && relation.to === "skill:beta"));
      assert.strictEqual((yield* skills.document("skills/alpha/references/notes.md").pipe(Effect.flip))._tag, "DocNotFound");
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("prunes orphans and only orphans", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      yield* judgeAll(skills);

      yield* edit(root, ALPHA, (text) => text.replace("If the fix crosses a boundary, apply `beta`.", "Removed."));
      const listed = yield* skills.refresh({ prune: false });
      assert.deepStrictEqual<unknown>(listed.state.orphans.map((orphan) => `${orphan.from}>${orphan.to}`), ["skill:alpha>skill:beta"]);
      assert.strictEqual((yield* readIndexFile(root, "judgments.json"))?.match(/"from"/g)?.length, 3);

      const pruned = yield* skills.refresh({ prune: true });
      assert.deepStrictEqual<unknown>(pruned.kind === "index" ? pruned.pruned.map((orphan) => `${orphan.from}>${orphan.to}`) : null, ["skill:alpha>skill:beta"]);
      assert.deepStrictEqual<unknown>(pruned.state.orphans, []);
      const kept = yield* readIndexFile(root, "judgments.json");
      assert.strictEqual(kept?.match(/"from"/g)?.length, 2);
      assert.notInclude(kept ?? "", '"from":"skill:alpha"');
      assert.isTrue(isComplete((yield* skills.check).state));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("never lets a dot directory, a dependency folder, or a symbolic link into the scan", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const clean = yield* skills.live;
      const cleanPaths = (yield* readCorpus(root)).files.map((file) => file.path);

      const trap = "---\nname: trap\ndescription: Private text.\n---\n\nRun `beta` and `alpha`.\n";
      for (const directory of [["alpha", ".artifacts", "pdf"], [".hidden"], ["alpha", "node_modules", "pkg"], ["alpha", "__pycache__"]]) {
        yield* fs.makeDirectory(nodePath.join(root, "skills", ...directory), { recursive: true });
        yield* fs.writeFileString(nodePath.join(root, "skills", ...directory, "SKILL.md"), trap);
      }
      yield* fs.writeFileString(nodePath.join(root, "skills", "beta", ".notes.md"), trap);
      yield* fs.symlink(nodePath.join(root, "skills", "alpha", "SKILL.md"), nodePath.join(root, "skills", "beta", "linked.md"));
      yield* fs.symlink(nodePath.join(root, "skills", "alpha"), nodePath.join(root, "skills", "alias"));

      assert.deepStrictEqual<unknown>((yield* readCorpus(root)).files.map((file) => file.path), cleanPaths);
      assert.include(cleanPaths, "skills/alpha/scripts/measure.sh");

      const trapped = yield* skills.live;
      assert.deepStrictEqual<unknown>(trapped.files, clean.files);
      assert.deepStrictEqual<unknown>(trapped.nodes, clean.nodes);
      assert.strictEqual(trapped.sourceDigest, clean.sourceDigest);
      assert.isTrue(clean.files.some((file) => file.path === "skills/alpha/SKILL.md"));
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("serves exactly the text files that the live scan lists, and refuses every other path", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const below = (...names: readonly string[]): string => nodePath.join(root, "skills", ...names);
      for (const directory of [["alpha", ".artifacts"], ["alpha", "node_modules", "pkg"], ["loose"]]) yield* fs.makeDirectory(below(...directory), { recursive: true });
      yield* fs.writeFileString(below("alpha", ".artifacts", "reference.md"), "Private text.\n");
      yield* fs.writeFileString(below("alpha", "node_modules", "pkg", "index.md"), "Vendored text.\n");
      yield* fs.writeFileString(below("loose", "notes.md"), "No skill owns this file.\n");
      yield* fs.writeFile(below("beta", "references", "picture.bin"), new Uint8Array([0xff, 0xfe, 0x00, 0xc3]));
      yield* fs.writeFileString(below("beta", "references", "windows.md"), "# Windows\r\n\r\nTwo lines.\r\n");
      yield* fs.symlink(below("alpha", "SKILL.md"), below("beta", "linked.md"));
      yield* fs.symlink(below("alpha"), below("alias"));

      const listed = (yield* skills.live).files;
      const served = yield* Effect.forEach(listed, (file) => Effect.result(skills.document(file.path)));
      assert.deepStrictEqual<unknown>(
        listed.flatMap((file, index) => (served[index]?._tag === "Success" ? [] : [file.path])),
        ["skills/beta/references/picture.bin"],
      );
      assert.deepStrictEqual<unknown>(
        served.flatMap((result) => (result._tag === "Success" ? [[result.success.path, result.success.sha256]] : [])),
        listed.filter((file) => file.path !== "skills/beta/references/picture.bin").map((file) => [file.path, file.sha256]),
      );
      assert.strictEqual((yield* skills.document("skills/alpha/scripts/measure.sh")).text, '#!/usr/bin/env bash\nwc -c "$1"\n');
      assert.strictEqual((yield* skills.document("skills/beta/references/windows.md")).text, "# Windows\n\nTwo lines.\n");

      const refused = [
        "skills/alpha/.artifacts/reference.md",
        "skills/alpha/node_modules/pkg/index.md",
        "skills/loose/notes.md",
        "skills/beta/linked.md",
        "skills/alias/SKILL.md",
        "skills/alpha/../alpha/SKILL.md",
        "skills/../docs/upstream-imports.json",
        "docs/upstream-imports.json",
        "skills/README.md",
        "skills/alpha",
        "skills/alpha/missing.md",
        nodePath.join(root, "skills", "alpha", "SKILL.md"),
        "/etc/hostname",
        "",
      ];
      const errors = yield* Effect.forEach(refused, (path) => skills.document(path).pipe(Effect.flip));
      assert.deepStrictEqual<unknown>(errors.map((error) => error._tag), refused.map(() => "DocNotFound"));
      assert.deepStrictEqual<unknown>(
        refused.filter((path) => listed.some((file) => file.path === path)),
        [],
      );
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("skips a file that vanished after the listing", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const vanished = nodePath.join("alpha", "references", "notes.md");
      const withAVanishedFile = Layer.effect(
        FileSystem.FileSystem,
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          return {
            ...fs,
            stat: (path: string) =>
              path.endsWith(vanished)
                ? Effect.fail(PlatformError.systemError({ _tag: "NotFound", module: "FileSystem", method: "stat", pathOrDescriptor: path }))
                : fs.stat(path),
          };
        }),
      );
      const whole = yield* (yield* indexAt(root)).live;
      const partial = yield* (yield* indexAt(root).pipe(Effect.provide(withAVanishedFile))).live;

      assert.deepStrictEqual<unknown>(
        whole.files.map((file) => file.path).filter((path) => !partial.files.some((file) => file.path === path)),
        ["skills/alpha/references/notes.md"],
      );
      assert.deepStrictEqual<unknown>(partial.nodes.flatMap((node) => (node.kind === "skill" ? node.defects : [])), []);
      assert.deepStrictEqual(partial.relations, whole.relations);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("fails when scan.json exists and cannot be read", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      yield* skills.refresh({ prune: false });
      const file = nodePath.join(root, "explorer", "index", "scan.json");

      yield* fs.chmod(file, 0o000);
      const reasons = yield* Effect.all([Effect.flip(skills.check), Effect.flip(skills.live), Effect.flip(skills.refresh({ prune: false }))]);
      yield* fs.chmod(file, 0o644);
      assert.deepStrictEqual<unknown>(reasons.map((error) => (error._tag === "IndexUnavailable" ? error.reason : error._tag)), ["unreadable", "unreadable", "unreadable"]);
      assert.deepStrictEqual<unknown>((yield* skills.check).state.record, { kind: "current" });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("prints a longer id for two tickets that share eight characters, and takes each start that names one pair", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      // Found by search over p0, p1, and so on: the ids of these two pairs start with the same 8 characters.
      for (const name of ["p14586", "p65633"]) {
        yield* fs.writeFileString(nodePath.join(root, "skills", "router", "playbooks", `${name}.md`), "Run `beta`.\n");
      }
      const skills = yield* indexAt(root);
      const tickets = (yield* skills.refresh({ prune: false })).state.tickets;
      const [first, second] = tickets.filter((ticket) => /^playbook:p\d+$/.test(ticket.from));
      assert.deepStrictEqual<unknown>(
        [first, second].map((ticket) => [ticket?.from, ticket?.id, ticket?.key.slice(0, 8)]),
        [["playbook:p14586", "b2a054322", "b2a05432"], ["playbook:p65633", "b2a05432f", "b2a05432"]],
      );
      assert.deepStrictEqual<unknown>(tickets.filter((ticket) => ticket !== first && ticket !== second).map((ticket) => ticket.id.length), [8, 8, 8]);

      const ambiguous = yield* skills.judge({ ticket: "b2a05432", kind: "runs", conditional: false }).pipe(Effect.flip);
      assert.deepStrictEqual<unknown>(ambiguous._tag === "TicketAmbiguous" ? ambiguous.candidates : ambiguous._tag, [
        { key: first?.key, from: "playbook:p14586", to: "skill:beta" },
        { key: second?.key, from: "playbook:p65633", to: "skill:beta" },
      ]);
      const tooShort = yield* skills.judge({ ticket: (first?.key ?? "").slice(0, 7), kind: "runs", conditional: false }).pipe(Effect.flip);
      assert.strictEqual(tooShort._tag, "TicketNotCurrent");
      assert.isNull(yield* readIndexFile(root, "judgments.json"));

      yield* skills.judge({ ticket: "b2a054322", kind: "runs", conditional: false });
      yield* skills.judge({ ticket: second?.key ?? "", kind: "handoff", conditional: false });
      const revised = yield* skills.judge({ ticket: (second?.key ?? "").slice(0, 20), kind: "requires", conditional: false });
      assert.strictEqual(renderReport(revised).split("\n")[0], "revised b2a05432f  playbook:p65633 > skill:beta  handoff -> requires");

      const drawn = (yield* skills.live).relations.filter((relation) => /^playbook:p\d+$/.test(relation.from));
      assert.deepStrictEqual<unknown>(drawn.map((relation) => [relation.from, relation.kinds, relation.ticket]), [
        ["playbook:p14586", ["runs"], "b2a054322"],
        ["playbook:p65633", ["requires"], "b2a05432f"],
      ]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.live("stores every answer when three judge commands run at the same time", () =>
    Effect.gen(function* () {
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const tickets = (yield* skills.refresh({ prune: false })).state.tickets;
      assert.strictEqual(tickets.length, 3);

      for (const kind of ["runs", "requires", "handoff"] as const) {
        yield* Effect.all(tickets.map((ticket) => skills.judge({ ticket: ticket.id, kind, conditional: false })), { concurrency: "unbounded" });
        const stored = yield* readIndexFile(root, "judgments.json");
        assert.strictEqual(stored?.match(new RegExp(`"kind":"${kind}"`, "g"))?.length, 3, kind);
      }
      assert.deepStrictEqual(Object.keys(yield* snapshotOf(nodePath.join(root, "explorer", "index"))), ["judgments.json", "scan.json"]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("waits for the lock, and then fails with the name of the lock file and writes nothing", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* temporaryRepo;
      const skills = yield* indexAt(root);
      const ticket = (yield* skills.refresh({ prune: false })).state.tickets[0];
      const lockFile = nodePath.join(root, "explorer", "index", "judgments.json.lock");
      yield* fs.writeFileString(lockFile, "left by a command that stopped\n");

      // Each retry waits on the test clock after real file I/O, so the clock moves in steps while the commands run.
      const clock = yield* Effect.forkChild(
        Effect.forever(TestClock.adjust(50).pipe(Effect.andThen(Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 1)))))),
      );
      const judged = yield* Effect.flip(skills.judge({ ticket: ticket?.id ?? "", kind: "runs", conditional: false }));
      const pruned = yield* Effect.flip(skills.refresh({ prune: true }));
      yield* Fiber.interrupt(clock);

      assert.deepStrictEqual<unknown>([judged, pruned].map((error) => (error._tag === "JudgmentsLocked" ? error.lockFile : error._tag)), [
        "index/judgments.json.lock",
        "index/judgments.json.lock",
      ]);
      assert.isNull(yield* readIndexFile(root, "judgments.json"));
      assert.strictEqual(yield* fs.readFileString(lockFile), "left by a command that stopped\n");

      yield* fs.remove(lockFile);
      yield* skills.judge({ ticket: ticket?.id ?? "", kind: "runs", conditional: false });
      assert.deepStrictEqual(Object.keys(yield* snapshotOf(nodePath.join(root, "explorer", "index"))), ["judgments.json", "scan.json"]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it("starts from an empty judgment file in canonical form", () => {
    assert.strictEqual(canonicalJudgments(EMPTY_JUDGMENTS), '{\n  "version": 1,\n  "relations": []\n}\n');
  });
});
