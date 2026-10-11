import { readFileSync } from "node:fs";
import nodePath from "node:path";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { toGraph, type Graph } from "../src/shared/graph";
import { captionWidth, WORD_BOX, wordWidthOf } from "../src/shared/focus-layout";
import { distance, FRAME, layout, type Point, type Rect } from "../src/shared/layout";
import { NodeId, relationKey, RouteId, type ExplorerIndex, type Relation } from "../src/shared/model";
import { GATE, WORD_CLEAR } from "../src/shared/polyline";
import { arrangementOf, stageBoundsOf } from "../src/shared/view/arranged";
import { wordsOf } from "../src/shared/view/cable-class";
import { resolveCamera } from "../src/shared/view/camera";
import { decodeHash, encodeHash } from "../src/shared/view/hash";
import { historyAction, normalizePlace } from "../src/shared/view/history";
import { eventsAtArrival, keyPressOf, lockKey, lockPressOf, togglesLock, type KeyPress, type PageKeyEvent } from "../src/shared/view/keys";
import type { Hidden } from "../src/shared/view/lit";
import { CHIP, deriveScene, isAtChips, type CableView, type Scene } from "../src/shared/view/scene";
import { INITIAL, placeOf, stageTargetOf, type Pin, type Stage, type StageTarget, type ViewEvent, type ViewState } from "../src/shared/view/state";
import { step } from "../src/shared/view/step";
import { traceOf } from "../src/shared/view/trace";
import { indexAt, LIVE_REPO, snapshotIndex } from "./support";
import { coveredByChips, isInside, overlap, placesOf, railUnder, roomOn, rowOf, strangersUnder, thingsOf, visibleRectOf, wordBoxesOf, wordsBeforeATick, wordsUnderNames } from "./word-rules";
import { WORDS_LEFT_OFF } from "./words-left-off";

const stageOf = (index: ExplorerIndex): Stage => {
  const graph = toGraph(index);
  return { graph, placement: layout(graph), viewport: { width: 1440, height: 826, reader: 460 } };
};

/** The skills as they are now. A test on this stage states a rule that holds for each content of `skills/`: it names no skill, no route, and no count of today. */
const liveStage = Effect.gen(function* () {
  return stageOf(yield* (yield* indexAt(LIVE_REPO)).live);
}).pipe(Effect.provide(NodeServices.layer));

const snapshot = stageOf(snapshotIndex);

/** The skills as they were at the last refresh of the snapshot. A test that names a skill, a route, a file, or a count uses this stage. */
const snapshotStage = Effect.succeed(snapshot);

const id = Schema.decodeUnknownSync(NodeId);
const routeId = Schema.decodeUnknownSync(RouteId);

const run = (stage: Stage, events: readonly ViewEvent[], from: ViewState = INITIAL): ViewState => events.reduce((state, event) => step(state, event, stage), from);

const everyStage = (graph: Graph): StageTarget[] => [
  { kind: "rest" },
  ...graph.index.nodes.map((node): StageTarget => ({ kind: "node", id: node.id })),
  ...graph.index.routes.map((route): StageTarget => ({ kind: "route", route: route.id })),
];

const selects = (target: StageTarget): ViewEvent[] =>
  target.kind === "rest" ? [] : target.kind === "node" ? [{ kind: "picked", id: target.id }] : [{ kind: "traced", route: target.route }];

const lockedOn = (stage: Stage, target: StageTarget): ViewState => run(stage, [...selects(target), { kind: "lockToggled" }]);

const nameOfStage = (target: StageTarget): string => (target.kind === "rest" ? "the rest map" : target.kind === "node" ? target.id : `route ${target.route}`);

const seatsOf = (scene: Scene): string => scene.nodes.map((node) => `${node.id}@${node.at.centre.x},${node.at.centre.y}${node.offStage ? " off" : ""}`).sort().join("\n");

const onStage = (scene: Scene): NodeId[] => scene.nodes.filter((node) => !node.offStage).map((node) => node.id);

const hiddenOf = (scene: Scene): Hidden => ("hidden" in scene.strip ? scene.strip.hidden : { kind: "none" });

const hiddenRelations = (scene: Scene): number => {
  const hidden = hiddenOf(scene);
  return hidden.kind === "relations" ? hidden.count : 0;
};

const lit = (scene: Scene) => scene.cables.filter((cable) => cable.tone === "out" || cable.tone === "in" || cable.tone === "step");

const relationsOf = (graph: Graph, node: NodeId): Relation[] => [...(graph.out.get(node) ?? []), ...(graph.into.get(node) ?? [])];

