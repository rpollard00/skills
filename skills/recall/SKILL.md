---
name: recall
description: "Rebuild recent working context on a topic from prior agent conversations in this project, live repository state, and the shared record (prior fixes, reverts, open reports), then return a current-state brief. Use for 'recall my work on X', 'what have I been working on', 'where did I leave off on X', or before starting new work on an old topic."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Recall

Before you start or resume work, rebuild the user's recent context on a topic. Return a short brief that tells where the work stands and what to do next.

Keep the turn read-only. Read only what the in-scope conversations need, then stop. This request does not continue the work or approve an item in the brief.

Context lives in two records. Prior agent conversations hold what was done and decided. The shared record holds what happened to the same code under other names: fixes that shipped or were reverted, reports that still arrive, and errors that still fire. The `why` skill searches that record. A feature with a long defect history keeps most of its story there. Do not rebuild it from transcripts alone.

## Route first

- Changes in this conversation since the user's last message: `ketchup`.
- One specific task, handoff, branch, or run to continue: Mako's [Session pickup](../mako/playbooks/session-pickup.md).
- Context across several recent conversations before you act: this skill.

If the user already supplied a full state capsule (paths, branch, the change), use it and skip the conversation search.

## Lock the scope

Pin three limits before you search, and state them in the reply:

- Window: default to the last 7 days. Do not quietly turn "all" into "recent N".
- Topic: the named feature, file, subsystem, or defect, if any.
- Project: default to the current repository, including its other worktrees and checkouts of the same repository. Do not read another project's conversations unless the user names it.

Exclude the current conversation and noise: subagent, eval, and test sessions.

## Find the conversations

Read the [execution](../mako/references/execution.md) transcript rules. This skill is their cross-conversation exception. Discover the harness history stores with [history sources](references/history-sources.md). Prefer a supported search or thread tool over raw files. Record each unavailable store as a coverage gap.

Order candidates by real modification time, not by identifier. Search for the topic first. Then read only the matching conversations, and only their relevant parts.

For more than two conversations, give slices of the corpus to parallel read-only subagents, under the [delegation rules](../mako/references/execution.md#discover-capabilities). Use the host's routing for bulk read-only work in the [harness notes](../mako/references/harnesses.md), if any. Keep raw transcripts in the subagents (the `principle-guard-the-context-window` skill). Each subagent returns one block per conversation:

- Conversation identifier, harness, and working directory
- Topic and the user's goal
- Decisions and their reasons
- Open threads
- Problems, corrections, and approaches that failed
- Artifacts: PRs, issues, branches, and commits

## Sweep the shared record

Do this step whenever the topic names a feature, file, subsystem, area, or defect. "My work on X" does not exempt it. Skip it only for activity recall with no named target, such as "what did I do this week".

Use the `why` skill's source investigators, in parallel with the conversation search. Change their question from "why was this built this way" to "what is the current state, what was tried and did not hold, and what is still reported". Keep `why`'s rules: one investigator per available source, a null result is a finding, and an unavailable source is a reported gap.

## Verify live state

Check the PRs, branches, issues, and commits that the search found. Use Git in the current repository and the active forge's tools. When the answer depends on what an agent actually did (commands, files read, errors), read that part of the full transcript, not a summary of it. Label each state you cannot check as unverified or last known.

## Reply

Write the brief under the existing `writing` guidance. Group it by thread and stay on the named topic.

- **Scope:** window, topic, project, sources searched, and coverage gaps.
- **Capsule:** at most 5 bullets about what this work is and where it stands.
- **Threads:** one line each, with exactly one status tag: `[merged #N]`, `[open PR #N]`, `[in progress <branch>]`, `[verified, uncommitted]`, `[reverted #N]`, or `[planned, not started]`.
- **Problems:** at most 5 recurring ones. Include reports that still arrive and fixes that were reverted, so the next attempt starts where the last one failed.
- **Next move:** the single most useful next action.

Keep an adjacent feature or issue out unless it blocks this work. When the brief is too long, cut detail before you cut threads. Cite conversation findings by harness and identifier. Cite shared-record findings by source (PR number, issue ID, permalink). Remove private context before any public output.
