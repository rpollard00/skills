import { readdirSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { assert, describe, it } from "@effect/vitest";
import { byCodeUnit, sortedBy } from "../src/shared/order";

const SOURCE = nodePath.resolve(import.meta.dirname, "..", "src");

/** `node:fs`, `@effect/platform-node`, and the like, in an import, a dynamic import, or a require. */
const NODE_ONLY = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["'](node:[^"']+|@effect\/platform-node[^"']*)["']/gm;

const nodeOnlyImportsBelow = (directory: string): string[] =>
  readdirSync(nodePath.join(SOURCE, directory), { recursive: true, encoding: "utf8" })
    .filter((name) => /\.tsx?$/.test(name))
    .sort()
    .flatMap((name) => [...readFileSync(nodePath.join(SOURCE, directory, name), "utf8").matchAll(NODE_ONLY)].map((match) => `${directory}/${name}: ${match[1] ?? ""}`));

describe("constraints that hold across the source", () => {
  it("orders names by code unit, which gives the same order on every machine", () => {
    assert.deepStrictEqual(["a", "B", "_", "-", "Z"].sort(byCodeUnit), ["-", "B", "Z", "_", "a"]);
    assert.deepStrictEqual(sortedBy(["grilling", "grill-me", "Grill"], (name) => name), ["Grill", "grill-me", "grilling"]);
  });

  it("keeps the code that the browser loads free of Node imports", () => {
    assert.deepStrictEqual(nodeOnlyImportsBelow("shared"), []);
    assert.deepStrictEqual(nodeOnlyImportsBelow("client"), []);
    assert.include(nodeOnlyImportsBelow("index"), "index/digest.ts: node:crypto");
    assert.include(nodeOnlyImportsBelow("server"), "server/server.ts: @effect/platform-node");
  });
});
