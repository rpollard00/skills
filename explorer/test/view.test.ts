import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { FOCUS } from "../src/shared/focus-layout";
import { toGraph, type Graph } from "../src/shared/graph";
import { layout } from "../src/shared/layout";
import { ExplorerIndex, NodeId, relationKey, RouteId } from "../src/shared/model";
import { CABLE_CLASSES, classOf, LEGEND } from "../src/shared/view/cable-class";
import { arrangementOf } from "../src/shared/view/arranged";
import { resolveCamera } from "../src/shared/view/camera";
import { findHits } from "../src/shared/view/finder";
import { decodeHash, encodeHash } from "../src/shared/view/hash";
import { opensNewEntry, showInAddress, type AddressBar } from "../src/shared/view/history";
import { portMarksOf } from "../src/shared/view/ports";
import { deriveScene, GLYPHS, type Scene } from "../src/shared/view/scene";
import { sentenceOf } from "../src/shared/view/sentence";
import { INITIAL, placeOf, stageTargetOf, type Place, type Stage, type ViewEvent, type ViewState } from "../src/shared/view/state";
import { step } from "../src/shared/view/step";
import { evidenceOfStrip } from "../src/shared/view/strip";
import { traceOf, type TraceStep } from "../src/shared/view/trace";
import { indexAt, LIVE_REPO, snapshotIndex } from "./support";

/** The skills as they are now, for a rule that holds for each content of `skills/`. */
const liveStage = Effect.gen(function* () {
  const index = yield* (yield* indexAt(LIVE_REPO)).live;
  return stageOf(toGraph(index));
}).pipe(Effect.provide(NodeServices.layer));

/** The skills as they were at the last refresh of the snapshot, for a test that names a skill, a route, a file, or a count. */
const snapshotStage = Effect.sync(() => stageOf(toGraph(snapshotIndex)));

const stageOf = (graph: Graph, viewport = { width: 1440, height: 826, reader: 460 }): Stage => ({ graph, placement: layout(graph), viewport });

const id = Schema.decodeUnknownSync(NodeId);
const routeId = Schema.decodeUnknownSync(RouteId);
const digest = "0".repeat(64);

const skill = (name: string, extra: object = {}): object => ({
  kind: "skill",
  id: `skill:${name}`,
  name,
  title: name,
  description: `The ${name} fixture.`,
  family: name === "router" ? "router" : name.startsWith("principle-") ? "principle" : "skill",
  modelInvocable: false,
  origin: { kind: "original" },
  entry: `skills/${name}/SKILL.md`,
  digest,
  tooling: { scripts: [], commands: [] },
  defects: [],
  ...extra,
});

const relation = (from: string, to: string, kind: string, line: number, extra: object = {}): object => ({
  from,
  to,
  kinds: [kind],
  conditional: false,
  standing: kind === "mentions" ? "unjudged" : "judged",
  ticket: kind === "route" || kind === "applies-principle" ? null : "0a1b2c3d",
  evidence: [
    {
      file: from.startsWith("playbook:") ? "skills/router/playbooks/build.md" : `skills/${from.split(":")[1]}/SKILL.md`,
      line,
      headings: ["Fixture", "Use"],
      rules: ["backtick"],
      text: `Line ${line} names \`${to.split(":")[1]}\`. A second sentence follows.`,
    },
  ],
  ...extra,
});

const fixture = toGraph(
  Schema.decodeUnknownSync(ExplorerIndex)({
    version: 1,
    sourceDigest: digest,
    nodes: [
      skill("router"),
      skill("alpha", { tooling: { scripts: [], commands: [{ name: "git", uses: 2 }] } }),
      skill("beta"),
      skill("gamma"),
      skill("principle-keep-small"),
      { kind: "playbook", id: "playbook:build", name: "build", title: "Build", purpose: "Build new behavior.", host: "skill:router", entry: "skills/router/playbooks/build.md", digest },
    ],
    routes: [
      { id: "build-new-behavior", task: "Build new behavior", file: "skills/router/SKILL.md", line: 10, playbook: "playbook:build", skills: [] },
      { id: "fix-a-defect", task: "Fix a defect", file: "skills/router/SKILL.md", line: 11, playbook: null, skills: ["skill:beta"] },
    ],
    triggers: [{ list: "index", condition: "Sizing a change", target: "skill:principle-keep-small", file: "skills/router/references/principles.md", line: 3 }],
    files: [
      { path: "skills/router/SKILL.md", owner: "skill:router", sha256: digest },
      { path: "skills/router/playbooks/build.md", owner: "playbook:build", sha256: digest },
      { path: "skills/alpha/SKILL.md", owner: "skill:alpha", sha256: digest },
      { path: "skills/beta/SKILL.md", owner: "skill:beta", sha256: digest },
    ],
    relations: [
      relation("skill:router", "playbook:build", "route", 10),
      relation("skill:router", "skill:beta", "route", 11),
      relation("playbook:build", "skill:beta", "runs", 9, { conditional: true }),
      relation("playbook:build", "skill:alpha", "requires", 4),
      relation("playbook:build", "skill:gamma", "boundary", 6),
      relation("playbook:build", "skill:principle-keep-small", "applies-principle", 7),
      relation("skill:alpha", "skill:beta", "mentions", 20),
      relation("skill:beta", "skill:alpha", "see-also", 30),
    ],
    open: 1,
    orphans: 0,
    record: { kind: "current" },
  }),
);
const small = stageOf(fixture);

const run = (stage: Stage, events: readonly ViewEvent[], from: ViewState = INITIAL): ViewState => events.reduce((state, event) => step(state, event, stage), from);

const tones = (scene: Scene): { [node: string]: string } => Object.fromEntries(scene.nodes.map((node) => [node.id, node.tone.kind]));

const traceSteps = (graph: Graph, route: string): readonly TraceStep[] => traceOf(graph, routeId(route))?.steps ?? [];

const positions = (scene: Scene): { [node: string]: string } => Object.fromEntries(scene.nodes.map((node) => [node.id, `${node.at.centre.x},${node.at.centre.y}`]));

