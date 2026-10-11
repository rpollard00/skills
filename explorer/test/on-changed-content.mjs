// Runs the whole test suite on a throwaway copy of the repository whose `skills/` has changed.
// The tests of the explorer must pass for any content of `skills/`. This script is the proof for three sets of edits.
//
// Usage, in `explorer/`: node test/on-changed-content.mjs <A|B|C|D|E|F> [-- <arguments of vitest>]
// It never writes to the real `skills/`. It removes the copy when it ends.
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";

const explorer = nodePath.resolve(import.meta.dirname, "..");
const repository = nodePath.resolve(explorer, "..");

const skillFile = (name, description, body) => `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body}\n`;

/** Each set gets the path of the copy's `skills/`. */
const SETS = {
  A: (skills) => {
    const edit = (path, change) => writeFileSync(nodePath.join(skills, path), change(readFileSync(nodePath.join(skills, path), "utf8")));
    appendFileSync(nodePath.join(skills, "teach", "SKILL.md"), "\nWhen the change is large, run the `swarm` skill.\n");
    mkdirSync(nodePath.join(skills, "note-taker"));
    writeFileSync(nodePath.join(skills, "note-taker", "SKILL.md"), skillFile("note-taker", "Keeps notes during long work.", "Run the `how` skill first."));
    appendFileSync(nodePath.join(skills, "mako", "playbooks", "perf-issue.md"), "\n9. For wide coverage, run the `swarm` skill.\n");
    edit("mako/playbooks/investigation.md", (text) => mustChange(text, "4. Apply the existing `writing` router to the reply.\n", ""));
    edit("mako/SKILL.md", (text) => mustChange(text, "- No existing playbook fits:", "- Keep notes during long work: `note-taker`\n- No existing playbook fits:"));
  },
  B: (skills) => {
    rmSync(nodePath.join(skills, "blast-radius"), { recursive: true });
    renameSync(nodePath.join(skills, "mako", "playbooks", "prototype.md"), nodePath.join(skills, "mako", "playbooks", "spike.md"));
    const router = nodePath.join(skills, "mako", "SKILL.md");
    writeFileSync(router, mustChange(readFileSync(router, "utf8"), "[Prototype](playbooks/prototype.md)", "[Spike](playbooks/spike.md)"));
  },
  C: (skills) => {
    const longName = "a-skill-with-a-name-of-forty-characters-".padEnd(40, "x");
    mkdirSync(nodePath.join(skills, longName));
    writeFileSync(nodePath.join(skills, longName, "SKILL.md"), skillFile(longName, "A skill with a long name.", "Run the `how` skill. Then run the `why` skill."));

    const extras = ["extra-one.md", "extra-two.md", "extra-three.md", "extra-four.md"];
    for (const file of extras) writeFileSync(nodePath.join(skills, "mako", "references", file), `# ${file}\n\nMore reference text.\n`);
    appendFileSync(nodePath.join(skills, "teach", "SKILL.md"), `\nRead ${extras.map((file) => `[${file}](../mako/references/${file})`).join(", ")}.\n`);

    const principles = ["one", "two", "three", "four", "five", "six"].map((word) => `principle-extra-rule-number-${word}`);
    for (const name of principles) {
      mkdirSync(nodePath.join(skills, name));
      writeFileSync(nodePath.join(skills, name, "SKILL.md"), skillFile(name, "Apply when a test needs one more principle.", "One more principle."));
    }
    appendFileSync(nodePath.join(skills, "mako", "references", "principles.md"), `\n${principles.map((name, index) => `- A decision of kind ${index + 1} that has no principle: \`${name}\``).join("\n")}\n`);

    const twelve = ["how", "why", "teach", "architect", "arena", "bug-fix", "deslop", "grill-me", "interrogate", "reflect", "swarm", "writing"];
    mkdirSync(nodePath.join(skills, "names-many"));
    writeFileSync(nodePath.join(skills, "names-many", "SKILL.md"), skillFile("names-many", "Names twelve skills in one paragraph.", `Run ${twelve.map((name) => `the \`${name}\` skill`).join(", then ")}.`));
  },
  D: (skills) => {
    rmSync(nodePath.join(skills, "mako"), { recursive: true });
  },
  E: (skills) => {
    for (const name of readdirSync(skills)) if (!["how", "teach", "why"].includes(name)) rmSync(nodePath.join(skills, name), { recursive: true });
  },
  F: (skills) => {
    const known = ["how", "why", "teach", "architect", "arena", "bug-fix", "deslop", "grill-me", "interrogate", "reflect", "swarm", "writing"];
    const extra = Array.from({ length: 40 }, (_, index) => `extra-skill-${String(index + 1).padStart(2, "0")}`);
    for (const [index, name] of extra.entries()) {
      const names = [known[index % known.length], known[(index * 5 + 3) % known.length], extra[(index + 1) % extra.length], extra[(index + 7) % extra.length]];
      mkdirSync(nodePath.join(skills, name));
      writeFileSync(nodePath.join(skills, name, "SKILL.md"), skillFile(name, "One of forty more skills.", `Run the \`${names[0]}\` skill. If the result is not clear, run the \`${names[1]}\` skill. Then run the \`${names[2]}\` skill and the \`${names[3]}\` skill.`));
    }
    appendFileSync(nodePath.join(skills, "teach", "SKILL.md"), `\nFor more depth, run the \`${extra[0]}\` skill, the \`${extra[13]}\` skill, and the \`${extra[27]}\` skill.\n`);
  },
};

