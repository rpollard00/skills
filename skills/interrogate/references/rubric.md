# Probe lenses

Use relevant risks to choose experiments. This is not a checklist to fill with opinions.

- **Correctness**: exercise the intended behavior, boundary inputs, error paths, and real callers.
- **State**: repeat operations, interrupt and resume them, and exercise concurrent actors in isolated test state.
- **Integration**: test the actual boundary and inspect its artifacts. State when a substitute limits the claim.
- **Security**: demonstrate reachable permission or input-handling failures with safe fixtures and authorized resources.
- **UI**: exercise affected interactions and inspect current renders under stated conditions. Apply `ui-design` and its [production verification](../../ui-design/references/BROWSER-OBSERVATION.md#production-verification) guidance.
- **Plans and designs**: run a prototype or probe that tests an assumption. State what the experiment does not cover.

Trace a suspected failure through real call paths, then run it. Missing tests, complexity, and hypothetical future callers are not demonstrated failures.
