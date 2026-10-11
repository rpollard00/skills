import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { FOCUS, GROUP_TITLES, hasCount, WORD_BOX, wordWidthOf, type Caption } from "../shared/focus-layout";
import { FRAME, type Placement, type Point } from "../shared/layout";
import type { NodeId, RelationKey } from "../shared/model";
import { GATE, grownPath, tipOf } from "../shared/polyline";
import type { Stand } from "../shared/view/arranged";
import { BESIDE, FILE_DOT, type WordBeside } from "../shared/view/beside";
import { cableSide, portMarksOf, type PortMark } from "../shared/view/ports";
import { CHIP, type CableView, type Chip, type Glyph, type NodeTone, type NodeView, type Scene } from "../shared/view/scene";
import type { Hover, Transform } from "../shared/view/state";
import { arrivalSeconds, AT_ONCE, CAMERA_SPRING, cableTiming, glyphArrivalSeconds, GROW_EASE, QUICK_SPRING, TIMING, TRAVEL_SPRING } from "./timing";

declare module "react" {
  interface CSSProperties {
    "--cable-arrival-delay"?: string;
    "--node-travel"?: string;
    "--label-size"?: string;
    "--small-size"?: string;
    "--word-size"?: string;
    "--caption-size"?: string;
    "--caption-spacing"?: string;
  }
}

export const GLYPH_NAMES: { readonly [Shape in Glyph]: string } = {
  hub: "router",
  square: "playbook",
  ring: "skill, explicit only",
  disc: "skill, the model can invoke it",
  diamond: "principle, explicit only",
  "diamond-solid": "principle, the model can invoke it",
  pip: "hosted file",
};

const MAP_VARIABLES = {
  "--label-size": `${FRAME.labelFontPx}px`,
  "--small-size": `${FRAME.smallFontPx}px`,
  "--word-size": `${FOCUS.wordFontPx}px`,
  "--caption-size": `${FOCUS.captionFontPx}px`,
  "--caption-spacing": `${FOCUS.captionSpacingEm}em`,
  "--node-travel": `${TIMING.nodeTravelSeconds * 1000}ms`,
} as const;

const BAR = { half: 5.5, width: 2.2 } as const;

const RING_CLEAR_OF_BAR = 2.9;
const RING_REACH = FOCUS.portReach + BAR.width / 2 + RING_CLEAR_OF_BAR;

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

/** `reach` is the radius of the glyph. */
export const ChangedMark = ({ reach }: { readonly reach: number }): ReactNode => (
  <path className="changed" d={`M${reach + 1},${-reach - 0.5}l3.2,-5.6l3.2,5.6Z`} />
);

const GLYPH_REACH: { readonly [Shape in Glyph]: number } = { hub: 9.5, square: 5.5, ring: 5.5, disc: 5.5, diamond: 5.5, "diamond-solid": 5.5, pip: 2.6 };

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
  readonly travels: boolean;
  readonly onHover: (hover: Hover) => void;
  readonly onPick: (id: NodeId) => void;
}

const sameNode = (a: NodeProps, b: NodeProps): boolean =>
  a.view.id === b.view.id &&
  a.view.at === b.view.at &&
  a.view.offStage === b.view.offStage &&
  a.travels === b.travels &&
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

type Lined = Exclude<Stand, { kind: "pip" }>;

const LabelText = ({ at, match }: { readonly at: Lined; readonly match: NodeView["match"] }): ReactNode => (
  <text className="label" x={at.textX - at.centre.x} y={0.5}>
    {match === null ? (
      at.text
    ) : (
      <>
        {at.text.slice(0, match[0])}
        <tspan className="hit-text">{at.text.slice(match[0], match[1])}</tspan>
        {at.text.slice(match[1])}
      </>
    )}
    {at.kind === "row" && at.note !== null ? (
      <tspan className="note" dx={FRAME.charWidth}>
        {at.note}
      </tspan>
    ) : null}
  </text>
);

const afterTravel = (travels: boolean, seconds: number): number => (travels ? TIMING.nodeTravelSeconds : 0) + seconds;

interface StepNumberProps {
  readonly tone: Extract<NodeTone, { kind: "step" }>;
  readonly radius: number;
  readonly instant: boolean;
  readonly travels: boolean;
}

