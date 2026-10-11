/**
 * What a test can read off a scene about the relation words: where each word is, what each thing on the stage covers, and the rules of a word.
 * The geometry here comes from what the map draws, not from the code that places a word. Thus a rule here can fail that code.
 */
import { captionWidth, WORD_BOX, wordWidthOf, type GroupId } from "../src/shared/focus-layout";
import { countRun, FRAME, type Placement, type Point, type Rect } from "../src/shared/layout";
import type { NodeId, RelationKey } from "../src/shared/model";
import { GATE } from "../src/shared/polyline";
import { BESIDE } from "../src/shared/view/beside";
import { portMarksOf } from "../src/shared/view/ports";
import { CHIP, type CableTone, type CableView, type Scene } from "../src/shared/view/scene";
import type { Viewport } from "../src/shared/view/state";

/** The two rects have an area in common. Rects that only touch do not meet. */
export const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export const isInside = (inner: Rect, outer: Rect): boolean =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;

export const grown = (rect: Rect, by: number): Rect => ({ x: rect.x - by, y: rect.y - by, width: rect.width + by * 2, height: rect.height + by * 2 });

export type Run = readonly [Point, Point];

export const runsOf = (points: readonly Point[]): Run[] => points.slice(1).map((to, index) => [points[index] ?? to, to]);

/** Half of the width of a drawn line. */
const LINE_HALF = 0.75;

/** What a drawn line covers. */
export const rectOfRun = ([first, second]: Run): Rect => ({
  x: Math.min(first.x, second.x) - LINE_HALF,
  y: Math.min(first.y, second.y) - LINE_HALF,
  width: Math.abs(first.x - second.x) + LINE_HALF * 2,
  height: Math.abs(first.y - second.y) + LINE_HALF * 2,
});

const isLitTone = (tone: CableTone): boolean => tone === "out" || tone === "in" || tone === "step";

export const litOf = (scene: Scene): CableView[] => scene.cables.filter((cable) => isLitTone(cable.tone));

/** The lit lines and the gray lines of a locked arrangement. The resting weave is not a line here: it is behind each word at low strength. */
export const linesOf = (scene: Scene): CableView[] => scene.cables.filter((cable) => cable.tone !== "weave" && cable.tone !== "previewOut" && cable.tone !== "previewIn");

/** The branches of the rail. The rest map draws them at low strength under each selection, and an arrangement does not draw them. */
export const railOf = (scene: Scene, placement: Placement): readonly (readonly Point[])[] => (scene.arranged ? [] : placement.rail.lines);

interface Titled {
  readonly key: string;
  readonly group: GroupId;
  readonly count: number;
  readonly at: Point;
  readonly anchor: "start" | "end";
}

/** Each caption that the stage draws: the captions of an arrangement, or the titles of the columns of the rest map. */
const captionRectsOf = (scene: Scene, placement: Placement): { readonly name: string; readonly rect: Rect }[] => {
  const titled: readonly Titled[] = scene.arranged ? scene.captions : placement.columns.map((column) => ({ key: column.id, group: column.id, count: column.count, at: column.title, anchor: "start" }));
  return titled.map((caption) => {
    const width = captionWidth(caption.group, caption.count);
    return { name: `the caption ${caption.key}`, rect: { x: caption.anchor === "end" ? caption.at.x - width : caption.at.x, y: caption.at.y - FRAME.labelHeight / 2, width, height: FRAME.labelHeight } };
  });
};

export interface WordBox {
  readonly place: "wire" | "beside";
  readonly keys: readonly RelationKey[];
  readonly text: string;
  readonly tone: CableTone;
  readonly rect: Rect;
  /** The row that a word beside a name is of. Null for a word on a line. */
  readonly node: NodeId | null;
}

