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
├── scripts/
│   └── extract-pdf-reference.sh
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
pi --skill /absolute/path/to/skills/skills/design/refine-ui
```

Or install/copy the directory into one of Pi's discovered skill locations and invoke:

```text
/skill:refine-ui
```

The skill is user-invoked only. It does not install browser or PDF tooling. It discovers already available capabilities and asks before adding anything. Its PDF helper uses existing Poppler commands to build page-labelled Markdown and an optional all-page PNG cache in the skill's ignored `.artifacts/` directory.

## Recommended peer skill

`refine-ui` composes Matt Pocock's model-invoked `grilling` discipline for its interview rounds. Install it separately when it is not already available:

```bash
npx skills@latest add mattpocock/skills --skill=grilling
```

Restart or reload the harness afterward. Without `grilling`, the skill announces and uses a reduced fallback interview.

Temporary mockups prefer Tailwind CSS v4's Play CDN and fall back to embedded CSS when external requests are unavailable or inappropriate. Tailwind is never installed into the product repository for exploration.

## Compatibility

- **Pi:** `disable-model-invocation: true` registers an explicit `/skill:refine-ui` command when the package is installed or loaded.
- **OpenAI-compatible skill loaders:** `agents/openai.yaml` supplies display metadata and disables implicit invocation where that policy is recognized.
- **Generic Agent Skill loaders:** load `SKILL.md` explicitly. If the loader ignores invocation metadata, explicit invocation and all three user pauses remain behavioral requirements.

Unknown metadata may be ignored by a harness; the workflow does not depend on automatic enforcement.

## Artifact policy

Generated audit reports, screenshots, and HTML/CSS mockups go directly to a fresh OS temp directory or another user-approved location outside the product repository. They are never created, staged, or copied inside the product repository. Only user-approved production implementation, durable design decisions, and approved production visual-test baselines belong there.
