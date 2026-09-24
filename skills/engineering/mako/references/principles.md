# Principle triggers

Select principles by the current decision. Read a selected skill in full before applying it. Do not load all principles by default. Each principle remains independently reusable outside Mako. Scope and caller approval gates remain binding.

| Trigger | Principle |
| --- | --- |
| Sizing a change, adding abstraction, or threading a new signal | [laziness-protocol](../../../engineering-principles/principle-laziness-protocol/SKILL.md) |
| Choosing core data shapes, shared state, or prerequisite work | [foundational-thinking](../../../engineering-principles/principle-foundational-thinking/SKILL.md) |
| Integrating a requirement that challenges the existing design | [redesign-from-first-principles](../../../engineering-principles/principle-redesign-from-first-principles/SKILL.md) |
| Repeated fixes share a premise and fail the same check | [attack-the-premise](../../../engineering-principles/principle-attack-the-premise/SKILL.md) |
| Sequencing additions, cleanup, or a rewrite | [subtract-before-you-add](../../../engineering-principles/principle-subtract-before-you-add/SKILL.md) |
| Tracing too many layers or carrying hidden mutable state | [minimize-reader-load](../../../engineering-principles/principle-minimize-reader-load/SKILL.md) |
| Planned rewrite or migration with explicit verification boundaries | [outcome-oriented-execution](../../../engineering-principles/principle-outcome-oriented-execution/SKILL.md) |
| Weighing product experience against implementation convenience | [experience-first](../../../engineering-principles/principle-experience-first/SKILL.md) |
| A novel or ambiguous design admits materially different approaches | [exhaust-the-design-space](../../../engineering-principles/principle-exhaust-the-design-space/SKILL.md) |
| Nontrivial work benefits from a repeatable tool or proof | [build-the-lever](../../../engineering-principles/principle-build-the-lever/SKILL.md) |
| Stateful logic, scattered branching, or repeated shape assumptions | [model-the-domain](../../../engineering-principles/principle-model-the-domain/SKILL.md) |
| Parsing external input or separating framework wiring from domain logic | [boundary-discipline](../../../engineering-principles/principle-boundary-discipline/SKILL.md) |
| Designing types or reviewing signatures in a typed language | [type-system-discipline](../../../engineering-principles/principle-type-system-discipline/SKILL.md) |
| Mutating operations can run twice, restart, or fail partway | [make-operations-idempotent](../../../engineering-principles/principle-make-operations-idempotent/SKILL.md) |
| Replacing an internal API whose callers can migrate together | [migrate-callers-then-delete-legacy-apis](../../../engineering-principles/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) |
| Concurrent actors can write the same resource | [separate-before-serializing-shared-state](../../../engineering-principles/principle-separate-before-serializing-shared-state/SKILL.md) |
| Accepting a task output or declaring completion | [prove-it-works](../../../engineering-principles/principle-prove-it-works/SKILL.md) |
| Diagnosing a failure or evaluating a workaround | [fix-root-causes](../../../engineering-principles/principle-fix-root-causes/SKILL.md) |
| Sequencing multiple changes, commits, or PRs | [sequence-verifiable-units](../../../engineering-principles/principle-sequence-verifiable-units/SKILL.md) |
| Writing, changing, or retaining a test | [test-behavior-not-implementation](../../../engineering-principles/principle-test-behavior-not-implementation/SKILL.md) |
| Handling large evidence, repeated reads, or delegated phases | [guard-the-context-window](../../../engineering-principles/principle-guard-the-context-window/SKILL.md) |
| Routine authorized execution is about to pause unnecessarily | [never-block-on-the-human](../../../engineering-principles/principle-never-block-on-the-human/SKILL.md) |
| A correction or instruction recurs | [encode-lessons-in-structure](../../../engineering-principles/principle-encode-lessons-in-structure/SKILL.md) |
