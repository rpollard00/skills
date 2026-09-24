# Engineering

[Mako](mako/SKILL.md) is the explicit engineering router. Invoke it with a task. It stays active in that conversation until you opt out, without announcing its internal routing.

## Entry points and reusable skills

| Area | Skills |
| --- | --- |
| Routing | [mako](mako/SKILL.md), [figure-it-out](figure-it-out/SKILL.md) |
| Investigation and explanation | [how](how/SKILL.md), [why](why/SKILL.md), [teach](teach/SKILL.md), [blast-radius](blast-radius/SKILL.md) |
| Architecture | [architect](architect/SKILL.md), [arena](arena/SKILL.md), [improve-codebase-architecture](improve-codebase-architecture/SKILL.md) |
| Shared design disciplines | [codebase-design](codebase-design/SKILL.md), [domain-modeling](domain-modeling/SKILL.md), [grilling](grilling/SKILL.md) |
| Documented interview | [grill-me](grill-me/SKILL.md) |
| Execution and repair | [swarm](swarm/SKILL.md), [bug-fix](bug-fix/SKILL.md) |
| Review and cleanup | [interrogate](interrogate/SKILL.md), [no-comments](no-comments/SKILL.md), [deslop](deslop/SKILL.md) |
| Verification | [create-verification-skill](create-verification-skill/SKILL.md), [maintain-verification-skill](maintain-verification-skill/SKILL.md) |
| Learning and records | [reflect](reflect/SKILL.md), [show-me-your-work](show-me-your-work/SKILL.md) |
| Language and phrasing | [typescript-best-practices](typescript-best-practices/SKILL.md), [bro](bro/SKILL.md) |

`codebase-design`, `domain-modeling`, and `grilling` retain model-invoked discovery. The other engineering entry points are explicit-only or deliberately loaded dependencies. Mako links procedures by path; it does not load the entire collection for each task.

The 19 [playbooks](mako/playbooks/) own task sequences. Bug fixing has one reusable skill, not a second playbook. `grill-me` includes documented grilling; no separate `grill-with-docs` alias is installed.

## Shared contracts

- [Execution](mako/references/execution.md): capabilities, isolation, repository operations, continuation, and completion evidence.
- [Principle index](mako/references/principles.md): triggers for 23 separate [principle skills](../engineering-principles/README.md).
- [Writing](../writing/writing/SKILL.md), [jj](../version-control/jj/SKILL.md), and [refine-ui](../design/refine-ui/SKILL.md): retained owners of their existing procedures.

A reusable skill does not activate Mako merely because it reads the shared execution reference. Keep the whole category hierarchy when installing or copying the collection so its relative dependencies resolve.

## Installation and evidence

See the [repository README](../../README.md), [harness checks](../../docs/mako-harness-compatibility.md), and [upstream provenance](../../docs/upstream-provenance.md).

Discovery and metadata are tested in pi, Codex, and OpenCode 2. Model behavior, interactive invocation, mission completion enforcement, and jj isolation integration remain separate evaluation work.
