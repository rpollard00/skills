# Project Design Memory and System Evolution

Use this reference to understand, extend, and record a project's design system without turning every local refinement into a global abstraction.

## The four layers

Treat these as related but distinct evidence:

1. **Domain context:** `CONTEXT.md` or its equivalent defines product terms. Use those terms in UI content; do not store visual rules there.
2. **Design memory:** root `DESIGN.md` is the canonical entry point for visual and interaction intent, selection rules, invariants, and accepted exceptions. It may link to deeper project documentation.
3. **Executable system:** tokens, reusable modules, assets, and patterns constrain production choices.
4. **Rendered proof:** representative product surfaces and states show whether the other layers work in composition.

The rendered product is authoritative evidence of the current experience, not necessarily of intended design. A disagreement among documented intent, executable constraints, and rendered output is itself a finding. Do not “fix” the rendering to match stale documentation without user confirmation.

## System model

A useful design system provides constrained, visibly distinct choices and rules for selecting among them. Look for these layers:

- **Foundations:** type, spacing, sizing, color, border, radius, depth, opacity, motion, icon, and image systems.
- **Semantic tokens:** product meanings such as primary text, raised surface, critical status, or section spacing, separated from raw values.
- **Primitives:** reusable controls and small structures that own semantics, accessibility, states, and responsive behavior.
- **Patterns:** recurring compositions that encode a product-level task or information relationship.
- **Reference surfaces:** rendered contexts proving the system works with realistic content and states.

Do not define everything up front. Introduce or deepen a system when a real decision would otherwise be made repeatedly. Prefer a constrained scale whose neighboring choices are meaningfully different over arbitrary values or an exhaustive continuum.

## Inspect before proposing

Before diagnosing system impact, locate and compare:

- root and scoped `CONTEXT.md` files;
- root `DESIGN.md`, deeper design guidelines, token documentation, and project conventions;
- token definitions and theme adapters;
- reusable primitives and patterns;
- component catalogs and visual tests;
- tightly coupled screen elements that may contain reusable behavior;
- representative rendered consumers, not only isolated catalog stories.

Do not assume a component catalog is current or that similarly named source values render equivalently.

During observation, keep a temporary design-system profile outside the repository. Record whether root `DESIGN.md` exists and what it should index, but do not modify project design memory before the user approves a direction.

## Classify the system relationship

For each proposed direction, choose the narrowest honest relationship:

1. **Reuse:** an existing module already has the right semantics and behavior.
2. **Deepen:** an existing reusable module needs a coherent new semantic capability.
3. **Promote:** a tightly coupled embedded pattern can become a reusable module for its existing context and the new need.
4. **Add:** no existing or embedded implementation supplies the concept, but the evidence justifies a new reusable module or token.
5. **Keep local:** the decision belongs to one composition and reuse would create a weak abstraction.

Do not equate repeated markup with a shared concept. Conversely, do not add a second local implementation when an embedded pattern and the new need are two concrete consumers of one stable concept.

## Embedded-pattern promotion

Use these terms:

- **Embedded pattern:** a coherent element whose implementation is tightly coupled to one current surface.
- **Promotion candidate:** an embedded pattern that may support a small reusable interface across its current surface and the selected refinement.
- **Promotion:** extracting the module, migrating the existing consumer, and applying it to the new consumer.

Offer promotion when all of these are credible:

- the existing and proposed usages share semantics, states, and visual invariants—not only DOM shape;
- the concept has a stable product or interface name;
- a small semantic interface can support both concrete consumers;
- extraction centralizes meaningful accessibility, behavior, responsive rules, tokens, or visual decisions;
- the existing consumer can be migrated without unrelated redesign.

Reject or defer promotion when it would require:

- a bag of cosmetic flags or arbitrary class overrides;
- consumer-specific branches throughout the implementation;
- an interface nearly as complex as maintaining the two usages;
- speculative flexibility for consumers that do not exist;
- coupling unrelated domain concepts because they happen to look alike.

A strong interface names intent, such as `emphasis="status"`, rather than implementation, such as `grayHeader` or `largePadding`. The reusable module should hide more design and behavior complexity than its callers must learn.

## Candidate and direction artifacts

A visual-gap candidate with system implications should state:

