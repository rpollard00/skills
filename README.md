# Reese's Skills

Agent skills for repeatable engineering, design, version-control, and writing work.

## Mako

[Mako](skills/mako/SKILL.md) is the explicit software-engineering router. Invoke it with a task. It selects the workflow, loads the required skills, and stays active in that conversation until you opt out.

It owns the goal through verified completion: make engineering decisions, investigate uncertainty, and proceed without routine permission questions. Explicit scope limits and dangerous-action boundaries remain binding. It reports progress, consequential choices, and evidence without narrating skill selection.

The collection contains 53 skills: 24 engineering skills, 23 independent engineering principles, and six design, version-control, and writing skills. Mako also owns 19 task playbooks.

## Skills

Every skill has its own directory directly under `skills/`, without categories. See the [skill index](skills/README.md).

- [Mako](skills/mako/SKILL.md): engineering workflows and selective loading of [independent principles](skills/mako/references/principles.md).
- [ui-design](skills/ui-design/SKILL.md): shared UI judgment and rendered evidence under the caller's scope.
- [refine-ui](skills/refine-ui/SKILL.md): interactive visual exploration and approval gates, using ui-design.
- [jj](skills/jj/SKILL.md): repository operations when `.jj` exists.
- [writing](skills/writing/SKILL.md): the existing router for simple-technical-english and unslop.

## Try Mako without installation

In pi, load just its entry point for one session:

```bash
pi --skill /absolute/path/to/skills/skills/mako
```

Then invoke it:

```text
/skill:mako investigate how cancellation works
```

In any supported harness, you can also explicitly ask the agent to read the absolute path to `skills/mako/SKILL.md` and apply it to a task. Skill names fall back to sibling directories in that checkout when harness lookup is unavailable. This requires no global installation.

## Install the bundle

Keep dependent skills together so name lookup can fall back to sibling paths. The installer links the entire flat `skills/` directory as one bundle.

The installer uses Python 3.10+ and PyYAML. Install its dependency in your development environment, then preview:

```bash
python3 -m pip install -r scripts/requirements.txt
./scripts/link-skills.sh
```

The default target is:

```text
~/.agents/skills/reese -> <checkout>/skills
```

Claude Code gets a generated bundle at `~/.claude/skills/.reese-adapter/skills/`, with individual discovery links at `~/.claude/skills/<name>`. The adapter keeps Mako explicit-only and permits agent loading of its dependencies. The shared source flags remain unchanged for Pi, Codex, and OpenCode.

Run the installer again after source changes to refresh the Claude copies. It refuses modified generated files rather than overwriting local work. Existing links to this checkout migrate to the adapter on `--apply`. Use `--claude-destination /path` to change that root or `--no-claude` to skip it.

The script makes no changes unless you add `--apply`. For a prior per-skill installation, preview removal of this checkout's own links, including links left dangling by the directory move:

```bash
./scripts/link-skills.sh --migrate-owned-flat
```

Review the plan, then apply it:

```bash
./scripts/link-skills.sh --migrate-owned-flat --apply
```

The installer refuses foreign links, separately installed copies, duplicate names, invalid metadata, and broken dependencies. It does not overwrite a copy merely because its name matches. Compare and preserve local modifications before separately authorizing their replacement.

Use `--destination /path/to/skills` for a different discovery root. Common user roots are checked for collisions; project-local roots and custom configuration paths are not exhaustively audited. No harness configuration file is changed.

Reload the harness after installation. Native entry points are `/skill:mako` in pi, `$mako` in Codex, the `@mako` skill completion in OpenCode 2, and `/mako` in Claude Code. Supply the task after selecting the skill. Interactive UI behavior remains separate from the discovery tests.

## Validate

```bash
python3 scripts/validate_skills.py
python3 scripts/markdown_lists.py
python3 -m unittest discover -s tests -v
```

Run the executable TypeScript example check separately with Node.js and TypeScript available:

```bash
python3 scripts/check_typescript_examples.py
```

Use `--tsc /path/to/tsc` or `--node /path/to/node` for tools outside `PATH`. Missing tools fail this check. It compiles the documented duration example, verifies negative type tests, and exercises valid and invalid inputs. The Python suite alone does not establish this example's behavior.

[Harness compatibility](docs/mako-harness-compatibility.md) records tested versions and commands. The Python checks cover metadata, dependency reachability, logging, and safe installation. Separate harness checks cover discovery and invocation metadata. These checks do not enforce byte-for-byte preservation of upstream prose. These checks do not establish model compliance. Instruction tuning follows actual use, not a separate behavioral test suite.

Mako requires completion evidence, but it does not add runtime mission enforcement. pi-subagents' automatic Git-worktree isolation is not a verified jj integration. The [execution contract](skills/mako/references/execution.md) states these limits.

## Structure and provenance

Each skill owns its references, scripts, and metadata. Imported skills retain their upstream license notices. Cross-skill references use exact skill names. Specific playbooks, references, and scripts retain relative file links. Copy the whole bundle when a skill has cross-skill dependencies.

The imports are pinned and adapted according to [the selection record](docs/skill-router-decisions.md). See [upstream provenance](docs/upstream-provenance.md) for licenses, hashes, preserved content, and adaptation boundaries.

## License

This repository is licensed under the [MIT License](LICENSE), copyright 2026 Reese Pollard. Upstream portions retain their original copyrights and licenses, collected in [Third-party notices](THIRD_PARTY_NOTICES.md).

When distributing an individual skill, include the repository license and its applicable upstream notices.

## Safety

Skills can instruct agents to run commands and modify files. Review unfamiliar instructions and scripts before use.

Private generated material belongs in ignored `.artifacts/` directories. Never include those directories when publishing, packaging, or copying a skill. The installer links a local checkout; it is not a publication/export tool.
