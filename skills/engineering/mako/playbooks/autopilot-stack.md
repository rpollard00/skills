# Autopilot-stack

Build and verify the queue, then hand the operator one linear stack to review and land. Do not merge, enable auto-merge, or close PRs as delivery.

1. Establish the scope, order, completion predicate, budget, and operator gates. A plan-only request stops after the plan. Execution requires the user's go.
2. Read [execution](../references/execution.md). Select one continuation owner. Assign owners with the lifecycle and decision records from [Autopilot-full](autopilot-full.md), excluding merge authority.
3. Parallelize independent implementation only. Each owner has an isolated writable location, reports its exact head, current base, and intended parent, and runs its self-proof and [Babysit](babysit.md) lifecycle.
4. Verify every code-ready round through Autopilot-full's independent lanes. The owner reports `STACK-READY` with its exact revision. Nothing enters the delivered stack without a current passing verdict.
5. Keep one topology owner. Only that owner coordinates rebases, retargets, and stack publication. Other owners must stop writes to affected resources during those operations.
6. The root PR targets trunk. Each child targets its intended parent's exact revision and branch/bookmark. In jj, use the [jj skill](../../../version-control/jj/SKILL.md) for the mechanics. Do not substitute Git resets or automatic Git worktrees.
7. Absorb base drift bottom-up when required. Coordinate conflict repairs with the affected owner. Re-run checks and mergeability after rewritten publication, then apply [Shipping's evidence freshness rules](shipping.md) to each affected verdict.
8. Reconcile children, ownership, and evidence at lifecycle events and driver checkpoints. Investigate stalls before replacement; verify that the previous writer stopped. Propagate an operator hold immediately and verify safe state.
9. Deliver the linear chain with each verdict and evidence reference in the relevant PR. The operator reviews and lands it. Preserve protected-limit approvals and other reserved gates.

Choose Autopilot-full for independent PRs with merge authority. Choose this route for coupled or sequenced work, or when the operator retains landing authority.

Report root and tip links, intended parent and head per PR, verification state, parked work, and open operator gates. Do not call merge-ready work merged.