const StepNumber = ({ tone, radius, instant, travels }: StepNumberProps): ReactNode => (
  <motion.g
    initial={instant ? false : { opacity: 0, scale: 0.3 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={instant ? AT_ONCE : { ...QUICK_SPRING, delay: afterTravel(travels, glyphArrivalSeconds(tone)) }}
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
        x={x - CHIP.lead}
        y={-CHIP.half}
        height={CHIP.half * 2}
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

const NodeMark = memo(function NodeMark({ view, instant, travels, onHover, onPick }: NodeProps): ReactNode {
  const { at, tone } = view;
  const numbered = tone.kind === "step" && tone.n > 0;
  const handlers = view.offStage
    ? {}
    : {
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
    "data-off-stage": view.offStage,
    "data-x": at.centre.x,
    "data-y": at.centre.y,
    initial: false,
    animate: { x: at.centre.x, y: at.centre.y },
    transition: instant ? AT_ONCE : TRAVEL_SPRING,
    tabIndex: view.offStage ? -1 : 0,
    role: "button",
    "aria-pressed": tone.kind === "selected",
    "aria-hidden": view.offStage ? true : undefined,
    style: { "--cable-arrival-delay": `${Math.round(afterTravel(travels, glyphArrivalSeconds(tone)) * 1000)}ms` },
    ...handlers,
  } as const;
  const ringOnce = view.ringing ? (
    <motion.circle
      className="ring-once"
      r={7}
      initial={instant ? false : { scale: 1, opacity: 1 }}
      animate={instant ? { scale: 1.6, opacity: 1 } : { scale: 2.6, opacity: 0 }}
      transition={instant ? AT_ONCE : { duration: TIMING.ringOnceSeconds, ease: "easeOut" }}
    />
  ) : null;
  const changed = view.changed ? <ChangedMark reach={GLYPH_REACH[view.glyph]} /> : null;

  if (at.kind === "pip") {
    return (
      <motion.g {...shared} data-folded={at.folded} aria-label={`${view.name}, ${GLYPH_NAMES[view.glyph]}`}>
        <circle className="hit" r={5.5} />
        <circle className="ring" r={at.folded ? 9.5 : 6.5} />
        {numbered ? (
          <StepNumber tone={tone} radius={6} instant={instant} travels={travels} />
        ) : (
          <g className="glyph">
            <GlyphShape glyph={view.glyph} />
          </g>
        )}
        {changed}
        {ringOnce}
      </motion.g>
    );
  }

  const isMirrored = at.kind === "row" && at.mirrored;
  const from = isMirrored ? at.label.x - at.centre.x - 4 : -FOCUS.portReach;
  const to = isMirrored ? FOCUS.portReach : at.label.x + at.label.width - at.centre.x + 4;
  const chipsBox = view.chipsBox;
  // The ring of the keyboard focus goes around the chips of the row, which reach past its label.
  const ringTo = chipsBox === null ? to : Math.max(to, chipsBox.x + chipsBox.width - at.centre.x + 4);
  return (
    <motion.g {...shared} aria-label={`${view.name}, ${GLYPH_NAMES[view.glyph]}`}>
      <rect className="hit" x={from} y={-11} width={to - from} height={22} />
      <rect className="ring" x={isMirrored ? from + 0.5 : -RING_REACH} y={-10.5} width={isMirrored ? RING_REACH - from - 0.5 : ringTo + RING_REACH - 0.5} height={21} rx={3} />
      {view.mako === "none" ? null : <path className="tick" data-mako={view.mako} d={view.mako === "named" ? "M-13.6,0H-8.6" : "M-13.6,-3L-8.6,0L-13.6,3Z"} />}
      {tone.kind === "selected" ? (
        <motion.circle className="halo" r={11} initial={instant ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 0.55 }} transition={instant ? AT_ONCE : QUICK_SPRING} />
      ) : null}
      {numbered ? (
        <StepNumber tone={tone} radius={7.5} instant={instant} travels={travels} />
      ) : (
        <g className="glyph">
          <GlyphShape glyph={view.glyph} />
          {tone.kind === "mutual" ? <circle className="mutual-dot" r={1.8} /> : null}
        </g>
      )}
      {changed}
      {view.defective ? <path className="defect" d="M-8,8L8,-8" /> : null}
      <LabelText at={at} match={view.match} />
      {at.foldedPips === null ? null : (
        <text className="fold-count" x={at.foldedPips.x - at.centre.x} y={0.5}>
          +{at.foldedPips.count}
        </text>
      )}
      {/* One ground behind all the chips of the row: the row under the pointer keeps its chips over its own line, and no part of that line shows between two chips. */}
      {chipsBox === null ? null : <rect className="chip-ground" x={chipsBox.x - at.centre.x} y={chipsBox.y - at.centre.y} width={chipsBox.width} height={chipsBox.height} />}
      {view.chips.length > 0
        ? view.chips.map((chip, index) => (
            <ChipMark key={`${chip.kind}:${chip.text}`} chip={chip} first={view.chips[index - 1]?.kind !== chip.kind} centre={at.centre} instant={instant} />
          ))
        : at.marks.map((mark) => <MarkShape key={mark.kind} kind={mark.kind} x={mark.x - at.centre.x} />)}
      {ringOnce}
    </motion.g>
  );
}, sameNode);

interface WeaveProps {
  readonly cables: readonly CableView[];
  readonly leaders: readonly string[];
}

const sameWeave = (a: WeaveProps, b: WeaveProps): boolean =>
  a.cables.length === b.cables.length &&
  a.leaders.length === b.leaders.length &&
  a.leaders.every((leader, index) => leader === b.leaders[index]) &&
  a.cables.every((cable, index) => cable.key === b.cables[index]?.key && cable.weight === b.cables[index]?.weight && cable.rest === b.cables[index]?.rest);

const Weave = memo(function Weave({ cables, leaders }: WeaveProps): ReactNode {
  return (
    <g className="weave">
      <path className="leaders" d={leaders.join("")} />
      {cables.map((cable) => (
        <path key={cable.key} className="cable" data-cable={cable.key} data-weight={cable.weight} d={cable.rest} />
      ))}
    </g>
  );
}, sameWeave);

interface LitProps {
  readonly view: CableView;
  readonly instant: boolean;
  readonly travels: boolean;
  readonly onInspect: (key: RelationKey) => void;
}

const sameLit = (a: LitProps, b: LitProps): boolean =>
  a.view.key === b.view.key &&
  a.view.d === b.view.d &&
  a.view.tone === b.view.tone &&
  a.view.bright === b.view.bright &&
  a.view.order === b.view.order &&
  a.view.weight === b.view.weight &&
  a.view.conditional === b.view.conditional &&
  a.view.words?.text === b.view.words?.text &&
  a.instant === b.instant &&
  a.travels === b.travels &&
  a.onInspect === b.onInspect;

const isPreview = (cable: CableView): boolean => cable.tone === "previewOut" || cable.tone === "previewIn";

const ARROW = { length: 5, half: 3.2, setBack: 4.5 } as const;

const hasMarksOnWire = (view: CableView): boolean => view.words !== null || view.gate !== null || view.back !== null;

/** These are not in the group that glows, because the box under the words has the color of the ground and must cast no light. */
const OnWire = ({ view, instant, travels }: { readonly view: CableView; readonly instant: boolean; readonly travels: boolean }): ReactNode => {
  const { words, gate, back } = view;
  const width = words === null ? 0 : wordWidthOf(words.text);
  const still = instant || isPreview(view);
  return (
    <motion.g
      className="on-wire"
      data-cable={view.key}
      data-tone={view.tone}
      data-bright={view.bright}
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1, transition: still ? AT_ONCE : { delay: afterTravel(travels, arrivalSeconds(cableTiming(view))), duration: TIMING.fadeInSeconds } }}
      exit={{ opacity: 0, transition: instant ? AT_ONCE : { duration: TIMING.cableFadeSeconds } }}
    >
      {words === null ? null : (
        <>
          <rect className="word-ground" x={words.at.x - width / 2} y={words.at.y - WORD_BOX.height / 2} width={width} height={WORD_BOX.height} />
          <text className="word" x={words.at.x} y={words.at.y + 0.5}>
            {words.text}
          </text>
        </>
      )}
      {gate === null ? null : <circle className="gate" cx={gate.x} cy={gate.y} r={GATE.radius} />}
      {back === null ? null : (
        <path className="back" data-conditional={back.conditional} d={`M${back.x + ARROW.length},${back.y - ARROW.half}L${back.x},${back.y}L${back.x + ARROW.length},${back.y + ARROW.half}${back.conditional ? "Z" : ""}`} />
      )}
    </motion.g>
  );
};

