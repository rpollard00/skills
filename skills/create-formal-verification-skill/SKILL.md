---
name: create-formal-verification-skill
description: "Generate a project-local skill to verify a stated property with a model checker, code verifier, or proof assistant. Use when explicitly asked to model-check a race, prove an invariant, or create formal verification. Separate from live-app verification and ordinary test work."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Create a formal verification skill

Verify one consequential property and leave a project-local skill that another agent can rerun after a relevant change. A result covers its stated model, bounds, and assumptions. It does not establish correctness of the whole system.

This is an optional route for an explicit formal-verification task. It does not replace tests or the live-app workflow in `create-verification-skill`. Read the shared [formal contract](references/formal-contract.md) and [execution](../mako/references/execution.md) before proceeding.

## Choose the property and effort

Start with the area or property the user named. Otherwise, inspect the code for promises whose failures harm users and whose cases tests rarely reach. Prefer a consequential target over a convenient demonstration.

State the property and the harm from its violation in plain words. Identify the relevant source revision, paths, symbols, and existing evidence. Define the scope, resource budget, and stopping condition before exploration. Keep the first deliverable to one useful property unless the request requires more.

If no tractable target fits the scope, report the candidates and the limit. Do not expand into a whole-repository proof or change product code without authority.

## Let the property choose the tool

Use the least costly tool that answers the question. Prefer tools the project already supports and versions its developers can reproduce.

- A model checker can explore event order, concurrency, retries, and state transitions within a stated model.
- A code verifier can analyze the implementation directly, subject to its language, environment, and input bounds.
- A proof assistant can establish a theorem beyond finite bounds, with explicit assumptions and trusted components.

Record why the tool fits and what it cannot establish. Discover available tools and supported installation paths. No language, editor, model provider, or named verifier is mandatory. Follow host permissions before installation or external actions.

## When no suitable verifier supports the language

Check the available tools against the requested property and implementation language before declaring a limitation. If no suitable verifier can analyze the implementation within the agreed scope, say so. Offer property-based or fuzz testing that executes the real code with generated inputs, not a handwritten substitute for the function. Keep the original budget and stopping condition; ask before a material scope change.

Label this as testing evidence, not a proof. Never silently satisfy an explicit proof request with the fallback: state that the proof request remains unmet and let the user decide whether the testing deliverable is useful. If proceeding within authorized scope, record the actual entry point, property/oracle, input generators, seeds or replay corpus, case count or duration, tested ranges, exclusions, minimized failures, and rerun command. Report the tested scope and remaining proof gap even when all generated cases pass. Unsupported execution or exhausted resources remain explicit limitations.

Carry this testing label and evidence into the generated skill and handoff. Do not label a sampled pass as exhaustive verification or assume model checking removes the implementation proof gap.

## Ground the verification

Apply the shared [formal contract](references/formal-contract.md): tie each claim to source symbols and analyzed artifacts, justify abstractions, preserve findings, and distinguish model, implementation, and incomplete results.

## Generate the project-local skill

Use the project's supported skill location and naming conventions. Give the skill YAML frontmatter with a specific name and description. Write real paths, commands, and project terms, with no unfinished placeholders.

The generated skill must contain:

- **Claim:** the property, user impact, source revision, and exact analyzed artifacts.
- **Mapping:** source symbols, model elements, abstractions, assumptions, bounds, exclusions, and the source-to-model bridge or its absence.
- **Run:** pinned tool versions, prerequisites, setup, one reproducible command, resource limits, and expected result meanings.
- **Evidence:** commands, exit status, tool output, explored scope or proof obligations, counterexamples, findings, and durable artifact paths.
- **Rerun and drift:** per-check covered paths and symbols, the last confirmed mapping revision (or unknown), a separate verification-result record, how to inspect subsequent history and working-copy changes, and when the mapping, model, or proof needs review. Follow the shared contract for advancing either record.
- **Cleanup:** owned scratch files and processes to remove, with evidence and existing user work preserved.

A changed source revision invalidates an implementation claim until relevant changes are reviewed and required checks rerun. Record justified reuse for unrelated changes. The formal skill owns this drift procedure; use `maintain-formal-verification-skill` for an explicitly requested audit after changes that skipped it. The live-app feature-map contract in `maintain-verification-skill` is separate.

## Exercise the generated instructions

Follow the shared [formal contract](references/formal-contract.md) for baseline execution, isolated negative controls, restoration, and result classification. Exercise the generated skill from its documented starting state. An unexecuted skill remains a draft; a timeout or unfinished proof remains inconclusive.

## Hand off

Report the property, tool and rationale, result, source revision, assumptions, bounds, exclusions, and rerun command. Explain counterexamples in plain words. State whether the evidence concerns a model or the implementation, and disclose validation gaps. Suggest another target only when it adds clear value within the user's goal.
