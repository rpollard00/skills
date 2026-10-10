import { TIMELINE } from "../../film";
import { easeInOutCubic, progress } from "../../kit";
import { sceneOf } from "../../timeline";
import { mixPose, type WellPose } from "./view";

const TITLE: WellPose = { position: [0, 5, 34], target: [0, 10, 0], shift: [-92, 0], zoom: 1 };
const GOAL: WellPose = { position: [0, 3.5, 26], target: [0, 10, 0], shift: [0, 0], zoom: 1 };
const DIVE: WellPose = { position: [0, 6.5, 10.5], target: [0, 0.5, 0], shift: [0, 0], zoom: 1 };

/** The height in rows of the end plate that `DAY_POSE` frames. */
export const DAY_PLATE_ROWS = 76;
export const DAY_POSE: WellPose = { position: [0, 3, 46], target: [0, 3, 0], shift: [0, 12], zoom: 0.74 };

const keyBeats = (): { readonly start: number; readonly cut: number; readonly own: number; readonly accept: number; readonly end: number } => {
  const title = sceneOf(TIMELINE, "title");
  const goal = sceneOf(TIMELINE, "goal");
  const own = goal.shots.find((shot) => shot.id === "own");
  const accept = own?.cues.find((cue) => cue.name === "accept");
  if (own === undefined || accept === undefined) throw new Error('The goal scene has no cue "own.accept".');
  return {
    start: title.startBeat,
    cut: goal.startBeat,
    own: goal.startBeat + own.startBeat,
    accept: goal.startBeat + accept.hits[0].beat,
    end: goal.startBeat + goal.beats,
  };
};

export const nightPoseAt = (filmFrame: number): WellPose => {
  const keys = keyBeats();
  const beat = filmFrame / TIMELINE.tempo.framesPerBeat;
  const approach = easeInOutCubic(progress(beat, keys.start, keys.accept - keys.start));
  const center = easeInOutCubic(progress(beat, keys.cut, keys.own - keys.cut));
  const dive = progress(beat, keys.accept, keys.end - keys.accept) ** 2;
  const station: WellPose = { ...mixPose(TITLE, GOAL, approach), shift: [TITLE.shift[0] * (1 - center), 0] };
  return mixPose(station, DIVE, dive);
};
