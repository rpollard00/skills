import { Schema } from "effect";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode, type RefObject } from "react";
import { toGraph } from "../shared/graph";
import { layout, type Point } from "../shared/layout";
import { ExplorerIndex, type NodeId, type RelationKey, type RouteId } from "../shared/model";
import type { CableClass } from "../shared/view/cable-class";
import { resolveCamera } from "../shared/view/camera";
import { decodeHash } from "../shared/view/hash";
import { showInAddress, type AddressBar } from "../shared/view/history";
import { isTextField, lockKey } from "../shared/view/keys";
import { deriveScene } from "../shared/view/scene";
import { INITIAL, placeOf, type Hover, type Lens, type Stage, type ViewEvent, type ViewState } from "../shared/view/state";
import { step } from "../shared/view/step";
import { evidenceOfStrip } from "../shared/view/strip";
import { focusedNode } from "../shared/view/trace";
import { TopBar } from "./TopBar";
import { Legend } from "./Legend";
import { InlineText } from "./LiveName";
import { Reader } from "./Reader";
import { SkillMap } from "./SkillMap";
import { StageCue } from "./StageCue";
import { OPEN_EVIDENCE_KEY, Strip } from "./Strip";
import { useIndex } from "./useIndex";

declare module "react" {
  interface CSSProperties {
    "--reader"?: string;
  }
}

const EMPTY_GRAPH = toGraph(
  Schema.decodeUnknownSync(ExplorerIndex)({
    version: 1,
    sourceDigest: "0".repeat(64),
    nodes: [],
    routes: [],
    triggers: [],
    files: [],
    relations: [],
    open: 0,
    orphans: 0,
    record: { kind: "current" },
  }),
);
const EMPTY_PLACEMENT = layout(EMPTY_GRAPH);

const readerWidth = (stageWidth: number): number => Math.round(Math.min(600, Math.max(420, stageWidth * 0.32)));