describe("selection", () => {
  it.effect("lights what `architect` needs and what needs it, and dims the rest", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const architect = id("skill:architect");
      const state = run(stage, [{ kind: "picked", id: architect }]);
      const scene = deriveScene({ ...stage, state });
      const tone = tones(scene);

      const needs = new Set((stage.graph.out.get(architect) ?? []).map((item) => item.to));
      const neededBy = new Set((stage.graph.into.get(architect) ?? []).map((item) => item.from));
      assert.isAbove(needs.size, 5);
      assert.isAbove(neededBy.size, 3);
      assert.isTrue(needs.has(id("skill:how")) && neededBy.has(id("skill:bug-fix")), "the snapshot lost a relation that the map must show");

      for (const node of scene.nodes) {
        const expected =
          node.id === architect ? "selected" : needs.has(node.id) && neededBy.has(node.id) ? "mutual" : needs.has(node.id) ? "needs" : neededBy.has(node.id) ? "neededBy" : "dim";
        assert.strictEqual(tone[node.id], expected, node.id);
      }
      const lit = scene.cables.filter((cable) => cable.tone !== "weave");
      for (const cable of lit) {
        assert.strictEqual(cable.tone, cable.key.startsWith(`${architect}>`) ? "out" : "in", cable.key);
        assert.isTrue(cable.key.startsWith(`${architect}>`) || cable.key.endsWith(`>${architect}`), `${cable.key} is not a relation of the selection`);
      }
      const bothWays = [...needs].filter((node) => neededBy.has(node));
      assert.isAbove(bothWays.length, 0, "the snapshot lost the pair that goes both ways");
      assert.strictEqual(lit.filter((cable) => cable.tone === "out").length, needs.size);
      assert.strictEqual(lit.filter((cable) => cable.tone === "in").length, neededBy.size - bothWays.length, "a neighbour that goes both ways is on the right, and its relation back has no cable of its own");
      assert.deepStrictEqual<unknown>(lit.filter((cable) => cable.back !== null).map((cable) => cable.key.split(">")[1]).sort(), [...bothWays].sort());
      assert.deepStrictEqual<unknown>([scene.weave, scene.arranged], ["off", true]);
      assert.deepStrictEqual<unknown>(state.reading, { kind: "open", path: "skills/architect/SKILL.md", anchor: null, line: null, back: [] });

      for (const node of scene.nodes) {
        assert.strictEqual(node.offStage, tone[node.id] === "dim", `${node.id}: each node that is not a neighbour leaves the stage`);
        if (node.tone.kind !== "needs") continue;
        const cable = lit.find((item) => item.key === relationKey({ from: architect, to: node.id }));
        assert.strictEqual(node.tone.length, cable?.length, `${node.id} carries the length of the cable that lights it`);
      }
    }),
  );

  it("moves the selection and its neighbours into an arrangement, and reports the relation under the pointer", () => {
    const rest = deriveScene({ ...small, state: INITIAL });
    const state = run(small, [{ kind: "picked", id: id("skill:alpha") }, { kind: "pointed", hover: { kind: "node", id: id("skill:beta") } }]);
    const scene = deriveScene({ ...small, state });

    assert.deepStrictEqual<unknown>(scene.nodes.filter((node) => !node.offStage).map((node) => node.id), ["playbook:build", "skill:alpha", "skill:beta"], "the keyboard order: what needs it, the selection, what it needs");
    for (const node of scene.nodes) {
      const moved = positions(scene)[node.id] !== positions(rest)[node.id];
      assert.strictEqual(moved, !node.offStage, `${node.id}: a node on the stage moves, and a node that is off the stage stays at its seat`);
    }
    const home = deriveScene({ ...small, state: step(state, { kind: "deselected" }, small) });
    assert.deepStrictEqual<unknown>(positions(home), positions(rest), "a click on the empty stage sends each node to its seat");
    assert.isTrue(home.nodes.every((node) => node.at === small.placement.nodes.get(node.id) && !node.offStage));
    assert.deepStrictEqual<unknown>([home.arranged, home.weave], [false, "rest"]);

    assert.strictEqual(tones(scene)["skill:beta"], "mutual");
    assert.strictEqual(tones(scene)["playbook:build"], "neededBy");
    assert.strictEqual(scene.strip.kind, "evidence");
    if (scene.strip.kind !== "evidence") return;
    assert.deepStrictEqual<unknown>([scene.strip.from, scene.strip.to, scene.strip.sentence], ["alpha", "beta", "Line 20 names beta."]);
    assert.strictEqual(scene.strip.relation.ticket, "0a1b2c3d");
    assert.deepStrictEqual<unknown>(evidenceOfStrip(scene.strip), { file: "skills/alpha/SKILL.md", line: 20, headings: ["Fixture", "Use"], rules: ["backtick"], text: "Line 20 names `beta`. A second sentence follows." });
    assert.isTrue(scene.cables.find((cable) => cable.key === "skill:alpha>skill:beta" && cable.tone === "out")?.bright);
    assert.isNull(evidenceOfStrip(deriveScene({ ...small, state: INITIAL }).strip));

    const opened = step(state, { kind: "evidenceOpened", file: "skills/alpha/SKILL.md", line: 20 }, small);
    assert.deepStrictEqual<unknown>(opened.focus, { kind: "node", id: "skill:alpha" }, "the selection stays");
    assert.deepStrictEqual<unknown>(opened.reading.kind === "open" ? [opened.reading.path, opened.reading.line] : null, ["skills/alpha/SKILL.md", 20]);
    const fromNeighbour = step(state, { kind: "evidenceOpened", file: "skills/beta/SKILL.md", line: 30 }, small);
    assert.deepStrictEqual<unknown>(fromNeighbour.focus, { kind: "node", id: "skill:alpha" }, "the file of a neighbour opens beside the selection");
    assert.strictEqual(fromNeighbour.visit, state.visit + 1);
  });

  it("ends a hover on a cable when the focus changes, and keeps it while the focus is the same", () => {
    const key = relationKey({ from: id("skill:alpha"), to: id("skill:beta") });
    const hovering = run(small, [{ kind: "picked", id: id("skill:alpha") }, { kind: "pointed", hover: { kind: "cable", key } }]);

    assert.deepStrictEqual<unknown>(step(hovering, { kind: "inspected", key }, small).hover, { kind: "cable", key }, "the same focus keeps the cable lit");
    assert.deepStrictEqual<unknown>(run(small, [{ kind: "cleared" }, { kind: "cleared" }], hovering).hover, { kind: "none" });
    assert.deepStrictEqual<unknown>(step(hovering, { kind: "picked", id: id("skill:gamma") }, small).hover, { kind: "none" });
    assert.deepStrictEqual<unknown>(step(hovering, { kind: "traced", route: routeId("build-new-behavior") }, small).hover, { kind: "none" });

    const onNode = run(small, [{ kind: "picked", id: id("skill:alpha") }, { kind: "pointed", hover: { kind: "node", id: id("skill:beta") } }]);
    assert.deepStrictEqual<unknown>(step(onNode, { kind: "picked", id: id("skill:beta") }, small).hover, { kind: "node", id: "skill:beta" }, "the pointer is still on the node");
  });

  it("draws one mark for each port, and a bar where a `boundary` cable ends", () => {
    const alpha = deriveScene({ ...small, state: run(small, [{ kind: "picked", id: id("skill:alpha") }]) });
    const into = alpha.cables.filter((cable) => cable.tone === "in");
    const marks = portMarksOf(alpha.cables);

    assert.strictEqual(into.length, 1, "`beta` goes both ways, so its relation back has no cable of its own");
    assert.deepStrictEqual<unknown>(
      marks.map((mark) => [mark.tone, mark.cables.map((cable) => cable.key).sort(), mark.hasArrow, mark.hasBar]).sort(),
      [
        ["in", ["playbook:build>skill:alpha"], true, false],
        ["out", ["skill:alpha>skill:beta"], true, false],
      ],
    );

    const gamma = deriveScene({ ...small, state: run(small, [{ kind: "picked", id: id("skill:gamma") }]) });
    assert.deepStrictEqual<unknown>(portMarksOf(gamma.cables).map((mark) => [mark.hasArrow, mark.hasBar]), [[false, true]]);
    assert.deepStrictEqual<unknown>(portMarksOf(deriveScene({ ...small, state: INITIAL }).cables), [], "a resting cable has no mark");
  });

  it.effect("gives `architect` fewer port marks than cables, because cables into one port share one mark", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const scene = deriveScene({ ...stage, state: run(stage, [{ kind: "picked", id: id("skill:architect") }]) });
      const into = scene.cables.filter((cable) => cable.tone === "in");
      const marks = portMarksOf(scene.cables).filter((mark) => mark.tone === "in");

      assert.isAbove(into.length, 3);
      assert.isAtMost(marks.length, 2, "one port on the left and one on the right");
      assert.strictEqual(marks.reduce((total, mark) => total + mark.cables.length, 0), into.length);
    }),
  );

  it("names the router when it is the only node that loads the selection", () => {
    const scene = deriveScene({ ...small, state: run(small, [{ kind: "picked", id: id("playbook:build") }]) });
    assert.deepStrictEqual<unknown>(scene.strip, { kind: "onlyRouter", name: "build", router: "router", sentences: ["Build new behavior"], hidden: { kind: "none" } });

    const plain = deriveScene({ ...small, state: run(small, [{ kind: "picked", id: id("skill:gamma") }]) });
    assert.deepStrictEqual<unknown>(plain.strip, { kind: "purpose", name: "gamma", text: "The gamma fixture.", hidden: { kind: "none" } });
  });

  it.effect("gives a selected hosted file a row of its own, with the name of its host", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const file = stage.graph.index.nodes.find((node) => node.kind === "hosted");
      assert.isDefined(file);
      if (file === undefined || file.kind !== "hosted") return;
      const scene = deriveScene({ ...stage, state: run(stage, [{ kind: "picked", id: file.id }]) });
      const at = scene.nodes.find((node) => node.id === file.id)?.at;
      const host = stage.graph.nodes.get(file.host);

      assert.strictEqual(tones(scene)[file.id], "selected");
      assert.deepStrictEqual<unknown>(at?.kind === "row" ? [at.mirrored, at.centre.y, at.note] : null, [false, FOCUS.y, host?.kind === "skill" ? host.name : null], "the row of the selection, with its glyph on the left");
      assert.isAbove(scene.cables.filter((cable) => cable.tone === "in").length, 0);
      assert.strictEqual(scene.cables.filter((cable) => cable.tone === "out").length, 0, "a hosted file is a target only");
    }),
  );

  it.effect("says that only the router loads `bro` in the snapshot", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const strip = deriveScene({ ...stage, state: run(stage, [{ kind: "picked", id: id("skill:bro") }]) }).strip;
      assert.deepStrictEqual<unknown>(strip, { kind: "onlyRouter", name: "bro", router: "mako", sentences: ["User invokes bro"], hidden: { kind: "none" } });
    }),
  );
});