/** Prints what the index of the copy holds, so that a run shows that the edits are in it. */
const SIZE_OF_COPY = `
import nodePath from "node:path";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { SkillIndex } from "../src/index/skill-index";
Effect.gen(function* () {
  const index = yield* (yield* SkillIndex).live;
  const hosted = index.nodes.filter((node) => node.kind === "hosted").length;
  process.stdout.write(\`the copy has \${index.nodes.length} nodes (\${hosted} hosted files), \${index.routes.length} routes, \${index.relations.length} relations\`);
}).pipe(Effect.provide(SkillIndex.layer(nodePath.resolve(import.meta.dirname, "..", ".."))), Effect.provide(NodeServices.layer), NodeRuntime.runMain);
`;

function mustChange(text, from, to) {
  if (!text.includes(from)) throw new Error(`The skills no longer hold the text that this edit changes: ${JSON.stringify(from)}`);
  return text.replace(from, to);
}

const [set, ...rest] = process.argv.slice(2);
const apply = SETS[set];
if (apply === undefined) {
  process.stderr.write("Usage: node test/on-changed-content.mjs <A|B|C|D|E|F> [-- <arguments of vitest>]\n");
  process.exit(2);
}

const copy = mkdtempSync(nodePath.join(tmpdir(), "skill-explorer-changed-"));
let status = 1;
try {
  const isCopied = (source) => !["node_modules", "dist", "__pycache__"].includes(nodePath.basename(source)) && !nodePath.basename(source).startsWith(".");
  cpSync(nodePath.join(repository, "skills"), nodePath.join(copy, "skills"), { recursive: true, filter: isCopied });
  cpSync(explorer, nodePath.join(copy, "explorer"), { recursive: true, filter: isCopied });
  symlinkSync(nodePath.join(explorer, "node_modules"), nodePath.join(copy, "explorer", "node_modules"));
  apply(nodePath.join(copy, "skills"));

  const sizeOfCopy = nodePath.join(copy, "explorer", "test", "size-of-copy.ts");
  writeFileSync(sizeOfCopy, SIZE_OF_COPY);
  const size = spawnSync("npx", ["tsx", sizeOfCopy], { cwd: nodePath.join(copy, "explorer"), encoding: "utf8" });
  process.stdout.write(`set ${set}: ${size.stdout.trim() || size.stderr.trim().slice(0, 300)}\n`);
  rmSync(sizeOfCopy);

  const run = spawnSync("npx", ["vitest", "run", ...rest.filter((argument) => argument !== "--")], { cwd: nodePath.join(copy, "explorer"), encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  const lines = `${run.stdout}${run.stderr}`.split("\n").filter((line) => /^\s*(×|AssertionError|Error:|Test Files|Tests )|FAIL /.test(line));
  process.stdout.write(`${lines.map((line) => line.slice(0, 400)).join("\n")}\n`);
  status = run.status ?? 1;
} finally {
  rmSync(copy, { recursive: true, force: true });
}
process.exit(status);