const useSize = (target: RefObject<HTMLElement | null>): { readonly width: number; readonly height: number } => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = target.current;
    if (element === null) return undefined;
    const observer = new ResizeObserver(() => {
      const box = element.getBoundingClientRect();
      setSize((current) => (current.width === box.width && current.height === box.height ? current : { width: box.width, height: box.height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);
  return size;
};

const focusIsNowhere = (): boolean => document.activeElement === null || document.activeElement === document.body;

const urlOf = (hash: string): string => `${window.location.pathname}${window.location.search}${hash}`;

const ADDRESS_BAR: AddressBar = {
  hash: () => window.location.hash,
  push: (hash) => window.history.pushState(null, "", urlOf(hash)),
  replace: (hash) => window.history.replaceState(null, "", urlOf(hash)),
};

const useFocusIntoReaderOnEachVisit = (visit: number, isReading: boolean, reader: RefObject<HTMLDivElement | null>): void => {
  const visitWithFocus = useRef(visit);
  useEffect(() => {
    if (visitWithFocus.current === visit) return;
    visitWithFocus.current = visit;
    if (isReading) reader.current?.focus({ preventScroll: true });
  }, [visit, isReading, reader]);
};

const useFocusBackOnNodeWhenReaderCloses = (isReading: boolean, selected: NodeId | null, stage: RefObject<HTMLDivElement | null>): void => {
  const wasReading = useRef(isReading);
  useEffect(() => {
    const closed = wasReading.current && !isReading;
    wasReading.current = isReading;
    if (!closed || selected === null || !focusIsNowhere()) return;
    stage.current?.querySelector<SVGGElement>(`[data-node="${CSS.escape(selected)}"][data-off-stage="false"]`)?.focus({ preventScroll: true });
  }, [isReading, selected, stage]);
};

export const App = (): ReactNode => {
  const { load, retry } = useIndex();
  const stageElement = useRef<HTMLDivElement | null>(null);
  const finderInput = useRef<HTMLInputElement | null>(null);
  const legendControl = useRef<HTMLButtonElement | null>(null);
  const readerRegion = useRef<HTMLDivElement | null>(null);
  const size = useSize(stageElement);
  const [legendOpen, setLegendOpen] = useState(false);
  const [restored, setRestored] = useState(false);

  const ready = load.kind === "ready";
  const graph = ready ? load.graph : EMPTY_GRAPH;
  const placement = ready ? load.placement : EMPTY_PLACEMENT;
  const stage: Stage = useMemo(
    () => ({ graph, placement, viewport: { width: size.width, height: size.height, reader: readerWidth(size.width) } }),
    [graph, placement, size.width, size.height],
  );
  const [state, dispatch] = useReducer((current: ViewState, event: ViewEvent) => step(current, event, stage), INITIAL);

  const [lock] = useState(lockKey);
  useEffect(() => {
    if (!ready) return;
    for (const event of lock.onArrival(decodeHash(window.location.hash))) dispatch(event);
    setRestored(true);
  }, [ready, graph, lock]);

  useEffect(() => {
    const onAddress = (): void => dispatch({ kind: "restored", place: decodeHash(window.location.hash) });
    window.addEventListener("hashchange", onAddress);
    return () => window.removeEventListener("hashchange", onAddress);
  }, []);

  const place = useMemo(() => placeOf(state), [state.focus, state.pin, state.reading, state.query, state.lens, state.muted]);
  useEffect(() => {
    if (restored) showInAddress(ADDRESS_BAR, place, graph);
  }, [restored, place, graph]);

  const scene = useMemo(() => (ready ? deriveScene({ ...stage, state }) : null), [ready, stage, state]);
  const camera = scene?.camera ?? resolveCamera(state, stage);
  const quoted = scene === null ? null : evidenceOfStrip(scene.strip);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const lockEvents = lock.onKey(event, ready);
      if (lockEvents !== null) {
        for (const lockEvent of lockEvents) dispatch(lockEvent);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        if (isTextField(event.target) && state.reading.kind === "closed" && state.focus.kind === "none" && state.query === "") finderInput.current?.blur();
        dispatch({ kind: "cleared" });
        return;
      }
      if (isTextField(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        finderInput.current?.focus();
        finderInput.current?.select();
      } else if (event.key === "0") {
        dispatch({ kind: "fitted" });
      } else if (event.key === OPEN_EVIDENCE_KEY && quoted !== null) {
        dispatch({ kind: "evidenceOpened", file: quoted.file, line: quoted.line });
      } else if (state.focus.kind === "route" && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        dispatch({ kind: "stepped", by: event.key === "ArrowRight" ? 1 : -1 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, lock, state.reading.kind, state.focus.kind, state.query, quoted]);

  const isReading = state.reading.kind === "open";
  useFocusIntoReaderOnEachVisit(state.visit, isReading, readerRegion);
  useFocusBackOnNodeWhenReaderCloses(isReading, focusedNode(state.focus, graph), stageElement);

  const onHover = useCallback((hover: Hover) => dispatch({ kind: "pointed", hover }), []);
  const onPick = useCallback((id: NodeId) => dispatch({ kind: "picked", id }), []);
  const onTrace = useCallback((route: RouteId) => dispatch({ kind: "traced", route }), []);
  const onInspect = useCallback((key: RelationKey) => dispatch({ kind: "inspected", key }), []);
  const onDeselect = useCallback(() => dispatch({ kind: "deselected" }), []);
  const onLock = useCallback(() => dispatch({ kind: "lockToggled" }), []);
  const onZoom = useCallback((factor: number, at: Point) => dispatch({ kind: "zoomed", factor, at }), []);
  const onPan = useCallback((dx: number, dy: number) => dispatch({ kind: "panned", dx, dy }), []);
  const onType = useCallback((query: string) => dispatch({ kind: "typed", query }), []);
  const onLens = useCallback((lens: Lens) => dispatch({ kind: "lensed", lens }), []);
  const onFit = useCallback(() => dispatch({ kind: "fitted" }), []);
  const onMute = useCallback((cls: CableClass) => dispatch({ kind: "legendToggled", cls }), []);
  const onFollow = useCallback((path: string, anchor: string | null) => dispatch({ kind: "linkFollowed", path, anchor, line: null }), []);
  const onOpen = useCallback((path: string, line: number) => dispatch({ kind: "linkFollowed", path, anchor: null, line }), []);
  const onOpenEvidence = useCallback((file: string, line: number) => dispatch({ kind: "evidenceOpened", file, line }), []);
  const onBack = useCallback(() => dispatch({ kind: "wentBack" }), []);
  const onClose = useCallback(() => dispatch({ kind: "readerClosed" }), []);
  const onClear = useCallback(() => dispatch({ kind: "typed", query: "" }), []);
  const onStep = useCallback((by: 1 | -1) => dispatch({ kind: "stepped", by }), []);
  const onLegendClose = useCallback(() => {
    setLegendOpen(false);
    legendControl.current?.focus();
  }, []);

  return (
    <div className="app" data-reading={state.reading.kind} style={{ "--reader": `${stage.viewport.reader}px` }}>
      <TopBar
        input={finderInput}
        legendControl={legendControl}
        graph={graph}
        load={load}
        query={state.query}
        hits={scene?.hits ?? []}
        lens={state.lens}
        legendOpen={legendOpen}
        fitted={state.camera.kind === "fit"}
        locked={state.pin.kind === "locked"}
        onType={onType}
        onPick={onPick}
        onTrace={onTrace}
        onHover={onHover}
        onLens={onLens}
        onFit={onFit}
        onLock={onLock}
        onLegend={setLegendOpen}
        onRetry={retry}
      />
      <div className="stage" ref={stageElement}>
        {legendOpen && ready ? <Legend muted={state.muted} onMute={onMute} onClose={onLegendClose} /> : null}
        {scene !== null && scene.locked !== null ? <StageCue locked={scene.locked} graph={graph} /> : null}
        <SkillMap
          placement={placement}
          camera={camera}
          area={`${size.width}x${size.height}`}
          scene={size.width === 0 ? null : scene}
          onHover={onHover}
          onPick={onPick}
          onInspect={onInspect}
          onDeselect={onDeselect}
          onZoom={onZoom}
          onPan={onPan}
        />
        {load.kind === "failed" ? (
          <div className="notice" role="alert">
            <p>
              <InlineText text={load.message} />
            </p>
            <button type="button" className="text-button" onClick={retry}>
              Retry
            </button>
          </div>
        ) : null}
        {state.reading.kind === "open" && ready ? (
          <Reader
            graph={graph}
            reading={state.reading}
            visit={state.visit}
            region={readerRegion}
            focus={state.focus}
            pin={state.pin}
            hover={state.hover}
            onIndexIsOld={retry}
            onPick={onPick}
            onTrace={onTrace}
            onHover={onHover}
            onFollow={onFollow}
            onOpen={onOpen}
            onBack={onBack}
            onClose={onClose}
          />
        ) : null}
      </div>
      <Strip strip={scene?.strip ?? null} loading={load.kind === "loading"} tracing={state.focus.kind === "route"} onClear={onClear} onOpenEvidence={onOpenEvidence} onStep={onStep} />
    </div>
  );
};