describe("a locked stage", () => {
  it.effect("moves no node for each pick of a node on it, on each stage of the live index", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      let picks = 0;
      for (const target of everyStage(stage.graph)) {
        const locked = lockedOn(stage, target);
        assert.deepStrictEqual<unknown>(locked.pin, { kind: "locked", stage: target }, nameOfStage(target));
        const before = seatsOf(deriveScene({ ...stage, state: locked }));
        for (const node of onStage(deriveScene({ ...stage, state: locked }))) {
          const picked = step(locked, { kind: "picked", id: node }, stage);
          assert.deepStrictEqual<unknown>(picked.focus, { kind: "node", id: node });
          assert.deepStrictEqual<unknown>(picked.pin, locked.pin, `${nameOfStage(target)}: a pick of ${node} changed the lock`);
          assert.strictEqual(seatsOf(deriveScene({ ...stage, state: picked })), before, `${nameOfStage(target)}: a pick of ${node} moved a node`);
          picks += 1;
        }
      }
      assert.isAtLeast(picks, stage.graph.index.nodes.length, "the rest map alone has one pick for each node");
    }),
  );

  it.effect("moves no node for each other event: a trace, a query, a link, Escape, a click on the empty stage, a pick of a node that is not on it", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const [route] = stage.graph.index.routes;
      const aFile = stage.graph.index.nodes[0]?.entry ?? "skills/none/SKILL.md";
      for (const target of everyStage(stage.graph)) {
        const locked = lockedOn(stage, target);
        const scene = deriveScene({ ...stage, state: locked });
        const before = seatsOf(scene);
        const absent = scene.nodes.find((node) => node.offStage)?.id ?? id("skill:not-a-skill-of-the-index");
        const events: ViewEvent[] = [
          ...(route === undefined ? [] : ([{ kind: "traced", route: route.id }, { kind: "stepped", by: 1 }] satisfies ViewEvent[])),
          { kind: "typed", query: "verif" },
          { kind: "linkFollowed", path: aFile, anchor: null, line: null },
          { kind: "picked", id: absent },
          { kind: "lensed", lens: "tools" },
          { kind: "legendToggled", cls: "cite" },
          { kind: "wentBack" },
          { kind: "readerClosed" },
          { kind: "cleared" },
          { kind: "cleared" },
          { kind: "cleared" },
          { kind: "deselected" },
          { kind: "fitted" },
        ];
        let state = locked;
        for (const event of events) {
          state = step(state, event, stage);
          assert.deepStrictEqual<unknown>(state.pin, locked.pin, `${nameOfStage(target)}: ${event.kind} changed the lock`);
          assert.strictEqual(seatsOf(deriveScene({ ...stage, state })), before, `${nameOfStage(target)}: ${event.kind} moved a node`);
        }
      }
    }),
  );

  it.effect("starts with no node moved and no camera move, on each stage and after each step of a trace", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      let locks = 0;
      for (const target of everyStage(stage.graph)) {
        const selected = run(stage, selects(target));
        const afterSteps = target.kind === "route" ? [run(stage, [{ kind: "stepped", by: 1 }], selected), run(stage, [{ kind: "stepped", by: 1 }, { kind: "stepped", by: 1 }, { kind: "stepped", by: -1 }], selected)] : [];
        for (const open of [selected, ...afterSteps]) {
          const label = `${nameOfStage(target)}${open.focus.kind === "route" ? `, cursor ${open.focus.cursor}` : ""}`;
          const locked = step(open, { kind: "lockToggled" }, stage);
          assert.deepStrictEqual<unknown>(locked.pin, { kind: "locked", stage: target }, `${label}: the lock holds a different stage`);
          assert.strictEqual(seatsOf(deriveScene({ ...stage, state: locked })), seatsOf(deriveScene({ ...stage, state: open })), `${label}: the lock moved a node`);
          assert.deepStrictEqual(resolveCamera(locked, stage), resolveCamera(open, stage), `${label}: the lock moved the camera`);
          assert.deepStrictEqual<unknown>(step(locked, { kind: "lockToggled" }, stage).pin, { kind: "unlocked" });
          locks += 1;
        }
      }
      assert.isAtLeast(locks, everyStage(stage.graph).length + stage.graph.index.routes.length, "each stage, and each route also after a step");
    }),
  );

  it.effect("keeps the camera of a locked stage for a pick, and ends with the arrangement of the selection", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const how = id("skill:how");
      const architect = id("skill:architect");

      const inArchitect = run(stage, [{ kind: "picked", id: architect }, { kind: "lockToggled" }, { kind: "picked", id: how }]);
      assert.deepStrictEqual<unknown>(stageTargetOf(inArchitect), { kind: "node", id: architect }, "the stage is still the arrangement of `architect`");
      const camera = resolveCamera(inArchitect, stage);
      assert.deepStrictEqual(resolveCamera(run(stage, [{ kind: "picked", id: architect }, { kind: "lockToggled" }]), stage), camera, "the reader stays open, so a pick on a locked stage moves no camera");
      assert.deepStrictEqual(resolveCamera(step(inArchitect, { kind: "picked", id: id("skill:arena") }, stage), stage), camera);

      const moved = step(inArchitect, { kind: "panned", dx: 30, dy: 10 }, stage);
      const afterPick = step(moved, { kind: "picked", id: id("skill:arena") }, stage);
      assert.deepStrictEqual<unknown>(afterPick.camera, moved.camera, "a pick on a locked stage does not put a camera that the user moved back to the fit");
      assert.deepStrictEqual<unknown>(step(run(stage, [{ kind: "picked", id: architect }, { kind: "panned", dx: 30, dy: 10 }]), { kind: "picked", id: how }, stage).camera, { kind: "fit" }, "on a stage that follows the selection, a pick does");
      assert.deepStrictEqual<unknown>(step(afterPick, { kind: "fitted" }, stage).camera, { kind: "fit" }, "the Fit control fits a locked stage");

      const bounds = arrangementOf(stage.graph, { kind: "node", id: architect })?.bounds;
      const withoutReader = step(inArchitect, { kind: "readerClosed" }, stage);
      assert.isDefined(bounds);
      if (bounds === undefined) return;
      for (const [state, width] of [[inArchitect, 1440 - 460], [withoutReader, 1440]] as const) {
        const fitted = resolveCamera(state, stage);
        assert.isAtLeast(fitted.tx + bounds.x * fitted.scale, -0.001);
        assert.isAtMost(fitted.tx + (bounds.x + bounds.width) * fitted.scale, width + 0.001, "a camera that fits keeps the whole locked stage beside the reader");
      }
      assert.isAbove(resolveCamera(withoutReader, stage).scale, camera.scale, "the reader closed, so the same stage has more room");

      const unlocked = step(inArchitect, { kind: "lockToggled" }, stage);
      assert.deepStrictEqual<unknown>([unlocked.pin, unlocked.focus, unlocked.camera], [{ kind: "unlocked" }, { kind: "node", id: how }, { kind: "fit" }]);
      assert.strictEqual(seatsOf(deriveScene({ ...stage, state: unlocked })), seatsOf(deriveScene({ ...stage, state: run(stage, [{ kind: "picked", id: how }]) })), "the unlocked stage is the arrangement of `how`");

      const cleared = run(stage, [{ kind: "cleared" }, { kind: "cleared" }, { kind: "lockToggled" }], inArchitect);
      assert.deepStrictEqual<unknown>([cleared.pin, cleared.focus], [{ kind: "unlocked" }, { kind: "none" }]);
      const rest = deriveScene({ ...stage, state: cleared });
      assert.isTrue(rest.nodes.every((node) => node.at === stage.placement.nodes.get(node.id) && !node.offStage), "with no selection, the unlocked stage is the rest map");
    }),
  );

  it.effect("keeps the lock and the seats when Escape or a click on the empty stage ends the selection", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const locked = run(stage, [{ kind: "picked", id: id("skill:architect") }, { kind: "lockToggled" }, { kind: "picked", id: id("skill:how") }]);
      const before = seatsOf(deriveScene({ ...stage, state: locked }));

      const closed = step(locked, { kind: "cleared" }, stage);
      assert.deepStrictEqual<unknown>([closed.reading.kind, closed.focus, closed.pin], ["closed", locked.focus, locked.pin], "the first Escape closes the reader");
      const ended = step(closed, { kind: "cleared" }, stage);
      assert.deepStrictEqual<unknown>([ended.focus, ended.pin], [{ kind: "none" }, locked.pin], "the second Escape ends the selection and keeps the lock");
      assert.deepStrictEqual<unknown>(step(ended, { kind: "cleared" }, stage).pin, locked.pin, "one more Escape does not unlock");

      const clicked = step(locked, { kind: "deselected" }, stage);
      assert.deepStrictEqual<unknown>([clicked.focus, clicked.reading.kind, clicked.pin], [{ kind: "none" }, "closed", locked.pin]);
      for (const state of [closed, ended, clicked]) assert.strictEqual(seatsOf(deriveScene({ ...stage, state })), before);
    }),
  );
});

describe("the key of the lock", () => {
  const press = (change: Partial<KeyPress>): KeyPress => ({ key: "l", ctrlKey: false, metaKey: false, altKey: false, repeat: false, isTyping: false, ...change });

  it("toggles on one press of L, with or without Shift", () => {
    assert.isTrue(togglesLock(press({})));
    assert.isTrue(togglesLock(press({ key: "L" })));
    assert.isFalse(togglesLock(press({ key: "k" })));
    assert.isFalse(togglesLock(press({ key: "Escape" })));
  });

  it("toggles one time while the key stays down", () => {
    const held = [press({}), ...Array.from({ length: 5 }, () => press({ repeat: true }))];
    assert.strictEqual(held.filter(togglesLock).length, 1);
  });

  it("does not toggle while the user types in a text field", () => {
    assert.isFalse(togglesLock(press({ isTyping: true })));
  });

  it("leaves each shortcut of the browser alone", () => {
    assert.isFalse(togglesLock(press({ ctrlKey: true })), "Ctrl+L goes to the address bar");
    assert.isFalse(togglesLock(press({ metaKey: true })));
    assert.isFalse(togglesLock(press({ altKey: true })));
  });
});

describe("the lock key before the index is there", () => {
  const press = (change: Partial<KeyPress>): KeyPress => ({ key: "l", ctrlKey: false, metaKey: false, altKey: false, repeat: false, isTyping: false, ...change });

  it("holds a press until the index arrives, and does nothing for an event that is not a press of the lock key", () => {
    assert.strictEqual(lockPressOf(press({}), true), "toggle");
    assert.strictEqual(lockPressOf(press({}), false), "hold");
    for (const isIndexReady of [true, false]) {
      assert.strictEqual(lockPressOf(press({ repeat: true }), isIndexReady), "none");
      assert.strictEqual(lockPressOf(press({ isTyping: true }), isIndexReady), "none");
      assert.strictEqual(lockPressOf(press({ ctrlKey: true }), isIndexReady), "none");
      assert.strictEqual(lockPressOf(press({ key: "k" }), isIndexReady), "none");
    }
  });

  it.effect("turns the lock when the index arrives: on for the stage of the address, off for an address that has a lock", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const arrive = (hash: string, heldPresses: number): ViewState => run(stage, eventsAtArrival(decodeHash(hash), heldPresses));

      assert.deepStrictEqual<unknown>(arrive("#/", 0).pin, { kind: "unlocked" });
      assert.deepStrictEqual<unknown>(arrive("#/", 1).pin, { kind: "locked", stage: { kind: "rest" } }, "one press before the index locks the rest map");
      assert.deepStrictEqual<unknown>(arrive("#/skill/how", 1).pin, { kind: "locked", stage: { kind: "node", id: "skill:how" } }, "the lock holds the stage that the address shows");
      assert.deepStrictEqual<unknown>(arrive("#/skill/how?lock=skill/architect", 1).pin, { kind: "unlocked" }, "a press on an address that has a lock turns the lock off");
      assert.deepStrictEqual<unknown>(arrive("#/skill/how", 2).pin, { kind: "unlocked" }, "two presses give the lock of the address");
      assert.deepStrictEqual<unknown>(arrive("#/skill/no-such-skill", 1).pin, { kind: "locked", stage: { kind: "rest" } }, "the address names no node of the index, so the stage is the rest map");
      assert.deepStrictEqual<unknown>(arrive("#/skill/how", 3).focus, { kind: "node", id: "skill:how" });
    }),
  );
});

