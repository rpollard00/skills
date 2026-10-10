import type { FC } from "react";
import { CATALOG, playbookLabel } from "../../catalog";
import {
  Box,
  ChromeHeader,
  clamp,
  clamp01,
  DitherField,
  EDGE_ROWS,
  framesSince,
  GLYPH_HEIGHT,
  Label,
  LABEL_BAR_ROWS,
  LabelBar,
  labelWidth,
  Menu,
  MESSAGE,
  paneBody,
  PixelText,
  pixelTextWidth,
  type Rect,
  Row,
  ROW_CURSOR,
  ROW_ROWS,
  ThemeScope,
  useTheme,
  WINDOW,
} from "../../kit";
import { THEMES } from "../../theme";
import { useSceneClock, type SceneFC } from "../../useSceneClock";
import { listAt, plateRollAt, scrollFor } from "./list";
import { plateArt, PlaybookPlate, plateSize } from "./PlaybookPlate";

const GROUP = { y: 40, h: 149, gap: 6 } as const;

const LIST = { y: EDGE_ROWS + 2, visible: 10, anchor: 4 } as const;
const LIST_ROWS = LIST.visible * ROW_ROWS;
const SCROLL = { gap: 2, w: 2 } as const;
const READOUT = { x: 8, scale: 4 } as const;

const FLASHES = 2;
const SWEEP = { band: 24, spread: 0.5 } as const;

const ROLL_FRAMES = 2;

const DETAIL = { gap: 6, x: 4 } as const;
const CARET = { w: 4, h: 7 } as const;

const pad2 = (value: number): string => String(value).padStart(2, "0");

interface ListRowProps {
  readonly y: number;
  readonly w: number;
  readonly index: string;
  readonly label: string;
  readonly front: number;
}

const ListRow: FC<ListRowProps> = ({ y, w, index, label, front }) => {
  const theme = useTheme();
  if (front <= 0) return <Row x={0} y={y} w={w} index={index} label={label} />;
  if (front >= w + SWEEP.band) return <Row x={0} y={y} w={w} index={index} label={label} dim />;
  const edge = clamp(front, 0, w);
  return (
    <Box x={0} y={y} w={w} h={ROW_ROWS} clip>
      <Box x={0} y={0} w={edge} h={ROW_ROWS} clip>
        <Row x={0} y={0} w={w} index={index} label={label} dim />
      </Box>
      <Box x={edge} y={0} w={w - edge} h={ROW_ROWS} clip>
        <Row x={-edge} y={0} w={w} index={index} label={label} />
      </Box>
      <DitherField
        x={front - SWEEP.band}
        y={0}
        w={SWEEP.band}
        h={ROW_ROWS}
        color={theme.window}
        level={(cx) => (cx + 0.5) / SWEEP.band}
      />
    </Box>
  );
};

