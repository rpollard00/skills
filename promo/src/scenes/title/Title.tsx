import type { FC } from "react";
import {
  Box,
  Chip,
  CHIP_ROWS,
  chipWidth,
  DitherEdge,
  easeInOutCubic,
  EDGE_ROWS,
  framesSince,
  Label,
  LABEL_BAR_ROWS,
  LabelBar,
  MessageWindow,
  MESSAGE_ROWS,
  OPEN_FRAMES,
  Reveal,
  stepped,
  useTheme,
  wordmarkSize,
} from "../../kit";
import { GRID } from "../../theme";
import { useSceneClock, type SceneFC } from "../../useSceneClock";
import { NIGHT, nightPoseAt, Well, wellView } from "../well";
import { CHOICE, ChoiceRow, choiceWidth, flashing, POSTER_SCALE, Stamp } from "../well/parts";

const MARGIN = 24;
const MARK = wordmarkSize(POSTER_SCALE);
const BLOCK = { x: GRID.cols - MARGIN - MARK.w, right: GRID.cols - MARGIN } as const;
const KICKER = { y: 38, rows: 9, gap: 5 } as const;
const MARK_Y = KICKER.y + KICKER.rows + 4;
const CARD_Y = MARK_Y + MARK.h + 9;
const MENU = { y: CARD_Y + MESSAGE_ROWS + 10, pad: 2 } as const;

const BandOpen: FC<{ readonly row: number; readonly open: number }> = ({ row, open }) => {
  const theme = useTheme();
  const top = row - Math.round(open * (row + EDGE_ROWS));
  const bottom = row + Math.round(open * (GRID.rows - row + EDGE_ROWS));
  return (
    <>
      {top > 0 ? <Box x={0} y={0} w={GRID.cols} h={top} fill={theme.chrome} /> : null}
      {top > -EDGE_ROWS ? <DitherEdge x={0} y={top} w={GRID.cols} color={theme.chrome} toward="down" /> : null}
      {bottom < GRID.rows + EDGE_ROWS ? <DitherEdge x={0} y={bottom - EDGE_ROWS} w={GRID.cols} color={theme.chrome} toward="up" /> : null}
      {bottom < GRID.rows ? <Box x={0} y={bottom} w={GRID.cols} h={GRID.rows - bottom} fill={theme.chrome} /> : null}
    </>
  );
};

export const Title: SceneFC<"title"> = ({ scene }) => {
  const clock = useSceneClock(scene);
  const theme = useTheme();
  const pose = nightPoseAt(clock.filmFrame);
  const horizon = wellView(pose, GRID).horizonRow;
  const open = clock.cue("boot.open").progress;
  const frames = (beats: number): number => framesSince(beats, clock.framesPerBeat);
  const stampAge = frames(clock.cue("mark.stamp").since);
  const cardAge = frames(clock.cue("mark.card").since);
  const menuAge = frames(clock.cue("mark.menu").since);
  const confirmAge = frames(clock.cue("mark.confirm").since);

  const kind = clock.label("mark.kind");
  const newGame = clock.label("mark.newGame");
  const next = clock.label("mark.continue");
  const rowW = choiceWidth([newGame, next]);
  const menuW = rowW + MENU.pad * 2 + 2;
  const menuH = CHOICE.rows * 2 + MENU.pad * 2 + 2;

  return (
    <>
      <Well look={NIGHT} pose={pose} time={clock.filmFrame / clock.fps} />
      {open < 1 ? <BandOpen row={horizon} open={easeInOutCubic(open)} /> : null}
      <LabelBar
        y={GRID.rows - LABEL_BAR_ROWS}
        chip={clock.label("boot.plateId")}
        caption={clock.label("boot.plateName")}
        right={clock.label("boot.plateState")}
      />

      {stampAge >= 2 ? (
        <Box x={BLOCK.x} y={KICKER.y} w={MARK.w} h={KICKER.rows} fill={theme.chrome}>
          <Chip x={0} y={(KICKER.rows - CHIP_ROWS) / 2} text={kind} />
          <Label x={chipWidth(kind) + KICKER.gap} y={0} h={KICKER.rows} text={clock.label("mark.role")} color={theme.accentText} />
        </Box>
      ) : null}
      <Stamp x={BLOCK.right} anchor="right" middle={MARK_Y + MARK.h / 2} scale={POSTER_SCALE} age={stampAge} />

      {clock.card === null ? null : (
        <Reveal x={BLOCK.x} y={CARD_Y} w={MARK.w} h={MESSAGE_ROWS} open={stepped(cardAge, OPEN_FRAMES)}>
          <MessageWindow x={0} y={0} w={MARK.w} card={clock.card} />
        </Reveal>
      )}

      <Reveal x={BLOCK.right - menuW} y={MENU.y} w={menuW} h={menuH} open={stepped(menuAge, OPEN_FRAMES)}>
        <Box x={0} y={0} w={menuW} h={menuH} fill={theme.border}>
          <Box x={1} y={1} w={menuW - 2} h={menuH - 2} fill={theme.window}>
            <ChoiceRow x={MENU.pad} y={MENU.pad} w={rowW} text={newGame} state={flashing(confirmAge, 2) ? "flash" : "selected"} />
            <ChoiceRow x={MENU.pad} y={MENU.pad + CHOICE.rows} w={rowW} text={next} state="idle" />
          </Box>
        </Box>
      </Reveal>
    </>
  );
};