describe("trace", () => {
  it("gives the steps of the playbook in line order and skips `boundary`", () => {
    const steps = traceSteps(fixture, "build-new-behavior");

    assert.deepStrictEqual<unknown>(
      steps.map((item) => [item.n, item.node, item.evidence.line, item.conditional]),
      [
        [1, "skill:alpha", 4, false],
        [2, "skill:principle-keep-small", 7, false],
        [3, "skill:beta", 9, true],
      ],
    );
  });

  it("gives the named skills for a route without a playbook", () => {
    assert.deepStrictEqual<unknown>(
      traceSteps(fixture, "fix-a-defect").map((item) => [item.n, item.node, item.via]),
      [[1, "skill:beta", "skill:router>skill:beta"]],
    );
    assert.deepStrictEqual<unknown>(traceSteps(fixture, "no-such-route"), []);
  });

  it("numbers the steps, moves a cursor with the arrow keys, and follows in the reader", () => {
    const traced = run(small, [{ kind: "traced", route: routeId("build-new-behavior") }]);
    const start = deriveScene({ ...small, state: traced });

    assert.deepStrictEqual<unknown>(traced.reading, { kind: "open", path: "skills/router/playbooks/build.md", anchor: null, line: null, back: [] });
    assert.strictEqual(start.nodes.find((node) => node.id === "skill:router")?.tone.kind, "origin");
    assert.deepStrictEqual<unknown>(start.nodes.find((node) => node.id === "playbook:build")?.tone, { kind: "step", n: 0, order: 0, conditional: false });
    assert.deepStrictEqual<unknown>(start.nodes.find((node) => node.id === "skill:beta")?.tone, { kind: "step", n: 3, order: 3, conditional: true });
    assert.strictEqual(start.cursor, "playbook:build");
    assert.strictEqual(tones(start)["skill:gamma"], "dim");
    assert.deepStrictEqual<unknown>(
      start.cables.filter((cable) => cable.tone === "step").map((cable) => [cable.key, cable.order]).sort(),
      [
        ["playbook:build>skill:alpha", 1],
        ["playbook:build>skill:beta", 3],
        ["playbook:build>skill:principle-keep-small", 2],
        ["skill:router>playbook:build", 0],
      ],
    );

    const second = run(small, [{ kind: "stepped", by: 1 }, { kind: "stepped", by: 1 }], traced);
    assert.deepStrictEqual<unknown>(second.focus, { kind: "route", route: "build-new-behavior", cursor: 2 });
    assert.deepStrictEqual<unknown>(second.reading.kind === "open" ? [second.reading.path, second.reading.line] : null, ["skills/router/playbooks/build.md", 7]);
    const atSecond = deriveScene({ ...small, state: second });
    const strip = atSecond.strip;
    assert.deepStrictEqual<unknown>(strip.kind === "trace" ? [strip.task, strip.at, strip.total, strip.name] : null, ["Build new behavior", 2, 3, "principle-keep-small"]);
    assert.strictEqual(atSecond.cursor, "skill:principle-keep-small");
    assert.deepStrictEqual<unknown>(evidenceOfStrip(strip)?.line, 7);

    const end = run(small, [{ kind: "stepped", by: 1 }, { kind: "stepped", by: 1 }, { kind: "stepped", by: 1 }], second);
    assert.strictEqual(end.focus.kind === "route" ? end.focus.cursor : null, 3);
    assert.strictEqual(run(small, Array.from({ length: 9 }, (): ViewEvent => ({ kind: "stepped", by: -1 })), end).focus.kind === "route", true);
  });

  it("starts a route that has no playbook at once, with the cursor on the router", () => {
    const state = run(small, [{ kind: "traced", route: routeId("fix-a-defect") }]);
    const scene = deriveScene({ ...small, state });

    assert.deepStrictEqual<unknown>(
      scene.cables.filter((cable) => cable.tone === "step").map((cable) => [cable.key, cable.order]),
      [["skill:router>skill:beta", 0]],
      "the cable of the router leaves at order 0, and not after a first leg that this route does not have",
    );
    assert.deepStrictEqual<unknown>(scene.nodes.find((node) => node.id === "skill:beta")?.tone, { kind: "step", n: 1, order: 0, conditional: false });
    assert.strictEqual(scene.cursor, "skill:router");
    assert.strictEqual(deriveScene({ ...small, state: step(state, { kind: "stepped", by: 1 }, small) }).cursor, "skill:beta");
    assert.isNull(deriveScene({ ...small, state: INITIAL }).cursor);
  });

  it.effect("orders the perf-issue route of the snapshot by line and leaves out each boundary", () =>
    Effect.gen(function* () {
      const { graph } = yield* snapshotStage;
      const route = graph.index.routes.find((item) => item.task === "Diagnose and fix measured slowness");
      assert.isDefined(route);
      if (route === undefined || route.playbook === null) return;
      const steps = traceSteps(graph, route.id);
      const outbound = graph.out.get(route.playbook) ?? [];

      assert.isAbove(steps.length, 2);
      assert.deepStrictEqual<unknown>(steps.map((item) => item.n), steps.map((_, index) => index + 1));
      assert.deepStrictEqual<unknown>([...steps].sort((a, b) => a.evidence.line - b.evidence.line).map((item) => item.node), steps.map((item) => item.node));
      assert.strictEqual(steps.length, outbound.filter((item) => !item.kinds.includes("boundary")).length);
      assert.isTrue(steps.every((item) => !graph.relations.get(item.via)?.kinds.includes("boundary")));
      assert.isTrue(steps.some((item) => item.node === "skill:how"));
    }),
  );
});

