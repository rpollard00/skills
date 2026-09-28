---
name: ui-design
description: Shared UI design discipline for scoped investigation, implementation, review, and rendered verification. Load explicitly or as a dependency before UI planning or implementation. Does not activate an interactive workflow or expand authority.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# UI design

Make the user's task clear through controls, information hierarchy, and realistic content. This is a reusable working discipline, not an end-to-end workflow.

## Interface and authority

Use the caller's task, authority, project constraints, and available evidence. Return useful decisions, implementation implications, verification, and gaps in the caller's format.

The caller owns scope, workflow, approvals, and delivery. Use `refine-ui` only for requested interactive exploration. This skill grants no authority to expand scope, restyle repairs, change parity baselines, or write project files during read-only audits. Read-only work must not change root `DESIGN.md`.

Reuse accepted project intent and executable constraints. Report out-of-scope defects instead of correcting them. Do not preserve known filler solely because it exists.

## Core discipline

- For new UI, [compose from the task](references/DESIGN-DISCIPLINE.md#compose-from-the-task) before choosing components. Reuse accepted structure for scoped changes.
- Use [User task and content](references/DESIGN-DISCIPLINE.md#1-user-task-and-content) for text and data, and [States](references/DESIGN-DISCIPLINE.md#8-states-responsiveness-and-motion) for recovery and unavailable data.
- Match containers, navigation, expression, and density to the product. Cards, sidebars, brand voice, and rich imagery are valid choices.
- Apply `writing` to all user-visible strings, including code and localization. Factual text uses `simple-technical-english`. Persuasive or brand prose uses `unslop`.

## Load references progressively

Read applicable references before the actions they govern:

- Content, hierarchy, composition, appearance: [Design discipline](references/DESIGN-DISCIPLINE.md).
- Design systems or durable memory: [Design system](references/DESIGN-SYSTEM.md). Root `DESIGN.md` indexes useful decisions and deeper sources.
- Rendered verification: [Browser observation](references/BROWSER-OBSERVATION.md).
- Temporary exploration: [Visual mockups](references/VISUAL-MOCKUPS.md). The caller controls whether a mockup is needed and its scope.
- Design judgment: [Licensed reference consultation](references/PDF-REFERENCE.md). Search available licensed caches, including the legacy private cache. Tasks unrelated to that reference need no PDF access.

Before UI delegation, pass this skill, applicable references, task, authority limits, accepted constraints, and evidence pointers.

## Evidence

Verify the matching rendered surface across proportional viewport, state, and theme coverage. Inspect actual images alongside runtime and interaction evidence. Report missing capabilities and unverified states. Source, console output, and screenshot existence alone do not prove visual correctness.

Verify planned content, hierarchy, and state behavior. Assess content purpose separately from layout efficiency. Read-only or fixed-baseline work returns findings without changes.

Use stable capture conditions. Recapture affected states after edits. Keep temporary artifacts in a fresh task-owned directory outside the product repository. Do not overwrite or adopt another task's temporary files. Do not install tools or dependencies without approval.
