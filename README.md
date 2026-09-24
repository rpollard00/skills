# Reese's Skills

Agent skills for repeatable engineering, design, version-control, and writing work.

## Mako

[Mako](skills/engineering/mako/SKILL.md) is the explicit software-engineering router. Invoke it with a task. It selects the workflow, loads the required skills, and stays active in that conversation until you opt out.

It does not announce activation or narrate skill selection. Progress, evidence, decisions, and approval gates remain visible.

The collection contains 52 skills: 24 engineering skills, 23 independent engineering principles, and the five existing design, version-control, and writing skills. Mako also owns 19 task playbooks.

## Categories

- [Engineering](skills/engineering/README.md): Mako, investigation, design, implementation workflows, review, verification, and delivery.
- [Engineering principles](skills/engineering-principles/README.md): independent, explicit-only guidance selected when applicable.
- [Design](skills/design/README.md): the existing [refine-ui](skills/design/refine-ui/SKILL.md) workflow and visual approval gates.
- [Version control](skills/version-control/README.md): [jj](skills/version-control/jj/SKILL.md) owns operations when `.jj` exists.
- [Writing](skills/writing/README.md): the existing writing router, simple-technical-english, and unslop.

## Try Mako without installation

In pi, load just its entry point for one session:

```bash
pi --skill /absolute/path/to/skills/skills/engineering/mako
```

Then invoke it:

```text
/skill:mako investigate how cancellation works
```

In any supported harness, you can also explicitly ask the agent to read the absolute path to `skills/engineering/mako/SKILL.md` and apply it to a task. Dependencies resolve from that source path. This requires no global installation.

## Install the bundle

Keep the category hierarchy. A flat skill-by-skill installation breaks source-relative dependency paths.

The installer uses Python 3.10+ and PyYAML. Install its dependency in your development environment, then preview:

```bash
python3 -m pip install -r scripts/requirements.txt
./scripts/link-skills.sh
```

The default target is:

```text
~/.agents/skills/reese -> <checkout>/skills
```

The script makes no changes unless you add `--apply`. For a prior flat installation, preview removal of this checkout's own links:

```bash
./scripts/link-skills.sh --migrate-owned-flat
```

Review the plan, then apply it:

```bash
./scripts/link-skills.sh --migrate-owned-flat --apply
```

The installer refuses foreign links, separately installed copies, duplicate names, invalid metadata, and broken dependencies. It does not overwrite a copy merely because its name matches. Compare and preserve local modifications before separately authorizing their replacement.

Use `--destination /path/to/skills` for a different discovery root. Common user roots are checked for collisions; project-local roots and custom configuration paths are not exhaustively audited. No harness configuration file is changed.

Reload the harness after installation. Native entry points are `/skill:mako` in pi, `$mako` in Codex, and the `@mako` skill completion in OpenCode 2. Supply the task after selecting the skill. Interactive UI behavior remains separate from the discovery tests.

## Validate

```bash
python3 scripts/validate_skills.py
python3 -m unittest discover -s tests -v
```

[Harness compatibility](docs/mako-harness-compatibility.md) records tested versions and commands. The checks cover metadata, dependency reachability, protected upstream content, logging, safe installation, and actual harness discovery. Behavioral agent evaluations are not included in those passing results.

Mako requires completion evidence, but it does not add runtime mission enforcement. pi-subagents' automatic Git-worktree isolation is not a verified jj integration. The [execution contract](skills/engineering/mako/references/execution.md) states these limits.

## Structure and provenance

Each skill owns its references, scripts, metadata, and license. Shared procedures use explicit relative links. Copy the whole bundle when a skill has cross-category dependencies.

The imports are pinned and adapted according to [the selection record](docs/skill-router-decisions.md). See [upstream provenance](docs/upstream-provenance.md) for licenses, hashes, preserved content, and adaptation boundaries.

## Safety

Skills can instruct agents to run commands and modify files. Review unfamiliar instructions and scripts before use.

Private generated material belongs in ignored `.artifacts/` directories. Never include those directories when publishing, packaging, or copying a skill. The installer links a local checkout; it is not a publication/export tool.
