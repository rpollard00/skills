import type { FC, ReactNode } from "react";
import type { Card } from "../timeline";
import { TYPE } from "../theme";
import { DitherEdge } from "./dither";
import { Box, useTheme } from "./grid";
import { clamp01 } from "./motion";
import { Chip, CHIP_ROWS, chipWidth } from "./parts";
import { Display, Label, labelWidth } from "./type";

/** Cells of the window parts. The body starts at (`border`, `border + title`) and is `w - 2` wide. */
export const WINDOW = { border: 1, title: 9, pad: 3 } as const;

/** The size in cells of the body of a window, where its children go. */
export const windowBody = (w: number, h: number): { readonly w: number; readonly h: number } => ({
  w: w - WINDOW.border * 2,
  h: h - WINDOW.border * 2 - WINDOW.title,
});

export interface WindowProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly title: string;
  /** An accent chip at the right end of the title bar, for example `AUTO`. */
  readonly tag?: string;
  /** Positioned against the top-left corner of the body. Keep text below the 12-row dither edge. */
  readonly children?: ReactNode;
}

/** A menu window: chrome title bar, 12-row dither edge into the flat body, 1-cell border, square corners. */
export const Window: FC<WindowProps> = ({ x, y, w, h, title, tag, children }) => {
  const theme = useTheme();
  const body = windowBody(w, h);
  return (
    <Box x={x} y={y} w={w} h={h} fill={theme.border}>
      <Box x={WINDOW.border} y={WINDOW.border} w={body.w} h={WINDOW.title} fill={theme.chrome}>
        <Label x={WINDOW.pad} y={0} h={WINDOW.title} text={title} color={theme.onChrome} />
        {tag === undefined ? null : <Chip x={body.w - chipWidth(tag) - 1} y={(WINDOW.title - CHIP_ROWS) / 2} text={tag} />}
      </Box>
      <Box x={WINDOW.border} y={WINDOW.border + WINDOW.title} w={body.w} h={body.h} fill={theme.window} clip>
        <DitherEdge x={0} y={0} w={body.w} color={theme.chrome} toward="down" />
        {children}
      </Box>
    </Box>
  );
};

/** Frames that a window or a card takes to open: `open={stepped(age, OPEN_FRAMES)}`. */
export const OPEN_FRAMES = 4;

export interface RevealProps {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** 0 shows nothing, 1 shows all rows. */
  readonly open: number;
  /** The row inside the part that opens first. Default: the middle row. */
  readonly from?: number;
  /** Positioned against the top-left corner of the part. */
  readonly children: ReactNode;
}

/** Opens a part by whole rows, up and down from one row, as a window opens. */
export const Reveal: FC<RevealProps> = ({ x, y, w, h, open, from = h / 2, children }) => {
  const share = clamp01(open);
  const top = Math.round(from * (1 - share));
  const bottom = Math.round(from + (h - from) * share);
  if (bottom <= top) return null;
  return (
    <Box x={x} y={y + top} w={w} h={bottom - top} clip>
      <Box x={0} y={-top} w={w} h={h}>
        {children}
      </Box>
    </Box>
  );
};

const MESSAGE_TEXT_ROWS = 34;
const SOURCE_ROWS = 9;
const MESSAGE_PAD = 5;

/** Height in cells of every message window. */
export const MESSAGE_ROWS = WINDOW.border * 2 + MESSAGE_TEXT_ROWS + SOURCE_ROWS;

/** Width in cells that holds the widest card line the budget allows (30 characters at 52 px). */
export const MESSAGE_COLS = 380;

const SOURCE_TAG = "SRC";

export interface MessageWindowProps {
  readonly x: number;
  readonly y: number;
  /** Default `MESSAGE_COLS`. */
  readonly w?: number;
  readonly card: Card;
}

/** The message window: one card of 1 or 2 lines, with its source file on a chrome strip. */
export const MessageWindow: FC<MessageWindowProps> = ({ x, y, w = MESSAGE_COLS, card }) => {
  const theme = useTheme();
  const inner = w - WINDOW.border * 2;
  const top = (MESSAGE_TEXT_ROWS - card.lines.length * TYPE.cardLineCells) / 2;
  return (
    <Box x={x} y={y} w={w} h={MESSAGE_ROWS} fill={theme.border}>
      <Box x={WINDOW.border} y={WINDOW.border} w={inner} h={MESSAGE_TEXT_ROWS} fill={theme.window} clip>
        {card.lines.map((line, index) => (
          <Display key={index} x={MESSAGE_PAD} y={top + index * TYPE.cardLineCells} text={line} />
        ))}
      </Box>
      <Box x={WINDOW.border} y={WINDOW.border + MESSAGE_TEXT_ROWS} w={inner} h={SOURCE_ROWS} fill={theme.chrome} clip>
        {card.source.kind === "quote" ? (
          <>
            <Label x={MESSAGE_PAD} y={0} h={SOURCE_ROWS} text={SOURCE_TAG} color={theme.mutedOnChrome} />
            <Label
              x={MESSAGE_PAD + labelWidth(SOURCE_TAG) + TYPE.labelPitch}
              y={0}
              h={SOURCE_ROWS}
              text={card.source.file}
              color={theme.onChrome}
              keepCase
            />
          </>
        ) : (
          <Label x={MESSAGE_PAD} y={0} h={SOURCE_ROWS} text={card.source.kind} color={theme.mutedOnChrome} />
        )}
      </Box>
    </Box>
  );
};
