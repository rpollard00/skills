---
name: create-formal-verification-skill
description: "Generate a project-local skill to verify a stated property with a model checker, code verifier, or proof assistant. Use when explicitly asked to model-check a race, prove an invariant, or create formal verification. Separate from live-app verification and ordinary test work."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Create a formal verification skill

Verify one consequential property and leave a project-local skill that another agent can rerun after a relevant change. A result covers its stated model, bounds, and assumptions. It does not establish correctness of the whole system.

This is an optional route for an explicit formal-verification task. It does not replace tests or the live-app workflow in `create-verification-skill`. Read [execution](../mako/references/execution.md) for repository operations, isolation, and permissions.

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

## Ground the verification

Map each property, model action, and state variable to source symbols at the recorded revision. Explain abstractions and excluded behavior. An atomic model action must match an atomic implementation step or carry an explicit, justified assumption.

Record input and state bounds, environment assumptions, fairness or scheduling assumptions, and trusted components. Check that the initial states and assumptions permit the behavior of interest. An unreachable assertion or impossible precondition is not useful evidence.

Distinguish these results:

- **Model result:** the property holds for the model under its stated assumptions and exploration bounds.
- **Implementation result:** the tool analyzes the code, or a demonstrated bridge connects the analyzed artifact to the code.
- **Incomplete result:** timeout, resource exhaustion, unsupported behavior, or unfinished proof obligations prevent a conclusion.

A handwritten model does not automatically detect a source mutation. Describe the source-to-model bridge when one exists. Otherwise, require a mapping review and corresponding model updates after relevant source changes. Never describe a model pass as proof of unchanged implementation behavior.

When the current code violates the property, preserve the counterexample and explain its steps in the code's terms. Distinguish a product defect from a modeling error with evidence. Do not weaken a property, bound, or assumption merely to obtain a pass. Record justified corrections and their effect on the claim. Keep unresolved findings visible. Product repairs require separate authority unless the task already includes them.

## Generate the project-local skill

Use the project's supported skill location and naming conventions. Give the skill YAML frontmatter with a specific name and description. Write real paths, commands, and project terms, with no unfinished placeholders.

The generated skill must contain:

- **Claim:** the property, user impact, source revision, and exact analyzed artifacts.
- **Mapping:** source symbols, model elements, abstractions, assumptions, bounds, exclusions, and the source-to-model bridge or its absence.
- **Run:** pinned tool versions, prerequisites, setup, one reproducible command, resource limits, and expected result meanings.
- **Evidence:** commands, exit status, tool output, explored scope or proof obligations, counterexamples, findings, and durable artifact paths.
- **Rerun and drift:** affected paths and symbols, how to detect relevant changes, and when the mapping, model, or proof needs review.
- **Cleanup:** owned scratch files and processes to remove, with evidence and existing user work preserved.

A changed source revision invalidates an implementation claim until relevant changes are reviewed and required checks rerun. Record justified reuse for unrelated changes. The formal skill owns this drift procedure. The live-app feature-map contract in `maintain-verification-skill` is separate.

## Exercise the generated instructions

Run the generated skill from its documented starting state. Record the baseline result, including existing failures. Verify that the next agent can reproduce the result from the skill alone.

Use isolated scratch copies for fault injection. For a code-level check, introduce a relevant implementation defect and run the check. For a handwritten model, mutate the corresponding model behavior and record that this tests the model's sensitivity. Claim source-mutation detection only when a demonstrated bridge actually detects that mutation.

Choose a meaningful negative control for each delivered property when feasible. A setup or compilation error does not demonstrate detection of a property violation. A detected violation increases confidence in the check's sensitivity. It is not the definition of a proof or evidence that every defect will be detected. If a negative control is infeasible or misses the intended violation, disclose that gap and investigate the mapping or check. Do not alter the mutation merely to manufacture a successful demonstration.

Remove only this run's scratch mutations. Rerun the original verification and compare it with the recorded baseline. Preserve earlier counterexamples, logs, and findings after cleanup. Never reset a dirty checkout or discard user changes.

An unexecuted skill remains a draft. A reproducible skill can be delivered with a reported counterexample. A timeout or unfinished proof remains inconclusive, even when the setup works.

## Hand off

Report the property, tool and rationale, result, source revision, assumptions, bounds, exclusions, and rerun command. Explain counterexamples in plain words. State whether the evidence concerns a model or the implementation, and disclose validation gaps. Suggest another target only when it adds clear value within the user's goal.
