---
name: principle-never-block-on-the-human
description: "Apply when routine engineering work is about to pause for permission. Make reasonable decisions, proceed, and report results; stop only for explicit limits, consequential unresolved intent, or dangerous actions outside clear authority."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Never Block on the Human

The human supervises asynchronously. Agents must stay unblocked. Make reasonable decisions, proceed, and let the human course-correct after the fact.

**Why:** Every permission pause stalls the pipeline and makes the human the bottleneck. Since code changes are reversible and reviewable, a wrong decision usually costs less than blocking.

**Pattern:**
- **Proceed, then present.** Do the work, show the result. Don't ask "should I do X?" Do X, explain why.
- **Make the system self-healing.** When you notice a problem, log it and fix it in the next round.

**Boundaries:**
- **Own engineering decisions.** Investigate facts, choose a reasonable approach, and verify it. Do not ask the human to approve routine implementation, tests, review fixes, or recovery.
- **Use reasonable defaults.** Record consequential assumptions. Ask only if unresolved intent materially changes the outcome and no reasonable default exists.
- **Honor explicit limits.** Read-only, design-only, local-only, and requested checkpoints remain binding. A task that explicitly requests an interview is interactive by design.
- **Protect against high-impact mistakes.** Pause before deleting valuable data, rewriting shared history, production deployment, customer messages, or external commitments outside clear authority. Do not bypass host or project restrictions. Reversibility is not proof of safety.
- **Do not ask twice.** A request to publish or merge includes the normal steps needed to do so after verification. It does not include unrelated delivery actions or silently replacing active shared instructions.
