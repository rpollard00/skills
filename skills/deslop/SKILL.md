---
name: deslop
description: Remove AI-generated code slop and clean up code style
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Remove AI code slop

Check the scoped diff against the actual base and remove AI-generated slop introduced by the task. Include working-copy changes. Read [execution](../mako/references/execution.md) for repository mechanics; use jj when `.jj` exists. Preserve unrelated user work.

## Focus Areas

- Extra comments that are unnecessary or inconsistent with local style
- Defensive checks or try/catch blocks that are abnormal for trusted code paths
- Casts to `any` used only to bypass type issues
- Deeply nested code that should be simplified with early returns
- Other patterns inconsistent with the file and surrounding codebase

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Keep the final summary concise (1-3 sentences).
