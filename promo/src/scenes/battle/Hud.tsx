import type { FC } from "react";
import { ACTOR_IDS, type BattleState } from "../../battle";
import { CATALOG, kindOf, playbookLabel, skillLabel } from "../../catalog";
import { TASK } from "../../film/task";
import {
  Box,
  Chip,
  CHIP_ROWS,
  chipWidth,
  EDGE_ROWS,
  Gauge,
  Label,
  LabelBar,
  labelWidth,
  Orb,
  Row,
  ROW_ROWS,
  useTheme,
  Window,
  WINDOW,
  windowBody,
} from "../../kit";
import { GRID } from "../../theme";
import type { SceneClock, SceneOf } from "../../useSceneClock";
import { BAR, COMMANDS, PARTY } from "./layout";
import { PaperChip, paperChipRows } from "./parts";

const PAD = 4;
const ORB = 7;
const ORB_PITCH = ORB + 2;
const NAME_HOLD = 6;

const LOADED_X = 100;

export const orbSlot = (index: number, loadedLabel: string): { readonly x: number; readonly y: number } => ({
  x: LOADED_X + labelWidth(`${loadedLabel} 0/${CATALOG.counts.skills} `) + index * ORB_PITCH,
  y: BAR.y + (BAR.h - ORB) / 2,
});

export const nameSlot = (count: number, loadedLabel: string): { readonly x: number; readonly y: number } => ({
  x: orbSlot(count, loadedLabel).x + PAD,
  y: BAR.y + (BAR.h - paperChipRows()) / 2,
});

interface HudProps {
  readonly scene: SceneOf<"battle">;
  readonly clock: SceneClock<"battle">;
  readonly state: BattleState;
}

export const PlateBar: FC<HudProps> = ({ clock, state }) => {
  const theme = useTheme();
  const loaded = clock.label("intro.loaded");
  const proven = clock.label("intro.proven");
  const shown = clock.cue("intro.plate").progress >= 1;
  const count = `${state.loaded.length}/${CATALOG.counts.skills}`;
  const latest = state.loaded.findLast((entry) => entry.since > 0 && clock.beat - entry.since < NAME_HOLD);
  const provenText = `${proven} ${state.proven}/${state.recorded}`;
  const name = nameSlot(state.loaded.length, loaded);
  return (
    <>
      <LabelBar y={BAR.y} chip={clock.label("intro.plateId")} caption={playbookLabel(TASK.playbook)} />
      {shown ? (
        <>
          <Label x={LOADED_X} y={BAR.y} h={BAR.h} text={loaded} color={theme.mutedOnChrome} />
          <Label x={LOADED_X + labelWidth(`${loaded} `)} y={BAR.y} h={BAR.h} text={count} color={theme.onChrome} />
          {state.loaded.map((entry, index) => {
            const slot = orbSlot(index, loaded);
            const landed = entry.since > 0 && (clock.beat - entry.since) * clock.framesPerBeat < 2;
            const size = landed ? ORB + 2 : ORB;
            return <Orb key={entry.skill} x={slot.x - (size - ORB) / 2} y={slot.y - (size - ORB) / 2} kind={kindOf(entry.skill)} size={size} />;
          })}
          {latest === undefined ? null : <PaperChip x={name.x} y={name.y} text={skillLabel(latest.skill)} />}
        </>
      ) : null}
      {state.recorded === 0 ? null : state.gate.kind === "open" ? (
        <Chip x={GRID.cols - PAD - chipWidth(provenText)} y={BAR.y + (BAR.h - CHIP_ROWS) / 2} text={provenText} tone="proven" />
      ) : (
        <>
          <Label x={0} y={BAR.y} h={BAR.h} w={GRID.cols - PAD - labelWidth(` ${state.proven}/${state.recorded}`)} align="right" text={proven} color={theme.mutedOnChrome} />
          <Label x={0} y={BAR.y} h={BAR.h} w={GRID.cols - PAD} align="right" text={`${state.proven}/${state.recorded}`} color={theme.onChrome} />
        </>
      )}
    </>
  );
};

const TITLE_ROWS = WINDOW.border * 2 + WINDOW.title;

const openHeight = (full: number, opened: number): number => {
  if (opened <= 0) return 0;
  const steps = Math.ceil((full - TITLE_ROWS) / ROW_ROWS);
  const step = Math.min(steps, Math.floor(opened * (steps + 1)));
  return Math.min(full, TITLE_ROWS + step * ROW_ROWS);
};