export const Playbooks: SceneFC<"playbooks"> = ({ scene }) => {
  const clock = useSceneClock(scene);
  const theme = useTheme();
  const names = CATALOG.playbooks;
  const frames = (beats: number): number => framesSince(beats, clock.framesPerBeat);

  const full = plateSize(scene.props.plateScale.pick);
  const rightW = full.w + WINDOW.border * 2;
  const left: Rect = { x: MESSAGE.x, y: GROUP.y, w: MESSAGE.w - GROUP.gap - rightW, h: GROUP.h };
  const right: Rect = { x: left.x + left.w + GROUP.gap, y: GROUP.y, w: rightW, h: GROUP.h };
  const listBody = paneBody(left);
  const body = paneBody(right);
  const rowW = listBody.w - SCROLL.gap * 2 - SCROLL.w;
  const readoutY = LIST.y + LIST_ROWS + Math.floor((listBody.h - LIST.y - LIST_ROWS - GLYPH_HEIGHT * READOUT.scale) / 2);

  const back = clock.cue("list.back");
  const lock = clock.cue("pick.lock");
  const picked = clock.shot === "pick";
  const selected = names.indexOf(scene.props.selected);

  const { cursor } = listAt(scene, clock.frame, names.length, selected);
  const roll = plateRollAt({
    scene,
    frame: clock.frame,
    rows: names.length,
    selected,
    length: ROLL_FRAMES,
  });
  const scroll = scrollFor({ cursor: cursor ?? 0, rows: names.length, visible: LIST.visible, anchor: LIST.anchor });
  const maxScroll = Math.max(0, names.length - LIST.visible);

  const flash = lock.since >= 0 && lock.since < lock.span && Math.floor((lock.since / lock.span) * FLASHES * 2) % 2 === 0;
  const pulse = clock.cue("pick.pulse");
  const squareOff = picked
    ? pulse.hits.some((since) => since >= 0 && since < pulse.span)
    : back.since >= back.span && Math.floor(back.since * 2) % 2 === 1;

  const sweep = clock.cue("pick.dim").progress;
  const frontOf = (line: number): number => {
    const local = clamp01(sweep * (1 + SWEEP.spread) - (SWEEP.spread * line) / Math.max(1, LIST.visible - 1));
    return Math.round(local * (rowW + SWEEP.band));
  };

  const thumb = Math.max(ROW_ROWS, Math.round((LIST_ROWS * LIST.visible) / Math.max(LIST.visible, names.length)));
  const thumbY = maxScroll === 0 ? 0 : Math.round(((LIST_ROWS - thumb) * scroll) / maxScroll);

  const total = String(names.length);
  const position = cursor === null ? "-".repeat(total.length) : String(cursor + 1).padStart(total.length, "0");

  const grown = clock.cue("pick.grow").since >= 0;
  const screenPx = grown ? scene.props.plateScale.pick : scene.props.plateScale.list;
  const size = plateSize(screenPx);
  const plateX = Math.round((body.w - size.w) / 2);
  const stack = full.h + LABEL_BAR_ROWS + DETAIL.gap + ROW_ROWS;
  const barY = EDGE_ROWS + Math.round((body.h - EDGE_ROWS - stack) / 2) + full.h;
  const plateY = barY - size.h;
  const rolled = Math.round(size.h * roll.shown);
  const shown = roll.row === null ? undefined : names[roll.row];
  const under = roll.under === null ? undefined : names[roll.under];

  const detailCue = clock.cue("pick.detail");
  const typed = scene.props.detail.slice(0, detailCue.fired * scene.props.detailStep);
  const typing = detailCue.fired > 0 && typed.length < scene.props.detail.length;
  const detailY = barY + LABEL_BAR_ROWS + DETAIL.gap;

  return (
    <>
      <ChromeHeader />
      <Menu
        age={frames(clock.cue("list.open").since)}
        card={clock.card}
        cardAge={clock.card === null ? 0 : frames(clock.card.age)}
        left={{
          rect: left,
          title: clock.label("list.title"),
          children: (
            <>
              {Array.from({ length: LIST.visible }, (_, line) => {
                const row = scroll + line;
                const name = names[row];
                if (name === undefined) return null;
                const y = LIST.y + line * ROW_ROWS;
                if (row !== cursor) {
                  return (
                    <ListRow key={name} y={y} w={rowW} index={pad2(row + 1)} label={playbookLabel(name)} front={picked ? frontOf(line) : 0} />
                  );
                }
                return (
                  <Box key={name} x={0} y={y} w={rowW} h={ROW_ROWS}>
                    {flash ? (
                      <Box x={0} y={0} w={rowW} h={ROW_ROWS} fill={THEMES.paper.page}>
                        <ThemeScope theme="paper">
                          <Row x={0} y={0} w={rowW} index={pad2(row + 1)} label={playbookLabel(name)} />
                        </ThemeScope>
                      </Box>
                    ) : (
                      <Row x={0} y={0} w={rowW} index={pad2(row + 1)} label={playbookLabel(name)} selected />
                    )}
                    {squareOff ? (
                      <Box x={ROW_CURSOR.x} y={ROW_CURSOR.y} w={ROW_CURSOR.size} h={ROW_CURSOR.size} fill={theme.accent} />
                    ) : null}
                  </Box>
                );
              })}
              <Box x={rowW + SCROLL.gap} y={LIST.y} w={SCROLL.w} h={LIST_ROWS} fill={theme.chrome}>
                <Box x={0} y={thumbY} w={SCROLL.w} h={thumb} fill={theme.muted} />
              </Box>
              <PixelText x={READOUT.x} y={readoutY} text={position} scale={READOUT.scale} color={theme.muted} />
              <PixelText
                x={READOUT.x + pixelTextWidth(position, READOUT.scale) + READOUT.scale}
                y={readoutY}
                text={`/${total}`}
                scale={READOUT.scale}
              />
            </>
          ),
        }}
        right={{
          rect: right,
          title: clock.label("list.detailTitle"),
          children:
            roll.row === null || shown === undefined ? null : (
              <>
                {under === undefined ? null : <PlaybookPlate x={plateX} y={plateY} slug={under} screenPx={screenPx} />}
                <Box x={plateX} y={barY - rolled} w={size.w} h={rolled} clip>
                  <PlaybookPlate x={0} y={rolled - size.h} slug={shown} screenPx={screenPx} />
                </Box>
                <LabelBar
                  x={plateX}
                  y={barY}
                  w={size.w}
                  chip={`${clock.label("list.plate")} ${pad2(roll.row + 1)}`}
                  caption={playbookLabel(shown)}
                  {...(grown ? { right: plateArt(shown).sky } : {})}
                />
                {typed === "" ? null : <Label x={plateX + DETAIL.x} y={detailY} text={typed} />}
                {typing ? (
                  <Box x={plateX + DETAIL.x + labelWidth(typed) + 1} y={detailY + 1} w={CARET.w} h={CARET.h} fill={theme.text} />
                ) : null}
              </>
            ),
        }}
      />
    </>
  );
};