export const wordBoxesOf = (scene: Scene): WordBox[] => [
  ...litOf(scene).flatMap((cable): WordBox[] => {
    if (cable.words === null) return [];
    const width = wordWidthOf(cable.words.text);
    return [{ place: "wire", keys: [cable.key], text: cable.words.text, tone: cable.tone, rect: { x: cable.words.at.x - width / 2, y: cable.words.at.y - WORD_BOX.height / 2, width, height: WORD_BOX.height }, node: null }];
  }),
  ...scene.beside.map((word): WordBox => ({ place: "beside", keys: word.keys, text: word.text, tone: word.tone, rect: word.box, node: word.node })),
];

export type ThingKind = "glyph" | "name" | "tool mark" | "count" | "dot" | "chip" | "caption" | "arrowhead" | "bar" | "ring" | "back mark";

export interface Thing {
  readonly kind: ThingKind;
  readonly name: string;
  readonly rect: Rect;
  /** The row that draws it. Null for a mark of a line and for a caption. */
  readonly node: NodeId | null;
  readonly isLit: boolean;
}

const ARROW = { length: 5, half: 3.2, setBack: 4.5 } as const;
const BAR = { half: 5.5, width: 2.2 } as const;

/** The marks of some lines: the arrowhead or the bar at each port, and the ring and the back mark of each line. */
const marksOf = (cables: readonly CableView[]): Thing[] => {
  const marks: Thing[] = [];
  for (const mark of portMarksOf(cables)) {
    const tip = mark.at.x - (mark.hasBar ? ARROW.setBack * mark.arrives : 0);
    const name = mark.cables.map((cable) => cable.key).join(" and ");
    if (mark.hasArrow) marks.push({ kind: "arrowhead", name: `the arrowhead of ${name}`, rect: { x: Math.min(tip, tip - ARROW.length * mark.arrives), y: mark.at.y - ARROW.half, width: ARROW.length, height: ARROW.half * 2 }, node: null, isLit: true });
    if (mark.hasBar) marks.push({ kind: "bar", name: `the bar of ${name}`, rect: { x: mark.at.x - BAR.width / 2, y: mark.at.y - BAR.half, width: BAR.width, height: BAR.half * 2 }, node: null, isLit: true });
  }
  for (const cable of cables) {
    if (cable.gate !== null) marks.push({ kind: "ring", name: `the ring of ${cable.key}`, rect: { x: cable.gate.x - GATE.radius, y: cable.gate.y - GATE.radius, width: GATE.radius * 2, height: GATE.radius * 2 }, node: null, isLit: true });
    if (cable.back !== null) marks.push({ kind: "back mark", name: `the back mark of ${cable.key}`, rect: { x: cable.back.x, y: cable.back.y - ARROW.half, width: ARROW.length, height: ARROW.half * 2 }, node: null, isLit: true });
  }
  return marks;
};

/** Each thing that the stage draws and that a word must not cover: the parts of each row, each caption, and each mark of a lit line. */
export const thingsOf = (scene: Scene, placement: Placement): Thing[] => {
  const things: Thing[] = [];
  for (const node of scene.nodes) {
    if (node.offStage) continue;
    const at = node.at;
    const isLit = node.tone.kind !== "dim" && node.tone.kind !== "rest";
    const part = (kind: ThingKind, rect: Rect): void => void things.push({ kind, name: `the ${kind} of ${node.id}`, rect, node: node.id, isLit });
    if (at.kind === "pip") {
      if (!at.folded) part("dot", { x: at.centre.x - 2.6, y: at.centre.y - 2.6, width: 5.2, height: 5.2 });
      continue;
    }
    const reach = node.glyph === "hub" ? 9.5 : 5.5;
    const chars = at.text.length + (at.kind === "row" && at.note !== null ? at.note.length + 1 : 0);
    part("glyph", { x: at.centre.x - reach, y: at.centre.y - reach, width: reach * 2, height: reach * 2 });
    part("name", { x: at.textX, y: at.centre.y - FRAME.labelHeight / 2, width: chars * FRAME.charWidth, height: FRAME.labelHeight });
    if (at.foldedPips !== null) part("count", { x: at.foldedPips.x, y: at.centre.y - 5, width: countRun(at.foldedPips.count) - FRAME.countGap, height: 10 });
    if (node.chips.length > 0) for (const chip of node.chips) part("chip", { x: chip.x - CHIP.lead, y: at.centre.y - CHIP.half, width: chip.width, height: CHIP.half * 2 });
    else for (const mark of at.marks) part("tool mark", { x: mark.x, y: at.centre.y - 4.5, width: FRAME.markWidth[mark.kind], height: 9 });
  }
  for (const caption of captionRectsOf(scene, placement)) things.push({ kind: "caption", name: caption.name, rect: caption.rect, node: null, isLit: false });
  return [...things, ...marksOf(litOf(scene))];
};