const WordBesideName = ({ word, delaySeconds, instant }: { readonly word: WordBeside; readonly delaySeconds: number; readonly instant: boolean }): ReactNode => {
  const { box } = word;
  const dot = word.ofFile ? BESIDE.dot : 0;
  const middle = box.y + box.height / 2;
  return (
    <motion.g
      className="on-wire"
      data-beside={word.node}
      data-cables={word.keys.join(" ")}
      data-tone={word.tone}
      data-bright={word.bright}
      initial={instant ? false : { opacity: 0 }}
      animate={{ opacity: 1, transition: instant ? AT_ONCE : { delay: delaySeconds, duration: TIMING.fadeInSeconds } }}
      exit={{ opacity: 0, transition: instant ? AT_ONCE : { duration: TIMING.cableFadeSeconds } }}
    >
      <rect className="word-ground" x={box.x} y={box.y} width={box.width} height={box.height} />
      {word.ofFile ? <circle className="word-dot" cx={box.x + WORD_BOX.pad + FILE_DOT.radius} cy={middle} r={FILE_DOT.radius} /> : null}
      <text className="word" x={box.x + dot + (box.width - dot) / 2} y={middle + 0.5}>
        {word.text}
      </text>
    </motion.g>
  );
};

const LitCable = memo(function LitCable({ view, instant, travels, onInspect }: LitProps): ReactNode {
  const preview = isPreview(view);
  const traced = view.tone === "step";
  const still = instant || preview;
  const [grown, setGrown] = useState(still);
  const { delaySeconds, travelSeconds } = cableTiming(view);
  const progress = useMotionValue(still ? 1 : 0);
  const { points } = view;
  const growing = useTransform(progress, (part) => grownPath(points, part));
  const tipX = useTransform(progress, (part) => tipOf(points, part).x);
  const tipY = useTransform(progress, (part) => tipOf(points, part).y);
  const tipOpacity = useTransform(progress, (part) => (part > 0 && part < 1 ? 1 : 0));

  useEffect(() => {
    if (still) return undefined;
    const controls = animate(progress, 1, {
      delay: afterTravel(travels, delaySeconds),
      duration: travelSeconds,
      ease: traced ? "linear" : GROW_EASE,
      onComplete: () => setGrown(true),
    });
    return () => controls.stop();
  }, [still, travels, delaySeconds, travelSeconds, traced, progress]);

  const shown = still || grown;
  return (
    <motion.g
      className="lit-cable"
      data-cable={view.key}
      data-tone={view.tone}
      data-bright={view.bright}
      data-weight={view.weight}
      exit={{ opacity: 0 }}
      transition={instant ? AT_ONCE : { duration: TIMING.cableFadeSeconds }}
    >
      {shown ? <path className="cable" d={view.d} /> : <motion.path className="cable" d={growing} />}
      {traced && !shown ? <motion.circle className="pulse" r={2.6} cx={tipX} cy={tipY} style={{ opacity: tipOpacity }} /> : null}
      {preview ? null : (
        <path className="hit" d={view.d} onClick={() => onInspect(view.key)} />
      )}
    </motion.g>
  );
}, sameLit);

