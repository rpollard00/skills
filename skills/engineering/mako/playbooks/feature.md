### Feature

**You own the design. Plan, review, verify.** Delegate implementation. Stay in the lead.

1. [`how`](../../how/SKILL.md) over the affected subsystem.
2. Use [`architect`](../../architect/SKILL.md) for design exploration. Reuse a settled design rather than repeat it. The lead obtains the sketch; implementation remains with separate implementers.
3. Write the throughput checkpoint as four todo items. A dimension that genuinely does not apply (single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped:
   - **Blocking first steps.** Gates run before fan-out.
   - **Independent workstreams.** Disjoint files, services, or layers parallelize. Shared writes serialize.
   - **Shared mutable state.** Default to splitting the target (the [**separate-before-serializing-shared-state**](../../../engineering-principles/principle-separate-before-serializing-shared-state/SKILL.md) principle skill). Serialize only for real invariants.
   - **Smallest safe decomposition.** If one worker is best, name why.
4. Read [execution](../references/execution.md). Delegate code-writing to a supported implementer with a specific scope (file paths, named data shape and its organizing structure per [**principle-model-the-domain**](../../../engineering-principles/principle-model-the-domain/SKILL.md), a state machine over scattered booleans, a table/registry over branching, a typed model over repeated shape assumptions, chosen before the delegate writes logic, and success criteria). When the implementation admits multiple valid shapes (error handling, abstraction layer, test structure), delegate via the [**arena**](../../arena/SKILL.md) skill instead so the runners surface the alternatives and the cross-judge guards the pick. Mandatory: no skip-with-reason escape, and Laziness Protocol does not override it (the gain is review separation, not lines saved). A subagent forbidden to spawn satisfies this by owning the diff directly with the same review separation. No "standing by" reply that waits on a nested agent. Apply [no-comments](../../no-comments/SKILL.md) before review. Re-ground against source for upstream-derived files. Update affected consumers within scope and verify each. Preserve user work and repository conventions.
5. Verify on the matching surface. "Inconclusive" or wrong-surface is not a pass. Flag it.
6. Organize small, ordered commits/changes through the repository's version-control model. Rebase only when needed and authorized.
   Use the [**sequence-verifiable-units**](../../../engineering-principles/principle-sequence-verifiable-units/SKILL.md) principle skill, building, verifying, and committing each small unit before the next.
7. If the design is contested, [`interrogate`](../../interrogate/SKILL.md) before shipping.
8. Run [**Opening a PR**](opening-a-pr.md).

Code-coupled work has one coordinating owner with the checkpoint inline. Launch child work only through the harness's permitted orchestration. Do not assume an ordinary child can delegate. Parent-level fan-out fits independent artifacts. Update the checkpoint at phase boundaries, and respect lifecycle and ownership before replacing workers.

**Reply:** what you built, what you chose and why, the throughput checkpoint, open decisions. Tables for design alternatives.
