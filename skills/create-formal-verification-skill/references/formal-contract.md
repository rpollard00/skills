# Formal verification contract

Read this contract when creating or maintaining a project-local formal check. It supplies shared evidence and execution rules; it does not activate either workflow. Read [execution](../../mako/references/execution.md) for repository operations, isolation, and permissions.

## Bound the work

Record the property, scope, resource budget, and stopping condition before running checks. Preserve existing limits unless a justified change is within the user's scope. Stop at the limit and report unfinished work as inconclusive; do not silently retry without bounds or substitute a weaker claim.

## Ground the verification

Map each property, model action, and state variable to source symbols at the recorded revision. Explain abstractions and excluded behavior. An atomic model action must match an atomic implementation step or carry an explicit, justified assumption.

Record input and state bounds, environment assumptions, fairness or scheduling assumptions, and trusted components. Check that the initial states and assumptions permit the behavior of interest. An unreachable assertion or impossible precondition is not useful evidence.

Distinguish these results:

- **Model result:** the property holds for the model under its stated assumptions and exploration bounds.
- **Implementation result:** the tool analyzes the code, or a demonstrated bridge connects the analyzed artifact to the code.
- **Testing fallback:** generated-input property tests or fuzzing execute the real code over the recorded tested scope. Preserve seeds/corpus, limits, failures, and the remaining proof gap; a sampled pass is not formal proof.
- **Incomplete result:** timeout, resource exhaustion, unsupported behavior, or unfinished proof obligations prevent a conclusion.

A handwritten model does not automatically detect a source mutation. Describe the source-to-model bridge when one exists. Otherwise, require a mapping review and corresponding model updates after relevant source changes. Never describe a model pass as proof of unchanged implementation behavior.

When the current code violates the property, preserve the counterexample and explain its steps in the code's terms. Distinguish a product defect from a modeling error with evidence. Do not weaken a property, bound, or assumption merely to obtain a pass. Record justified corrections and their effect on the claim. Keep unresolved findings visible. Product repairs require separate authority unless the task already includes them.

## Record mapping and results separately

For each check, retain the property and source-symbol coverage, exact analyzed artifacts, assumptions, bounds, exclusions, commands, and evidence. Track these two independent records:

- **Mapping freshness:** the revision at which a completed review last confirmed that the check describes the covered code, the reviewed history range, and any outstanding mapping gaps.
- **Verification result:** the exact analyzed source/artifact revision, working-copy changes, tool version, command, limits, output, and outcome (pass within stated scope, counterexample, inconclusive, or not run).

A synchronized mapping is not a successful verification. A passing old model is not evidence of a current mapping. Advance the synchronized revision only after the mapping review is complete for that check; keep its previous revision when review is blocked or incomplete. A completed mapping review can coexist with a counterexample or timeout: record that result honestly and never advance a last-successful-verification record on that basis.

If the baseline is missing or cannot be verified, keep it unknown. The last edit to a verification file is not evidence that its mapping was reviewed. Establish a new mapping baseline only by completing and documenting a current-source review; disclose that historical coverage remains unknown. Record committed revisions and uncommitted patches separately, using a reproducible patch or artifact identity. Never describe a dirty tree as the unmodified commit or stamp a clean revision with evidence from different source.

Keep prior findings and counterexamples visible. If a promise intentionally changed, retain its old and new wording and cite the evidence for that change; distinguish a retired claim from a repaired defect. Name a defect's introducing commit only when history or reproduction establishes it. Otherwise say it is unknown or a candidate, with the supporting evidence.

## Exercise the instructions

Run the generated skill from its documented starting state. Record the baseline result, including existing failures. Verify that the next agent can reproduce the result from the skill alone.

Use isolated scratch copies for fault injection. For a code-level check, introduce a relevant implementation defect and run the check. For a handwritten model, mutate the corresponding model behavior and record that this tests the model's sensitivity. Claim source-mutation detection only when a demonstrated bridge actually detects that mutation.

Choose a meaningful negative control for each delivered property when feasible. A setup or compilation error does not demonstrate detection of a property violation. A detected violation increases confidence in the check's sensitivity. It is not the definition of a proof or evidence that every defect will be detected. If a negative control is infeasible or misses the intended violation, disclose that gap and investigate the mapping or check. Do not alter the mutation merely to manufacture a successful demonstration.

Remove only this run's scratch mutations. Rerun the original verification and compare it with the recorded baseline. Preserve earlier counterexamples, logs, and findings after cleanup. Never reset a dirty checkout or discard user changes.

An unexecuted skill remains a draft. A reproducible skill can be delivered with a reported counterexample. A timeout or unfinished proof remains inconclusive, even when the setup works.
