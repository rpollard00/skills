# Reese's Skills

Agent skills I use to make recurring workflows deliberate, inspectable, and easier to improve.

These are small capability packages rather than one end-to-end methodology. User-invoked skills orchestrate a workflow and stop at decision points; model-invoked skills hold reusable disciplines an agent can apply when a task matches.

## Skills

### Design

- **[refine-ui](skills/design/refine-ui/SKILL.md)** — Inspect a rendered UI or design system, present evidence-backed gaps, explore a chosen direction with temporary HTML/CSS mockups, and validate the accepted direction before rollout.

See the [design skills index](skills/design/README.md) for invocation details and classification.

## Repository structure

```text
skills/
└── <category>/
    ├── README.md
    └── <skill-name>/
        ├── SKILL.md
        ├── agents/
        ├── references/
        ├── scripts/
        └── assets/
```

Every skill is self-contained. Only `SKILL.md` is required; references, scripts, assets, and harness metadata live beside the skill that owns them.

## Use with Pi

For development, load one skill directly:

```bash
pi --skill /absolute/path/to/skills/skills/design/refine-ui
```

Or link every maintained skill into local Agent Skills directories:

```bash
./scripts/link-skills.sh
```

Restart Pi or run `/reload` after changing installed skills. Invoke user-invoked skills explicitly, for example:

```text
/skill:refine-ui
```

## Safety

Skills can instruct an agent to execute commands and modify files. Review each `SKILL.md` and any scripts before installing or invoking it.

The linking script is maintainer-oriented. It creates symlinks and refuses to overwrite existing files or links it does not own.

## Status

This is a personal, evolving collection. Skills may be revised as their workflows encounter real projects; compatibility and publishing infrastructure will be added only when the collection needs them.
