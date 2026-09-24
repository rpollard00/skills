# Mako layout and dependency loading

## Status

This layout is implemented in the source tree, but not globally installed. Full-bundle discovery tests pass in pi, Codex, and OpenCode 2. See [mako-harness-compatibility.md](mako-harness-compatibility.md) for exact evidence and remaining limits. The fixture history below records the original design experiment.

## Source layout

Keep the existing category structure. Add engineering workflows and independent engineering principles.

```text
skills/
  engineering/
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
    ...
  engineering-principles/
    README.md
    principle-model-the-domain/
      SKILL.md
    principle-boundary-discipline/
      SKILL.md
    ...
  design/
    refine-ui/
      SKILL.md
  version-control/
    jj/
      SKILL.md
  writing/
    writing/
      SKILL.md
    ...
```

Mako owns task routing and workflow composition. Its playbooks sequence reusable skills without duplicating their procedures. Independent skills remain usable without Mako.

The principle index contains concrete triggers, short summaries, and links. Load the index when Mako starts. Load full principles only when their triggers apply. A standalone skill links directly to each principle it requires.

Mako and principles use explicit-only discovery where supported. Invocation policy for every other skill must be determined individually, not copied from the fixture test.

## Preserve the bundle hierarchy

Prefer one bundle symlink instead of flattening every skill into the installed directory:

```text
~/.agents/skills/reese -> <checkout>/skills
```

The bundle and category directories have no `SKILL.md`. Only leaf skill directories do. This lets a recursive loader discover each skill by its frontmatter name.

All cross-skill links use source-relative paths. For example, from `skills/engineering/mako/SKILL.md`:

```text
../architect/SKILL.md
../../engineering-principles/principle-model-the-domain/SKILL.md
../../writing/writing/SKILL.md
```

Resolve a link against the file that contains it. A nested playbook or reference needs its own correct relative path.

The same hierarchy exists through the bundle symlink, in the source checkout, and in a whole-bundle copy. Hidden skills remain readable through these explicit paths. They do not need automatic skill discovery to supply their content.

No generated dependency index is necessary for this layout. Skill names remain the public identity; relative links supply the file location.

## Pi test evidence

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
2. Validate cross-skill file links before installation.
3. Link the whole skill bundle into supported destination directories.
4. Detect existing per-skill links and separately installed copies before making changes.
5. Preview any migration from flat links. Remove only confirmed repo-owned links during an explicitly approved migration.
6. Preserve unrelated skills and local modifications. Never replace a separately installed copy merely because its name matches.
7. Keep private `.artifacts/` material out of exported or published bundles.

The existing installed architecture skills are separate directories, not links owned by this repository. Their eventual replacement requires comparison and an explicit migration decision.

## Other harnesses and fallback

The committed harness checks exercise recursive discovery, symlink traversal, explicit-only metadata, and dependency reads. Interactive commands and model behavior remain separate tests.

If a harness cannot discover the hierarchy, first assess whether explicit skill registration can preserve canonical source paths. Only introduce a generated installation mapping or export adapter if needed. Do not change the portable source layout to match one harness prematurely.

## Design history and next validation

Review [mako-entrypoint-draft.md](mako-entrypoint-draft.md), [mako-dependency-map.md](mako-dependency-map.md), and [mako-routing-cases.md](mako-routing-cases.md). These capture the proposed routing contract, dependency ownership, and behavioral acceptance cases.

The drafts remain outside the discoverable skills tree as design history. The executable entry point is `skills/engineering/mako/SKILL.md`. Run behavioral evaluations against that implementation, not the draft.
