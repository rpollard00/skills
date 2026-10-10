import { EDGE_ROWS, LABEL_BAR_ROWS, paneBody, type Rect } from "../../kit";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const PANES = {
  left: { x: 8, y: 28, w: 190, h: 166 },
  right: { x: 204, y: 28, w: 268, h: 166 },
} as const satisfies Record<string, Rect>;

export const BODY = { left: paneBody(PANES.left), right: paneBody(PANES.right) } as const;

export const ORB = 13;
export const SOCKET = 17;

const SLAB = {
  x: 2,
  y: EDGE_ROWS + 2,
  w: 184,
  columns: [5, 110],
  pad: 6,
  link: 3,
  pairGap: 9,
  labelGap: 4,
} as const;

export interface SlotPlace {
  readonly socket: Point;
  readonly label: Point;
  readonly joinsBelow: boolean;
}

export interface SlabLayout {
  readonly rect: Rect;
  readonly slots: readonly SlotPlace[];
}

export const slabLayout = (count: number): SlabLayout => {
  const pairs = Math.ceil(count / 2);
  const pairsInColumn = Math.ceil(pairs / SLAB.columns.length);
  const pairRows = SOCKET * 2 + SLAB.link;
  const x = BODY.left.x + SLAB.x;
  const y = BODY.left.y + SLAB.y;
  const top = y + LABEL_BAR_ROWS + SLAB.pad;
  const slots = Array.from({ length: count }, (_, slot): SlotPlace => {
    const pair = Math.floor(slot / 2);
    const member = slot % 2;
    const column = SLAB.columns[Math.floor(pair / pairsInColumn)] ?? SLAB.columns[0];
    const socket = {
      x: x + column,
      y: top + (pair % pairsInColumn) * (pairRows + SLAB.pairGap) + member * (SOCKET + SLAB.link),
    };
    return {
      socket,
      label: { x: socket.x + SOCKET + SLAB.labelGap, y: socket.y },
      joinsBelow: member === 0 && slot + 1 < count,
    };
  });
  const h = LABEL_BAR_ROWS + SLAB.pad * 2 + pairsInColumn * pairRows + (pairsInColumn - 1) * SLAB.pairGap;
  return { rect: { x, y, w: SLAB.w, h }, slots };
};

export const LINK = { w: 3, h: SLAB.link, inset: (SOCKET - 3) / 2 } as const;

const BAG = {
  x: 8,
  y: EDGE_ROWS + 3,
  h: 96,
  pitch: 16,
  gap: 12,
  pad: 8,
} as const;

export interface BagLayout {
  readonly columns: number;
  readonly rows: number;
  readonly pitch: number;
  readonly orb: number;
  readonly cell: (index: number) => Point;
  readonly column: (index: number) => number;
  readonly side: Rect;
  readonly legend: Point;
}

const oddAtMost = (value: number): number => (value % 2 === 1 ? value : value - 1);

export const bagLayout = (count: number, columns: number): BagLayout => {
  const rows = Math.max(1, Math.ceil(count / columns));
  const pitch = Math.min(BAG.pitch, Math.floor(BAG.h / rows));
  const orb = Math.min(ORB, oddAtMost(pitch - 1));
  const x = BODY.right.x + BAG.x;
  const y = BODY.right.y + BAG.y;
  const gridW = columns * pitch;
  const sideX = x + gridW + BAG.gap - (pitch - orb);
  return {
    columns,
    rows,
    pitch,
    orb,
    cell: (index) => ({ x: x + (index % columns) * pitch, y: y + Math.floor(index / columns) * pitch }),
    column: (index) => index % columns,
    side: { x: sideX, y, w: BODY.right.x + BODY.right.w - BAG.pad - sideX, h: rows * pitch - (pitch - orb) },
    legend: { x, y: y + BAG.h + 2 },
  };
};

export const LEGEND = { orb: 11, pitch: 12, gap: 4 } as const;

export const centerOf = (corner: Point, size: number): Point => ({
  x: corner.x + (size - 1) / 2,
  y: corner.y + (size - 1) / 2,
});

export const cornerOf = (center: Point, size: number): Point => ({
  x: Math.round(center.x - (size - 1) / 2),
  y: Math.round(center.y - (size - 1) / 2),
});
