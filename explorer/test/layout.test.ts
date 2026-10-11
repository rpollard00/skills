import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { toGraph } from "../src/shared/graph";
import { cablesOnOneTrunk, FRAME, layout, monoAdvance, type Placement, type Rect, type Seat, type Segment } from "../src/shared/layout";
import { ExplorerIndex, type NodeId, type Relation, type SkillNode } from "../src/shared/model";
import { indexAt, LIVE_REPO, snapshotIndex } from "./support";

const liveIndex = Effect.gen(function* () {
  return yield* (yield* indexAt(LIVE_REPO)).live;
}).pipe(Effect.provide(NodeServices.layer));

const seats = (placement: Placement): [NodeId, Seat][] =>
  [...placement.nodes].flatMap(([id, placed]) => (placed.kind === "seat" ? [[id, placed] satisfies [NodeId, Seat]] : []));

const centres = (placement: Placement): { [id: string]: string } =>
  Object.fromEntries([...placement.nodes].map(([id, placed]) => [id, `${placed.centre.x},${placed.centre.y}`]));

const rectsMeet = (a: Rect, b: Rect): boolean => a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;

const segmentMeets = (rect: Rect, [from, to]: Segment): boolean =>
  rectsMeet(rect, { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), width: Math.abs(from.x - to.x), height: Math.abs(from.y - to.y) });

const decodeNode = Schema.decodeUnknownSync(ExplorerIndex.fields.nodes);
const decodeRelations = Schema.decodeUnknownSync(ExplorerIndex.fields.relations);

const withSkill = (index: ExplorerIndex, like: SkillNode, name: string): ExplorerIndex => ({
  ...index,
  nodes: [...index.nodes, ...decodeNode([{ ...like, id: `skill:${name}`, name, entry: `skills/${name}/SKILL.md` }])],
});

