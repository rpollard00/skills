import "../fonts";
import type { FC } from "react";
import { Composition, registerRoot, useCurrentFrame } from "remotion";
import { SKILL_KINDS } from "../catalog";
import { TIMELINE } from "../film";
import {
  Box,
  Checker,
  Chip,
  chipWidth,
  ChromeHeader,
  DitherField,
  EDGE_ROWS,
  Frame,
  Gauge,
  LABEL_BAR_ROWS,
  Label,
  LabelBar,
  MessageWindow,
  Orb,
  PIXEL_CHARS,
  PixelText,
  Row,
  ROW_ROWS,
  useTheme,
  useThemeName,
  Window,
  windowBody,
  Wordmark,
} from "../kit";
import { ENERGY, GRID, THEME_NAMES, TYPE } from "../theme";
import { sceneOf } from "../timeline";
import { VIDEO } from "../video";
import { SPECIMEN } from "./specimen";

const LEVELS = 8;
const CAPITALS = PIXEL_CHARS.filter((char) => /[A-Z]/.test(char)).join("");
const OTHERS = PIXEL_CHARS.filter((char) => /[^A-Za-z ]/.test(char)).join("");
const WIDTHS = [125, 100, 62] as const;
const TONES = ["accent", "proven", "chrome", "quiet"] as const;

const LONG_CARDS = {
  dark: sceneOf(TIMELINE, "goal").shots[1]?.card ?? null,
  paper: sceneOf(TIMELINE, "playbooks").shots[1]?.card ?? null,
};

const CHIPS = TONES.map((tone, index) => ({
  tone,
  x: 224 + TONES.slice(0, index).reduce((sum, earlier) => sum + chipWidth(earlier) + 3, 0),
}));

const Parts: FC = () => {
  const theme = useTheme();
  const card = LONG_CARDS[useThemeName()];
  const windowSize = { w: 200, h: 80 };
  const body = windowBody(windowSize.w, windowSize.h);
  return (
    <>
      <ChromeHeader label="kit specimen" right="0O 1lI {}[] /mako" />

      <Checker {...SPECIMEN.checker} color={theme.text} />
      {Array.from({ length: LEVELS }, (_, index) => (
        <DitherField
          key={index}
          x={SPECIMEN.levels.x + index * 18}
          y={SPECIMEN.levels.y}
          w={18}
          h={SPECIMEN.levels.h}
          color={ENERGY[2]}
          level={(index + 1) / LEVELS}
        />
      ))}
      {SKILL_KINDS.map((kind, index) => (
        <Box key={kind} x={SPECIMEN.orbs.x + index * 42} y={SPECIMEN.orbs.y} w={42} h={24}>
          <Orb x={0} y={0} kind={kind} />
          <Orb x={15} y={0} kind={kind} dim={0.5} />
          <Orb x={30} y={3} kind={kind} size={7} />
          <Orb x={0} y={15} kind={kind} size={9} />
          <Orb x={11} y={15} kind={kind} size={5} />
        </Box>
      ))}
      <Wordmark x={SPECIMEN.wordmark.x} y={SPECIMEN.wordmark.y} scale={3} />

      <PixelText x={SPECIMEN.pixelText.x} y={SPECIMEN.pixelText.y} text={CAPITALS} />
      <PixelText x={SPECIMEN.pixelText.x} y={SPECIMEN.pixelText.y + 9} text={`${OTHERS} mako`} />
      <PixelText x={SPECIMEN.pixelText.x + 126} y={SPECIMEN.pixelText.y + 9} text="7 / 53" scale={2} color={theme.accentText} />
      <PixelText x={SPECIMEN.pixelText.x} y={SPECIMEN.pixelText.y + 19} text="VERIFIED" color={theme.muted} />

      <Gauge {...SPECIMEN.gauge} value={0.6} />
      {CHIPS.map(({ tone, x }) => (
        <Chip key={tone} x={x} y={70} text={tone} tone={tone} />
      ))}
      <Chip x={420} y={70} text="/mako" tone="chrome" keepCase />
      <Label x={224} y={80} text="label 28.57 px" color={theme.muted} />
      <Label x={304} y={80} text="accent text" color={theme.accentText} />

      <Window x={8} y={92} w={windowSize.w} h={windowSize.h} title="window" tag="tag">
        <Row x={0} y={EDGE_ROWS + 1} w={body.w} index="01" label="normal row" value="12" />
        <Row x={0} y={EDGE_ROWS + 1 + ROW_ROWS} w={body.w} index="02" label="selected row" value="3/53" selected />
        <Row x={0} y={EDGE_ROWS + 1 + ROW_ROWS * 2} w={body.w} index="03" label="finished row" done />
        <Row x={0} y={EDGE_ROWS + 1 + ROW_ROWS * 3} w={body.w} index="04" label="dim row" dim />
        <Row x={0} y={EDGE_ROWS + 1 + ROW_ROWS * 4} w={body.w} label="/skill:mako" value="pi" keepCase />
        <Gauge x={8} y={EDGE_ROWS + 3 + ROW_ROWS * 5} w={body.w - 16} value={0.25} />
      </Window>

      <Box x={216} y={92} w={256} h={80}>
        {WIDTHS.map((width, index) => (
          <div
            key={width}
            style={{
              position: "absolute",
              left: 0,
              top: index * TYPE.cardLineCells * GRID.cell,
              lineHeight: `${TYPE.cardLineCells * GRID.cell}px`,
              fontFamily: `"${TYPE.display.family}"`,
              fontWeight: TYPE.display.weight,
              fontStretch: `${width}%`,
              fontSize: TYPE.cardPx,
              whiteSpace: "pre",
              color: theme.text,
            }}
          >
            {`ARCHIVO 900 / ${width}`}
          </div>
        ))}
        <Label x={0} y={46} text="JetBrains Mono 500 0O 1lI" keepCase />
        <Label x={0} y={56} text="JetBrains Mono 700 0O 1lI" keepCase bold />
        <Label x={0} y={68} h={12} pitch={7} text="pitch 7: 40 px" color={theme.muted} />
      </Box>

      {card === null ? null : <MessageWindow x={8} y={176} card={card} />}

      <LabelBar y={GRID.rows - LABEL_BAR_ROWS} chip="PL. 07" caption="label bar" right="edge above" edge="above" />
    </>
  );
};

const Kit: FC = () => {
  const frame = useCurrentFrame();
  return (
    <Frame theme={THEME_NAMES[frame % THEME_NAMES.length] ?? "dark"}>
      <Parts />
    </Frame>
  );
};

registerRoot(() => (
  <Composition
    id="Kit"
    component={Kit}
    durationInFrames={THEME_NAMES.length}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
  />
));
