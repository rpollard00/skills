import { readFileSync } from "node:fs";
import nodePath from "node:path";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { toGraph, type Graph } from "../src/shared/graph";
import { distance, FRAME, layout, type Point, type Rect } from "../src/shared/layout";
import { NodeId, relationKey, RouteId, type ExplorerIndex, type Relation } from "../src/shared/model";
import { GATE } from "../src/shared/polyline";
import { arrangementOf } from "../src/shared/view/arranged";
import { resolveCamera } from "../src/shared/view/camera";
import { decodeHash, encodeHash } from "../src/shared/view/hash";
import { historyAction, normalizePlace } from "../src/shared/view/history";
import { eventsAtArrival, keyPressOf, lockKey, lockPressOf, togglesLock, type KeyPress, type PageKeyEvent } from "../src/shared/view/keys";
import type { Hidden } from "../src/shared/view/lit";
import { portMarksOf } from "../src/shared/view/ports";
import { CHIP, deriveScene, isAtChips, type CableView, type Scene } from "../src/shared/view/scene";
import { INITIAL, placeOf, stageTargetOf, type Pin, type Stage, type StageTarget, type ViewEvent, type ViewState } from "../src/shared/view/state";
import { step } from "../src/shared/view/step";
import { traceOf } from "../src/shared/view/trace";
import { indexAt, LIVE_REPO, snapshotIndex } from "./support";

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

interface RingCounts {
  /** The lit cables with a condition. */
  withACondition: number;
  rings: number;
}

const isUnderARingAt = (centre: Point, [first, second]: [Point, Point]): boolean =>
  rectsMeet({ x: centre.x - GATE.radius, y: centre.y - GATE.radius, width: GATE.radius * 2, height: GATE.radius * 2 }, { x: Math.min(first.x, second.x), y: Math.min(first.y, second.y), width: Math.abs(first.x - second.x), height: Math.abs(first.y - second.y) });

/**
 * The rules of the rings on the cables of one selection. A ring is the sign of a condition.
 * - A ring is on its own cable, next to the other node: on the run that ends at that node, or on the bend of a run that is too short.
 * - A ring is on no part that a cable to a different port uses, because it would read as the condition of that cable.
 * - One port has one ring: that of the first cable at the port. The first cable has a ring when it has a condition and its run has room that is its own.
 */
const checkRings = (label: string, marked: readonly Marked[], counts: RingCounts): void => {
  const portOf = (item: Marked): string => {
    const { port } = farRunOf(item.cable, item.far);
    return `${port.x},${port.y}`;
  };
  const atPort = new Map<string, Marked[]>();
  for (const item of marked) {
    const { port, corner } = farRunOf(item.cable, item.far);
    atPort.set(portOf(item), [...(atPort.get(portOf(item)) ?? []), item]);
    if (item.conditional) counts.withACondition += 1;

    const { gate } = item.cable;
    if (gate === null) continue;
    const onTheRun = gate.y === port.y && gate.x >= Math.min(port.x, corner.x) && gate.x <= Math.max(port.x, corner.x);
    const onTheBendOfAShortRun = gate.x === corner.x && Math.abs(gate.y - corner.y) <= FRAME.corner + GATE.radius + 2;
    assert.isTrue(onTheRun || onTheBendOfAShortRun, `${label}: the gate of ${item.cable.key} is ${distance(gate, port)} from the other node`);
    assert.isTrue(segmentsOf(item.cable.points).some((segment) => isUnderARingAt(gate, segment)), `${label}: the gate of ${item.cable.key} is not on its own cable`);
    const strangers = marked.filter((other) => portOf(other) !== portOf(item) && segmentsOf(other.cable.points).some((segment) => isUnderARingAt(gate, segment)));
    assert.deepStrictEqual(strangers.map((other) => other.cable.key), [], `${label}: the gate of ${item.cable.key} is on a run that it shares with a cable to a different port, so it reads as the condition of that cable`);
    counts.rings += 1;
  }

  for (const sharers of atPort.values()) {
    const [speaker, ...silent] = sharers.toSorted((a, b) => a.precedence - b.precedence);
    if (speaker === undefined) continue;
    const { port, corner } = farRunOf(speaker.cable, speaker.far);
    const hasRoomOnItsRun = distance(port, corner) >= GATE.setBack + GATE.radius + FRAME.corner;
    if (!speaker.conditional) assert.isNull(speaker.cable.gate, `${label}: ${speaker.cable.key} has no condition, so it has no gate`);
    else if (speaker.cable.gate === null) {
      const strangersOnItsRun = marked.filter((other) => portOf(other) !== portOf(speaker) && segmentsOf(other.cable.points).some((segment) => isUnderARingAt({ x: port.x + Math.sign(corner.x - port.x) * GATE.setBack, y: port.y }, segment)));
      assert.isTrue(!hasRoomOnItsRun || strangersOnItsRun.length > 0, `${label}: ${speaker.cable.key} is the first cable at its port, it has a condition, and its run has room, so it has a gate`);
    }
    for (const { cable } of silent) assert.isNull(cable.gate, `${label}: ${cable.key} shares its last run with ${speaker.cable.key}, and one run has one gate`);
  }
};