describe("finder", () => {
  it("dims each node that does not match, and moves nothing", () => {
    const rest = deriveScene({ ...small, state: INITIAL });
    const scene = deriveScene({ ...small, state: run(small, [{ kind: "typed", query: "alp" }]) });

    assert.deepStrictEqual<unknown>(tones(scene), {
      "skill:router": "dim",
      "playbook:build": "dim",
      "skill:alpha": "match",
      "skill:beta": "dim",
      "skill:gamma": "dim",
      "skill:principle-keep-small": "dim",
    });
    assert.deepStrictEqual<unknown>(positions(scene), positions(rest));
    assert.deepStrictEqual<unknown>(scene.camera, rest.camera);
    assert.deepStrictEqual<unknown>(scene.nodes.find((node) => node.id === "skill:alpha")?.match, [0, 3]);
    assert.deepStrictEqual<unknown>(scene.hits, [{ kind: "node", id: id("skill:alpha"), field: "name" }]);
  });

  it("finds route tasks and trigger conditions, and lights their nodes", () => {
    assert.deepStrictEqual<unknown>(findHits(fixture, "new behav"), [
      { kind: "route", route: "build-new-behavior" },
      { kind: "node", id: "playbook:build", field: "description" },
    ]);
    assert.deepStrictEqual<unknown>(findHits(fixture, "SIZING"), [{ kind: "trigger", target: "skill:principle-keep-small", condition: "Sizing a change" }]);
    assert.deepStrictEqual<unknown>(findHits(fixture, "   "), []);

    const scene = deriveScene({ ...small, state: run(small, [{ kind: "typed", query: "defect" }]) });
    assert.strictEqual(tones(scene)["skill:beta"], "match");
  });

  it("says when nothing matches, and the map stays", () => {
    const scene = deriveScene({ ...small, state: run(small, [{ kind: "typed", query: "zzz" }]) });

    assert.deepStrictEqual<unknown>(scene.strip, { kind: "noMatch", query: "zzz" });
    assert.strictEqual(scene.nodes.length, 6);
    assert.isTrue(scene.nodes.every((node) => node.tone.kind === "dim"));
  });

  it.effect("finds the perf route from the word `slow` in the snapshot", () =>
    Effect.gen(function* () {
      const { graph } = yield* snapshotStage;
      const hits = findHits(graph, "slow");
      const routes = hits.flatMap((hit) => (hit.kind === "route" ? [graph.routes.get(hit.route)?.task] : []));
      assert.isTrue(routes.includes("Diagnose and fix measured slowness"));
    }),
  );
});

describe("lens and legend", () => {
  it("leaves only the skills with tooling lit, and unfolds their marks", () => {
    const scene = deriveScene({ ...small, state: run(small, [{ kind: "lensed", lens: "tools" }]) });

    assert.deepStrictEqual<unknown>(scene.nodes.filter((node) => node.tone.kind !== "dim").map((node) => node.id), ["skill:alpha"]);
    assert.deepStrictEqual<unknown>(scene.nodes.find((node) => node.id === "skill:alpha")?.chips.map((chip) => [chip.kind, chip.text]), [["command", "git"]]);
    assert.isTrue(deriveScene({ ...small, state: INITIAL }).nodes.every((node) => node.chips.length === 0));
  });

  it.effect("lights exactly the skills of the snapshot that have a script or a command", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const scene = deriveScene({ ...stage, state: run(stage, [{ kind: "lensed", lens: "tools" }]) });
      const tooled = stage.graph.index.nodes.flatMap((node) => (node.kind === "skill" && node.tooling.scripts.length + node.tooling.commands.length > 0 ? [node.id] : []));

      assert.isAbove(tooled.length, 3);
      assert.deepStrictEqual<unknown>(scene.nodes.filter((node) => node.tone.kind !== "dim").map((node) => node.id).sort(), [...tooled].sort());
    }),
  );

  it("hides a muted class and the nodes that only it reaches", () => {
    const state = run(small, [{ kind: "picked", id: id("skill:alpha") }, { kind: "legendToggled", cls: "unjudged" }]);
    const scene = deriveScene({ ...small, state });

    assert.isUndefined(scene.cables.find((cable) => cable.key === "skill:alpha>skill:beta"));
    assert.strictEqual(tones(scene)["skill:beta"], "neededBy");
    assert.deepStrictEqual<unknown>([...run(small, [{ kind: "legendToggled", cls: "unjudged" }], state).muted], []);
  });

  it("builds the legend from the lists in the model", () => {
    assert.deepStrictEqual<unknown>(LEGEND.map((row) => row.cls), [...CABLE_CLASSES]);
    assert.deepStrictEqual<unknown>(LEGEND.find((row) => row.cls === "flow")?.kinds, ["route", "trigger", "handoff", "runs", "requires"]);
    assert.strictEqual(classOf("mentions"), "unjudged");
    assert.isTrue(LEGEND.every((row) => row.kinds.length > 0));
  });
});

