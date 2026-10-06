---
name: no-comments
description: "Spawn Comment Sicko, fix accepted findings, and preserve constraints until replacement enforcement is verified."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# No comments

Spawn Comment Sicko. Act on accepted findings.

Defer to Comment Sicko's fresh perspective.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the repository's base, including working-copy changes. Read [execution](../mako/references/execution.md) for delegation and repository mechanics. Use the jj skill when `.jj` exists.

## Steps

1. Spawn a separate reviewer with [Comment Sicko](references/comment-sicko.md) as its full instructions. Pass the scope, source revision, and resolved paths to the how, why, and architect skills linked below. Give it exclusive comment-edit ownership or an isolated copy. Do not restate or soften its rules. Inspect and integrate its diff through the repository's version-control model.
2. Inspect its report and diff against the reviewer's exceptions. Reject application-code edits, scope escapes, exception-protected deletions, and misstated `MUST KILL` reasons. Do not condemn intentional code protected by a verified exception. Reshape flags on our-code surprises stay actionable unless they require a pending constraint encoding. Audit missed scoped lint and TypeScript suppressions. Preserve verified negative type tests under the reviewer's narrow `@ts-expect-error` exception. Correctness or safety suppressions remain actionable `MUST KILL`s. Before accepting thin `IMPORTANT` or `do not remove` findings, run `how` or `why` on their symbol. Require scoped evidence for each exception. Retain unresolved constraint guidance and report the missing evidence. Other ambiguous keeps fail the exception test. Restore protected comments that the reviewer deleted. Revert and rerun one rejected report with the failure named. If the second report fails review, report it open and fail `/no-comments`.
3. Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API. If any fix needs a shape, run `architect` once for the accepted set and surrounding code. Stop at the sketch. Architect shapes. Step 4 implements.
4. Implement the smallest root-cause fix in scope. Remove every named workaround. If the root cause is out of scope, land the smallest in-scope fix and report the rest open. The `principle-fix-root-causes` and `principle-redesign-from-first-principles` skills guide intent only. Neither authorizes widening the fence nor fixing instances outside it. Never bolt on symptom guards.
5. Preserve constraint guidance until replacement enforcement is verified. Apply `principle-encode-lessons-in-structure`. Choose the cheapest in-scope type, runtime check, test, or CI lint that enforces the requirement. Within the caller's authority, implement and verify that mechanism without another approval, including unattended and eval runs. Delete only guidance whose required cases the mechanism enforces. Keep guidance for uncovered cases. Honor explicit checkpoints before dependent edits. Ask only for unresolved consequential choices or actions outside that authority. If no encoding fits the authorized scope, retain the comment and report the constraint open. Sketch the out-of-scope work. If evidence proves the constraint obsolete or false, delete it with that evidence.
6. Report the deletion count, restored comments, reruns, architect sketch, fixes, and verified encodings. Include retained constraints with their blockers, encoding proposals, and other open work.