/** The row of a node on the stage. A hosted file is on the row of its host. */
const rowOf = (scene: Scene, node: NodeId): NodeId | null => {
  const stand = scene.nodes.find((item) => item.id === node && !item.offStage)?.at;
  return stand === undefined ? null : stand.kind === "pip" ? stand.host : node;
};

/** What the map draws for a line and its marks: half of the width of a line, the arrowhead, and the bar. */
const DRAWN = { lineHalf: 0.75, arrow: { length: 5, half: 3.2, setBack: 4.5 }, bar: { half: 5.5, width: 2.2 } } as const;

/** A chip has a border and a lit line has a glow: with less ground than this between the two, the chip is against the line. */
const GROUND_AT_A_CHIP = 2;

/**
 * What each tool chip of the scene covers or stands against: a lit line, or the arrowhead, the bar, the ring, or the back mark of one.
 * A chip is drawn over each of them. A lit line here is a line of the selection or a line of the preview of the node under the pointer.
 * The geometry comes from what the map draws, and not from the code that folds the chips.
 * `ownRow`: the row that a preview is of. Its chips stay over its own lines, so they do not count.
 */
const coveredByChips = (scene: Scene, ownRow: NodeId | null = null): string[] => {
  const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const chips = scene.nodes.flatMap((node) =>
    node.offStage || node.id === ownRow
      ? []
      : node.chips.map((chip) => ({ name: `a chip of ${node.id}`, rect: { x: chip.x - CHIP.lead - GROUND_AT_A_CHIP, y: node.at.centre.y - CHIP.half - GROUND_AT_A_CHIP, width: chip.width + GROUND_AT_A_CHIP * 2, height: (CHIP.half + GROUND_AT_A_CHIP) * 2 } })),
  );
  const drawn = scene.cables.filter((cable) => cable.tone !== "weave" && cable.tone !== "frame");
  const marks: { readonly name: string; readonly rect: Rect }[] = [];
  for (const mark of portMarksOf(drawn)) {
    const tip = mark.at.x - (mark.hasBar ? DRAWN.arrow.setBack * mark.arrives : 0);
    const of = mark.cables.map((cable) => cable.key).join(" and ");
    if (mark.hasArrow) marks.push({ name: `the arrowhead of ${of}`, rect: { x: Math.min(tip, tip - DRAWN.arrow.length * mark.arrives), y: mark.at.y - DRAWN.arrow.half, width: DRAWN.arrow.length, height: DRAWN.arrow.half * 2 } });
    if (mark.hasBar) marks.push({ name: `the bar of ${of}`, rect: { x: mark.at.x - DRAWN.bar.width / 2, y: mark.at.y - DRAWN.bar.half, width: DRAWN.bar.width, height: DRAWN.bar.half * 2 } });
  }
  for (const cable of drawn) {
    if (cable.gate !== null) marks.push({ name: `the ring of ${cable.key}`, rect: { x: cable.gate.x - GATE.radius, y: cable.gate.y - GATE.radius, width: GATE.radius * 2, height: GATE.radius * 2 } });
    if (cable.back !== null) marks.push({ name: `the back mark of ${cable.key}`, rect: { x: cable.back.x, y: cable.back.y - DRAWN.arrow.half, width: DRAWN.arrow.length, height: DRAWN.arrow.half * 2 } });
  }
  const rectOfRun = ([first, second]: [Point, Point]): Rect => ({
    x: Math.min(first.x, second.x) - DRAWN.lineHalf,
    y: Math.min(first.y, second.y) - DRAWN.lineHalf,
    width: Math.abs(first.x - second.x) + DRAWN.lineHalf * 2,
    height: Math.abs(first.y - second.y) + DRAWN.lineHalf * 2,
  });
  return chips.flatMap((chip) => [
    ...marks.filter((mark) => overlap(chip.rect, mark.rect)).map((mark) => `${chip.name} covers ${mark.name}`),
    ...drawn.filter((cable) => segmentsOf(cable.points).some((run) => overlap(chip.rect, rectOfRun(run)))).map((cable) => `${chip.name} covers the line ${cable.key}`),
  ]);
};

