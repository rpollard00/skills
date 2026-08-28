# Context-Aware Delegation

Use delegation to keep context-heavy evidence and iteration out of the main conversation without transferring user authority or losing access to the underlying evidence.

This reference is harness-neutral. A harness may expose subagents, task agents, workers, delegated threads, isolated contexts, or another equivalent. Discover and use the capabilities already provided; do not prescribe a product, tool name, command syntax, or agent profile.

## Interface

### Main agent

The main agent owns:

- the user conversation and grilling;
- the three approval gates;
- the canonical scope, constraints, and settled decisions;
- synthesis when evidence conflicts;
- framing and recording the system and migration scope the user approves;
- root `DESIGN.md` lifecycle;
- the final recommendation and handoff.

### Delegate

A delegate owns one bounded phase with explicit inputs, authority, acceptance checks, and output. It may gather large evidence, iterate internally, and write temporary artifacts. It does not approve a direction, expand scope, or silently redefine user decisions.

### Phase owner

The phase owner is either the main agent or one capable delegate. Every required phase instruction still applies when delegated. Delegation changes where context is consumed, not the quality bar.

### Handoff

A handoff is a compact decision-grade index to detailed evidence. It is not a lossy replacement for the evidence and must preserve paths or stable references that later phases can inspect directly.

## Discover capabilities first

Inspect the harness's system instructions and exposed tools for isolated or delegated execution. Determine, without asking the user for discoverable facts:

- whether delegation exists;
- whether a delegate can receive fresh or minimal context;
- whether it can read the repository and approved external artifact directory;
- whether it can control a browser and capture screenshots;
- whether its model can inspect images;
- whether it can write production files;
- how it returns compact results or managed artifact paths.

Use only executable delegates whose capabilities satisfy the phase. A delegate without browser control cannot own rendered observation. A delegate without vision can perform objective browser checks but cannot certify visual readiness. Do not install or configure delegation infrastructure without approval.

If suitable delegation is unavailable, keep the phase in the main agent. Continue using the canonical packet, approved external evidence artifacts, and compact phase notes or pointers, but do not create a delegate contract or self-handoff when there is no receiving context.

## When to delegate

Prefer delegation when a phase is:

- context-heavy because it reads many files, pages, screenshots, snapshots, or logs;
- bounded by clear inputs and outputs;
- independently executable and artifact-verifiable;
- likely to require an internal inspect–fix–reinspect loop;
- unlikely to require user judgment midway through the phase;
- supported by a delegate with all required capabilities.

Do not delegate merely because a task exists. Keep work in the main agent when:

- the next step is a user-owned decision;
- evidence from several phases must be reconciled;
- the task is small enough that the handoff would cost more context than the work;
- the delegate would need the entire conversation to act correctly;
- the main agent would have to reread every raw artifact to trust the result;
- no delegate can meet the phase's verification contract.

Delegate before consuming the context-heavy evidence in the main conversation. Delegating after loading the screenshot gallery or full source inventory does not recover that context.

## Natural phase seams

### Observation and candidate report

A capable evidence delegate may own repository reconnaissance, rendered observation, the broad reference pass, UI profiling, baseline capture, and candidate-report construction. It returns candidate summaries and artifact paths. The main agent checks the handoff, presents the recommendation, and owns the gap-selection gate.

### Focused reference pass

A read-only delegate may search the prepared licensed reference and write the temporary reference brief. It returns only applicable principles, local section or page pointers, concrete product implications, search limitations, and the brief path. Do not inline passages or page images into the main conversation.

### Mockup exploration

Prefer one capable mockup delegate to own the complete bounded loop:

> focused evidence → alternatives → render matrix → screenshot inspection → defect fixes → recapture → verification manifest → compact handoff

Do not split building, screenshotting, and repair among several delegates unless a fresh independent validator is intentionally added after the phase owner passes its own gate. One owner preserves artifact freshness and avoids repeated visual context.

The main agent still presents the alternatives, receives user feedback, records the user's explicit direction approval, updates the design tree, and writes provisional root `DESIGN.md`.

### Production implementation

After direction approval and provisional design memory, one mutation-capable delegate may own the accepted production slice. Give it the canonical direction packet, repository paths, approved extraction or migration scope, and validation contract. Use one writer for a shared checkout; parallelize reads and reviews, not overlapping writes.

### Rendered production comparison

A fresh capable validator may reproduce baseline conditions, exercise the accepted slice, capture and inspect comparison evidence, and return a pass/fail handoff. The main agent reconciles that verdict with the accepted direction and owns the rendered-production and rollout gate.

## Canonical direction packet

