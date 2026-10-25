---
name: deslop
description: Remove AI-generated code slop and clean up code style
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Remove AI code slop

Check the scoped diff against the actual base and remove AI-generated slop introduced by the task. Include working-copy changes. Read [execution](../mako/references/execution.md) for repository mechanics; use Git in the assigned worktree. Preserve unrelated user work.

When invoked directly or required by a workflow, run the pass even in a comment-heavy repository. Follow the [cleanup contract](../mako/references/execution.md#code-cleanup-checkpoints). A completed inspection with no justified changes is a valid result.

## Focus Areas

- Unnecessary comments, including narration and redundant explanations, even when common in the repository
- Defensive checks or try/catch blocks that are abnormal for trusted code paths
- Casts to `any` used only to bypass type issues
- Deeply nested code that should be simplified with early returns
- Other patterns inconsistent with the file and surrounding codebase

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Preserve useful rationale, public API documentation, legal notices, and unresolved constraint guidance. Comment volume alone does not justify deletion.
- Keep the final summary concise (1-3 sentences).