- current system relationship: reuse, deepen, promote, add, or keep local;
- evidence for that classification;
- likely system surface: foundation, semantic token, primitive, pattern, or reference surface;
- existing and proposed consumers for a promotion candidate;
- whether the recommendation changes extraction or migration scope.

During mockups, preserve accepted project constraints unless changing one is the explicit design question. For every alternative, record a concise **system delta**:

- reused choices;
- additions or changes;
- promotion or migration scope;
- deliberate exceptions;
- unresolved system decisions.

The direction gate approves both the visual direction and its stated system delta. Do not hide an extraction or migration inside production implementation.

## Production slice for a promotion

When promotion is approved, the smallest trustworthy slice usually includes:

1. the extracted reusable module;
2. the original embedded consumer migrated to it;
3. the new refined consumer;
4. focused tests at the module's interface where useful;
5. rendered comparison of both consumers and relevant states.

Preserve the original consumer's behavior unless the approved direction explicitly changes it. Avoid migrating additional callers until both concrete consumers validate the interface. If two consumers reveal incompatible semantics, keep them local or redesign the interface rather than adding escape hatches.

## `DESIGN.md` policy

Root `DESIGN.md` is the canonical design-memory entry point. Existing component catalogs, token docs, framework documentation, and deeper guidelines remain valuable sources, but they do not waive the root file; link to them from a minimal root index instead of duplicating them. If an explicit repository policy forbids even a root index, stop at the direction gate, surface the conflict, and ask the user where design memory should live. Never silently omit the root file or choose another location.

Create the file lazily when the first design direction is approved, not merely because the skill ran. Update it inline as later decisions crystallize rather than batching design memory into a final cleanup phase.

`DESIGN.md` documents the system's human- and agent-facing interface:

- product character expressed as actionable contrasts;
- hierarchy and composition rules;
- available systems and how to choose among them;
- semantic token meanings;
- reusable module intent, variants, and invariants;
- responsive and accessibility rules;
- canonical rendered reference surfaces;
- accepted exceptions and known legacy drift;
- paths to executable sources of truth.

Do not manually duplicate exhaustive raw token values when code already owns them. Point to the executable source and document meanings and selection rules. If a rendered or generated token catalog exists, link it rather than reproducing it by hand.

A useful starting shape is:

```markdown
# Design

## Product character
## Hierarchy and composition
## Foundations
### Typography
### Spacing and sizing
### Color
### Shape and depth
### Motion and imagery
## Semantic tokens
## Primitives and patterns
## Responsive behavior
## Accessibility invariants
## Reference surfaces
## Exceptions and legacy drift
```

For each documented system or reusable module, capture only what is useful:

```markdown
### Summary panel

Status: established
Intent: Summarize current status, supporting facts, and relevant actions.
Choose it when: ...
Invariants: ...
Semantic variants: ...
Avoid: ...
Implementation: `src/design-system/patterns/SummaryPanel`
Reference surfaces: Account overview; Billing overview
```

Use status labels only when they clarify truth:

- **Established:** approved and represented in production.
- **Provisional:** direction-approved and deliberately under rendered validation.
- **Legacy:** observed behavior that conflicts with accepted intent.
- **Exception:** an approved divergence with a load-bearing reason.

## Active design-memory lifecycle

Maintain design memory as decisions happen:

1. **Direction approved:** create root `DESIGN.md` if absent and add or update the accepted rule as provisional. Include its validation surface and proposed system delta.
2. **Slice refined:** update the provisional entry inline when the accepted intent changes.
3. **Direction abandoned or replaced:** remove, supersede, or clearly reject its provisional entry before returning to exploration.
4. **Rendered result accepted:** mark supported rules established and reconcile implementation paths, consumers, and reference surfaces.
5. **Wider rollout approved:** extend the established entry only as far as the migrated evidence justifies.

Do not fill empty sections speculatively. A minimal first file containing one resolved decision is better than an impressive fictional system.

After rendered acceptance:

- encode accepted choices in the appropriate token, primitive, or pattern;
- migrate only the consumers justified by the user's rollout decision;
- update a component catalog or reference surface when one exists;
- record deliberate exceptions rather than hiding them;
- remove stale documentation contradicted by the accepted result.

Every approved direction can bootstrap design memory, including a local rule whose scope is stated honestly. Promotions, semantic token changes, new selection rules, and load-bearing exceptions should always update it.
