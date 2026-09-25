---
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Multiple LLM reviewers challenge changes from independent angles."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Interrogate

Use the configured review panel, or the configured reviewer role when no panel exists, to adversarially review code changes. Each reviewer gets the same prompt and rubric. Fresh contexts provide independent review. An approved multi-model panel adds cross-model evidence without assigned personas.

The deliverable is a synthesized verdict. Do NOT auto-apply changes.

## Step 1, Determine Scope

Identify what to review from context:

- If the user points at specific files or a diff, use that
- Inspect the full changeset against the actual base, including working-copy changes. Use the jj skill when `.jj` exists; otherwise use repository-aware Git commands.
- If the user's message references recent work, gather the relevant files

Package the diff (or file contents) plus any surrounding context files the reviewers need to understand the code.

## Step 2, State the Intent

Before spawning reviewers, state the intent explicitly. Derive this from:

- The user's message
- Commit messages
- PR description if one exists
- The code itself

Write one clear paragraph. If you're unsure about the intent, ask the user before proceeding.

## Step 3, Spawn Reviewers

Read [execution's routing contract](../mako/references/execution.md#agent-and-model-routing). Launch one fresh read-only reviewer per configured panel entry through the governed workflow. Without a panel, use the configured reviewer role or harness default routing. Preserve each agent's model routing. Report an unmet explicit multi-model requirement instead of expanding the panel to unapproved models. Do not claim independent review from a self-review.

Give each reviewer the same intent, evidence, scope, and rubric. Record actual model identities and unavailable coverage. Follow the harness's failure policy; do not silently switch runners or models.

Read [`references/reviewer-prompt.md`](references/reviewer-prompt.md) and fill in the template with:
1. The stated intent
2. The diff or file contents
3. The review rubric from [`references/rubric.md`](references/rubric.md)
4. The code-quality lens from [`references/code-quality-review.md`](references/code-quality-review.md)

The same filled template goes to all reviewers, so every reviewer applies the code-quality lens.

## Step 4, Synthesize

As results come back, build a unified picture:

1. **Parse all findings** from the reviewers
2. **Identify consensus**. Note findings raised independently by multiple reviewers. Distinguish same-model agreement from cross-model agreement. Verify findings against source evidence rather than vote counts.
3. **Identify lone-reviewer findings**. Assess their evidence even without consensus.
4. **Deduplicate**. Reviewers can describe the same issue differently. Merge these and retain reviewer labels and model identities.
5. **Note disagreements**. If reviewers reach opposing conclusions, resolve them against the evidence for the verdict.

## Step 5, Lead Judgment

You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator.

Read [`references/lead-judgment.md`](references/lead-judgment.md) for the full framework.

Categorize every finding using these buckets:

- **Act on**. Real issues affecting correctness, security, or maintainability given the actual goals. These would block a real PR.
- **Consider**. Legitimate points, but you're not sure they outweigh the cost of addressing them right now. Worth the user's attention.
- **Noted**. Technically valid but not actionable. Context-dependent, premature optimization, or low-impact given the current stage.
- **Dismissed**. Wrong, nitpicky, or missing context. Brief explanation why.

For each finding, include:
- Which reviewer(s) raised it and their model identities
- The category (act on / consider / noted / dismissed)
- A one-line rationale for the categorization

## Output Format

Present the verdict in this structure:

### Intent
> [The stated intent paragraph from Step 2]

### Reviewers
- Reviewer [label]: [model name], [N findings] (one bullet per reviewer)

### Act On
[Findings that should be addressed. For each: description, which reviewers raised it, why it matters.]

### Consider
[Findings worth thinking about. For each: description, which reviewers raised it, tradeoff involved.]

### Noted
[Valid but low-priority. Brief list.]

### Dismissed
[Rejected findings with brief rationale.]

### Agreement Map
[Where did reviewers agree or diverge? Distinguish same-model agreement from cross-model agreement and explain the supporting evidence.]
