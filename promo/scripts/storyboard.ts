import { FILM_PROBLEMS, TIMELINE } from "../src/film";
import { cardBudget } from "../src/timeline";

const { fps } = TIMELINE.tempo;
const seconds = (frames: number): string => (frames / fps).toFixed(1);

const rows = TIMELINE.scenes.flatMap((scene) =>
  scene.shots.map((shot) => {
    const budget = shot.card === null ? null : cardBudget(shot.card);
    const length = shot.durationFrames / fps;
    return {
      scene: scene.kind,
      shot: shot.id,
      start: seconds(shot.startFrame),
      length: seconds(shot.durationFrames),
      beats: String(shot.beats),
      music: shot.music,
      words: budget === null ? "-" : String(budget.words),
      needs: budget === null ? "-" : budget.neededSeconds.toFixed(1),
      budget: budget === null ? "-" : budget.neededSeconds <= length ? "ok" : "OVER",
      card: shot.card === null ? "(no card)" : shot.card.lines.join(" / "),
      source: shot.card === null ? "-" : shot.card.source.kind === "quote" ? shot.card.source.file : shot.card.source.kind,
    };
  }),
);

const columns = ["scene", "shot", "start", "length", "beats", "music", "words", "needs", "budget", "card", "source"] as const;
const width = (column: (typeof columns)[number]): number => Math.max(column.length, ...rows.map((row) => row[column].length));
const line = (cell: (column: (typeof columns)[number]) => string): string =>
  columns.map((column) => cell(column).padEnd(width(column))).join("  ").trimEnd();

const cards = rows.filter((row) => row.words !== "-");
const over = cards.filter((row) => row.budget === "OVER");

process.stdout.write(
  [
    line((column) => column.toUpperCase()),
    line((column) => "-".repeat(width(column))),
    ...rows.map((row) => line((column) => row[column])),
    "",
    `Start, length, and needs are seconds. A card needs 0.5 s for each word.`,
    `Total: ${TIMELINE.beats} beats, ${TIMELINE.durationFrames} frames, ${seconds(TIMELINE.durationFrames)} s at ${fps} fps. ${TIMELINE.scenes.length} scenes, ${rows.length} shots, ${cards.length} cards.`,
    over.length === 0 ? "Every card is within its budget." : `${over.length} card(s) over budget: ${over.map((row) => `${row.scene}.${row.shot}`).join(", ")}.`,
    FILM_PROBLEMS.length === 0 ? "" : `${FILM_PROBLEMS.length} problem(s). Run: npm run check`,
    "",
  ].join("\n"),
);
