---
name: router
description: Fixture router. It owns the playbooks.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Router

Read [execution](references/execution.md) before a task.

## Playbooks

- Build new behavior: [Build](playbooks/build.md), using `alpha`
- Explain a change: `beta`

## Phase triggers

- Before a commit: `beta` within the scope of the task
- Write stateful logic: `principle-keep-small`

Consult the [principle index](references/principles.md).
