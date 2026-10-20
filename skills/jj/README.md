# Jujutsu skill

An explicit-only skill for bootstrapping and working safely in normal, colocated Git/Jujutsu repositories.

It corrects the two mistakes models most often make:

1. treating the workspace as Git-style uncommitted files plus a staging area, rather than the current commit `@`;
2. treating Jujutsu's storage backend and Git colocation as the same question, or presenting the less-common non-colocated setup as the normal path.

## Package

```text
jj/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── CONFLICTS.md
    ├── REVSETS-AND-BOOKMARKS.md
    └── SITUATIONS.md
```

`SKILL.md` contains the mental model, safety rules, orientation steps, and normal editing loop. References are loaded only for the relevant advanced operation or conflict.

Conflict handling remains part of this skill rather than a second overlapping skill. An explicit Jujutsu request activates `jj` for conflict tasks, while `SKILL.md` requires the dedicated conflict reference to be loaded immediately. This keeps one discovery interface and one source of truth while preserving a small default context.

## Assumptions

- Jujutsu is installed and available as `jj`.
- Repositories use the Git backend, as normal public jj workflows do.
- Repositories are colocated by default. Non-colocated Git-backed repositories require an explicit request or concrete constraint.
- Command syntax follows current official documentation but consequential commands are checked against installed `jj help` because jj evolves quickly.

## Use with Pi

```bash
pi --skill /absolute/path/to/skills/skills/jj
```

Then explicitly invoke `/skill:jj` for the requested Jujutsu task. Implicit invocation is disabled.