/** The part of the world that the view shows beside the reader, for the camera of the scene. */
export const visibleRectOf = (scene: Scene, viewport: Viewport, isReading: boolean): Rect => {
  const { scale, tx, ty } = scene.camera;
  const width = viewport.width - (isReading ? viewport.reader : 0);
  return { x: -tx / scale, y: -ty / scale, width: width / scale, height: viewport.height / scale };
};

/** The part that two rects have in common. Null when they do not meet. */
const common = (a: Rect, b: Rect): Rect | null => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
};

const sameEnds = (a: CableView, b: CableView): boolean => {
  const name = (point: Point | undefined): string => (point === undefined ? "" : `${point.x},${point.y}`);
  const ends = new Set([name(a.points[0]), name(a.points.at(-1))]);
  return ends.size === 2 && ends.has(name(b.points[0])) && ends.has(name(b.points.at(-1))) && name(b.points[0]) !== name(b.points.at(-1));
};

/**
 * The lines of a different relation that a word stands on.
 * Two lit lines between the same two ports are one line on the stage, for example a relation and the relation back in an arrangement,
 * or the line to a skill and the line to a hosted file on its row. Thus the second one is not a line of a different relation.
 * A gray line of a locked arrangement is under many lit lines. It counts only where the word is not on its own lit line.
 */
export const strangersUnder = (word: WordBox, scene: Scene): CableView[] => {
  const own = new Set(word.keys);
  const mine = litOf(scene).filter((cable) => own.has(cable.key));
  const ownRuns = mine.flatMap((cable) => runsOf(cable.points).map(rectOfRun));
  return linesOf(scene).filter((cable) => {
    if (own.has(cable.key)) return false;
    if (isLitTone(cable.tone) && mine.some((other) => sameEnds(other, cable))) return false;
    return runsOf(cable.points).some((run) => {
      const under = common(word.rect, rectOfRun(run));
      if (under === null) return false;
      return cable.tone !== "frame" || !ownRuns.some((ownRun) => isInside(under, ownRun));
    });
  });
};

/**
 * The branches of the rail that a word stands on. The lit line of the router to a playbook is on its branch of the rail,
 * so a branch counts only where the word is not on its own lit line. The result gives each branch as the points of its line.
 */
export const railUnder = (word: WordBox, scene: Scene, placement: Placement): string[] => {
  const own = new Set(word.keys);
  const ownRuns = litOf(scene).filter((cable) => own.has(cable.key)).flatMap((cable) => runsOf(cable.points).map(rectOfRun));
  return railOf(scene, placement)
    .filter((branch) =>
      runsOf(branch).some((run) => {
        const under = common(word.rect, rectOfRun(run));
        return under !== null && !ownRuns.some((ownRun) => isInside(under, ownRun));
      }),
    )
    .map((branch) => branch.map((point) => `${point.x},${point.y}`).join(" "));
};

/** The row of a node on the stage. A hosted file is on the row of its host. */
export const rowOf = (scene: Scene, id: NodeId) => {
  const stand = scene.nodes.find((node) => node.id === id && !node.offStage)?.at;
  const host = stand?.kind === "pip" ? scene.nodes.find((node) => node.id === stand.host)?.at : stand;
  return stand === undefined || host === undefined || host.kind === "pip" ? null : { id: stand.kind === "pip" ? stand.host : id, at: host, isOfFile: stand.kind === "pip" };
};