/** One scene for each pick or each trace on each locked stage: some thousand scenes, each with each rule. A machine with other work needs more than the 5 seconds that a test has. */
const EACH_SELECTION_ON_EACH_STAGE_MS = 60_000;

describe("what a locked stage lights", () => {
  /** Each pick of a node on each locked stage. It asserts each rule of the cables in place, and it returns the counts. */
  const picksInPlace = (stage: Stage) => {
    let cables = 0;
    let hiddenSomewhere = 0;
    let picks = 0;
    const rings: RingCounts = { withACondition: 0, rings: 0 };
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

        checkRings(
          label,
          mine.map((cable) => {
            const leaves = cable.key.startsWith(`${node}>`);
            return { cable, far: leaves ? "end" : "start", precedence: (leaves ? 0 : 1000) + cable.order, conditional: stage.graph.relations.get(cable.key)?.conditional ?? false };
          }),
          rings,
        );
        picks += 1;

        assert.strictEqual(hiddenRelations(scene), elsewhere.length, `${label}: the count of relations that are not in this view`);
        assert.strictEqual(hiddenOf(scene).kind === "none", elsewhere.length === 0, `${label}: the count shows only when it is more than zero`);
        const isOwnStage = target.kind === "node" && target.id === node;
        if (!isOwnStage) assert.strictEqual(elsewhere.length, relations.length - mine.length, `${label}: hidden is the relations of the node minus the cables that are drawn`);
        if (elsewhere.length > 0) hiddenSomewhere += 1;
      }
    }
    return { cables, hiddenSomewhere, picks, rings };
  };

  /** Each route traced on each locked stage. It asserts the rules of the rings, and it returns the counts. */
  const tracesInPlace = (stage: Stage) => {
    let traces = 0;
    const rings: RingCounts = { withACondition: 0, rings: 0 };
    for (const target of everyStage(stage.graph)) {
      const locked = lockedOn(stage, target);
      for (const route of stage.graph.index.routes) {
        const trace = traceOf(stage.graph, route.id);
        const steps = new Set(trace?.steps.map((item) => item.via));
        const scene = deriveScene({ ...stage, state: step(locked, { kind: "traced", route: route.id }, stage) });
        checkRings(
          `${nameOfStage(target)}, route ${route.id} traced`,
          lit(scene).map((cable) => ({ cable, far: "end", precedence: (steps.has(cable.key) ? 0 : 1000) + cable.order, conditional: stage.graph.relations.get(cable.key)?.conditional ?? false })),
          rings,
        );
        traces += 1;
      }
    }
    return { traces, rings };
  };

  it.effect("draws each relation of a picked node to a node on the stage in place: clear of each label, upright only in a gutter, with one ring for each port", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const { picks } = picksInPlace(stage);
      assert.isAtLeast(picks, stage.graph.index.nodes.length, "the rest map alone has one pick for each node");
    }),
    EACH_SELECTION_ON_EACH_STAGE_MS,
  );

  it.effect("gives the cables of each trace in place one ring for each port, on each stage", () =>
    Effect.gen(function* () {
      const stage = yield* liveStage;
      const { traces } = tracesInPlace(stage);
      assert.strictEqual(traces, everyStage(stage.graph).length * stage.graph.index.routes.length);
    }),
    EACH_SELECTION_ON_EACH_STAGE_MS,
  );

  it.effect("shows a ring for 992 of the 1,075 lit lines of the snapshot that have a condition, over each pick and each trace on each locked stage", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const ofPicks = picksInPlace(stage);
      const ofTraces = tracesInPlace(stage);
      assert.isAbove(ofPicks.cables, 3000, "the snapshot has many cables in place to check");
      assert.isAbove(ofPicks.hiddenSomewhere, 200);
      assert.isAbove(ofPicks.picks, 900);
      assert.deepStrictEqual<unknown>(
        { withACondition: ofPicks.rings.withACondition + ofTraces.rings.withACondition, rings: ofPicks.rings.rings + ofTraces.rings.rings },
        { withACondition: 1075, rings: 992 },
        "the README gives the difference as a known limit: these lines show no ring, because the part next to the other node is too short or is a part that other lit lines use, or because a second line at the port has the ring",
      );
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
    const selections: (readonly [string, ViewEvent])[] = [
      ...stage.graph.index.nodes.map((node): readonly [string, ViewEvent] => [`${node.id} picked`, { kind: "picked", id: node.id }]),
      ...stage.graph.index.routes.map((route): readonly [string, ViewEvent] => [`route ${route.id} traced`, { kind: "traced", route: route.id }]),
    ];
    for (const [name, event] of selections) {
      const label = `the rest map with the Tools lens, ${name}`;
      const scene = deriveScene({ ...stage, state: step(locked, event, stage) });
      assert.deepStrictEqual(coveredByChips(scene), [], `${label}: a chip is drawn over each line, so it covers what is under it`);
      for (const node of scene.nodes) {
        assert.isTrue(node.chips.length === 0 || node.chips.length === unfolded.get(node.id), `${label}: ${node.id} shows a part of its chips`);
        seen.chips += node.chips.length;
        if (node.chips.length === 0 && (unfolded.get(node.id) ?? 0) > 0) seen.rowsFoldedForALine += 1;
      }
      // Only a preview keeps the chips of the row under the pointer. With a selection lit, the pointer on a row changes no chip.
      for (const [row, chips] of unfolded) {
        if (chips === 0) continue;
        const pointed = deriveScene({ ...stage, state: run(stage, [event, { kind: "pointed", hover: { kind: "node", id: row } }], locked) });
        assert.deepStrictEqual(coveredByChips(pointed), [], `${label}, the pointer on ${row}: a chip is drawn over a line of the selection`);
        assert.deepStrictEqual(pointed.nodes.map((node) => node.chips.length), scene.nodes.map((node) => node.chips.length), `${label}, the pointer on ${row}: the pointer changed the chips of a row`);
        seen.pointersOnARowWithASelection += 1;
      }
    }

    for (const [lock, state] of [["with no lock", lensed], ["with the lock", locked]] as const) {
      for (const under of stage.graph.index.nodes) {
        const label = `the rest map with the Tools lens, ${lock}, the pointer on ${under.id}`;
        const scene = deriveScene({ ...stage, state: step(state, { kind: "pointed", hover: { kind: "node", id: under.id } }, stage) });
        const ownRow = rowOf(scene, under.id);
        assert.deepStrictEqual(coveredByChips(scene, ownRow), [], `${label}: a chip of a different row is drawn over a line of the preview, so it covers what is under it`);
        seen.previewLines += scene.cables.filter((cable) => cable.tone === "previewOut" || cable.tone === "previewIn").length;
        for (const node of scene.nodes) {
          assert.isTrue(node.chips.length === 0 || node.chips.length === unfolded.get(node.id), `${label}: ${node.id} shows a part of its chips`);
          if (node.id === ownRow) assert.strictEqual(node.chips.length, unfolded.get(node.id), `${label}: the row under the pointer lost its chips, and a person who points at a row reads its tools there`);
          if (node.chips.length === 0 && (unfolded.get(node.id) ?? 0) > 0) seen.rowsFoldedForAPreview += 1;
        }
        if (coveredByChips(scene).length > 0) seen.rowsWithChipsOverTheirOwnPreview += 1;
      }
    }
    return seen;
  };

  it.effect("keeps each tool chip of the Tools lens off each lit line, its arrowhead, and its ring, and off each line of a preview but for the chips of the row under the pointer, which stay", () =>
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

  it("folds the chips of a row for a ring that reaches them, also when the line of the ring keeps its air from them", () => {
    const chips: Rect = { x: 100, y: 92, width: 60, height: 16 };
    const pastTheChips = chips.x + chips.width + CHIP.air + 1;
    const line: Point[] = [{ x: pastTheChips, y: 0 }, { x: pastTheChips, y: 300 }];

    assert.isFalse(isAtChips({ points: line, gate: null }, chips), "the line has the air of a chip from the chips");
    assert.isTrue(isAtChips({ points: line, gate: { x: pastTheChips, y: 100 } }, chips), "the ring is on the line and reaches 3 units from it, so it has less than the air of a chip");
    assert.isFalse(isAtChips({ points: line, gate: { x: pastTheChips, y: 200 } }, chips), "the ring is on a part of the line that is far from the chips");
    assert.isTrue(isAtChips({ points: [{ x: chips.x + chips.width + CHIP.air, y: 0 }, { x: chips.x + chips.width + CHIP.air, y: 300 }], gate: null }, chips), "a line with less than the air of a chip is at the chips");
  });

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

  it.effect("gives the port of `codebase-design` one ring at the most, for the two cables from `architect` and the relation back, on the locked rest map", () =>
    Effect.gen(function* () {
      const stage = yield* snapshotStage;
      const architect = id("skill:architect");
      const scene = deriveScene({ ...stage, state: run(stage, [{ kind: "lockToggled" }, { kind: "picked", id: architect }]) });
      const toTheRow = lit(scene).filter((cable) => cable.key === `${architect}>skill:codebase-design` || cable.key === `${architect}>hosted:skills/codebase-design/DESIGN-IT-TWICE.md`);
      const back = lit(scene).filter((cable) => cable.key === `skill:codebase-design>${architect}`);

      assert.strictEqual(toTheRow.length, 2, "the snapshot lost one of the two relations");
      assert.strictEqual(new Set(toTheRow.map((cable) => `${cable.end.x},${cable.end.y}`)).size, 1, "the file is on the row of its host, so the two cables end at one port");
      assert.strictEqual(back.length, 1, "the snapshot lost the relation back");
      assert.isTrue(stage.graph.relations.get(back[0]?.key ?? relationKey({ from: architect, to: architect }))?.conditional, "the relation back has a condition");
      assert.isNull(back[0]?.gate, "the relation back is on the path of the first cable, so it has no gate there");
      assert.isTrue(toTheRow.every((cable) => cable.gate === null), "`architect` requires `codebase-design` without a condition");
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
