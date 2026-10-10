import type { FC } from "react";
import { CATALOG, kindOf } from "../../catalog";
import { FINAL_BATTLE, TASK, TIMELINE } from "../../film";
import { ChromeHeader, clamp01, framesSince, fullOnLastFrame, MessageWindow } from "../../kit";
import { sceneOf } from "../../timeline";
import { useSceneClock, type SceneClock, type SceneFC, type SceneOf } from "../../useSceneClock";
import { Ascent } from "./Ascent";
import { CARD, COLUMN, ROW } from "./layout";
import { Loaded } from "./Loaded";
import { Sheet, sheetRowHeight, StateChips, type SheetRow } from "./Sheet";
import { Stamp, stampSize } from "./Stamp";

type Clock = SceneClock<"report">;

const DELIVERY_STATES = ["local", "published", "merged"] as const;

const VERIFY_COMMANDS = sceneOf(TIMELINE, "battle").props.terminal;

const AscentShot: FC<{ readonly clock: Clock }> = ({ clock }) => {
  const rise = clock.cue("ascent.rise");
  const cover = clock.cue("ascent.cover");
  const lead = rise.since - cover.since;
  const covered = clamp01(fullOnLastFrame(cover.since * clock.framesPerBeat, cover.span * clock.framesPerBeat));
  return (
    <Ascent
      frames={rise.since * clock.framesPerBeat}
      totalFrames={rise.span * clock.framesPerBeat}
      open={clock.cue("ascent.open").progress}
      approach={rise.since / lead}
      cover={covered}
    />
  );
};

const PageShots: FC<{ readonly scene: SceneOf<"report">; readonly clock: Clock }> = ({ scene, clock }) => {
  const toFrames = (beats: number): number => framesSince(beats, clock.framesPerBeat);
  const arrivals = clock.cue("sheet.rows").hits.map(toFrames);
  const chipAges = clock.cue("sheet.chips").hits;
  const age = (index: number): number => arrivals[index] ?? -1;

  const result: SheetRow = { label: clock.label("sheet.result"), value: TASK.report.result, age: age(0) };
  const rows: readonly SheetRow[] = [
    result,
    {
      label: clock.label("sheet.verification"),
      value: `${FINAL_BATTLE.proven}/${FINAL_BATTLE.recorded} ${clock.label("sheet.conditionsProven")}`,
      detail: VERIFY_COMMANDS,
      age: age(1),
    },
    { label: clock.label("sheet.risks"), value: TASK.report.risk, age: age(2) },
    {
      label: clock.label("sheet.delivery"),
      value: TASK.report.delivery,
      age: age(3),
      aside: (
        <StateChips
          chips={DELIVERY_STATES.map((state, index) => ({
            text: clock.label(`sheet.${state}`),
            set: state === scene.props.delivered,
            shown: (chipAges[index] ?? -1) >= 0,
          }))}
        />
      ),
    },
  ];

  const landings = clock.cue("stamp.count").hits.map(toFrames);
  const lastLanding = landings.at(-1) ?? -1;
  const verified = clock.label("stamp.verified");
  const stamp = stampSize(verified);

  return (
    <>
      <ChromeHeader label={clock.label("sheet.page")} />
      <Sheet
        kicker={`${TASK.entry} ${TASK.goal}`}
        heading={clock.label("sheet.heading")}
        rule={clock.cue("sheet.rule").progress}
        rows={rows}
      />
      {clock.card === null ? null : <MessageWindow x={CARD.x} y={CARD.y} card={clock.card} />}
      {clock.cue("stamp.line").since < 0 ? null : (
        <Loaded
          label={clock.label("stamp.loaded")}
          tag={clock.label("stamp.tag")}
          orbs={FINAL_BATTLE.loaded.map((entry, index) => ({
            kind: kindOf(entry.skill),
            age: landings[index] ?? lastLanding,
          }))}
          total={CATALOG.counts.skills}
        />
      )}
      <Stamp
        centerX={COLUMN.x + COLUMN.w - stamp.w / 2}
        centerY={ROW.y + sheetRowHeight(result)}
        text={verified}
        age={toFrames(clock.cue("stamp.stamp").since)}
      />
    </>
  );
};

export const Report: SceneFC<"report"> = ({ scene }) => {
  const clock = useSceneClock(scene);
  return clock.shot === "ascent" ? <AscentShot clock={clock} /> : <PageShots scene={scene} clock={clock} />;
};
