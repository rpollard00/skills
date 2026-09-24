### Session pickup

**You own the resume point. Read the prior trail, don't redo it.**

1. Read [execution](../references/execution.md). Locate the task's supplied handoff, canonical decision trail, documented transcript, run artifact, or branch. Do not search unrelated conversations. Read the metadata overview and last messages first, then scan back for the decision points. Parse a long transcript in a subagent and keep the reduced timeline in the main thread (the [**principle-guard-the-context-window**](../../../engineering-principles/principle-guard-the-context-window/SKILL.md) skill).
2. Reconstruct operational state. The branch and worktree, what already landed (repository-aware history and diff against the actual base; use jj when present), the open todos, the decisions made. Preserve prior decisions as input, then compare them with current repository and run state. Do not needlessly repeat settled investigation.
3. Compare delivered work with the plan and name the resume point. Reuse current evidence that resolves and still applies. Renew missing, stale, invalidated, or self-reported proof; do not redo everything without cause.
4. Route the remaining work to the matching playbook and pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run. The pickup playbook ends here. The routed playbook owns the rest.
5. Verify the inherited claims against the original goal on the real artifact (the [**principle-prove-it-works**](../../../engineering-principles/principle-prove-it-works/SKILL.md) skill). A passing prior self-report is not the proof.

**Reply:** where the prior agent stopped, what you inherited vs redid (ideally nothing redone), the resume point, and the outcome.
