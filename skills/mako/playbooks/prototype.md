# Prototype

Own the empirical question, not production code. The prototype is a throwaway instrument. Use `refine-ui` for a requested interactive visual exploration, not as a mandatory checkpoint for every UI experiment.

1. State the behavioral, timing, or technical decision the experiment must settle. If source inspection or research answers it reliably, use that instead. No empirical question means no prototype.
2. Define the competing hypotheses and observable result that distinguishes them. Gather prior art when it helps; ask the user for unresolved intent, not discoverable facts.
3. Build in isolated scratch space, separate from production source. Use the smallest faithful setup. Production libraries and assertions are permitted when needed to reproduce the behavior.
4. Compare alternatives under the same conditions. Label variants and keep inputs, environment, and measurement method stable.
5. Observe the real output, timing, state transition, or rendering behavior. Record commands and artifacts. An assertion can encode the observation; a self-report cannot replace it.
6. Present the alternatives, evidence, tradeoffs, recommendation, and scratch path. Say that the artifact is exploratory. If the goal includes implementation, continue through [Feature](feature.md) or `architect` using the evidence-backed choice. A prototype-only request ends with the findings; stop for a decision only at an explicit checkpoint or an unresolved product choice that cannot reasonably be defaulted.

Speed matters more than polish here. Do not turn a discarded experiment into production architecture, or let exploration silently modify the product.