describe("the lock key of the page", () => {
  const event = (change: Partial<PageKeyEvent>): PageKeyEvent => ({ key: "l", ctrlKey: false, metaKey: false, altKey: false, repeat: false, target: { tagName: "BODY", isContentEditable: false }, ...change });
  const place = decodeHash("#/");

  it("reads each part of a key event of the browser: the key, each modifier, the repeat, and whether the focus is in a text field", () => {
    assert.deepStrictEqual<unknown>(keyPressOf(event({})), { key: "l", ctrlKey: false, metaKey: false, altKey: false, repeat: false, isTyping: false });
    assert.deepStrictEqual<unknown>(keyPressOf(event({ key: "L", ctrlKey: true })), { key: "L", ctrlKey: true, metaKey: false, altKey: false, repeat: false, isTyping: false });
    assert.isTrue(keyPressOf(event({ metaKey: true })).metaKey);
    assert.isTrue(keyPressOf(event({ altKey: true })).altKey);
    assert.isTrue(keyPressOf(event({ repeat: true })).repeat, "a key that stays down");
    for (const target of [{ tagName: "INPUT" }, { tagName: "TEXTAREA" }, { tagName: "DIV", isContentEditable: true }]) assert.isTrue(keyPressOf(event({ target })).isTyping, JSON.stringify(target));
    for (const target of [{ tagName: "DIV", isContentEditable: false }, { tagName: "BUTTON" }, null, undefined, "INPUT"]) assert.isFalse(keyPressOf(event({ target })).isTyping, JSON.stringify(target));
  });

  it("turns the lock for one press, and for no event that is not a press of the key", () => {
    const lock = lockKey();
    assert.deepStrictEqual<unknown>(lock.onKey(event({}), true), [{ kind: "lockToggled" }]);
    assert.isNull(lock.onKey(event({ repeat: true }), true), "the key stays down: each repeat would turn the lock back");
    assert.isNull(lock.onKey(event({ target: { tagName: "INPUT" } }), true), "the letter is text in the finder");
    assert.isNull(lock.onKey(event({ ctrlKey: true }), true));
    assert.isNull(lock.onKey(event({ key: "Escape" }), true), "the page gives the event to its other keys");
  });

  it("holds each press that comes before the index, and applies the presses one time when the index arrives", () => {
    const arrivalAfter = (presses: number): ViewEvent[] => {
      const lock = lockKey();
      for (let press = 0; press < presses; press += 1) assert.deepStrictEqual(lock.onKey(event({}), false), [], "a press that waits is a press of the lock key, and it changes nothing yet");
      return lock.onArrival(place);
    };
    assert.deepStrictEqual<unknown>(arrivalAfter(0), [{ kind: "restored", place }]);
    assert.deepStrictEqual<unknown>(arrivalAfter(1), [{ kind: "restored", place }, { kind: "lockToggled" }]);
    assert.deepStrictEqual<unknown>(arrivalAfter(2), [{ kind: "restored", place }], "two presses turn the lock on and off");
    assert.deepStrictEqual<unknown>(arrivalAfter(3), [{ kind: "restored", place }, { kind: "lockToggled" }]);

    const lock = lockKey();
    lock.onKey(event({}), false);
    lock.onKey(event({ repeat: true }), false);
    lock.onKey(event({ target: { tagName: "TEXTAREA" } }), false);
    assert.strictEqual(lock.onArrival(place).length, 2, "the repeat and the letter in a text field are not presses");
    assert.deepStrictEqual<unknown>(lock.onArrival(place), [{ kind: "restored", place }], "the index arrives again after a refresh: the press that waited is not applied a second time");
  });

  it("is the one call of the page for a key event and for the arrival of the index", () => {
    const app = readFileSync(nodePath.resolve(import.meta.dirname, "..", "src", "client", "App.tsx"), "utf8");
    assert.include(app, "const lockEvents = lock.onKey(event, ready);", "the page gives the event of the browser itself to the lock key");
    assert.include(app, "for (const event of lock.onArrival(decodeHash(window.location.hash))) dispatch(event);");
    assert.include(app, "for (const lockEvent of lockEvents) dispatch(lockEvent);");
    assert.notMatch(app, /event\.repeat\b|lockPressOf|eventsAtArrival|keyPressOf/, "the page reads no part of the event for the lock, and it counts no press");
  });
});

describe("the address of a locked stage", () => {
  const pins: Pin[] = [
    { kind: "unlocked" },
    { kind: "locked", stage: { kind: "rest" } },
    { kind: "locked", stage: { kind: "node", id: id("skill:architect") } },
    { kind: "locked", stage: { kind: "node", id: id("playbook:perf-issue") } },
    { kind: "locked", stage: { kind: "node", id: id("hosted:skills/mako/references/execution.md") } },
    { kind: "locked", stage: { kind: "route", route: routeId("diagnose-and-fix-measured-slowness") } },
  ];

  it("round-trips each lock with each selection", () => {
    const focuses: ViewState["focus"][] = [{ kind: "none" }, { kind: "node", id: id("skill:how") }, { kind: "route", route: routeId("design-a-module-or-interface"), cursor: 1 }];
    for (const pin of pins) {
      for (const focus of focuses) {
        const place = { ...placeOf(INITIAL), focus, pin, query: "a b", reading: { kind: "open", path: "skills/how/SKILL.md", anchor: null, line: 3, back: [] } } satisfies ReturnType<typeof placeOf>;
        assert.deepStrictEqual<unknown>(decodeHash(encodeHash(place)), place, encodeHash(place));
      }
    }
    assert.strictEqual(encodeHash({ ...placeOf(INITIAL), pin: { kind: "unlocked" } }), "#/", "an unlocked place has the address that it had before the lock");
    assert.isTrue(encodeHash({ ...placeOf(INITIAL), pin: { kind: "locked", stage: { kind: "rest" } } }).includes("lock="));
  });

  it("reads each id of a lock as it was written, when the id has a percent sign or a slash", () => {
    const awkward: Pin[] = [
      { kind: "locked", stage: { kind: "route", route: routeId("a%41b") } },
      { kind: "locked", stage: { kind: "route", route: routeId("fix/slow%2Fpath") } },
      { kind: "locked", stage: { kind: "route", route: routeId("50% of a+b") } },
      { kind: "locked", stage: { kind: "node", id: id("skill:a%41b") } },
      { kind: "locked", stage: { kind: "node", id: id("hosted:skills/x/100%25.md") } },
    ];
    for (const pin of awkward) {
      const place = { ...placeOf(INITIAL), focus: { kind: "node", id: id("skill:how") }, pin } satisfies ReturnType<typeof placeOf>;
      assert.deepStrictEqual<unknown>(decodeHash(encodeHash(place)).pin, pin, encodeHash(place));
    }
  });

  it.effect("reads a lock value that is not a stage of the index as unlocked, and does not throw", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const hostile = ["", "1", "true", "rest/", "/rest", "REST", "skill", "skill/", "skill//", "route", "route/", "route/%", "%E0%A4%A", "../..", "__proto__", "constructor/prototype", "skill/a b", "node:x", "x".repeat(5000), "\u0000", "💥"];
      for (const value of hostile) {
        for (const hash of [`#/?lock=${value}`, `#/skill/how?lock=${value}&doc=x`, `#/?lock=${encodeURIComponent(value)}`]) {
          const shown = normalizePlace(decodeHash(hash), stage.graph);
          assert.deepStrictEqual<unknown>(shown.pin, { kind: "unlocked" }, hash);
          assert.deepStrictEqual<unknown>(step(INITIAL, { kind: "restored", place: decodeHash(hash) }, stage).pin, { kind: "unlocked" }, hash);
        }
      }
      assert.deepStrictEqual<unknown>(decodeHash("#/?lock=").pin, { kind: "unlocked" }, "a value that is not the form of a stage gives no lock, before the index is there");
      assert.deepStrictEqual<unknown>(decodeHash("#/?lock=skill").pin, { kind: "unlocked" });
      assert.deepStrictEqual<unknown>(decodeHash("#/?lock=rest").pin, { kind: "locked", stage: { kind: "rest" } });
      assert.deepStrictEqual<unknown>(decodeHash("#/?lock=rest&lock=skill/how").pin, { kind: "locked", stage: { kind: "rest" } }, "the first value counts");
    }),
  );

  it.effect("drops a lock on a stage that the index does not hold, and restores a lock that it holds", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const gone = normalizePlace(decodeHash("#/skill/how?lock=skill/no-such-skill"), stage.graph);
      assert.deepStrictEqual<unknown>([gone.pin, gone.focus], [{ kind: "unlocked" }, { kind: "node", id: "skill:how" }]);
      assert.deepStrictEqual<unknown>(normalizePlace(decodeHash("#/?lock=route/no-such-route"), stage.graph).pin, { kind: "unlocked" });
      assert.strictEqual(historyAction({ shown: decodeHash("#/skill/how?lock=skill/no-such-skill"), place: gone, graph: stage.graph }), "replace");

      const locked = run(stage, [{ kind: "picked", id: id("skill:architect") }, { kind: "lockToggled" }, { kind: "picked", id: id("skill:how") }]);
      const restored = step(INITIAL, { kind: "restored", place: decodeHash(encodeHash(placeOf(locked))) }, stage);
      assert.deepStrictEqual<unknown>([restored.pin, restored.focus], [locked.pin, locked.focus]);
      assert.strictEqual(seatsOf(deriveScene({ ...stage, state: restored })), seatsOf(deriveScene({ ...stage, state: locked })), "a reload of a locked address gives the same seats");
      assert.deepStrictEqual(lit(deriveScene({ ...stage, state: restored })).map((cable) => cable.key).sort(), lit(deriveScene({ ...stage, state: locked })).map((cable) => cable.key).sort(), "and the same lit cables");
      assert.strictEqual(historyAction({ shown: placeOf(locked), place: placeOf(step(locked, { kind: "lockToggled" }, stage)), graph: stage.graph }), "replace", "the lock is not a new entry of the history");
    }),
  );
});

