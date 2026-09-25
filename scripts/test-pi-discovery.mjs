#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const modulePath = process.argv[2];
if (!modulePath) {
  console.error("Usage: node scripts/test-pi-discovery.mjs /absolute/path/to/pi/dist/core/skills.js");
  process.exit(2);
}
const { loadSkillsFromDir, formatSkillsForPrompt } = await import(pathToFileURL(resolve(modulePath)).href);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(repo, "skills");
const expected = (await readdir(source, { recursive: true })).filter((name) => name.endsWith("/SKILL.md"));
const temp = await mkdtemp(join(tmpdir(), "mako-pi-discovery-"));
try {
  const installed = join(temp, "skills");
  await mkdir(installed);
  await symlink(source, join(installed, "reese"), "dir");
  const result = loadSkillsFromDir({ dir: installed, source: "path" });
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.skills.length, expected.length);
  assert.equal(new Set(result.skills.map((s) => s.name)).size, expected.length);
  const prompt = formatSkillsForPrompt(result.skills);
  for (const skill of result.skills) {
    assert.equal(prompt.includes(`<name>${skill.name}</name>`), !skill.disableModelInvocation, skill.name);
    assert.match(await readFile(skill.filePath, "utf8"), /^---\n/);
  }
  const mako = result.skills.find((s) => s.name === "mako");
  assert.ok(mako?.disableModelInvocation);
  for (const relative of [
    "../architect/SKILL.md",
    "../principle-model-the-domain/SKILL.md",
    "../writing/SKILL.md",
    "playbooks/feature.md",
  ]) {
    const fromLink = await realpath(resolve(mako.baseDir, relative));
    const fromSource = await realpath(resolve(source, "mako", relative));
    assert.equal(fromLink, fromSource);
    assert.ok((await readFile(fromLink, "utf8")).length > 0);
  }
  console.log(`PASS: ${expected.length} skills discovered through bundle symlink; no diagnostics; hidden-policy prompt filtering and dependency reads verified.`);
  console.log("This tests the loader and files, not model compliance, command UI, or delegated execution.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
