import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { App } from "../src/client/App";
import { noApiAnswers } from "../src/client/remote";
import { SkillMap } from "../src/client/SkillMap";
import { StageCue } from "../src/client/StageCue";
import { Strip } from "../src/client/Strip";
import { TopBar } from "../src/client/TopBar";
import { toGraph } from "../src/shared/graph";
import { layout } from "../src/shared/layout";
import { NodeId, relationKey, RouteId } from "../src/shared/model";
import { GATE } from "../src/shared/polyline";
import type { Hidden } from "../src/shared/view/lit";
import { CHIP, deriveScene, type Scene } from "../src/shared/view/scene";
import { INITIAL, type Stage, type StageTarget, type ViewEvent } from "../src/shared/view/state";
import { step } from "../src/shared/view/step";
import type { Strip as StripView } from "../src/shared/view/strip";
import { indexAt, LIVE_REPO, snapshotIndex } from "./support";

/** The page with an index request that got no answer, so that a test can draw what the page shows then. No test here makes a request. */
vi.mock("../src/client/useIndex", async () => {
  const remote = await import("../src/client/remote");
  return { useIndex: () => ({ load: { kind: "failed", message: remote.noApiAnswers({ kind: "dev", apiPort: 4800, devPort: 4801 }) }, retry: () => undefined }) };
});

const liveStage = Effect.gen(function* () {
  const graph = toGraph(yield* (yield* indexAt(LIVE_REPO)).live);
  return { graph, placement: layout(graph), viewport: { width: 1440, height: 826, reader: 460 } } satisfies Stage;
}).pipe(Effect.provide(NodeServices.layer));

/** The skills as they were at the last refresh of the snapshot, for a test that names a skill or a route. */
const snapshotStage = Effect.sync((): Stage => {
  const graph = toGraph(snapshotIndex);
  return { graph, placement: layout(graph), viewport: { width: 1440, height: 826, reader: 460 } };
});

const id = Schema.decodeUnknownSync(NodeId);
const routeId = Schema.decodeUnknownSync(RouteId);

const textOf = (html: string): string => html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");

const stripHtml = (strip: StripView): string =>
  renderToStaticMarkup(<Strip strip={strip} loading={false} tracing={false} onClear={() => undefined} onOpenEvidence={() => undefined} onStep={() => undefined} />);

const hiddenPart = (strip: StripView): string | null => /<span class="strip-hidden">([^<]*)<\/span>/.exec(stripHtml(strip))?.[1] ?? null;

describe("the strip of a locked stage", () => {
  const purpose = (hidden: Hidden): StripView => ({ kind: "purpose", name: "how", text: "Explains code.", hidden });
  const trace = (hidden: Hidden, sentence = ""): StripView => ({ kind: "trace", task: "Fix slow code", at: 0, total: 6, name: "perf-issue", shown: null, sentence, conditional: false, hidden });
  const onlyRouter = (hidden: Hidden): StripView => ({ kind: "onlyRouter", name: "bro", router: "mako", sentences: [], hidden });

  it("counts the relations that are not in the view, in words that are true for each direction and for each number of other nodes", () => {
    assert.strictEqual(hiddenPart(purpose({ kind: "relations", count: 1 })), "1 relation is not in this view.");
    assert.strictEqual(hiddenPart(purpose({ kind: "relations", count: 2 })), "2 relations are not in this view.", "the two relations can be with one node, so the sentence says nothing of nodes");
    assert.strictEqual(hiddenPart(purpose({ kind: "relations", count: 13 })), "13 relations are not in this view.");
    assert.strictEqual(hiddenPart(onlyRouter({ kind: "relations", count: 4 })), "4 relations are not in this view.");
  });

  it("draws no empty part for a step that quotes no sentence", () => {
    const withoutSentence = stripHtml(trace({ kind: "none" }));
    assert.isFalse(withoutSentence.includes('<span class="strip-text">'), withoutSentence);
    assert.isTrue(stripHtml(trace({ kind: "none" }, "Runs the slow path.")).includes('<span class="strip-text">Runs the slow path.</span>'));
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
      const { graph } = yield* snapshotStage;
      const cue = (locked: Parameters<typeof StageCue>[0]["locked"]): string => textOf(renderToStaticMarkup(<StageCue locked={locked} graph={graph} />));

      assert.strictEqual(cue({ kind: "rest" }), "Locked the rest map");
      assert.strictEqual(cue({ kind: "node", id: id("skill:architect") }), "Locked architect");
      assert.strictEqual(cue({ kind: "route", route: routeId("diagnose-and-fix-measured-slowness") }), `Locked ${graph.routes.get(routeId("diagnose-and-fix-measured-slowness"))?.task ?? ""}`);
    }),
  );
});

