# Shipping

Shipping here means merging, not deployment. Own what lands. Merge only with explicit authority and current independent behavioral proof.

Read [execution](../references/execution.md). [Babysit](babysit.md) establishes readiness; this route independently verifies and lands the authorized work.

## 1. Verify each PR independently

Resolve the forge and repository merge conventions. Assign a verifier who did not implement that PR. Each verifier compares the relevant base and head, exercises the real surface, and reports `PASS`, `PASS+NOTES`, `FAIL`, or `BLOCKED` with artifacts.

Record exact base and head revisions, commands, environment, test data, and proof locations. Inspect notes before accepting `PASS+NOTES`; an unresolved correctness or safety defect is not a passing note.

CI green and bot approval are not independent behavioral proof. Missing live capability is a gap, not a pass. Post the verdict on the PR when authorized.

## 2. Find the landing ceiling

Walk from the lowest unmerged PR through the contiguous passing run. Stop at the first unverified or failing PR. A passing descendant cannot land around that gap. Independent work stays outside the dependency chain.

## 3. Check evidence freshness

Record a stable patch identity for each base-to-head diff alongside revisions. In a Git-backed repository, read-only `git patch-id --stable` can aid comparison; use jj for repository state and mutations when present.

Before landing, compare the current patch, base, environment, and exercised behavior with the recorded evidence. Matching patch identity is not proof that changed dependencies or base behavior are harmless. Re-run affected lanes whenever their assumptions changed.

An unchanged patch can retain its code-review verdict when the relevant assumptions still hold, but current checks and mergeability must run against the new head.

For a tests/docs/lint-only patch change, build the artifact used by each lane twice at the verdict revision and once at the new head. Review every difference. Only demonstrated build noise or embedded revision identifiers can be discounted, with files and reasons recorded. Retain a lane only when its exercised artifact and assumptions remain equivalent. Review changed checks separately.

Never reuse a dev-server lane through a build-equivalence claim; it has no such build proof. If equivalence is unproven, run the lane again. Commit messages and checks from older revisions do not establish freshness.

## 4. Prepare the bottom PR

One topology owner fetches current trunk, performs authorized rebase/conflict repair when needed, publishes through the repository's version-control model, and retargets only the bottom PR. Apply freshness checks after the change. Do not arm or retarget descendants early.

## 5. Land one at a time

Follow the repository's merge strategy. Enable merge-when-ready only when authorized, and only for the verified bottom PR. Do not bypass forge approvals or required checks.

Verify the active forge's actual state. An auto-merge request does not prove stack readiness or a completed merge. Wait for a confirmed merge before preparing the next PR.

## 6. Recompute after every merge

Fetch current trunk and verify that the merged result is present. Remove the merged PR from the tracked chain. Inspect the new bottom's actual base, head, checks, and evidence. Do not assume automatic retargeting worked correctly.

Use the existing continuation owner's supported event watches. Pending checks are not failure; a closed-unmerged PR, required failing checks, or unresolved conflicts require diagnosis. Do not mutate the queue merely because a watch stalls.

## 7. Stop at the ceiling

Report what landed, its verifier and evidence, any armed merge action, and the next unverified PR. Extending beyond the verified run requires another pass through independent verification.
