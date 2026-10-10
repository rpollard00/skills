---
name: alpha
description: "Fixture skill: it runs beta and reads a hosted file."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Alpha

Read [execution](../router/references/execution.md) before delegation.

If the fix crosses a boundary, apply `beta`.

Keep the change small, per `principle-keep-small`.

Use the helper `scripts/measure.sh <file>`. See [notes](references/notes.md).

```bash
# count the lines
wc -l input.txt
./scripts/measure.sh input.txt
git status \
  --short
```