describe("layout on the live index", () => {
  it.effect("is deterministic", () =>
    Effect.gen(function* () {
      const index = yield* liveIndex;
      const first = layout(toGraph(index));
      const second = layout(toGraph({ ...index, nodes: [...index.nodes].reverse(), relations: [...index.relations].reverse() }));

      assert.deepStrictEqual(centres(first), centres(second));
      assert.deepStrictEqual(
        [...first.cables].map(([key, cable]) => [key, cable.d]).sort(),
        [...second.cables].map(([key, cable]) => [key, cable.d]).sort(),
      );
      assert.strictEqual(first.nodes.size, index.nodes.length, "every node has a place");
    }),
  );

  it.effect("routes no cable through the title of a column", () =>
    Effect.gen(function* () {
      const placement = layout(toGraph(yield* liveIndex));
      const capitalHeight = 8;
      const hits: string[] = [];
      for (const column of placement.columns) {
        const frame = FRAME.columns[column.id];
        const title: Rect = { x: frame.x, y: column.title.y - capitalHeight, width: frame.width, height: capitalHeight };
        for (const cable of placement.cables.values()) if (cable.segments.some((segment) => segmentMeets(title, segment))) hits.push(`${cable.key} crosses the title of ${column.id}`);
      }
      assert.deepStrictEqual(hits, []);
    }),
  );

  it.effect("moves no node when a relation is added or removed", () =>
    Effect.gen(function* () {
      const index = snapshotIndex;
      const before = layout(toGraph(index));
      const sample = index.relations[0];
      assert.isDefined(sample);
      const extra: readonly Relation[] = decodeRelations([{ ...sample, from: "skill:bro", to: "skill:why" }]);

      const added = layout(toGraph({ ...index, relations: [...index.relations, ...extra] }));
      const removed = layout(toGraph({ ...index, relations: [] }));

      assert.deepStrictEqual(centres(added), centres(before));
      assert.deepStrictEqual(centres(removed), centres(before));
      assert.strictEqual(added.cables.size, before.cables.size + 1);
    }),
  );

  it.effect("moves only the later nodes of one column, by one row, when a skill is added", () =>
    Effect.gen(function* () {
      const index = yield* liveIndex;
      const graph = toGraph(index);
      const before = layout(graph);
      const skills = graph.columns.skills;
      const like = skills[Math.floor((skills.length - 1) / 2)];
      if (like?.kind !== "skill") return;

      // The name starts with the name of the middle skill, so the new skill is in the middle of the column for each content of the skills.
      const name = `${like.name}-inserted`;
      const after = layout(toGraph(withSkill(index, like, name)));
      const moved = seats(before).filter(([id, placed]) => after.nodes.get(id)?.centre.y !== placed.centre.y);
      const later = skills.filter((node) => node.name > name);

      assert.strictEqual(moved.length, later.length, "each skill that is ranked after the new one moves, and no other node");
      for (const [id, placed] of moved) {
        const node = graph.nodes.get(id);
        assert.strictEqual(placed.column, "skills", `${id} moved`);
        assert.isTrue(node?.kind === "skill" && node.name > name, `${id} is ranked before the new skill`);
        assert.strictEqual(after.nodes.get(id)?.centre.y, placed.centre.y + FRAME.pitch);
        assert.strictEqual(after.nodes.get(id)?.centre.x, placed.centre.x);
      }
    }),
  );

  it.effect("keeps every label clear of every other label and of every cable", () =>
    Effect.gen(function* () {
      const index = yield* liveIndex;
      const placement = layout(toGraph(index));
      const placed = seats(placement);
      assert.isAtMost(placement.cables.size, index.relations.length, "a relation has one cable at most");

      const labelHits: string[] = [];
      placed.forEach(([id, a], at) => {
        for (const [other, b] of placed.slice(at + 1)) if (rectsMeet(a.label, b.label)) labelHits.push(`${id} meets ${other}`);
      });
      assert.deepStrictEqual(labelHits, []);

      const cableHits: string[] = [];
      for (const [id, { label }] of placed) {
        for (const cable of placement.cables.values()) {
          if (cable.segments.some((segment) => segmentMeets(label, segment))) cableHits.push(`${cable.key} crosses the label of ${id}`);
        }
      }
      assert.deepStrictEqual(cableHits, []);

      for (const [id, { label, column, text }] of placed) {
        const frame = FRAME.columns[column];
        assert.isAtLeast(label.x, frame.x, `${id} starts left of its column`);
        assert.isAtMost(label.x + label.width, frame.x + frame.width, `${id} (${text}) is wider than its column`);
      }
    }),
  );

  /** Asserts one trunk for each side of each node. It returns the number of sides with more than one cable, and the number of cables of the router. */
  const combsOnOneTrunk = (index: ExplorerIndex): { readonly combs: number; readonly ofRouter: number } => {
    const graph = toGraph(index);
    const placement = layout(graph);
    let combs = 0;
    for (const node of graph.index.nodes) {
      const cables = [...cablesOnOneTrunk(graph, placement, node.id).values()];
      for (const direction of [1, -1]) {
        const trunks = cables.flatMap((cable) => {
          const [leaving, upright] = cable.segments;
          return leaving !== undefined && upright !== undefined && Math.sign(leaving[1].x - leaving[0].x) === direction ? [leaving[1].x] : [];
        });
        assert.isAtMost(new Set(trunks).size, 1, `${node.id}: the cables that leave to the ${direction === 1 ? "right" : "left"} go up and down at x ${[...new Set(trunks)].join(" and ")}`);
        if (trunks.length > 1) combs += 1;
      }
    }
    const router = [...graph.routers][0];
    return { combs, ofRouter: router === undefined ? 0 : cablesOnOneTrunk(graph, placement, router).size };
  };

  it.effect("gives the cables out of one node one trunk on each side, the router included", () =>
    Effect.gen(function* () {
      combsOnOneTrunk(yield* liveIndex);
      const ofSnapshot = combsOnOneTrunk(snapshotIndex);
      assert.isAbove(ofSnapshot.combs, 40, "the snapshot has many nodes with more than one cable on a side");
      assert.isAbove(ofSnapshot.ofRouter, 20, "the router of the snapshot has cables to playbooks and to skills");
    }),
  );

  it.effect("puts each hosted file on the row of its host", () =>
    Effect.gen(function* () {
      const index = yield* liveIndex;
      const placement = layout(toGraph(index));
      for (const node of index.nodes) {
        if (node.kind !== "hosted") continue;
        const pip = placement.nodes.get(node.id);
        const host = placement.nodes.get(node.host);
        assert.strictEqual(pip?.kind, "pip");
        assert.strictEqual(pip?.centre.y, host?.centre.y);
      }
    }),
  );
});

