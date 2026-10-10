import type { FC, ReactNode } from "react";
import { effectsOfKind, type ActorId } from "../../battle";
import { kindOf, skillLabel } from "../../catalog";
import { TASK } from "../../film/task";
import {
  Box,
  Checker,
  Chip,
  CHIP_ROWS,
  chipWidth,
  easeInCubic,
  easeInOutCubic,
  Label,
  labelWidth,
  Orb,
  progress,
  quantize,
  ROW_ROWS,
  useTheme,
} from "../../kit";
import { ENERGY, ON_ENERGY } from "../../theme";
import type { CuePath, CueState, LabelPath, ShotId } from "../../useSceneClock";
import { sealsAlert } from "./Claim";
import { nameSlot, orbSlot } from "./Hud";
import { PLATE } from "./layout";
import { lerpCell, over, PaperChip, paperChipWidth, type EventProps } from "./parts";
import { MOTION } from "./timing";
import { frameCell, GATE, levelOfCondition, REST_CAMERA, sealCenter, type Cell } from "./world";

const TAG_UP = CHIP_ROWS + 1;
const CHIP_UP = TAG_UP + CHIP_ROWS + 2;

export const ActorTag: FC<EventProps> = ({ scene, clock, state, view }) => {
  const member = view.members[state.acting.actor];
  if (member === null || member.alpha < 1 || member.away || view.burst >= 0 || clock.cue("intro.plate").progress < 1) return null;
  const text = scene.props.actors[member.actor];
  const at = over(frameCell(view.camera, member.anchor), chipWidth(text), TAG_UP);
  return <Chip x={Math.max(2, at.x)} y={at.y} text={text} tone="chrome" />;
};

const STRIP = { x: 298, w: 180, h: 9, pad: 2 } as const;
const SWATCH = 4;

export const ConditionStrips: FC<EventProps> = ({ clock, state, view }) => {
  const theme = useTheme();
  const away = view.burst < 0 ? 0 : Math.round(easeInCubic(view.burst / 0.5) * (PLATE.w - STRIP.x));
  if (away >= PLATE.w - STRIP.x) return null;
  return (
    <>
      {state.conditions.map((condition, index) => {
        const current = condition.state;
        if (current.kind === "unrecorded") return null;
        const age = clock.beat - current.since;
        const y = frameCell(REST_CAMERA, sealCenter(levelOfCondition(index))).y - Math.floor(STRIP.h / 2);
        const grown = current.kind === "open" ? quantize(progress(age, 0, MOTION.stripGrow), 6) : 1;
        const hot = current.kind === "failed" && age < 1;
        const fresh = current.kind === "proven" && age < 0.25;
        const tagRight = STRIP.w - STRIP.pad;
        const tagY = (STRIP.h - CHIP_ROWS) / 2;
        const unproven = clock.label("intro.stateUnproven");
        const proven = clock.label("intro.stateProven");
        const failed = clock.label("intro.stateFailed");
        const alert = current.kind === "open" && sealsAlert(clock, state);
        const ink = alert ? theme.chrome : fresh ? ON_ENERGY : theme.onChrome;
        return (
          <Box key={condition.id} x={STRIP.x + away} y={y} w={Math.round(STRIP.w * grown)} h={STRIP.h} fill={alert ? theme.onChrome : hot ? theme.accent : fresh ? ENERGY[2] : theme.chrome} clip>
            <Label x={3} y={0} h={STRIP.h} text={`${index + 1} ${condition.text}`} color={ink} />
            {current.kind === "open" ? (
              <>
                <Checker x={tagRight - labelWidth(unproven) - SWATCH - 2} y={tagY} w={SWATCH} h={CHIP_ROWS - 1} color={ink} />
                <Label x={tagRight - labelWidth(unproven)} y={0} h={STRIP.h} text={unproven} color={ink} />
              </>
            ) : current.kind === "proven" ? (
              <Chip x={tagRight - chipWidth(proven)} y={tagY} text={proven} tone="proven" />
            ) : (
              <Chip x={tagRight - chipWidth(failed)} y={tagY} text={failed} tone="accent" />
            )}
          </Box>
        );
      })}
    </>
  );
};

