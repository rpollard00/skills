import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { arrivalSeconds, cableTiming, glyphArrivalSeconds, TIMING } from "../src/client/timing";
import { toGraph } from "../src/shared/graph";
import { layout } from "../src/shared/layout";
import { relationKey } from "../src/shared/model";
import { deriveScene } from "../src/shared/view/scene";
import { INITIAL, type Stage } from "../src/shared/view/state";
import { step } from "../src/shared/view/step";
import { indexAt, LIVE_REPO } from "./support";

const liveStage = Effect.gen(function* () {
  const graph = toGraph(yield* (yield* indexAt(LIVE_REPO)).live);
  return { graph, placement: layout(graph), viewport: { width: 1440, height: 826, reader: 460 } } satisfies Stage;
}).pipe(Effect.provide(NodeServices.layer));

describe("the motion shows the cause", () => {
  it.effect("lights each node that a selection needs at the moment its cable arrives", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      let checked = 0;
      let longest = 0;
      for (const node of stage.graph.index.nodes) {
        const scene = deriveScene({ ...stage, state: step(INITIAL, { kind: "picked", id: node.id }, stage) });
        for (const neighbour of scene.nodes) {
          if (neighbour.tone.kind !== "needs") continue;
          const cable = scene.cables.find((item) => item.tone === "out" && item.key === relationKey({ from: node.id, to: neighbour.id }));
          assert.isDefined(cable, `${node.id} needs ${neighbour.id} and has no cable to it`);
          if (cable === undefined) continue;
          assert.strictEqual(glyphArrivalSeconds(neighbour.tone), arrivalSeconds(cableTiming(cable)), `${cable.key}`);
          longest = Math.max(longest, cableTiming(cable).travelSeconds);
          checked += 1;
        }
      }
      assert.isAbove(checked, 150, "the live index has many relations to check");
      assert.isAbove(longest, 0.4, "a long cable takes longer than the 0.3 s at which each glyph lit before");
    }),
  );

  it.effect("lights each step of a trace when the pulse gets to it, and the head when the first cable does", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      for (const route of stage.graph.index.routes) {
        const scene = deriveScene({ ...stage, state: step(INITIAL, { kind: "traced", route: route.id }, stage) });
        const steps = scene.cables.filter((cable) => cable.tone === "step");
        assert.isAbove(steps.length, 0, route.task);
        assert.strictEqual(Math.min(...steps.map((cable) => cableTiming(cable).delaySeconds)), 0, `${route.task}: the first cable leaves the router at once`);

        for (const node of scene.nodes) {
          if (node.tone.kind !== "step") continue;
          const arrivals = steps.filter((cable) => cable.key.endsWith(`>${node.id}`)).map((cable) => arrivalSeconds(cableTiming(cable)));
          assert.include(arrivals, glyphArrivalSeconds(node.tone), `${route.task}: ${node.id}`);
        }
      }
    }),
  );

  it("starts a node at once when its cable starts at it", () => {
    assert.strictEqual(glyphArrivalSeconds({ kind: "neededBy", via: "runs", order: 7 }), 0);
    assert.strictEqual(glyphArrivalSeconds({ kind: "selected" }), 0);
    assert.strictEqual(glyphArrivalSeconds({ kind: "step", n: 2, order: 0, conditional: false }), TIMING.headTravelSeconds);
    assert.strictEqual(glyphArrivalSeconds({ kind: "needs", via: "runs", order: 0, length: 1e6 }), TIMING.growMaxSeconds);
  });
});
