---
name: principle-fix-root-causes
description: "Apply when debugging. Trace each symptom to its root cause and fix it there; reproduce first, distinguish legitimate contract states from broken internal invariants."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Fix Root Causes

When debugging, do not fix symptoms. Trace every problem to its root cause and fix it there.

**Why:** Symptom fixes accumulate. Each workaround makes the system harder to reason about, and the real bug remains. Root-cause fixes are slower upfront but reduce total debugging time.

**Pattern:**
- Reproduce first
- Ask "why" until you hit the root cause
- Check the contract. Handle states it legitimately allows where the responsible code failed to handle them. For an impossible internal state, find and fix the producer instead of masking the failure where it surfaced.
- Keep boundary validation and containment where needed. Preserve evidence of the underlying failure; a guard, retry, fallback, or swallowed error that hides it is not a root-cause repair.
- If a workaround needs a paragraph-long comment to justify it, the code is wrong (fix the code, not the comment)
- Check for the pattern, not just the instance. Repair instances within authorized scope and report the rest; investigation does not widen the repair fence.
- When stuck, instrument. Don't guess (add logging, read the actual error)
- If the deciding fact required deep investigation, propose the cheapest reliable always-on signal that would expose it at first inspection. Name the fact and where the signal belongs. The proposal does not expand the authorized repair scope.

**Restart bugs: suspect state before code**

When something "fails after restart," suspect stale persistent state first: config files, caches, lock files, serialized state. If clearing a state file restores behavior, investigate why that state was produced or not handled; clearing it alone does not establish the fix.