const nothing = (): void => undefined;

const barOf = (stage: Stage, change: { readonly locked?: boolean; readonly problem?: string | null }): string =>
  renderToStaticMarkup(
    <TopBar
      input={{ current: null }}
      legendControl={{ current: null }}
      graph={stage.graph}
      load={{ kind: "ready", graph: stage.graph, placement: stage.placement, problem: change.problem ?? null }}
      query=""
      hits={[]}
      lens="relations"
      legendOpen={false}
      fitted
      locked={change.locked ?? false}
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

describe("the lock control", () => {
  it.effect("says whether the stage is locked, to a screen reader also", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const lockOf = (html: string): string => /<button[^>]*aria-label="Lock each node in its place"[^>]*>/.exec(html)?.[0] ?? "";

      assert.isTrue(lockOf(barOf(stage, { locked: true })).includes('aria-pressed="true"'), lockOf(barOf(stage, { locked: true })));
      assert.isTrue(lockOf(barOf(stage, { locked: false })).includes('aria-pressed="false"'), lockOf(barOf(stage, { locked: false })));
      assert.isTrue(lockOf(barOf(stage, { locked: true })).includes('aria-keyshortcuts="l"'));
    }),
  );
});

describe("what the page shows when no API answers", () => {
  const NO_API = noApiAnswers({ kind: "dev", apiPort: 4800, devPort: 4801 });
  const SENTENCE = "No explorer API answers on port 4800: start one in a second terminal with <code>EXPLORER_PORT=4800 npm run serve</code>.";
  const RETRY = '<button type="button" class="text-button">Retry</button>';

  it("has the sentence and a Retry control in the middle of the page, when the first request got no answer", () => {
    const page = renderToStaticMarkup(<App />);
    const notice = /<div class="notice" role="alert">(.*?)<\/div>/s.exec(page)?.[1];

    assert.strictEqual(textOf(SENTENCE), NO_API.replaceAll("`", ""), "the sentence of the client, with its command as code");
    assert.strictEqual(notice, `<p>${SENTENCE}</p>${RETRY}`);
    assert.isFalse(page.includes("status-alert"), "the bar has no second copy of the sentence");
  });

  it.effect("has the sentence in one element of the bar and a Retry control after it, when a later request got no answer", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      // The alert of the request is the first part of the status. The part after it is of the index record, which is an alert also when the record is behind.
      const alert = /<span class="status-part status-alert">(.*?)<\/span><span class="status-part/s.exec(barOf(stage, { problem: NO_API }))?.[1] ?? "";
      const parts = /^(<svg class="status-mark".*?<\/svg>)(.*)$/s.exec(alert)?.[2];

      assert.strictEqual(parts, `<span class="status-text">The map can be old. ${SENTENCE}</span>${RETRY}`, "the bar is a row with a gap between its parts: a command that is a part of its own gets a gap before its period");
      assert.isFalse(barOf(stage, { problem: null }).includes("Retry"), "with no problem the bar has no alert of the request");
    }),
  );
});

/** One render of the map for each pick on each stage: about 1,000 renders. */
const MARKUP_OF_EACH_PICK_MS = 60_000;

