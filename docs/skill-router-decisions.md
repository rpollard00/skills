# Software workflow router: selection and adaptation decisions

## Status and purpose

This document records the user's decisions from the skills review. It is not an executable skill or an implementation plan.

The router is named `mako`. It targets pi, Codex, and OpenCode 2. It selects workflows and invokes skills. It is not a help catalog like Matt Pocock's `ask-matt`.

The user explicitly invokes Mako with a task. Ordinary prompts do not activate it automatically. Once invoked, it stays active within that conversation until the user opts out. It does not announce activation or narrate internal skill selection. It shows useful progress, decisions, evidence, and approval requests. Use each harness's explicit-only invocation controls where supported.

The review imported no skills. The selected bundle is now implemented in sibling directories under `skills/`. See [provenance](upstream-provenance.md) and [harness evidence](mako-harness-compatibility.md). Runtime completion enforcement remains open. Tune agent behavior through actual use rather than a standing behavioral test plan.

## Autonomy-first revision

The user requested a closer, framework-agnostic adaptation of Poteto's posture before further tuning through use. Routine engineering decisions and recovery proceed without permission checkpoints. Engineering gates are checks the agent satisfies, not human approvals. Choose reasonable defaults and record consequential assumptions; ask only about material unresolved intent with no reasonable default, explicit checkpoints, or dangerous actions outside clear authority.

Prefer separate implementers and independent review when the host supports them. Missing delegation alone is not a reason to stop: use direct or sequential execution and disclose lost independence. Explicit independence requirements and host failure-recovery rules still apply. This supersedes the earlier requirement to request permission for direct implementation.

Keep the existing interactive skills intact, but invoke interviews and visual approval sessions only when that collaboration is requested. Ordinary UI implementation uses Feature with rendered verification. Keep explicit read-only, design-only, local-only, and operator-landing limits. A request to publish or land includes its normal verified delivery steps without a second approval round; it does not imply production deployment or unrelated external commitments.

Harness integration details live in [harnesses.md](../skills/mako/references/harnesses.md), separate from shared execution. Keep automated checks for tooling and bundle integrity. Use real tasks to identify instruction changes; do not maintain a separate behavioral acceptance suite.

## Skill references

Use exact skill names in instructions rather than Markdown links to other skills' entry points. Resolve through the harness, with a sibling `<name>/SKILL.md` fallback from the containing skill directory when name lookup is unavailable. Keep explicit file links for playbooks, references, scripts, and human-facing navigation. No generated dependency manifest is needed.

## Sources reviewed

