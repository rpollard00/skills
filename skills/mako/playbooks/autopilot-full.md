# Autopilot-full

Own independent verdicts, not each PR's implementation. Assign one owner per independent PR. No PR merges without both authority and a current coordinator verdict.

## 1. Establish the grant

Record the queue, completion predicate, budget, delivery authority, and operator-reserved items. A request to state a plan is not permission to execute it. State the plan and wait when requested.

Read [execution](../references/execution.md). Select one continuation owner and discover the forge. Do not require cloud workers, a specific model, or a vendor stack CLI.

## 2. Assign owners

Each PR owner receives the full lifecycle: design and build under the selected task route, verification, `deslop`, `no-comments`, publication through [Opening a PR](opening-a-pr.md), skeptical [review triage](../references/bugbot-triage.md), and [Babysit](babysit.md) to merge-ready.

Give each owner an isolated writable workspace and branch/bookmark. Keep self-contained work independent. Serialize overlapping writes. Genuinely dependent work follows explicit dependency order rather than pretending to be independent.

Begin `show-me-your-work` early. Use native run records for child identity, lifecycle, and ownership; do not invent duplicate bookkeeping files. Follow repository conventions for first publication and draft status.

## 3. Report immutable rounds

The owner reports a code-ready head revision after code cleanup, and a new revision after every patch change. It reports merge-ready only after self-proof, current checks, and thread disposition finish.

Run the repository's required pre-review checks against that revision. A hook or self-report does not replace proof. Keep production writes and verification isolated.

## 4. Verify independently

At each code-ready revision, apply `swarm` with these lanes:

- Re-run required gates at the exact revision.
- Exercise the load-bearing behavior on the real surface. This live lane is mandatory.
- Review the actual diff in at least two independent lanes with concrete focus areas, such as caller parity, lifetimes/races, and data/configuration safety.
- Exercise the same scenario on the relevant base. If the base lacks the feature, record that fact and verify the new behavior and required end state instead.

Every result records base, head, method, artifacts, and gaps. The coordinator inspects evidence and issues a verdict. Self-proof, CI, and a bot approval alone do not establish an independent verdict.

Send every proven finding to the owner in one fix round. For behavior defects, preserve a separate failing check before the fix through `bug-fix`. Inspect related sites without widening authority. Include the defect in the next review brief.

A new patch starts a new round. Reuse evidence only under [Shipping's freshness rules](shipping.md).

## 5. Authorize landing

On a clean current verdict and the applicable merge grant, the owner prepares and lands its PR through Shipping. Renew checks after rebases or conflict resolution. Follow repository merge strategy instead of assuming squash.

Operator-reserved items stop at merge-ready. The root's verdict does not bypass forge approvals or protected-branch requirements. New raises of protected limits or budgets need the applicable approval and recorded evidence; absorbing an already-landed value is not a new raise.

## 6. Reconcile progress

At native lifecycle events and the selected driver's documented checkpoints, inspect owner progress, evidence, open gates, and active children. Count artifacts and side effects, not optimistic summaries.

Investigate apparent stalls. Respect infrastructure-failure policy. Before replacing a writer, verify termination or remove its access to the resource. A timeout alone does not release ownership.

After batches merge, inspect post-merge findings and record lessons. Finish only when the queue and every delegated task are accounted for. An operator stop propagates immediately as a stop-writing instruction; verify the resulting safe state.

Report each PR's owner, head, state, independent verdict, merge result, open operator gates, and decision-trail location.
