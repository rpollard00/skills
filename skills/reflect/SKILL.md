---
name: reflect
description: Review the current session for durable lessons, propose concrete skill edits, and apply only the user's approved subset. Invoke when the user asks to reflect.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Reflect

Mine the current conversation for durable lessons and route them into concrete skill improvements. Skip trivial, off-topic, one-off, or already-covered observations.

## 1. Locate session evidence

Read [execution](../mako/references/execution.md). Use the current session's documented transcript path or export. Verify that it belongs to this conversation. Do not search unrelated projects or private conversations.

If no transcript is available, write a tight session digest and label that limitation. Do not invent transcript citations.

## 2. Review in parallel

Use three independent read-only reviewers through the harness's governed delegation process:

- Judgment: [Judgment reviewer](references/judgment-reviewer.md)
- Tooling: [Tooling reviewer](references/tooling-reviewer.md)
- Divergent: [Divergent reviewer](references/divergent-reviewer.md)

Pass the appropriate template, transcript or digest, and required read-only evidence tools. Preserve each role's routing under [execution's routing contract](../mako/references/execution.md#agent-and-model-routing). Record actual identities and unmet explicit review requirements.

## 3. Synthesize

Use a read-only synthesizer with [the synthesis template](references/synthesizer.md) and all reviewer outputs. It must spot-verify citations and return Accepted, Rejected, and Backlog lists.

## 4. Check structural enforcement

Apply `principle-encode-lessons-in-structure`. Move proposals better enforced by lint, metadata, scripts, or runtime checks into implementation proposals rather than adding repeated prose.

Do not remove an instruction before its replacement actually enforces the requirement.

## 5. Obtain approval and apply

Show the full Accepted/Rejected/Backlog output and wait for explicit approval. The user chooses the subset and can redirect routing. Shared instructions affect future tasks; do not silently edit installed copies.

File backlog items only with authorization. Preparing a focused repair issue or PR does not authorize merging it or replacing an installation.

For approved changes:

- Apply a trivial correction directly in the skill's source repository.
- Use [Authoring a skill](../mako/playbooks/authoring-a-skill.md) for substantive edits, new skills, and description tuning.
- Run the available metadata and link validator.
- Exercise representative behavior for changed workflow or trigger instructions.

## 6. Report

List the edits applied, new skills created, authorized issues filed, rejected proposals with reasons, and outstanding work. Include paths and evidence. Do not describe proposed edits as installed.
