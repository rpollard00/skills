import { assert, describe, it } from "@effect/vitest";
import { Schema } from "effect";
import { WORD_BOX, wordWidthOf, type Caption } from "../src/shared/focus-layout";
import { FRAME, pathOf, type Point, type Rect, type Seat } from "../src/shared/layout";
import { NodeId, relationKey, type RelationKey } from "../src/shared/model";
import { lengthOf, WORD_CLEAR } from "../src/shared/polyline";
import type { Stand } from "../src/shared/view/arranged";
import { BESIDE, wordsBeside } from "../src/shared/view/beside";
import type { Unworded } from "../src/shared/view/lit";
import type { CableTone, CableView } from "../src/shared/view/scene";

const id = Schema.decodeUnknownSync(NodeId);

const NAME_CHARS = 8;

/** A row of the rest map: the glyph at `x`, then a name of eight characters, then the right port. */
const seatAt = (x: number, y: number): Seat => {
  const textX = x + FRAME.labelInset - FRAME.glyphInset;
  const labelEnd = textX + NAME_CHARS * FRAME.charWidth;
  return {
    kind: "seat",
    column: "skills",
    row: 0,
    centre: { x, y },
    text: "a".repeat(NAME_CHARS),
    textX,
    label: { x: textX, y: y - FRAME.labelHeight / 2, width: labelEnd - textX, height: FRAME.labelHeight },
    left: { x: x - FRAME.glyphInset - FRAME.portGap, y },
    right: { x: labelEnd + FRAME.portGap, y },
    marks: [],
    foldedPips: null,
    leader: "",
  };
};

const lineOf = (key: RelationKey, tone: CableTone, points: readonly Point[]): CableView => ({
  key,
  d: pathOf(points),
  points,
  rest: "",
  cls: "flow",
  weight: "light",
  tone,
  conditional: false,
  words: null,
  gate: null,
  back: null,
  end: points.at(-1) ?? { x: 0, y: 0 },
  arrives: 1,
  length: lengthOf(points),
  order: 0,
  bright: false,
});

const NEIGHBOUR = id("skill:neighbour");
const LEAD = id("skill:lead");
const BELOW = id("skill:below");
const BESIDE_IT = id("skill:beside-it");
const KEY = relationKey({ from: LEAD, to: NEIGHBOUR });
const WIDE: Rect = { x: -1000, y: -1000, width: 3000, height: 3000 };

const neighbour = seatAt(200, 100);
const labelEnd = neighbour.label.x + neighbour.label.width;
const width = wordWidthOf("runs");
const wanted: Unworded = { key: KEY, text: "runs", tone: "out", neighbour: NEIGHBOUR, bright: false };

const AFTER_THE_NAME: Rect = { x: labelEnd + BESIDE.lead, y: 100 - WORD_BOX.height / 2, width, height: WORD_BOX.height };
const UNDER_THE_NAME: Rect = { x: neighbour.textX, y: 100 + BESIDE.under.drop - BESIDE.under.height / 2, width, height: BESIDE.under.height };
const ON_THE_OTHER_SIDE: Rect = { x: neighbour.left.x - BESIDE.lead - width, y: 100 - WORD_BOX.height / 2, width, height: WORD_BOX.height };

const place = (input: {
  readonly rows?: readonly (readonly [NodeId, Stand])[];
  readonly cables?: readonly CableView[];
  readonly captions?: readonly Caption[];
  readonly lit?: readonly NodeId[];
  readonly bounds?: Rect;
  readonly chips?: Rect;
  readonly rail?: readonly (readonly Point[])[];
  readonly ticked?: readonly NodeId[];
}): Rect | null => {
  const beside = wordsBeside({
    unworded: [wanted],
    stands: new Map<NodeId, Stand>([[NEIGHBOUR, neighbour], ...(input.rows ?? [])]),
    cables: input.cables ?? [],
    rail: input.rail ?? [],
    captions: input.captions ?? [],
    chipsOf: (node) => (node === NEIGHBOUR ? (input.chips ?? null) : null),
    isLit: (node) => node === NEIGHBOUR || (input.lit ?? []).includes(node),
    isTicked: (node) => (input.ticked ?? []).includes(node),
    bounds: input.bounds ?? WIDE,
  });
  return beside.words[0]?.box ?? null;
};

/** A line of a different relation that arrives at the name port, so its last run and its arrowhead are after the name. */
const strangerAfterTheName = lineOf(relationKey({ from: BESIDE_IT, to: NEIGHBOUR }), "in", [{ x: 400, y: 60 }, { x: 400, y: 100 }, neighbour.right]);

