# Autonomous run

Own the completion condition. Drive the objective through bounded, verified increments.

1. State the completion predicate, scope, budget, explicit stop conditions, and delivery target before the first iteration.
2. Read [execution](../references/execution.md). Select one continuation owner. Use native events for child work and supported watches for external events. Do not create competing mission loops.
3. Select the task playbook and preserve its design, review, and verification gates. Each iteration states a hypothesis, changes only what evidence justifies, and checks the real artifact.
4. Keep changes that advance the predicate. Revert rejected experiments without erasing user work. Follow `principle-sequence-verifiable-units`.
5. Fix related defects needed to complete the goal; record unrelated improvements for later. Agents can prepare actionable shared-skill repair issues or source PRs with reproduction and validation. Merging repairs or changing installed instructions remains separate. Do not let side work displace the objective.
6. Record choices, evidence, pivots, and outcomes through `show-me-your-work`. Use the existing adequate journal rather than duplicate it.
7. At a plateau, revise the hypothesis or method before declaring a dead end. Never relax the predicate to claim success.
8. Finalize as completed, blocked, budget exhausted, or cancelled using the evidence requirements in execution. Account for every child. An ended turn or a successful close call does not prove completion.

Choose reasonable defaults for unspecified details and continue. Ask only when unresolved intent materially changes the outcome and lacks a reasonable default, or when an explicit checkpoint or dangerous-action boundary requires it. Keep independent work moving.

Report the predicate, iterations, retained and rejected changes, evidence, outcome, and remaining work.
