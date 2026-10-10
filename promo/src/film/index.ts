import { battleAt } from "../battle";
import { defineFilm, sceneOf, type FilmSpec } from "../timeline";
import { VIDEO } from "../video";
import { battle } from "./battle";
import { end } from "./end";
import { equip } from "./equip";
import { goal } from "./goal";
import { playbooks } from "./playbooks";
import { report } from "./report";
import { TASK } from "./task";
import { title } from "./title";

const FILM: FilmSpec = {
  tempo: { fps: VIDEO.fps, framesPerBeat: 12, beatsPerBar: 4 },
  scenes: [title, goal, playbooks, equip, battle, report, end],
};

const resolved = defineFilm(FILM);

export const TIMELINE = resolved.timeline;

export const FILM_PROBLEMS = resolved.problems;

export const FINAL_BATTLE = battleAt({
  task: TASK,
  scene: sceneOf(TIMELINE, "battle"),
  beat: Number.POSITIVE_INFINITY,
});

export { TASK };