export const GoalTag: FC<EventProps> = ({ clock, state }) => {
  const theme = useTheme();
  const cue = clock.cue("intro.goal");
  if (cue.since < 0) return null;
  const firstRecord = Math.min(...state.conditions.flatMap((condition) => (condition.state.kind === "unrecorded" ? [] : [condition.state.since])));
  const left = quantize(progress(clock.beat, firstRecord, MOTION.stripGrow / 2), 3);
  const grown = quantize(cue.progress, 6) * (1 - left);
  if (grown <= 0) return null;
  const y = frameCell(REST_CAMERA, sealCenter(1)).y - Math.floor(STRIP.h / 2);
  return (
    <>
      <Chip x={STRIP.x} y={y - CHIP_ROWS} text={clock.label("intro.goal")} tone="accent" />
      <Box x={STRIP.x} y={y} w={Math.round(STRIP.w * grown)} h={STRIP.h} fill={theme.chrome} clip>
        <Label x={3} y={0} h={STRIP.h} text={TASK.goal} color={theme.onChrome} />
      </Box>
    </>
  );
};

const HAND_HOLD = 0.25;

export const HandOffs: FC<EventProps> = ({ clock, view }) => {
  const chip = (cue: CueState, text: string, from: ActorId, to: ActorId): ReactNode => {
    const sender = view.members[from];
    const receiver = view.members[to];
    if (sender === null || receiver === null || cue.since < 0 || cue.since >= cue.span + HAND_HOLD) return null;
    const width = paperChipWidth(text);
    const t = easeInOutCubic(progress(cue.since, cue.span * 0.25, cue.span * 0.75));
    const at = lerpCell(over(frameCell(view.camera, sender.anchor), width, CHIP_UP), over(frameCell(view.camera, receiver.anchor), width, CHIP_UP), t);
    return <PaperChip x={at.x} y={at.y - Math.round(5 * Math.sin(Math.PI * t))} text={text} />;
  };
  return (
    <>
      {chip(clock.cue("how.brief"), clock.label("how.brief"), "mako", "explorer")}
      {chip(clock.cue("how.findings"), clock.label("how.findings"), "explorer", "mako")}
    </>
  );
};

const typed = (text: string, beats: number, framesPerBeat: number): string =>
  text.slice(0, Math.max(0, Math.floor(beats * framesPerBeat) + 1) * 2);

export const Signature: FC<EventProps> = ({ scene, clock }) => {
  const theme = useTheme();
  const cue = clock.cue("architect.signature");
  if (clock.shot !== "architect" || cue.since < 0) return null;
  const { signature } = scene.props;
  const shown = typed(signature, cue.since, clock.framesPerBeat);
  const y = frameCell(REST_CAMERA, sealCenter(0)).y - ROW_ROWS;
  const complete = shown.length >= signature.length;
  return (
    <Box x={STRIP.x} y={y} w={labelWidth(signature) + 6} h={ROW_ROWS * 2 + 2} fill={theme.chrome}>
      <Label x={3} y={1} text={shown} color={theme.onChrome} keepCase />
      {complete ? <Label x={3} y={1 + ROW_ROWS} text={`  ${clock.label("architect.notImplemented")}`} color={theme.mutedOnChrome} keepCase /> : null}
    </Box>
  );
};

const TRIGGER: Cell = { x: 8, y: PLATE.y + 84 };

const TRIGGER_CHIPS = [
  { turn: "build", cue: "build.trigger", label: "build.trigger" },
  { turn: "review", cue: "review.trigger", label: "review.trigger" },
] as const satisfies readonly { readonly turn: ShotId<"battle">; readonly cue: CuePath<"battle">; readonly label: LabelPath<"battle"> }[];

export const Triggers: FC<EventProps> = ({ clock }) => (
  <>
    {TRIGGER_CHIPS.map((trigger) => {
      const cue = clock.cue(trigger.cue);
      return cue.since >= 0 && cue.since < cue.span ? (
        <Chip key={trigger.turn} x={TRIGGER.x} y={TRIGGER.y} text={clock.label(trigger.label)} tone="accent" />
      ) : null;
    })}
  </>
);

const ORB_WAIT = 0.5;
const ORB_FLIGHT = 1;
const ORB_REST = 7;
const ORB_SIZES = [13, 13, 11, 9, ORB_REST] as const;
const ORB_AT: Cell = { x: TRIGGER.x, y: TRIGGER.y + CHIP_ROWS + 2 };

