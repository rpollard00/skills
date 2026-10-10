import { assert, describe, it } from "@effect/vitest";
import { scan } from "../src/index/scan";
import { canonicalScan } from "../src/index/skill-index";
import { corpus, pairs, referenceOf, skill } from "./support";

const rulesOf = (files: { readonly [path: string]: string }, from: string, to: string): string[] =>
  referenceOf(scan(corpus(files)), from, to)?.evidence.flatMap((evidence) => evidence.rules) ?? [];

describe("scan: detection rules", () => {
  const targets = { "beta/SKILL.md": skill("beta"), "gamma-ray/SKILL.md": skill("gamma-ray") };

  it("finds a backticked name with its line and its block", () => {
    const scanned = scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", "Intro.\n\nRun the `beta` skill first.") }));
    const reference = referenceOf(scanned, "skill:alpha", "skill:beta");
    assert.deepStrictEqual<unknown>(reference?.evidence, [
      { file: "skills/alpha/SKILL.md", line: 10, headings: ["alpha"], rules: ["backtick"], text: "Run the `beta` skill first." },
    ]);
    assert.strictEqual(reference?.basis, "detected");
    assert.deepStrictEqual<unknown>(reference?.mechanical, []);
  });

  it("finds a slash, dollar, at, and skill-prefixed name in a code span", () => {
    for (const sigil of ["/beta", "$beta", "@beta", "/skill:beta"]) {
      assert.deepStrictEqual<unknown>(rulesOf({ ...targets, "alpha/SKILL.md": skill("alpha", `Point at \`${sigil}\`.`) }, "skill:alpha", "skill:beta"), ["sigil"]);
    }
  });

  it("finds every name in a list before the word skills", () => {
    const scanned = scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", "Pass the beta and gamma-ray skills to the reviewer.") }));
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:alpha", "skill:beta")?.evidence.flatMap((evidence) => evidence.rules), ["named-skill"]);
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:alpha", "skill:gamma-ray")?.evidence.flatMap((evidence) => evidence.rules), ["named-skill"]);
  });

  it("takes a bare hyphenated name as a reference, and a bare one-word name as nothing", () => {
    const scanned = scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", "Factual text belongs to gamma-ray. A beta version is not a skill.") }));
    assert.deepStrictEqual<unknown>(pairs(scanned), ["skill:alpha>skill:gamma-ray"]);
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:alpha", "skill:gamma-ray")?.evidence[0].rules, ["bare-name"]);
  });

  it("maps a bold short name beside 'principle skill' to the principle", () => {
    const files = { "principle-keep-small/SKILL.md": skill("principle-keep-small"), "alpha/SKILL.md": skill("alpha", "See the **keep-small** principle skill.") };
    const reference = referenceOf(scan(corpus(files)), "skill:alpha", "skill:principle-keep-small");
    assert.deepStrictEqual<unknown>(reference?.evidence[0].rules, ["short-principle"]);
    assert.deepStrictEqual<unknown>(reference?.mechanical, ["applies-principle"]);
  });

  it("marks a code span that starts with another skill's directory as an artifact path", () => {
    const reference = referenceOf(
      scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", "The cache is in `beta/.artifacts/pdf/`. Its own cache is in `alpha/.artifacts/`.") })),
      "skill:alpha",
      "skill:beta",
    );
    assert.deepStrictEqual<unknown>(reference?.mechanical, ["artifact-path"]);
  });

  it("gives nothing for a mention inside a fence", () => {
    const fenced = "```text\nRun the `beta` skill. See gamma-ray and [x](../beta/SKILL.md).\n```";
    assert.deepStrictEqual<unknown>(pairs(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", fenced) }))), []);
  });

  it("gives nothing for a self-mention", () => {
    const body = "Use `alpha` again. See [the entry](SKILL.md) and the alpha skill.";
    assert.deepStrictEqual<unknown>(pairs(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", body) }))), []);
  });

  it("reads the frontmatter description as a block", () => {
    const entry = '---\nname: alpha\ndescription: "Runs the `beta` skill: once."\n---\n\n# Alpha\n';
    assert.deepStrictEqual<unknown>(referenceOf(scan(corpus({ ...targets, "alpha/SKILL.md": entry })), "skill:alpha", "skill:beta")?.evidence, [
      { file: "skills/alpha/SKILL.md", line: 3, headings: [], rules: ["backtick"], text: "Runs the `beta` skill: once." },
    ]);
  });
});

describe("scan: evidence", () => {
  const targets = { "beta/SKILL.md": skill("beta") };

  it("keeps the whole block as the evidence text, however long the block is", () => {
    const opening = "When the change is large, the first clause decides the answer.";
    const filler = "This sentence only adds length to the paragraph. ".repeat(12).trim();
    const block = `${opening} ${filler} Apply \`beta\` at the end. ${filler}`;
    const evidence = referenceOf(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", block) })), "skill:alpha", "skill:beta")?.evidence;
    assert.isAbove(block.length, 1000);
    assert.deepStrictEqual<unknown>(evidence, [{ file: "skills/alpha/SKILL.md", line: 8, headings: ["alpha"], rules: ["backtick"], text: block }]);
  });

  it("joins the lines of a block with single spaces", () => {
    const evidence = referenceOf(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", "- First line of the item,\n  then apply `beta`\n  on the third line.") })), "skill:alpha", "skill:beta")?.evidence;
    assert.deepStrictEqual<unknown>(evidence, [
      { file: "skills/alpha/SKILL.md", line: 9, headings: ["alpha"], rules: ["backtick"], text: "First line of the item, then apply `beta` on the third line." },
    ]);
  });

  it("lists a block once for a pair, with every rule that found the target in it", () => {
    const body = "Read [`beta`](../beta/SKILL.md) first, then apply `beta` and the beta skill.\n\nLater, run `beta` again.";
    const evidence = referenceOf(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", body) })), "skill:alpha", "skill:beta")?.evidence;
    assert.deepStrictEqual<unknown>(evidence?.map((entry) => [entry.line, entry.rules]), [
      [8, ["backtick", "link", "named-skill"]],
      [10, ["backtick"]],
    ]);
    assert.strictEqual(new Set(evidence?.map((entry) => `${entry.file}:${entry.line}`)).size, evidence?.length);
  });
});

describe("scan: where a name does not count", () => {
  const targets = { "beta/SKILL.md": skill("beta"), "gamma-ray/SKILL.md": skill("gamma-ray") };
  const drawn = (body: string): string[] => pairs(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", body) })));

  it("draws nothing for a name inside a longer word, a path, or a URL", () => {
    for (const body of [
      "The pre-gamma-ray stage comes first.",
      "A gamma-ray-x tube is a different thing.",
      "The file skills/gamma-ray/x.md holds the detail.",
      "See https://example.invalid/gamma-ray for the paper.",
      "See https://example.invalid/gamma-ray/notes.html for the paper.",
      "The file gamma-ray.md is a note.",
      "Run gamma-ray_fast instead.",
    ]) {
      assert.deepStrictEqual(drawn(body), [], body);
    }
  });

  it("still draws the name at the end of a sentence, in brackets, and after a colon", () => {
    for (const body of ["Factual text belongs to gamma-ray.", "One skill (gamma-ray) does this.", "The owner: gamma-ray, in each case."]) {
      assert.deepStrictEqual(drawn(body), ["skill:alpha>skill:gamma-ray"], body);
    }
  });
});

describe("scan: candidates that the rules cannot confirm", () => {
  const targets = { "beta/SKILL.md": skill("beta"), "principle-keep-small/SKILL.md": skill("principle-keep-small") };

  it("raises a one-word name after a cue verb as a candidate", () => {
    const reference = referenceOf(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", "Use beta for motivation.") })), "skill:alpha", "skill:beta");
    assert.strictEqual(reference?.basis, "candidate");
    assert.deepStrictEqual<unknown>(reference?.evidence.flatMap((evidence) => evidence.rules), ["cue"]);
  });

  it("raises the capitalized, spaced form of a name as a candidate without a mechanical kind", () => {
    const reference = referenceOf(
      scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", "Prefer the smaller API, per the Keep Small rule.") })),
      "skill:alpha",
      "skill:principle-keep-small",
    );
    assert.strictEqual(reference?.basis, "candidate");
    assert.deepStrictEqual<unknown>(reference?.mechanical, []);
    assert.deepStrictEqual<unknown>(reference?.evidence.flatMap((evidence) => evidence.rules), ["title-form"]);
  });

  it("does not raise the same words in lower case, or a one-word name with no cue", () => {
    const body = "We keep small changes small. The beta phase ends soon. You can see beta results later.";
    assert.deepStrictEqual<unknown>(pairs(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", body) }))), []);
  });

  it("drops a candidate when a rule confirms the same pair", () => {
    const reference = referenceOf(scan(corpus({ ...targets, "alpha/SKILL.md": skill("alpha", "Use beta here.\n\nThen run `beta` again.") })), "skill:alpha", "skill:beta");
    assert.strictEqual(reference?.basis, "detected");
    assert.deepStrictEqual<unknown>(reference?.evidence.flatMap((evidence) => evidence.rules), ["backtick"]);
  });
});

describe("scan: files, playbooks, and hosted files", () => {
  const router = {
    "router/SKILL.md": skill(
      "router",
      [
        "Start with `beta`.",
        "",
        "## Playbooks",
        "",
        "- Build new behavior: [Build](playbooks/build.md), using `alpha`",
        "- Explain a change: `beta`",
        "- Review a diff: Build with `beta`",
        "",
        "## Phase triggers",
        "",
        "- Before a commit: `beta`. This does not force `alpha`.",
        "- Write stateful logic: `principle-keep-small`",
      ].join("\n"),
    ),
    "router/playbooks/build.md": "### Build\n\n**Own the outcome.** Then verify.\n\n1. Run `alpha`.\n2. Read [execution](../references/execution.md).\n",
    "router/references/execution.md": "# Execution\n\nLoad `beta` by name.\n",
    "router/references/principles.md": "# Triggers\n\n- Sizing a change: `principle-keep-small`\n",
    "alpha/SKILL.md": skill("alpha", "Read [execution](../router/references/execution.md). Then [open a PR](../router/playbooks/build.md)."),
    "beta/SKILL.md": skill("beta"),
    "principle-keep-small/SKILL.md": skill("principle-keep-small"),
  };
  const scanned = scan(corpus(router));

  it("makes a playbook file its own node and the source of the references it holds", () => {
    const playbook = scanned.nodes.find((node) => node.id === "playbook:build");
    assert.deepStrictEqual<unknown>(playbook, {
      kind: "playbook",
      id: "playbook:build",
      name: "build",
      title: "Build",
      purpose: "Own the outcome.",
      host: "skill:router",
      entry: "skills/router/playbooks/build.md",
      digest: playbook?.digest,
    });
    assert.isDefined(referenceOf(scanned, "playbook:build", "skill:alpha"));
    assert.strictEqual(referenceOf(scanned, "skill:router", "skill:alpha")?.evidence.some((evidence) => evidence.file.includes("playbooks")), false);
  });

  it("turns a link into another node's reference file into a hosted node and a reads relation, with no relation to the host", () => {
    assert.deepStrictEqual<unknown>(
      scanned.nodes.filter((node) => node.kind === "hosted").map((node) => [node.id, node.host, node.title]),
      [["hosted:skills/router/references/execution.md", "skill:router", "Execution"]],
    );
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:alpha", "hosted:skills/router/references/execution.md")?.mechanical, ["reads"]);
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "playbook:build", "hosted:skills/router/references/execution.md")?.mechanical, ["reads"]);
    assert.isUndefined(referenceOf(scanned, "skill:alpha", "skill:router"));
    assert.isUndefined(referenceOf(scanned, "playbook:build", "skill:router"));
  });

  it("targets the playbook node for a link to a playbook file, with no mechanical kind", () => {
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:alpha", "playbook:build")?.mechanical, []);
  });

  it("keeps a hosted file's own text with the skill that owns the file", () => {
    assert.isTrue(referenceOf(scanned, "skill:router", "skill:beta")?.evidence.some((evidence) => evidence.file === "skills/router/references/execution.md"));
    assert.deepStrictEqual<unknown>(scanned.references.filter((reference) => reference.from.startsWith("hosted:")), []);
  });

  it("reads routes from the bullets under Playbooks, in source order", () => {
    assert.deepStrictEqual<unknown>(
      scanned.routes.map((route) => [route.id, route.task, route.playbook, route.skills]),
      [
        ["build-new-behavior", "Build new behavior", "playbook:build", ["skill:alpha"]],
        ["explain-a-change", "Explain a change", null, ["skill:beta"]],
        ["review-a-diff", "Review a diff", "playbook:build", ["skill:beta"]],
      ],
    );
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:router", "playbook:build")?.mechanical, ["route"]);
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:router", "skill:alpha")?.mechanical, ["route"]);
  });

  it("reads triggers from the bullets under Phase triggers and from the principle index, index first", () => {
    assert.deepStrictEqual<unknown>(
      scanned.triggers.map((trigger) => [trigger.list, trigger.condition, trigger.target]),
      [
        ["index", "Sizing a change", "skill:principle-keep-small"],
        ["phase", "Before a commit", "skill:beta"],
        ["phase", "Write stateful logic", "skill:principle-keep-small"],
      ],
    );
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:router", "skill:beta")?.mechanical, ["route", "trigger"]);
    assert.deepStrictEqual<unknown>(referenceOf(scanned, "skill:router", "skill:principle-keep-small")?.mechanical, ["trigger"]);
  });

  it("assigns families from the directory layout and the name prefix", () => {
    assert.deepStrictEqual<unknown>(
      scanned.nodes.flatMap((node) => (node.kind === "skill" ? [[node.name, node.family]] : [])),
      [["alpha", "skill"], ["beta", "skill"], ["principle-keep-small", "principle"], ["router", "router"]],
    );
  });

  it("reads a file with CRLF line endings as it reads the same file with LF", () => {
    const crlf = scan(corpus(Object.fromEntries(Object.entries(router).map(([path, text]) => [path, text.replaceAll("\n", "\r\n")]))));
    assert.deepStrictEqual(crlf.references, scanned.references);
    assert.deepStrictEqual(crlf.routes, scanned.routes);
    assert.deepStrictEqual(crlf.triggers, scanned.triggers);
    assert.deepStrictEqual<unknown>(
      crlf.nodes.map((node) => ({ ...node, digest: "" })),
      scanned.nodes.map((node) => ({ ...node, digest: "" })),
    );
    assert.isAbove(scanned.references.length, 5);
    assert.notStrictEqual(crlf.sourceDigest, scanned.sourceDigest);
  });

  it("ignores skills/README.md and a reference file with skill-shaped frontmatter", () => {
    const withExtras = scan(
      corpus({
        ...router,
        "README.md": "# Index\n\nSee `alpha` and [beta](beta/SKILL.md).\n",
        "beta/references/persona.md": "---\nname: Persona\ndescription: Not a skill.\n---\n\n# Persona\n",
      }),
    );
    assert.deepStrictEqual<unknown>(withExtras.nodes.map((node) => node.id), scanned.nodes.map((node) => node.id));
    assert.deepStrictEqual<unknown>(pairs(withExtras), pairs(scanned));
    assert.isFalse(withExtras.files.some((file) => file.path === "skills/README.md"));
    assert.strictEqual(withExtras.files.find((file) => file.path === "skills/beta/references/persona.md")?.owner, "skill:beta");
  });
});

describe("scan: tooling", () => {
  const files = {
    "alpha/SKILL.md": skill(
      "alpha",
      "Use the helper `scripts/measure.sh <file>`.\n\n```bash\n# a comment\nwc -l input.txt\nFOO=1 ./scripts/measure.sh input.txt\ngit status \\\n  --short\ngit log\n```\n\n```text\nrm -rf nothing\n```",
    ),
    "alpha/README.md": "# Alpha\n\n```bash\nnpx install-me\n```\n",
    "alpha/scripts/measure.sh": '#!/usr/bin/env bash\nwc -c "$1"\n',
    "alpha/references/data.tsv": "a\tb\n",
    "beta/SKILL.md": skill("beta", "Run `git status` inline."),
  };
  const toolingOf = (name: string) => scan(corpus(files)).nodes.flatMap((node) => (node.kind === "skill" && node.name === name ? [node.tooling] : []))[0];

  it("finds scripts by walking the directory, with interpreter and every line that names them", () => {
    assert.deepStrictEqual<unknown>(toolingOf("alpha")?.scripts, [
      {
        path: "skills/alpha/scripts/measure.sh",
        interpreter: "bash",
        uses: 1,
        invokedAt: [
          { file: "skills/alpha/SKILL.md", line: 8 },
          { file: "skills/alpha/SKILL.md", line: 13 },
        ],
      },
    ]);
  });

  it("counts the first word of each command line in a shell fence, outside the skill's README", () => {
    assert.deepStrictEqual<unknown>(toolingOf("alpha")?.commands, [
      { name: "git", uses: 2 },
      { name: "wc", uses: 1 },
    ]);
  });

  it("reads no command from an inline code span", () => {
    assert.deepStrictEqual<unknown>(toolingOf("beta"), { scripts: [], commands: [] });
  });
});

describe("scan: totality and determinism", () => {
  it("keeps a skill with broken frontmatter as a node with defects", () => {
    const scanned = scan(
      corpus({
        "broken/SKILL.md": "---\nname: broken\ndescription: has: a colon\n---\n\n# Broken\n\nRun `beta`.\n",
        "bare/SKILL.md": "# No frontmatter\n",
        "renamed/SKILL.md": skill("other-name"),
        "beta/SKILL.md": skill("beta"),
      }),
    );
    const defects = Object.fromEntries(scanned.nodes.flatMap((node) => (node.kind === "skill" ? [[node.name, node.defects]] : [])));
    assert.strictEqual(defects["broken"]?.length, 1);
    assert.match(defects["broken"]?.[0] ?? "", /^The frontmatter is not valid YAML: /);
    assert.deepStrictEqual<unknown>(defects["bare"], ["The file has no frontmatter."]);
    assert.deepStrictEqual<unknown>(defects["renamed"], ["The frontmatter name `other-name` is not the directory name."]);
    assert.deepStrictEqual<unknown>(defects["beta"], []);
    assert.isDefined(referenceOf(scanned, "skill:broken", "skill:beta"));
  });

  it("keeps a skill whose frontmatter holds an unquoted glob as a node with a defect", () => {
    for (const line of ["paths: [*.ts, *.tsx]", "globs: *.md", "note: *nope"]) {
      const entry = `---\nname: globby\ndescription: Has a glob.\n${line}\n---\n\n# Globby\n\nRun \`beta\`.\n`;
      const scanned = scan(corpus({ "globby/SKILL.md": entry, "beta/SKILL.md": skill("beta") }));
      const node = scanned.nodes.find((candidate) => candidate.id === "skill:globby");
      const defects = node?.kind === "skill" ? node.defects : [];
      assert.strictEqual(defects.length, 1, line);
      assert.match(defects[0] ?? "", /^The frontmatter is not valid YAML: /);
      assert.isDefined(referenceOf(scanned, "skill:globby", "skill:beta"));
    }
  });

  it("accepts only an http or https repository for an imported skill", () => {
    const manifest = (repository: string): string =>
      JSON.stringify({
        upstreams: { kit: { repository, revision: "0".repeat(40) } },
        files: [{ source: "kit/beta/SKILL.md", destination: "skills/beta/SKILL.md", upstream: "kit" }],
      });
    const beta = (repository: string) => scan(corpus({ "beta/SKILL.md": skill("beta"), "alpha/SKILL.md": skill("alpha") }, manifest(repository))).nodes.flatMap((node) => (node.kind === "skill" ? [[node.name, node.origin.kind, node.defects]] : []));

    assert.deepStrictEqual<unknown>(beta("https://example.invalid/kit"), [["alpha", "original", []], ["beta", "imported", []]]);
    for (const unsafe of ["javascript:alert(1)", "file:///etc/passwd", "example.invalid/kit", ""]) {
      assert.deepStrictEqual<unknown>(beta(unsafe), [
        ["alpha", "original", []],
        ["beta", "unknown", ["The upstream repository in docs/upstream-imports.json is not an http or https URL."]],
      ]);
    }
  });

  it("survives the frontmatter forms that real skills use", () => {
    const entry = [
      "---",
      "name: quirky",
      'description: "Use for \\"how does X work\\": edits, checks. It\'s quoted."  ',
      'paths: ["**/*.ts", "**/*.tsx"]',
      "disable-model-invocation: true",
      "metadata:",
      '  opencode/autoinvoke: "false"',
      "---",
      "",
      "Body with no heading.",
      "",
      "---",
      "",
      "More body after a horizontal rule.",
    ].join("\n");
    const node = scan(corpus({ "quirky/SKILL.md": entry })).nodes[0];
    assert.deepStrictEqual<unknown>(node?.kind === "skill" ? [node.description, node.modelInvocable, node.title, node.defects] : null, [
      'Use for "how does X work": edits, checks. It\'s quoted.',
      false,
      "quirky",
      [],
    ]);
  });

  it("gives identical canonical bytes for the same corpus in any insertion order", () => {
    const files = {
      "router/SKILL.md": skill("router", "## Playbooks\n\n- Build: [Build](playbooks/build.md), using `alpha`"),
      "router/playbooks/build.md": "# Build\n\nRun `alpha`, then `grill-me`. See [guide](../../alpha/references/guide.md).\n",
      "alpha/SKILL.md": skill("alpha", "Apply `grill-me`. Use Grill me for decisions."),
      "alpha/references/guide.md": "# Guide\n",
      "grill-me/SKILL.md": skill("grill-me"),
      "grilling/SKILL.md": skill("grilling", "Used by `grill-me`."),
    };
    const scanned = scan(corpus(files));
    const forward = canonicalScan(scanned);
    const reversed = canonicalScan(scan(corpus(Object.fromEntries(Object.entries(files).reverse()))));
    assert.strictEqual(reversed, forward);
    assert.isTrue(forward.endsWith("\n"));
    assert.notInclude(forward, "/home/");
    assert.isBelow(forward.indexOf('"skill:grill-me"'), forward.indexOf('"skill:grilling"'));
    assert.deepStrictEqual<unknown>(pairs(scanned), [...pairs(scanned)].sort());
    assert.strictEqual(pairs(scanned)[0], "playbook:build>hosted:skills/alpha/references/guide.md");
  });
});