describe("a skill with a defect", () => {
  it("is marked, and the strip gives the defect when the skill has no description", () => {
    const broken = stageOf(
      toGraph({
        ...fixture.index,
        nodes: Schema.decodeUnknownSync(ExplorerIndex.fields.nodes)([
          ...fixture.index.nodes.filter((node) => node.id !== "skill:gamma"),
          skill("gamma", { description: "", defects: ["The file has no frontmatter."] }),
        ]),
      }),
    );
    const scene = deriveScene({ ...broken, state: run(broken, [{ kind: "pointed", hover: { kind: "node", id: id("skill:gamma") } }]) });

    assert.deepStrictEqual<unknown>(scene.nodes.filter((node) => node.defective).map((node) => node.id), ["skill:gamma"]);
    assert.deepStrictEqual<unknown>(scene.strip, { kind: "purpose", name: "gamma", text: "The file has no frontmatter.", hidden: { kind: "none" } });
  });
});

describe("the resting map", () => {
  it("draws no cable of the router and no `reads` cable until a node is in focus", () => {
    const scene = deriveScene({ ...small, state: INITIAL });

    assert.deepStrictEqual<unknown>(scene.cables.map((cable) => cable.tone), Array.from({ length: 6 }, () => "weave"));
    assert.isTrue(scene.cables.every((cable) => !cable.key.startsWith("skill:router>")));
    assert.strictEqual(scene.weave, "rest");
    assert.deepStrictEqual<unknown>(scene.nodes.map((node) => [node.id, node.glyph, node.mako]), [
      ["skill:router", "hub", "none"],
      ["playbook:build", "square", "none"],
      ["skill:alpha", "ring", "none"],
      ["skill:beta", "ring", "route"],
      ["skill:gamma", "ring", "none"],
      ["skill:principle-keep-small", "diamond", "none"],
    ]);
    assert.strictEqual(scene.strip.kind, "idle");
  });

  it("previews the relations of the node under the pointer without a change of focus", () => {
    const state = run(small, [{ kind: "pointed", hover: { kind: "node", id: id("skill:router") } }]);
    const scene = deriveScene({ ...small, state });

    assert.deepStrictEqual<unknown>(state.focus, { kind: "none" });
    assert.deepStrictEqual<unknown>(scene.cables.filter((cable) => cable.tone === "previewOut").map((cable) => cable.key), ["skill:router>playbook:build", "skill:router>skill:beta"]);
    assert.isTrue(scene.nodes.every((node) => node.tone.kind === "rest"));
    assert.deepStrictEqual<unknown>(scene.strip, { kind: "purpose", name: "router", text: "The router fixture.", hidden: { kind: "none" } });
  });

  it("rings the node of a name in the reader and brightens its cable from the selection, with no preview", () => {
    const state = run(small, [{ kind: "picked", id: id("skill:alpha") }, { kind: "pointed", hover: { kind: "ref", id: id("skill:beta") } }]);
    const scene = deriveScene({ ...small, state });
    const beta = scene.nodes.find((node) => node.id === "skill:beta");

    assert.deepStrictEqual<unknown>([beta?.ringing, beta?.hovered], [true, true]);
    assert.isTrue(scene.cables.find((cable) => cable.key === "skill:alpha>skill:beta" && cable.tone === "out")?.bright);
    assert.deepStrictEqual<unknown>(scene.cables.filter((cable) => cable.tone.startsWith("preview")), []);
  });
});

describe("Escape", () => {
  it("peels one layer for each press: the reader, the focus, then the query", () => {
    const full = run(small, [{ kind: "typed", query: "alp" }, { kind: "picked", id: id("skill:alpha") }]);
    const first = step(full, { kind: "cleared" }, small);
    const second = step(first, { kind: "cleared" }, small);
    const third = step(second, { kind: "cleared" }, small);

    assert.deepStrictEqual<unknown>([first.reading.kind, first.focus.kind, first.query], ["closed", "node", "alp"]);
    assert.deepStrictEqual<unknown>([second.reading.kind, second.focus.kind, second.query], ["closed", "none", "alp"]);
    assert.deepStrictEqual<unknown>([third.reading.kind, third.focus.kind, third.query], ["closed", "none", ""]);
    assert.strictEqual(step(third, { kind: "cleared" }, small), third);
  });
});

