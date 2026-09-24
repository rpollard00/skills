---
name: grill-me
description: Interview the user to sharpen a plan or design, with glossary and ADR updates as decisions settle. Invoke explicitly.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Grill me

Read and apply both [grilling](../grilling/SKILL.md) and [domain-modeling](../domain-modeling/SKILL.md).

Work through dependency-ordered decision rounds. Investigate facts instead of asking the user to find them. Ask the user for decisions and wait for answers.

As accepted terminology and consequential decisions settle, maintain the glossary and appropriate ADRs. Do not record an unresolved hypothesis as an accepted decision. This entry point includes the documented-grilling behavior; it has no stateless interview mode.

Do not implement the resulting plan until the user confirms shared understanding and authorizes implementation.
