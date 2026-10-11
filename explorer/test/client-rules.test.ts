import { readdirSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { assert, describe, it } from "@effect/vitest";

const SOURCE = nodePath.resolve(import.meta.dirname, "..", "src");
const STYLES = nodePath.join(SOURCE, "client", "styles");

const sourceFilesBelow = (directory: string): string[] =>
  readdirSync(nodePath.join(SOURCE, directory), { recursive: true, encoding: "utf8" })
    .filter((name) => /\.tsx?$/.test(name))
    .sort()
    .map((name) => nodePath.join(directory, name));

interface Rule {
  readonly file: string;
  readonly selectors: readonly string[];
  readonly declarations: string;
}

const rules: readonly Rule[] = readdirSync(STYLES)
  .filter((name) => name.endsWith(".css"))
  .sort()
  .flatMap((file) =>
    [...readFileSync(nodePath.join(STYLES, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
      (match): Rule => ({
        file,
        selectors: (match[1] ?? "").split(",").map((selector) => selector.replace(/\s+/g, " ").trim()),
        declarations: match[2] ?? "",
      }),
    ),
  );

const ruleFor = (file: string, selector: string): Rule => {
  const found = rules.filter((rule) => rule.file === file && rule.selectors.includes(selector));
  assert.strictEqual(found.length, 1, `${file} has ${found.length} rules for ${selector}`);
  return found[0] ?? { file, selectors: [], declarations: "" };
};

const positionOf = (file: string, selector: string): number => rules.indexOf(ruleFor(file, selector));

describe("rules of the client that no type holds", () => {
  it("reads no variable of the environment in the code that the browser loads", () => {
    const hits = [...sourceFilesBelow("shared"), ...sourceFilesBelow("client")].flatMap((file) =>
      readFileSync(nodePath.join(SOURCE, file), "utf8")
        .split("\n")
        .flatMap((line, index) => (/\bprocess\s*(?:\.|\[|\?\.)|\bimport\.meta\.env\b/.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [])),
    );

    assert.isAbove(sourceFilesBelow("shared").length, 10, "the shared files moved");
    assert.include(sourceFilesBelow("shared"), nodePath.join("shared", "address.ts"), "the file with the ports is in the bundle");
    assert.deepStrictEqual(hits, []);
  });

  it("takes the width of the reader from the one number that the camera also leaves room for", () => {
    const isOfTheReader = (selector: string): boolean => /(?:^|[\s>+~])\.reader(?![\w-])[^\s>+~]*$/.test(selector);
    const widths = rules
      .filter((rule) => rule.selectors.some(isOfTheReader))
      .flatMap((rule) => [...rule.declarations.matchAll(/(?:^|;)\s*((?:min-|max-)?width|flex(?:-basis)?)\s*:\s*([^;]+)/g)].map((match) => `${rule.file}: ${rule.selectors.join(", ")} { ${match[1] ?? ""}: ${(match[2] ?? "").trim()} }`));

    assert.deepStrictEqual(widths, ["reader.css: .reader { width: var(--reader) }"]);
    assert.deepStrictEqual(rules.filter((rule) => /(?:^|;)\s*--reader\s*:/.test(rule.declarations)).map((rule) => rule.file), [], "a stylesheet gives the variable a value of its own");
    assert.match(readFileSync(nodePath.join(SOURCE, "client", "App.tsx"), "utf8"), /"--reader": `\$\{stage\.viewport\.reader\}px`/, "the app gives the reader the width that the camera has in `viewport.reader`");
  });

  it("uses the tooling color only for a bundled script and a shell command", () => {
    const users = rules.filter((rule) => /var\(--tooling(?:-rgb)?\)/.test(rule.declarations)).map((rule) => `${rule.file}: ${rule.selectors.join(", ")}`);

    assert.deepStrictEqual(users, [
      "nodes.css: .node",
      "nodes.css: .node .chip-text",
      "nodes.css: .node .chip-box",
      'nodes.css: .node[data-tone="dim"]',
      "reader.css: .facts .tool",
      "tokens.css: :root",
    ]);
    for (const rule of rules.filter((item) => item.file === "nodes.css" && (item.selectors.includes(".node") || item.selectors.includes('.node[data-tone="dim"]')))) {
      const declarations = rule.declarations.split(";").filter((declaration) => declaration.includes("--tooling"));
      assert.isTrue(declarations.every((declaration) => declaration.trim().startsWith("--mark:")), `${rule.selectors.join(", ")}: only the color of a tool mark takes the tooling color`);
    }
  });

  it("takes each font size of the map from a layout constant, because the layouts compute widths from the same numbers", () => {
    const sized: readonly (readonly [file: string, selector: string, variable: string])[] = [
      ["nodes.css", ".node .label", "--label-size"],
      ["nodes.css", ".node .chip-text", "--small-size"],
      ["nodes.css", ".node .fold-count", "--small-size"],
      ["map.css", ".word", "--word-size"],
      ["map.css", ".column-title", "--caption-size"],
    ];
    for (const [file, selector, variable] of sized) {
      const sizes = [...ruleFor(file, selector).declarations.matchAll(/font-size\s*:\s*([^;]+);/g)].map((match) => (match[1] ?? "").trim());
      assert.deepStrictEqual(sizes, [`var(${variable})`], `${file}: ${selector}`);
    }
    assert.match(ruleFor("map.css", ".column-title").declarations, /letter-spacing\s*:\s*var\(--caption-spacing\)/);
  });

  it("dims a node through its color variables, and lets the pointer and the keyboard focus win over the dim", () => {
    const dim = ruleFor("nodes.css", '.node[data-tone="dim"]');
    const properties = dim.declarations.split(";").map((declaration) => declaration.split(":")[0]?.trim() ?? "").filter((property) => property !== "");

    assert.isAbove(properties.length, 3);
    assert.deepStrictEqual(properties.filter((property) => !property.startsWith("--")), [], "a dim node changes its color variables only: an opacity on the group dims the focus ring also");
    for (const rule of rules.filter((item) => item.file === "nodes.css" && item.selectors.some((selector) => selector.includes('data-tone="dim"')))) {
      assert.notMatch(rule.declarations, /(?:^|;)\s*opacity\s*:/, rule.selectors.join(", "));
    }

    const hovered = rules.filter((rule) => rule.file === "nodes.css" && rule.selectors.includes('.node[data-hovered="true"]') && rule.selectors.includes(".node:focus-visible"));
    assert.strictEqual(hovered.length, 1, "one rule gives a node under the pointer and a node with the keyboard focus their full strength");
    const dimRules = rules.flatMap((rule, index) => (rule.file === "nodes.css" && rule.selectors.some((selector) => selector.includes('data-tone="dim"')) && !rule.selectors.some((selector) => selector.includes("hovered")) ? [index] : []));
    assert.isAbove(rules.indexOf(hovered[0] ?? dim), Math.max(...dimRules.filter((index) => rules[index]?.selectors.every((selector) => !selector.includes("hub")) ?? false)), "the rule is after each dim rule that it must win over");
    assert.isAbove(positionOf("nodes.css", '.node[data-glyph="hub"][data-hovered="true"]'), positionOf("nodes.css", '.node[data-glyph="hub"][data-tone="dim"]'));
  });
});