describe("reader history", () => {
  it("follows a link to the node that owns the file, and goes back", () => {
    const state = run(small, [
      { kind: "picked", id: id("skill:alpha") },
      { kind: "linkFollowed", path: "skills/beta/SKILL.md", anchor: "use", line: null },
      { kind: "inspected", key: relationKey({ from: id("playbook:build"), to: id("skill:alpha") }) },
    ]);

    assert.deepStrictEqual<unknown>(state.focus, { kind: "node", id: "skill:beta" });
    assert.deepStrictEqual<unknown>(state.reading, {
      kind: "open",
      path: "skills/router/playbooks/build.md",
      anchor: null,
      line: 4,
      back: ["skills/alpha/SKILL.md", "skills/beta/SKILL.md"],
    });

    const back = run(small, [{ kind: "wentBack" }, { kind: "wentBack" }], state);
    assert.deepStrictEqual<unknown>(back.focus, { kind: "node", id: "skill:alpha" });
    assert.deepStrictEqual<unknown>(back.reading, { kind: "open", path: "skills/alpha/SKILL.md", anchor: null, line: null, back: [] });
    assert.strictEqual(step(back, { kind: "wentBack" }, small), back);
  });

  it("counts each visit, so a second click on the same link, line, or cable scrolls again", () => {
    const first = run(small, [{ kind: "picked", id: id("skill:alpha") }]);
    const key = relationKey({ from: id("playbook:build"), to: id("skill:alpha") });
    const anchor: ViewEvent = { kind: "linkFollowed", path: "skills/alpha/SKILL.md", anchor: "use", line: null };
    const line: ViewEvent = { kind: "linkFollowed", path: "skills/alpha/SKILL.md", anchor: null, line: 12 };

    for (const event of [anchor, line, { kind: "inspected", key } satisfies ViewEvent]) {
      const once = step(first, event, small);
      const twice = step(once, event, small);
      assert.deepStrictEqual<unknown>(twice.reading, once.reading, "the target is the same");
      assert.strictEqual(twice.visit, once.visit + 1);
    }
    assert.strictEqual(first.visit, 1);
    assert.strictEqual(step(first, { kind: "pointed", hover: { kind: "none" } }, small).visit, 1);
    assert.strictEqual(step(first, { kind: "restored", place: placeOf(first) }, small).visit, 1, "a reload is not a visit: it takes no focus");
  });

  it("keeps the history in step with the Back button of the browser", () => {
    const first = run(small, [{ kind: "picked", id: id("skill:alpha") }, { kind: "picked", id: id("skill:beta") }]);
    assert.deepStrictEqual<unknown>(first.reading.kind === "open" ? first.reading.back : null, ["skills/alpha/SKILL.md"]);

    const browserBack = step(first, { kind: "restored", place: decodeHash("#/skill/alpha?doc=skills/alpha/SKILL.md") }, small);
    assert.deepStrictEqual<unknown>(browserBack.reading, { kind: "open", path: "skills/alpha/SKILL.md", anchor: null, line: null, back: [] });

    const typed = step(first, { kind: "restored", place: decodeHash("#/?doc=skills/router/SKILL.md") }, small);
    assert.deepStrictEqual<unknown>(typed.reading.kind === "open" ? typed.reading.back : null, ["skills/alpha/SKILL.md", "skills/beta/SKILL.md"]);

    const same = step(first, { kind: "restored", place: placeOf(first) }, small);
    assert.deepStrictEqual<unknown>(same.reading, first.reading);
  });

  it("keeps a path that the index does not list, so the reader can say so", () => {
    const state = run(small, [{ kind: "linkFollowed", path: "docs/outside.md", anchor: null, line: null }]);
    assert.deepStrictEqual<unknown>([state.focus.kind, state.reading.kind === "open" ? state.reading.path : null], ["none", "docs/outside.md"]);
  });
});

describe("camera", () => {
  it("fits the rest map, and fits the arrangement of a selection beside the reader", () => {
    const closed = resolveCamera(INITIAL, small);
    const reading = run(small, [{ kind: "picked", id: id("skill:alpha") }]);
    const beside = resolveCamera(reading, small);
    const world = small.placement.world;
    const bounds = arrangementOf(small.graph, stageTargetOf(reading))?.bounds;
    assert.isDefined(bounds);
    if (bounds === undefined) return;

    assert.closeTo(closed.tx + (world.width * closed.scale) / 2, 720, 0.001);
    assert.isAtLeast(beside.tx + bounds.x * beside.scale, -0.001);
    assert.isAtMost(beside.tx + (bounds.x + bounds.width) * beside.scale, 1440 - 460 + 0.001);
    assert.isAtLeast(beside.ty + bounds.y * beside.scale, -0.001);
    assert.isAtMost(beside.ty + (bounds.y + bounds.height) * beside.scale, 826 + 0.001);
    assert.closeTo(beside.tx + (bounds.x + bounds.width / 2) * beside.scale, (1440 - 460) / 2, 0.001, "the arrangement is in the middle of the area that the reader leaves");
    assert.deepStrictEqual<unknown>(reading.camera, { kind: "fit" });
  });

  it("returns to the fit when the selection changes, because the nodes are then in a different arrangement", () => {
    const zoomed = step(INITIAL, { kind: "zoomed", factor: 2, at: { x: 400, y: 300 } }, small);
    const picked = step(zoomed, { kind: "picked", id: id("skill:alpha") }, small);
    const panned = step(picked, { kind: "panned", dx: 40, dy: 0 }, small);

    assert.strictEqual(zoomed.camera.kind, "free");
    assert.deepStrictEqual<unknown>(picked.camera, { kind: "fit" });
    assert.strictEqual(step(panned, { kind: "readerClosed" }, small).camera.kind, "free", "the same selection keeps the camera of the user");
    assert.deepStrictEqual<unknown>(step(panned, { kind: "picked", id: id("skill:beta") }, small).camera, { kind: "fit" });
    assert.deepStrictEqual<unknown>(run(small, [{ kind: "cleared" }, { kind: "cleared" }], panned).camera, { kind: "fit" }, "the way back to the rest map");
  });

  it("zooms about the pointer, pans, and returns to the fit", () => {
    const at = { x: 400, y: 300 };
    const before = resolveCamera(INITIAL, small);
    const zoomed = step(INITIAL, { kind: "zoomed", factor: 2, at }, small);
    const after = resolveCamera(zoomed, small);

    assert.strictEqual(zoomed.camera.kind, "free");
    assert.closeTo(after.scale, before.scale * 2, 1e-9);
    assert.closeTo((at.x - after.tx) / after.scale, (at.x - before.tx) / before.scale, 1e-9);
    assert.closeTo((at.y - after.ty) / after.scale, (at.y - before.ty) / before.scale, 1e-9);

    const panned = resolveCamera(step(zoomed, { kind: "panned", dx: 30, dy: -12 }, small), small);
    assert.deepStrictEqual<unknown>([panned.tx - after.tx, panned.ty - after.ty], [30, -12]);
    assert.deepStrictEqual<unknown>(step(zoomed, { kind: "fitted" }, small).camera, { kind: "fit" });
    assert.isAtMost(resolveCamera(step(INITIAL, { kind: "zoomed", factor: 1e9, at }, small), small).scale, 4);
  });

  it("makes the least move that keeps the selected node clear of the reader, when the user has moved the camera", () => {
    const router = id("skill:router");
    const key = relationKey({ from: router, to: id("playbook:build") });
    const far = run(small, [{ kind: "picked", id: router }, { kind: "panned", dx: -900, dy: 0 }]);
    const followed = step(far, { kind: "inspected", key }, small);
    const camera = resolveCamera(followed, small);
    const row = arrangementOf(small.graph, stageTargetOf(followed))?.nodes.get(router);
    assert.isDefined(row);
    if (row === undefined) return;
    const x = camera.tx + row.centre.x * camera.scale;

    assert.isBelow(resolveCamera(far, small).tx + row.centre.x * camera.scale, 0, "the pan put the selected node off the screen");
    assert.isAtLeast(x, 20);
    assert.isAtMost(x, 1440 - 460 - 20);
    assert.strictEqual(camera.scale, resolveCamera(far, small).scale);
    assert.deepStrictEqual<unknown>(step(followed, { kind: "inspected", key }, small).camera, followed.camera, "a node in view needs no move");
  });
});

