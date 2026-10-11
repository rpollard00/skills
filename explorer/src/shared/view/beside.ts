import { captionRect, WORD_BOX, wordWidthOf, type Caption } from "../focus-layout";
import { FRAME, rowExtent, type Point, type Rect, type Span } from "../layout";
import type { NodeId, RelationKey } from "../model";
import { GATE, isOneLine, levelRunsOf, uprightsOf, WORD_CLEAR, wordOn } from "../polyline";
import type { Stand } from "./arranged";
import type { Unworded } from "./lit";
import type { CableTone, CableView } from "./scene";

/** The relation word of one cable or more that has no room on the run next to the lit neighbour. Most often it is beside the name of that neighbour. */
export interface WordBeside {
  readonly keys: readonly RelationKey[];
  /** The row of the neighbour. */
  readonly node: NodeId;
  readonly text: string;
  readonly tone: CableTone;
  readonly bright: boolean;
  /** The word is of a hosted file on the row. A dot comes before it, as the file has a dot on the row. */
  readonly ofFile: boolean;
  /** The box behind the word. It has the color of the ground. */
  readonly box: Rect;
}

export interface Beside {
  readonly words: readonly WordBeside[];
  /** The cables whose ring is under their own word. The word says `if` for them. */
  readonly ungated: ReadonlySet<RelationKey>;
}

export const BESIDE = {
  /** From the end of the row to the first word. */
  lead: 4,
  /** Between two words, and between a word and a level line, a row, a caption, or a ring. Also between a word under a name and a line that goes up or down beside it: a word on a row keeps more from such a line, for its rounded corner. */
  gap: 3,
  /** The room of the dot of a hosted file. */
  dot: 7,
  /** A word under a name starts where the label ends, so it is nearer to its own name than to the row below. Its box is lower than the box of a word on a row. */
  under: { drop: FRAME.labelHeight / 2 + 4, height: 8 },
} as const;

/** The dot before the word of a hosted file. */
export const FILE_DOT = { radius: 1.8 } as const;

type Lined = Exclude<Stand, { readonly kind: "pip" }>;

interface Entry {
  readonly keys: RelationKey[];
  readonly text: string;
  readonly tone: CableTone;
  readonly ofFile: boolean;
  /** The x of the dot of the first hosted file that the word is of. */
  readonly fileX: number | null;
  bright: boolean;
}

/**
 * The level runs that a word can stand on: the runs of its cables that start at a port of its row, or that also end there,
 * or one run in the middle of its cable.
 */
type OwnRuns =
  | {
      readonly keys: readonly RelationKey[];
      readonly port: Point;
      /** `leaves`: only a run that starts at the port, because a run that ends there has its arrowhead there. */
      readonly ends: "leaves" | "either";
    }
  | { readonly keys: readonly RelationKey[]; readonly run: readonly [Point, Point] };

interface Band {
  readonly y: number;
  readonly half: number;
}

const widthOf = (entry: Entry): number => wordWidthOf(entry.text) + (entry.ofFile ? BESIDE.dot : 0);

const isAt = (point: Point | undefined, port: Point): boolean => point !== undefined && point.x === port.x && point.y === port.y;

const joins = (first: Point, second: Point, [from, to]: readonly [Point, Point]): boolean => (isAt(first, from) && isAt(second, to)) || (isAt(first, to) && isAt(second, from));

const isLitTone = (tone: CableTone): boolean => tone === "out" || tone === "in" || tone === "step";

/** The parts of `span` that no span of `covers` holds. */
const outside = (span: Span, covers: readonly Span[]): Span[] =>
  covers.reduce<Span[]>((left, cover) => left.flatMap((part) => [{ from: part.from, to: Math.min(part.to, cover.from) }, { from: Math.max(part.from, cover.to), to: part.to }].filter((piece) => piece.to > piece.from)), [span]);

const isInside = (box: Rect, bounds: Rect): boolean => box.x >= bounds.x && box.y >= bounds.y && box.x + box.width <= bounds.x + bounds.width && box.y + box.height <= bounds.y + bounds.height;