const digest = "0".repeat(64);

const skillNode = (name: string, extra: object = {}): object => ({
  kind: "skill",
  id: `skill:${name}`,
  name,
  title: name,
  description: "",
  family: "skill",
  modelInvocable: true,
  origin: { kind: "original" },
  entry: `skills/${name}/SKILL.md`,
  digest,
  tooling: { scripts: [], commands: [] },
  defects: [],
  ...extra,
});

const indexOf = (nodes: readonly object[], extra: object = {}): ExplorerIndex =>
  Schema.decodeUnknownSync(ExplorerIndex)({
    version: 1,
    sourceDigest: digest,
    nodes,
    routes: [],
    triggers: [],
    files: [],
    relations: [],
    open: 0,
    orphans: 0,
    record: { kind: "current" },
    ...extra,
  });

/** A router with hosted files, one playbook, and one skill that reads the last hosted file. */
const routerWithHostedFiles = (count: number): ExplorerIndex => {
  const hosted = Array.from({ length: count }, (_, at) => ({
    kind: "hosted",
    id: `hosted:skills/mako/references/file-${at}.md`,
    host: "skill:mako",
    title: `File ${at}`,
    entry: `skills/mako/references/file-${at}.md`,
    digest,
  }));
  const evidence = [{ file: "skills/alpha/SKILL.md", line: 3, headings: [], rules: ["link"], text: "Read the file." }];
  const last = hosted.at(-1);
  return indexOf(
    [
      skillNode("mako", { family: "router" }),
      skillNode("alpha"),
      { kind: "playbook", id: "playbook:build", name: "build", title: "Build", purpose: "", host: "skill:mako", entry: "skills/mako/playbooks/build.md", digest },
      ...hosted,
    ],
    {
      relations: [
        { from: "skill:mako", to: "playbook:build", kinds: ["route"], conditional: false, standing: "mechanical", ticket: null, evidence },
        ...(last === undefined ? [] : [{ from: "skill:alpha", to: last.id, kinds: ["reads"], conditional: false, standing: "mechanical", ticket: null, evidence }]),
      ],
    },
  );
};

describe("hosted files on one row", () => {
  it("never shortens the name of the host, for each number of hosted files", () => {
    for (const count of [0, 1, 3, 5, 6, 8, 12, 40, 120]) {
      const placement = layout(toGraph(routerWithHostedFiles(count)));
      const router = seats(placement).find(([id]) => id === "skill:mako")?.[1];
      assert.strictEqual(router?.text, "mako", `${count} hosted files`);
    }
  });

  it("gives eight hosted files on the router two pips and a count, inside the column and clear of each cable", () => {
    const index = routerWithHostedFiles(8);
    const placement = layout(toGraph(index));
    const placed = seats(placement);
    const router = placed.find(([id]) => id === "skill:mako")?.[1];
    assert.isDefined(router);
    if (router === undefined) return;
    const pips = index.nodes.flatMap((node) => {
      const pip = placement.nodes.get(node.id);
      return node.kind === "hosted" && pip?.kind === "pip" ? [pip] : [];
    });

    assert.strictEqual(pips.length, 8, "each hosted file has a place");
    assert.deepStrictEqual(pips.map((pip) => pip.folded), [false, false, true, true, true, true, true, true]);
    assert.deepStrictEqual(router.foldedPips?.count, 6);
    assert.strictEqual(new Set(pips.filter((pip) => pip.folded).map((pip) => `${pip.centre.x},${pip.centre.y}`)).size, 1, "the folded pips sit on the count");
    assert.isTrue(pips.every((pip) => pip.centre.y === router.centre.y));

    const frame = FRAME.columns.router;
    assert.isAtMost(router.label.x + router.label.width, frame.x + frame.width);
    assert.isTrue(pips.every((pip) => pip.centre.x > router.label.x && pip.centre.x < router.label.x + router.label.width), "each pip is inside the label of its host");

    const hits: string[] = [];
    for (const [id, { label }] of placed) {
      for (const cable of placement.cables.values()) if (cable.segments.some((segment) => segmentMeets(label, segment))) hits.push(`${cable.key} crosses the label of ${id}`);
    }
    assert.deepStrictEqual(hits, []);
    assert.strictEqual(placement.cables.size, 2, "the cable to a folded pip uses the port of the host");
  });

  it("shows each pip while the pips fit", () => {
    const placement = layout(toGraph(routerWithHostedFiles(3)));
    const router = seats(placement).find(([id]) => id === "skill:mako")?.[1];
    assert.isNull(router?.foldedPips);
    assert.strictEqual([...placement.nodes.values()].filter((placed) => placed.kind === "pip" && !placed.folded).length, 3);
  });
});

