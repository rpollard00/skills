import type { FC, ReactNode } from "react";
import { GRID } from "../theme";
import type { Card } from "../timeline";
import { Box } from "./grid";
import { stepped } from "./motion";
import { MESSAGE_COLS, MESSAGE_ROWS, MessageWindow, OPEN_FRAMES, Reveal, Window, WINDOW, windowBody } from "./window";

/** Cells in the frame. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Where the message window sits under the windows of a screen: centered, near the bottom edge. */
export const MESSAGE = { x: (GRID.cols - MESSAGE_COLS) / 2, y: 214, w: MESSAGE_COLS, h: MESSAGE_ROWS } as const satisfies Rect;

/** The body of a window: where its children go, in frame cells. */
export const paneBody = (rect: Rect): Rect => ({
  ...windowBody(rect.w, rect.h),
  x: rect.x + WINDOW.border,
  y: rect.y + WINDOW.border + WINDOW.title,
});

export interface MenuPane {
  readonly rect: Rect;
  readonly title: string;
  /** Positioned against the top-left corner of the window body. */
  readonly children?: ReactNode;
  /** Drawn over the window and opened with it. Positioned against the frame. */
  readonly over?: ReactNode;
}

export interface MenuProps {
  readonly left: MenuPane;
  readonly right: MenuPane;
  /** Frames since the windows started to open. */
  readonly age: number;
  readonly card: Card | null;
  /** Frames since the card appeared. */
  readonly cardAge: number;
}

export const Menu: FC<MenuProps> = ({ left, right, age, card, cardAge }) => (
  <>
    {[left, right].map((pane) => (
      <Reveal key={pane.title} {...pane.rect} open={stepped(age, OPEN_FRAMES)}>
        <Window x={0} y={0} w={pane.rect.w} h={pane.rect.h} title={pane.title}>
          {pane.children}
        </Window>
        {pane.over === undefined ? null : (
          <Box x={-pane.rect.x} y={-pane.rect.y} w={GRID.cols} h={GRID.rows}>
            {pane.over}
          </Box>
        )}
      </Reveal>
    ))}
    {card === null ? null : (
      <Reveal {...MESSAGE} open={stepped(cardAge, OPEN_FRAMES)}>
        <MessageWindow x={0} y={0} w={MESSAGE.w} card={card} />
      </Reveal>
    )}
  </>
);
