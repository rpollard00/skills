import { assert, describe, it } from "@effect/vitest";
import { resolve } from "../src/index/resolve";
import { scan } from "../src/index/scan";
import type { Answer, Judgments, Scan } from "../src/shared/model";
import { corpus, referenceOf, skill } from "./support";

const files = (alphaBody: string): { readonly [path: string]: string } => ({
  "alpha/SKILL.md": skill("alpha", alphaBody),
  "beta/SKILL.md": skill("beta"),
  "gamma/SKILL.md": skill("gamma"),
});

const BODY = "If the fix crosses a boundary, apply `beta`.\n\nThen run `gamma`.\n\nUnrelated closing paragraph.";
const NONE: Judgments = { version: 1, relations: [] };

const answer = (scanned: Scan, to: string, kind: Answer, conditional = false): Judgments["relations"][number] => {
  const reference = referenceOf(scanned, "skill:alpha", to);
  if (reference === undefined) throw new Error(`The fixture has no reference to ${to}.`);
  return { from: reference.from, to: reference.to, kind, conditional, evidenceHash: reference.evidenceHash };
};

const kindsOf = (relations: readonly { readonly to: string; readonly kinds: readonly string[] }[]): string[] =>
  relations.map((relation) => `${relation.to}=${relation.kinds.join("+")}`);

