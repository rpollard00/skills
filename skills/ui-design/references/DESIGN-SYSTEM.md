# Project design memory and system evolution

Use this reference to understand, extend, and record a project's design system without turning every local refinement into a global abstraction.

## The four layers

Treat these as related but distinct evidence:

1. **Domain context.** `CONTEXT.md` or its equivalent defines product terms. Use those terms in UI content. Do not store visual rules there.
2. **Design memory.** Root `DESIGN.md` is the canonical entry point for visual and interaction intent, selection rules, invariants, and accepted exceptions. It can link to deeper project documentation.
3. **Executable system.** Tokens, reusable modules, assets, and patterns constrain production choices.
4. **Rendered proof.** Representative product surfaces and states show whether the other layers work in composition.

The rendered product is authoritative evidence of the current experience, not necessarily of intended design. A disagreement among documented intent, executable constraints, and rendered output is itself a finding. Resolve it against the task's authority and current evidence. Do not change a parity baseline or restyle a scoped bug fix to match stale documentation.

## System model

A useful design system provides constrained, visibly distinct choices and rules for selecting among them. Look for these layers:

- **Foundations.** Type, spacing, sizing, color, border, radius, depth, opacity, motion, icon, and image systems.
- **Semantic tokens.** Product meanings such as primary text, raised surface, critical status, or section spacing, separated from raw values.
- **Primitives.** Reusable controls and small structures that own semantics, accessibility, states, and responsive behavior.
- **Patterns.** Recurring compositions that encode a product-level task or information relationship.
- **Reference surfaces.** Rendered contexts proving the system works with realistic content and states.

Do not define everything up front. Introduce or deepen a system when the same real decision would otherwise repeat. Prefer a constrained scale whose neighboring choices are meaningfully different over arbitrary values or an exhaustive continuum.

## Inspect before proposing

Before diagnosing system impact, locate and compare:

- root and scoped `CONTEXT.md` files
- root `DESIGN.md`, deeper design guidelines, token documentation, and project conventions
- token definitions and theme adapters
- reusable primitives and patterns
- component catalogs and visual tests
- tightly coupled screen elements that can contain reusable behavior
- representative rendered consumers, not only isolated catalog stories

Do not assume a component catalog is current, or that similarly named source values render equivalently.

During read-only observation, keep findings in the caller's output or an approved external artifact. Record whether root `DESIGN.md` exists and what a useful entry would index. Do not modify project design memory during an audit.

## Classify the system relationship

For each proposed direction, choose the narrowest honest relationship:

1. **Reuse.** An existing module already has the right semantics and behavior.
2. **Deepen.** An existing reusable module needs a coherent new semantic capability.
3. **Promote.** A tightly coupled embedded pattern can become a reusable module for its existing context and the new need.
4. **Add.** No existing or embedded implementation supplies the concept, but the evidence justifies a new reusable module or token.
5. **Keep local.** The decision belongs to one composition, and reuse would create a weak abstraction.

Do not equate repeated markup with a shared concept. Conversely, do not add a second local implementation when an embedded pattern and the new need are two concrete consumers of one stable concept.

## Embedded-pattern promotion

Use these terms:

- **Embedded pattern.** A coherent element whose implementation is tightly coupled to one current surface.
- **Promotion candidate.** An embedded pattern that can support a small reusable interface across its current surface and the selected refinement.
- **Promotion.** Extracting the module, migrating the existing consumer, and applying it to the new consumer.

Offer promotion when all of these are credible:

- the existing and proposed usages share semantics, states, and visual invariants, not only DOM shape
- the concept has a stable product or interface name
- a small semantic interface can support both concrete consumers
- extraction centralizes meaningful accessibility, behavior, responsive rules, tokens, or visual decisions
- the existing consumer can be migrated without unrelated redesign

Reject or defer promotion when it would require:

- a set of cosmetic flags or arbitrary class overrides
- consumer-specific branches throughout the implementation
- an interface nearly as complex as maintaining the two usages
- speculative flexibility for consumers that do not exist
- coupling unrelated domain concepts because they happen to look alike

A strong interface names intent, such as `emphasis="status"`, rather than implementation, such as `grayHeader` or `largePadding`. The reusable module must hide more design and behavior complexity than its callers learn.

## Decisions with system implications

When a decision affects the system, record useful implications in the caller's artifact:

- current system relationship: reuse, deepen, promote, add, or keep local
- evidence for that classification
- likely system surface: foundation, semantic token, primitive, pattern, or reference surface
- existing and proposed consumers for a promotion candidate
- whether the recommendation changes extraction or migration scope

During mockups, preserve accepted project constraints unless changing one is the explicit design question. For every alternative, record a concise **system delta**:

- reused choices
- additions or changes
- promotion or migration scope
- deliberate exceptions
- unresolved system decisions

Keep extraction and migration within the caller's authority. State their scope before implementation instead of hiding them inside a visual change.

## Production slice for a promotion

When promotion is authorized, the smallest trustworthy slice usually includes:

1. the extracted reusable module
2. the original embedded consumer, migrated to it
3. the new refined consumer
4. focused tests at the module's interface, where useful
5. rendered comparison of both consumers and relevant states

Preserve the original consumer's behavior unless the authorized task explicitly changes it. Avoid migrating additional callers until both concrete consumers validate the interface. If two consumers reveal incompatible semantics, keep them local or redesign the interface rather than adding escape hatches.

## `DESIGN.md` policy

Root `DESIGN.md` is the design-memory entry point when durable decisions warrant it. Link deeper guidelines, component catalogs, and executable tokens instead of duplicating them. Respect read-only tasks and explicit project restrictions. If project policy forbids a root index, report the restriction and use only an authorized location.

Create or update design memory only when the task permits writes and a useful durable decision exists, not merely because this skill ran. Record the actual decision source: agent-selected under task authority, explicitly user-approved, or inherited project intent. Never describe an autonomous choice as user-approved.

`DESIGN.md` documents the system's human- and agent-facing interface:

- product character expressed as actionable contrasts
- hierarchy and composition rules
- available systems and how to choose among them
- semantic token meanings
- reusable module intent, variants, and invariants
- responsive and accessibility rules
- canonical rendered reference surfaces
- accepted exceptions and known legacy drift
- paths to executable sources of truth

Do not manually duplicate exhaustive raw token values when code already owns them. Point to the executable source and document meanings and selection rules. If a rendered or generated token catalog exists, link it rather than reproducing it by hand.

Record only the intent, selection rule, invariants, implementation links, exceptions, and reference surfaces that help the next task. Do not fill empty sections or invent a complete system.

## Decision source and verification state

Keep authority and evidence separate. A user-approved direction can still be unverified. An agent-selected decision can have rendered evidence without user acceptance.

For each consequential rule, make clear:

- who selected it and under what task authority
- whether it is proposed, under validation, supported by rendered evidence, or superseded
- which surfaces and states support it, and which remain unverified
- whether an exception or legacy drift conflicts with the current intent

Update or remove stale decisions when new evidence or authorized choices replace them. Do not record a rejected direction as active intent. The caller owns any provisional/established lifecycle and approval gates; this reference adds none.

After verification, encode supported choices in tokens, primitives, or patterns when warranted. Migrate only authorized consumers, reconcile implementation links, and record exceptions with their reasons. Update an existing catalog or reference surface when the choice affects it. Keep raw token values canonical in executable sources.
