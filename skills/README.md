# Skills

The collection contains 53 skills. Each skill lives directly in `skills/<name>/`. Its references, scripts, metadata, and upstream notices stay beside it. Instructions refer to other skills by exact name. The shared [lookup rule](mako/references/execution.md#resolve-dependencies) uses harness discovery with a sibling-path fallback. Links below are navigation for readers.

[Mako](mako/SKILL.md) routes engineering tasks. Invoke it with a task; it stays active in that conversation until you opt out. Reusable skills also work independently.

## Discovery and ownership

`codebase-design`, `domain-modeling`, `grilling`, `jj`, `writing`, `simple-technical-english`, and `unslop` support model-invoked discovery. The other skills are explicit-only or deliberately loaded dependencies.

Mako owns 19 [playbooks](mako/playbooks/). Bug fixing has one reusable skill, not a second playbook. `grill-me` includes documented grilling without a separate alias.

The 23 principle skills remain independent. Select them through [the trigger index](mako/references/principles.md), then read the required instructions in full.

[Execution](mako/references/execution.md) supplies shared capability, isolation, repository, continuation, and completion rules. Reading that reference does not activate Mako.

[ui-design](ui-design/SKILL.md) owns shared UI discipline. [refine-ui](refine-ui/SKILL.md) retains interactive exploration and visual approval gates, [jj](jj/SKILL.md) owns Jujutsu, and [writing](writing/SKILL.md) routes prose, including user-visible strings in code.

## Index

- [architect](architect/SKILL.md)
- [arena](arena/SKILL.md)
- [blast-radius](blast-radius/SKILL.md)
- [bro](bro/SKILL.md)
- [bug-fix](bug-fix/SKILL.md)
- [codebase-design](codebase-design/SKILL.md)
- [create-verification-skill](create-verification-skill/SKILL.md)
- [deslop](deslop/SKILL.md)
- [domain-modeling](domain-modeling/SKILL.md)
- [figure-it-out](figure-it-out/SKILL.md)
- [grill-me](grill-me/SKILL.md)
- [grilling](grilling/SKILL.md)
- [how](how/SKILL.md)
- [improve-codebase-architecture](improve-codebase-architecture/SKILL.md)
- [interrogate](interrogate/SKILL.md)
- [jj](jj/SKILL.md)
- [maintain-verification-skill](maintain-verification-skill/SKILL.md)
- [mako](mako/SKILL.md)
- [no-comments](no-comments/SKILL.md)
- [principle-attack-the-premise](principle-attack-the-premise/SKILL.md)
- [principle-boundary-discipline](principle-boundary-discipline/SKILL.md)
- [principle-build-the-lever](principle-build-the-lever/SKILL.md)
- [principle-encode-lessons-in-structure](principle-encode-lessons-in-structure/SKILL.md)
- [principle-exhaust-the-design-space](principle-exhaust-the-design-space/SKILL.md)
- [principle-experience-first](principle-experience-first/SKILL.md)
- [principle-fix-root-causes](principle-fix-root-causes/SKILL.md)
- [principle-foundational-thinking](principle-foundational-thinking/SKILL.md)
- [principle-guard-the-context-window](principle-guard-the-context-window/SKILL.md)
- [principle-laziness-protocol](principle-laziness-protocol/SKILL.md)
- [principle-make-operations-idempotent](principle-make-operations-idempotent/SKILL.md)
- [principle-migrate-callers-then-delete-legacy-apis](principle-migrate-callers-then-delete-legacy-apis/SKILL.md)
- [principle-minimize-reader-load](principle-minimize-reader-load/SKILL.md)
- [principle-model-the-domain](principle-model-the-domain/SKILL.md)
- [principle-never-block-on-the-human](principle-never-block-on-the-human/SKILL.md)
- [principle-outcome-oriented-execution](principle-outcome-oriented-execution/SKILL.md)
- [principle-prove-it-works](principle-prove-it-works/SKILL.md)
- [principle-redesign-from-first-principles](principle-redesign-from-first-principles/SKILL.md)
- [principle-separate-before-serializing-shared-state](principle-separate-before-serializing-shared-state/SKILL.md)
- [principle-sequence-verifiable-units](principle-sequence-verifiable-units/SKILL.md)
- [principle-subtract-before-you-add](principle-subtract-before-you-add/SKILL.md)
- [principle-test-behavior-not-implementation](principle-test-behavior-not-implementation/SKILL.md)
- [principle-type-system-discipline](principle-type-system-discipline/SKILL.md)
- [refine-ui](refine-ui/SKILL.md)
- [reflect](reflect/SKILL.md)
- [show-me-your-work](show-me-your-work/SKILL.md)
- [simple-technical-english](simple-technical-english/SKILL.md)
- [swarm](swarm/SKILL.md)
- [teach](teach/SKILL.md)
- [typescript-best-practices](typescript-best-practices/SKILL.md)
- [ui-design](ui-design/SKILL.md)
- [unslop](unslop/SKILL.md)
- [why](why/SKILL.md)
- [writing](writing/SKILL.md)

## Installation and evidence

See the [repository README](../README.md), [harness checks](../docs/mako-harness-compatibility.md), and [upstream provenance](../docs/upstream-provenance.md).

Keep cross-skill dependencies together when copying the bundle. Include the repository license and applicable upstream notices when distributing skills separately.
