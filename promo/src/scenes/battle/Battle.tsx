import type { FC, ReactNode } from "react";
import { battleAt } from "../../battle";
import { TASK } from "../../film/task";
import { Box, cells, ChromeHeader, Cover, DitherEdge, easeOutCubic, EDGE_ROWS, MessageWindow, stepped, useTheme } from "../../kit";
import { GRID } from "../../theme";
import { useSceneClock, type SceneFC } from "../../useSceneClock";
import { Banner, CutBar, DoneChip, FalseProofs, isInverted, proofsHaveBegun } from "./Claim";
import { ActorTag, ConditionStrips, FindingTag, GoalTag, HandOffs, OrbFlights, Signature, Terminal, Triggers } from "./Events";
import { CommandWindow, PartyWindow, PlateBar } from "./Hud";
import { BAR, CARD, PLATE } from "./layout";
import { Stamp, STAMP_SETTLE } from "./Open";
import { Stage } from "./stage/Stage";
import { stageView } from "./stage/view";

const PlateShutter: FC<{ readonly opened: number }> = ({ opened }) => {
  const theme = useTheme();
  const half = PLATE.h / 2;
  const closed = half - Math.round(easeOutCubic(opened) * half);
  if (closed <= 0) return null;
  const lower = PLATE.y + PLATE.h - closed;
  const edge = Math.min(EDGE_ROWS, half - closed);
  return (
    <>
      <Box x={PLATE.x} y={PLATE.y} w={PLATE.w} h={closed} fill={theme.chrome} />
      <Box x={PLATE.x} y={lower} w={PLATE.w} h={closed} fill={theme.chrome} />
      {edge > 0 ? (
        <>
          <DitherEdge x={PLATE.x} y={PLATE.y + closed} w={PLATE.w} color={theme.chrome} toward="down" rows={edge} />
          <DitherEdge x={PLATE.x} y={lower - edge} w={PLATE.w} color={theme.chrome} toward="up" rows={edge} />
        </>
      ) : null}
    </>
  );
};

const Negative: FC<{ readonly on: boolean; readonly children: ReactNode }> = ({ on, children }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: cells(GRID.cols),
      height: cells(GRID.rows),
      ...(on ? { filter: "invert(1)" } : {}),
    }}
  >
    {children}
  </div>
);

export const Battle: SceneFC<"battle"> = ({ scene }) => {
  const clock = useSceneClock(scene);
  const theme = useTheme();
  const state = battleAt({ task: TASK, scene, beat: clock.beat });
  const view = stageView({ scene, clock, state });
  const plate = clock.cue("intro.plate");
  const hud = { scene, clock, state };
  const events = { ...hud, view };
  const exit = scene.exit.kind === "cover" ? scene.exit : null;

  const cardShows =
    plate.progress >= 1 &&
    (clock.shot !== "reject" || proofsHaveBegun(clock)) &&
    (clock.shot !== "open" || clock.cue("open.stamp").since >= STAMP_SETTLE);

  return (
    <>
      <Negative on={isInverted(clock, state)}>
        <Stage view={view} />
        <PlateShutter opened={plate.progress} />
        <GoalTag {...events} />
        <ConditionStrips {...events} />
        <Signature {...events} />
        <FindingTag {...events} />
        <ActorTag {...events} />
        <Terminal {...events} />
        <Triggers {...events} />
        <HandOffs {...events} />
        <DoneChip {...events} />
        <FalseProofs {...events} />
        <Stamp {...events} />
        <Box x={0} y={BAR.y} w={GRID.cols} h={GRID.rows - BAR.y} fill={theme.chrome} />
        <PlateBar {...hud} />
        <CommandWindow {...hud} />
        <PartyWindow {...hud} />
        <OrbFlights {...events} />
        {clock.card !== null && cardShows ? <MessageWindow x={CARD.x} y={CARD.y} card={clock.card} /> : null}
        <Banner {...events} />
        <CutBar {...events} />
        <ChromeHeader edge={false} />
      </Negative>
      {exit === null ? null : (
        <Cover color={exit.color} from={exit.from} progress={stepped(clock.frame - (scene.durationFrames - exit.frames), exit.frames)} />
      )}
    </>
  );
};