const rectsMeet = (a: Rect, b: Rect): boolean => a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;

const segmentsOf = (points: readonly Point[]): [Point, Point][] => points.slice(1).map((to, index) => [points[index] ?? to, to]);

const boxOf = (words: NonNullable<CableView["words"]>): Rect => {
  const width = wordWidthOf(words.text);
  return { x: words.at.x - width / 2, y: words.at.y - WORD_BOX.height / 2, width, height: WORD_BOX.height };
};

const uprightsOf = (cable: CableView): Rect[] =>
  segmentsOf(cable.points).flatMap(([first, second]) => (first.x === second.x && first.y !== second.y ? [{ x: first.x, y: Math.min(first.y, second.y), width: 0, height: Math.abs(first.y - second.y) }] : []));

/** The run of a cable next to the node at its other end: from the port of that node to the first corner. */
const farRunOf = (cable: CableView, far: "start" | "end"): { readonly port: Point; readonly corner: Point } => {
  const [port, corner] = far === "end" ? cable.points.toReversed() : cable.points;
  return { port: port ?? { x: 0, y: 0 }, corner: corner ?? { x: 0, y: 0 } };
};

interface Marked {
  readonly cable: CableView;
  /** The end of the cable at which the other node is. */
  readonly far: "start" | "end";
  /** A cable that leaves the selection comes before a cable that enters it, and each side is in the order of the motion. */
  readonly precedence: number;
  readonly conditional: boolean;
}

interface WordFaults {
  boxesThatMeet: number;
  boxesUnderAnUpright: number;
  boxesUnderAnUprightOfTheFrame: number;
  words: number;
  wordsBeside: number;
  gates: number;
  /** A cable with a condition whose run next to the other node is too short for a ring, and whose bend is on a trunk. */
  conditionsWithoutRoomForAGate: number;
}

const NO_FAULTS: WordFaults = { boxesThatMeet: 0, boxesUnderAnUpright: 0, boxesUnderAnUprightOfTheFrame: 0, words: 0, wordsBeside: 0, gates: 0, conditionsWithoutRoomForAGate: 0 };

/** What the locked stages leave without a word: how many relations for each stage, and of all of these the relations with a condition that have no ring also. */
interface LeftOff {
  readonly byStage: { [stage: string]: number };
  readonly withAConditionAndNoRing: string[];
}

const nothingLeftOff = (): LeftOff => ({ byStage: {}, withAConditionAndNoRing: [] });

/**
 * The rules of the relation words of one scene of a locked stage. Each rule reads the scene as the map draws it.
 * - A lit relation shows its word in one place, with its own text and the color of its own line. The relation back of a pair shows none.
 * - A relation shows no word only when no place that the rules permit has room for it. This notes it in `leftOff`.
 *   A place is on each level part of its own line, also on a part in the middle of the line, and beside the name of the other node.
 * - A word is inside what the camera fits. It is on no line of a different relation and on no branch of the rail, over no part of a row, no caption, no mark of a line, and no other word.
 * - A word under a name starts at the lower edge of its label, so it is nearer to its own name than to the row below. It has no lit row directly below it.
 * - A word is not before the mark of the router of its row, where it would read as a relation into the node.
 */
const checkWords = (label: string, scene: Scene, stage: Stage, target: StageTarget, lead: NodeId | null, leftOff: LeftOff): void => {
  const { graph } = stage;
  const mine = lit(scene);
  const bounds = stageBoundsOf(arrangementOf(graph, target), stage.placement);
  const boxes = wordBoxesOf(scene);
  const things = thingsOf(scene, stage.placement);
  const hasRoom = roomOn(scene, stage.placement, bounds);

  for (const cable of mine) {
    const relation = graph.relations.get(cable.key);
    assert.isDefined(relation, cable.key);
    if (relation === undefined) continue;
    const isTheRelationBack = lead !== null && relation.to === lead && mine.some((other) => other.key === relationKey({ from: lead, to: relation.from }));
    const neighbour = lead === null || relation.from === lead ? relation.to : relation.from;
    const shown = boxes.filter((word) => word.keys.includes(cable.key));
    assert.isAtMost(shown.length, isTheRelationBack ? 0 : 1, `${label}: ${cable.key} shows its word in ${shown.length} places`);
    const [word] = shown;
    if (word !== undefined) {
      assert.strictEqual(word.text, wordsOf(relation), `${label}: the word of ${cable.key}`);
      assert.strictEqual(word.tone, cable.tone, `${label}: the word of ${cable.key} has the color of a different line`);
      if (word.place === "beside") assert.strictEqual(word.node, rowOf(scene, neighbour)?.id, `${label}: the word of ${cable.key} is beside a node that is not at the other end from the selection`);
    }
    if (word !== undefined || isTheRelationBack) continue;
    const free = placesOf(scene, cable, wordsOf(relation), neighbour).find((place) => hasRoom(place, cable, neighbour));
    assert.isUndefined(free, `${label}: ${cable.key} shows no word, and the place ${free?.name} has room for it`);
    leftOff.byStage[nameOfStage(target)] = (leftOff.byStage[nameOfStage(target)] ?? 0) + 1;
    if (relation.conditional && cable.gate === null) leftOff.withAConditionAndNoRing.push(`${label}: ${cable.key}`);
  }

  for (const word of scene.beside) {
    assert.isAbove(word.keys.length, 0, `${label}: a word beside ${word.node} is of no relation`);
    assert.isTrue(word.keys.every((key) => mine.some((cable) => cable.key === key)), `${label}: a word beside ${word.node} is of a relation that is not lit`);
  }
  for (const [index, word] of boxes.entries()) {
    const name = `${label}: the word "${word.text}" of ${word.keys.join(" and ")}`;
    assert.isTrue(isInside(word.rect, bounds), `${name} is outside what the camera fits`);
    assert.deepStrictEqual(strangersUnder(word, scene).map((cable) => `${cable.key} (${cable.tone})`), [], `${name} is on a line of a different relation`);
    assert.deepStrictEqual(railUnder(word, scene, stage.placement), [], `${name} is on a branch of the rail`);
    for (const thing of things) assert.isFalse(overlap(word.rect, thing.rect), `${name} is over ${thing.name}`);
    for (const other of boxes.slice(index + 1)) assert.isFalse(overlap(word.rect, other.rect), `${name} is over the word "${other.text}" of ${other.keys.join(" and ")}`);
  }
  for (const under of wordsUnderNames(scene, stage.placement)) {
    const name = `${label}: the word "${under.word.text}" under ${under.word.node}`;
    assert.deepStrictEqual(under.litBelow, [], `${name} is over a lit row, which is as near to it as its own name`);
    assert.isAtLeast(under.gap.toItsName, 0, `${name} is over its own name`);
    assert.isBelow(under.gap.toItsName, under.gap.toTheRowBelow, `${name} is ${under.gap.toItsName} below its own label and ${under.gap.toTheRowBelow} above the label of the row below: it is not nearer to its own name`);
  }
  assert.deepStrictEqual(wordsBeforeATick(scene).map((word) => `"${word.text}" beside ${word.node}`), [], `${label}: a word is before the mark of the router of its row, so it reads as a relation into that node`);
};

const isUnderARingAt = (centre: Point, [first, second]: [Point, Point]): boolean =>
  rectsMeet({ x: centre.x - GATE.radius, y: centre.y - GATE.radius, width: GATE.radius * 2, height: GATE.radius * 2 }, { x: Math.min(first.x, second.x), y: Math.min(first.y, second.y), width: Math.abs(first.x - second.x), height: Math.abs(first.y - second.y) });

/**
 * The rules of the words and the gates on the cables of one selection.
 * It counts two faults and does not stop at them, because the count over all picks is a number to report. Each other rule is an assertion.
 */
