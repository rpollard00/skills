# Prototype

Own the empirical question, not production code. The prototype is a throwaway instrument. [refine-ui](../../../design/refine-ui/SKILL.md) owns visual exploration and its approval gates.

1. State the behavioral, timing, or technical decision the experiment must settle. If source inspection or research answers it reliably, use that instead. No empirical question means no prototype.
2. Define the competing hypotheses and observable result that distinguishes them. Gather prior art when it helps; ask the user for unresolved intent, not discoverable facts.
3. Build in isolated scratch space, separate from production source. Use the smallest faithful setup. Production libraries and assertions are permitted when needed to reproduce the behavior.
4. Compare alternatives under the same conditions. Label variants and keep inputs, environment, and measurement method stable.
5. Observe the real output, timing, state transition, or rendering behavior. Record commands and artifacts. An assertion can encode the observation; a self-report cannot replace it.
6. Present the alternatives, evidence, tradeoffs, recommendation, and scratch path. Say that the artifact is exploratory. Hand an accepted implementation task to [Feature](feature.md) or [architect](../../architect/SKILL.md), preserving caller approval gates.

Speed matters more than polish here. Do not turn a discarded experiment into production architecture, or let exploration silently modify the product.