/** A word beside a name stands on a level part of a lit line of its own relation. */
export const isOnItsOwnLine = (word: WordBox, scene: Scene): boolean => {
  const own = new Set(word.keys);
  const middle = word.rect.y + word.rect.height / 2;
  return litOf(scene)
    .filter((cable) => own.has(cable.key))
    .flatMap((cable) => runsOf(cable.points))
    .some(([first, second]) => first.y === second.y && Math.abs(first.y - middle) < 0.01 && word.rect.x >= Math.min(first.x, second.x) && word.rect.x + word.rect.width <= Math.max(first.x, second.x));
};

export interface UnderName {
  readonly word: WordBox;
  /** The lit rows directly below the word. A word over such a row reads as the word of that row. */
  readonly litBelow: readonly NodeId[];
  /** From the lower edge of the label of its own row to the word, and from the word to the upper edge of a label on the row below. */
  readonly gap: { readonly toItsName: number; readonly toTheRowBelow: number };
}

/** The words that stand below the row of their own name and above the next row, and not on a line of their own. */
export const wordsUnderNames = (scene: Scene, placement: Placement): UnderName[] => {
  const things = thingsOf(scene, placement);
  return wordBoxesOf(scene).flatMap((word): UnderName[] => {
    if (word.place !== "beside" || word.node === null || isOnItsOwnLine(word, scene)) return [];
    const row = rowOf(scene, word.node)?.at;
    if (row === undefined) return [];
    const middle = word.rect.y + word.rect.height / 2;
    if (middle <= row.centre.y + 1 || middle >= row.centre.y + FRAME.pitch - 1) return [];
    const nextRow = row.centre.y + FRAME.pitch;
    const isDirectlyBelow = (rect: Rect): boolean => Math.abs(rect.y + rect.height / 2 - nextRow) < 1 && rect.x < word.rect.x + word.rect.width && word.rect.x < rect.x + rect.width;
    const below = things.filter((thing) => thing.node !== null && thing.isLit && isDirectlyBelow(thing.rect));
    return [
      {
        word,
        litBelow: [...new Set(below.flatMap((thing) => (thing.node === null ? [] : [thing.node])))],
        gap: { toItsName: word.rect.y - (row.centre.y + FRAME.labelHeight / 2), toTheRowBelow: nextRow - FRAME.labelHeight / 2 - (word.rect.y + word.rect.height) },
      },
    ];
  });
};

/**
 * The words that stand before the mark of the router of their row: on the row, on the side of the glyph, and not on a line of their own.
 * A word there reads as a relation into the node, because the mark is an arrowhead from the router.
 */
export const wordsBeforeATick = (scene: Scene): WordBox[] =>
  wordBoxesOf(scene).filter((word) => {
    if (word.place !== "beside" || word.node === null || isOnItsOwnLine(word, scene)) return false;
    const node = scene.nodes.find((item) => item.id === word.node && !item.offStage);
    if (node === undefined || node.mako === "none" || node.at.kind === "pip") return false;
    const isOnTheRow = Math.abs(word.rect.y + word.rect.height / 2 - node.at.centre.y) < 1;
    return isOnTheRow && word.rect.x + word.rect.width <= node.at.left.x;
  });

/** What each row keeps for itself: from its leftmost port or label to its rightmost one, at the height of a label. */
const rowRectsOf = (scene: Scene): { readonly node: NodeId; readonly rect: Rect }[] =>
  scene.nodes.flatMap((node) => {
    if (node.offStage || node.at.kind === "pip") return [];
    const from = Math.min(node.at.left.x, node.at.label.x);
    const to = Math.max(node.at.right.x, node.at.label.x + node.at.label.width);
    return [{ node: node.id, rect: { x: from, y: node.at.centre.y - FRAME.labelHeight / 2, width: to - from, height: FRAME.labelHeight } }];
  });

