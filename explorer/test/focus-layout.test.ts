import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { FOCUS, focusLayout, NAMED_BY_ROUTE, type Arrangement, type Branch, type FocusTarget, type Row } from "../src/shared/focus-layout";
import { toGraph, type Graph } from "../src/shared/graph";
import { FRAME, layout, type Point, type Rect } from "../src/shared/layout";
import { ExplorerIndex, NodeId, relationKey, RouteId, type Relation } from "../src/shared/model";
import { deriveScene } from "../src/shared/view/scene";
import { INITIAL, type Stage, type ViewEvent } from "../src/shared/view/state";
import { step } from "../src/shared/view/step";
import { traceOf } from "../src/shared/view/trace";
import { indexAt, LIVE_REPO } from "./support";

const liveIndex = Effect.gen(function* () {
  return yield* (yield* indexAt(LIVE_REPO)).live;
}).pipe(Effect.provide(NodeServices.layer));

const id = Schema.decodeUnknownSync(NodeId);
const routeId = Schema.decodeUnknownSync(RouteId);
const decodeRelations = Schema.decodeUnknownSync(ExplorerIndex.fields.relations);

const everyFocus = (graph: Graph): FocusTarget[] => [
  ...graph.index.nodes.map((node): FocusTarget => ({ kind: "node", id: node.id })),
  ...graph.index.routes.map((route): FocusTarget => ({ kind: "route", route: route.id })),
];

const nameOfFocus = (focus: FocusTarget): string => (focus.kind === "node" ? focus.id : `route ${focus.route}`);

const rowsOf = (arrangement: Arrangement | null): [NodeId, Row][] =>
  [...(arrangement?.nodes ?? [])].flatMap(([node, placed]) => (placed.kind === "row" ? [[node, placed] satisfies [NodeId, Row]] : []));

const leftPortOf = (arrangement: Arrangement, node: NodeId): Point | null => {
  const placed = arrangement.nodes.get(node);
  return placed?.kind === "row" ? placed.left : null;
};

const seatsOf = (arrangement: Arrangement): { [node: string]: string } =>
  Object.fromEntries([...arrangement.nodes].map(([node, placed]) => [node, `${placed.centre.x},${placed.centre.y}`]));

const rectsMeet = (a: Rect, b: Rect): boolean => a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;

const drawnRect = (row: Row): Rect => {
  const start = Math.min(row.centre.x - 7, row.label.x);
  const end = Math.max(row.centre.x + 7, row.label.x + row.label.width);
  return { x: start, y: row.label.y, width: end - start, height: row.label.height };
};

const captionRect = (caption: Arrangement["captions"][number]): Rect => {
  const width = 14 * FOCUS.captionCharWidth;
  return { x: caption.anchor === "end" ? caption.at.x - width : caption.at.x, y: caption.at.y - 5, width, height: 10 };
};

const segmentsOf = (cable: Branch): [Point, Point][] => cable.points.slice(1).map((to, index) => [cable.points[index] ?? to, to]);

const segmentMeets = (rect: Rect, [from, to]: [Point, Point]): boolean =>
  rectsMeet(rect, { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), width: Math.abs(from.x - to.x), height: Math.abs(from.y - to.y) });

/** The x of each run of a cable that goes up or down, from its source to its target. A cable between two nodes on one row has none. */
const uprightsOf = (cable: Branch): number[] => segmentsOf(cable).flatMap(([from, to]) => (from.x === to.x && from.y !== to.y ? [from.x] : []));

/** The trunk of the cables out of one node is the first upright of each. The trunk of the cables into one node is the last upright of each. */
const trunksOf = (cables: readonly Branch[], end: "source" | "target"): number[] => [
  ...new Set(cables.flatMap((cable) => (end === "source" ? uprightsOf(cable).slice(0, 1) : uprightsOf(cable).slice(-1)))),
];

const isStraightOrPassesTheTrunk = (cable: Branch, trunks: readonly number[]): boolean => {
  const first = cable.points[0];
  const last = cable.points.at(-1);
  if (first === undefined || last === undefined) return false;
  return uprightsOf(cable).length > 0 || trunks.every((trunk) => first.x < trunk && trunk < last.x);
};