export const OrbFlights: FC<EventProps> = ({ scene, clock }) => (
  <>
    {effectsOfKind(scene, "load").map(({ effect, beat }, ordinal) => {
      const age = clock.beat - beat;
      if (age < -ORB_WAIT - ORB_FLIGHT || age >= 0) return null;
      const loaded = clock.label("intro.loaded");
      const index = TASK.loadout.length + ordinal;
      const t = easeInOutCubic(progress(age, -ORB_FLIGHT, ORB_FLIGHT));
      const size = ORB_SIZES[Math.min(ORB_SIZES.length - 1, Math.floor(t * ORB_SIZES.length))] ?? ORB_REST;
      const lift = Math.round(10 * Math.sin(Math.PI * t));
      const slot = orbSlot(index, loaded);
      const middle = lerpCell(
        { x: ORB_AT.x + Math.floor(ORB_SIZES[0] / 2), y: ORB_AT.y + Math.floor(ORB_SIZES[0] / 2) },
        { x: slot.x + Math.floor(ORB_REST / 2), y: slot.y + Math.floor(ORB_REST / 2) },
        t,
      );
      const name = lerpCell({ x: ORB_AT.x + ORB_SIZES[0] + 2, y: ORB_AT.y + (ORB_SIZES[0] - CHIP_ROWS) / 2 }, nameSlot(index + 1, loaded), t);
      return (
        <Box key={effect.skill} x={0} y={0} w={0} h={0}>
          <Orb x={middle.x - Math.floor(size / 2)} y={middle.y - Math.floor(size / 2) - lift} kind={kindOf(effect.skill)} size={size} />
          <PaperChip x={name.x} y={name.y - lift} text={skillLabel(effect.skill)} />
        </Box>
      );
    })}
  </>
);

const FINDING_AT = frameCell(REST_CAMERA, [-GATE.halfWidth + 0.3, 1.0, GATE.halfDepth]);

export const FindingTag: FC<EventProps> = ({ clock, state }) => {
  if (clock.shot !== "review" || state.finding.kind === "none") return null;
  return state.finding.kind === "open" ? (
    <Chip x={FINDING_AT.x} y={FINDING_AT.y} text={clock.label("review.finding")} tone="accent" />
  ) : (
    <PaperChip x={FINDING_AT.x} y={FINDING_AT.y} text={clock.label("review.fixed")} />
  );
};

const TERMINAL_PAD = 3;

export const Terminal: FC<EventProps> = ({ scene, clock, view }) => {
  const theme = useTheme();
  const cue = clock.cue("verify.terminal");
  const mako = view.members.mako;
  if (clock.shot !== "verify" || cue.since < 0 || mako === null) return null;
  const lines = scene.props.terminal;
  const w = Math.max(...lines.map((line) => labelWidth(line))) + TERMINAL_PAD * 2 + 5;
  const h = lines.length * ROW_ROWS + 2;
  const anchor = frameCell(view.camera, mako.anchor);
  const x = Math.min(anchor.x + 12, frameCell(REST_CAMERA, [-GATE.halfWidth, 0, GATE.halfDepth]).x - 3) - w;
  const y = anchor.y - TAG_UP - 3 - h;
  const active = cue.hits.findLastIndex((age) => age >= 0);
  return (
    <Box x={x} y={y} w={w} h={h} fill={theme.chrome}>
      {lines.map((line, index) => {
        const age = cue.hits[index];
        if (age === undefined || age < 0) return null;
        const shown = typed(line, age, clock.framesPerBeat);
        const caret = index === active && Math.floor(clock.beat * 2) % 2 === 0;
        return (
          <Box key={index} x={TERMINAL_PAD} y={1 + index * ROW_ROWS} w={w - TERMINAL_PAD * 2} h={ROW_ROWS}>
            <Label x={0} y={0} text={shown} color={theme.onChrome} keepCase />
            {caret ? <Box x={labelWidth(shown) + 1} y={1} w={4} h={ROW_ROWS - 2} fill={theme.onChrome} /> : null}
          </Box>
        );
      })}
    </Box>
  );
};
