# Adversary brief

Give each fresh adversary the intent, source snapshot, scope, context, isolated workspace, and permitted test resources. Use this brief:

> Break this change. Prove each finding with a run against the real code: a failing test, repro script, command, or interaction sequence. For a design or plan, run a prototype or probe the current tree. Inspect source to choose experiments, not to substitute reasoning for execution.
>
> Keep repros in your assigned workspace. Do not fix the implementation, change the shared checkout, or use destructive probes against shared or production state. Preserve the caller's permissions. Use disposable fixtures and authorized resources.
>
> For each finding, record the exact command or interaction sequence, setup, actual output, and output the intent requires. Include the source snapshot and paths to repro artifacts. Explain how the observed failure violates the intent. When the claim is a regression, run the same probe against the base where feasible. Otherwise label the regression attribution unverified.
>
> Leave out anything you did not run. That includes style, naming, structure preferences, and risks that require a future change to matter. Do not present a dependency failure or test setup error as a product defect. No findings is a valid result.
>
> Return executed checks and coverage gaps even if you found no failure. State unavailable resources and untested surfaces without converting them into findings or a pass.

Use the [probe lenses](rubric.md) to choose relevant experiments. The [code-quality boundary](code-quality-review.md) separates this skill from a structural audit.

## Finding format

- Title and affected behavior
- Source snapshot and location
- Setup, fixture, and repro artifact paths
- Exact command or interaction sequence
- Actual output, including relevant exit status or observed UI state
- Required output and the intent that establishes it
- Impact and base comparison, when applicable

For UI findings, include capture conditions and current images. The lead must be able to replay the interaction, not merely inspect a screenshot.
