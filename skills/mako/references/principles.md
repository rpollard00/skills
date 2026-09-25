# Principle triggers

Select principles by the current decision. Read a selected skill in full before applying it. Do not load all principles by default. Each principle remains independently reusable outside Mako. Use engineering judgment within the goal; respect explicit limits and dangerous-action boundaries.

- Sizing a change, adding abstraction, or threading a new signal: `principle-laziness-protocol`
- Choosing core data shapes, shared state, or prerequisite work: `principle-foundational-thinking`
- Integrating a requirement that challenges the existing design: `principle-redesign-from-first-principles`
- Repeated fixes share a premise and fail the same check: `principle-attack-the-premise`
- Sequencing additions, cleanup, or a rewrite: `principle-subtract-before-you-add`
- Tracing too many layers or carrying hidden mutable state: `principle-minimize-reader-load`
- Planned rewrite or migration with explicit verification boundaries: `principle-outcome-oriented-execution`
- Weighing product experience against implementation convenience: `principle-experience-first`
- A novel or ambiguous design admits materially different approaches: `principle-exhaust-the-design-space`
- Nontrivial work benefits from a repeatable tool or proof: `principle-build-the-lever`
- Stateful logic, scattered branching, or repeated shape assumptions: `principle-model-the-domain`
- Parsing external input or separating framework wiring from domain logic: `principle-boundary-discipline`
- Designing types or reviewing signatures in a typed language: `principle-type-system-discipline`
- Mutating operations can run twice, restart, or fail partway: `principle-make-operations-idempotent`
- Replacing an internal API whose callers can migrate together: `principle-migrate-callers-then-delete-legacy-apis`
- Concurrent actors can write the same resource: `principle-separate-before-serializing-shared-state`
- Accepting a task output or declaring completion: `principle-prove-it-works`
- Diagnosing a failure or evaluating a workaround: `principle-fix-root-causes`
- Sequencing multiple changes, commits, or PRs: `principle-sequence-verifiable-units`
- Writing, changing, or retaining a test: `principle-test-behavior-not-implementation`
- Handling large evidence, repeated reads, or delegated phases: `principle-guard-the-context-window`
- Routine execution is about to pause unnecessarily: `principle-never-block-on-the-human`
- A correction or instruction recurs: `principle-encode-lessons-in-structure`