describe("the place of a word that has no room on its line", () => {
  it("is after the name when nothing is there", () => {
    assert.deepStrictEqual(place({}), AFTER_THE_NAME);
  });

  it("is not after the name when a row, a caption, a line of a different relation, or the edge of the stage is there: it is under the name", () => {
    const rowThere: readonly [NodeId, Stand] = [BESIDE_IT, seatAt(labelEnd + 40, 100)];
    const captionThere: Caption = { key: "right:skills", group: "skills", count: 3, at: { x: labelEnd + 20, y: 100 }, anchor: "start", column: labelEnd };
    const edgeThere: Rect = { ...WIDE, width: labelEnd + BESIDE.lead + width - 1 - WIDE.x };

    assert.deepStrictEqual(place({ rows: [rowThere] }), UNDER_THE_NAME, "a row");
    assert.deepStrictEqual(place({ captions: [captionThere] }), UNDER_THE_NAME, "a caption");
    assert.deepStrictEqual(place({ cables: [strangerAfterTheName] }), UNDER_THE_NAME, "a line of a different relation");
    assert.deepStrictEqual(place({ bounds: edgeThere }), UNDER_THE_NAME, "the edge of what the camera fits");
  });

  it("is on the first part of its own line after the name, and not when a second line uses that part", () => {
    const own = lineOf(KEY, "out", [neighbour.right, { x: neighbour.right.x + 30, y: 100 }, { x: neighbour.right.x + 30, y: 300 }]);
    const sharer = lineOf(relationKey({ from: NEIGHBOUR, to: BELOW }), "out", [neighbour.right, { x: neighbour.right.x + 30, y: 100 }, { x: neighbour.right.x + 30, y: 500 }]);
    const short = { ...wanted, text: "r" };
    const placeShort = (cables: readonly CableView[]): Rect | null =>
      wordsBeside({ unworded: [short], stands: new Map<NodeId, Stand>([[NEIGHBOUR, neighbour]]), cables, rail: [], captions: [], chipsOf: () => null, isLit: () => true, isTicked: () => false, bounds: WIDE }).words[0]?.box ?? null;

    assert.strictEqual(placeShort([own])?.x, AFTER_THE_NAME.x, "the word is on its own line");
    assert.strictEqual(placeShort([own])?.y, AFTER_THE_NAME.y);
    assert.strictEqual(placeShort([own, sharer])?.y, UNDER_THE_NAME.y, "two lines use the part after the name, so the word of one of them has no place there");
  });

  it("is not under the name when a lit row is directly below the word, a line is there, or the tool marks of its own row are there: it is on the other side", () => {
    const below: readonly [NodeId, Stand] = [BELOW, seatAt(200, 100 + FRAME.pitch)];
    const blocked = { cables: [strangerAfterTheName] };
    const street = lineOf(relationKey({ from: BESIDE_IT, to: BELOW }), "out", [{ x: 150, y: 100 + FRAME.pitch / 2 }, { x: 400, y: 100 + FRAME.pitch / 2 }]);
    assert.deepStrictEqual(place({ ...blocked, rows: [below] }), UNDER_THE_NAME, "a row that is not lit is below: the word is nearer to its own name");
    assert.deepStrictEqual(place({ ...blocked, rows: [below], lit: [BELOW] }), ON_THE_OTHER_SIDE, "a lit row is below");
    assert.deepStrictEqual(place({ cables: [strangerAfterTheName, street] }), ON_THE_OTHER_SIDE, "a line goes between the two rows");
  });

  it("is not under a short name when the tool marks of its own row are there", () => {
    const shortEnd = neighbour.textX + FRAME.charWidth;
    const shortName: Stand = { ...neighbour, text: "a", label: { ...neighbour.label, width: FRAME.charWidth }, right: { x: shortEnd + FRAME.portGap, y: 100 } };
    const chips: Rect = { x: shortEnd, y: 100 - 8, width: 80, height: 16 };
    const afterTheName = lineOf(relationKey({ from: BESIDE_IT, to: BELOW }), "out", [{ x: shortEnd + 10, y: 100 }, { x: 600, y: 100 }]);
    const placeWith = (marks: Rect | null): Rect | null =>
      wordsBeside({ unworded: [wanted], stands: new Map<NodeId, Stand>([[NEIGHBOUR, shortName]]), cables: [afterTheName], rail: [], captions: [], chipsOf: () => marks, isLit: () => true, isTicked: () => false, bounds: WIDE }).words[0]?.box ?? null;

    assert.deepStrictEqual(placeWith(null), UNDER_THE_NAME, "with the marks folded, the word is under the name");
    assert.deepStrictEqual(placeWith(chips), ON_THE_OTHER_SIDE, "the unfolded marks reach over the place under the name");
  });

  it("has no place when each place has something in it", () => {
    const below: readonly [NodeId, Stand] = [BELOW, seatAt(200, 100 + FRAME.pitch)];
    const arrivesOnTheOtherSide = lineOf(relationKey({ from: BELOW, to: NEIGHBOUR }), "in", [{ x: 100, y: 60 }, { x: 100, y: 100 }, neighbour.left]);

    assert.isNull(place({ rows: [below], lit: [BELOW], cables: [strangerAfterTheName, arrivesOnTheOtherSide] }));
  });

  it("is not on the other side when a branch of the rail is there, or when the row shows a mark of the router there", () => {
    const below: readonly [NodeId, Stand] = [BELOW, seatAt(200, 100 + FRAME.pitch)];
    const onlyTheOtherSide = { rows: [below], lit: [BELOW], cables: [strangerAfterTheName] };
    const branch: Point[] = [{ x: 100, y: 60 }, { x: 100, y: 100 }, neighbour.left];
    const trunkThroughTheRoom: Point[] = [{ x: neighbour.left.x - BESIDE.lead - width / 2, y: 0 }, { x: neighbour.left.x - BESIDE.lead - width / 2, y: 300 }];

    assert.deepStrictEqual(place(onlyTheOtherSide), ON_THE_OTHER_SIDE);
    assert.isNull(place({ ...onlyTheOtherSide, rail: [branch] }), "the branch of the rail comes to the row there, and the word is of a different relation");
    assert.isNull(place({ ...onlyTheOtherSide, rail: [trunkThroughTheRoom] }), "the rail goes up and down there");
    assert.isNull(place({ ...onlyTheOtherSide, ticked: [NEIGHBOUR] }), "a word before the mark of the router reads as a relation into the node");
    assert.deepStrictEqual(place({ ...onlyTheOtherSide, ticked: [BELOW] }), ON_THE_OTHER_SIDE, "the mark is on a different row");
  });

  it("is not on its own line when that place is outside what the camera fits: it is under the name", () => {
    const own = lineOf(KEY, "out", [neighbour.right, { x: neighbour.right.x + 200, y: 100 }, { x: neighbour.right.x + 200, y: 300 }]);
    const toTheEndOfTheName: Rect = { ...WIDE, width: neighbour.right.x - WIDE.x };

    assert.deepStrictEqual(place({ cables: [own] }), AFTER_THE_NAME, "with room, the word is on the first part of its line");
    assert.deepStrictEqual(place({ cables: [own], bounds: toTheEndOfTheName }), UNDER_THE_NAME, "the line goes on past what the camera fits, and the word does not");
  });

  describe("on a level part in the middle of its line", () => {
    const street = 100 + FRAME.pitch * 2.5;
    const corner = { x: neighbour.right.x + 10, y: 100 };
    /** The line leaves the row, goes down in a gutter that is too near for a word, and goes right between two rows. */
    const own = lineOf(KEY, "out", [neighbour.right, corner, { x: corner.x, y: street }, { x: 700, y: street }, { x: 700, y: street + FRAME.pitch / 2 }, { x: 720, y: street + FRAME.pitch / 2 }]);
    const below: readonly [NodeId, Stand] = [BELOW, seatAt(200, 100 + FRAME.pitch)];
    const noPlaceAtTheRow = { rows: [below], lit: [BELOW], cables: [own], ticked: [NEIGHBOUR] };
    const atTheNearEnd: Rect = { x: corner.x + WORD_CLEAR.tight, y: street - WORD_BOX.height / 2, width, height: WORD_BOX.height };

    it("is at the end of that part that is nearer to its row, when no place at the row is free", () => {
      assert.deepStrictEqual(place(noPlaceAtTheRow), atTheNearEnd);
      assert.deepStrictEqual(place({ ...noPlaceAtTheRow, ticked: [] }), ON_THE_OTHER_SIDE, "a place at the row comes first");
    });

    it("has no place when the level part is outside what the camera fits", () => {
      const toTheEndOfTheRow: Rect = { ...WIDE, width: neighbour.right.x - WIDE.x };
      const toTheLevelPart: Rect = { ...WIDE, height: street - WORD_BOX.height / 2 + 1 - WIDE.y };

      assert.isNull(place({ ...noPlaceAtTheRow, bounds: toTheEndOfTheRow }), "the level part is past the right edge");
      assert.isNull(place({ ...noPlaceAtTheRow, bounds: toTheLevelPart }), "the lower part of the word is past the lower edge");
    });

    it("is past a row that is directly above or below, and has no place when such rows leave no room", () => {
      const rowAbove = seatAt(corner.x + 20, street - FRAME.pitch / 2);
      const rowBelow = seatAt(corner.x + 20, street + FRAME.pitch / 2);
      const pastTheRow: Rect = { ...atTheNearEnd, x: rowAbove.right.x + BESIDE.gap };
      const longRowBelow: Stand = { ...rowBelow, right: { x: 700, y: rowBelow.centre.y } };

      assert.deepStrictEqual(place({ ...noPlaceAtTheRow, rows: [below, [BESIDE_IT, rowAbove]] }), pastTheRow, "a row above");
      assert.deepStrictEqual(place({ ...noPlaceAtTheRow, rows: [below, [BESIDE_IT, rowBelow]] }), pastTheRow, "a row below");
      assert.isNull(place({ ...noPlaceAtTheRow, rows: [below, [BESIDE_IT, longRowBelow]] }));
    });

    it("is only where no other lit line uses that part", () => {
      const sharer = (from: number, to: number): CableView => lineOf(relationKey({ from: BESIDE_IT, to: BELOW }), "out", [{ x: from, y: street }, { x: to, y: street }]);
      const pastTheSharer: Rect = { ...atTheNearEnd, x: 400 + BESIDE.gap };

      assert.deepStrictEqual(place({ ...noPlaceAtTheRow, cables: [own, sharer(corner.x, 400)] }), pastTheSharer, "the first part is of two lines, so the word is on the part that is of its own line only");
      assert.isNull(place({ ...noPlaceAtTheRow, cables: [own, sharer(corner.x, 700)] }), "each part is of two lines");
      assert.deepStrictEqual(place({ ...noPlaceAtTheRow, cables: [own, { ...sharer(corner.x, 700), tone: "frame" }] }), atTheNearEnd, "a gray line under its own lit line is not in the way");
    });

    it("is not for the word of a hosted file, which has a dot that ties it to its row", () => {
      const file = id("hosted:skills/neighbour/notes.md");
      const pip: Stand = { kind: "pip", host: NEIGHBOUR, slot: 0, centre: { x: labelEnd - 4, y: 100 }, folded: false };
      const ofFile: Unworded = { ...wanted, key: relationKey({ from: LEAD, to: file }), neighbour: file };
      const words = wordsBeside({
        unworded: [ofFile],
        stands: new Map<NodeId, Stand>([[NEIGHBOUR, neighbour], [file, pip], below]),
        cables: [strangerAfterTheName, { ...own, key: ofFile.key }],
        rail: [],
        captions: [],
        chipsOf: () => null,
        isLit: () => true,
        isTicked: () => true,
        bounds: WIDE,
      }).words;
      assert.deepStrictEqual(words, []);
    });
  });
});

