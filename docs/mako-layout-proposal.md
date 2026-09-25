# Mako layout and dependency loading

## Status

This layout is implemented and installed through `~/.agents/skills/reese -> <checkout>/skills`. Full-bundle discovery tests pass in pi, Codex, and OpenCode 2. See [mako-harness-compatibility.md](mako-harness-compatibility.md) for exact evidence and remaining limits. The fixture history below records the original design experiment.

## Source layout

Each skill lives in a sibling directory under `skills/`. Category directories have been removed. The [shared index](../skills/README.md) lists every skill.

```text
skills/
  README.md
  mako/
    SKILL.md
    playbooks/
    references/
      principles.md
      execution.md
  architect/
    SKILL.md
    references/
  arena/
    SKILL.md
  swarm/
    SKILL.md
  bug-fix/
    SKILL.md
  principle-model-the-domain/
    SKILL.md
  principle-boundary-discipline/
    SKILL.md
  refine-ui/
    SKILL.md
  jj/
    SKILL.md
  writing/
    SKILL.md
  ...
```

Mako owns task routing and workflow composition. Its playbooks sequence reusable skills without duplicating their procedures. Independent skills remain usable without Mako.

The principle index contains concrete triggers and exact skill names. Load the index when Mako starts. Load full principles only when their triggers apply. Standalone skills name the principles they require.

Mako and principles use explicit-only discovery where supported. Invocation policy for every other skill must be determined individually, not copied from the fixture test.

## Preserve sibling dependencies

Prefer one bundle symlink over managing a separate installation link for every skill:

```text
~/.agents/skills/reese -> <checkout>/skills
```

The bundle root has no `SKILL.md`. Only the individual skill directories do. This lets a recursive loader discover each skill by its frontmatter name.

Cross-skill references use exact names such as `architect`, `principle-model-the-domain`, and `writing`. Load them through the harness. When name lookup is unavailable, find the containing skill directory and read its sibling `<name>/SKILL.md`. The rule is defined in [execution](../skills/mako/references/execution.md#resolve-dependencies).

Links to specific playbooks, references, and scripts remain relative to the file containing the link. Human-facing indexes retain navigation links.

The same hierarchy exists through the bundle symlink, in the source checkout, and in a whole-bundle copy. Hidden skills remain readable through these explicit paths. They do not need automatic skill discovery to supply their content.

No generated dependency index is necessary for this layout. Skill names are the public identity; harness discovery or the flat-layout fallback supplies the file location.

## Original pi fixture evidence

A temporary fixture exercised the installed pi implementation:

```text
@earendil-works/pi-coding-agent/dist/core/skills.js
loadSkillsFromDir
formatSkillsForPrompt
```

The fixture contained four skills beneath category directories and one bundle symlink. Results:

- All four skills were discovered with no diagnostics.
- The three explicit-only skills were absent from the formatted model prompt.
- The visible writing fixture remained in that prompt.
- Sibling and cross-category references resolved after normal path normalization.

This tested discovery and file resolution, not model compliance, command UI, compaction behavior, or a complete Mako run. Existing skill installations were unchanged.

## Installer contract

`scripts/link-skills.sh` now follows this contract after target-harness discovery checks:

1. Continue to validate skill names and reject duplicates.
2. Validate metadata and remaining file links before installation. Repository tests also check reachability through known skill names.
3. Link the whole skill bundle into supported destination directories.
4. Detect existing per-skill links and separately installed copies before making changes.
5. Preview any migration from flat links. Remove only confirmed repo-owned links during an explicitly approved migration.
6. Preserve unrelated skills and local modifications. Never replace a separately installed copy merely because its name matches.
7. Keep private `.artifacts/` material out of exported or published bundles.

The user authorized deleting the four separately installed architecture copies. They were removed before installing the bundle; unrelated installations were preserved.

## Other harnesses and fallback

The committed harness checks exercise recursive discovery, symlink traversal, explicit-only metadata, and dependency reads. They do not establish interactive command behavior or model compliance.

If a harness cannot discover the hierarchy, first assess whether explicit skill registration can preserve canonical source paths. Only introduce a generated installation mapping or export adapter if needed. Do not change the portable source layout to match one harness prematurely.

## Design history and usage

[mako-entrypoint-draft.md](mako-entrypoint-draft.md) and [mako-dependency-map.md](mako-dependency-map.md) record the original entry-point design and dependency ownership.

The drafts remain outside the discoverable skills tree as design history. The executable entry point is `skills/mako/SKILL.md`. Tune it from actual use rather than maintaining a separate behavioral test plan.