The main agent owns one compact packet in the approved external working directory. Create it once scope is confirmed and update it after every user decision. Delegates read it but do not silently rewrite its settled meaning.

```markdown
# Direction packet

Version or fingerprint: ...

## Scope and question
- Selected gap or confirmed greenfield scope: ...
- Current design question: ...

## Settled decisions
- ...

## Rejected traits
- Trait: ...
  Load-bearing reason: ...

## Constraints
- Product and platform: ...
- Accessibility: ...
- Content fixture and states: ...
- Representative viewports and themes: ...

## System delta
- Reuse, deepen, promote, add, or keep local: ...
- Approved extraction and migration scope: ...

## Reference basis
- Principle and local section or page pointer: ...
- Deliberate departure: ...

## Unresolved decisions
- ...

## Evidence pointers
- Candidate report: ...
- Reference brief: ...
- Mockup and verification manifest: ...
- Production comparison: ...
```

Do not put screenshots, copied reference passages, browser dumps, or long implementation notes in this packet. Point to them.

## Delegation contract

Give each delegate a compact contract containing:

- **Goal:** one concrete phase outcome.
- **Inputs:** exact direction-packet, applicable skill-reference, and evidence-artifact paths; repository scope; routes; states; and accepted decisions.
- **Authority:** read-only, temporary-artifact writer, or approved production writer; actions it must not take.
- **Invariants:** gates, privacy, accessibility, artifact location, system scope, and reference constraints.
- **Acceptance:** the checks and evidence required before returning pass.
- **Output:** the handoff schema and artifact destinations.
- **Stop rules:** unresolved user, product, scope, architecture, credential, or destructive decisions return to the main agent instead of being guessed.

Prefer fresh or minimal delegated context when the harness supports it. Pass the packet and exact evidence paths rather than the full parent transcript. Use inherited conversation context only when the phase genuinely depends on nuanced history that the packet cannot represent safely.

Do not ask an ordinary delegate to create its own delegation hierarchy. The main agent owns orchestration unless nested delegation is an explicit, bounded harness capability and part of the approved phase contract.

## Decision-grade handoff

Require this shape or its structured equivalent:

```markdown
# Phase handoff

## Status
PASS | BLOCKED | USER REVIEW REQUIRED

## Scope completed
- ...

## Findings
### Observed
- ...

### Inferred
- ...

## Verification
- Checks performed: ...
- Defects fixed: ...
- Remaining limitations: ...

## Evidence pointers
- Artifact path, matrix or scope, and fingerprint: ...

## Decisions required
- None | exact question for the main agent or user

## Risks
- ...
```

Keep it concise and proportional. Do not inline:

- screenshot or image payloads;
- full semantic snapshots or DOM trees;
- complete console or network logs;
- large source inventories;
- PDF passages or page images;
- long chronological tool transcripts.

Detailed UI evidence stays in the approved external artifact directory required by this skill. Harness-managed outputs may hold only compact non-sensitive handoffs. Downstream delegates should read the canonical evidence artifact directly instead of receiving a summary of a summary.

## Parent acceptance of a handoff

Before advancing, the main agent verifies that the handoff:

1. covers the contracted scope and matrix;
2. honors the direction packet and authority limits;
3. points to current evidence with relevant fingerprints or conditions;
4. distinguishes observation from inference;
5. reports validation, fixed defects, confidence, and limitations;
6. escalates unresolved user decisions rather than guessing.

A delegate result is evidence, not authority. Expand raw evidence only when:

- the handoff is incomplete or low-confidence;
- two findings conflict;
- the recommendation depends on an ambiguous observation;
- verification failed or evidence is stale;
- the proposed system or migration scope expanded;
- a representative spot-check contradicts the handoff.

For high-impact, systemic, security-sensitive, or low-confidence changes, use a fresh independent validator when a capable delegate exists. Give that validator the direction packet and artifacts, not the builder's reasoning transcript. The main agent synthesizes the verdicts.

## Context discipline

- Keep raw phase evidence in the phase owner's context and approved external artifact directory.
- Return paths and compact findings to the main agent.
- Pass stable artifact pointers between delegates rather than copying content through the parent.
- Preserve user-approved meaning in the direction packet and root `DESIGN.md`, not in delegate memory.
- Do not duplicate a passed inspection in the main context unless a spot-check trigger fires.
- Do not launch several clone tasks; each delegate needs a distinct phase, question, and output.
- Keep one production writer per checkout unless the harness provides deliberate filesystem isolation and the work is truly independent.
- Stop delegation at user gates. No delegate may interpret silence as approval.

The objective is a deep handoff seam: substantial evidence gathering and iteration behind a small, inspectable interface, with the main agent retaining decision quality and user authority.