const COMMAND_TOP = EDGE_ROWS + 1;
const COMMAND_COLUMNS = 2;
const COLUMN_GAP = 5;

export const CommandWindow: FC<HudProps> = ({ scene, clock, state }) => {
  const windows = clock.cue("intro.windows");
  const h = openHeight(COMMANDS.h, windows.since < 0 ? 0 : Math.min(1, (windows.progress * 3) / 2));
  if (h === 0) return null;
  const body = windowBody(COMMANDS.w, COMMANDS.h);
  const listed = clock.cue("intro.steps").fired;
  const perColumn = Math.ceil(scene.props.commands.length / COMMAND_COLUMNS);
  const columnW = Math.floor(body.w / COMMAND_COLUMNS);
  return (
    <Window x={COMMANDS.x} y={COMMANDS.y} w={COMMANDS.w} h={h} title={playbookLabel(TASK.playbook)} tag={clock.label("intro.auto")}>
      {scene.props.commands.slice(0, listed).map((command, index) => {
        const selected = state.cursor === command.id;
        const done = state.done.includes(command.id);
        return (
          <Row
            key={command.id}
            x={Math.floor(index / perColumn) * columnW}
            y={COMMAND_TOP + (index % perColumn) * ROW_ROWS}
            w={columnW - COLUMN_GAP}
            label={command.label}
            selected={selected}
            done={done}
            dim={done && !selected}
          />
        );
      })}
    </Window>
  );
};

const NAME_X = 10;
const MARK = 4;
const GAUGE_X = NAME_X + labelWidth("IMPLEMENTER ");
const MEMBER_TOP = EDGE_ROWS + 1;
const WORK_W = 78;

export const PartyWindow: FC<HudProps> = ({ scene, clock, state }) => {
  const theme = useTheme();
  const windows = clock.cue("intro.windows");
  const h = openHeight(PARTY.h, windows.since < 0 ? 0 : Math.max(0, (windows.progress * 3 - 1) / 2));
  if (h === 0) return null;
  const body = windowBody(PARTY.w, PARTY.h);
  const gaugeW = body.w - GAUGE_X - PAD - 2;
  const goalY = MEMBER_TOP + ACTOR_IDS.length * ROW_ROWS + 2;
  const work = clock.label("intro.work");
  const workX = body.w - PAD - 2 - WORK_W;
  const goal = clock.label("intro.goal");
  return (
    <>
      <Window x={PARTY.x} y={PARTY.y} w={PARTY.w} h={h} title={clock.label("intro.party")}>
        {ACTOR_IDS.map((actor, index) => {
          const member = state.party[actor];
          if (member.kind === "absent") return null;
          const y = MEMBER_TOP + index * ROW_ROWS;
          const acting = state.acting.actor === actor;
          return (
            <Box key={actor} x={0} y={y} w={body.w} h={ROW_ROWS}>
              {acting ? <Box x={3} y={(ROW_ROWS - MARK) / 2} w={MARK} h={MARK} fill={theme.pixel} /> : null}
              <Label x={NAME_X} y={0} h={ROW_ROWS} text={scene.props.actors[actor]} color={acting ? theme.text : theme.muted} bold={acting} />
              <Gauge x={GAUGE_X} y={(ROW_ROWS - 4) / 2} w={gaugeW} value={member.context} />
            </Box>
          );
        })}
        {state.recorded === 0 ? null : (
          <>
            <Box x={PAD} y={goalY - 2} w={body.w - PAD * 2} h={1} fill={theme.muted} />
            <Label x={NAME_X} y={goalY} h={ROW_ROWS} text={goal} color={theme.muted} />
            <Label x={NAME_X + labelWidth(`${goal} `)} y={goalY} h={ROW_ROWS} text={TASK.goal} />
            <Label x={workX - labelWidth(`${work} `)} y={goalY} h={ROW_ROWS} text={work} color={theme.muted} />
            <Gauge x={workX} y={goalY + (ROW_ROWS - 4) / 2} w={WORK_W} value={state.work} />
          </>
        )}
      </Window>
      {h < TITLE_ROWS ? null : (
        <Label
          x={PARTY.x + WINDOW.border + GAUGE_X}
          y={PARTY.y + WINDOW.border}
          h={WINDOW.title}
          text={clock.label("intro.context")}
          color={theme.mutedOnChrome}
        />
      )}
    </>
  );
};
