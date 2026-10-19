---
name: maintain-formal-verification-skill
description: "Audit existing formal checks against changed code, update stale mappings, and distinguish verification drift from product bugs. Use when explicitly asked to maintain formal verification or check whether a model still describes the code. Separate from live-app feature-map maintenance."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Maintain a formal verification skill

Audit the checks the user named, or discover project-local skills by their behavior: running model checkers, provers, or code verifiers against named code, or explicitly recording a generated-input testing fallback for a requested formal property. Do not sweep unrelated ordinary tests into this workflow. Do not depend on a fixed skill name. If no checks exist, report that and point to `create-formal-verification-skill`; do not start a new proof automatically.

This workflow is explicitly invoked, not routine ceremony after every edit. Read the shared [formal contract](../create-formal-verification-skill/references/formal-contract.md) and [execution](../mako/references/execution.md). They govern evidence, budgets, isolation, permissions, negative controls, and cleanup. The live-app feature map in `maintain-verification-skill` is a separate contract.

## Establish the baseline

For each check, collect the property, covered paths and symbols, model actions and state variables, source-to-model bridge or its absence, assumptions, bounds, tool and command, known findings, last confirmed mapping revision, and separate verification-result record. Include any generated-input fallback as testing evidence, never proof.

Record the current commit and working-copy changes, including staged, unstaged, and relevant untracked source or verification files. Define the audit scope, resource budget, and stopping condition. Keep an unknown or unverifiable baseline unknown; do not substitute the last edit to the verification files. A documented current-source review can establish a new baseline, with the historical gap disclosed.

Run the existing check within its limits before editing when feasible, preserving output and counterexamples. If it cannot run, record the blocker and continue any feasible mapping review. A pre-update pass says nothing about mapping freshness. Do not classify a failure as drift or a product defect before reviewing the mapping.

## Audit history and current source

Starting at each check's own last confirmed mapping revision, inspect the relevant source diff and intervening commits through the target revision, plus the working-copy changes. Read actual source and model/harness behavior, not just commit messages. If history is unavailable or the range cannot be established, say which portion is missing and do not claim a complete historical audit.

Trace renamed, moved, or split symbols across files. Search for new callers, state writers, branches, transitions, ranges, and entry points that affect the guarded state, including code outside the old path list. Check whether atomic model actions still match implementation atomicity. Record reviewed revisions, source references, new coverage, and remaining gaps for each check.

Classify each relevant change:

- **No effect:** show why the change does not alter the modeled or analyzed behavior.
- **Stale mapping:** the model, harness, assumptions, or coverage no longer describes the implementation.
- **Intentional property change:** cite evidence that the promise changed, retaining both old and new wording.
- **Possible product bug:** the promise still applies but the code may violate it; preserve the candidate and evidence.

## Update and evaluate

Edit verification artifacts and their project-local skill only. Derive changes from the code and documented intent before rerunning, not from what makes a check pass. Preserve known findings, assumptions, bounds, and exclusions; explain any justified change and its effect on the claim. Do not weaken a property to hide a violation. Product fixes require separate authority and a separate change.

Rerun the updated check within the budget. Explain counterexamples in the code's terms. If a trace cannot occur in the implementation, investigate a modeling error; if the bridge or mapping is uncertain, keep the finding unconfirmed. Establish a product defect with source evidence or a reproduction when feasible. Name an introducing commit only when established, otherwise leave it unknown.

Exercise meaningful negative controls for changed checks using the shared contract. A model mutation tests model sensitivity. Claim source-mutation detection only with a demonstrated bridge that actually detects it. Setup errors do not count as detecting a property violation. Preserve evidence, remove only owned scratch mutations, rerun the original check, and compare with the baseline. Report infeasible or missed negative controls as gaps.

Update coverage, commands, assumptions, bounds, and evidence in the project-local skill. Follow it once from its documented starting state. Advance each synchronized mapping revision only after its mapping review is complete; leave it unchanged if that review is blocked or incomplete. Record working-copy evidence separately. Record the verification outcome independently, including known failures, timeouts, and checks not run. A completed mapping review with an inconclusive run is not a verification pass.

## Report

For each check, report:

- Mapping freshness: unchanged and reviewed, updated and reviewed, or incomplete/unknown; include the reviewed revision range, working-copy identity, and whether the synchronized record advanced.
- Verification outcome: pass within the stated scope, counterexample, inconclusive, or not run; include the exact artifacts, command, limits, and durable evidence.
- Changes and their reasons, intentional property changes with evidence, preserved findings, and negative-control results or gaps.
- Stale-mapping corrections separately from confirmed product bugs and unresolved candidates, with plain-language impact and introducing revision only when established.
- Uncovered behavior, missing history, remaining proof gaps, and the next useful action within scope.

If an old model passed but the corrected mapping fails, say the old pass described stale behavior. Keep maintenance changes separate from any product fix. Do not report mapping freshness as proof of correctness.