describe("rank order", () => {
  it("orders names by code unit and not by the locale of the machine", () => {
    const names = ["alpha", "Zeta", "beta_1", "_under", "beta-2"];
    const graph = toGraph(
      indexOf([
        ...names.map((name) => skillNode(name)),
        ...names.map((name) => skillNode(`principle-${name}`, { family: "principle" })),
        ...names.map((name) => ({ kind: "playbook", id: `playbook:${name}`, name, title: name, purpose: "", host: "skill:alpha", entry: `skills/alpha/playbooks/${name}.md`, digest })),
      ]),
    );
    const byCodeUnit = ["Zeta", "_under", "alpha", "beta-2", "beta_1"];

    assert.notDeepEqual([...names].sort((a, b) => a.localeCompare(b)), byCodeUnit, "these names must tell the two orders apart");
    assert.deepStrictEqual(graph.columns.skills.map((node) => node.name), byCodeUnit);
    assert.deepStrictEqual(graph.columns.playbooks.map((node) => node.name), byCodeUnit);
    assert.deepStrictEqual(graph.columns.principles.map((node) => node.name), byCodeUnit.map((name) => `principle-${name}`));

    const placement = layout(graph);
    const rows = graph.columns.skills.map((node) => placement.nodes.get(node.id)?.centre.y ?? Number.NaN);
    assert.deepStrictEqual(rows, [...rows].sort((a, b) => a - b), "a later name is on a lower row");
    assert.strictEqual(new Set(rows).size, names.length);
  });
});

describe("label font", () => {
  it("takes the width of a character from the one font size that the map also gives to the CSS", () => {
    assert.strictEqual(FRAME.charWidth, monoAdvance(FRAME.labelFontPx));
    assert.strictEqual(FRAME.charWidth, 7.2);
    assert.strictEqual(monoAdvance(10), 6);
  });
});

describe("layout rules", () => {
  it("cuts a long name in the middle and keeps the full width of the column", () => {
    const base = Schema.decodeUnknownSync(ExplorerIndex)({
      version: 1,
      sourceDigest: "0".repeat(64),
      nodes: [
        {
          kind: "skill",
          id: "skill:a-name-that-is-much-longer-than-the-skills-column",
          name: "a-name-that-is-much-longer-than-the-skills-column",
          title: "Long",
          description: "",
          family: "skill",
          modelInvocable: true,
          origin: { kind: "original" },
          entry: "skills/a-name-that-is-much-longer-than-the-skills-column/SKILL.md",
          digest: "0".repeat(64),
          tooling: { scripts: [], commands: [] },
          defects: [],
        },
      ],
      routes: [],
      triggers: [],
      files: [],
      relations: [],
      open: 0,
      orphans: 0,
      record: { kind: "current" },
    });
    const placed = [...layout(toGraph(base)).nodes.values()][0];

    assert.strictEqual(placed?.kind, "seat");
    if (placed?.kind !== "seat") return;
    assert.strictEqual(placed.text.length, 29);
    assert.isTrue(placed.text.includes("…"));
    assert.isTrue(placed.text.startsWith("a-name-that-is") && placed.text.endsWith("skills-column"));
  });

  it("gives an empty index a frame with four columns", () => {
    const empty = Schema.decodeUnknownSync(ExplorerIndex)({
      version: 1,
      sourceDigest: "0".repeat(64),
      nodes: [],
      routes: [],
      triggers: [],
      files: [],
      relations: [],
      open: 0,
      orphans: 0,
      record: { kind: "missing" },
    });
    const placement = layout(toGraph(empty));

    assert.deepStrictEqual(placement.columns.map((column) => column.id), ["router", "playbooks", "skills", "principles"]);
    assert.strictEqual(placement.world.width, FRAME.width);
    assert.strictEqual(placement.rail, "");
  });
});
