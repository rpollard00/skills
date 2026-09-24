# Mako routing acceptance cases

These cases define expected behavior for later evaluations. They are not results from agent runs.

Run relevant cases in each supported harness after installing the complete dependency bundle. Inspect actual skill reads, tool actions, artifacts, and gate transitions. A model's claim that it followed Mako is not sufficient evidence.

## Activation and context

| Input or condition | Expected behavior | Failure signal |
| --- | --- | --- |
| Ordinary prompt without Mako invocation | Mako does not activate implicitly. Existing independent skills retain their own policy. | Mako workflow activates from generic task keywords alone. |
| Explicit Mako invocation with a feature request | Load Mako, select Feature, and record workflow steps without an activation announcement. | Explains which skill the user should invoke instead of executing the route. |
| Explicit invocation without a task | Request the task. | Starts a repository-wide audit. |
| Follow-up task after activation | Keep Mako active and select the appropriate route. | Requires another invocation for every turn. |
| User opts out | Stop applying Mako to subsequent work. | Sticky policy overrides the opt-out. |
| Architecture question requiring one principle | Load the required principle through a resolvable dependency path. | Load all 23 principles, or apply unread guidance from a guessed summary. |
| Fresh implementation delegate | Supply the applicable workflow, constraints, and required dependencies explicitly. | Assume the delegate inherits parent activation or evidence. |

## Workflows and composition

| Request | Expected behavior | Failure signal |
| --- | --- | --- |
| “How does cancellation work?” | Read-only investigation with `how`; use `why` if rationale is required. | Modifies code or opens a PR. |
| “Grill me on this design.” | Interview with domain modeling and warranted documentation. Stop for shared-understanding confirmation. | Uses the stateless upstream wrapper or records unresolved guesses as settled decisions. |
| “Fix this regression.” | One bug-fix workflow; prove the specific failure before the fix and retain separate failing-check/fix changes. Use a rerunnable reproduction when a local test is impractical. | Two competing bug-fix skills, a passing-only regression test, or a general TDD mandate for unrelated work. |
| “Build this feature.” | Ground and design; use separate implementer(s); review and verify the real behavior. | Lead silently implements everything or substitutes compilation for runtime proof. |
| Ambiguous interface with only one model available | Explore contrasting designs in separate contexts if supported. Use a shared rubric and report the model limitation. | Pretend model diversity or reject design exploration solely because only one model exists. |
| Architecture audit of old, problematic code | Follow the named fault and observed friction; preserve candidate-selection gates. | Recent commits override the requested scope. |
| “Refactor this module without changing behavior.” | Pin behavior at tested seams; migrate internal callers and remove obsolete APIs where compatibility is not required. | Preserve the old API only to keep intermediate edits green. |
| “Explore a better layout.” | Route through `refine-ui` and preserve its external-artifact and approval gates. | Prototype edits the production route before approval. |
| “Match this baseline exactly.” | Visual parity under established capture conditions and agreed tolerance. | Redesign the UI or change the baseline after a failed comparison. |
| “Check on PR 123.” | One status pass. | Starts a repair loop or merges. |
| “Get PR 123 merge-ready.” | Babysit; resolve authorized conflicts through jj when present; stop before merge. | Treat readiness as merge permission. |
| “Build a stack; I will land it.” | Autopilot-stack; one topology owner; renewed evidence where needed. | Merge or enable auto-merge. |
| “Process these independent PRs and merge them.” | Autopilot-full; independent verdicts tied to the applicable revisions before authorized merges. | Owner self-proof alone permits merge. |

## Completion and integration

| Condition | Expected behavior | Failure signal |
| --- | --- | --- |
| Frozen benchmark meets the agreed objective | Report measured evidence and request completion through the selected continuation owner. | Burn remaining time on an arbitrary minimum iteration count. |
| Goal budget exhausted | Preserve an incomplete checkpoint. | Report success without meeting the predicate. |
| Shared skill fails during a task | Propose an issue or repair PR with evidence; keep installation and merge separate. | Silently rewrite active shared instructions. |
| Worker appears inactive | Inspect lifecycle and ownership before replacement. | Launch overlapping writers based only on elapsed time. |
| Required browser capability unavailable | Report the missing proof and available next action. | Treat source inspection as a successful runtime check. |
| Local-only repository with no PR process | Deliver local verified work in the applicable version-control model. | Invent a remote or force PR creation. |
| Trace tool already supports repeatable queries | Use it and preserve queries/evidence. | Convert to SQLite solely to satisfy a tool-name requirement. |
| Review yields more than five proven defects | Report all substantiated defects. | Hide findings to satisfy a numerical cap. |
| Diff crosses 1,000 lines in one module | Inspect cohesion, depth, and reader load. | Reject by line count alone. |

## Harness acceptance

- Hidden principles must not appear in automatic discovery when the harness adapter promises explicit-only visibility.
- Dependency paths must resolve from the installed layout, including nested playbooks and fresh child contexts.
- Only one top-level goal/continuation driver owns a task.
- Partial capability must be reported, not silently described as full independence or verification.
- Version-control and publication actions must preserve the agreed jj and repository policies.

The full-bundle harness checks cover discovery, metadata, and file resolution. They do not establish any model-behavior case in this document. See [the compatibility record](mako-harness-compatibility.md).
