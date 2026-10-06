---
name: principle-attack-the-premise
description: "Apply when two or more fixes that share one premise have failed the same gate. Test that premise with a falsifiable prediction before another fix. Take an actor census only when the hypothesis concerns imbalance."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Attack the Premise

When two or more fixes that share one premise have failed the same gate, suspect the premise, not the fixes.

**Why:** Each failure under a shared premise is evidence about the premise.

**Pattern:**
- **Write the premise down.** State the assumption shared by the failed fixes.
- **Make it falsifiable.** Name an observable result that contradicts the premise. Choose a test that distinguishes it from a plausible alternative.
- **Run the smallest useful test.** Inspect inputs, trace a boundary, replay a failure, or measure the suspected mechanism. Use representative cases and a control that establishes test sensitivity. Make repeated measurements rerunnable per `principle-build-the-lever`.
- **Revise from evidence.** If the test contradicts the premise, replace it before another fix. If the test supports it, investigate the mechanism that still explains the failed gate. Support is not proof against every alternative.

For an imbalance hypothesis:
- **Take an actor census.** Count the relevant work, ownership, or resources per actor across representative runs.
- **Read the skew.** If the same actors hold most of the imbalance, inspect what assigns that role. Test whether that assignment explains the failed gate, per `principle-fix-root-causes`.
- **Remove a proven asymmetry.** If the assignment causes the failure, rotate, randomize, or move it, per `principle-laziness-protocol`. Compensation through a return path, shared pool, batched hand-off, or periodic rebalance can leave the assignment intact. It can also add recurring work.

**Stop:**
- Before another fix under the shared premise, record the premise, possible falsifying result, test, and observed evidence.
- If the test is inconclusive, improve it or report the premise unresolved. Do not treat uncertainty as support.
- An even census rules out only the measured actor concentration for that workload. It cannot disprove unrelated premises, such as every actor receiving the same malformed request.

This principle is distinct from `principle-redesign-from-first-principles`, which rebuilds a design around a new requirement. It questions a fact the current design assumes.