/** A place that the rules permit for the word of one relation. */
export interface Place {
  readonly name: string;
  readonly rect: Rect;
  readonly isOnItsOwnLine: boolean;
  readonly isUnderTheName: boolean;
  /** The place is on a level part in the middle of the line. Such a part is between two rows. */
  readonly isBetweenRows: boolean;
}

/**
 * How much room a place has when it is free with room to spare. The product needs less than this at each side,
 * so a relation that has such a place and shows no word is a defect.
 */
export const ROOM = { fromAnEndOfTheLine: 13, fromACornerOfTheLine: 12, atEachSide: 11, aboveAndBelow: 2 } as const;

/**
 * Each place that the rules permit for the word of a lit relation: on each level part of its own line,
 * after the name of the neighbour, under that name, and on the other side of that node.
 * The word of a hosted file has no place on a line, because it has a dot that ties it to its row.
 * The other side is no place for a row that shows a mark of the router there.
 */
export const placesOf = (scene: Scene, cable: CableView, text: string, neighbour: NodeId): Place[] => {
  const row = rowOf(scene, neighbour);
  if (row === null) return [];
  const { at } = row;
  const width = wordWidthOf(text) + (row.isOfFile ? BESIDE.dot : 0);
  const places: Place[] = [];
  if (!row.isOfFile) {
    for (const [index, run] of runsOf(cable.points).entries()) {
      if (run[0].y !== run[1].y) continue;
      const low = Math.min(run[0].x, run[1].x);
      const high = Math.max(run[0].x, run[1].x);
      const marginAt = (x: number): number => {
        const isAnEndOfTheLine = (index === 0 && x === run[0].x) || (index === cable.points.length - 2 && x === run[1].x);
        return isAnEndOfTheLine ? ROOM.fromAnEndOfTheLine : ROOM.fromACornerOfTheLine;
      };
      const isBetweenRows = index !== 0 && index !== cable.points.length - 2;
      for (let x = low + marginAt(low); x + width <= high - marginAt(high); x += 1) {
        places.push({ name: `on ${isBetweenRows ? "a level part in the middle of its line" : "its line"} at x ${x}`, rect: { x, y: run[0].y - WORD_BOX.height / 2, width, height: WORD_BOX.height }, isOnItsOwnLine: true, isUnderTheName: false, isBetweenRows });
      }
    }
  }
  const isMirrored = at.kind === "row" && at.mirrored;
  const outward = isMirrored ? -1 : 1;
  const node = scene.nodes.find((item) => item.id === row.id);
  const lastChip = node?.chips.at(-1);
  const nameEnd = isMirrored ? at.label.x : Math.max(at.label.x + at.label.width, lastChip === undefined ? Number.NEGATIVE_INFINITY : lastChip.x - CHIP.lead + lastChip.width);
  const from = (start: number, direction: number): number => (direction === 1 ? start : start - width);
  const onRow = { y: at.centre.y - WORD_BOX.height / 2, width, height: WORD_BOX.height };
  const otherPort = isMirrored ? at.right : at.left;
  const beside = { isOnItsOwnLine: false, isBetweenRows: false };
  places.push({ name: "after the name", rect: { x: from(nameEnd + outward * BESIDE.lead, outward), ...onRow }, ...beside, isUnderTheName: false });
  places.push({
    name: "under the name",
    rect: { x: from(isMirrored ? at.label.x + at.label.width : at.textX, outward), y: at.centre.y + BESIDE.under.drop - BESIDE.under.height / 2, width, height: BESIDE.under.height },
    ...beside,
    isUnderTheName: true,
  });
  if (node === undefined || node.mako === "none") places.push({ name: "on the other side of the node", rect: { x: from(otherPort.x - outward * BESIDE.lead, -outward), ...onRow }, ...beside, isUnderTheName: false });
  return places;
};

/**
 * Says of a place on one scene whether it has room: it is inside what the camera fits, and with room to spare
 * it is clear of each line that is not its own, each branch of the rail, each row, each thing, and each word.
 * A place under a name has no room over a lit row. A place between two rows has no room below a row or above one.
 */
