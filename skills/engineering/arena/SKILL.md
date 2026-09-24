---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Arena

Fan out N parallel attempts at the same task. Read every candidate end to end. Pick the strongest as the base. Graft the best ideas from the others into it. Verify the synthesized result.

## Start

Open a todolist with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Cross-judge
4. Pick
5. Graft
6. Verify

## Phase A: Frame

Read [execution](../mako/references/execution.md) before delegation. All candidates share requirements and evaluation criteria. Choose identical briefs for independent attempts, or declared contrasting design constraints for alternative shapes. Do not confuse a model change with a design change.

1. State the artifact each candidate is producing.
2. Derive the rubric. State what success looks like for *this* task, then turn it into 3-6 concrete gradeable criteria. The rubric is the picker's tool in Phase D. Candidates only see the task.
3. Pick supported runners. Prefer diverse models for judgment-sensitive work. Separate same-model contexts remain valid independent attempts; disclose the limitation. Declare candidate count and required designs before launch.
4. Assign isolated output paths and explicit source revisions. Use repository-aware workspaces or separate scratch directories, per the [**separate-before-serializing-shared-state**](../../engineering-principles/principle-separate-before-serializing-shared-state/SKILL.md) principle skill. Do not let competing candidates share production files.

## Phase B: Fan out

Launch independent candidates through the harness's governed parallel workflow. Give each the task, shared grounding, its output path, and instructions to produce the artifact and a short rationale. Each candidate owns one attempt and must not recursively launch arena.

Each rationale names the alternatives the candidate considered and what it rejected.

If a candidate fails, follow the harness's failure policy. Record the dropout. Continue only when the caller's required candidate count and coverage remain satisfied; a missing candidate is not a pass.

## Phase C: Cross-judge

After all Phase B candidates stop writing, use a fresh read-only judge. Prefer a different model family when supported. The judge sees the rubric and candidates by neutral path label, scores each criterion, and recommends a base. It can run alongside the parent's Phase D reading. Disclose unavailable independence or model diversity.

## Phase D: Pick a base

Read every candidate end to end before picking.

Score each candidate against the rubric criterion by criterion, not on holistic feel. Compare against the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base on which candidate a future maintainer can extend most easily without breaking invariants. Prefer the cleaner boundary or smaller API when two feel tied, per the Laziness Protocol.

Record the pick and the reason in a short synthesis note alongside the base artifact, including the cross-judge's verdict.

## Phase E: Graft

Walk each losing candidate once more and identify what is worth porting into the base. The signal is usually one or two things per candidate, not most of it.

Fold each graft in by hand, per the [**redesign-from-first-principles**](../../engineering-principles/principle-redesign-from-first-principles/SKILL.md) principle skill. Don't paste mechanically. The result has to remain coherent under one mental model.

Record what was grafted, from which candidate, and what was rejected and why.

When N candidates converge on the same shape, record that agreement. If the caller requires structurally distinct designs, convergence does not satisfy that gate: revise constraints and obtain the required alternatives. Otherwise use the consensus shape. No graft is needed. When N candidates wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

The synthesized artifact has to hold up under the same scrutiny as any other output, per the [**prove-it-works**](../../engineering-principles/principle-prove-it-works/SKILL.md) principle skill.

If verification surfaces a problem the arena did not catch, either Phase A was wrong (re-frame and re-run) or one candidate caught it and you missed the graft (go back to Phase E). Don't paper over.

## Outputs

One synthesized artifact. One short synthesis note alongside, naming the base, the grafts (with source candidate), the rejections, the dropouts if any, and the verification result.
