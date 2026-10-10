import { clamp, framesSince, lerp, stepped } from "../../kit/motion";
import { sceneClockAt, type SceneOf } from "../../timeline";

export interface ListState {
  readonly cursor: number | null;
  readonly plate: number | null;
}

export const listAt = (scene: SceneOf<"playbooks">, frame: number, rows: number, selected: number): ListState => {
  const clock = sceneClockAt(scene, frame);
  if (clock.shot === "pick") return { cursor: selected, plate: selected };

  const last = rows - 1;
  const every = Math.max(1, Math.round(scene.props.plateEvery));
  const held = (row: number): number => row - (row % every);
  const back = clock.cue("list.back");
  if (back.since >= 0) {
    const length = framesSince(back.span, clock.framesPerBeat);
    const travel = stepped(framesSince(back.since, clock.framesPerBeat), length + 1);
    return { cursor: Math.round(lerp(last, selected, travel)), plate: travel < 1 ? held(last) : selected };
  }

  const scanned = clock.cue("list.scan").fired;
  const cursor = scanned <= 0 ? null : Math.min(scanned - 1, last);
  return { cursor, plate: cursor === null ? null : held(cursor) };
};

export interface PlateRoll {
  readonly row: number | null;
  readonly under: number | null;
  readonly shown: number;
}

export const plateRollAt = (args: {
  readonly scene: SceneOf<"playbooks">;
  readonly frame: number;
  readonly rows: number;
  readonly selected: number;
  readonly length: number;
}): PlateRoll => {
  const { scene, frame, rows, selected, length } = args;
  const row = listAt(scene, frame, rows, selected).plate;
  for (let age = 0; age < length - 1; age++) {
    const before = frame - age - 1;
    const under = before < 0 ? null : listAt(scene, before, rows, selected).plate;
    if (under !== row) return { row, under, shown: (age + 1) / length };
  }
  return { row, under: null, shown: 1 };
};

export const scrollFor = (args: {
  readonly cursor: number;
  readonly rows: number;
  readonly visible: number;
  readonly anchor: number;
}): number => clamp(args.cursor - args.anchor, 0, Math.max(0, args.rows - args.visible));