const checkMarks = (label: string, marked: readonly Marked[], faults: WordFaults, scene: Scene): void => {
  const boxes = [...marked.flatMap(({ cable }) => (cable.words === null ? [] : [{ key: cable.key, box: boxOf(cable.words) }])), ...scene.beside.map((word) => ({ key: word.keys[0] ?? "", box: word.box }))];
  const frame = scene.cables.filter((cable) => cable.tone === "frame");
  for (const [index, first] of boxes.entries()) {
    for (const second of boxes.slice(index + 1)) if (rectsMeet(first.box, second.box)) faults.boxesThatMeet += 1;
  }
  for (const { box } of boxes) {
    if (marked.some(({ cable }) => uprightsOf(cable).some((upright) => rectsMeet(box, upright)))) faults.boxesUnderAnUpright += 1;
    if (frame.some((cable) => uprightsOf(cable).some((upright) => rectsMeet(box, upright)))) faults.boxesUnderAnUprightOfTheFrame += 1;
  }
  faults.wordsBeside += scene.beside.length;

  const portOf = (item: Marked): string => {
    const { port } = farRunOf(item.cable, item.far);
    return `${port.x},${port.y}`;
  };
  const atPort = new Map<string, Marked[]>();
  for (const item of marked) {
    const { port, corner } = farRunOf(item.cable, item.far);
    atPort.set(portOf(item), [...(atPort.get(portOf(item)) ?? []), item]);

    const { words, gate } = item.cable;
    if (words !== null) {
      const box = boxOf(words);
      assert.strictEqual(words.at.y, port.y, `${label}: the word of ${item.cable.key} is not on the run next to the other node`);
      assert.isTrue(box.x >= Math.min(port.x, corner.x) && box.x + box.width <= Math.max(port.x, corner.x), `${label}: the word of ${item.cable.key} is longer than the run next to the other node`);
      faults.words += 1;
    }
    if (gate !== null) {
      const onTheRun = gate.y === port.y && gate.x >= Math.min(port.x, corner.x) && gate.x <= Math.max(port.x, corner.x);
      const onTheBendOfAShortRun = gate.x === corner.x && Math.abs(gate.y - corner.y) <= FRAME.corner + GATE.radius + 2;
      assert.isTrue(onTheRun || onTheBendOfAShortRun, `${label}: the gate of ${item.cable.key} is ${distance(gate, port)} from the other node`);
      const strangers = marked.filter((other) => portOf(other) !== portOf(item) && segmentsOf(other.cable.points).some((segment) => isUnderARingAt(gate, segment)));
      assert.deepStrictEqual(strangers.map((other) => other.cable.key), [], `${label}: the gate of ${item.cable.key} is on a run that it shares with a cable to a different port, so it reads as the condition of that cable`);
      faults.gates += 1;
    }
  }

  for (const sharers of atPort.values()) {
    const [speaker, ...silent] = sharers.toSorted((a, b) => a.precedence - b.precedence);
    if (speaker === undefined) continue;
    const { port, corner } = farRunOf(speaker.cable, speaker.far);
    const hasRoomOnItsRun = distance(port, corner) >= GATE.setBack + GATE.radius + FRAME.corner;
    if (!speaker.conditional) assert.isNull(speaker.cable.gate, `${label}: ${speaker.cable.key} has no condition, so it has no gate`);
    else if (speaker.cable.gate === null && scene.beside.some((word) => word.keys.includes(speaker.cable.key))) {
      assert.isTrue(scene.beside.find((word) => word.keys.includes(speaker.cable.key))?.text.endsWith(" if"), `${label}: a word is in the place of the ring of ${speaker.cable.key}, so the word says the condition`);
    } else if (speaker.cable.gate === null) {
      const strangersOnItsRun = marked.filter((other) => portOf(other) !== portOf(speaker) && segmentsOf(other.cable.points).some((segment) => isUnderARingAt({ x: port.x + Math.sign(corner.x - port.x) * GATE.setBack, y: port.y }, segment)));
      assert.isTrue(!hasRoomOnItsRun || strangersOnItsRun.length > 0, `${label}: ${speaker.cable.key} is the first cable at its port, it has a condition, and its run has room, so it has a gate`);
      faults.conditionsWithoutRoomForAGate += 1;
    }
    for (const { cable } of silent) {
      assert.isNull(cable.words, `${label}: ${cable.key} shares its last run with ${speaker.cable.key}, and one run has one word`);
      assert.isNull(cable.gate, `${label}: ${cable.key} shares its last run with ${speaker.cable.key}, and one run has one gate`);
    }
  }
};

/** One scene for each pick or each trace on each locked stage: some thousand scenes, each with each rule. A machine with other work needs more than the 5 seconds that a test has. */
const EACH_SELECTION_ON_EACH_STAGE_MS = 60_000;