describe("two words on one level", () => {
  const second = id("skill:second");
  const other: Unworded = { ...wanted, key: relationKey({ from: LEAD, to: second }), neighbour: second };

  it("puts the second word of one row after the first one", () => {
    const again: Unworded = { ...wanted, key: relationKey({ from: NEIGHBOUR, to: LEAD }), tone: "in" };
    const boxes = wordsBeside({ unworded: [wanted, again], stands: new Map<NodeId, Stand>([[NEIGHBOUR, neighbour]]), cables: [], rail: [], captions: [], chipsOf: () => null, isLit: () => true, isTicked: () => false, bounds: WIDE }).words.map((word) => word.box);

    assert.deepStrictEqual(boxes, [AFTER_THE_NAME, { ...AFTER_THE_NAME, x: AFTER_THE_NAME.x + width + BESIDE.gap }]);
  });

  it("keeps the word of a row off the word that an earlier row has in the room between the two", () => {
    /** The word before the second name starts in the middle of the word after the first name. Nothing but that word is in its place. */
    const beforeTheSecondName: Rect = { ...AFTER_THE_NAME, x: AFTER_THE_NAME.x + width / 2 };
    const next = seatAt(beforeTheSecondName.x + width + BESIDE.lead + FRAME.portGap + FRAME.glyphInset, 100);
    const below: readonly [NodeId, Stand] = [BELOW, seatAt(next.centre.x, 100 + FRAME.pitch)];
    const endsAtTheSecondName: Rect = { ...WIDE, width: next.right.x - WIDE.x };
    const placed = (unworded: readonly Unworded[]): (readonly [NodeId, Rect])[] =>
      wordsBeside({
        unworded,
        stands: new Map<NodeId, Stand>([[NEIGHBOUR, neighbour], [second, next], below]),
        cables: [],
        rail: [],
        captions: [],
        chipsOf: () => null,
        isLit: () => true,
        isTicked: () => false,
        bounds: endsAtTheSecondName,
      }).words.map((word) => [word.node, word.box]);

    assert.deepStrictEqual(placed([other]), [[second, beforeTheSecondName]], "alone, the word of the second row is on its other side");
    assert.deepStrictEqual(placed([wanted]), [[NEIGHBOUR, AFTER_THE_NAME]], "alone, the word of the first row is after its name");
    assert.deepStrictEqual(placed([wanted, other]), [[NEIGHBOUR, AFTER_THE_NAME]], "the first word is there, so the second word has no place");
  });
});
