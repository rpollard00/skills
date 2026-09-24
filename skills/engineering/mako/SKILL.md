---
name: mako
description: Apply Mako's software engineering workflows to the supplied task. Activate only when the user explicitly invokes Mako.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Mako

Select and execute the workflow that fits the task. Keep the user in control of intent, scope, and approval gates.

## Activation

Activate only on explicit user invocation. Treat the accompanying prompt as the task. Stay active in this conversation until the user opts out. Do not announce activation or narrate skill selection.

An invocation without a task requests the task; it does not authorize an audit. Keep casual questions free of workflow ceremony. After compaction, continue from the recorded active workflow and evidence. A new conversation does not inherit activation.

## Start

1. Establish the outcome, scope, repository state, and delivery target from the prompt and project evidence.
2. Read applicable project instructions. When `.jj` exists, use [jj](../../version-control/jj/SKILL.md).
3. Select the primary route. Preserve narrower requests such as investigation, status-only, sketch-only, and design-only.
4. Read that route and its required dependencies. Record its ordered steps in native tracking or a checklist.
5. Retain skipped steps with specific reasons. A skip note cannot waive an approval or verification gate.

Resolve links relative to the file containing them. Read [execution](references/execution.md) before delegation, repository mutation, external delivery, or autonomous continuation. Load only current dependencies, not every route.

Investigate observable facts through tools, source, research, or experiments. Ask for product intent, preferences, and decisions evidence cannot settle. A prototype is not mandatory for a factual question.

## Routes

| Request | Route |
| --- | --- |
| Understand behavior, placement, or a claim | [Investigation](playbooks/investigation.md), using [how](../how/SKILL.md) |
| Investigate historical rationale | Investigation with [why](../why/SKILL.md) |
| Explain code or a change at the user's pace | [teach](../teach/SKILL.md) |
| Shape a decision with documented grilling | [grill-me](../grill-me/SKILL.md) |
| Find or investigate architectural friction | [improve-codebase-architecture](../improve-codebase-architecture/SKILL.md) |
| Design a module or interface | [architect](../architect/SKILL.md) with [codebase-design](../codebase-design/SKILL.md) |
| Build new or changed behavior | [Feature](playbooks/feature.md) |
| Reproduce and fix a defect | [bug-fix](../bug-fix/SKILL.md) |
| Restructure without changing behavior | [Refactoring](playbooks/refactoring.md) |
| Diagnose and fix measured slowness | [Perf issue](playbooks/perf-issue.md) |
| Repeatedly improve a measured outcome | [Hillclimb](playbooks/hillclimb.md) |
| Diagnose a live process | [Runtime forensics](playbooks/runtime-forensics.md) |
| Diagnose an existing capture | [Trace forensics](playbooks/trace-forensics.md) |
| Settle a behavioral or timing uncertainty experimentally | [Prototype](playbooks/prototype.md) |
| Improve a rendered UI or explore visual direction | [refine-ui](../../design/refine-ui/SKILL.md) |
| Preserve appearance across implementations | [Visual parity](playbooks/visual-parity.md) |
| Assess downstream change impact | [blast-radius](../blast-radius/SKILL.md) |
| Challenge a design or review a diff | [interrogate](../interrogate/SKILL.md) |
| Create executable project verification | [create-verification-skill](../create-verification-skill/SKILL.md) |
| Maintain verification and its feature map | [maintain-verification-skill](../maintain-verification-skill/SKILL.md) |
| Author or revise a skill | [Authoring a skill](playbooks/authoring-a-skill.md) |
| Compare skill or prompt behavior | [Eval](playbooks/eval.md) |
| Resume a specific task | [Session pickup](playbooks/session-pickup.md) |
| Explicitly pause current work | [Pause safely](playbooks/pause-safely.md) |
| Check PR status, address threads, or reach merge-ready | [Babysit](playbooks/babysit.md), without merging |
| Merge authorized changes | [Shipping](playbooks/shipping.md) |
| Drive one objective without routine intervention | [Autonomous run](playbooks/autonomous-run.md) |
| Deliver independent PRs with merge authority | [Autopilot-full](playbooks/autopilot-full.md) |
| Build and verify a stack for operator landing | [Autopilot-stack](playbooks/autopilot-stack.md), without merging |
| No narrower route fits | [figure-it-out](../figure-it-out/SKILL.md) |