describe("what a locked stage lights", () => {
  /** The test of the picks of the snapshot gives its number to the test of the traces, which compares the sum. */
  let conditionsLeftOff = 0;

  /** Each pick of a node on each locked stage. It asserts each rule of the cables in place, and it returns the counts. */
  const picksInPlace = (stage: Stage) => {
    let cables = 0;
    let hiddenSomewhere = 0;
    let picks = 0;
    const faults: WordFaults = { ...NO_FAULTS };
    const leftOff = nothingLeftOff();
    for (const target of everyStage(stage.graph)) {
      const locked = lockedOn(stage, target);
      const frozen = deriveScene({ ...stage, state: locked });
      const present = new Set(onStage(frozen));
      const drawn = frozen.nodes.flatMap((node) => {
        if (node.offStage || node.at.kind === "pip") return [];
        const start = Math.min(node.at.left.x, node.at.label.x);
        const end = Math.max(node.at.right.x, node.at.label.x + node.at.label.width);
        const label: Rect = { x: Math.min(node.at.centre.x - 7, node.at.label.x), y: node.at.label.y, width: Math.max(node.at.centre.x + 7, node.at.label.x + node.at.label.width) - Math.min(node.at.centre.x - 7, node.at.label.x), height: node.at.label.height };
        return [{ id: node.id, column: node.at.centre.x, start, end, label }];
      });
      const columns = [...new Set(drawn.map((item) => item.column))].map((column) => {
        const members = drawn.filter((item) => item.column === column);
        return { start: Math.min(...members.map((item) => item.start)), end: Math.max(...members.map((item) => item.end)) };
      });

      for (const node of present) {
        const label = `${nameOfStage(target)}, ${node} picked`;
        const scene = deriveScene({ ...stage, state: step(locked, { kind: "picked", id: node }, stage) });
        const mine = lit(scene);
        const relations = relationsOf(stage.graph, node);
        const elsewhere = relations.filter((relation) => !present.has(relation.from === node ? relation.to : relation.from));

        for (const cable of mine) {
          const [from, to] = cable.key.split(">");
          assert.isTrue(from === node || to === node, `${label}: ${cable.key} is not a relation of the picked node`);
          assert.isTrue(present.has(id(from ?? "")) && present.has(id(to ?? "")), `${label}: ${cable.key} joins a node that is not on the stage`);
          for (const [first, second] of segmentsOf(cable.points)) {
            if (first.x === second.x && first.y !== second.y) {
              assert.isFalse(columns.some((column) => first.x >= column.start && first.x <= column.end), `${label}: ${cable.key} goes up or down inside a column at x ${first.x}`);
            }
            for (const item of drawn) {
              const box: Rect = { x: Math.min(first.x, second.x), y: Math.min(first.y, second.y), width: Math.abs(first.x - second.x), height: Math.abs(first.y - second.y) };
              assert.isFalse(rectsMeet(item.label, box), `${label}: ${cable.key} crosses the label of ${item.id}`);
            }
          }
          cables += 1;
        }

        checkMarks(
          label,
          mine.map((cable) => {
            const leaves = cable.key.startsWith(`${node}>`);
            return { cable, far: leaves ? "end" : "start", precedence: (leaves ? 0 : 1000) + cable.order, conditional: stage.graph.relations.get(cable.key)?.conditional ?? false };
          }),
          faults,
          scene,
        );
        checkWords(label, scene, stage, target, node, leftOff);
        picks += 1;

        assert.strictEqual(hiddenRelations(scene), elsewhere.length, `${label}: the count of relations that are not in this view`);
        assert.strictEqual(hiddenOf(scene).kind === "none", elsewhere.length === 0, `${label}: the count shows only when it is more than zero`);
        const isOwnStage = target.kind === "node" && target.id === node;
        if (!isOwnStage) assert.strictEqual(elsewhere.length, relations.length - mine.length, `${label}: hidden is the relations of the node minus the cables that are drawn`);
        if (elsewhere.length > 0) hiddenSomewhere += 1;
      }
    }
    return { cables, hiddenSomewhere, picks, faults, leftOff };
  };

  const NO_BOX_FAULTS = { boxesThatMeet: 0, boxesUnderAnUpright: 0, boxesUnderAnUprightOfTheFrame: 0 };
  const boxFaultsOf = (faults: WordFaults) => ({ boxesThatMeet: faults.boxesThatMeet, boxesUnderAnUpright: faults.boxesUnderAnUpright, boxesUnderAnUprightOfTheFrame: faults.boxesUnderAnUprightOfTheFrame });

  it.effect("draws each relation of a picked node to a node on the stage in place: clear of each label, upright only in a gutter, with its word in one place or none", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const { picks, faults } = picksInPlace(stage);
      assert.deepStrictEqual(boxFaultsOf(faults), NO_BOX_FAULTS, `over ${picks} picks`);
      assert.isAtLeast(picks, stage.graph.index.nodes.length, "the rest map alone has one pick for each node");
    }),
    EACH_SELECTION_ON_EACH_STAGE_MS,
  );

  it.effect("leaves the listed relations of the snapshot without a word, and no other", () =>
    Effect.gen(function* () {
      const { cables, hiddenSomewhere, picks, faults, leftOff } = picksInPlace(yield* snapshotStage);
      assert.deepStrictEqual(boxFaultsOf(faults), NO_BOX_FAULTS, `over ${picks} picks`);
      assert.isAbove(cables, 3000, "the snapshot has many cables in place to check");
      assert.isAbove(hiddenSomewhere, 200);
      assert.isAbove(picks, 900);
      assert.isAbove(faults.words, 2000, "most cables have a run with room for their word");
      assert.isAbove(faults.wordsBeside, 1000, "a cable without room has its word beside the neighbour");
      assert.isAbove(faults.gates, 100);
      assert.deepStrictEqual(leftOff.byStage, WORDS_LEFT_OFF.picks, "the number of relations that show no word, for each locked stage. `npx tsx test/recount-words.ts --pin` writes the new numbers");
      conditionsLeftOff += leftOff.withAConditionAndNoRing.length;
    }),
    EACH_SELECTION_ON_EACH_STAGE_MS,
  );

  /**
   * The Tools lens on the rest map: each pick and each trace with the lock, and the pointer on each node with the lock and without it.
   * A selection folds the chips of each row that a lit line is at, the selected row included. A preview folds the chips of each row but its own.
   * It returns the number of chips, of rows that keep their marks folded for a line, and of rows under the pointer that keep their chips over a line of their own preview.
   */
  const chipsAndLitLines = (stage: Stage) => {
    const lensed = run(stage, [{ kind: "lensed", lens: "tools" }]);
    const locked = step(lensed, { kind: "lockToggled" }, stage);
    const atRest = deriveScene({ ...stage, state: locked });
    const unfolded = new Map(atRest.nodes.map((node) => [node.id, node.chips.length]));
    const seen = { chips: 0, rowsFoldedForALine: 0, pointersOnARowWithASelection: 0, previewLines: 0, rowsFoldedForAPreview: 0, rowsWithChipsOverTheirOwnPreview: 0 };
    const selections: (readonly [string, ViewEvent, NodeId | null])[] = [
      ...stage.graph.index.nodes.map((node): readonly [string, ViewEvent, NodeId | null] => [`${node.id} picked`, { kind: "picked", id: node.id }, node.id]),
      ...stage.graph.index.routes.map((route): readonly [string, ViewEvent, NodeId | null] => [`route ${route.id} traced`, { kind: "traced", route: route.id }, null]),
    ];
    for (const [name, event, lead] of selections) {
      const label = `the rest map with the Tools lens, ${name}`;
      const scene = deriveScene({ ...stage, state: step(locked, event, stage) });
      assert.deepStrictEqual(coveredByChips(scene, stage.placement), [], `${label}: a chip is drawn over each line, so it covers what is under it`);
      checkWords(label, scene, stage, { kind: "rest" }, lead, nothingLeftOff());
      for (const node of scene.nodes) {
        assert.isTrue(node.chips.length === 0 || node.chips.length === unfolded.get(node.id), `${label}: ${node.id} shows a part of its chips`);
        seen.chips += node.chips.length;
        if (node.chips.length === 0 && (unfolded.get(node.id) ?? 0) > 0) seen.rowsFoldedForALine += 1;
      }
      // Only a preview keeps the chips of the row under the pointer. With a selection lit, the pointer on a row changes no chip.
      for (const [row, chips] of unfolded) {
        if (chips === 0) continue;
        const pointed = deriveScene({ ...stage, state: run(stage, [event, { kind: "pointed", hover: { kind: "node", id: row } }], locked) });
        assert.deepStrictEqual(coveredByChips(pointed, stage.placement), [], `${label}, the pointer on ${row}: a chip is drawn over a line of the selection`);
        assert.deepStrictEqual(pointed.nodes.map((node) => node.chips.length), scene.nodes.map((node) => node.chips.length), `${label}, the pointer on ${row}: the pointer changed the chips of a row`);
        seen.pointersOnARowWithASelection += 1;
      }
    }

    for (const [lock, state] of [["with no lock", lensed], ["with the lock", locked]] as const) {
      for (const under of stage.graph.index.nodes) {
        const label = `the rest map with the Tools lens, ${lock}, the pointer on ${under.id}`;
        const scene = deriveScene({ ...stage, state: step(state, { kind: "pointed", hover: { kind: "node", id: under.id } }, stage) });
        const ownRow = rowOf(scene, under.id)?.id ?? null;
        assert.deepStrictEqual(coveredByChips(scene, stage.placement, ownRow), [], `${label}: a chip of a different row is drawn over a line of the preview, so it covers what is under it`);
        seen.previewLines += scene.cables.filter((cable) => cable.tone === "previewOut" || cable.tone === "previewIn").length;
        for (const node of scene.nodes) {
          assert.isTrue(node.chips.length === 0 || node.chips.length === unfolded.get(node.id), `${label}: ${node.id} shows a part of its chips`);
          if (node.id === ownRow) assert.strictEqual(node.chips.length, unfolded.get(node.id), `${label}: the row under the pointer lost its chips, and a person who points at a row reads its tools there`);
          if (node.chips.length === 0 && (unfolded.get(node.id) ?? 0) > 0) seen.rowsFoldedForAPreview += 1;
        }
        if (coveredByChips(scene, stage.placement).length > 0) seen.rowsWithChipsOverTheirOwnPreview += 1;
      }
    }
    return seen;
  };

  it.effect("keeps each tool chip of the Tools lens off each lit line, its arrowhead, its ring, and its word, and off each line of a preview but for the chips of the row under the pointer, which stay", () =>
    Effect.gen(function* () {
      chipsAndLitLines(yield* liveStage);
      const ofSnapshot = chipsAndLitLines(yield* snapshotStage);
      assert.isAbove(ofSnapshot.chips, 100, "the snapshot has skills with tools, and most selections leave their chips unfolded");
      assert.isAbove(ofSnapshot.rowsFoldedForALine, 0, "the snapshot has a selection with a lit line at a row that has tools");
      assert.isAbove(ofSnapshot.pointersOnARowWithASelection, 100, "the snapshot has rows with tools to point at while each selection is lit");
      assert.isAbove(ofSnapshot.previewLines, 100, "the snapshot has many nodes with relations to preview");
      assert.isAbove(ofSnapshot.rowsFoldedForAPreview, 0, "the snapshot has a preview with a line at a different row that has tools");
      assert.isAbove(ofSnapshot.rowsWithChipsOverTheirOwnPreview, 0, "the snapshot has a row with tools whose own line leaves it where its chips are");
    }),
    EACH_SELECTION_ON_EACH_STAGE_MS,
  );

  it("shows each word of the snapshot in the view at two sizes of the window, with the reader open and closed, and at the same place for each", () => {
    const graph = toGraph(snapshotIndex);
    const placement = layout(graph);
    const sizes = [
      { width: 1440, height: 826, reader: 461 },
      { width: 1920, height: 1000, reader: 600 },
    ];
    let words = 0;
    for (const target of everyStage(graph)) {
      const stages = sizes.map((viewport): Stage => ({ graph, placement, viewport }));
      const [first] = stages;
      if (first === undefined) continue;
      const locked = lockedOn(first, target);
      const selections: ViewEvent[] = [...onStage(deriveScene({ ...first, state: locked })).map((node): ViewEvent => ({ kind: "picked", id: node })), ...graph.index.routes.map((route): ViewEvent => ({ kind: "traced", route: route.id }))];
      for (const event of selections) {
        const placed: string[] = [];
        for (const stage of stages) {
          const open = step(lockedOn(stage, target), event, stage);
          for (const state of [open, step(open, { kind: "readerClosed" }, stage)]) {
            const scene = deriveScene({ ...stage, state });
            const visible = visibleRectOf(scene, stage.viewport, state.reading.kind === "open");
            const boxes = wordBoxesOf(scene);
            for (const word of boxes) {
              assert.isTrue(isInside(word.rect, visible), `${nameOfStage(target)}, ${JSON.stringify(event)}, ${stage.viewport.width} wide, reader ${state.reading.kind}: the word "${word.text}" of ${word.keys.join(" and ")} is not in the view`);
            }
            placed.push(JSON.stringify(boxes.map((word) => [word.keys, word.rect])));
            words += boxes.length;
          }
        }
        assert.strictEqual(new Set(placed).size, 1, `${nameOfStage(target)}, ${JSON.stringify(event)}: a word has a different place at a different size of the window`);
      }
    }
    assert.isAbove(words, 20000, "the snapshot has many words to check");
  }, EACH_SELECTION_ON_EACH_STAGE_MS);

  it("folds the chips of a row for a ring that reaches them, also when the line of the ring keeps its air from them", () => {
    const chips: Rect = { x: 100, y: 92, width: 60, height: 16 };
    const pastTheChips = chips.x + chips.width + CHIP.air + 1;
    const line: Point[] = [{ x: pastTheChips, y: 0 }, { x: pastTheChips, y: 300 }];

    assert.isFalse(isAtChips({ points: line, gate: null }, chips), "the line has the air of a chip from the chips");
    assert.isTrue(isAtChips({ points: line, gate: { x: pastTheChips, y: 100 } }, chips), "the ring is on the line and reaches 3 units from it, so it has less than the air of a chip");
    assert.isFalse(isAtChips({ points: line, gate: { x: pastTheChips, y: 200 } }, chips), "the ring is on a part of the line that is far from the chips");
    assert.isTrue(isAtChips({ points: [{ x: chips.x + chips.width + CHIP.air, y: 0 }, { x: chips.x + chips.width + CHIP.air, y: 300 }], gate: null }, chips), "a line with less than the air of a chip is at the chips");
  });

  it.effect("keeps a word in the middle of a line off a column title of the rest map", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const key = relationKey({ from: id("playbook:hillclimb"), to: id("skill:principle-separate-before-serializing-shared-state") });
      const wordWith = (placement: Stage["placement"]): Rect | undefined =>
        deriveScene({ ...stage, placement, state: run({ ...stage, placement }, [{ kind: "lockToggled" }, { kind: "picked", id: id("playbook:hillclimb") }]) }).beside.find((word) => word.keys.includes(key))?.box;

      const usual = wordWith(stage.placement);
      assert.isDefined(usual, "the snapshot no longer has this word in the middle of its line");
      if (usual === undefined) return;

      /** The same rest map with the title of one column directly below that word. The map draws the title where the placement has it. */
      const title = { x: usual.x + 8, y: usual.y + usual.height / 2 + FRAME.pitch / 2 };
      const moved = { ...stage.placement, columns: stage.placement.columns.map((column) => (column.id === "principles" ? { ...column, title } : column)) };
      const beside = wordWith(moved);
      const drawn: Rect = { x: title.x, y: title.y - FRAME.labelHeight / 2, width: captionWidth("principles", moved.columns.find((column) => column.id === "principles")?.count ?? 0), height: FRAME.labelHeight };

      assert.isTrue(overlap(usual, drawn), "the title is where the word is with no title there");
      assert.isDefined(beside, "the line has room for the word before the title");
      if (beside !== undefined) assert.isFalse(overlap(beside, drawn), "the word is over the title of a column");
    }),
  );

  it.effect("lights nothing for a pick of a node that is not on the stage, opens it in the reader, and says so in the strip", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const locked = lockedOn(stage, { kind: "node", id: id("skill:architect") });
      const bro = id("skill:bro");
      assert.isFalse(onStage(deriveScene({ ...stage, state: locked })).includes(bro), "the snapshot now has `bro` in the arrangement of `architect`");

      const picked = step(locked, { kind: "picked", id: bro }, stage);
      const scene = deriveScene({ ...stage, state: picked });
      assert.deepStrictEqual<unknown>(picked.reading, { kind: "open", path: "skills/bro/SKILL.md", anchor: null, line: null, back: ["skills/architect/SKILL.md"] });
      assert.deepStrictEqual(lit(scene), []);
      assert.isFalse(scene.nodes.some((node) => !node.offStage && ["selected", "needs", "neededBy", "mutual"].includes(node.tone.kind)), "a node on the stage is lit for a selection that is not on it");
      assert.deepStrictEqual<unknown>(scene.strip, { kind: "notInView", name: "bro" });
      assert.deepStrictEqual<unknown>(hiddenOf(scene), { kind: "none" });
    }),
  );

  it.effect("says what it cannot draw only in a strip that describes the selection", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const how = id("skill:how");
      const arena = id("skill:arena");
      const picked = run(stage, [{ kind: "picked", id: id("skill:architect") }, { kind: "lockToggled" }, { kind: "picked", id: how }]);
      const hidden = hiddenOf(deriveScene({ ...stage, state: picked }));
      assert.deepStrictEqual<unknown>(hidden, { kind: "relations", count: 3 }, "the snapshot now has a different count for `how` in the arrangement of `architect`");

      const onArena = deriveScene({ ...stage, state: step(picked, { kind: "pointed", hover: { kind: "node", id: arena } }, stage) });
      assert.deepStrictEqual<unknown>([onArena.strip.kind, "name" in onArena.strip ? onArena.strip.name : ""], ["purpose", "arena"], "the strip describes the node under the pointer");
      assert.deepStrictEqual<unknown>(hiddenOf(onArena), { kind: "none" }, "the 3 relations are of `how`, and the strip describes `arena`");

      const onItself = deriveScene({ ...stage, state: step(picked, { kind: "pointed", hover: { kind: "node", id: how } }, stage) });
      assert.deepStrictEqual<unknown>(hiddenOf(onItself), hidden, "the pointer is on the selected node, so the strip describes the selection");

      const onRelated = deriveScene({ ...stage, state: step(picked, { kind: "pointed", hover: { kind: "node", id: id("skill:architect") } }, stage) });
      assert.deepStrictEqual<unknown>([onRelated.strip.kind, "hidden" in onRelated.strip], ["evidence", false], "a strip that quotes a relation has no count");

      const perf = routeId("diagnose-and-fix-measured-slowness");
      const traced = run(stage, [{ kind: "picked", id: id("skill:architect") }, { kind: "lockToggled" }, { kind: "traced", route: perf }]);
      assert.strictEqual(hiddenOf(deriveScene({ ...stage, state: traced })).kind, "steps");
      const tracedOnArena = deriveScene({ ...stage, state: step(traced, { kind: "pointed", hover: { kind: "node", id: arena } }, stage) });
      assert.deepStrictEqual<unknown>([tracedOnArena.strip.kind, hiddenOf(tracedOnArena)], ["purpose", { kind: "none" }]);
    }),
  );

  it.effect("numbers the steps of a trace in place where their nodes are on the stage, and counts the steps that are not", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const perf = routeId("diagnose-and-fix-measured-slowness");
      const trace = traceOf(stage.graph, perf);
      assert.isNotNull(trace);
      if (trace === null) return;

      const onRest = run(stage, [{ kind: "lockToggled" }, { kind: "traced", route: perf }]);
      const rest = deriveScene({ ...stage, state: onRest });
      assert.isTrue(rest.nodes.every((node) => node.at === stage.placement.nodes.get(node.id)), "the trace moved a node of the locked rest map");
      assert.deepStrictEqual(
        rest.nodes.flatMap((node) => (node.tone.kind === "step" && node.tone.n > 0 ? [[node.tone.n, node.id]] : [])).sort(),
        trace.steps.map((item) => [item.n, item.node]).sort(),
      );
      assert.deepStrictEqual<unknown>(hiddenOf(rest), { kind: "none" });
      assert.strictEqual(lit(rest).length, trace.steps.length + 1, "the cable to the playbook, and one cable for each step");

      const inArchitect = run(stage, [{ kind: "picked", id: id("skill:architect") }, { kind: "lockToggled" }, { kind: "traced", route: perf }]);
      const scene = deriveScene({ ...stage, state: inArchitect });
      const present = new Set(onStage(scene));
      const absent = trace.steps.filter((item) => !present.has(item.node));
      assert.isAbove(absent.length, 0, "the snapshot now has each step of the perf route in the arrangement of `architect`");
      assert.deepStrictEqual<unknown>(hiddenOf(scene), { kind: "steps", count: absent.length });
      assert.deepStrictEqual(
        scene.nodes.flatMap((node) => (node.tone.kind === "step" && node.tone.n > 0 ? [node.id] : [])).sort(),
        trace.steps.filter((item) => present.has(item.node)).map((item) => item.node).sort(),
      );
      assert.isTrue(lit(scene).every((cable) => cable.key.split(">").every((end) => present.has(id(end)))));
    }),
  );

  /** Each route traced on each locked stage. It asserts each rule of the cables in place, and it returns the counts. */
  const tracesInPlace = (stage: Stage) => {
    let traces = 0;
    const faults: WordFaults = { ...NO_FAULTS };
    const leftOff = nothingLeftOff();
    for (const target of everyStage(stage.graph)) {
      const locked = lockedOn(stage, target);
      for (const route of stage.graph.index.routes) {
        const trace = traceOf(stage.graph, route.id);
        const steps = new Set(trace?.steps.map((item) => item.via));
        const scene = deriveScene({ ...stage, state: step(locked, { kind: "traced", route: route.id }, stage) });
        checkMarks(
          `${nameOfStage(target)}, route ${route.id} traced`,
          lit(scene).map((cable) => ({ cable, far: "end", precedence: (steps.has(cable.key) ? 0 : 1000) + cable.order, conditional: stage.graph.relations.get(cable.key)?.conditional ?? false })),
          faults,
          scene,
        );
        checkWords(`${nameOfStage(target)}, route ${route.id} traced`, scene, stage, target, null, leftOff);
        traces += 1;
      }
    }
    return { traces, faults, leftOff };
  };

  it.effect("gives the cables of each trace in place one word and one gate for each port, clear of each other word and of each upright, on each stage", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const { traces, faults } = tracesInPlace(stage);
      assert.strictEqual(traces, everyStage(stage.graph).length * stage.graph.index.routes.length);
      assert.deepStrictEqual(boxFaultsOf(faults), NO_BOX_FAULTS, `over ${traces} traces`);
    }),
    EACH_SELECTION_ON_EACH_STAGE_MS,
  );

  it.effect("leaves the listed relations of the traces of the snapshot without a word, and no other", () =>
    Effect.gen(function* () {
      const { traces, faults, leftOff } = tracesInPlace(yield* snapshotStage);
      assert.deepStrictEqual(boxFaultsOf(faults), NO_BOX_FAULTS, `over ${traces} traces`);
      assert.isAbove(faults.words, 500, "a trace on a stage that has few of its steps has few words");
      assert.deepStrictEqual(leftOff.byStage, WORDS_LEFT_OFF.traces, "the number of relations that show no word, for each locked stage");
      assert.strictEqual(conditionsLeftOff + leftOff.withAConditionAndNoRing.length, WORDS_LEFT_OFF.withAConditionAndNoRing, "of the relations of the picks and of the traces that show no word, the ones that show no condition");
    }),
    EACH_SELECTION_ON_EACH_STAGE_MS,
  );

  it.effect("gives the two cables from `architect` to `codebase-design` and to its file one word, on the locked rest map", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const architect = id("skill:architect");
      const scene = deriveScene({ ...stage, state: run(stage, [{ kind: "lockToggled" }, { kind: "picked", id: architect }]) });
      const toTheRow = lit(scene).filter((cable) => cable.key === `${architect}>skill:codebase-design` || cable.key === `${architect}>hosted:skills/codebase-design/DESIGN-IT-TWICE.md`);
      const back = lit(scene).filter((cable) => cable.key === `skill:codebase-design>${architect}`);

      assert.strictEqual(toTheRow.length, 2, "the snapshot lost one of the two relations");
      assert.strictEqual(new Set(toTheRow.map((cable) => `${cable.end.x},${cable.end.y}`)).size, 1, "the file is on the row of its host, so the two cables end at one port");
      assert.deepStrictEqual(toTheRow.map((cable) => cable.words?.text ?? null), ["requires", null], "the cable to the skill is first in the order of the stage, so it has the word");
      assert.strictEqual(back.length, 1, "the snapshot lost the relation back");
      assert.isTrue(stage.graph.relations.get(back[0]?.key ?? relationKey({ from: architect, to: architect }))?.conditional, "the relation back has a condition");
      assert.deepStrictEqual<unknown>([back[0]?.words, back[0]?.gate], [null, null], "the relation back is on the path of the first cable, so it has no word and no gate there");
      assert.isTrue(toTheRow.every((cable) => cable.gate === null), "`architect` requires `codebase-design` without a condition");
    }),
  );

  /** Gives one relation of each arrangement a long word, next to the trunk of the frame. It returns the number of arrangements that have such a relation. */
  const longWordsBesideATrunk = (index: ExplorerIndex): number => {
    const graph = toGraph(index);
    let checked = 0;
    for (const middle of index.nodes) {
      const arrangement = arrangementOf(graph, { kind: "node", id: middle.id });
      const centre = arrangement?.nodes.get(middle.id);
      if (arrangement === null || centre?.kind !== "row") continue;
      const onItsRow = (graph.out.get(middle.id) ?? []).find((relation) => {
        const at = arrangement.nodes.get(relation.to);
        return at?.kind === "row" && at.centre.y === centre.centre.y && !graph.relations.has(relationKey({ from: relation.to, to: middle.id }));
      });
      if (onItsRow === undefined || (graph.out.get(middle.id) ?? []).length < 2) continue;

      // The neighbour keeps this one relation. A second lit line into its port would use the same run, and a run of two lines has no word.
      const isOfTheNeighbourOnly = (relation: Relation): boolean => relation !== onItsRow && (relation.from === onItsRow.to || relation.to === onItsRow.to);
      const withALongWord = toGraph({
        ...index,
        relations: index.relations.filter((relation) => !isOfTheNeighbourOnly(relation)).map((relation) => (relation === onItsRow ? { ...relation, kinds: ["artifact-path"] as const, conditional: false } : relation)),
      });
      const stage: Stage = { graph: withALongWord, placement: layout(withALongWord), viewport: { width: 1440, height: 826, reader: 460 } };
      const scene = deriveScene({ ...stage, state: run(stage, [{ kind: "picked", id: middle.id }, { kind: "lockToggled" }, { kind: "picked", id: onItsRow.to }]) });
      const cable = lit(scene).find((item) => item.key === relationKey(onItsRow));
      const isWorded = cable !== undefined && cable.words !== null;
      if (cable === undefined || cable.words === null) continue;
      assert.deepStrictEqual<unknown>([isWorded, cable.words.text, cable.points.length], [true, "artifact path", 2], `${middle.id}: the cable to ${onItsRow.to} is a straight line`);
      const box = boxOf(cable.words);
      const uprights = scene.cables.filter((item) => item.tone === "frame").flatMap(uprightsOf).filter((upright) => upright.y <= box.y + box.height && upright.y + upright.height >= box.y);
      assert.isAbove(uprights.length, 0, `${middle.id}: the trunk of the frame starts on the row of ${onItsRow.to}`);
      for (const upright of uprights) {
        const gap = Math.max(box.x - upright.x, upright.x - box.x - box.width);
        assert.isAtLeast(gap, WORD_CLEAR.corner, `${middle.id}: the word of the cable to ${onItsRow.to} is ${gap.toFixed(1)} from an upright of the frame, on its rounded corner`);
      }
      checked += 1;
    }
    return checked;
  };

  it.effect("keeps a word on a cable clear of each upright of the frame, also a long word that has little room", () =>
    Effect.gen(function* () {
      longWordsBesideATrunk((yield* liveStage).graph.index);
      assert.isAbove(longWordsBesideATrunk(snapshotIndex), 10, "the snapshot has many arrangements with a neighbour on the row of the middle node");
    }),
  );

  it.effect("keeps the combs of a locked arrangement as a quiet frame while a different node of it is picked, and at full strength for its own node", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const architect = id("skill:architect");
      const locked = lockedOn(stage, { kind: "node", id: architect });
      const own = deriveScene({ ...stage, state: locked });
      const combs = lit(own).map((cable) => cable.key).sort();
      assert.strictEqual(own.cables.filter((cable) => cable.tone === "frame").length, 0);
      assert.deepStrictEqual(combs, [...(arrangementOf(stage.graph, { kind: "node", id: architect })?.cables.keys() ?? [])].sort());

      const other = deriveScene({ ...stage, state: step(locked, { kind: "picked", id: id("skill:how") }, stage) });
      assert.deepStrictEqual(other.cables.filter((cable) => cable.tone === "frame").map((cable) => cable.key).sort(), combs);
      assert.strictEqual(other.nodes.find((node) => node.id === architect)?.tone.kind, "neededBy", "`architect` runs `how`, so the node in the middle is lit as a node that needs the picked node");
      assert.strictEqual(other.nodes.find((node) => node.id === "skill:how")?.tone.kind, "selected");
    }),
  );
});
