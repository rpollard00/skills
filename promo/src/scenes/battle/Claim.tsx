import type { FC, ReactNode } from "react";
import type { BattleState } from "../../battle";
import { Box, Checker, Chip, easeInCubic, easeOutCubic, framesSince, GLYPH_HEIGHT, HEADER_ROWS, lerp, PixelText, useTheme } from "../../kit";
import { GRID } from "../../theme";
import type { LabelPath, SceneClock } from "../../useSceneClock";
import { CARD, PLATE } from "./layout";
import { lerpCell, over, PaperChip, paperChipRows, paperChipWidth, type EventProps } from "./parts";
import { frameCell, levelOfCondition, REST_CAMERA, sealCenter, type Cell } from "./world";

const BANNER = { y: CARD.y, h: CARD.h, scale: 5, pad: 16, reach: 0.6 } as const;
const BAR_ROWS = 12;

const CUT = { land: 2, inverted: 2, shear: 2, slide: 6, shearCells: 4 } as const;

const cutFrames = (clock: SceneClock<"battle">, state: BattleState): number | null =>
  state.claim.kind === "rejected" ? framesSince(clock.beat - state.claim.since, clock.framesPerBeat) : null;

export const isInverted = (clock: SceneClock<"battle">, state: BattleState): boolean => {
  const frames = cutFrames(clock, state);
  return frames !== null && frames >= CUT.land && frames < CUT.land + CUT.inverted;
};

export const sealsAlert = (clock: SceneClock<"battle">, state: BattleState): boolean => {
  const frames = cutFrames(clock, state);
  if (frames === null) return false;
  const since = frames - CUT.land - CUT.inverted;
  const blink = clock.framesPerBeat / 4;
  return since >= 0 && since < blink * 4 && Math.floor(since / blink) % 2 === 0;
};

export const proofsHaveBegun = (clock: SceneClock<"battle">): boolean => clock.cue("reject.bounce").since >= 0;

export const Banner: FC<EventProps> = ({ clock, state }) => {
  const theme = useTheme();
  const cue = clock.cue("claim.banner");
  if (state.claim.kind === "none" || cue.since < 0) return null;
  const travel = 0.7 * (1 - (1 - cue.progress) ** 2) + 0.3 * cue.progress;
  const left = GRID.cols - Math.round(BANNER.reach * GRID.cols * travel);
  const text = clock.label("claim.victory");
  const band = (shift: number, clipY: number, clipH: number): ReactNode => (
    <Box x={0} y={BANNER.y + clipY} w={GRID.cols} h={clipH} clip>
      <Box x={left + shift} y={-clipY} w={GRID.cols - left} h={BANNER.h} fill={theme.chrome}>
        <Box x={0} y={0} w={GRID.cols - left} h={1} fill={theme.onChrome} />
        <Box x={0} y={BANNER.h - 1} w={GRID.cols - left} h={1} fill={theme.onChrome} />
        <PixelText x={BANNER.pad} y={(BANNER.h - GLYPH_HEIGHT * BANNER.scale) / 2} text={text} scale={BANNER.scale} color={theme.onChrome} />
      </Box>
    </Box>
  );
  const frames = cutFrames(clock, state);
  if (frames === null || frames < CUT.land) return band(0, 0, BANNER.h);
  const sliding = frames - CUT.land - CUT.shear;
  if (sliding >= CUT.slide) return null;
  const shift = CUT.shearCells + (sliding <= 0 ? 0 : Math.round(easeInCubic(sliding / CUT.slide) * GRID.cols));
  const half = Math.floor(BANNER.h / 2);
  return (
    <>
      {band(shift, 0, half)}
      {band(-shift, half, BANNER.h - half)}
    </>
  );
};

export const CutBar: FC<EventProps> = ({ clock, state }) => {
  const theme = useTheme();
  const frames = cutFrames(clock, state);
  if (frames === null || proofsHaveBegun(clock)) return null;
  const rest = BANNER.y + Math.floor((BANNER.h - BAR_ROWS) / 2);
  const y = frames >= CUT.land ? rest : Math.round(lerp(HEADER_ROWS - BAR_ROWS, rest, (frames + 1) / (CUT.land + 1)));
  return (
    <Box x={0} y={y} w={GRID.cols} h={BAR_ROWS} fill={theme.chrome}>
      <Checker x={0} y={0} w={GRID.cols} h={BAR_ROWS} color={theme.onChrome} />
    </Box>
  );
};

const DONE_PITCH = 7;
const DONE_UP = 20;

export const DoneChip: FC<EventProps> = ({ clock, state, view }) => {
  if (state.claim.kind === "none") return null;
  const frames = cutFrames(clock, state);
  const claimant = view.members[state.claim.actor];
  if (claimant === null || (frames !== null && frames >= CUT.land + CUT.inverted)) return null;
  const text = clock.label("claim.done");
  const at = over(frameCell(view.camera, claimant.anchor), paperChipWidth(text, DONE_PITCH), DONE_UP);
  const fresh = state.claim.kind === "made" && (clock.beat - state.claim.since) * clock.framesPerBeat < 2;
  return <PaperChip x={at.x} y={at.y - (fresh ? 3 : 0)} text={text} pitch={DONE_PITCH} />;
};

const FALSE_PROOFS = ["reject.checkedBoxes", "reject.successfulBuild", "reject.delegateSummary"] as const satisfies readonly LabelPath<"battle">[];
const LIST = { x: 8, y: PLATE.y + 56, pitch: 10 } as const;
const THROW = 0.5;
const BOUNCE_ROWS = 5;
const BITE = 8;

export const FalseProofs: FC<EventProps> = ({ clock, state, view }) => {
  if (clock.shot !== "reject" || state.claim.kind !== "rejected") return null;
  const thrower = view.members[state.claim.actor];
  if (thrower === null) return null;
  const cue = clock.cue("reject.bounce");
  const texts = FALSE_PROOFS.map((path) => clock.label(path));
  const stampX = LIST.x + Math.max(...texts.map((text) => paperChipWidth(text))) + 3;
  const hand = frameCell(view.camera, thrower.anchor);
  return (
    <>
      {texts.map((text, index) => {
        const age = cue.hits[index];
        if (age === undefined || age < -THROW) return null;
        const width = paperChipWidth(text);
        const slot: Cell = { x: LIST.x, y: LIST.y + index * LIST.pitch };
        const seal = frameCell(REST_CAMERA, sealCenter(levelOfCondition(index)));
        const impact: Cell = { x: seal.x + BITE - width, y: seal.y - Math.floor(paperChipRows() / 2) };
        const start = over(hand, width, DONE_UP);
        const bounce = age / cue.span;
        const flying = lerpCell(impact, slot, easeOutCubic(bounce));
        const at: Cell =
          age < 0
            ? lerpCell(start, impact, easeInCubic((age + THROW) / THROW))
            : age < cue.span
              ? { x: flying.x, y: flying.y - Math.round(BOUNCE_ROWS * Math.sin(Math.PI * bounce)) }
              : slot;
        return (
          <Box key={text} x={0} y={0} w={0} h={0}>
            <PaperChip x={at.x} y={at.y} text={text} />
            {age >= cue.span ? <Chip x={stampX} y={slot.y} text={clock.label("reject.notProof")} tone="accent" /> : null}
          </Box>
        );
      })}
    </>
  );
};