describe("the focus arrangement of each selection of the live index", () => {
  it.effect("puts each node and each route in one arrangement, with each lit cable from left to right", () =>
    Effect.gen(function* () {
      const index = yield* liveIndex;
      const graph = toGraph(index);
      const shuffled = toGraph({ ...index, nodes: [...index.nodes].reverse(), relations: [...index.relations].reverse() });
      let cables = 0;

      for (const focus of everyFocus(graph)) {
        const label = nameOfFocus(focus);
        const arrangement = focusLayout(graph, focus);
        assert.isNotNull(arrangement, label);
        if (arrangement === null) continue;

        const again = focusLayout(shuffled, focus);
        assert.deepStrictEqual(seatsOf(arrangement), again === null ? null : seatsOf(again), `${label}: the seats depend on the order of the index`);
        assert.deepStrictEqual(
          [...arrangement.cables].map(([key, cable]) => [key, cable.d]).sort(),
          [...(again?.cables ?? [])].map(([key, cable]) => [key, cable.d]).sort(),
          `${label}: the cables depend on the order of the index`,
        );

        for (const cable of arrangement.cables.values()) {
          assert.isBelow(cable.points[0]?.x ?? Number.NaN, cable.end.x, `${label}: ${cable.key} does not run from left to right`);
          assert.deepStrictEqual(cable.points.at(-1), cable.end, `${label}: ${cable.key}`);
          for (const [index, point] of cable.points.entries()) {
            const before = cable.points[index - 1];
            if (before !== undefined) assert.isAtLeast(point.x, before.x, `${label}: ${cable.key} turns back`);
          }
          cables += 1;
        }

        const rows = rowsOf(arrangement);
        const drawn = [...rows.map(([node, row]) => ({ name: `${node}`, rect: drawnRect(row) })), ...arrangement.captions.map((caption) => ({ name: `caption ${caption.key}`, rect: captionRect(caption) }))];
        for (const [index, first] of drawn.entries()) {
          for (const second of drawn.slice(index + 1)) assert.isFalse(rectsMeet(first.rect, second.rect), `${label}: ${first.name} meets ${second.name}`);
        }
        for (const cable of arrangement.cables.values()) {
          for (const item of drawn) {
            assert.isFalse(segmentsOf(cable).some((segment) => segmentMeets(item.rect, segment)), `${label}: ${cable.key} crosses ${item.name}`);
          }
        }
        assert.deepStrictEqual([...arrangement.order].sort(), [...arrangement.nodes.keys()].sort(), `${label}: the keyboard order has each node on stage one time`);
      }
      assert.isAbove(cables, 600, "the live index has many relations to check");
    }),
  );

  it.effect("draws each lit cable of the scene from left to right, from the right port of its source to the left port of its target, for each selection that the stage follows", () =>
    Effect.gen(function* () {
      const graph = toGraph(yield* liveIndex);
      const stage: Stage = { graph, placement: layout(graph), viewport: { width: 1440, height: 826, reader: 460 } };
      let lines = 0;
      for (const focus of everyFocus(graph)) {
        const label = nameOfFocus(focus);
        const select: ViewEvent = focus.kind === "node" ? { kind: "picked", id: focus.id } : { kind: "traced", route: focus.route };
        const scene = deriveScene({ ...stage, state: step(INITIAL, select, stage) });
        const rowOf = (node: string | undefined): Row | null => {
          const at = scene.nodes.find((item) => item.id === node && !item.offStage)?.at;
          return at?.kind === "row" ? at : null;
        };
        for (const cable of scene.cables.filter((item) => item.tone === "out" || item.tone === "in" || item.tone === "step")) {
          const [from, to] = cable.key.split(">");
          const first = cable.points[0];
          const last = cable.points.at(-1);
          assert.isBelow(first?.x ?? Number.NaN, last?.x ?? Number.NaN, `${label}: ${cable.key} does not run from left to right`);
          for (const [index, point] of cable.points.entries()) assert.isAtLeast(point.x, cable.points[index - 1]?.x ?? point.x, `${label}: ${cable.key} turns back`);
          assert.deepStrictEqual(first, rowOf(from)?.right, `${label}: ${cable.key} does not leave the right port of its source`);
          assert.deepStrictEqual(last, rowOf(to)?.left, `${label}: ${cable.key} does not arrive at the left port of its target`);
          assert.deepStrictEqual<unknown>([cable.end, cable.arrives], [last, 1], `${label}: the arrow of ${cable.key} is not at its target`);
          lines += 1;
        }
      }
      assert.isAbove(lines, 600, "the live index has many relations to check");
    }),
  );

  it.effect("puts the selected node in the middle: each node that needs it on its left, each node that it needs on its right, on one trunk for each side", () =>
    Effect.gen(function* () {
      const graph = toGraph(yield* liveIndex);
      for (const node of graph.index.nodes) {
        const arrangement = focusLayout(graph, { kind: "node", id: node.id });
        const centre = arrangement?.nodes.get(node.id);
        assert.isTrue(centre?.kind === "row" && !centre.mirrored, `${node.id}: the selected node has a row with its glyph on the left`);
        if (arrangement === null || centre?.kind !== "row") continue;
        assert.strictEqual(centre.centre.y, FOCUS.y, `${node.id}: the selected node is on the middle row`);

        const rows = rowsOf(arrangement).filter(([other]) => other !== node.id);
        const needers = new Set((graph.into.get(node.id) ?? []).map((relation) => relation.from));
        const needed = new Set((graph.out.get(node.id) ?? []).map((relation) => relation.to));
        for (const [other, row] of rows) {
          assert.strictEqual(row.mirrored, !needed.has(other), `${node.id}: only a node that the selected node does not need is a mirror image, on the left`);
          assert.isTrue(needed.has(other) || needers.has(other), `${node.id}: ${other} is not a neighbour`);
          if (row.mirrored) assert.isBelow(row.right.x, centre.left.x, `${node.id}: ${other}`);
          else assert.isAbove(row.left.x, centre.right.x, `${node.id}: ${other}`);
          const goesBothWays = needed.has(other) && needers.has(other);
          assert.strictEqual((arrangement.cables.get(relationKey({ from: node.id, to: other }))?.back ?? null) !== null, goesBothWays, `${node.id}: the cable to ${other} has the mark of a relation back only when ${other} also needs it`);
          if (goesBothWays) assert.isFalse(arrangement.cables.has(relationKey({ from: other, to: node.id })), `${node.id}: the relation back from ${other} has no cable of its own`);
        }
        for (const side of ["left", "right"] as const) {
          const ys = rows.filter(([, row]) => row.mirrored === (side === "left")).map(([, row]) => row.centre.y);
          if (ys.length === 0) continue;
          assert.isAtMost(Math.min(...ys), FOCUS.y, `${node.id}: the ${side} zone is all below the selected node`);
          assert.isAtLeast(Math.max(...ys), FOCUS.y, `${node.id}: the ${side} zone is all above the selected node`);
        }

        const into = [...arrangement.cables.values()].filter((cable) => cable.key.endsWith(`>${node.id}`));
        const out = [...arrangement.cables.values()].filter((cable) => cable.key.startsWith(`${node.id}>`));
        assert.strictEqual(into.length + out.length, arrangement.cables.size);
        assert.isAtMost(trunksOf(into, "target").length, 1, `${node.id}: the cables into it use more than one trunk`);
        assert.isAtMost(trunksOf(out, "source").length, 1, `${node.id}: the cables out of it use more than one trunk`);
        assert.isTrue(into.every((cable) => isStraightOrPassesTheTrunk(cable, trunksOf(into, "target"))) && out.every((cable) => isStraightOrPassesTheTrunk(cable, trunksOf(out, "source"))), node.id);
        assert.isTrue(into.every((cable) => cable.end.x === centre.left.x && cable.end.y === centre.left.y), `${node.id}: a cable into it misses its left port`);
        assert.isTrue(out.every((cable) => cable.points[0]?.x === centre.right.x && cable.points[0]?.y === centre.right.y), `${node.id}: a cable out of it misses its right port`);
        assert.strictEqual(out.length, [...needed].filter((other) => arrangement.nodes.get(other)?.kind === "row").length, `${node.id}: each node that it needs has one cable`);
      }
    }),
  );

  it.effect("orders each zone by the rest map only: a new relation between two neighbours moves nothing", () =>
    Effect.gen(function* () {
      const index = yield* liveIndex;
      const architect = id("skill:architect");
      const before = focusLayout(toGraph(index), { kind: "node", id: architect });
      const sample = index.relations[0];
      assert.isNotNull(before);
      assert.isDefined(sample);
      if (before === null || sample === undefined) return;

      const neighbours = rowsOf(before).filter(([node]) => node !== architect);
      const [first, second] = neighbours.filter(([, row]) => !row.mirrored).map(([node]) => node);
      const [third] = neighbours.filter(([, row]) => row.mirrored).map(([node]) => node);
      assert.isDefined(first && second && third);
      const extra: readonly Relation[] = decodeRelations([
        { ...sample, from: first, to: second },
        { ...sample, from: second, to: third },
      ]).filter((relation) => !index.relations.some((known) => known.from === relation.from && known.to === relation.to));
      assert.isAbove(extra.length, 0);

      const after = focusLayout(toGraph({ ...index, relations: [...index.relations, ...extra] }), { kind: "node", id: architect });
      assert.deepStrictEqual(after === null ? null : seatsOf(after), seatsOf(before));

      const graph = toGraph(index);
      for (const side of ["left", "right"] as const) {
        const ordered = neighbours.filter(([, row]) => row.mirrored === (side === "left")).sort(([, a], [, b]) => a.centre.x - b.centre.x || a.centre.y - b.centre.y).map(([node]) => node);
        const restOrder = [...graph.columns.router, ...graph.columns.playbooks, ...graph.columns.skills, ...graph.columns.principles].map((node) => node.id);
        const seated = ordered.filter((node) => restOrder.includes(node));
        assert.deepStrictEqual(seated, restOrder.filter((node) => seated.includes(node)), `the ${side} zone is in the order of the rest map`);
      }
    }),
  );

  it.effect("splits a zone that is too tall into columns by group, and keeps one column for a zone that fits", () =>
    Effect.gen(function* () {
      const graph = toGraph(yield* liveIndex);
      const columnsOf = (arrangement: Arrangement | null, selected: NodeId, side: "left" | "right"): number[] =>
        [...new Set(rowsOf(arrangement).filter(([node, row]) => node !== selected && row.mirrored === (side === "left")).map(([, row]) => row.centre.x))].sort((a, b) => a - b);

      const router = graph.columns.router[0];
      assert.isDefined(router);
      if (router === undefined) return;
      const around = focusLayout(graph, { kind: "node", id: router.id });
      assert.strictEqual(columnsOf(around, router.id, "right").length, 3, "the router needs playbooks, skills, and principles: one column for each, as on the rest map");
      assert.strictEqual(columnsOf(around, router.id, "left").length, 0);
      const rest = layout(graph);
      const onRestRow = new Set([router.id, ...graph.columns.playbooks.map((node) => node.id), ...graph.columns.principles.map((node) => node.id)]);
      for (const [node, row] of rowsOf(around)) {
        const restY = rest.nodes.get(node)?.centre.y ?? Number.NaN;
        if (onRestRow.has(node)) assert.strictEqual(row.centre.y, restY, `${node}: the router needs each playbook and each principle, so each is on its row of the rest map`);
        else assert.isAtMost(Math.abs(row.centre.y - restY), 3 * FRAME.pitch, `${node} is far from its row of the rest map`);
      }

      const file = id("hosted:skills/mako/references/execution.md");
      const readers = focusLayout(graph, { kind: "node", id: file });
      assert.isAbove((graph.into.get(file) ?? []).length, FOCUS.maxRows, "the live index lost the file that many nodes read");
      assert.strictEqual(columnsOf(readers, file, "left").length, 2);
      const tallest = Math.max(...columnsOf(readers, file, "left").map((x) => rowsOf(readers).filter(([, row]) => row.centre.x === x).length));
      assert.isAtMost(tallest, FOCUS.maxRows);

      assert.strictEqual(columnsOf(focusLayout(graph, { kind: "node", id: id("skill:architect") }), id("skill:architect"), "right").length, 1);
      assert.strictEqual(columnsOf(focusLayout(graph, { kind: "node", id: id("skill:architect") }), id("skill:architect"), "left").length, 1);
    }),
  );

  it.effect("puts a trace in the order of its steps: the router, the playbook on the same row, then the steps from top to bottom", () =>
    Effect.gen(function* () {
      const graph = toGraph(yield* liveIndex);
      let withPlaybook = 0;
      for (const route of graph.index.routes) {
        const trace = traceOf(graph, route.id);
        const arrangement = focusLayout(graph, { kind: "route", route: route.id });
        assert.isNotNull(arrangement, route.task);
        if (trace === null || arrangement === null || trace.origin === null) continue;
        const at = (node: NodeId): Point => arrangement.nodes.get(node)?.centre ?? { x: Number.NaN, y: Number.NaN };

        const steps = trace.steps.map((item) => at(item.node));
        assert.isAbove(steps.length, 0, route.task);
        assert.strictEqual(new Set(steps.map((point) => point.x)).size, 1, `${route.task}: the steps are in one column`);
        assert.deepStrictEqual(steps.map((point) => point.y), [...steps.map((point) => point.y)].sort((a, b) => a - b), `${route.task}: a later step is lower`);
        assert.strictEqual(new Set(steps.map((point) => point.y)).size, steps.length);
        assert.deepStrictEqual(at(trace.origin).y, FOCUS.y);

        const before = trace.head ?? trace.origin;
        assert.isBelow(at(before).x, steps[0]?.x ?? 0, `${route.task}: the steps are on the right`);
        if (trace.head !== null) {
          withPlaybook += 1;
          assert.strictEqual(at(trace.head).y, FOCUS.y, `${route.task}: the playbook is on the row of the router`);
          assert.isBelow(at(trace.origin).x, at(trace.head).x);
        }
        for (const item of trace.steps) {
          const cable = arrangement.cables.get(item.via);
          assert.isDefined(cable, `${route.task}: step ${item.n} has no cable`);
          assert.deepStrictEqual(cable?.end, leftPortOf(arrangement, item.node));
        }
        const sources = new Map<string, Branch[]>();
        for (const cable of arrangement.cables.values()) {
          const source = cable.key.split(">")[0] ?? "";
          sources.set(source, [...(sources.get(source) ?? []), cable]);
        }
        for (const [source, cables] of sources) {
          assert.isAtMost(trunksOf(cables, "source").length, 1, `${route.task}: the cables out of ${source} use more than one trunk`);
          assert.isTrue(cables.every((cable) => isStraightOrPassesTheTrunk(cable, trunksOf(cables, "source"))), `${route.task}: ${source}`);
        }
      }
      assert.isAbove(withPlaybook, 10);
    }),
  );
});

