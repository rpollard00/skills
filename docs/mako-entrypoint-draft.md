# Mako entry-point draft

Status: historical design draft. The implemented entry point is [Mako](../skills/engineering/mako/SKILL.md). This draft is not installed.

Skill names in this draft identify selected dependencies. Add relative links when those dependencies exist. Do not publish this draft as a functioning standalone skill.

Proposed pi/Cursor frontmatter:

```yaml
---
name: mako
description: Apply Mako's software engineering workflows to the supplied task. Activate only when the user explicitly invokes Mako.
disable-model-invocation: true
---
```

Codex requires its own invocation policy. OpenCode 2 activation remains an adapter question. The body that follows is the proposed portable instruction contract.

---

# Mako

Select and execute the workflow that fits the task. Keep the user in control of intent, scope, and approval gates.

## Activation

Activate only on explicit user invocation. Treat the accompanying prompt as the task. Stay active for later tasks in this conversation until the user opts out. Do not announce activation or narrate internal skill selection.

An invocation without a task requests the task; it does not authorize a repository-wide audit. Casual questions do not require an engineering workflow.

After compaction, continue from the recorded active workflow and evidence when available. Do not assume that a new conversation inherits activation. Pass the applicable workflow and constraints explicitly to delegates.

## Start the task

1. Establish the requested outcome, scope, current repository state, and delivery target from the prompt and available project evidence.
2. Load applicable project instructions and version-control guidance. When `.jj` exists, use `jj` for repository operations.
3. Select the primary route. A named workflow takes precedence when it fits the request. Preserve narrower requests such as investigation, status-only, or design-only.
4. Load the selected workflow and its required dependencies. Record its ordered steps in native task tracking or a checklist before execution.
5. Retain skipped steps with a specific reason. Required approval gates and verification cannot become optional through a skip note.

Ask for decisions and unavailable facts that materially affect the work. Investigate facts that tools, source, research, or experiments can establish. Do not require a prototype when another method settles the question.

Use `figure-it-out` when no route fits or the work requires a bespoke sequence. A standing multi-project or multi-day orchestration system is not supplied by this version of Mako.

## Select the route

| Request or situation | Route | Deliverable or stop boundary |
| --- | --- | --- |
| Understand current behavior or assess a claim | Investigation with `how` | Cited explanation or recommendation; no implementation |
| Investigate historical rationale | Investigation with `how` and `why` | Facts, inferences, competing explanations, and gaps |
| Explain code or a change at the user's pace | `teach` | Explanation, not edits |
| Shape a decision or design with the user | `grill-me`, composing `grilling` and `domain-modeling` | Confirmed understanding and warranted glossary/ADR updates |
| Find or investigate architectural friction | `improve-codebase-architecture` | Evidence-backed candidates; stop for selection and later decision gates |
| Design a module or interface | `architect` with `codebase-design` | Design or implementation, according to the authorized task |
| Build new or changed behavior | Feature | Designed, independently reviewed, runtime-verified behavior |
| Reproduce and fix a defect | `bug-fix` | Failing-before and passing-after proof on the reported behavior |
| Restructure without changing behavior | Refactoring | Preserved behavior at tested seams |
| Diagnose and fix measured slowness | Perf issue | Baseline, measured change, and regression evidence |
| Repeatedly improve a measured outcome | Hillclimb | Controlled experiments, accepted changes, and stop verdict |
| Diagnose a live process | Runtime forensics | Evidence-backed diagnosis; no automatic product fix |
| Diagnose an existing capture | Trace forensics | Query-backed findings and source attribution |
| Settle a behavioral or timing uncertainty experimentally | Prototype | Observed answer and isolated exploratory artifact |
| Improve a rendered UI or explore visual direction | `refine-ui` | Its observation, direction, implementation, and acceptance gates |
| Preserve appearance across implementations | Visual parity | Baseline comparison under agreed capture conditions |
| Assess downstream change impact | `blast-radius` | Proven safety assumptions and remaining risks |
| Challenge a design or review a diff | `interrogate` | Prioritized findings and lead judgment; no automatic fixes |
| Create or maintain executable project verification | `create-verification-skill` or `maintain-verification-skill` | Proven instructions and an accurate feature map |
| Author or revise a skill | Authoring a skill | Validated instructions and appropriate behavior evidence |
| Compare skill or prompt behavior | Eval | Isolated candidates, blinded assessment, and execution evidence |
| Resume a specific task | Session pickup | Reconstructed current state, then the remaining task's route |
| Explicitly pause current work | Pause safely | Safe checkpoint and a durable handoff |
| Check PR status, address threads, or reach merge-ready | Babysit | Declare status-only, threads-only, or drive mode; do not merge |
| Merge authorized changes | Shipping | Independently verified changes landed in dependency order |
| Drive one objective without routine intervention | Autonomous run | Verified completion or a concrete incomplete outcome |
| Deliver independent PRs with merge authority | Autopilot-full | Independently verified PRs merged; operator-reserved items wait |
| Build and verify a stack for operator landing | Autopilot-stack | Verified stack; no merge or auto-merge |

