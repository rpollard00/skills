---
name: bug-fix
description: Reproduce a defect, preserve a separate failing-check change, isolate the cause, and prove the fix on the original surface. Invoke for a requested bug fix.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Bug fix

Own the diagnosis, plan, review, and proof. Delegate investigation and implementation when authorized and available. Read [execution](../mako/references/execution.md) before delegation or repository mutation.

Be scientific. Every shipped line traces to evidence. A change that might help is a hypothesis, not a fix. When evidence refutes a hypothesis, remove the change it motivated.

## 1. Reproduce

Drive the reported behavior on the matching surface through the project's verification skill or available tools. Record the exact revision, environment, trigger, expected result, actual result, and output.

If direct reproduction fails, tighten conditions, synthesize the trigger, or instrument the affected path. Ask the user to reproduce only after naming why the available tools cannot reach the target. Do not claim a fix for an unobserved failure.

## 2. Preserve the failing check

Before changing production code, isolate the smallest meaningful check of the reported behavior. Prefer a regression test through a real caller or interface. When that is impractical, preserve a rerunnable scenario or executable reproduction with observable failure criteria.

Run it against the unfixed revision. Verify that the failure represents this bug, not missing setup, compilation errors, or an unrelated dependency. Capture the failing output.

Record the test or reproduction in a separate commit/change before the fix. In jj, follow the `jj`. Keep user work separate. The failing revision need not merge independently.

If no reliable failing check can be constructed, report the blocker instead of substituting passing-only evidence. This discipline applies to bug fixes, not all new features.

## 3. Isolate the mechanism

Use `how` for the affected subsystem and `why` for regression history. Separate hypotheses from observations.

Choose each experiment to eliminate the largest remaining uncertainty. Instrument unclear state and inspect it while the code runs. Confirm the surviving mechanism before designing the fix. Inspect related instances, but do not expand the authorized repair scope.

## 4. Design and implement

If the fix crosses a function boundary, apply `architect`. Reuse a settled design instead of repeating exploration. Give an implementer the exact scope, failing check, mechanism, expected behavior, and do-not-touch paths.

Apply `principle-fix-root-causes`. Implement the smallest change the evidence justifies, not symptom guards. Keep the fix after the failing-check change in history.

## 5. Prove the correction

Run the same check against the corrected revision. Drive the original reported scenario on the original surface. Run relevant adjacent regression checks.

Compare failure and success with the same observation method. Review the diff for unrelated changes and weakened assertions. A wrong-surface result or an inconclusive run is not a pass.

## 6. Deliver

Apply the repository's delivery process. Use [Opening a PR](../mako/playbooks/opening-a-pr.md) when warranted. Preserve the failing-check/fix sequence and evidence references.

Report what broke, the mechanism, the fix, and the exact revisions and commands. Include concise failing-then-passing output. Name remaining gaps without describing them as verified.
