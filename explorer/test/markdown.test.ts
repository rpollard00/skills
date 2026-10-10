import { assert, describe, it } from "@effect/vitest";
import { blocks, codeSpans, links, proseOnly, resolveLink, slug, slugger, splitFrontmatter } from "../src/shared/markdown";

describe("markdown", () => {
  it("splits frontmatter at the first closing rule only", () => {
    const split = splitFrontmatter("---\nname: a\n---\n\n# Title\n\n---\n\nAfter the rule.\n");
    assert.deepStrictEqual(split, { frontmatter: "name: a\n", body: "\n# Title\n\n---\n\nAfter the rule.\n", bodyLine: 4 });
    assert.deepStrictEqual(splitFrontmatter("# No frontmatter\n"), { frontmatter: null, body: "# No frontmatter\n", bodyLine: 1 });
    assert.strictEqual(splitFrontmatter("---\nname: a\nnever closed\n").frontmatter, null);
  });

  it("splits a body into headings, paragraphs, list items, and fences, with file line numbers", () => {
    const body = [
      "# Title",
      "",
      "A paragraph",
      "on two lines.",
      "",
      "1. First item",
      "   - Nested item",
      "   continued",
      "",
      "   ```bash",
      "   # not a heading",
      "   jj status",
      "   ```",
      "> Quoted `code`.",
      "",
      "---",
      "",
      "Not a fence: (```mermaid) in a sentence.",
    ].join("\n");
    assert.deepStrictEqual(blocks(body, 10), [
      { kind: "heading", line: 10, depth: 1, text: "Title" },
      { kind: "paragraph", line: 12, text: "A paragraph\non two lines." },
      { kind: "item", line: 15, text: "First item" },
      { kind: "item", line: 16, text: "Nested item\ncontinued" },
      { kind: "fence", line: 19, info: "bash", lines: ["   # not a heading", "   jj status"] },
      { kind: "paragraph", line: 23, text: "Quoted `code`." },
      { kind: "paragraph", line: 27, text: "Not a fence: (```mermaid) in a sentence." },
    ]);
  });

  it("does not take a line that starts with inline triple-backtick code as a fence", () => {
    const body = "```code``` at the start of a line.\n\nNext paragraph.\n\n```bash\nls\n```\n\n~~~text with `ticks`\nraw\n~~~\n\nLast paragraph.";
    assert.deepStrictEqual(blocks(body), [
      { kind: "paragraph", line: 1, text: "```code``` at the start of a line." },
      { kind: "paragraph", line: 3, text: "Next paragraph." },
      { kind: "fence", line: 5, info: "bash", lines: ["ls"] },
      { kind: "fence", line: 9, info: "text", lines: ["raw"] },
      { kind: "paragraph", line: 13, text: "Last paragraph." },
    ]);
  });

  it("reads code spans with their offsets, including spans that hold a backtick", () => {
    const text = "Use `jj` and ``a ` b`` here.";
    assert.deepStrictEqual(codeSpans(text), [
      { start: 4, end: 8, content: "jj" },
      { start: 13, end: 22, content: "a ` b" },
    ]);
  });

  it("reads links and images, with a code span as label, and ignores a link inside a code span", () => {
    const text = "See [`x.md`](references/x.md#part) and ![shot](a.png \"title\"), not `[code](no.md)`.";
    assert.deepStrictEqual(
      links(text).map((link) => [link.label, link.href]),
      [["`x.md`", "references/x.md#part"], ["shot", "a.png"]],
    );
    assert.strictEqual(proseOnly(text).length, text.length);
    assert.notInclude(proseOnly(text), "references/x.md");
    assert.include(proseOnly("Read [execution](../mako/references/execution.md) first."), "Read [execution]");
  });

  it("makes the slugs that GitHub makes", () => {
    assert.strictEqual(slug("Phase A: Ground the problem"), "phase-a-ground-the-problem");
    assert.strictEqual(slug("8. States, responsiveness, and motion"), "8-states-responsiveness-and-motion");
    assert.strictEqual(slug("Agent and model routing"), "agent-and-model-routing");
    const next = slugger();
    assert.deepStrictEqual([next("Shape"), next("Shape"), next("Other"), next("Shape")], ["shape", "shape-1", "other", "shape-2"]);
  });

  it("resolves a link against the file that holds it", () => {
    const from = "skills/how/SKILL.md";
    assert.deepStrictEqual(resolveLink({ from, href: "../mako/references/execution.md#agent-and-model-routing" }), {
      kind: "file",
      path: "skills/mako/references/execution.md",
      anchor: "agent-and-model-routing",
    });
    assert.deepStrictEqual(resolveLink({ from, href: "references/explorer-prompt.md" }), { kind: "file", path: "skills/how/references/explorer-prompt.md", anchor: null });
    assert.deepStrictEqual(resolveLink({ from, href: "#shape" }), { kind: "anchor", anchor: "shape" });
    assert.deepStrictEqual(resolveLink({ from, href: "https://jj-vcs.github.io/jj/" }), { kind: "external", url: "https://jj-vcs.github.io/jj/" });
    assert.deepStrictEqual(resolveLink({ from, href: "javascript:alert(1)" }), { kind: "other" });
    assert.deepStrictEqual(resolveLink({ from, href: "mailto:someone@example.invalid" }), { kind: "other" });
    assert.deepStrictEqual(resolveLink({ from, href: "../../../../etc/passwd" }), { kind: "other" });
    assert.deepStrictEqual(resolveLink({ from, href: "../../README.md" }), { kind: "file", path: "README.md", anchor: null });
  });
});