describe("a skill that a route names and that is also a step of its playbook", () => {
  it.effect("has one row, as the step, and the row says that the route names it", () =>
    Effect.gen(function* () {
      const graph = toGraph(yield* liveIndex);
      const said: string[] = [];
      for (const route of graph.index.routes) {
        const trace = traceOf(graph, route.id);
        const arrangement = focusLayout(graph, { kind: "route", route: route.id });
        assert.isNotNull(trace, route.task);
        if (trace === null || arrangement === null) continue;
        const namedWithoutACable = trace.heads.filter((key) => !arrangement.cables.has(key)).map((key) => key.split(">")[1] ?? "");
        const withTheNote = rowsOf(arrangement).filter(([, row]) => row.note === NAMED_BY_ROUTE).map(([node]) => `${node}`);

        assert.deepStrictEqual(withTheNote.sort(), [...namedWithoutACable].sort(), `${route.task}: the words are on each node that the route names and that has no cable from the router, and on no other node`);
        assert.isTrue(rowsOf(arrangement).every(([node, row]) => row.note === null || withTheNote.includes(node) || node.startsWith("hosted:")), `${route.task}: only a hosted file has other words after its name`);
        for (const node of withTheNote) {
          assert.isTrue(trace.steps.some((item) => item.node === node), `${route.task}: ${node} is a step`);
          said.push(`${trace.origin?.split(":")[1]} > ${node.split(":")[1]}`);
        }
      }
      assert.deepStrictEqual(said.sort(), ["mako > how", "mako > ui-design", "mako > why"], "the live index now has different routes of this kind");
    }),
  );
});