describe("camera in a small window", () => {
  it("keeps the top-left of the map in view when the fit scale is at its floor", () => {
    const tiny = stageOf(fixture, { width: 800, height: 424, reader: 420 });
    const camera = resolveCamera(INITIAL, tiny);
    const router = tiny.placement.nodes.get(id("skill:router"));
    assert.isDefined(router);
    if (router === undefined) return;

    assert.strictEqual(camera.scale, 0.8, "the world does not fit, so the scale is the floor");
    assert.deepStrictEqual<unknown>([camera.tx, camera.ty], [0, 0], "a centred camera puts the router and the first rows off the screen");
    assert.isAtLeast(camera.tx + router.centre.x * camera.scale, 0);
    assert.isAtMost(camera.ty + router.centre.y * camera.scale, 424);

    const wide = stageOf(fixture, { width: 1440, height: 400, reader: 460 });
    const short = resolveCamera(INITIAL, wide);
    assert.strictEqual(short.ty, 0);
    assert.closeTo(short.tx + (wide.placement.world.width * short.scale) / 2, 720, 0.001, "an axis that fits stays centred");
  });
});

describe("browser history", () => {
  const stale = "#/skill/no-such-skill?doc=skills/no-such-skill/SKILL.md";

  const browser = (entries: string[]) => {
    let at = entries.length - 1;
    let state = INITIAL;
    const bar: AddressBar = {
      hash: () => entries[at] ?? "",
      replace: (hash) => {
        entries[at] = hash;
      },
      push: (hash) => {
        entries.splice(at + 1, entries.length, hash);
        at += 1;
      },
    };
    const sync = (): void => showInAddress(bar, placeOf(state), fixture);
    const arrive = (): void => {
      state = step(state, { kind: "restored", place: decodeHash(entries[at] ?? "") }, small);
      sync();
    };
    arrive();
    return {
      back: (): void => {
        if (at === 0) return;
        at -= 1;
        arrive();
      },
      act: (event: ViewEvent): void => {
        state = step(state, event, small);
        sync();
      },
      address: (): string => entries[at] ?? "",
      entries,
    };
  };

  it("leaves an address whose focus the index does not hold, with three Back presses in a row", () => {
    const page = browser(["#/", "#/skill/alpha?doc=skills/alpha/SKILL.md", stale]);

    assert.strictEqual(page.address(), "#/?doc=skills/no-such-skill/SKILL.md", "the entry is replaced by the place that the app shows");
    assert.strictEqual(page.entries.length, 3, "a push here puts a fourth entry after the stale one, and Back returns to the stale one");
    page.back();
    assert.strictEqual(page.address(), "#/skill/alpha?doc=skills/alpha/SKILL.md");
    page.back();
    assert.strictEqual(page.address(), "#/");
    page.back();
    assert.strictEqual(page.address(), "#/");
    assert.deepStrictEqual<unknown>(page.entries, ["#/", "#/skill/alpha?doc=skills/alpha/SKILL.md", "#/?doc=skills/no-such-skill/SKILL.md"]);
  });

  it("replaces an entry whose cursor is past the last step, and one with an empty hash", () => {
    assert.deepStrictEqual<unknown>(browser(["#/route/build-new-behavior/99"]).entries, ["#/route/build-new-behavior/3"]);
    assert.deepStrictEqual<unknown>(browser([""]).entries, [""], "the empty hash already shows the empty place");
  });

  it("adds an entry for a new focus or a new file, and none for a step, a query, a lens, or a line", () => {
    const page = browser(["#/"]);
    page.act({ kind: "picked", id: id("skill:alpha") });
    page.act({ kind: "typed", query: "al" });
    page.act({ kind: "lensed", lens: "tools" });
    page.act({ kind: "linkFollowed", path: "skills/alpha/SKILL.md", anchor: null, line: 12 });
    assert.deepStrictEqual<unknown>(page.entries, ["#/", "#/skill/alpha?doc=skills/alpha/SKILL.md&line=12&q=al&lens=tools"]);

    page.act({ kind: "traced", route: routeId("build-new-behavior") });
    page.act({ kind: "stepped", by: 1 });
    page.act({ kind: "stepped", by: 1 });
    assert.strictEqual(page.entries.length, 3, "each step of a trace is the same entry as its route");
    assert.isTrue(page.address().startsWith("#/route/build-new-behavior/2?"));
    page.back();
    assert.strictEqual(page.address(), "#/skill/alpha?doc=skills/alpha/SKILL.md&line=12&q=al&lens=tools");
  });

  it("names what a new entry is", () => {
    const alpha = placeOf(run(small, [{ kind: "picked", id: id("skill:alpha") }]));
    const route = (cursor: number): Place => ({ ...placeOf(INITIAL), focus: { kind: "route", route: routeId("build-new-behavior"), cursor } });

    assert.isFalse(opensNewEntry(route(0), route(2)));
    assert.isFalse(opensNewEntry(alpha, { ...alpha, query: "x", lens: "tools" }));
    assert.isTrue(opensNewEntry(alpha, { ...alpha, focus: { kind: "none" } }));
    assert.isTrue(opensNewEntry(alpha, { ...alpha, reading: { kind: "closed" } }));
    assert.isTrue(opensNewEntry(route(1), alpha));
  });
});

describe("text that a paste can hold", () => {
  it("makes a query with a lone surrogate well-formed, so the address can hold it", () => {
    const typed = step(INITIAL, { kind: "typed", query: "a\uD800b" }, small);

    assert.strictEqual(typed.query, "a\uFFFDb");
    assert.strictEqual(encodeHash(placeOf(typed)), "#/?q=a%EF%BF%BDb");
    assert.doesNotThrow(() => encodeHash({ ...placeOf(INITIAL), query: "\uDC00", reading: { kind: "open", path: "skills/\uD83D", anchor: "\uD800", line: null, back: [] } }));
    assert.strictEqual(step(INITIAL, { kind: "typed", query: "\uD83D\uDE00 ok" }, small).query, "\uD83D\uDE00 ok", "a pair is well-formed and stays");
  });
});

describe("the Key", () => {
  it("has each glyph, so a filled diamond is in it", () => {
    assert.deepStrictEqual<unknown>([...GLYPHS], ["hub", "square", "ring", "disc", "diamond", "diamond-solid", "pip"]);
  });
});

