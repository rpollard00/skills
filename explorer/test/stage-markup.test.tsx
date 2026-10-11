import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { renderToStaticMarkup } from "react-dom/server";
import { SkillMap } from "../src/client/SkillMap";
import { StageCue } from "../src/client/StageCue";
import { Strip } from "../src/client/Strip";
import { TopBar } from "../src/client/TopBar";
import { toGraph } from "../src/shared/graph";
import { layout } from "../src/shared/layout";
import { NodeId, RouteId } from "../src/shared/model";
import type { Hidden } from "../src/shared/view/lit";
import { deriveScene, type Scene } from "../src/shared/view/scene";
import { INITIAL, type Stage, type ViewEvent } from "../src/shared/view/state";
import { step } from "../src/shared/view/step";
import type { Strip as StripView } from "../src/shared/view/strip";
import { indexAt, LIVE_REPO } from "./support";

const liveStage = Effect.gen(function* () {
  const graph = toGraph(yield* (yield* indexAt(LIVE_REPO)).live);
  return { graph, placement: layout(graph), viewport: { width: 1440, height: 826, reader: 460 } } satisfies Stage;
}).pipe(Effect.provide(NodeServices.layer));

const id = Schema.decodeUnknownSync(NodeId);
const routeId = Schema.decodeUnknownSync(RouteId);

const textOf = (html: string): string => html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");

const stripHtml = (strip: StripView): string =>
  renderToStaticMarkup(<Strip strip={strip} loading={false} tracing={false} onClear={() => undefined} onOpenEvidence={() => undefined} onStep={() => undefined} />);

const hiddenPart = (strip: StripView): string | null => /<span class="strip-hidden">([^<]*)<\/span>/.exec(stripHtml(strip))?.[1] ?? null;

describe("the strip of a locked stage", () => {
  const purpose = (hidden: Hidden): StripView => ({ kind: "purpose", name: "how", text: "Explains code.", hidden });
  const trace = (hidden: Hidden): StripView => ({ kind: "trace", task: "Fix slow code", at: 0, total: 6, name: "perf-issue", shown: null, sentence: "", conditional: false, hidden });
  const onlyRouter = (hidden: Hidden): StripView => ({ kind: "onlyRouter", name: "bro", router: "mako", sentences: [], hidden });

  it("counts the relations whose other node is not in the view, in words that are true for a relation in each direction", () => {
    assert.strictEqual(hiddenPart(purpose({ kind: "relations", count: 1 })), "1 relation is with a node that is not in this view.");
    assert.strictEqual(hiddenPart(purpose({ kind: "relations", count: 2 })), "2 relations are with nodes that are not in this view.");
    assert.strictEqual(hiddenPart(purpose({ kind: "relations", count: 13 })), "13 relations are with nodes that are not in this view.");
    assert.strictEqual(hiddenPart(onlyRouter({ kind: "relations", count: 4 })), "4 relations are with nodes that are not in this view.");
  });

  it("counts the steps that are not in the view", () => {
    assert.strictEqual(hiddenPart(trace({ kind: "steps", count: 1 })), "1 step is not in this view.");
    assert.strictEqual(hiddenPart(trace({ kind: "steps", count: 5 })), "5 steps are not in this view.");
  });

  it("has no count when the view shows each relation and each step", () => {
    for (const strip of [purpose({ kind: "none" }), trace({ kind: "none" }), onlyRouter({ kind: "none" })]) assert.isNull(hiddenPart(strip), strip.kind);
  });

  it("names a selected node that is not in the view, and says how to see it", () => {
    const html = stripHtml({ kind: "notInView", name: "bro" });
    assert.strictEqual(textOf(html), "brois not in this view, and the map shows it when you turn off the lock.");
    assert.isTrue(html.includes('<span class="strip-name">bro</span><span class="strip-text">is not in this view'), "the name and the sentence are two parts, and the stylesheet puts the gap between them");
    assert.isNull(hiddenPart({ kind: "notInView", name: "bro" }));
  });
});

