# Refine UI

An Agent Skill for evidence-led UI and design-system refinement.

It inspects a rendered product, presents visual gaps for the user to choose from, interviews the selected direction, creates temporary HTML/CSS mockups outside the product repository, and validates one accepted direction in production before broader rollout.

## Status

First iteration. The visual-mockup discipline is intentionally kept as a reference inside this package so it can be improved in context and extracted into a separate skill later without changing its interface.

## Package

```text
.
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── BROWSER-OBSERVATION.md
    ├── DESIGN-DISCIPLINE.md
    ├── HTML-REPORT.md
    ├── PDF-REFERENCE.md
    └── VISUAL-MOCKUPS.md
```

## Use with Pi

Load the repository as an explicit skill:

```bash
pi --skill /absolute/path/to/ui-design
```

Or install/copy the directory into one of Pi's discovered skill locations and invoke:

```text
/skill:refine-ui
```

The skill is user-invoked only. It does not install browser or PDF tooling. It discovers already available capabilities and asks before adding anything.

## Artifact policy

Generated audit reports, screenshots, and HTML/CSS mockups go directly to a fresh OS temp directory. They are never created inside the product repository by default. Only user-approved production implementation and durable design decisions belong in the product repository.
