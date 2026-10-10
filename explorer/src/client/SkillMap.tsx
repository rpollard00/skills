import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { memo, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import type { ColumnId } from "../shared/graph";
import { FRAME, type Placement, type Point, type Seat } from "../shared/layout";
import type { NodeId, RelationKey } from "../shared/model";
import { cableSide, portMarksOf, type PortMark } from "../shared/view/ports";
import { CHIP, type CableView, type Chip, type Glyph, type NodeTone, type NodeView, type Scene } from "../shared/view/scene";
import type { Hover, Transform } from "../shared/view/state";
import { arrivalSeconds, AT_ONCE, CAMERA_SPRING, cableTiming, glyphArrivalSeconds, GROW_EASE, QUICK_SPRING, TIMING } from "./timing";

declare module "react" {
  interface CSSProperties {
    /** The time at which the cable that lights a node arrives. */
    "--arrival-delay"?: string;
    "--label-size"?: string;
    "--small-size"?: string;
  }
}

const COLUMN_TITLES: { readonly [Column in ColumnId]: string } = {
  router: "ROUTER",
  playbooks: "PLAYBOOKS",
  skills: "SKILLS",
  principles: "PRINCIPLES",
};

export const GLYPH_NAMES: { readonly [Shape in Glyph]: string } = {
  hub: "router",
  square: "playbook",
  ring: "skill, explicit only",
  disc: "skill, the model can invoke it",
  diamond: "principle, explicit only",
  "diamond-solid": "principle, the model can invoke it",
  pip: "hosted file",
};

/** The two font sizes that the layout computes widths from. */
const MAP_FONT_SIZES = { "--label-size": `${FRAME.labelFontPx}px`, "--small-size": `${FRAME.smallFontPx}px` } as const;

/**
 * How far the focus ring of a node starts left of its centre. The left port is 13 px from the centre.
 * The ring starts left of the port, so the bar of a `boundary` cable at the port is inside the ring and not under its edge.
 */
const RING_REACH = 17;

const RAIL_GRADIENT = "rail-from-router";

export const GlyphShape = ({ glyph }: { readonly glyph: Glyph }): ReactNode => {
  switch (glyph) {
    case "hub":
      return (
        <>
          <circle className="shape" r={9.5} />
          <circle className="shape" r={5.4} />
          <circle className="shape core" r={2} />
        </>
      );
    case "square":
      return <rect className="shape" x={-5} y={-5} width={10} height={10} rx={2.2} />;
    case "ring":
      return <circle className="shape" r={5} />;
    case "disc":
      return <circle className="shape solid" r={5.2} />;
    case "diamond":
      return <path className="shape" d="M0,-6.2L6.2,0L0,6.2L-6.2,0Z" />;
    case "diamond-solid":
      return <path className="shape solid" d="M0,-6.2L6.2,0L0,6.2L-6.2,0Z" />;
    case "pip":
      return <circle className="shape" r={2.6} />;
    default: {
      const _exhaustive: never = glyph;
      return _exhaustive;
    }
  }
};

export const MarkShape = ({ kind, x }: { readonly kind: Chip["kind"]; readonly x: number }): ReactNode =>
  kind === "script" ? (
    <rect className="mark" x={x} y={-4.5} width={5} height={9} rx={1} />
  ) : (
    <path className="mark line" d={`M${x + 0.7},-3.5l3.5,3.5l-3.5,3.5M${x + 6},3.6h4.6`} />
  );

const sameTone = (a: NodeTone, b: NodeTone): boolean => {
  if (a.kind === "step" && b.kind === "step") return a.n === b.n && a.order === b.order && a.conditional === b.conditional;
  if (a.kind === "needs" && b.kind === "needs") return a.order === b.order && a.via === b.via && a.length === b.length;
  if (a.kind === "neededBy" && b.kind === "neededBy") return a.order === b.order && a.via === b.via;
  return a.kind === b.kind;
};

interface NodeProps {
  readonly view: NodeView;
  readonly instant: boolean;
  readonly onHover: (hover: Hover) => void;
  readonly onPick: (id: NodeId) => void;
}

const sameNode = (a: NodeProps, b: NodeProps): boolean =>
  a.view.id === b.view.id &&
  a.view.at === b.view.at &&
  sameTone(a.view.tone, b.view.tone) &&
  a.view.mako === b.view.mako &&
  a.view.chips.length === b.view.chips.length &&
  a.view.changed === b.view.changed &&
  a.view.defective === b.view.defective &&
  a.view.hovered === b.view.hovered &&
  a.view.ringing === b.view.ringing &&
  a.view.match?.[0] === b.view.match?.[0] &&
  a.view.match?.[1] === b.view.match?.[1] &&
  a.instant === b.instant &&
  a.onHover === b.onHover &&
  a.onPick === b.onPick;

const LabelText = ({ seat, match }: { readonly seat: Seat; readonly match: NodeView["match"] }): ReactNode => {
  const x = seat.label.x - seat.centre.x;
  if (match === null) {
    return (
      <text className="label" x={x} y={0.5}>
        {seat.text}
      </text>
    );
  }
  return (
    <text className="label" x={x} y={0.5}>
      {seat.text.slice(0, match[0])}
      <tspan className="hit-text">{seat.text.slice(match[0], match[1])}</tspan>
      {seat.text.slice(match[1])}
    </text>
  );
};

const StepNumber = ({ tone, radius, instant }: { readonly tone: Extract<NodeTone, { kind: "step" }>; readonly radius: number; readonly instant: boolean }): ReactNode => (
  <motion.g
    initial={instant ? false : { opacity: 0, scale: 0.3 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={instant ? AT_ONCE : { ...QUICK_SPRING, delay: glyphArrivalSeconds(tone) }}
  >
    <circle className={tone.conditional ? "step-disc conditional" : "step-disc"} r={radius} />
    <text className={tone.conditional ? "step-number conditional" : "step-number"} y={0.6}>
      {tone.n}
    </text>
  </motion.g>
);

const ChipMark = ({ chip, first, centre, instant }: { readonly chip: Chip; readonly first: boolean; readonly centre: Point; readonly instant: boolean }): ReactNode => {
  const x = chip.x - centre.x;
  const icon = first ? CHIP.icon : 0;
  return (
    <g>
      <motion.rect
        className="chip-box"
        x={x - 3}
        y={-8}
        height={16}
        rx={3}
        initial={instant ? false : { width: 8, opacity: 0 }}
        animate={{ width: chip.width, opacity: 1 }}
        transition={instant ? AT_ONCE : QUICK_SPRING}
      />
      {first ? <MarkShape kind={chip.kind} x={x + 1} /> : null}
      <motion.text
        className="chip-text"
        x={x + icon + 2}
        y={0.5}
        initial={instant ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={instant ? AT_ONCE : { duration: TIMING.chipTextSeconds, delay: TIMING.chipTextDelaySeconds }}
      >
        {chip.text}
      </motion.text>
    </g>
  );
};

const NodeMark = memo(function NodeMark({ view, instant, onHover, onPick }: NodeProps): ReactNode {
  const { at, tone } = view;
  const numbered = tone.kind === "step" && tone.n > 0;
  const handlers = {
    onPointerEnter: () => onHover({ kind: "node", id: view.id }),
    onPointerLeave: () => onHover({ kind: "none" }),
    onFocus: () => onHover({ kind: "node", id: view.id }),
    onBlur: () => onHover({ kind: "none" }),
    onClick: () => onPick(view.id),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onPick(view.id);
    },
  };
  const shared = {
    className: "node",
    "data-node": view.id,
    "data-glyph": view.glyph,
    "data-tone": tone.kind,
    "data-hovered": view.hovered,
    "data-x": at.centre.x,
    "data-y": at.centre.y,
    transform: `translate(${at.centre.x} ${at.centre.y})`,
    tabIndex: 0,
    role: "button",
    "aria-pressed": tone.kind === "selected",
    style: { "--arrival-delay": `${Math.round(glyphArrivalSeconds(tone) * 1000)}ms` },
    ...handlers,
  };
  const ringOnce = view.ringing ? (
    <motion.circle
      className="ring-once"
      r={7}
      initial={instant ? false : { scale: 1, opacity: 1 }}
      animate={instant ? { scale: 1.6, opacity: 1 } : { scale: 2.6, opacity: 0 }}
      transition={instant ? AT_ONCE : { duration: TIMING.ringOnceSeconds, ease: "easeOut" }}
    />
  ) : null;

  if (at.kind === "pip") {
    return (
      <g {...shared} data-folded={at.folded} aria-label={`${view.name}, ${GLYPH_NAMES[view.glyph]}`}>
        <circle className="hit" r={5.5} />
        <circle className="ring" r={at.folded ? 9.5 : 6.5} />
        {numbered ? (
          <StepNumber tone={tone} radius={6} instant={instant} />
        ) : (
          <g className="glyph">
            <GlyphShape glyph={view.glyph} />
          </g>
        )}
        {view.changed ? <circle className="changed" r={5} /> : null}
        {ringOnce}
      </g>
    );
  }

  const width = at.label.x + at.label.width - at.centre.x + 17;
  return (
    <g {...shared} aria-label={`${view.name}, ${GLYPH_NAMES[view.glyph]}`}>
      <rect className="hit" x={-13} y={-11} width={width} height={22} />
      <rect className="ring" x={-RING_REACH} y={-10.5} width={width + RING_REACH - 13.5} height={21} rx={3} />
      {view.mako === "none" ? null : <path className="tick" data-mako={view.mako} d={view.mako === "named" ? "M-13.6,0H-8.6" : "M-13.6,-3L-8.6,0L-13.6,3Z"} />}
      {tone.kind === "selected" ? (
        <motion.circle className="halo" r={11} initial={instant ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 0.55 }} transition={instant ? AT_ONCE : QUICK_SPRING} />
      ) : null}
      {numbered ? (
        <StepNumber tone={tone} radius={7.5} instant={instant} />
      ) : (
        <g className="glyph">
          <GlyphShape glyph={view.glyph} />
          {tone.kind === "mutual" ? <circle className="mutual-dot" r={1.8} /> : null}
        </g>
      )}
      {view.changed ? <circle className="changed" r={view.glyph === "hub" ? 12 : 9} /> : null}
      {view.defective ? <path className="defect" d="M-8,8L8,-8" /> : null}
      <LabelText seat={at} match={view.match} />
      {at.foldedPips === null ? null : (
        <text className="fold-count" x={at.foldedPips.x - at.centre.x} y={0.5}>
          +{at.foldedPips.count}
        </text>
      )}
      {view.chips.length > 0
        ? view.chips.map((chip, index) => (
            <ChipMark key={`${chip.kind}:${chip.text}`} chip={chip} first={view.chips[index - 1]?.kind !== chip.kind} centre={at.centre} instant={instant} />
          ))
        : at.marks.map((mark) => <MarkShape key={mark.kind} kind={mark.kind} x={mark.x - at.centre.x} />)}
      {ringOnce}
    </g>
  );
}, sameNode);

interface WeaveProps {
  readonly cables: readonly CableView[];
  readonly leaders: readonly string[];
  /** A new placement has new paths for the same relations, so the weave draws again. */
  readonly placement: Placement;
}

const sameWeave = (a: WeaveProps, b: WeaveProps): boolean =>
  a.placement === b.placement &&
  a.cables.length === b.cables.length &&
  a.leaders.length === b.leaders.length &&
  a.cables.every((cable, index) => cable.key === b.cables[index]?.key && cable.cls === b.cables[index]?.cls && cable.conditional === b.cables[index]?.conditional);

/** The resting relations. Screen blending makes a track brighter where many relations share it. */
const Weave = memo(function Weave({ cables, leaders }: WeaveProps): ReactNode {
  return (
    <g className="weave">
      <path className="leaders" d={leaders.join("")} />
      {cables.map((cable) => (
        <path key={cable.key} className="cable" data-cable={cable.key} data-cls={cable.cls} data-conditional={cable.conditional} d={cable.rest} />
      ))}
    </g>
  );
}, sameWeave);

interface LitProps {
  readonly view: CableView;
  readonly instant: boolean;
  readonly world: Placement["world"];
  readonly onHover: (hover: Hover) => void;
  readonly onInspect: (key: RelationKey) => void;
}

const sameLit = (a: LitProps, b: LitProps): boolean =>
  a.view.key === b.view.key &&
  a.view.tone === b.view.tone &&
  a.view.bright === b.view.bright &&
  a.view.order === b.view.order &&
  a.view.cls === b.view.cls &&
  a.view.conditional === b.view.conditional &&
  a.instant === b.instant &&
  a.world === b.world &&
  a.onHover === b.onHover &&
  a.onInspect === b.onInspect;

const isPreview = (cable: CableView): boolean => cable.tone === "previewOut" || cable.tone === "previewIn";

/** A relation of the focus. It grows from its source to its target, so the direction is visible. */
const LitCable = memo(function LitCable({ view, instant, world, onHover, onInspect }: LitProps): ReactNode {
  const maskId = `grow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const preview = isPreview(view);
  const traced = view.tone === "step";
  const still = instant || preview;
  const [grown, setGrown] = useState(still);
  const { delaySeconds, travelSeconds } = cableTiming(view);
  const masked = !still && !grown;

  return (
    <g className="lit-cable" data-cable={view.key} data-tone={view.tone} data-bright={view.bright}>
      {masked ? (
        <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={world.width} height={world.height}>
          <motion.path
            d={view.d}
            fill="none"
            stroke="#ffffff"
            strokeWidth={12}
            strokeLinecap="butt"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: delaySeconds, duration: travelSeconds, ease: traced ? "linear" : GROW_EASE }}
            onAnimationComplete={() => setGrown(true)}
          />
        </mask>
      ) : null}
      <path className="cable" data-cls={view.cls} data-conditional={view.conditional} d={view.d} mask={masked ? `url(#${maskId})` : undefined} />
      {traced && !instant ? (
        <motion.path
          className="pulse"
          d={view.d}
          strokeDasharray={`18 ${view.length + 40}`}
          initial={{ strokeDashoffset: 18, opacity: 1 }}
          animate={{ strokeDashoffset: -view.length, opacity: [1, 1, 0] }}
          transition={{ delay: delaySeconds, duration: travelSeconds, ease: "linear", opacity: { delay: delaySeconds, duration: travelSeconds, times: [0, 0.92, 1] } }}
        />
      ) : null}
      {preview ? null : (
        <path
          className="hit"
          d={view.d}
          onPointerEnter={() => onHover({ kind: "cable", key: view.key })}
          onPointerLeave={() => onHover({ kind: "none" })}
          onClick={() => onInspect(view.key)}
        />
      )}
    </g>
  );
}, sameLit);

const ARROW = { length: 5, half: 3.2, setBack: 4.5 } as const;
const BAR_HALF = 5.5;

/** The mark of one port. It shows when the first cable gets to the port. */
const PortEnd = ({ mark, instant }: { readonly mark: PortMark; readonly instant: boolean }): ReactNode => {
  const { at, arrives } = mark;
  const tip = at.x - (mark.hasBar ? ARROW.setBack * arrives : 0);
  const moving = mark.cables.filter((cable) => !isPreview(cable));
  const firstArrival = Math.min(...moving.map((cable) => arrivalSeconds(cableTiming(cable))));
  const still = instant || moving.length === 0;
  return (
    <motion.g
      className="port-mark"
      data-tone={mark.tone}
      data-bright={mark.bright}
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={still ? AT_ONCE : { delay: Math.max(0, firstArrival - TIMING.portMarkSeconds), duration: TIMING.portMarkSeconds }}
    >
      {mark.hasArrow ? <path d={`M${tip - ARROW.length * arrives},${at.y - ARROW.half}L${tip},${at.y}L${tip - ARROW.length * arrives},${at.y + ARROW.half}`} /> : null}
      {mark.hasBar ? <path className="bar" d={`M${at.x},${at.y - BAR_HALF}V${at.y + BAR_HALF}`} /> : null}
    </motion.g>
  );
};

/** Applies the camera to the world group. A gesture and a window resize jump. Every other change springs. */
const useCamera = (camera: Transform, jump: boolean, area: string): RefObject<SVGGElement | null> => {
  const world = useRef<SVGGElement | null>(null);
  const tx = useMotionValue(camera.tx);
  const ty = useMotionValue(camera.ty);
  const scale = useMotionValue(camera.scale);
  const lastArea = useRef<string | null>(null);

  useLayoutEffect(() => {
    const apply = (): void => world.current?.setAttribute("transform", `translate(${tx.get()} ${ty.get()}) scale(${scale.get()})`);
    const stops = [tx.on("change", apply), ty.on("change", apply), scale.on("change", apply)];
    apply();
    return () => {
      for (const stop of stops) stop();
    };
  }, [tx, ty, scale]);

  useLayoutEffect(() => {
    const resized = lastArea.current !== area;
    lastArea.current = area;
    if (jump || resized) {
      tx.jump(camera.tx);
      ty.jump(camera.ty);
      scale.jump(camera.scale);
      return undefined;
    }
    const controls = [animate(tx, camera.tx, CAMERA_SPRING), animate(ty, camera.ty, CAMERA_SPRING), animate(scale, camera.scale, CAMERA_SPRING)];
    return () => {
      for (const control of controls) control.stop();
    };
  }, [camera.tx, camera.ty, camera.scale, jump, area, tx, ty, scale]);

  return world;
};

/** The rail is brightest at the router and fades along the comb: the centre of the fade is the port of the router, and its edge is the farthest playbook. */
const railFade = (scene: Scene): { readonly from: Point; readonly reach: number } | null => {
  const router = scene.nodes.find((node) => node.glyph === "hub")?.at;
  if (router === undefined || router.kind !== "seat") return null;
  const reaches = scene.nodes.flatMap((node) => (node.glyph === "square" && node.at.kind === "seat" ? [Math.hypot(node.at.left.x - router.right.x, node.at.left.y - router.right.y)] : []));
  return reaches.length === 0 ? null : { from: router.right, reach: Math.max(...reaches) };
};

export interface SkillMapProps {
  readonly placement: Placement;
  readonly camera: Transform;
  /** Changes when the map area changes size. */
  readonly area: string;
  /** Null while the index loads. The frame draws alone. */
  readonly scene: Scene | null;
  readonly onHover: (hover: Hover) => void;
  readonly onPick: (id: NodeId) => void;
  readonly onInspect: (key: RelationKey) => void;
  readonly onZoom: (factor: number, at: Point) => void;
  readonly onPan: (dx: number, dy: number) => void;
}

/** Draws a scene. It holds the motion, and no rule about what is lit. */
export const SkillMap = ({ placement, camera, area, scene, onHover, onPick, onInspect, onZoom, onPan }: SkillMapProps): ReactNode => {
  const instant = useReducedMotion() === true;
  const svg = useRef<SVGSVGElement | null>(null);
  const gestureAt = useRef(Number.NEGATIVE_INFINITY);
  const drag = useRef<{ readonly pointer: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const world = useCamera(camera, instant || performance.now() - gestureAt.current < TIMING.gestureWindowMs, area);

  useEffect(() => {
    const element = svg.current;
    if (element === null) return undefined;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const box = element.getBoundingClientRect();
      gestureAt.current = performance.now();
      onZoom(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0016)), { x: event.clientX - box.left, y: event.clientY - box.top });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [onZoom]);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>): void => {
    if (event.button !== 0 || !(event.target instanceof Element) || event.target.closest(".node, .lit-cable") !== null) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    const held = drag.current;
    if (held === null || held.pointer !== event.pointerId) return;
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    if (dx === 0 && dy === 0) return;
    held.x = event.clientX;
    held.y = event.clientY;
    gestureAt.current = performance.now();
    onPan(dx, dy);
  };
  const onPointerEnd = (event: PointerEvent<SVGSVGElement>): void => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  };

  const hub = FRAME.columns.router;
  const hubY = FRAME.top + FRAME.pitch * hub.firstRow;
  const weave = scene === null ? [] : scene.cables.filter((cable) => cable.tone === "weave");
  const lit = scene === null ? [] : scene.cables.filter((cable) => cable.tone !== "weave");
  const marks = portMarksOf(lit);
  const cursorAt = scene === null || scene.cursor === null ? undefined : placement.nodes.get(scene.cursor);
  const fade = scene === null ? null : railFade(scene);

  const litGroup = (side: "needs" | "neededBy"): ReactNode => (
    <g className={side === "needs" ? "lit glow-needs" : "lit glow-needed-by"}>
      {lit
        .filter((cable) => cableSide(cable.tone) === side)
        .map((cable) => (
          <LitCable key={`${cable.key}:${cable.tone}`} view={cable} instant={instant} world={placement.world} onHover={onHover} onInspect={onInspect} />
        ))}
      {marks
        .filter((mark) => cableSide(mark.tone) === side)
        .map((mark) => (
          <PortEnd key={`${mark.key}:${mark.tone}`} mark={mark} instant={instant} />
        ))}
    </g>
  );

  return (
    <svg
      ref={svg}
      className="map"
      role="group"
      aria-label="Skill map"
      data-weave={scene?.weave ?? "rest"}
      data-dragging={dragging}
      style={MAP_FONT_SIZES}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {fade === null ? null : (
        <defs>
          <radialGradient id={RAIL_GRADIENT} gradientUnits="userSpaceOnUse" cx={fade.from.x} cy={fade.from.y} r={fade.reach}>
            <stop className="rail-near" offset={0} />
            <stop className="rail-middle" offset={0.45} />
            <stop className="rail-far" offset={1} />
          </radialGradient>
        </defs>
      )}
      <g ref={world}>
        {placement.columns.map((column) => (
          <text key={column.id} className="column-title" x={column.title.x} y={column.title.y}>
            {COLUMN_TITLES[column.id]}
            {scene === null || column.id === "router" ? null : (
              <tspan className="count" dx={7}>
                {column.count}
              </tspan>
            )}
          </text>
        ))}
        {scene === null ? (
          <g>
            <circle className="frame-hub" cx={hub.x + FRAME.glyphInset} cy={hubY} r={9.5} />
            <path className="rail frame" d={`M${hub.x + hub.width},${hubY}H${FRAME.columns.playbooks.x - FRAME.portGap}`} />
          </g>
        ) : (
          <motion.g initial={instant ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={instant ? AT_ONCE : { duration: TIMING.mapSettleSeconds }}>
            <path className={fade === null ? "rail frame" : "rail"} d={placement.rail} stroke={fade === null ? undefined : `url(#${RAIL_GRADIENT})`} />
            <Weave cables={weave} leaders={scene.leaders} placement={placement} />
            {litGroup("neededBy")}
            {litGroup("needs")}
            <g className="nodes">
              {scene.nodes.map((node) => (
                <NodeMark key={node.id} view={node} instant={instant} onHover={onHover} onPick={onPick} />
              ))}
            </g>
            {cursorAt === undefined ? null : (
              <motion.circle
                className="cursor-ring"
                r={cursorAt.kind === "pip" ? 9.5 : cursorAt.column === "router" ? 12.5 : 11.5}
                initial={false}
                animate={{ cx: cursorAt.centre.x, cy: cursorAt.centre.y }}
                transition={instant ? AT_ONCE : QUICK_SPRING}
              />
            )}
          </motion.g>
        )}
      </g>
    </svg>
  );
};