Autonomous routes compose task workflows; they do not waive design, review, or verification. [Opening a PR](playbooks/opening-a-pr.md) is a delivery step, not the default outcome of every task.

## Phase triggers

Read a dependency before the action it governs. Reuse instructions already present and current in context.

| Trigger | Required dependency |
| --- | --- |
| Nontrivial change, architecture decision, or “are we sure?” | [how](../how/SKILL.md) |
| Domain terminology is ambiguous or a consequential decision is settled | [domain-modeling](../domain-modeling/SKILL.md) |
| Write stateful logic or choose data shapes | [model the domain](../../engineering-principles/principle-model-the-domain/SKILL.md) |
| Code change crosses a function boundary | [architect](../architect/SKILL.md); reuse settled exploration |
| Need competing candidate artifacts | [arena](../arena/SKILL.md) |
| Need partitioned coverage or a declared race | [swarm](../swarm/SKILL.md) |
| Contested design before delivery | [interrogate](../interrogate/SKILL.md) |
| Read or edit TypeScript | [typescript-best-practices](../typescript-best-practices/SKILL.md) |
| Produce prose | Existing [writing](../../writing/writing/SKILL.md) router |
| Before a commit | [deslop](../deslop/SKILL.md) within the task's scope |
| Before review | [no-comments](../no-comments/SKILL.md) |
| Long, autonomous, or multi-phase execution | [show-me-your-work](../show-me-your-work/SKILL.md) |
| User asks to reflect | [reflect](../reflect/SKILL.md); approval before shared-skill edits |
| User invokes bro | [bro](../bro/SKILL.md) |

Consult the compact [principle index](references/principles.md) for additional triggers. Read a selected principle's full instructions before relying on it. Do not load all 23 for every task.

## Coordination and authority

Before fan-out, name blocking prerequisites, independent workstreams, shared writable state, and the smallest safe decomposition. Keep one writer per resource and one topology owner per stack.

For features, the lead owns design, coordination, review, and acceptance. Separate implementers own production changes. Report missing separation before accepting a substitute workflow. Inspect artifacts before accepting a delegate's report.

Give each delegate its outcome, source revision, working location, scope, required skills, constraints, verification, and output contract. Assign one candidate per arena runner; do not recursively launch the full design workflow.

Proceed with routine execution inside authorized scope. Reversibility does not authorize expansion. Preserve caller approval gates, including grilling and visual-direction approval. Architect returns only a sketch when its caller requires that boundary.

Update referenced tickets through available MCP or CLI tools when the task calls for it. Agents can file actionable shared-skill repair requests or prepare focused source PRs. Merging repairs and replacing installed skills remain separate actions.

Resolve conflicts or rebase only within assigned authority. Use jj when present. Renew evidence after invalidating changes. Opening a PR, readiness, merging, and deployment are distinct actions. Use Conventional Commits and preserve user work.

## Completion

Verify the real behavior or artifact on the relevant surface. Compilation and self-reports do not establish runtime correctness. Blocked, stale, and inconclusive evidence are not passes.

For bugs, preserve the failing check in a separate commit/change before the fix. Prove failure for the reported reason, then prove the check and original scenario pass. The failing revision need not merge independently.

For refactoring, preserve observable behavior at meaningful tested seams. Internal APIs can change or disappear. Require concrete compatibility obligations before adding transitional machinery.

Before completion, account for required checks, review findings, all delegates, and delivery state. Match the claim to current evidence. Autonomous outcomes distinguish completed, blocked, budget exhausted, and cancelled. An ended turn is not completion.

Report the result, verification, remaining risks, and delivery state. Show decisions and approval requests when needed. Do not recite every skill used.
