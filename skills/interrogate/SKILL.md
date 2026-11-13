---
name: interrogate
description: 'Use for "interrogate", "adversarial review", "multi-model review", "challenge this", "stress test this code", "find blind spots", or "tear this apart". Adversaries try to break a change or design. Only failures demonstrated by a run and independently reproduced survive.'
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Interrogate

Try to break the change or design. Code inspection supplies hypotheses, not findings. Keep a finding only when execution demonstrates an intent violation and the lead reproduces it.

Deliver a verified review, not fixes. Read [execution](../mako/references/execution.md) before starting. Preserve the caller's permissions and scope.

## Frame

Use the scope the user names. Otherwise, review the branch changes from the actual merge base through the working tree. Include staged, unstaged, and relevant untracked changes. Record the base and reviewed revision or working-copy snapshot.

State the intent from the user's request, commits, and PR description. Resolve material uncertainty before testing. Do not infer intended behavior solely from the implementation under review.

Give adversaries the intent, scope, source snapshot, setup instructions, and relevant context. Include the surrounding code they need to exercise real paths.

## Run adversaries

Follow [agent and model routing](../mako/references/execution.md#agent-and-model-routing). Use the configured panel, or the configured reviewer role when no panel exists. Use fresh contexts and preserve routing. Do not invent model overrides or claim self-review as independent review.

Provide each adversary an isolated worktree or equivalent writable sandbox at the same source snapshot. Include uncommitted changes in each copy. Isolate mutable services, databases, ports, and fixtures as needed. Reviewers leave the implementation unchanged; only their isolated repro artifacts and disposable test state can change.

Give each adversary the [reviewer brief](references/reviewer-prompt.md). Adversaries run tests, scripts, browser interactions, or other probes against real behavior. For plans and designs, they run a prototype or probe the current implementation. A prototype proves only the assumptions it actually exercises.

If execution or isolation is unavailable, report the specific coverage gap. Do not replace execution with a source-only verdict. Do not run destructive probes against production or shared user state.

For UI work, apply `ui-design` and its [production verification](../ui-design/references/BROWSER-OBSERVATION.md#production-verification) guidance. Give reviewers actual current images and relevant interaction results. Missing rendered evidence leaves visual correctness unverified.

## Independently reproduce

Read [lead judgment](references/lead-judgment.md). Rerun each candidate finding against the reviewed snapshot with its repro artifacts and stated setup. A convincing explanation, consensus, or reviewer transcript does not replace this rerun.

Keep every independently reproduced intent violation. Merge findings with the same root cause. Drop failed reproductions, unsupported claims, and failures unrelated to the intent. Do not select one adversary's entire list as the winner.

If the source changes, rerun affected checks against the new snapshot before carrying findings forward. Stop after the findings are verified and coverage gaps are recorded. Do not start repairs without authorization.

## Output

- **Intent and scope**: the intended behavior and reviewed snapshot.
- **Reviewers**: actual identities, exercised surfaces, and unavailable coverage. Distinguish independent contexts from model diversity.
- **Verified findings**: each failure, exact command or interaction sequence, setup, actual and required output, impact, and adversaries that found it. Include the lead's rerun result and artifact paths.
- **Dropped**: counts by adversary and reasons. No style or speculative-risk backlog disguised as findings.
- **Coverage gaps**: blocked or untested surfaces and why. If none survive, say "no verified findings" rather than claiming correctness.
