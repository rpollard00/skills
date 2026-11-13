# Lead judgment

Independently reproduce each candidate finding before accepting it. Agreement between reviewers is not proof.

1. Check the source snapshot, setup, and repro artifacts. Confirm that the probe exercises a reachable path within the stated intent.
2. Rerun the exact command or interaction sequence in isolated test state. Inspect actual output yourself. Record the rerun and artifacts.
3. Check that the failure comes from the target, not missing dependencies, invalid fixtures, a stale build, or the probe itself.
4. Compare the observed behavior with the required behavior. Use the user's intent and real contracts, not the adversary's preferences.
5. For regression claims, inspect the base comparison. Separate pre-existing failures from introduced regressions. Keep either only when it belongs to the requested scope.
6. Merge independently reproduced findings that share a root cause. Preserve the evidence and reviewer attribution.

Drop findings that do not reproduce or do not violate the intent. Record the reason. If a rerun is blocked, record a coverage gap, not a verified finding. Do not treat this gap as evidence that the code is safe.

Do not generalize beyond the probe. A passing case does not prove all inputs. A prototype is not the real integration. A simulated dependency does not prove the external service's behavior.

For nondeterministic failures, record seeds, timing, attempts, and observed failures. The lead still needs an observed reproduction before accepting the finding.

Keep every verified finding, ordered by impact. Do not rank reviewers or cap the count. Do not apply fixes during review.