describe("the way back to the rest map", () => {
  it.effect("gives exactly the rest seats after each selection, and leaves the rest layout as it was", () =>
    Effect.gen(function* () {
      const graph = toGraph(yield* liveIndex);
      const placement = layout(graph);
      const stage: Stage = { graph, placement, viewport: { width: 1440, height: 826, reader: 460 } };
      const seatsBefore = JSON.stringify([...placement.nodes]);
      const run = (events: readonly ViewEvent[]) => events.reduce((state, event) => step(state, event, stage), INITIAL);
      const routes = graph.index.routes.slice(0, 3).map((route): ViewEvent => ({ kind: "traced", route: routeId(route.id) }));

      for (const select of [...graph.index.nodes.map((node): ViewEvent => ({ kind: "picked", id: node.id })), ...routes]) {
        const selected = deriveScene({ ...stage, state: run([select]) });
        assert.isTrue(selected.arranged);
        for (const leave of [[{ kind: "cleared" }, { kind: "cleared" }], [{ kind: "deselected" }]] satisfies ViewEvent[][]) {
          const home = deriveScene({ ...stage, state: run([select, ...leave]) });
          assert.isFalse(home.arranged);
          assert.isTrue(home.nodes.every((node) => node.at === placement.nodes.get(node.id) && !node.offStage), `a node is not at its seat after ${JSON.stringify(select)}`);
          assert.strictEqual(home.nodes.length, graph.index.nodes.length);
        }
      }
      assert.strictEqual(JSON.stringify([...placement.nodes]), seatsBefore, "a selection changed the rest layout");
      assert.strictEqual(JSON.stringify([...layout(graph).nodes]), seatsBefore);
      assert.strictEqual(FRAME.columns.router.x - FRAME.portGap, FOCUS.left);
    }),
  );
});