describe("resolve", () => {
  const before = scan(corpus(files(BODY)));

  it("opens a kind ticket for each unjudged pair and still draws the pair as a mention", () => {
    const resolution = resolve(before, NONE);
    assert.deepStrictEqual<unknown>(resolution.tickets.map((ticket) => [ticket.to, ticket.reason, ticket.status]), [
      ["skill:beta", "kind", { kind: "new" }],
      ["skill:gamma", "kind", { kind: "new" }],
    ]);
    assert.deepStrictEqual<unknown>(resolution.relations.map((relation) => [relation.to, relation.kinds, relation.standing, relation.ticket]), [
      ["skill:beta", ["mentions"], "unjudged", resolution.tickets[0]?.id],
      ["skill:gamma", ["mentions"], "unjudged", resolution.tickets[1]?.id],
    ]);
    assert.match(resolution.tickets[0]?.id ?? "", /^[0-9a-f]{8}$/);
    assert.notStrictEqual(resolution.tickets[0]?.id, resolution.tickets[1]?.id);
    assert.deepStrictEqual<unknown>(resolution.judged, []);
  });

  it("applies a judgment while its evidence hash matches", () => {
    const open = resolve(before, NONE);
    const resolution = resolve(before, { version: 1, relations: [answer(before, "skill:beta", "runs", true), answer(before, "skill:gamma", "see-also")] });
    assert.deepStrictEqual<unknown>(resolution.tickets, []);
    assert.deepStrictEqual<unknown>(resolution.relations.map((relation) => [relation.to, relation.kinds, relation.conditional, relation.standing]), [
      ["skill:beta", ["runs"], true, "judged"],
      ["skill:gamma", ["see-also"], false, "judged"],
    ]);
    assert.deepStrictEqual<unknown>(resolution.judged.map((ticket) => [ticket.id, ticket.to, ticket.status]), [
      [open.tickets[0]?.id, "skill:beta", { kind: "judged", answer: { kind: "runs", conditional: true } }],
      [open.tickets[1]?.id, "skill:gamma", { kind: "judged", answer: { kind: "see-also", conditional: false } }],
    ]);
    assert.deepStrictEqual<unknown>(resolution.relations.map((relation) => relation.ticket), open.tickets.map((ticket) => ticket.id));
  });

  it("reopens exactly the pair whose evidence block changed, with the previous answer", () => {
    const judgments: Judgments = { version: 1, relations: [answer(before, "skill:beta", "runs", true), answer(before, "skill:gamma", "see-also")] };
    const after = scan(corpus(files(BODY.replace("crosses a boundary", "crosses a module boundary"))));
    const resolution = resolve(after, judgments);
    assert.deepStrictEqual<unknown>(resolution.tickets.map((ticket) => [ticket.to, ticket.reason, ticket.status]), [
      ["skill:beta", "kind", { kind: "changed", was: { kind: "runs", conditional: true } }],
    ]);
    assert.deepStrictEqual<unknown>(resolution.judged.map((ticket) => ticket.to), ["skill:gamma"]);
    assert.deepStrictEqual<unknown>(kindsOf(resolution.relations), ["skill:beta=mentions", "skill:gamma=see-also"]);
    assert.strictEqual(resolution.relations[0]?.standing, "rejudge");
    assert.deepStrictEqual<unknown>(resolution.orphans, []);
  });

  it("reopens nothing when another part of the file changes, even when lines move", () => {
    const judgments: Judgments = { version: 1, relations: [answer(before, "skill:beta", "runs"), answer(before, "skill:gamma", "see-also")] };
    const after = scan(corpus(files(`A new opening paragraph.\n\n${BODY.replace("Unrelated closing paragraph.", "A rewritten closing paragraph.")}`)));
    assert.notStrictEqual(referenceOf(after, "skill:alpha", "skill:beta")?.evidence[0].line, referenceOf(before, "skill:alpha", "skill:beta")?.evidence[0].line);
    const resolution = resolve(after, judgments);
    assert.deepStrictEqual<unknown>(resolution.tickets, []);
    assert.deepStrictEqual<unknown>(kindsOf(resolution.relations), ["skill:beta=runs", "skill:gamma=see-also"]);
  });

  describe("the heading path of an evidence block", () => {
    const under = (first: string, second: string, third: string): Scan =>
      scan(corpus(files(`## ${first}\n\n### Steps\n\n- Use \`beta\`.\n\n## ${second}\n\n- Use \`gamma\`.\n\n## ${third}\n\nNo skill is named here.`)));
    const before = under("When the repository uses jj", "Other tools", "Closing notes");
    const judgments: Judgments = { version: 1, relations: [answer(before, "skill:beta", "runs", true), answer(before, "skill:gamma", "runs")] };

    it("is part of the evidence, outermost heading first", () => {
      assert.deepStrictEqual<unknown>(referenceOf(before, "skill:alpha", "skill:beta")?.evidence.map((block) => block.headings), [
        ["alpha", "When the repository uses jj", "Steps"],
      ]);
      assert.deepStrictEqual<unknown>(referenceOf(before, "skill:alpha", "skill:gamma")?.evidence.map((block) => block.headings), [["alpha", "Other tools"]]);
    });

    it("reopens exactly the pair below a heading that changed", () => {
      const edited = resolve(under("Never use these", "Other tools", "Closing notes"), judgments);
      assert.deepStrictEqual<unknown>(edited.tickets.map((ticket) => [ticket.to, ticket.status]), [
        ["skill:beta", { kind: "changed", was: { kind: "runs", conditional: true } }],
      ]);
      assert.deepStrictEqual<unknown>(edited.judged.map((ticket) => ticket.to), ["skill:gamma"]);
    });

    it("reopens nothing when a heading that is above neither block changes", () => {
      const edited = resolve(under("When the repository uses jj", "Other tools", "A new title for the last part"), judgments);
      assert.deepStrictEqual<unknown>([edited.tickets, edited.judged.map((ticket) => ticket.to)], [[], ["skill:beta", "skill:gamma"]]);
    });
  });

  it("pins the format of the evidence hash and of the ticket id", () => {
    const entry = "---\nname: alpha\ndescription: The alpha fixture.\n---\n\n# Alpha\n\n## Fix\n\nIf the fix crosses a boundary,\napply `beta`.\n";
    const pinned = scan(corpus({ "alpha/SKILL.md": entry, "beta/SKILL.md": skill("beta") }));
    const reference = referenceOf(pinned, "skill:alpha", "skill:beta");
    assert.deepStrictEqual<unknown>(reference?.evidence, [
      { file: "skills/alpha/SKILL.md", line: 11, headings: ["Alpha", "Fix"], rules: ["backtick"], text: "If the fix crosses a boundary, apply `beta`." },
    ]);
    // sha256 of the one line `["Alpha","Fix","If the fix crosses a boundary, apply \`beta\`."]`
    assert.strictEqual(reference?.evidenceHash, "8cb2c1ba58557493915a11ea0adae4956fcb378d79dfa8b4fe7a9b1a654d91d3");
    // sha256 of `skill:alpha>skill:beta:` and then the hash above
    const ticket = resolve(pinned, NONE).tickets[0];
    assert.deepStrictEqual<unknown>([ticket?.key, ticket?.id], ["ae38c4658f994d46625cda23b97f4d70d3980517f011edf646a72244ffaf8ea4", "ae38c465"]);
  });

  it("does not change the hash when only the file, the line, or the rule of a block changes", () => {
    const hashOf = (body: string): string | undefined => referenceOf(scan(corpus(files(body))), "skill:alpha", "skill:beta")?.evidenceHash;
    const plain = hashOf("Apply `beta` now.");
    assert.isDefined(plain);
    assert.strictEqual(hashOf("An opening paragraph that moves the lines.\n\nApply `beta` now."), plain);
    assert.strictEqual(hashOf("Apply `beta`\nnow."), plain);
    assert.notStrictEqual(hashOf("Apply `beta` now, and stop."), plain);
  });

  it("removes a pair that is judged none", () => {
    const resolution = resolve(before, { version: 1, relations: [answer(before, "skill:beta", "none")] });
    assert.deepStrictEqual<unknown>(kindsOf(resolution.relations), ["skill:gamma=mentions"]);
    assert.deepStrictEqual<unknown>(resolution.tickets.map((ticket) => ticket.to), ["skill:gamma"]);
  });

  it("does not draw a refers candidate until it has an answer", () => {
    const candidate = scan(corpus(files("Use beta for motivation.")));
    const open = resolve(candidate, NONE);
    assert.deepStrictEqual<unknown>(open.tickets.map((ticket) => [ticket.to, ticket.reason]), [["skill:beta", "refers"]]);
    assert.deepStrictEqual<unknown>(open.relations, []);

    const confirmed = resolve(candidate, { version: 1, relations: [answer(candidate, "skill:beta", "see-also")] });
    assert.deepStrictEqual<unknown>(kindsOf(confirmed.relations), ["skill:beta=see-also"]);
    assert.deepStrictEqual<unknown>(confirmed.tickets, []);

    const rejected = resolve(candidate, { version: 1, relations: [answer(candidate, "skill:beta", "none")] });
    assert.deepStrictEqual<unknown>([rejected.relations, rejected.tickets, rejected.orphans], [[], [], []]);
  });

  it("reports a judgment for a vanished pair as an orphan", () => {
    const judgments: Judgments = { version: 1, relations: [answer(before, "skill:beta", "runs"), answer(before, "skill:gamma", "see-also")] };
    const after = scan(corpus(files("If the fix crosses a boundary, apply `beta`.")));
    const resolution = resolve(after, judgments);
    assert.deepStrictEqual<unknown>(resolution.orphans.map((orphan) => [orphan.to, orphan.kind]), [["skill:gamma", "see-also"]]);
    assert.deepStrictEqual<unknown>(kindsOf(resolution.relations), ["skill:beta=runs"]);
    assert.deepStrictEqual<unknown>(resolution.tickets, []);
  });

  it("still asks about a pair that has an artifact path and a prose mention, and keeps the path beside the answer", () => {
    const both = scan(corpus(files("Read `beta` first. Its cache is in `beta/.artifacts/pdf/`.")));
    assert.deepStrictEqual<unknown>(referenceOf(both, "skill:alpha", "skill:beta")?.mechanical, ["artifact-path"]);

    const open = resolve(both, NONE);
    assert.deepStrictEqual<unknown>(open.tickets.map((ticket) => [ticket.to, ticket.reason, ticket.status]), [["skill:beta", "kind", { kind: "new" }]]);
    assert.deepStrictEqual<unknown>(open.relations.map((relation) => [relation.kinds, relation.standing]), [[["mentions", "artifact-path"], "unjudged"]]);

    const answered = resolve(both, { version: 1, relations: [answer(both, "skill:beta", "requires", true)] });
    assert.deepStrictEqual<unknown>(answered.relations.map((relation) => [relation.kinds, relation.conditional, relation.standing]), [
      [["requires", "artifact-path"], true, "judged"],
    ]);
    assert.deepStrictEqual<unknown>([answered.tickets, answered.orphans], [[], []]);

    const rejected = resolve(both, { version: 1, relations: [answer(both, "skill:beta", "none")] });
    assert.deepStrictEqual<unknown>(rejected.relations.map((relation) => [relation.kinds, relation.standing, relation.ticket]), [
      [["artifact-path"], "judged", open.tickets[0]?.id],
    ]);
    assert.deepStrictEqual<unknown>([rejected.tickets, rejected.orphans], [[], []]);
  });

  it("asks no question about a pair whose only mention is an artifact path", () => {
    const pathOnly = scan(corpus(files("The cache is in `beta/.artifacts/pdf/`.")));
    const reference = referenceOf(pathOnly, "skill:alpha", "skill:beta");
    assert.isDefined(reference);
    const resolution = resolve(pathOnly, { version: 1, relations: reference === undefined ? [] : [answer(pathOnly, "skill:beta", "requires")] });
    assert.deepStrictEqual<unknown>(resolution.tickets, []);
    assert.deepStrictEqual<unknown>(resolution.relations.map((relation) => [relation.kinds, relation.standing, relation.ticket]), [
      [["artifact-path"], "mechanical", null],
    ]);
    assert.strictEqual(resolution.orphans.length, 1);
  });

  it("does not apply a record that pairs conditional with none, boundary, or see-also, and opens its ticket as invalid", () => {
    for (const kind of ["none", "boundary", "see-also"] as const) {
      const resolution = resolve(before, { version: 1, relations: [answer(before, "skill:beta", kind, true), answer(before, "skill:gamma", "runs", true)] });
      assert.deepStrictEqual<unknown>(resolution.tickets.map((ticket) => [ticket.to, ticket.status]), [
        ["skill:beta", { kind: "invalid", was: { kind, conditional: true } }],
      ]);
      assert.deepStrictEqual<unknown>(kindsOf(resolution.relations), ["skill:beta=mentions", "skill:gamma=runs"]);
      assert.strictEqual(resolution.relations[0]?.standing, "rejudge");
      assert.deepStrictEqual<unknown>([resolution.judged.map((ticket) => ticket.to), resolution.orphans], [["skill:gamma"], []]);
    }
    for (const kind of ["handoff", "runs", "requires"] as const) {
      assert.deepStrictEqual<unknown>(resolve(before, { version: 1, relations: [answer(before, "skill:beta", kind, true), answer(before, "skill:gamma", "none")] }).tickets, []);
    }
  });

  it("gives each ticket the description of its target", () => {
    const described = scan(
      corpus({
        "router/SKILL.md": skill("router", "## Playbooks\n\n- Build: [Build](playbooks/build.md)"),
        "router/playbooks/build.md": "### Build\n\n**Own the outcome.** Then verify.\n",
        "alpha/SKILL.md": skill("alpha", "Run `beta`. Then follow [Build](../router/playbooks/build.md)."),
        "beta/SKILL.md": skill("beta"),
      }),
    );
    assert.deepStrictEqual<unknown>(resolve(described, NONE).tickets.map((ticket) => [ticket.to, ticket.target]), [
      ["playbook:build", "Own the outcome."],
      ["skill:beta", "The beta fixture."],
    ]);
  });

  it("asks no question about a pair with a deciding mechanical kind, and reports a judgment for it as an orphan", () => {
    const withPrinciple = scan(corpus({ "alpha/SKILL.md": skill("alpha", "Apply `principle-keep-small`."), "principle-keep-small/SKILL.md": skill("principle-keep-small") }));
    const reference = referenceOf(withPrinciple, "skill:alpha", "skill:principle-keep-small");
    assert.isDefined(reference);
    const resolution = resolve(withPrinciple, {
      version: 1,
      relations: reference === undefined ? [] : [{ from: reference.from, to: reference.to, kind: "requires", conditional: false, evidenceHash: reference.evidenceHash }],
    });
    assert.deepStrictEqual<unknown>(resolution.tickets, []);
    assert.deepStrictEqual<unknown>(resolution.relations.map((relation) => [relation.kinds, relation.standing]), [[["applies-principle"], "mechanical"]]);
    assert.strictEqual(resolution.orphans.length, 1);
  });
});
