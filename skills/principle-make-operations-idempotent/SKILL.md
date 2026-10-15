---
name: principle-make-operations-idempotent
description: "Apply when designing commands, lifecycle steps, or processing loops that run amid crashes, restarts, and retries. Converge to the same end state regardless of partial prior runs."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Make Operations Idempotent

Design operations so they converge to the correct state regardless of how many times they run or where they start from. Every state-mutating operation should answer: "What happens if this runs twice? What happens if the previous run crashed halfway?"

**Why:** Commands, lifecycle operations, and processing loops run where crashes, restarts, and retries are normal. If partial state changes the next run's outcome, every restart becomes a debugging session.

**The pattern:**
- Convergent startup: read the observed state, compare it with the desired state, and apply only the remaining changes. Preserve valid artifacts and adopt live sessions only when safe.
- Content-based cleanup: compare by content equivalence, not creation order
- Evidence-based recovery: use ownership and staleness evidence appropriate to the environment. Reclaim locks, temporary files, or claimed jobs only when the evidence establishes they are stale. Preserve live or uncertain work; report uncertain ownership rather than reclaiming it.
- Concurrent operations: use atomic updates or publication and deduplicate effects where concurrency requires them. Reconciliation must not overwrite valid work or repeat an effect when another run races with it.
- Idempotent scheduling: failed work respawns cleanly, fresh input regenerated after each cycle

**The test:**
1. What happens if this runs twice in a row?
2. What happens if the previous run crashed at every possible point?
3. Does re-execution converge to the same end state?
4. Can retry or cleanup race with another run without losing valid work or duplicating effects?

If any answer is "it depends on what state was left behind," the operation needs a reconciliation step.
