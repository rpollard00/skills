import { readdirSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { assert, describe, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Legend } from "../src/client/Legend";
import { GLYPH_NAMES } from "../src/client/SkillMap";
import { EdgeKind } from "../src/shared/model";
import { CABLE_CLASSES, classOf, weightOf, wordOf, wordsOf } from "../src/shared/view/cable-class";
import { GLYPHS } from "../src/shared/view/scene";

const CLIENT = nodePath.resolve(import.meta.dirname, "..", "src", "client");
const SHARED = nodePath.resolve(CLIENT, "..", "shared");

describe("solid lines only", () => {
  it("has no dash pattern in a stylesheet, in a component, or in a shared file that a component can take a style from", () => {
    const files = readdirSync(CLIENT, { recursive: true, encoding: "utf8" }).filter((name) => /\.(css|tsx?)$/.test(name));
    const shared = readdirSync(SHARED, { recursive: true, encoding: "utf8" }).filter((name) => /\.tsx?$/.test(name));
    const pattern = /dash-?array|dash-?offset|pathLength|\bdashed\b|\bdotted\b/i;
    const hits = [...files.map((name) => nodePath.join(CLIENT, name)), ...shared.map((name) => nodePath.join(SHARED, name)), nodePath.resolve(CLIENT, "..", "..", "index.html")].flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, index) => (pattern.test(line) ? [`${nodePath.relative(CLIENT, file)}:${index + 1}: ${line.trim()}`] : [])),
    );

    assert.isAbove(files.filter((name) => name.endsWith(".css")).length, 5, "the stylesheets moved");
    assert.isAbove(files.filter((name) => name.endsWith(".tsx")).length, 8, "the components moved");
    assert.isAbove(shared.length, 20, "the shared files moved");
    assert.deepStrictEqual(hits, []);
  });

  it("gives each kind of relation a weight and a word, from the one list of kinds", () => {
    const words = EdgeKind.literals.map(wordOf);

    assert.deepStrictEqual(new Set(words).size, EdgeKind.literals.length, "two kinds have the same word");
    assert.isTrue(words.every((word) => /^[a-z]+( [a-z]+)*$/.test(word)), words.join(", "));
    assert.deepStrictEqual([wordOf("applies-principle"), wordOf("see-also"), wordOf("runs")], ["applies", "see also", "runs"]);
    assert.deepStrictEqual([wordsOf({ kinds: ["requires"], conditional: true }), wordsOf({ kinds: ["requires"], conditional: false })], ["requires if", "requires"]);
    assert.deepStrictEqual(
      EdgeKind.literals.filter((kind) => weightOf(classOf(kind)) === "strong"),
      ["route", "trigger", "runs", "requires", "handoff"],
      "a strong line is for a relation in which the source acts through the target",
    );
  });
});

describe("the Key", () => {
  const html = renderToStaticMarkup(<Legend muted={new Set()} onMute={() => undefined} onClose={() => undefined} />);

  it("has one row for each glyph and one switch for each class, from the lists that the map draws from", () => {
    for (const glyph of GLYPHS) assert.isTrue(html.includes(`data-glyph="${glyph}"`) && html.includes(GLYPH_NAMES[glyph]), glyph);
    assert.strictEqual(html.match(/class="legend-switch"/g)?.length, CABLE_CLASSES.length);
    for (const kind of EdgeKind.literals) {
      assert.strictEqual(html.split(`${wordOf(kind)}`).length - 1 >= 1, true, `the Key has no row with the word of ${kind}`);
    }
  });

  it("shows each class at the weight that the map draws it, and a bar only for `boundary`", () => {
    const switches = html.split('class="legend-switch"').slice(1);
    assert.deepStrictEqual(
      switches.map((row) => /data-weight="([a-z]+)"/.exec(row)?.[1]),
      CABLE_CLASSES.map((cls) => weightOf(cls)),
    );
    assert.deepStrictEqual(
      switches.map((row) => row.split("</button>")[0]?.includes("legend-line bar")),
      CABLE_CLASSES.map((cls) => cls === "avoid"),
    );
    assert.isTrue(html.includes("legend-line gate") && html.includes("with a condition: if"));
  });
});
