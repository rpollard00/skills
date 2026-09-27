# Refine UI

An Agent Skill for evidence-led UI and design-system refinement.

It inspects a rendered product, presents visual gaps for the user to choose from, interviews the selected direction, creates temporary HTML/CSS mockups outside the product repository, validates one accepted direction in production, and evolves the project's design system and durable design memory when the evidence justifies it.

## Status

Active interactive workflow. [ui-design](../ui-design/SKILL.md) owns shared UI judgment, design-system guidance, browser evidence, temporary mockups, and licensed reference consultation. Refine UI owns the three human gates, grilling, reports, and rollout. Install the sibling skills together.

## Package

```text
.
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── DELEGATION.md
    └── HTML-REPORT.md
```

## Use with Pi

Load the repository as an explicit skill:

```bash
pi --skill /absolute/path/to/skills/skills/refine-ui
```

Or install the bundle into one of Pi's discovered skill locations and invoke:

```text
/skill:refine-ui
```

The skill is user-invoked only. It does not install browser or PDF tooling. It discovers already available capabilities and asks before adding anything. The [shared PDF helper](../ui-design/scripts/extract-pdf-reference.sh) uses existing Poppler commands. [Cache discovery](../ui-design/references/PDF-REFERENCE.md) reuses private artifacts here or under `ui-design` without moving or duplicating them.

## Recommended peer skill

`refine-ui` composes Matt Pocock's model-invoked `grilling` discipline for its interview rounds. Install it separately when it is not already available:

```bash
npx skills@latest add mattpocock/skills --skill=grilling
```

Restart or reload the harness afterward. Without `grilling`, the skill announces and uses a reduced fallback interview.

Temporary mockups prefer Tailwind CSS v4's Play CDN and fall back to embedded CSS when external requests are unavailable or inappropriate. Tailwind is never installed into the product repository for exploration.

A mockup is not ready at HTML generation. The workflow renders every required alternative, viewport, and state; captures and visually inspects current screenshots when vision is available; fixes defects; recaptures invalidated evidence; and records the result in a temporary `verification.md`. Models without vision must request user visual verification rather than claim readiness.

## Context-aware delegation

The workflow can use any harness-provided flavor of delegated or isolated execution; it does not require a specific subagent product or command. Context-heavy bounded phases may be handed off before their raw evidence enters the main conversation. Detailed screenshots, browser output, reference material, and source inventories stay in the approved external artifact directory, while the main agent receives compact decision-grade handoffs and stable evidence pointers. Harness-managed outputs are suitable only for compact non-sensitive handoffs.

The main agent retains grilling, synthesis, all three user gates, the canonical direction packet, and root `DESIGN.md`. One capable phase owner handles iterative mockup construction and visual verification end to end; one production writer owns a shared checkout. If suitable delegation is unavailable, the main agent keeps the phase inline with the canonical packet, approved external artifacts, and compact phase notes; it does not create a pointless self-handoff.

## Reference grounding

When a prepared licensed reference cache is available, the workflow must search it twice: broadly before ranking gaps and narrowly after the user selects a design question. A temporary reference brief records the consulted pages or sections, applicable principles paraphrased in the model's own words, product implications, limitations, and search terms. Recommendations must not rely on model memory alone.

## Design-system evolution

The workflow compares documented design intent, executable tokens and reusable modules, and rendered product behavior. It can offer promotion of a tightly coupled embedded pattern when its current usage and the proposed refinement provide two concrete consumers of one small semantic interface.

After the first direction approval, it creates or updates root `DESIGN.md` immediately with provisional design memory. Rendered production acceptance establishes, revises, or removes those entries. The root file indexes deeper sources and records meanings, selection rules, invariants, implementation paths, and reference surfaces; executable token sources remain canonical for raw values.

## Compatibility

- **Pi:** `disable-model-invocation: true` registers an explicit `/skill:refine-ui` command when the package is installed or loaded.
- **OpenAI-compatible skill loaders:** `agents/openai.yaml` supplies display metadata and disables implicit invocation where that policy is recognized.
- **Generic Agent Skill loaders:** load `SKILL.md` explicitly. If the loader ignores invocation metadata, explicit invocation and all three user pauses remain behavioral requirements.

Unknown metadata may be ignored by a harness; the workflow does not depend on automatic enforcement.

## Artifact policy

Generated audit reports, screenshots, and HTML/CSS mockups go directly to a fresh OS temp directory or another user-approved location outside the product repository. They are never created, staged, or copied inside the product repository. Only user-approved production implementation, durable design decisions, and approved production visual-test baselines belong there.
