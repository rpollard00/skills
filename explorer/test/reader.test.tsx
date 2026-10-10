import { readFileSync } from "node:fs";
import nodePath from "node:path";
import { assert, describe, it } from "@effect/vitest";
import { Schema } from "effect";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineText } from "../src/client/LiveName";
import { Markdown, type MarkdownProps } from "../src/client/Markdown";
import { OriginFact } from "../src/client/OriginFact";
import { splitFrontmatter } from "../src/shared/markdown";
import { NodeId } from "../src/shared/model";
import { LIVE_REPO } from "./support";

const id = Schema.decodeUnknownSync(NodeId);

const render = (text: string, props: Partial<MarkdownProps> = {}): string =>
  renderToStaticMarkup(
    <Markdown
      text={text}
      path="skills/alpha/SKILL.md"
      firstLine={1}
      names={new Map([["beta", id("skill:beta")]])}
      mark={null}
      hrefOf={(path, anchor) => `#/?doc=${path}${anchor === null ? "" : `&anchor=${anchor}`}`}
      onPick={() => undefined}
      onHover={() => undefined}
      onFollow={() => undefined}
      {...props}
    />,
  );

describe("the reader's markdown", () => {
  it("shows the placeholder tokens of the reflect references as text", () => {
    const source = readFileSync(nodePath.join(LIVE_REPO, "skills", "reflect", "references", "synthesizer.md"), "utf8");
    const { body, bodyLine } = splitFrontmatter(source);
    const html = render(body, { path: "skills/reflect/references/synthesizer.md", firstLine: bodyLine });

    assert.isTrue(source.includes("<JUDGMENT_OUTPUT>"), "the reference no longer holds the placeholder");
    for (const token of ["JUDGMENT_OUTPUT", "TOOLING_OUTPUT", "DIVERGENT_OUTPUT"]) {
      assert.isTrue(html.includes(`&lt;${token}&gt;`), `${token} is not visible`);
      assert.isFalse(new RegExp(`<${token}`, "i").test(html), `${token} became an element`);
    }
  });

  it("never makes an element from HTML in the source", () => {
    const html = render(
      ["Inline <script>alert(1)</script> text and <b onclick=\"x()\">bold</b>.", "", "<script>", "alert(2)", "</script>", "", "<img src=\"http://example.invalid/a.png\" onerror=\"x()\">"].join("\n"),
    );

    assert.isFalse(/<script|<b[ >]|<img|<[a-z]+ [^>]*on[a-z]+=/i.test(html), html);
    assert.isTrue(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.isTrue(html.includes('<p data-line="3" class="html-text">&lt;script&gt;'));
  });

  it("makes a code span with the name of a skill live", () => {
    const html = render("Apply `beta` first. Then `/beta` and `$beta`. Not `betamax` and not `gamma`.\n\n```bash\nbeta\n```\n");

    assert.strictEqual(html.match(/<button type="button" class="live" data-live="skill:beta">/g)?.length, 3);
    assert.isTrue(html.includes("<code>betamax</code>") && html.includes("<code>gamma</code>"));
    assert.isTrue(html.includes('<pre data-line="3"><code class="language-bash">beta\n</code></pre>'), "a fence is not a name");
  });

  it("resolves a relative link in the app, opens an http link in a new tab, and shows a different scheme as text", () => {
    const html = render(
      [
        "[execution](../mako/references/execution.md#lookup), [notes](references/notes.md), [here](#use), [site](https://example.invalid/a),",
        "[run](javascript:alert(1)), [mail](mailto:a@example.invalid), [up](../../../../etc/passwd), ![shot](https://example.invalid/shot.png)",
      ].join("\n"),
    );

    assert.isTrue(html.includes('<a href="#/?doc=skills/mako/references/execution.md&amp;anchor=lookup" data-doc="skills/mako/references/execution.md">execution</a>'));
    assert.isTrue(html.includes('<a href="#/?doc=skills/alpha/references/notes.md" data-doc="skills/alpha/references/notes.md">notes</a>'));
    assert.isTrue(html.includes('<a href="#/?doc=skills/alpha/SKILL.md&amp;anchor=use" data-doc="skills/alpha/SKILL.md">here</a>'));
    assert.isTrue(html.includes('<a href="https://example.invalid/a" target="_blank" rel="noreferrer noopener">site</a>'));
    for (const label of ["run", "mail", "up", "shot"]) assert.isTrue(html.includes(`<span class="plain-link">${label}</span>`), label);
    assert.isFalse(/javascript:|mailto:|<img|etc\/passwd/.test(html), html);
    assert.strictEqual(html.match(/<a /g)?.length, 4);
  });

  it("gives each heading the slug that GitHub gives it", () => {
    const html = render("# Phase triggers\n\n## Use `beta` & more!\n\n## Phase triggers\n\n### Línea *dos*\n");

    assert.isTrue(html.includes('<h1 id="phase-triggers" data-line="1">'));
    assert.isTrue(html.includes('<h2 id="use-beta--more" data-line="3">'));
    assert.isTrue(html.includes('<h2 id="phase-triggers-1" data-line="5">'));
    assert.isTrue(html.includes('<h3 id="línea-dos" data-line="7">'));
  });

  it("marks the block that holds the evidence line, by the line number of the file", () => {
    const body = "Intro.\n\n- First item\n  goes on.\n- Second item names `beta`.\n\nLast.\n";
    const html = render(body, { firstLine: 6, mark: 10 });

    assert.isTrue(html.includes('<li data-line="10"><div class="marked">Second item names'));
    assert.strictEqual(html.match(/class="marked"/g)?.length, 1);
    assert.isTrue(render(body, { firstLine: 6, mark: 9 }).includes('<li data-line="8"><div class="marked">First item'));
    assert.isTrue(render(body, { firstLine: 6, mark: 6 }).includes('<p data-line="6" class="marked">Intro.</p>'));
    assert.isFalse(render(body, { firstLine: 6, mark: 99 }).includes("marked"));
  });

  it("marks the text of a list item and not the items below it", () => {
    const body = "1. Plan the fix. Apply `beta` first.\n   - **Elimination.** Ask if it must exist.\n   - **Caching.** Store the result.\n2. Compare.\n";
    const html = render(body, { mark: 1 });

    assert.isTrue(html.includes('<li data-line="1"><div class="marked">Plan the fix.'), html);
    const marked = /<div class="marked">(.*?)<\/div>/s.exec(html)?.[1] ?? "";
    assert.isTrue(marked.includes('data-live="skill:beta"'));
    assert.isFalse(marked.includes("Elimination"), "the nested items are outside the mark");
    assert.isTrue(html.includes("</div>\n<ul>") || html.includes("</div><ul>"), html);
    assert.isTrue(render(body, { mark: 2 }).includes('<li data-line="2"><div class="marked"><strong>Elimination.</strong>'));
  });

  it("marks the fence that holds a line of a command", () => {
    const body = "Run it:\n\n```bash\n./scripts/measure.sh one\n./scripts/measure.sh two\n```\n\nAfter.\n";

    for (const line of [3, 4, 5, 6]) {
      const html = render(body, { mark: line });
      assert.isTrue(html.includes('<pre data-line="3" class="marked">'), `line ${line} of the file is in the fence`);
      assert.strictEqual(html.match(/class="marked"/g)?.length, 1);
    }
    assert.isTrue(render(body, { mark: 8 }).includes('<p data-line="8" class="marked">After.</p>'));
    assert.isFalse(render(body, { mark: 7 }).includes("marked"), "the empty line after the fence is in no block");
  });
});

describe("CommonMark only in the reader", () => {
  it("shows a pipe table, a bare address, strikethrough, and a task list as written", () => {
    const html = render(
      ["| Mode | Rule |", "| --- | --- |", "| `beta` | two |", "", "See https://example.invalid/x and www.example.invalid/y.", "", "~~old~~ text", "", "- [x] done", "- [ ] open"].join("\n"),
    );

    assert.isFalse(/<table|<th|<td|<del|<input|<a /.test(html), html);
    assert.isTrue(html.includes('<p data-line="1">| Mode | Rule |\n| --- | --- |\n| '), "the pipes of a table show as text");
    assert.isTrue(html.includes('data-live="skill:beta"'), "a name between the pipes is live, as in each paragraph");
    assert.isTrue(html.includes("See https://example.invalid/x and www.example.invalid/y."), "a bare address is text");
    assert.isTrue(html.includes("~~old~~ text"));
    assert.isTrue(html.includes("[x] done") && html.includes("[ ] open"));
  });

  it("shows the example table of the visual-mockups reference as code: the file has it in a `markdown` fence", () => {
    const source = readFileSync(nodePath.join(LIVE_REPO, "skills", "ui-design", "references", "VISUAL-MOCKUPS.md"), "utf8");
    const { body, bodyLine } = splitFrontmatter(source);
    const html = render(body, { path: "skills/ui-design/references/VISUAL-MOCKUPS.md", firstLine: bodyLine });
    const fence = /<pre data-line="\d+"><code class="language-markdown">([\s\S]*?)<\/code><\/pre>/.exec(html)?.[1] ?? "";

    assert.isTrue(fence.includes("| Alternative | State | Viewport |"), "the reference no longer holds the example in a fence");
  });
});

describe("one line of text outside a document", () => {
  const live = { names: new Map([["how", id("skill:how")], ["why", id("skill:why")]]), onPick: () => undefined, onHover: () => undefined };

  it("shows a code span as code, with no backtick", () => {
    const html = renderToStaticMarkup(<InlineText text="Runs the `how` and `why` skills, then `rg --files`." />);

    assert.strictEqual(html, "Runs the <code>how</code> and <code>why</code> skills, then <code>rg --files</code>.");
  });

  it("makes the name of a skill live when the place can select a node", () => {
    const html = renderToStaticMarkup(<InlineText text="Runs the `how` and `/why` skills with `<b>`. A lone ` stays." live={live} />);

    assert.strictEqual(html.match(/class="live"/g)?.length, 2);
    assert.isTrue(html.includes('data-live="skill:how"') && html.includes('data-live="skill:why"'));
    assert.isTrue(html.includes("<code>&lt;b&gt;</code>"), "the content of a span is text");
    assert.isTrue(html.endsWith("A lone ` stays."));
  });
});

describe("the origin of a skill", () => {
  const imported = { kind: "imported", upstream: "pstack", revision: "0123456789abcdef", source: "pstack/skills/teach/SKILL.md" } as const;

  it("shows the upstream source path, and links an http repository in a new tab", () => {
    const html = renderToStaticMarkup(<OriginFact origin={{ ...imported, repository: "https://example.invalid/pstack" }} />);

    assert.isTrue(html.includes("Imported from pstack, revision <code>0123456789</code>."));
    assert.isTrue(html.includes("Source <code>pstack/skills/teach/SKILL.md</code> in"));
    assert.isTrue(html.includes('<a href="https://example.invalid/pstack" target="_blank" rel="noreferrer noopener">example.invalid/pstack</a>'));
  });

  it("makes no link from a repository with a different scheme", () => {
    for (const repository of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "//example.invalid/x", "skills/alpha"]) {
      const html = renderToStaticMarkup(<OriginFact origin={{ ...imported, repository }} />);
      assert.isFalse(html.includes("<a "), repository);
      assert.isTrue(html.includes('<span class="plain-link">'), repository);
    }
  });

  it("says when the skill is from this repository, and when there is no record", () => {
    assert.strictEqual(renderToStaticMarkup(<OriginFact origin={{ kind: "original" }} />), "Written in this repository.");
    assert.strictEqual(renderToStaticMarkup(<OriginFact origin={{ kind: "unknown" }} />), "No record.");
  });
});
