---
name: ketchup
description: "Read-only catch-up on the current conversation since the user's previous message. Explain changed outcomes and every pending user decision, with evidence, options, risks, and recommendations. Use when explicitly asked for /ketchup or a conversation catch-up."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Ketchup

Catch the user up on changes since their last message before this request. Notifications and agent reports do not count as user messages. Assume the user remembers their previous message and nothing after it.

Keep the turn read-only. Do not continue implementation, start an app or job, merge changes, or send external messages. This request does not grant approval for an item in the summary.

## Establish the scope

Use the current conversation and its available reports or artifacts. Use only the harness's supported transcript access. Do not search unrelated conversations, projects, or private files to reconstruct history.

If history is incomplete, identify the visible range and the missing context. Do not invent a previous message or silently present a partial catch-up as complete. Use the available evidence and flag decisions whose status cannot be established.

Collect changed outcomes since the previous user message. Also collect every unresolved item waiting on the user, including items raised earlier. Check for later replies, cancellations, or approvals before calling an item pending.

Use available read-only tools to verify the current state of PRs, tests, jobs, and workers already involved in this conversation. If a state cannot be checked, label it unverified or last known. Verify reported numbers against their sources. State corrections when an earlier report was wrong.

## Separate work from decisions

A pending user item requires their choice, approval, access, or action. Work the agent can still perform within its authority is remaining work, not a request for the user. Do not invent decisions to fill a section or revive declined work.

For each pending item, collect:

- Its recognizable name and verified link or identifier, when available
- The exact choice or action the user owns
- What changes for the user
- The evidence and current state behind the recommendation
- The material risk, uncertainty, prerequisites, and irreversible consequences
- The recommendation, including any step that must happen first

State a needed but unavailable fact as unknown. Do not fabricate links or readiness claims. Explain low risk in ordinary words when useful, rather than adding an empty label. Mention the cost of waiting only when it matters, such as a deadline, lost data, or money.

When one choice covers several items, state the shared choice and recommendation once. Keep an identifiable entry for every item, with its impact, evidence, and risk. Name a different recommendation beside the item it concerns. Put higher-risk items first.

For a choice between options, give every option the work actually considered. Explain each option's benefit, cost, current state, and any prerequisite. Do not substitute a preferred option for the alternatives the user needs to compare.

## Write a self-contained reply

Use plain words and short sentences under the existing `writing` guidance. Describe results in the user's terms. Use recognizable project and PR names. Include hashes, paths, commands, and counts only when they help the user act or assess the result.

Open with what waits on the user, or say that nothing does. Then give the changed outcomes and pending decisions. Fit the structure to the amount of work:

- Summarize each changed request once, with its outcome and state: done, running, failed, blocked, or unverified.
- Distinguish completed preparation from delivery awaiting approval. Never call an unmerged change merged or an unverified result proven.
- Explain important fixes or corrections with enough context to understand their effect.
- List every pending item with enough information to decide from the reply alone.
- Name remaining work the agent can do separately from user decisions.

Keep the recap short so decisions get the space they need. There is no fixed word cap for the reply or each item. Never omit a pending item to meet a length target. A count cannot replace the list. A link can provide detail, but it cannot replace an item's substance. Group shared context without losing individual items.

If nothing changed and nothing waits on the user, say so and stop. Do not repeat facts across the recap, decisions, and visuals merely to fill a template.

## Use visuals only when they help

Reuse existing screenshots or videos when they explain a visible change. Label what each artifact shows. If visual evidence is missing, state that gap in the relevant outcome. Do not start the app to capture it during this read-only catch-up.

Use the current channel's supported format. When embedding is unavailable, provide an existing verified link or attachment and a complete text explanation. Do not invent an artifact or require a specific visualization tool.

A small diagram can explain a real dependency, before-and-after change, or choice from known facts. Avoid diagrams that only restate status bullets. Keep labels and geometry readable without fixed box or word counts. Never generate a fake screenshot or invent measurements. Omit the visual when text answers the question more clearly.