- [pstack and cursor-team-kit](https://github.com/cursor/plugins/tree/12d587dfb20741cafc376c42c696c5f6e2a64487), revision `12d587dfb20741cafc376c42c696c5f6e2a64487`.
- [Matt Pocock's skills](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7), revision `c55ee46073ed923f86ce59a5eb3b6d895095d1b7`.
- Existing repository skills and locally installed architecture skills.
- Installed pi-subagents documentation and selected mission implementation files.
- Local pi-relentless README. Relentless behavior was not tested in this review.

Preserve applicable upstream copyright and license notices when copying substantial content. Record provenance for imports and adaptations.

## Existing skills

Retain `refine-ui`, `jj`, `writing`, `simple-technical-english`, and `unslop`.

The user will continue to develop `refine-ui`. It owns visual direction exploration and its explicit user approval gates. Do not replace it with an upstream prototype workflow.

The existing writing router owns prose policy. Do not import competing upstream writing routers or technical-writing standards.

When `.jj` is present, the `jj` skill owns version-control mechanics, including conflicts, rebases, bookmarks, publication, and recovery.

## Matt Pocock selection

- `improve-codebase-architecture`: Keep and adapt. Preserve targeted architectural fault investigation. Remove the default preference for recently changed code. Prioritize observed friction rather than recency.
- `codebase-design`: Keep the Ousterhout-style design vocabulary, deepening guidance, and alternative-design technique.
- `domain-modeling`: Keep as an agent-invoked discipline for terminology, glossary maintenance, and consequential domain decisions.
- `grilling`: Keep the dependency-ordered interview and shared-understanding gate.
- `grill-me`: Keep the user-invoked entry point, but always compose grilling with documentation/domain modeling.
- `grill-with-docs`: Keep its behavior. Decide later whether it remains a separate wrapper or a router path.
- `diagnosing-bugs`, `tdd`: Do not import wholesale. Incorporate failure isolation and failing-before/passing-after evidence into one bug-fix skill.
- Other reviewed skills: Exclude for now.

Explicit exclusions include `to-spec`, `to-tickets`, `implement-spec`, Matt's `prototype`, `code-review`, `writing-for-agents`, `research`, `handoff`, `wayfinder`, and `wizard`.

The remaining catalog was also declined. Matt's `teach` maintains a separate multi-session learning workspace. It is not pstack's code-explanation workflow and remains excluded.

## Router behavior

- Keep the mode active within the conversation until the user opts out. Adapt Cursor-specific sticky-mode metadata; do not assume persistence across new sessions.
- Select the task playbook and establish its required steps before execution. Preserve step tracking, completion gates, and explicit skip reasons. Use native tracking when available, otherwise a checklist.
- Keep casual turns and simple tasks free of unnecessary workflow ceremony.
- Investigate observable facts. Research, source inspection, and experiments can resolve uncertainty. Prototypes are useful for empirical proof but are not mandatory for every question.
- Make engineering decisions and use reasonable defaults. Ask only for consequential unresolved intent without a reasonable default; preserve explicit checkpoints and dangerous-action boundaries.
- Keep `how` required for nontrivial changes, architecture decisions, and “are we sure?” questions.
- Experiment with pstack's architectural triggers rather than narrowing them upfront. Compose them with `codebase-design`.
- Prefer separate implementers for feature work. The lead owns coordination, review, and acceptance when delegation is available. Otherwise work directly and report missing independence without adding a permission pause.
- Route competing solutions through `arena`, parallel coverage or races through `swarm`, and adversarial review through `interrogate`.
- Require runtime verification on the relevant surface. Discover available capabilities, including Chrome DevTools MCP, rather than require Cursor control skills.
- Permit updates to a referenced ticket through an available MCP or CLI. Omit team-chat permissions from the imported policy.
- Open a PR when the task, repository, remote, and delivery process warrant one. Do not force PRs for investigations or local work.

### Shared-skill repair requests

The initial restriction against automatic repair requests was revised.

Agents can file actionable issues or prepare focused repair PRs in a shared skill's source repository. Include the failure, reproduction, proposed correction, and validation. Link the request from the task's decision trail.

Merging the repair or replacing the installed skill is separate from proposing it. Do not silently change active shared instructions. Preserve the scope of the assigned project task.

## Pstack skill selection

- `how`, `why`, `teach`: Keep their substance. Adapt harness mechanics and apply the existing writing router. Do not narrow `why`'s broad investigation policy. Preserve confidence distinctions.
- `architect`: Keep design-before-implementation, caller-first sketches, competing designs, and redesign when the shape fails.
- `arena`: Keep candidate generation, independent judgment, base selection, synthesis, and verification. Support both identical and deliberately contrasting briefs.
- `swarm`: Keep parallel coverage and races, exact revision/method evidence, explicit gaps, and consolidated reports.
- `interrogate`: Keep independent review and lead judgment. Prefer diverse models; disclose same-model review. Treat crossing 1,000 lines as an inspection trigger, not a blocker. Remove the five-actionable-findings heuristic.
- `no-comments`: Keep the upstream persona and deletion policy. Adapt harness and repository mechanics. Constraint encoding inherits the caller's implementation authority; honor explicitly reserved checkpoints rather than adding routine approval gates.
- `deslop`: Keep the cleanup checkpoint from cursor-team-kit, with repository-aware version-control mechanics.
- `blast-radius`: Keep evidence-backed change-impact investigation beyond immediate callers.
- `reflect`: Keep session-based improvement proposals and approval before skill edits. Adapt transcript access. Do not create backlog entries without authorization.
- `create-verification-skill`: Keep project-specific launch, doctor, drive, evidence, cleanup, and feature-map generation. Execute the generated instructions before claiming success.
- `maintain-verification-skill`: Keep source and live coverage, verification-tool maintenance, and separate reporting of product regressions. Adapt placement and delivery.
- `figure-it-out`: Keep task-specific workflow construction and evidence checkpoints. It does not depend on importing the multi-phase-plan template.
- `show-me-your-work`: Keep the decision-trail capability. Format, storage, and integration remain open.
- `typescript-best-practices`: Keep substantive guidance as-is. The user will review its technical policies later.
- `bro`: Keep as a user-invoked plain-language reset.
- `recall`: Exclude. No stub or automatic route. Revisit as a separate task.
- `automate-me`, `make-bot-ui`: Exclude.
- `setup-pstack`: Replace Cursor model-rule setup with harness-specific configuration guidance.
- Benny automation pack: Defer.

### Architecture composition

`architect` owns the workflow. `arena` owns candidate execution, comparison, synthesis, and verification. `codebase-design` owns shared design vocabulary and criteria.

Model diversity and design diversity are independent choices. Use separate attempts with the same model when necessary. Use contrasting architectural constraints when ambiguity warrants distinct approaches. Evaluate candidates against shared requirements and a common rubric.

Retain Matt's design-it-twice technique inside this process, not as a duplicate orchestration round. Architect's requirement for structurally distinct designs takes precedence over arena accepting convergence.

Candidate agents produce one design package. They do not recursively launch architect or arena. The caller determines whether architect returns a sketch or proceeds into implementation. Deliberately invoked interviews and interactive UI sessions retain their checkpoints; do not insert them as mandatory stages of ordinary implementation.

### Knowledge ownership

- Domain glossary: what terms mean.
- ADRs: why accepted consequential decisions were made.
- Feature map: how to exercise behavior and prove it works.
- Decision trail: execution choices, evidence, outcomes, and reversals.

Link these records rather than duplicate their contents. Investigation of historical rationale does not silently revise accepted domain decisions.

## Principles

Retain all 23 upstream principles as independent skills outside Mako. Use explicit-only discovery where supported and deliberately load relevant principles through file references. Mako carries a compact trigger index. Reuse principle substance unless a recorded adaptation applies.

The proposed layout and preliminary pi discovery test are recorded in [mako-layout-proposal.md](mako-layout-proposal.md). A whole-bundle symlink preserves relative dependencies without a generated index in that test. Other target harnesses remain unverified.

### Core

Retain laziness protocol, foundational thinking, redesign from first principles, attack the premise, subtract before you add, minimize reader load, outcome-oriented execution, experience first, exhaust the design space, and build the lever.

Redesign is specifically valuable for escaping local maxima. Do not interpret the smallest-change preference as a requirement to preserve the existing architecture.

### Architecture

Retain model the domain, boundary discipline, type-system discipline, make operations idempotent, migrate callers then delete legacy APIs, and separate before serializing shared state.

Require evidence of a compatibility obligation before adding compatibility machinery. Internal callers that can change together are migration work, not a reason to retain an old API. Independently deployed consumers or persisted data can create real obligations, even in a small dogfood project.

Keep pure implementation details inside coherent modules where appropriate. Do not create shallow public interfaces merely for testability.

### Verification

Retain prove it works, fix root causes, sequence verifiable units, and test behavior rather than implementation.

- Investigate repeated defect patterns, but keep fixes within authorized scope.
- Align verification units with explicit migration boundaries. Do not automatically rebase before every task.
- Replace the behavior-testing principle's inaccurate matcher blacklist with a test of sensitivity to relevant behavioral defects.
- Preserve separate failing-test and fix commits/changes for reproducibility. They need not merge independently.

### Delegation and learning

Retain guard the context window, never block on the human, and encode lessons in structure.

Adapt delegation to actual capabilities and authority. Compact summaries do not replace artifact inspection where verification requires it. Routine execution must not bypass user decision gates. Remove textual guidance only when a replacement mechanism actually enforces the requirement.

## Playbooks

- Investigation: Keep read-only, cited analysis. No automatic implementation or PR.
- Feature: Keep `how`, `architect`, explicit decomposition/checkpoints, separate implementers where supported, runtime verification, and appropriate delivery. Use the disclosed direct-execution fallback when necessary. Do not repeat settled design exploration.
- Bug fix: One skill combines pstack's workflow with the agreed regression discipline. Reproduce, isolate a failing check, record it separately, investigate, fix, and prove the check and original scenario pass. No general test-first mandate for new features.
- Refactoring: Keep behavior preservation through meaningful tested seams. Internal APIs can change and disappear. Observable behavior changes belong to a feature or bug-fix scope.
- Perf issue: Keep baseline measurement, evidence-backed hypotheses, delegated fixes, and before/after comparison.
- Hillclimb: Keep controlled experiments, fixed measurement methods, regression gates, keep/revert decisions, and recorded outcomes. Minimum attempt counts are optional. Coordinate completion with the continuation owner.
- Runtime forensics: Keep diagnosis without an automatic product fix. Live instrumentation is a mutation and requires an authorized environment.
- Trace forensics: Keep reproducible, queryable artifact analysis. Prefer existing query tools. Otherwise use a faithful SQLite conversion that preserves required relationships.
- Prototype: Keep behavioral/timing experiments in isolated scratch space. `refine-ui` owns visual exploration. Do not categorically ban assertions or production libraries needed for a faithful experiment.
- Visual parity: Keep separate from UI improvement. Establish reproducible capture conditions and any tolerance before comparison. Do not weaken the baseline after a failure.
- Authoring a skill: Keep portable authoring and validation. Replace Cursor's built-in dependency; apply existing writing policy.
- Eval: Keep isolated realistic tasks, blinded assessment, and execution evidence. Adapt model and transcript access.
- Babysit: Keep distinct status-only, review-thread, and merge-readiness modes. Allow authorized conflict resolution and rebasing through `jj` when present. One topology owner per stack.
- Shipping: Keep independent behavioral verification, revision-specific evidence, dependency-order landing, and explicit merge authority. Shipping here means merging, not deploying.
- Opening a PR: Keep Conventional Commits and concise evidence-backed descriptions. Use `jj` when present. Follow repository delivery conventions, including draft status. Do not import destructive reset shortcuts.
- Session pickup: Keep targeted continuation, distinct from broad recall. Preserve prior decisions, inspect current state, and renew missing or stale evidence.
- Pause safely: Keep coordinated safe stopping and a compact durable handoff. Adapt WIP handling to jj and avoid competing state documents.
- Autonomous run: Keep checkable completion, bounded verified increments, decision records, and explicit blockers. Adapt shared-skill repair policy and continuation mechanics.
- Autopilot-full: Keep owner-per-PR lifecycle, independent coordinator verdicts, and authorized merging of independent work.
- Autopilot-stack: Keep verified stack delivery without merging. One topology owner; use jj guidance and re-verify after invalidating changes.
- Multi-phase plan: Exclude for now. Revisit with its verification and execution system; do not import a reduced template yet.
- Orchestrate: Defer pstack's complete system. Explore an orchestrator backed by existing infrastructure separately.
- Worktree/simulator cleanup: Exclude for now.

Autopilot adaptations remove Cursor cloud requirements, sleeper chains, fixed publication/audit timings, and universal draft/squash policies. Confirm a worker no longer owns writable resources before replacement.

## Harness integration

Keep portable workflow instructions separate from harness-specific execution details. Discover capabilities rather than assume tool names, model identifiers, fresh contexts, cloud workers, or persistent loops.

Pi-subagents supplies documented execution, review, gate, mission-state, notification, supervisor, and control capabilities. These can support the pi implementation of an orchestrator. This review did not test their integration end to end.

Use one top-level continuation owner. Do not run Relentless and pi-subagents mission goals as independent drivers of the same task.

Pi-subagents goal notices reduce idle stopping, but do not prove completion. The inspected `mission.close` handler accepts terminal status without checking mission-wide acceptance evidence. Runtime completion enforcement remains an integration task.

Possible mission outcomes need distinct evidence:

- Completed: verified mission predicate, required reviews, and every child accounted for.
- Blocked: concrete blocker, attempted approaches, evidence, and next action.
- Budget exhausted: incomplete checkpoint, not success.
- Cancelled: explicit operator stop.

The plugin's managed isolation is documented as Git worktrees, not jj workspaces. Verify jj isolation and integration before relying on automatic worktree behavior.

Respect each harness's lifecycle and failure policy. Do not silently change runners or models after infrastructure failure. Do not treat a stop-message receipt as proof that a writer stopped.

## Implementation and remaining work

The bundle now uses a flat `skills/<name>/` layout with one shared index instead of category directories. Prose Markdown tables are formatted as lists. Mako owns 19 playbooks; `bug-fix` is the single reusable repair skill. `grill-me` includes documented grilling without a separate alias. Dependency links, licenses, provenance, and three-harness discovery checks are present.

The decision-trail skill reuses an existing adequate native journal. It falls back to the upstream TSV format when native state does not record decisions, reasons, evidence, outcomes, and run identity. This avoids adding a second status ledger or requiring driver-internal mutations.

Remaining work:

1. Use Mako on real tasks and refine instructions where observed behavior warrants it.
2. Verify interactive invocation in each harness.
3. Resolve runtime mission-completion enforcement and jj isolation integration.
The full bundle is now installed through `~/.agents/skills/reese`. The user authorized deleting the four older architecture copies without comparison or backup. The installer migrated owned aliases and preserved unrelated skills.

## Superseding decision: shared UI discipline

The approved extraction adds explicit-only `ui-design`, bringing the collection to 53 skills. It owns reusable UI judgment, system choices and memory, browser evidence, temporary mockups, and licensed reference consultation. The helper moves with those references; private legacy caches stay in place and remain discoverable.

Mako loads this discipline before applicable UI planning or implementation, including read-only, bug-fix, parity, and autonomous routes. It adds no authority to restyle, write during audits, alter baselines, or impose interactive approval. Feature checks content purpose and placement alongside rendered behavior.

`refine-ui` retains scope selection, grilling, its two-to-four alternatives default, consolidated readiness, empty-frontier requirement, provisional memory, and all three human gates. Explicit rendered acceptance establishes decisions; only the user's rollout decision permits broader migration.

User-visible strings are writing even in source code. Existing quoted labels remain exact; new labels require clarity and consistent terminology. Factual copy uses STE and persuasive copy uses unslop. Static wiring and discovery checks are evidence of bundle structure, not model compliance.
