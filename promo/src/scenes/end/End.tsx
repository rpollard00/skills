import type { FC } from "react";
import { ENTRY_POINTS } from "../../catalog";
import {
  Box,
  Display,
  DitherEdge,
  EDGE_ROWS,
  framesSince,
  Label,
  LabelBar,
  MESSAGE_ROWS,
  MessageWindow,
  OPEN_FRAMES,
  Reveal,
  stepped,
  useTheme,
  wordmarkSize,
} from "../../kit";
import { GRID, TYPE } from "../../theme";
import { useSceneClock, type SceneFC } from "../../useSceneClock";
import { DAY, DAY_PLATE_ROWS, DAY_POSE, Well } from "../well";
import { POSTER_SCALE, Stamp, TypedLine } from "../well/parts";

const MARGIN = 24;
const TOP = 106;
const MARK_SCALE = 6;
const MARK = wordmarkSize(MARK_SCALE);
const CARD_COLS = wordmarkSize(POSTER_SCALE).w;
const SIGN = { x: GRID.cols - MARGIN - CARD_COLS, w: CARD_COLS } as const;
const CARD_Y = TOP + MARK.h + 8;
const FOOT = { rows: 36, lineY: 7, line: 18, pitch: 10 } as const;
const LIST = { x: MARGIN, w: SIGN.x - MARGIN * 2, y: TOP + TYPE.headingLineCells + 3, rowRows: 21, pitch: 7, pad: 3, cursor: 4 } as const;

const EntryRow: FC<{ readonly y: number; readonly command: string; readonly harness: string; readonly selected: boolean }> = ({
  y,
  command,
  harness,
  selected,
}) => {
  const theme = useTheme();
  const textX = LIST.pad + LIST.cursor + LIST.pad;
  const line = LIST.rowRows - 1;
  return (
    <>
      <Box x={LIST.x} y={y} w={LIST.w} h={line} {...(selected ? { fill: theme.accent } : {})}>
        {selected ? <Box x={LIST.pad} y={(line - LIST.cursor) / 2} w={LIST.cursor} h={LIST.cursor} fill={theme.onAccent} /> : null}
        <Label x={textX} y={0} h={line} text={command} pitch={LIST.pitch} color={selected ? theme.onAccent : theme.text} bold keepCase />
        <Label x={0} y={0} w={LIST.w - LIST.pad} h={line} align="right" text={harness} color={selected ? theme.onAccent : theme.muted} />
      </Box>
      <Box x={LIST.x} y={y + line} w={LIST.w} h={1} fill={theme.muted} />
    </>
  );
};

export const End: SceneFC<"end"> = ({ scene }) => {
  const clock = useSceneClock(scene);
  const theme = useTheme();
  const { url, charsPerHit } = scene.props;
  const frames = (beats: number): number => framesSince(beats, clock.framesPerBeat);
  const rows = clock.cue("entry.rows").fired;
  const stampAge = frames(clock.cue("entry.stamp").since);
  const cardAge = frames(clock.cue("card.card").since);
  const typing = clock.cue("entry.url");
  const shown = Math.min(url.length, typing.fired * charsPerHit);

  return (
    <>
      <Well look={DAY} pose={DAY_POSE} time={clock.filmFrame / clock.fps} rows={DAY_PLATE_ROWS} />
      <LabelBar
        y={DAY_PLATE_ROWS}
        chip={clock.label("entry.plateId")}
        caption={clock.label("entry.plateName")}
        right={clock.label("entry.plateState")}
        edge="below"
      />

      <Display x={LIST.x} y={TOP} text={clock.label("entry.heading")} size={TYPE.headingPx} h={TYPE.headingLineCells} />
      <Box x={LIST.x} y={LIST.y - 1} w={LIST.w} h={1} fill={theme.text} />
      {ENTRY_POINTS.slice(0, rows).map((entry, index) => (
        <EntryRow
          key={entry.command}
          y={LIST.y + index * LIST.rowRows}
          command={entry.command}
          harness={entry.harness}
          selected={cardAge < 0 && index === rows - 1}
        />
      ))}

      <Stamp x={SIGN.x} anchor="left" middle={TOP + MARK.h / 2} scale={MARK_SCALE} age={stampAge} />
      {clock.card === null ? null : (
        <Reveal x={SIGN.x} y={CARD_Y} w={SIGN.w} h={MESSAGE_ROWS} open={stepped(clock.shot === "entry" ? stampAge : cardAge, OPEN_FRAMES)}>
          <MessageWindow x={0} y={0} w={SIGN.w} card={clock.card} />
        </Reveal>
      )}

      <DitherEdge x={0} y={GRID.rows - FOOT.rows - EDGE_ROWS} w={GRID.cols} color={theme.chrome} toward="up" />
      <Box x={0} y={GRID.rows - FOOT.rows} w={GRID.cols} h={FOOT.rows} fill={theme.chrome}>
        <TypedLine
          x={(GRID.cols - url.length * FOOT.pitch) / 2}
          y={FOOT.lineY}
          h={FOOT.line}
          text={url}
          shown={shown}
          pitch={FOOT.pitch}
          caret={typing.fired > 0 && shown < url.length}
          color={theme.onChrome}
          bold
        />
      </Box>
    </>
  );
};