/**
 * Pure. Where each word goes that has no room on its cable. A word takes no character from a name.
 * A word stands only on its own line, on a part that no different line uses, or beside its own name where no line is.
 * It is inside what the camera fits, and it is clear of each line, each row, each caption, each ring of a different relation, and each other word.
 * Each word takes the first of these places that is free:
 * 1. after the name, in the empty room or on the first part of its own cable that leaves the node there;
 * 2. on its cable next to the node, with less air than a word has there by the first rule;
 * 3. under the name, when no lit row is directly below the word;
 * 4. on the other side of the node, when the row shows no mark of the router there;
 * 5. on its cable next to the node at the other end;
 * 6. on a level part in the middle of its cable, when no row is directly above it or below it.
 * A relation whose word has no such place shows no word.
 */
export const wordsBeside = (input: {
  readonly unworded: readonly Unworded[];
  readonly stands: ReadonlyMap<NodeId, Stand>;
  /** The lit cables and the cables of the frame. */
  readonly cables: readonly CableView[];
  /** The branches of the rail, which the rest map draws at low strength. Empty for an arrangement. A word keeps off them as off a cable of the frame. */
  readonly rail: readonly (readonly Point[])[];
  /** The captions of an arrangement, or the column titles of the rest map. */
  readonly captions: readonly Pick<Caption, "group" | "count" | "at" | "anchor">[];
  /** What the unfolded tool marks of a row cover. They go past the end of its label. Null for a row that has none. */
  readonly chipsOf: (id: NodeId) => Rect | null;
  /** The selection lights the node. */
  readonly isLit: (id: NodeId) => boolean;
  /** The row shows a mark of the router before its glyph. A word before that mark would read as a relation into the node. */
  readonly isTicked: (id: NodeId) => boolean;
  /** What the camera fits. A word outside it can be under the reader. */
  readonly bounds: Rect;
}): Beside => {
  const { stands, cables } = input;
  const rows = [...stands].flatMap(([id, stand]): (readonly [NodeId, Lined])[] => (stand.kind === "pip" ? [] : [[id, stand]]));
  const litRows = new Set([...stands].flatMap(([id, stand]) => (input.isLit(id) ? [stand.kind === "pip" ? stand.host : id] : [])));
  const endOfChips = (id: NodeId): number | null => {
    const chips = input.chipsOf(id);
    return chips === null ? null : chips.x + chips.width;
  };
  const extentOf = (id: NodeId, row: Lined): Span => {
    const { from, to } = rowExtent(row);
    return { from, to: Math.max(to, endOfChips(id) ?? to) };
  };

  const wanted = new Map<NodeId, Entry[]>();
  for (const line of input.unworded) {
    const stand = stands.get(line.neighbour);
    if (stand === undefined) continue;
    const row = stand.kind === "pip" ? stand.host : line.neighbour;
    const ofFile = stand.kind === "pip";
    const entries = wanted.get(row) ?? [];
    // One word says it for each hosted file of the row that has the same relation. A relation to the node itself has a word of its own, because it has a line of its own.
    const same = ofFile ? entries.find((entry) => entry.ofFile && entry.text === line.text && entry.tone === line.tone) : undefined;
    if (same === undefined) entries.push({ keys: [line.key], text: line.text, tone: line.tone, ofFile, fileX: ofFile ? stand.centre.x : null, bright: line.bright });
    else {
      same.keys.push(line.key);
      same.bright ||= line.bright;
    }
    wanted.set(row, entries);
  }

  const words: WordBeside[] = [];

  /**
   * What is in the way of a word on a band, each with the air that a word keeps from it.
   * `self`: the row of the word. Its own label is not in the way, because the word starts past it. Its unfolded tool marks are in the way of a word under its name.
   * `own`: the runs that the word can stand on. A gray line is not in the way where such a run covers it. A lit line of a different relation is in the way there also,
   * unless it joins the same two ports as a cable of the word: then the two are one line.
   */
  const takenOn = (band: Band, self: NodeId | null, own: OwnRuns | null, airOfUpright: number): Span[] => {
    const spans: Span[] = [];
    const isOnBand = (y: number): boolean => Math.abs(y - band.y) <= band.half + 1;
    const mine = own === null ? [] : cables.filter((cable) => isLitTone(cable.tone) && own.keys.includes(cable.key));
    const ownRuns: Span[] = [];
    const otherRuns: { readonly span: Span; readonly isGray: boolean }[] = [];
    const keepsOffUprights = (points: readonly Point[]): void => {
      for (const upright of uprightsOf(points)) {
        if (upright.top <= band.y + band.half && upright.bottom >= band.y - band.half) spans.push({ from: upright.x - airOfUpright, to: upright.x + airOfUpright });
      }
    };

    for (const cable of cables) {
      if (cable.tone === "weave") continue;
      keepsOffUprights(cable.points);
      const isMine = mine.includes(cable);
      const isOneLineWithMine = !isMine && isLitTone(cable.tone) && mine.some((other) => isOneLine(other.points, cable.points));
      cable.points.forEach((point, index) => {
        const before = cable.points[index - 1];
        if (before === undefined || before.y !== point.y || !isOnBand(point.y)) return;
        const span = { from: Math.min(before.x, point.x), to: Math.max(before.x, point.x) };
        const isAtItsPlace =
          own === null ? false : "run" in own ? joins(before, point, own.run) : (index === 1 && isAt(before, own.port)) || (own.ends === "either" && index === cable.points.length - 1 && isAt(point, own.port));
        if ((isMine || isOneLineWithMine) && isAtItsPlace) ownRuns.push(span);
        else otherRuns.push({ span, isGray: cable.tone === "frame" });
      });
      if (cable.words !== null && Math.abs(cable.words.at.y - band.y) < band.half + WORD_BOX.height / 2) {
        const reachOfWord = wordWidthOf(cable.words.text) / 2 + WORD_CLEAR.word;
        spans.push({ from: cable.words.at.x - reachOfWord, to: cable.words.at.x + reachOfWord });
      }
      // The word of a relation can take the place of the ring of that relation, because the word says `if`. The ring of a different relation stays.
      const ring = own?.keys.includes(cable.key) === true ? null : cable.gate;
      if (ring !== null && Math.abs(ring.y - band.y) < band.half + GATE.radius) spans.push({ from: ring.x - GATE.radius - BESIDE.gap, to: ring.x + GATE.radius + BESIDE.gap });
    }
    for (const branch of input.rail) {
      keepsOffUprights(branch);
      for (const run of levelRunsOf(branch)) if (isOnBand(run.y)) otherRuns.push({ span: run, isGray: true });
    }
    for (const { span, isGray } of otherRuns) {
      for (const part of isGray ? outside(span, ownRuns) : [span]) spans.push({ from: part.from - BESIDE.gap, to: part.to + BESIDE.gap });
    }
    for (const [id, row] of rows) {
      const chips = input.chipsOf(id);
      if (chips !== null && chips.y < band.y + band.half && chips.y + chips.height > band.y - band.half) spans.push({ from: chips.x - BESIDE.gap, to: chips.x + chips.width + BESIDE.gap });
      if (id === self || Math.abs(row.centre.y - band.y) >= band.half + FRAME.labelHeight / 2) continue;
      const extent = extentOf(id, row);
      spans.push({ from: extent.from - BESIDE.gap, to: extent.to + BESIDE.gap });
    }
    for (const caption of input.captions) {
      const rect = captionRect(caption);
      if (Math.abs(caption.at.y - band.y) >= band.half + rect.height / 2) continue;
      spans.push({ from: rect.x - BESIDE.gap, to: rect.x + rect.width + BESIDE.gap });
    }
    for (const word of words) {
      if (word.box.y < band.y + band.half && word.box.y + word.box.height > band.y - band.half) spans.push({ from: word.box.x - WORD_CLEAR.word, to: word.box.x + word.box.width + WORD_CLEAR.word });
    }
    return spans;
  };

  const isFree = (box: Rect, taken: readonly Span[]): boolean => isInside(box, input.bounds) && taken.every((span) => span.to <= box.x || span.from >= box.x + box.width);

  const placeWordsOf = (id: NodeId, row: Lined, entries: readonly Entry[]): void => {
    const y = row.centre.y;
    const onRow: Band = { y, half: WORD_BOX.height / 2 };
    const underRow: Band = { y: y + BESIDE.under.drop, half: BESIDE.under.height / 2 };
    const outward: 1 | -1 = row.kind === "row" && row.mirrored ? -1 : 1;
    const inward: 1 | -1 = outward === 1 ? -1 : 1;
    const namePort = outward === 1 ? row.right : row.left;
    const otherPort = outward === 1 ? row.left : row.right;
    const nameEnd = outward === 1 ? Math.max(row.label.x + row.label.width, endOfChips(id) ?? Number.NEGATIVE_INFINITY) : row.label.x;
    /** Where the next word starts in each place that can hold more than one word. Under the name, the first word has more than one start. */
    const next: { after: number; under: number | null; other: number } = { after: nameEnd + outward * BESIDE.lead, under: null, other: otherPort.x + inward * BESIDE.lead };

    const boxFrom = (start: number, direction: 1 | -1, width: number, band: Band): Rect => ({ x: direction === 1 ? start : start - width, y: band.y - band.half, width, height: band.half * 2 });
    const boxAround = (centre: Point, width: number): Rect => ({ x: centre.x - width / 2, y: centre.y - WORD_BOX.height / 2, width, height: WORD_BOX.height });

    const afterName = (entry: Entry): Rect | null => {
      const box = boxFrom(next.after, outward, widthOf(entry), onRow);
      if (!isFree(box, takenOn(onRow, id, { keys: entry.keys, port: namePort, ends: "leaves" }, WORD_CLEAR.corner))) return null;
      next.after += outward * (box.width + BESIDE.gap);
      return box;
    };

    /** Only a word of one relation that is not of a hosted file stands on a cable, because a word there has no dot. `startsHere`: the cable leaves this row. */
    const cableOf = (entry: Entry): { readonly cable: CableView; readonly first: Point; readonly last: Point; readonly startsHere: boolean } | null => {
      const [key] = entry.keys;
      const cable = entry.keys.length === 1 && !entry.ofFile ? cables.find((item) => item.key === key && item.tone === entry.tone) : undefined;
      const first = cable?.points[0];
      const last = cable?.points.at(-1);
      if (cable === undefined || first === undefined || last === undefined) return null;
      const startsHere = [namePort, otherPort].some((port) => isAt(first, port));
      const endsHere = [namePort, otherPort].some((port) => isAt(last, port));
      return startsHere || endsHere ? { cable, first, last, startsHere } : null;
    };

    /** `at`: the end of the cable at this row, or the end at the other node. */
    const onItsCable = (entry: Entry, at: "this row" | "the other node"): Rect | null => {
      const found = cableOf(entry);
      if (found === null) return null;
      const { cable } = found;
      const near: "start" | "end" = (at === "this row") === found.startsHere ? "start" : "end";
      const port = near === "start" ? found.first : found.last;
      const airAtArrow = cable.cls === "avoid" ? GATE.arrowRoom : WORD_CLEAR.tight;
      const air = { atEnd: near === "end" ? airAtArrow : BESIDE.gap, atCorner: WORD_CLEAR.tight };
      const width = wordWidthOf(entry.text);
      const band: Band = { y: port.y, half: WORD_BOX.height / 2 };
      const centre = wordOn(cable.points, near, width, air, takenOn(band, at === "this row" ? id : null, { keys: entry.keys, port, ends: "either" }, WORD_CLEAR.tight));
      const box = centre === null ? null : boxAround(centre, width);
      return box !== null && isInside(box, input.bounds) ? box : null;
    };

    /**
     * A level run of the cable that is at no end of it. The run nearest to this row comes first, and the word is at the end of the run that is nearer to this row,
     * so it stays near the name that it is of. Such a run is between two rows, and the box of a word there reaches into each of the two: thus a row directly above or below is in the way.
     */
    const onAMiddleRun = (entry: Entry): Rect | null => {
      const found = cableOf(entry);
      if (found === null) return null;
      const fromHere = found.startsHere ? found.cable.points : found.cable.points.toReversed();
      const width = wordWidthOf(entry.text);
      for (let index = 2; index < fromHere.length - 1; index += 1) {
        const near = fromHere[index - 1];
        const far = fromHere[index];
        if (near === undefined || far === undefined || near.y !== far.y) continue;
        const band: Band = { y: near.y, half: WORD_BOX.height / 2 };
        const taken = takenOn(band, null, { keys: entry.keys, run: [near, far] }, WORD_CLEAR.tight);
        const direction: 1 | -1 = far.x > near.x ? 1 : -1;
        const free = outside({ from: Math.min(near.x, far.x) + WORD_CLEAR.tight, to: Math.max(near.x, far.x) - WORD_CLEAR.tight }, taken).filter((part) => part.to - part.from >= width);
        const nearest = direction === 1 ? free.at(0) : free.at(-1);
        if (nearest === undefined) continue;
        const box = boxFrom(direction === 1 ? nearest.from : nearest.to, direction, width, band);
        if (isInside(box, input.bounds)) return box;
      }
      return null;
    };

    const isOverALitRow = (box: Rect): boolean =>
      rows.some(([other, below]) => {
        if (other === id || !litRows.has(other) || Math.abs(below.centre.y - (y + FRAME.pitch)) > 1) return false;
        const under = extentOf(other, below);
        return under.from < box.x + box.width && box.x < under.to;
      });

    /**
     * Directly below the label. The words start where the name starts, because the glyph of the router is higher than the room there.
     * A word of a hosted file starts at the dot of the file if it has room there.
     * A lit row directly below would be as near to the word as its own name is, so the word has no place over such a row.
     */
    const underName = (entry: Entry): Rect | null => {
      const nameStart = outward === 1 ? row.textX : row.label.x + row.label.width;
      const starts = next.under !== null ? [next.under] : entry.fileX === null ? [nameStart] : [entry.fileX - WORD_BOX.pad - FILE_DOT.radius, nameStart];
      const taken = takenOn(underRow, id, null, BESIDE.gap);
      const box = starts.map((start) => boxFrom(start, outward, widthOf(entry), underRow)).find((candidate) => isFree(candidate, taken) && !isOverALitRow(candidate));
      if (box === undefined) return null;
      next.under = (outward === 1 ? box.x + box.width : box.x) + outward * BESIDE.gap;
      return box;
    };

    const onOtherSide = (entry: Entry): Rect | null => {
      if (input.isTicked(id)) return null;
      const box = boxFrom(next.other, inward, widthOf(entry), onRow);
      if (!isFree(box, takenOn(onRow, id, null, WORD_CLEAR.corner))) return null;
      next.other += inward * (box.width + BESIDE.gap);
      return box;
    };

    for (const entry of entries) {
      const box = afterName(entry) ?? onItsCable(entry, "this row") ?? underName(entry) ?? onOtherSide(entry) ?? onItsCable(entry, "the other node") ?? onAMiddleRun(entry);
      if (box !== null) words.push({ keys: entry.keys, node: id, text: entry.text, tone: entry.tone, bright: entry.bright, ofFile: entry.ofFile, box });
    }
  };

  for (const [id, entries] of wanted) {
    const row = stands.get(id);
    if (row === undefined || row.kind === "pip") continue;
    placeWordsOf(id, row, [...entries.filter((entry) => !entry.ofFile), ...entries.filter((entry) => entry.ofFile)]);
  }

  const isUnderItsWord = (cable: CableView, gate: Point): boolean =>
    words.some(({ keys, box }) => keys.includes(cable.key) && gate.x + GATE.radius >= box.x && gate.x - GATE.radius <= box.x + box.width && gate.y + GATE.radius >= box.y && gate.y - GATE.radius <= box.y + box.height);
  const ungated = new Set(cables.flatMap((cable) => (cable.gate !== null && isUnderItsWord(cable, cable.gate) ? [cable.key] : [])));
  return { words, ungated };
};
