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

Use the caller's task, scope and authority, project context and design constraints, and available artifacts. Artifacts can include source, design memory, fixtures, screenshots, or a running product. Return or record only useful decisions, implementation implications, verification evidence, and gaps. Use the caller's output format; do not create a report just to fill a template.

The caller owns workflow, approval gates, and delivery. An autonomous UI task does not require an interactive design session. Use `refine-ui` when the user requests interactive exploration. This skill never grants permission to widen scope, restyle a bug fix, change a parity baseline, or write project files during an audit. Read-only work returns findings without changing root `DESIGN.md`.

Reuse accepted project intent and executable constraints. Do not perpetuate known filler solely because it exists. Report out-of-scope defects instead of silently correcting them.

## Core discipline

- For new UI, [compose from the task](references/DESIGN-DISCIPLINE.md#compose-from-the-task) before choosing a page shell or component arrangement. Reuse accepted project structure for scoped changes.
- Use [User task and content](references/DESIGN-DISCIPLINE.md#1-user-task-and-content) for copy and data presentation, and [States](references/DESIGN-DISCIPLINE.md#8-states-responsiveness-and-motion) for recovery and unavailable data.
- Match containers, navigation, expression, and density to the product. Cards, sidebars, brand voice, and rich imagery are valid choices, not defaults or defects.
- Apply `writing` to user-visible strings, including strings in templates, JSX, source code, and localization. Factual copy uses `simple-technical-english`; persuasive or brand prose uses `unslop`.

## Load references progressively

Read each applicable reference before the action it governs:

- For design judgment about content, hierarchy, composition, or appearance: [Design discipline](references/DESIGN-DISCIPLINE.md).
- For design-system choices or durable design memory: [Design system](references/DESIGN-SYSTEM.md). Root `DESIGN.md` indexes useful decisions and deeper sources, not a template to fill.
- For browser observation or rendered verification: [Browser observation](references/BROWSER-OBSERVATION.md).
- When a temporary mockup can resolve the caller's question: [Visual mockups](references/VISUAL-MOCKUPS.md). The caller decides whether a mockup is needed and its artifact scope.
- When the task needs design judgment: [Licensed reference consultation](references/PDF-REFERENCE.md). Search a usable licensed cache when available, including the legacy private cache. PDF access is not required for tasks that do not need that reference.

Before delegating UI implementation, include this skill and the relevant references in the brief. Pass the task, authority limits, accepted constraints, and evidence pointers before the delegate writes UI.

## Evidence

Verify on the matching rendered surface with a proportional viewport, state, and theme matrix. Inspect actual images when image capability is available, together with runtime and interaction evidence. Source, clean console output, and screenshot existence alone do not prove visual correctness.

Verify the planned content, hierarchy, and state behavior. Assess content purpose separately from layout efficiency: a large card or an offscreen action does not alone establish unnecessary content. Diagnose sizing, spacing, grouping, and order before cutting useful information. For read-only or fixed-baseline work, return findings without changing the artifact.

Use stable capture conditions. Edits invalidate affected evidence; fix defects and recapture before claiming success. A caller can omit an unnecessary mockup, but cannot count uninspected images as verified. Report missing capabilities and unverified cells honestly. Keep temporary reports, screenshots, and mockups outside the product repository. Do not install tools or dependencies without approval.
