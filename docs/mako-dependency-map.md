# Mako dependency map

This design map preceded implementation. The executable dependency references now live in [Mako](../skills/mako/SKILL.md) and its [principle index](../skills/mako/references/principles.md).

Superseding UI ownership: applicable UI routes load `ui-design` before planning or implementation. Feature composes it for content and rendered verification. `refine-ui` uses it for shared discipline and retains interactive exploration, all three human gates, and rollout authority. The original map below remains historical.

## Ownership

- Mako
  - Responsibility: Activation, task selection, cross-cutting triggers, composition, and completion requirements
  - Does not own: Harness process controls or every leaf procedure
- Playbook
  - Responsibility: Ordered task phases and workflow-specific gates
  - Does not own: Duplicate definitions of principles or reusable skills
- Reusable skill
  - Responsibility: One bounded capability and its evidence requirements
  - Does not own: Implicit authority to expand the caller's scope
- Principle skill
  - Responsibility: Shared decision guidance
  - Does not own: Dispatching its own engineering program
- Harness adapter
  - Responsibility: Skill activation, dependency resolution, execution and continuation mechanics
  - Does not own: Product decisions or weaker verification semantics
- Project instructions and version-control skill
  - Responsibility: Local conventions, repository operations, and delivery constraints
  - Does not own: Automatic permission to deploy or merge

## Important dependency paths

```text
Mako
  Investigation -> how [+ why]
  Feature -> how -> architect -> implementer(s) -> runtime verification
                                      |
                                      +-> codebase-design
                                      +-> arena -> candidates + independent judge -> synthesis
  Bug fix -> one bug-fix skill -> reproduction + failing check -> investigation -> fix -> proof
  Architecture audit -> improve-codebase-architecture
                          -> codebase-design
                          -> grilling + domain-modeling
                          -> architect/arena when alternatives are warranted
  UI refinement -> refine-ui -> its own user gates and verification
  Review -> no-comments -> interrogate -> lead disposition
  Verification setup -> create-verification-skill -> project-local verify skill + feature map
  Verification upkeep -> maintain-verification-skill -> source coverage + controlled live pass
  Autonomous run -> task route + decision trail + one continuation owner
  Autopilot-full -> PR owner lifecycle + independent verdict -> authorized Shipping
  Autopilot-stack -> owners + one topology owner + independent verdict -> operator handoff
```

This graph summarizes ownership, not every invocation. Read the selected workflow for the complete sequence.

## Call boundaries that prevent duplicate work

- Architect uses arena for design execution. Matt's alternative-design technique changes the briefs, not the number of orchestration layers.
- Arena runners produce one candidate each. They do not recursively run architect or arena.
- A caller can request a sketch-only architect result. `no-comments` uses that boundary before its own implementation step.
- `refine-ui` owns visual exploration. The prototype route handles behavioral or timing experiments without becoming an alternate UI approval path.
- Bug-fix reproduction and regression evidence have one owner: the bug-fix skill. Do not create a competing regression-fix skill or import a general TDD requirement.
- Domain modeling records accepted meaning. `why` investigates rationale; `teach` explains it. Neither silently changes the glossary or ADRs.
- A verification feature map owns how to exercise behavior. Do not turn it into a duplicate specification or decision log.
- Opening a PR does not imply babysitting. An autopilot owner's lifecycle brief can explicitly include babysitting.
- Babysitting does not imply merge authority. Shipping and Autopilot-full require the applicable grant.

## Principle trigger index draft

Intended destination: Mako's `references/principles.md`. Instructions use exact skill names, resolved through harness discovery with a sibling-path fallback. Standalone consumers also name required principles.

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
- Routine authorized execution is about to pause unnecessarily: `principle-never-block-on-the-human`
- A correction or instruction recurs: `principle-encode-lessons-in-structure`

Apply the adaptations in [skill-router-decisions.md](skill-router-decisions.md), especially scope, compatibility obligations, and test sensitivity. Principles do not override caller approval gates.

## Import closure

Import selected skill bodies with their required references, templates, and scripts. Do not copy only `SKILL.md` and leave its dependencies unresolved.

Adapt references to these excluded or harness-specific components:

- Cursor's built-in `create-skill`, `/loop`, `/goal`, Task schema, and model-rule files.
- Cursor cloud agents, transcript layout, and control skills from cursor-team-kit.
- Upstream `technical-writing` and `unslop` routing where it conflicts with the existing writing router.
- General `tdd` calls, replacing them with the selected bug-fix behavior when applicable.
- Deferred `recall`, Orchestrate, multi-phase planning, and cleanup routes.
- Git-only worktree, commit, reset, and stack operations when jj is present.

`deslop` is selected from cursor-team-kit. That does not imply importing the rest of that plugin.

Keep the full Comment Sicko reviewer instructions with `no-comments`. An adapter can change invocation mechanics, not the selected persona or deletion policy.