describe("the cue of a locked stage", () => {
  it.effect("reads as words with a space between them, for a screen reader and for a copy of the text", () =>
    Effect.gen(function* () {
      const { graph } = yield* liveStage;
      const cue = (locked: Parameters<typeof StageCue>[0]["locked"]): string => textOf(renderToStaticMarkup(<StageCue locked={locked} graph={graph} />));

      assert.strictEqual(cue({ kind: "rest" }), "Locked the rest map");
      assert.strictEqual(cue({ kind: "node", id: id("skill:architect") }), "Locked architect");
      assert.strictEqual(cue({ kind: "route", route: routeId("diagnose-and-fix-measured-slowness") }), `Locked ${graph.routes.get(routeId("diagnose-and-fix-measured-slowness"))?.task ?? ""}`);
    }),
  );
});

const nothing = (): void => undefined;

describe("the lock control", () => {
  it.effect("says whether the stage is locked, to a screen reader also", () =>
    Effect.gen(function* () {
      const { graph, placement } = yield* liveStage;
      const bar = (locked: boolean): string =>
        renderToStaticMarkup(
          <TopBar
            input={{ current: null }}
            legendControl={{ current: null }}
            graph={graph}
            load={{ kind: "ready", graph, placement, problem: null }}
            query=""
            hits={[]}
            lens="relations"
            legendOpen={false}
            fitted
            locked={locked}
            onType={nothing}
            onPick={nothing}
            onTrace={nothing}
            onHover={nothing}
            onLens={nothing}
            onFit={nothing}
            onLock={nothing}
            onLegend={nothing}
            onRetry={nothing}
          />,
        );
      const lockOf = (html: string): string => /<button[^>]*aria-label="Lock each node in its place"[^>]*>/.exec(html)?.[0] ?? "";

      assert.isTrue(lockOf(bar(true)).includes('aria-pressed="true"'), lockOf(bar(true)));
      assert.isTrue(lockOf(bar(false)).includes('aria-pressed="false"'), lockOf(bar(false)));
      assert.isTrue(lockOf(bar(true)).includes('aria-keyshortcuts="l"'));
    }),
  );
});

describe("the stage as markup", () => {
  const mapOf = (stage: Stage, scene: Scene): string =>
    renderToStaticMarkup(
      <SkillMap placement={stage.placement} camera={scene.camera} area="1440x826" scene={scene} onHover={nothing} onPick={nothing} onInspect={nothing} onDeselect={nothing} onZoom={nothing} onPan={nothing} />,
    );
  const sceneAfter = (stage: Stage, events: readonly ViewEvent[]): Scene => deriveScene({ ...stage, state: events.reduce((state, event) => step(state, event, stage), INITIAL) });
  const nodeTags = (html: string): string[] => html.match(/<g class="node"[^>]*>/g) ?? [];

  it.effect("gives a tab stop to each node on the stage, and none to a node that is off the stage", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const scene = sceneAfter(stage, [{ kind: "picked", id: id("skill:architect") }]);
      const tags = nodeTags(mapOf(stage, scene));
      const offStage = scene.nodes.filter((node) => node.offStage).length;

      assert.strictEqual(tags.length, scene.nodes.length);
      assert.isAbove(offStage, 40, "the arrangement of `architect` leaves most nodes off the stage");
      assert.strictEqual(tags.filter((tag) => tag.includes('data-off-stage="true"')).length, offStage);
      for (const tag of tags) {
        const isOff = tag.includes('data-off-stage="true"');
        assert.strictEqual(tag.includes('tabindex="0"'), !isOff, tag);
        assert.strictEqual(tag.includes('tabindex="-1"') && tag.includes('aria-hidden="true"'), isOff, tag);
      }

      const rest = nodeTags(mapOf(stage, sceneAfter(stage, [])));
      assert.isTrue(rest.length === scene.nodes.length && rest.every((tag) => tag.includes('tabindex="0"')), "each node of the rest map has a tab stop");
    }),
  );

  it.effect("draws the frame of a locked arrangement as one path, so a trunk that many cables share is not brighter than a branch", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const scene = sceneAfter(stage, [{ kind: "picked", id: id("skill:architect") }, { kind: "lockToggled" }, { kind: "picked", id: id("skill:how") }]);
      const frame = scene.cables.filter((cable) => cable.tone === "frame");
      const paths = mapOf(stage, scene).match(/<path class="stage-frame"[^>]*>/g) ?? [];

      assert.isAbove(frame.length, 10, "the arrangement of `architect` has many cables");
      assert.strictEqual(paths.length, 1);
      assert.strictEqual(/ d="([^"]*)"/.exec(paths[0] ?? "")?.[1], frame.map((cable) => cable.d).join(""), "the one path holds each cable of the frame");
    }),
  );
});