describe("the stage as markup", () => {
  const mapOf = (stage: Stage, scene: Scene): string =>
    renderToStaticMarkup(
      <SkillMap placement={stage.placement} camera={scene.camera} area="1440x826" scene={scene} onHover={nothing} onPick={nothing} onInspect={nothing} onDeselect={nothing} onZoom={nothing} onPan={nothing} />,
    );
  const sceneAfter = (stage: Stage, events: readonly ViewEvent[]): Scene => deriveScene({ ...stage, state: events.reduce((state, event) => step(state, event, stage), INITIAL) });
  const nodeTags = (html: string): string[] => html.match(/<g class="node"[^>]*>/g) ?? [];

  it.effect("gives a tab stop to each node on the stage, and none to a node that is off the stage", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
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

  const unescaped = (text: string): string => text.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const numberOf = (tag: string, name: string): number => Number(new RegExp(` ${name}="([^"]*)"`).exec(tag)?.[1] ?? Number.NaN);

  /** Each relation word that the markup draws: the group of a word on a line or beside a name, with the box behind the word and the text. */
  const wordsIn = (html: string) =>
    [...html.matchAll(/<g class="on-wire"([^>]*)>(.*?)<\/g>/gs)].flatMap((match) => {
      const [, attributes = "", inner = ""] = match;
      const ground = /<rect class="word-ground"[^>]*>/.exec(inner)?.[0];
      if (ground === undefined) return [];
      return [
        {
          beside: / data-beside="([^"]*)"/.exec(attributes)?.[1] ?? null,
          keys: unescaped(/ data-cables?="([^"]*)"/.exec(attributes)?.[1] ?? ""),
          tone: / data-tone="([^"]*)"/.exec(attributes)?.[1] ?? "",
          text: unescaped(/<text class="word"[^>]*>([^<]*)<\/text>/.exec(inner)?.[1] ?? ""),
          hasDot: inner.includes('class="word-dot"'),
          box: { x: numberOf(ground, "x"), y: numberOf(ground, "y"), width: numberOf(ground, "width"), height: numberOf(ground, "height") },
        },
      ];
    });
  const ringsIn = (html: string): { readonly x: number; readonly y: number }[] => (html.match(/<circle class="gate"[^>]*>/g) ?? []).map((tag) => ({ x: numberOf(tag, "cx"), y: numberOf(tag, "cy") }));

  const hundredths = (value: number): number => Math.round(value * 100) / 100;

  /** The markup of each node of the map, from the start of its group to the start of the next one. */
  const rowsIn = (html: string): Map<string, string> => new Map(html.split('<g class="node"').slice(1).map((row) => [unescaped(/^ data-node="([^"]*)"/.exec(row)?.[1] ?? ""), row]));

  /** What the markup of one row draws for its tools, with each x from the middle of its glyph: each folded mark, each chip, the ground behind the chips, and where the ring of the keyboard focus ends. */
  const toolsIn = (row: string) => {
    const ground = /<rect class="chip-ground"[^>]*>/.exec(row)?.[0];
    const ring = /<rect class="ring"[^>]*>/.exec(row)?.[0] ?? "";
    return {
      ringEnd: hundredths(numberOf(ring, "x") + numberOf(ring, "width")),
      marks: [
        ...[...row.matchAll(/<rect class="mark" x="([^"]*)"/g)].map((match) => ({ kind: "script", x: hundredths(Number(match[1])) })),
        ...[...row.matchAll(/<path class="mark line" d="M([^,]*),/g)].map((match) => ({ kind: "command", x: hundredths(Number(match[1]) - 0.7) })),
      ].toSorted((a, b) => a.x - b.x),
      chips: [...row.matchAll(/<rect class="chip-box" x="([^"]*)".*?<text class="chip-text"[^>]*>([^<]*)<\/text>/gs)].map((match) => ({ text: unescaped(match[2] ?? ""), x: hundredths(Number(match[1])) })),
      ground: ground === undefined ? null : { from: hundredths(numberOf(ground, "x")), to: hundredths(numberOf(ground, "x") + numberOf(ground, "width")), half: numberOf(ground, "height") / 2 },
      // The ground is behind each chip, so its markup comes first.
      isGroundFirst: ground === undefined || row.indexOf('class="chip-ground"') < row.indexOf('class="chip-box"'),
    };
  };

  /**
   * What the scene says that one row shows for its tools: its folded marks, or its chips with one mark before the first chip of each kind.
   * One ground is behind all the chips of the row, from the start of the first one to the end of the last one, so that no part of a line shows between two chips.
   */
  const toolsOf = (node: Scene["nodes"][number]) => {
    if (node.at.kind === "pip") return null;
    const { at } = node;
    const fromGlyph = (x: number): number => hundredths(x - at.centre.x);
    const firstOfEachKind = node.chips.filter((chip, index) => node.chips[index - 1]?.kind !== chip.kind);
    const first = node.chips[0];
    const last = node.chips.at(-1);
    const endOfTheRow = Math.max(at.label.x + at.label.width, last === undefined ? Number.NEGATIVE_INFINITY : last.x - CHIP.lead + last.width);
    return {
      // The ring ends 3.5 past the end of the row. A row of the left zone is a mirror image and has no chip, so its ring ends at its port.
      ringEnd: at.kind === "row" && at.mirrored ? null : fromGlyph(endOfTheRow + 3.5),
      marks: node.chips.length > 0 ? firstOfEachKind.map((chip) => ({ kind: chip.kind, x: fromGlyph(chip.x + 1) })) : at.marks.map((mark) => ({ kind: mark.kind, x: fromGlyph(mark.x) })),
      chips: node.chips.map((chip) => ({ text: chip.text, x: fromGlyph(chip.x - CHIP.lead) })),
      ground: first === undefined || last === undefined ? null : { from: fromGlyph(first.x - CHIP.lead), to: fromGlyph(last.x - CHIP.lead + last.width), half: CHIP.half },
    };
  };

  /** Asserts that the markup draws the tools of each row as the scene has them. It returns the number of marks and of chips. */
  const checkTools = (label: string, scene: Scene, html: string): { readonly marks: number; readonly chips: number } => {
    const rows = rowsIn(html);
    const seen = { marks: 0, chips: 0 };
    for (const node of scene.nodes) {
      const expected = toolsOf(node);
      if (node.offStage || expected === null) continue;
      const drawn = toolsIn(rows.get(node.id) ?? "");
      assert.deepStrictEqual(drawn.marks, expected.marks.toSorted((a, b) => a.x - b.x), `${label}: the tool marks of ${node.id}`);
      assert.deepStrictEqual(drawn.chips, expected.chips, `${label}: the chips of ${node.id}`);
      assert.deepStrictEqual(drawn.ground, expected.ground, `${label}: the ground behind the chips of ${node.id}`);
      if (expected.ringEnd !== null) assert.strictEqual(drawn.ringEnd, expected.ringEnd, `${label}: the ring of the keyboard focus of ${node.id} ends past the last thing of its row, and a chip is such a thing`);
      assert.isTrue(drawn.isGroundFirst, `${label}: the ground of ${node.id} is drawn over a chip`);
      seen.marks += drawn.marks.length;
      seen.chips += drawn.chips.length;
    }
    return seen;
  };

  it.effect("draws each name in full on a locked stage, each tool mark of each row, and each relation word of the scene one time with its own color: a pick takes no character from a name", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const namesIn = (html: string): Map<string, string> =>
        new Map([...html.matchAll(/<g class="node" data-node="([^"]+)"[^>]*data-off-stage="false"[^>]*>.*?<text class="label"[^>]*>([^<]*)/gs)].map((match) => [match[1] ?? "", match[2] ?? ""]));
      const stages: StageTarget[] = [{ kind: "rest" }, ...stage.graph.index.nodes.map((node): StageTarget => ({ kind: "node", id: node.id })), ...stage.graph.index.routes.map((route): StageTarget => ({ kind: "route", route: route.id }))];
      let picks = 0;
      let toolMarks = 0;
      for (const target of stages) {
        const selects: ViewEvent[] = target.kind === "rest" ? [] : target.kind === "node" ? [{ kind: "picked", id: target.id }] : [{ kind: "traced", route: target.route }];
        const locked = [...selects, { kind: "lockToggled" }, { kind: "deselected" }] satisfies ViewEvent[];
        const withNoSelection = sceneAfter(stage, locked);
        const names = namesIn(mapOf(stage, withNoSelection));
        const rows = withNoSelection.nodes.filter((node) => !node.offStage && node.at.kind !== "pip");
        assert.strictEqual(names.size, rows.length, `${target.kind}: each row of the stage has a name in the markup`);
        for (const row of rows) {
          const label = `the stage of ${target.kind === "rest" ? "the rest map" : target.kind === "node" ? target.id : target.route}, ${row.id} picked`;
          const scene = sceneAfter(stage, [...locked, { kind: "picked", id: row.id }]);
          const html = mapOf(stage, scene);
          assert.deepStrictEqual([...namesIn(html)], [...names], `${label}: a name is not as it is with no selection`);
          toolMarks += checkTools(label, scene, html).marks;

          const drawn = wordsIn(html);
          const onLines = scene.cables.flatMap((cable) => (cable.tone === "weave" || cable.words === null ? [] : [{ beside: null, keys: cable.key, tone: cable.tone, text: cable.words.text, hasDot: false }]));
          const besideNames = scene.beside.map((word) => ({ beside: word.node, keys: word.keys.join(" "), tone: word.tone, text: word.text, hasDot: word.ofFile, box: word.box }));
          const withoutBox = ({ beside, keys, tone, text, hasDot }: (typeof drawn)[number] | (typeof onLines)[number]) => ({ beside, keys, tone, text, hasDot });
          const inOrder = <Item extends { readonly keys: string }>(items: readonly Item[]): Item[] => items.toSorted((a, b) => (a.keys < b.keys ? -1 : a.keys > b.keys ? 1 : 0));
          assert.deepStrictEqual(inOrder(drawn.filter((word) => word.beside !== null)), inOrder(besideNames), `${label}: the markup draws each word that the scene puts beside a name one time, with its relations, its color, its text, and its box`);
          assert.deepStrictEqual(inOrder(drawn.filter((word) => word.beside === null).map(withoutBox)), inOrder(onLines), `${label}: the markup draws each word on a line one time`);
          for (const ring of ringsIn(html)) {
            const under = drawn.find(({ box }) => ring.x + GATE.radius > box.x && ring.x - GATE.radius < box.x + box.width && ring.y + GATE.radius > box.y && ring.y - GATE.radius < box.y + box.height);
            assert.isUndefined(under, `${label}: a ring is under the word "${under?.text}" of ${under?.keys}`);
          }
          picks += 1;
        }
      }
      assert.isAtLeast(picks, stage.graph.index.nodes.filter((node) => node.kind !== "hosted").length, "the rest map alone has one pick for each row");
      const rowsWithTools = stage.graph.index.nodes.filter((node) => node.kind === "skill" && node.tooling.scripts.length + node.tooling.commands.length > 0).length;
      assert.isAtLeast(toolMarks, rowsWithTools, "the rest map alone shows a mark for each row with a script or a command");
    }),
    MARKUP_OF_EACH_PICK_MS,
  );

  it.effect("draws the chips of each row with the Tools lens over one ground, or its folded marks where a line is: the row under the pointer keeps its chips, and a selected row does not", () =>
    Effect.gen(function* () {
      const check = (stage: Stage): { marks: number; chips: number; rowsFoldedForAPreview: number; rowsThatKeepTheirChips: number } => {
        const seen = { marks: 0, chips: 0, rowsFoldedForAPreview: 0, rowsThatKeepTheirChips: 0 };
        const count = (label: string, scene: Scene, html: string): string => {
          const tools = checkTools(label, scene, html);
          seen.marks += tools.marks;
          seen.chips += tools.chips;
          return html;
        };
        const lensed: ViewEvent[] = [{ kind: "lensed", lens: "tools" }];
        const still = sceneAfter(stage, lensed);
        const chipsAtRest = new Map([...rowsIn(count("the Tools lens", still, mapOf(stage, still)))].map(([node, row]) => [node, (row.match(/class="chip-box"/g) ?? []).length]));
        for (const node of stage.graph.index.nodes) {
          const picked = sceneAfter(stage, [...lensed, { kind: "lockToggled" }, { kind: "picked", id: node.id }]);
          count(`the Tools lens, the rest map locked, ${node.id} picked`, picked, mapOf(stage, picked));

          const label = `the Tools lens, the pointer on ${node.id}`;
          const pointed = sceneAfter(stage, [...lensed, { kind: "pointed", hover: { kind: "node", id: node.id } }]);
          const rows = rowsIn(count(label, pointed, mapOf(stage, pointed)));
          const own = pointed.nodes.find((row) => row.id === node.id)?.at;
          const ownRow = own?.kind === "pip" ? own.host : node.id;
          const drawnOnItsRow = (rows.get(ownRow)?.match(/class="chip-box"/g) ?? []).length;
          assert.strictEqual(drawnOnItsRow, chipsAtRest.get(ownRow), `${label}: the markup of the row under the pointer has each chip that it has with no pointer`);
          if (drawnOnItsRow > 0) seen.rowsThatKeepTheirChips += 1;
          seen.rowsFoldedForAPreview += [...rows].filter(([row, markup]) => !markup.includes('class="chip-box"') && (chipsAtRest.get(row) ?? 0) > 0).length;
        }
        return seen;
      };
      check(yield* liveStage);
      const ofSnapshot = check(yield* snapshotStage);
      assert.isAbove(ofSnapshot.chips, 500, "the snapshot has skills with tools, and most scenes leave their chips unfolded");
      assert.isAbove(ofSnapshot.marks, 500, "each unfolded row has one mark for each kind of tool, and each folded row has its marks");
      assert.isAbove(ofSnapshot.rowsFoldedForAPreview, 0, "the snapshot has a preview with a line at a different row that has tools");
      assert.isAbove(ofSnapshot.rowsThatKeepTheirChips, 0, "the snapshot has a row with tools to point at");
    }),
    MARKUP_OF_EACH_PICK_MS,
  );

  it.effect("closes the mark of a relation back that has a condition, and leaves the mark of each other one open, for each selection", () =>
    Effect.gen(function* () {
      const check = (stage: Stage): { closed: number; open: number } => {
        const seen = { closed: 0, open: 0 };
        for (const node of stage.graph.index.nodes) {
          const scene = sceneAfter(stage, [{ kind: "picked", id: node.id }]);
          const marks = scene.cables.flatMap((cable) => (cable.back === null ? [] : [{ key: cable.key, back: cable.back }]));
          for (const { key, back } of marks) {
            const [from = "", to = ""] = key.split(">");
            assert.strictEqual(back.conditional, stage.graph.relations.get(relationKey({ from: id(to), to: id(from) }))?.conditional, `${key}: the mark says whether the relation back has a condition`);
          }
          const drawn = (mapOf(stage, scene).match(/<path class="back"[^>]*>/g) ?? []).map((tag) => ({ isSaidClosed: tag.includes('data-conditional="true"'), isClosed: /Z"/.test(tag) }));
          assert.deepStrictEqual(drawn.map((mark) => mark.isClosed).sort(), marks.map(({ back }) => back.conditional).sort(), `${node.id}: a closed mark for each relation back with a condition`);
          assert.isTrue(drawn.every((mark) => mark.isClosed === mark.isSaidClosed), node.id);
          seen.closed += drawn.filter((mark) => mark.isClosed).length;
          seen.open += drawn.filter((mark) => !mark.isClosed).length;
        }
        return seen;
      };
      check(yield* liveStage);
      const ofSnapshot = check(yield* snapshotStage);
      assert.isAbove(ofSnapshot.closed, 0, "the snapshot has a pair whose relation back has a condition");
      assert.isAbove(ofSnapshot.open, 0, "the snapshot has a pair whose relation back has no condition");
    }),
    MARKUP_OF_EACH_PICK_MS,
  );

  it.effect("draws the frame of a locked arrangement as one path, so a trunk that many cables share is not brighter than a branch", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const scene = sceneAfter(stage, [{ kind: "picked", id: id("skill:architect") }, { kind: "lockToggled" }, { kind: "picked", id: id("skill:how") }]);
      const frame = scene.cables.filter((cable) => cable.tone === "frame");
      const paths = mapOf(stage, scene).match(/<path class="stage-frame"[^>]*>/g) ?? [];

      assert.isAbove(frame.length, 10, "the arrangement of `architect` has many cables");
      assert.strictEqual(paths.length, 1);
      assert.strictEqual(/ d="([^"]*)"/.exec(paths[0] ?? "")?.[1], frame.map((cable) => cable.d).join(""), "the one path holds each cable of the frame");
    }),
  );
});
