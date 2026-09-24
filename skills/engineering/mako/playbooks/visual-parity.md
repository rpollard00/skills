### Visual parity

**You own pixel-exact equivalence. The baseline is the spec. You do not touch it.** Equivalence is verified by image diff, not by eye.

1. Establish viewport, device scale, fonts, platform, data, animation state, and capture timing. Agree any nonzero tolerance before comparison; zero difference remains the default. Establish the baseline before any migration: a visual regression harness that screenshots the current component across its states, plus the target when matching two implementations. No baseline, no parity claim. A blocking prerequisite, not a follow-up.
2. Anti-shortcut clauses, stated and held: no harness modifications, no baseline tampering, no component restructuring to make a diff pass. If the baseline looks wrong, stop and ask, don't edit it.
3. Migrate one component at a time. Use [execution](../references/execution.md) to parallelize across isolated repository-aware workspaces, one owner per component (the [**separate-before-serializing-shared-state**](../../../engineering-principles/principle-separate-before-serializing-shared-state/SKILL.md) principle skill). Shared primitives migrate first as a blocking phase.
4. Capture the matching surface with the project's verification skill or discovered browser tools. Compare images against the frozen baseline and agreed tolerance. Investigate deltas; never loosen the baseline after failure. Iterate through the selected continuation owner, respecting budget and blocker outcomes.
5. Run [**Opening a PR**](opening-a-pr.md) per component or per safe batch.

**Reply:** components migrated, the diff result for each, the baseline harness location, what's left.