describe("URL hash", () => {
  const places: readonly Place[] = [
    placeOf(INITIAL),
    placeOf(run(small, [{ kind: "picked", id: id("skill:alpha") }])),
    placeOf(run(small, [{ kind: "traced", route: routeId("build-new-behavior") }, { kind: "stepped", by: 1 }, { kind: "readerClosed" }])),
    {
      focus: { kind: "node", id: id("hosted:skills/mako/references/execution.md") },
      pin: { kind: "unlocked" },
      reading: { kind: "open", path: "skills/mako/references/execution.md", anchor: "skill lookup & more", line: 12, back: [] },
      query: "a+b c/d?e#f&g=h",
      lens: "tools",
      muted: new Set(["cite", "unjudged"]),
    },
  ];

  it("round-trips each place", () => {
    for (const place of places) {
      const hash = encodeHash(place);
      assert.deepStrictEqual<unknown>(decodeHash(hash), place, hash);
      assert.strictEqual(encodeHash(decodeHash(hash)), hash);
    }
    assert.strictEqual(encodeHash(places[1] ?? placeOf(INITIAL)), "#/skill/alpha?doc=skills/alpha/SKILL.md");
    assert.strictEqual(encodeHash(placeOf(INITIAL)), "#/");
  });

  it("reads text that is not a place as the empty place", () => {
    for (const hash of ["", "#", "#/nothing", "#/route", "#/skill/", "#/%E0%A4%A?lens=x&line=abc&mute=,,nope"]) {
      assert.deepStrictEqual<unknown>(decodeHash(hash), placeOf(INITIAL), hash);
    }
  });

  it("restores a place, and drops a focus that the index does not hold", () => {
    const restored = step(INITIAL, { kind: "restored", place: decodeHash("#/skill/alpha?doc=skills/alpha/SKILL.md&q=al") }, small);
    assert.deepStrictEqual<unknown>([restored.focus, restored.query, restored.reading.kind], [{ kind: "node", id: "skill:alpha" }, "al", "open"]);

    const gone = step(INITIAL, { kind: "restored", place: decodeHash("#/skill/removed?doc=skills/removed/SKILL.md") }, small);
    assert.deepStrictEqual<unknown>([gone.focus, gone.reading.kind === "open" ? gone.reading.path : null], [{ kind: "none" }, "skills/removed/SKILL.md"]);

    const route = step(INITIAL, { kind: "restored", place: decodeHash("#/route/build-new-behavior/99") }, small);
    assert.deepStrictEqual<unknown>(route.focus, { kind: "route", route: "build-new-behavior", cursor: 3 });
  });
});

describe("evidence sentence", () => {
  it("shows the sentence that names the target, and cuts a long one at a word", () => {
    const target = fixture.nodes.get(id("skill:principle-keep-small"));
    assert.isDefined(target);
    if (target === undefined) return;
    const evidence = (text: string) => Schema.decodeUnknownSync(ExplorerIndex.fields.relations)([relation("skill:alpha", "skill:beta", "runs", 1)])[0]?.evidence.map((item) => ({ ...item, text }))[0];
    const short = evidence("Read the file `a.b.md` first. Then apply the keep-small principle (see e.g. the index). Stop.");
    const long = evidence(`Apply \`principle-keep-small\` ${"when the change grows ".repeat(20)}and stop.`);
    assert.isDefined(short);
    assert.isDefined(long);
    if (short === undefined || long === undefined) return;

    assert.strictEqual(sentenceOf(short, target), "Then apply the keep-small principle (see e.g. the index).");
    const cut = sentenceOf(long, target);
    assert.isAtMost(cut.length, 221);
    assert.isTrue(cut.endsWith("…") && !cut.endsWith(" …"));
  });
});

describe("the strip of the first leg of a trace", () => {
  /** Asserts the rule for each route. It returns the routes whose first leg has no evidence line of its own in the index. */
  const routesWithALineOfTheirOwnOnly = (stage: Stage): string[] => {
    const fromOtherLines: string[] = [];
    for (const route of stage.graph.index.routes) {
      const scene = deriveScene({ ...stage, state: run(stage, [{ kind: "traced", route: route.id }]) });
      const strip = scene.strip;
      assert.strictEqual(strip.kind, "trace", route.task);
      if (strip.kind !== "trace") continue;
      assert.deepStrictEqual<unknown>([strip.task, strip.at], [route.task, 0]);
      assert.deepStrictEqual<unknown>([strip.shown?.file, strip.shown?.line], [route.file, route.line], `${route.task}: the strip quotes a line that is not the line of this route`);
      const trace = traceOf(stage.graph, route.id);
      const first = trace?.heads[0] === undefined ? undefined : stage.graph.relations.get(trace.heads[0]);
      if (first !== undefined && !first.evidence.some((item) => item.file === route.file && item.line === route.line)) fromOtherLines.push(route.task);
      const lineInTheIndex = (trace?.heads ?? []).flatMap((key) => stage.graph.relations.get(key)?.evidence ?? []).find((item) => item.file === route.file && item.line === route.line);
      assert.deepStrictEqual(strip.shown?.headings, lineInTheIndex?.headings ?? [], `${route.task}: the strip gives the heading path of the line when the index has the line`);
      assert.strictEqual(strip.sentence !== "", lineInTheIndex !== undefined, `${route.task}: the strip quotes the line when the index has it`);

      if (trace !== null && trace.head === null) {
        for (const item of trace.steps) {
          const onStep = deriveScene({ ...stage, state: run(stage, [{ kind: "traced", route: route.id }, ...Array.from({ length: item.n }, (): ViewEvent => ({ kind: "stepped", by: 1 }))]) }).strip;
          assert.deepStrictEqual<unknown>(onStep.kind === "trace" ? [onStep.at, onStep.shown?.file, onStep.shown?.line] : null, [item.n, route.file, route.line], `${route.task}, step ${item.n}: a route without a playbook names its skills on its own line`);
        }
      }
    }
    return fromOtherLines;
  };

  it.effect("quotes the line of the route itself, for each route", () =>
    Effect.gen(function* () {
      routesWithALineOfTheirOwnOnly(yield* liveStage);
      const stage = yield* snapshotStage;
      assert.include(routesWithALineOfTheirOwnOnly(stage), "Investigate historical rationale", "the snapshot has a route whose playbook has an evidence line of a different route only");
      const rationale = stage.graph.index.routes.find((route) => route.task === "Investigate historical rationale");
      assert.isDefined(rationale);
      if (rationale === undefined) return;
      const strip = deriveScene({ ...stage, state: run(stage, [{ kind: "traced", route: rationale.id }]) }).strip;
      assert.deepStrictEqual<unknown>(strip.kind === "trace" ? [strip.name, strip.shown?.headings, strip.sentence] : null, ["investigation", ["Mako", "Playbooks"], "Investigate historical rationale: Investigation with why"], "the line names the playbook without a link, so only the relation to `why` holds it");
    }),
  );
});
