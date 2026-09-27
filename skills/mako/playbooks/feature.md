### Feature

**Own the outcome. Design, build, review, verify.** With capable delegates, stay in the lead and delegate implementation. Otherwise use the direct-execution fallback in [execution](../references/execution.md).

For UI work, read `ui-design` before planning or design. For new UI, [compose from the task](../../ui-design/references/DESIGN-DISCIPLINE.md#compose-from-the-task) before selecting a page shell or component arrangement. Choose task-relevant facts, actions, hierarchy, and consequential states before writing copy. Reuse accepted project structure for scoped changes. Do not force an interactive `refine-ui` session or expand the user's scope and authority.

1. `how` over the affected subsystem.
2. Use `architect` for design exploration. Reuse a settled design rather than repeat it. The lead obtains the sketch; separate implementers build it when delegation is available.
3. Write the throughput checkpoint as four todo items. A dimension that genuinely does not apply (single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped:
   - **Blocking first steps.** Gates run before fan-out.
   - **Independent workstreams.** Disjoint files, services, or layers parallelize. Shared writes serialize.
   - **Shared mutable state.** Default to splitting the target (the `principle-separate-before-serializing-shared-state` principle skill). Serialize only for real invariants.
   - **Smallest safe decomposition.** If one worker is best, name why.
4. Read [execution](../references/execution.md). Delegate code-writing to a supported implementer with a specific scope (file paths, named data shape and its organizing structure per `principle-model-the-domain`, a state machine over scattered booleans, a table/registry over branching, a typed model over repeated shape assumptions, chosen before the delegate writes logic, and success criteria). When the implementation admits multiple valid shapes (error handling, abstraction layer, test structure), delegate via the `arena` skill instead so the runners surface the alternatives and the cross-judge guards the pick. Use the capability fallback in execution when delegates are unavailable or prohibited; disclose missing review independence. A subagent forbidden to spawn owns its assigned diff directly for its parent to review. No "standing by" reply that waits on a nested agent. Apply `no-comments` before review. Re-ground against source for upstream-derived files. Update affected consumers within scope and verify each. Preserve user work and repository conventions.
5. Verify on the matching surface. For UI, verify the planned content and hierarchy alongside behavior, state, and accessibility. Distinguish unnecessary content from inefficient sizing, spacing, or component arrangement. Correct defects within scope and recapture affected states. "Inconclusive" or wrong-surface is not a pass. Flag it.
6. Organize small, ordered commits/changes through the repository's version-control model. Rebase task-owned work when needed; protect shared history and refresh invalidated evidence.
   Use the `principle-sequence-verifiable-units` principle skill, building, verifying, and committing each small unit before the next.
7. If the design is contested, `interrogate` before shipping.
8. Run [**Opening a PR**](opening-a-pr.md).

UI implementation briefs include `ui-design`, its applicable references, accepted project constraints, task/content decisions, and the rendered verification scope before handoff.

Code-coupled work has one coordinating owner with the checkpoint inline. Launch child work only through the harness's permitted orchestration. Do not assume an ordinary child can delegate. Parent-level fan-out fits independent artifacts. Update the checkpoint at phase boundaries, and respect lifecycle and ownership before replacing workers.

**Reply:** what you built, what you chose and why, the throughput checkpoint, open decisions. Summarize consequential design alternatives.