Autonomous run and the autopilots compose task routes; they do not replace their design, review, or verification requirements. Opening a PR is a delivery step, not the default outcome of every route.

## Apply phase triggers

Load a dependency before the action it governs. Reuse material already present and current in context.

| Trigger | Required action |
| --- | --- |
| Nontrivial change, architecture decision, or “are we sure?” | Apply `how` to establish the relevant system model. |
| Domain meaning becomes ambiguous or a new term is settled | Apply `domain-modeling`. Preserve the distinction between glossary and implementation details. |
| Write stateful logic or choose a data shape | Apply `principle-model-the-domain`. |
| Code change crosses a function boundary | Apply `architect`. Reuse a settled design instead of repeating the same exploration. |
| Evaluate architecture | Load `codebase-design` vocabulary and applicable principles. |
| Need competing candidate artifacts | Use `arena`. Choose model diversity and design diversity separately. |
| Need partitioned coverage or a declared race | Use `swarm`. Require evidence and explicit gaps. |
| Contested design before delivery | Run `interrogate`. |
| Read or edit TypeScript | Apply `typescript-best-practices`. |
| Produce prose | Apply the existing `writing` router. |
| Before a commit | Run `deslop` within the change's scope. |
| Before review | Run `no-comments`, preserving its selected behavior. |
| Long, autonomous, or multi-phase execution | Keep the canonical decision trail through `show-me-your-work`. |
| User asks to reflect | Run `reflect`; obtain approval before applying shared-skill edits. |
| User invokes `bro` | Restate the previous message plainly. |

Use the compact principle index to select additional applicable principles. Read a principle's full instructions before relying on it. Do not load every principle for every task.

## Coordinate execution

Discover the environment's actual delegation, isolation, model, verification, and continuation capabilities. Follow the harness's execution contract. Do not copy tool calls from a different harness.

For feature work, the lead owns design, coordination, review, and acceptance; separate implementers own production changes. If required separation is unavailable, report that limitation before accepting a substitute workflow.

Before fan-out, name blocking prerequisites, independent workstreams, shared writable state, and the smallest safe decomposition. Keep one writer per writable resource. The stack has one topology owner, even when implementation is parallel.

Give each delegate the objective, exact working location and revision, scope, constraints, required skills, verification, and output contract. Assign one candidate design per arena runner; do not recursively launch the full design workflow.

Use different models when available and appropriate. Separate same-model contexts still provide independent attempts, not multi-model evidence. Report missing required capabilities rather than silently weaken a gate.

Inspect artifacts and current state before accepting a handoff. Respect the harness's failure and recovery policy. Confirm ownership is released before replacing a writer.

Use only one top-level continuation driver. Ordinary child completion wakeups are not a second autonomous mission loop.

## Preserve authority and gates

Proceed with routine execution inside the authorized task. Do not treat reversibility as permission to expand scope.

The calling workflow's approval gates remain in force. Architect can return only a sketch when its caller requires that boundary. Grilling and visual-direction approval are not delegated away.

Update a referenced ticket through an available MCP or CLI when the task calls for it. Agents can file actionable shared-skill repair requests or prepare focused PRs in the skill's source repository. Keep merging those repairs and replacing installed skills separate.

Resolve conflicts and rebase inside the assigned change or stack when authorized. In jj repositories, the `jj` skill owns the mechanics. Renew verification after changes invalidate its evidence.

Opening a PR, making it merge-ready, merging, and deploying are different actions. Determine the delivery target from the request and repository process. Use Conventional Commits. Preserve existing user work and use repository-aware publication and recovery rules.

## Verify and finish

Verify the real behavior or artifact on the relevant surface. Compilation and self-reports do not establish runtime correctness. Failed, blocked, stale, and inconclusive evidence are not passes.

For bug fixes, preserve the failing check in a separate commit/change before the fix. Prove that it fails for the reported reason. Then prove the corrected check and original scenario pass. Separate history does not require a failing revision to merge independently.

For refactoring, preserve observable behavior at meaningful tested seams. Internal APIs can change or disappear. Require concrete compatibility obligations before introducing transitional machinery.

Before completion, account for the required checks, review findings, delegated work, and delivery state. A completion claim must match current evidence.

For autonomous work, distinguish verified completion, a concrete blocker, budget exhaustion, and operator cancellation. An ended turn is not mission completion. Request harness finalization only with the corresponding evidence and durable state.

Report the useful result, verification, remaining risks, and delivery state. Show decisions and approval requests when needed. Do not recite every skill or principle used.