export const roomOn = (scene: Scene, placement: Placement, bounds: Rect): ((place: Place, cable: CableView, neighbour: NodeId) => boolean) => {
  const lines = [...linesOf(scene).map((line) => line.points), ...railOf(scene, placement)];
  const runs = lines.flatMap((points) => runsOf(points).map((run) => ({ rect: rectOfRun(run), goesUpOrDown: run[0].x === run[1].x })));
  const things = thingsOf(scene, placement);
  const rows = rowRectsOf(scene);
  const words = wordBoxesOf(scene);
  return (place, cable, neighbour) => {
    if (!isInside(place.rect, bounds)) return false;
    const row = rowOf(scene, neighbour);
    const around: Rect = { x: place.rect.x - ROOM.atEachSide, y: place.rect.y - ROOM.aboveAndBelow, width: place.rect.width + ROOM.atEachSide * 2, height: place.rect.height + ROOM.aboveAndBelow * 2 };
    if (place.isOnItsOwnLine) {
      const onTheLine: WordBox = { place: "wire", keys: [cable.key], text: "", tone: cable.tone, rect: around, node: null };
      if (runs.some((run) => run.goesUpOrDown && overlap(around, run.rect))) return false;
      if (strangersUnder(onTheLine, scene).length > 0 || railUnder(onTheLine, scene, placement).length > 0) return false;
    } else if (runs.some((run) => overlap(around, run.rect))) return false;
    const isOfItsOwnRow = (thing: Thing): boolean => !place.isOnItsOwnLine && thing.node === row?.id && thing.kind !== "chip";
    if (things.some((thing) => !isOfItsOwnRow(thing) && overlap(around, thing.rect))) return false;
    if (rows.some((other) => (place.isBetweenRows || other.node !== row?.id) && overlap(around, other.rect))) return false;
    if (words.some((word) => overlap(around, word.rect))) return false;
    if (!place.isUnderTheName || row === null) return true;
    const nextRow = row.at.centre.y + FRAME.pitch;
    return !things.some((thing) => thing.node !== null && thing.node !== row.id && thing.isLit && Math.abs(thing.rect.y + thing.rect.height / 2 - nextRow) < 1 && thing.rect.x < around.x + around.width && around.x < thing.rect.x + thing.rect.width);
  };
};

/** A chip has a border and a lit line has a glow: with less ground than this between the two, the chip is against the line. */
const GROUND_AT_A_CHIP = 2;

/**
 * What each tool chip of the scene covers or stands against: a lit line, the arrowhead, the bar, or the ring of one, or a relation word.
 * A chip is drawn over each of them. A lit line here is a line of the selection or a line of the preview of the node under the pointer.
 * `ownRow`: the row that a preview is of. Its chips stay over its own lines, so they do not count.
 */
export const coveredByChips = (scene: Scene, placement: Placement, ownRow: NodeId | null = null): string[] => {
  const chips = thingsOf(scene, placement).flatMap((thing) => (thing.kind === "chip" && thing.node !== ownRow ? [{ ...thing, rect: grown(thing.rect, GROUND_AT_A_CHIP) }] : []));
  const drawn = scene.cables.filter((cable) => cable.tone !== "weave" && cable.tone !== "frame");
  const marks = marksOf(drawn);
  const words = wordBoxesOf(scene);
  return chips.flatMap((chip) => [
    ...marks.filter((mark) => overlap(chip.rect, mark.rect)).map((mark) => `${chip.name} covers ${mark.name}`),
    ...words.filter((word) => overlap(chip.rect, word.rect)).map((word) => `${chip.name} covers the word "${word.text}" of ${word.keys.join(" and ")}`),
    ...drawn.filter((cable) => runsOf(cable.points).some((run) => overlap(chip.rect, rectOfRun(run)))).map((cable) => `${chip.name} covers the line ${cable.key}`),
  ]);
};
