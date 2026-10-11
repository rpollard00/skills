import { assert, describe, it } from "@effect/vitest";
import { Schema } from "effect";
import { WORD_BOX, wordWidthOf, type Caption } from "../src/shared/focus-layout";
import { FRAME, pathOf, type Point, type Rect, type Seat } from "../src/shared/layout";
import { NodeId, relationKey, type RelationKey } from "../src/shared/model";
import { lengthOf } from "../src/shared/polyline";
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
}): Rect | null => {
  const beside = wordsBeside({
    unworded: [wanted],
    stands: new Map<NodeId, Stand>([[NEIGHBOUR, neighbour], ...(input.rows ?? [])]),
    cables: input.cables ?? [],
    captions: input.captions ?? [],
    chipsOf: (node) => (node === NEIGHBOUR ? (input.chips ?? null) : null),
    isLit: (node) => node === NEIGHBOUR || (input.lit ?? []).includes(node),
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
      wordsBeside({ unworded: [short], stands: new Map<NodeId, Stand>([[NEIGHBOUR, neighbour]]), cables, captions: [], chipsOf: () => null, isLit: () => true, bounds: WIDE }).words[0]?.box ?? null;

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
      wordsBeside({ unworded: [wanted], stands: new Map<NodeId, Stand>([[NEIGHBOUR, shortName]]), cables: [afterTheName], captions: [], chipsOf: () => marks, isLit: () => true, bounds: WIDE }).words[0]?.box ?? null;

    assert.deepStrictEqual(placeWith(null), UNDER_THE_NAME, "with the marks folded, the word is under the name");
    assert.deepStrictEqual(placeWith(chips), ON_THE_OTHER_SIDE, "the unfolded marks reach over the place under the name");
  });

  it("has no place when each place has something in it", () => {
    const below: readonly [NodeId, Stand] = [BELOW, seatAt(200, 100 + FRAME.pitch)];
    const arrivesOnTheOtherSide = lineOf(relationKey({ from: BELOW, to: NEIGHBOUR }), "in", [{ x: 100, y: 60 }, { x: 100, y: 100 }, neighbour.left]);

    assert.isNull(place({ rows: [below], lit: [BELOW], cables: [strangerAfterTheName, arrivesOnTheOtherSide] }));
  });
});
