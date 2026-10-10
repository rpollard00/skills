import type { FC } from "react";
import {
  Box,
  Checker,
  CHIP_ROWS,
  chipWidth,
  ChromeHeader,
  EDGE_ROWS,
  framesSince,
  Label,
  MESSAGE,
  MessageWindow,
  OPEN_FRAMES,
  Reveal,
  stepped,
  useTheme,
  Window,
  WINDOW,
  windowBody,
} from "../../kit";
import { GRID } from "../../theme";
import { useSceneClock, type SceneFC } from "../../useSceneClock";
import { NIGHT, nightPoseAt, Well } from "../well";
import { CHOICE, ChoiceRow, flashing, TypedLine } from "../well/parts";

const LINE = { pitch: 8, rows: 14, pad: 12 } as const;
const INPUT = { y: 84, h: WINDOW.border * 2 + WINDOW.title + EDGE_ROWS + 5 + LINE.rows + 7 } as const;
const DIALOG = { w: 104, h: WINDOW.border * 2 + WINDOW.title + EDGE_ROWS + 1 + CHOICE.rows * 2 + 4, inset: 12, overlap: 5 } as const;
const BAR = { y: WINDOW.border + WINDOW.title + EDGE_ROWS + 1 + CHOICE.rows - 4, rows: 8, over: 10 } as const;
const CLOSE_FRAMES = 6;
const EXIT_FRAMES = 3;
const LIFT_FRAMES = 6;

const TagFlash: FC<{ readonly x: number; readonly y: number; readonly text: string }> = ({ x, y, text }) => {
  const theme = useTheme();
  return (
    <Box x={x} y={y} w={chipWidth(text)} h={CHIP_ROWS} fill={theme.onAccent}>
      <Label x={2} y={0} h={CHIP_ROWS} text={text} color={theme.chrome} />
    </Box>
  );
};

export const Goal: SceneFC<"goal"> = ({ scene }) => {
  const clock = useSceneClock(scene);
  const theme = useTheme();
  const { line, charsPerHit } = scene.props;
  const frames = (beats: number): number => framesSince(beats, clock.framesPerBeat);

  const typing = clock.cue("enter.type");
  const shown = Math.min(line.length, typing.fired * charsPerHit);
  const dialog = clock.cue("own.dialog");
  const cut = clock.cue("own.cut");
  const acceptAge = frames(clock.cue("own.accept").since);

  const inputW = LINE.pad * 2 + (line.length + 1) * LINE.pitch + WINDOW.border * 2;
  const inputX = (GRID.cols - inputW) / 2;
  const tag = acceptAge >= 0 ? clock.label("own.accepted") : clock.label("enter.tag");
  const midLine = typing.fired > 0 && shown < line.length;
  const caret = dialog.since < 0 && (midLine || Math.floor(clock.beat * 2) % 2 === 0);

  const wipeFrames = Math.max(1, frames(cut.span));
  const closeAge = frames(cut.since) - wipeFrames;
  const dialogOpen = closeAge >= 0 ? 1 - stepped(closeAge, CLOSE_FRAMES) : stepped(frames(dialog.since), Math.max(1, frames(dialog.span)));
  const dialogX = inputX + inputW - DIALOG.inset - DIALOG.w;
  const dialogY = INPUT.y + INPUT.h - DIALOG.overlap;
  const rowW = windowBody(DIALOG.w, DIALOG.h).w;
  const barW = DIALOG.w + BAR.over * 2;
  const barFrom = Math.round(barW * stepped(closeAge - CLOSE_FRAMES, EXIT_FRAMES));
  const barTo = Math.round(barW * stepped(frames(cut.since), wipeFrames));

  const scrimRows = Math.round((GRID.rows * (1 - stepped(acceptAge, LIFT_FRAMES))) / 2) * 2;

  return (
    <>
      <Well look={NIGHT} pose={nightPoseAt(clock.filmFrame)} time={clock.filmFrame / clock.fps} dimRows={scrimRows} />
      {scrimRows > 0 ? <Checker x={0} y={0} w={GRID.cols} h={scrimRows} color={theme.chrome} /> : null}
      <ChromeHeader edge={false} />

      <Reveal x={inputX} y={INPUT.y} w={inputW} h={INPUT.h} open={stepped(frames(clock.cue("enter.open").since), OPEN_FRAMES)}>
        <Window x={0} y={0} w={inputW} h={INPUT.h} title={clock.label("enter.title")} tag={tag}>
          <TypedLine x={LINE.pad} y={EDGE_ROWS + 5} h={LINE.rows} text={line} shown={shown} pitch={LINE.pitch} caret={caret} />
        </Window>
        {flashing(acceptAge, 2) ? (
          <TagFlash x={inputW - WINDOW.border - 1 - chipWidth(tag)} y={WINDOW.border + (WINDOW.title - CHIP_ROWS) / 2} text={tag} />
        ) : null}
      </Reveal>

      <Reveal x={dialogX} y={dialogY} w={DIALOG.w} h={DIALOG.h} open={dialogOpen} from={closeAge >= 0 ? BAR.y + BAR.rows / 2 : DIALOG.h / 2}>
        <Window x={0} y={0} w={DIALOG.w} h={DIALOG.h} title={clock.label("own.question")}>
          <ChoiceRow x={0} y={EDGE_ROWS + 1} w={rowW} text={clock.label("own.yes")} state="selected" />
          <ChoiceRow x={0} y={EDGE_ROWS + 1 + CHOICE.rows} w={rowW} text={clock.label("own.no")} state="idle" />
        </Window>
      </Reveal>
      {barTo > barFrom ? (
        <Box x={dialogX - BAR.over + barFrom} y={dialogY + BAR.y} w={barTo - barFrom} h={BAR.rows} fill={theme.chrome}>
          <Checker x={0} y={0} w={barTo - barFrom} h={BAR.rows} color={theme.border} />
        </Box>
      ) : null}

      {clock.card === null ? null : (
        <Reveal {...MESSAGE} open={stepped(frames(clock.card.age), OPEN_FRAMES)}>
          <MessageWindow x={0} y={0} card={clock.card} />
        </Reveal>
      )}
    </>
  );
};
