# Mako harness compatibility

The bundle contains one directory per skill under one `reese -> <checkout>/skills` symlink. Tests use isolated homes and temporary discovery directories. No model turn or global installation is required.

## Tested capabilities

- Installed pi loader
  - Discovery evidence: All 53 skills through the bundle symlink, no diagnostics; sibling dependency reads resolve, including ui-design's moved references and PDF helper
  - Explicit-only evidence: All hidden skills absent from `formatSkillsForPrompt`; visible skills remain
- Codex CLI 0.155.0 (prior 52-skill bundle; not rerun for the ui-design extraction)
  - Discovery evidence: All 52 enabled skills returned by `skills/list` through both `.agents/skills` and `.codex/skills`
  - Explicit-only evidence: All 45 explicit-only skills absent from `debug prompt-input`; seven model-invoked bundle skills remain
- OpenCode v2.0.15 (prior 52-skill bundle; not rerun for the ui-design extraction)
  - Discovery evidence: All 52 skills returned by the persistent server's skill API through both `.agents/skills` and native configuration roots; dependency reads resolve
  - Explicit-only evidence: All 45 explicit-only skills return `autoinvoke: false`; the installed prompt-filtering implementation excludes that flag

The OpenCode check does not render a model prompt. Its API result and version-matched source inspection are separate evidence from pi and Codex's rendered-prompt checks.

## Metadata

Pi uses:

```yaml
disable-model-invocation: true
```

Codex uses `agents/openai.yaml`:

```yaml
policy:
  allow_implicit_invocation: false
```

OpenCode 2 uses skill frontmatter:

```yaml
metadata:
  opencode/autoinvoke: "false"
```

The explicit-only skills, including `ui-design`, carry all three. At the original import, `refine-ui` received the OpenCode metadata without a body change; it now composes ui-design. A permission denial is not a substitute: explicit-only skills remain available for deliberate loading.

## Repeat the checks

Install the Python tooling dependency in your development environment:

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/validate_skills.py
python3 scripts/markdown_lists.py
python3 -m unittest discover -s tests -v
```

Run installed-harness checks separately:

```bash
node scripts/test-pi-discovery.mjs /absolute/path/to/pi/dist/core/skills.js
python3 scripts/test-codex-discovery.py --location native
python3 scripts/test-codex-discovery.py --location agents
python3 scripts/test-opencode-discovery.py --location native
python3 scripts/test-opencode-discovery.py --location agents
```

The scripts require the named harness locally. Python integration scripts target a POSIX host. The OpenCode script starts a temporary authenticated loopback server, waits for plugin initialization, and stops its process group afterward. Its generated password stays inside the temporary fixture.

## Probe lessons

The early Codex initialization probe did not establish discovery. A later CLI probe exposed a missing `CODEX_HOME` directory in the fixture. The committed check creates it and successfully initializes the server.

OpenCode's API can return an empty list, then built-in skills, before configuration plugins finish loading. One-shot `api --standalone skill.list` returned too early. The committed test waits on a persistent server for the expected bundle inventory, with a fixed timeout.

The installed v2 parser reads `opencode/autoinvoke` and produces the `autoinvoke` field. Its `SkillInstructions.load` path filters `autoinvoke === false`. The published [skills page](https://opencode.ai/docs/skills/) did not document this v2 field during this check.

Codex documentation: [Agent skills](https://developers.openai.com/codex/skills).

## Not established by these tests

- Interactive invocation UI, multi-turn activation, or behavior after compaction.
- Model compliance with routing, approval gates, or selective dependency loading.
- Full delegated feature, review, or autonomous workflows.
- Runtime enforcement of mission-wide completion evidence.
- pi-subagents automatic Git-worktree isolation in a jj repository.

Tune instructions through actual use. Passing metadata and path checks does not establish model compliance; no standing behavioral test suite is maintained.

## Installation state

`scripts/link-skills.sh` previews by default. It validates the bundle and checks common discovery roots before any mutation. `--apply` creates the bundle link; `--migrate-owned-flat` additionally permits removal of matching symlinks owned by this checkout, including dangling targets from the former category layout.

The original 52-skill installation linked `~/.agents/skills/reese` to this checkout's `skills/` directory. Its validation and second installer preview passed without collisions or pending migrations. The ui-design extraction changes source only and does not replace installed links or configuration. Its isolated Pi discovery check passes for 53 skills. Reload the harness to refresh discovery.

The user authorized deleting the four separate copies of `domain-modeling`, `grilling`, `codebase-design`, and `improve-codebase-architecture` without comparison or backup. The installer then replaced the ten repo-owned per-skill aliases under `~/.agents/skills` and `~/.claude/skills` with the shared bundle installation. Unrelated skills and harness configuration files were left untouched. No new Claude-native bundle link was created; the tested targets are pi, Codex, and OpenCode 2.