const PortEnd = ({ mark, instant, travels }: { readonly mark: PortMark; readonly instant: boolean; readonly travels: boolean }): ReactNode => {
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
      animate={{ opacity: 1, transition: still ? AT_ONCE : { delay: Math.max(0, afterTravel(travels, firstArrival) - TIMING.portMarkSeconds), duration: TIMING.portMarkSeconds } }}
      exit={{ opacity: 0, transition: instant ? AT_ONCE : { duration: TIMING.cableFadeSeconds } }}
    >
      {mark.hasArrow ? <path d={`M${tip - ARROW.length * arrives},${at.y - ARROW.half}L${tip},${at.y}L${tip - ARROW.length * arrives},${at.y + ARROW.half}`} /> : null}
      {mark.hasBar ? <path className="bar" d={`M${at.x},${at.y - BAR.half}V${at.y + BAR.half}`} /> : null}
    </motion.g>
  );
};

const GroupCaption = ({ caption, instant }: { readonly caption: Caption; readonly instant: boolean }): ReactNode => (
  <motion.text
    className="column-title"
    x={caption.at.x}
    y={caption.at.y}
    textAnchor={caption.anchor}
    initial={instant ? false : { opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={instant ? AT_ONCE : { delay: TIMING.nodeTravelSeconds, duration: TIMING.fadeInSeconds }}
  >
    {GROUP_TITLES[caption.group]}
    {hasCount(caption.group) ? (
      <tspan className="count" dx={7}>
        {caption.count}
      </tspan>
    ) : null}
  </motion.text>
);

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

const railFade = (scene: Scene, placement: Placement): { readonly from: Point; readonly reach: number } | null => {
  const seatsOf = (glyph: Glyph) =>
    scene.nodes.flatMap((node) => {
      const seat = node.glyph === glyph ? placement.nodes.get(node.id) : undefined;
      return seat?.kind === "seat" ? [seat] : [];
    });
  const router = seatsOf("hub")[0];
  if (router === undefined) return null;
  const reaches = seatsOf("square").map((seat) => Math.hypot(seat.left.x - router.right.x, seat.left.y - router.right.y));
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
  /** A click on the empty stage. */
  readonly onDeselect: () => void;
  readonly onZoom: (factor: number, at: Point) => void;
  readonly onPan: (dx: number, dy: number) => void;
}

const hoverName = (hover: Hover): string => (hover.kind === "none" ? "" : hover.kind === "cable" ? `cable ${hover.key}` : `${hover.kind} ${hover.id}`);

const CLICK_SLOP_PX = 4;

export const SkillMap = ({ placement, camera, area, scene, onHover, onPick, onInspect, onDeselect, onZoom, onPan }: SkillMapProps): ReactNode => {
  const instant = useReducedMotion() === true;
  const svg = useRef<SVGSVGElement | null>(null);
  const gestureAt = useRef(Number.NEGATIVE_INFINITY);
  const drag = useRef<{ readonly pointer: number; x: number; y: number; travel: number } | null>(null);
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
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, travel: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  /**
   * What is under the pointer comes from a move of the pointer, and not from a node that enters the place of a still pointer.
   * A selection moves nodes, and a node that stops under the pointer must not start a hover that nobody made.
   */
  const pointerAt = useRef<Point | null>(null);
  const hoverSent = useRef("");
  const reportHover = useCallback(
    (hover: Hover): void => {
      hoverSent.current = hoverName(hover);
      onHover(hover);
    },
    [onHover],
  );
  const sendHover = (hover: Hover): void => {
    if (hoverSent.current !== hoverName(hover)) reportHover(hover);
  };
  const hoverUnder = (target: Element): Hover => {
    const nodeId = target.closest<SVGGElement>('.node[data-off-stage="false"]')?.dataset["node"];
    const node = nodeId === undefined ? undefined : scene?.nodes.find((item) => item.id === nodeId);
    if (node !== undefined) return { kind: "node", id: node.id };
    const cableKey = target.closest<SVGGElement>(".lit-cable")?.dataset["cable"];
    const cable = cableKey === undefined ? undefined : scene?.cables.find((item) => item.key === cableKey && item.tone !== "weave");
    return cable === undefined ? { kind: "none" } : { kind: "cable", key: cable.key };
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    const held = drag.current;
    const last = pointerAt.current;
    const pointerMoved = last === null || last.x !== event.clientX || last.y !== event.clientY;
    pointerAt.current = { x: event.clientX, y: event.clientY };
    if (held === null && pointerMoved && event.target instanceof Element) sendHover(hoverUnder(event.target));
    if (held === null || held.pointer !== event.pointerId) return;
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    if (dx === 0 && dy === 0) return;
    held.x = event.clientX;
    held.y = event.clientY;
    held.travel += Math.abs(dx) + Math.abs(dy);
    if (held.travel < CLICK_SLOP_PX) return;
    gestureAt.current = performance.now();
    onPan(dx, dy);
  };
  const onPointerEnd = (event: PointerEvent<SVGSVGElement>): void => {
    const held = drag.current;
    if (held?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.type === "pointerup" && held.travel < CLICK_SLOP_PX) onDeselect();
  };

  const hub = FRAME.columns.router;
  const hubY = FRAME.top + FRAME.pitch * hub.firstRow;
  const arranged = scene?.arranged ?? false;
  const travels = scene?.travels ?? false;
  const weave = scene === null ? [] : scene.cables.filter((cable) => cable.tone === "weave");
  const frame = scene === null ? [] : scene.cables.filter((cable) => cable.tone === "frame");
  const lit = scene === null ? [] : scene.cables.filter((cable) => cable.tone !== "weave" && cable.tone !== "frame");
  const marks = portMarksOf(lit);
  const cursor = scene === null || scene.cursor === null ? undefined : scene.nodes.find((node) => node.id === scene.cursor);
  const fade = scene === null ? null : railFade(scene, placement);

  const litGroup = (side: "needs" | "neededBy"): ReactNode => (
    <g className={side === "needs" ? "lit glow-needs" : "lit glow-needed-by"}>
      <AnimatePresence>
        {lit
          .filter((cable) => cableSide(cable.tone) === side)
          .map((cable) => (
            <LitCable key={`${cable.key}:${cable.tone}:${cable.d}`} view={cable} instant={instant} travels={travels} onInspect={onInspect} />
          ))}
        {marks
          .filter((mark) => cableSide(mark.tone) === side)
          .map((mark) => (
            <PortEnd key={`${mark.key}:${mark.tone}`} mark={mark} instant={instant} travels={travels} />
          ))}
      </AnimatePresence>
    </g>
  );

  return (
    <svg
      ref={svg}
      className="map"
      role="group"
      aria-label="Skill map"
      data-weave={scene?.weave ?? "rest"}
      data-arranged={arranged}
      data-locked={scene !== null && scene.locked !== null}
      data-dragging={dragging}
      style={MAP_VARIABLES}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={() => {
        pointerAt.current = null;
        sendHover({ kind: "none" });
      }}
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
        <g className="rest-titles">
          {placement.columns.map((column) => (
            <text key={column.id} className="column-title" x={column.title.x} y={column.title.y}>
              {GROUP_TITLES[column.id]}
              {scene === null || !hasCount(column.id) ? null : (
                <tspan className="count" dx={7}>
                  {column.count}
                </tspan>
              )}
            </text>
          ))}
        </g>
        {scene === null ? (
          <g>
            <circle className="frame-hub" cx={hub.x + FRAME.glyphInset} cy={hubY} r={9.5} />
            <path className="rail without-fade" d={`M${hub.x + hub.width},${hubY}H${FRAME.columns.playbooks.x - FRAME.portGap}`} />
          </g>
        ) : (
          <motion.g initial={instant ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={instant ? AT_ONCE : { duration: TIMING.mapSettleSeconds }}>
            <path className={fade === null ? "rail without-fade" : "rail"} d={placement.rail.d} stroke={fade === null ? undefined : `url(#${RAIL_GRADIENT})`} />
            <Weave cables={weave} leaders={scene.leaders} />
            {/* One path for all the cables of the frame: where many of them share a trunk, the trunk is not brighter than a branch. */}
            <path className="stage-frame" d={frame.map((cable) => cable.d).join("")} />
            {scene.captions.map((caption) => (
              <GroupCaption key={`${caption.key}:${caption.at.x},${caption.at.y}`} caption={caption} instant={instant} />
            ))}
            {litGroup("neededBy")}
            {litGroup("needs")}
            <g className="lit">
              <AnimatePresence>
                {lit.filter(hasMarksOnWire).map((cable) => (
                  <OnWire key={`${cable.key}:${cable.tone}:${cable.d}`} view={cable} instant={instant} travels={travels} />
                ))}
                {scene.beside.map((word) => {
                  const cable = lit.find((item) => item.key === word.keys[0]);
                  return <WordBesideName key={`${word.tone}:${word.keys.join(" ")}`} word={word} delaySeconds={cable === undefined ? 0 : arrivalSeconds(cableTiming(cable))} instant={instant} />;
                })}
              </AnimatePresence>
            </g>
            <g className="nodes">
              {scene.nodes.map((node) => (
                <NodeMark key={node.id} view={node} instant={instant} travels={travels} onHover={reportHover} onPick={onPick} />
              ))}
            </g>
            {cursor === undefined ? null : (
              <motion.circle
                className="cursor-ring"
                r={cursor.at.kind === "pip" ? 9.5 : cursor.glyph === "hub" ? 12.5 : 11.5}
                initial={false}
                animate={{ cx: cursor.at.centre.x, cy: cursor.at.centre.y }}
                transition={instant ? AT_ONCE : QUICK_SPRING}
              />
            )}
          </motion.g>
        )}
      </g>
    </svg>
  );
};
