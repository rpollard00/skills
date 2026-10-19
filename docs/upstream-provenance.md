# Upstream provenance

## Pinned sources

- [cursor/plugins](https://github.com/cursor/plugins/tree/12d587dfb20741cafc376c42c696c5f6e2a64487), `pstack/`
  - Revision: `12d587dfb20741cafc376c42c696c5f6e2a64487`
  - License: MIT, copyright Lauren Tan
- Same repository, `cursor-team-kit/skills/deslop/`
  - Revision: Same revision
  - License: MIT, copyright 2026 Cursor
- [mattpocock/skills](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7)
  - Revision: `c55ee46073ed923f86ce59a5eb3b6d895095d1b7`
  - License: MIT, copyright 2026 Matt Pocock

The repository's [MIT License](../LICENSE) covers Reese Pollard's original contributions and adaptations. [Third-party notices](../THIRD_PARTY_NOTICES.md) collects the full upstream copyright and license notices.

Each imported or derived skill directory retains the applicable upstream `LICENSE` for its upstream portions. These notices do not assign authorship of the new contributions to upstream authors. The maintained `refine-ui`, `jj`, and writing skills keep their existing provenance. `ui-design` extracts the reusable discipline and PDF helper from `refine-ui`; it adds no upstream import or licensed book content.

[upstream-imports.json](upstream-imports.json) maps source files to local destinations. Its `sha256` values identify upstream bytes before adaptation, not the final local files. The TypeScript entry point also has a historical `list_format_sha256`, computed from upstream text using `scripts/markdown_lists.py`. That value records the table-to-list conversion baseline. Current tests do not compare adapted prose against these hashes. The manifest is a provenance record, not a generated discovery index or an update mechanism.

## Import boundaries

Pstack supplies the selected investigation, design, review, verification, execution, and principle content. Mako's routing contract and harness reference implement the reviewed decisions. Its playbooks derive from the selected `poteto-mode` playbooks, without importing that router or its excluded orchestration runtime.

`no-comments` retains the upstream reviewer persona with two safety exceptions. Verified negative type tests survive comment cleanup. Constraint guidance stays until replacement enforcement passes. Routine constraint encodings use the caller's existing implementation authority. An unavailable or out-of-scope encoding does not authorize deleting the constraint.

TypeScript guidance adapts the upstream examples and matching principle. The duration example validates finite, nonnegative values instead of claiming that a plain number enforces the invariant. The cast example delegates validation to the repository's existing schema. Metadata, dependency references, and list formatting remain local adaptations.

Matt's imported skills are `codebase-design`, `domain-modeling`, `grilling`, and `improve-codebase-architecture`. `grill-me` implements the documented-grilling composition from `grill-with-docs`; it does not install two competing wrappers.

The unified `bug-fix` skill derives from pstack's bug-fix playbook and the reviewed failing-before/passing-after discipline. General TDD and Matt's broader bug-diagnosis workflow were not imported wholesale.

## Adaptation record

The authoritative selection is [skill-router-decisions.md](skill-router-decisions.md). Major changes are:

- Replace Cursor-only models, tools, transcript paths, authoring dependencies, cloud requirements, and wake loops with discovered harness capabilities.
- Name cross-skill dependencies directly. Use harness lookup with a sibling-path fallback; retain file links for specific references, playbooks, and scripts. Retain owned templates and licenses.
- Keep skills in sibling directories under `skills/`, without category directories. Format prose tables as lists; preserve fenced examples and literal fixtures.
- Compose architect, arena, and Design It Twice without nested candidate orchestration. Keep caller gates.
- Remove architecture recency bias, the five-finding heuristic, and automatic rejection by line count.
- Preserve one bug-fix workflow with separate failing-check and fix history.
- Retain `refine-ui` and the existing writing router. Replace competing prose routes.
- Correct the test-matcher blacklist. Preserve meaningful absence, public-contract, relational, and compile-time tests.
- Restore Poteto's autonomy-first posture: make routine engineering decisions and use evidence-backed defaults without extra approval rounds. Preserve explicit task limits, dangerous-action boundaries, and the checkpoints of deliberately invoked interactive skills.
- Separate harness integration notes from the shared execution rules. Delegate investigation and implementation whenever capable subagents are available, and use independent reviewers where supported; disclose direct or sequential fallback rather than blocking merely because a harness lacks delegation.
- Use jj when present; remove destructive Git reset shortcuts and blanket rebases.
- Retain real measurement and queryable forensics without mandating SQLite or an arbitrary attempt count.
- Keep readiness separate from landing, and stack delivery separate from merge authority.
- Preserve Pstack's independent PR readiness lifecycle before stack admission. Transfer monitoring to one stack babysitter after admission. The pinned upstream assigns owner-level babysitting and one babysitter per stack, but leaves this handoff implicit. This adaptation makes the phase boundary explicit.
- Reuse an adequate native decision journal; use the upstream TSV format and helper only as the fallback. Do not duplicate mission state.

No automatic upstream updater is included. Future upgrades require a fresh comparison against these adaptations and the current validation commands. Provenance hashes identify source bytes; they are not active content-preservation checks.

## Focused review against newer pstack

The October 2026 review compared pstack at [df581122cde17e6e27686b5a448bde23e4ad4318](https://github.com/cursor/plugins/tree/df581122cde17e6e27686b5a448bde23e4ad4318/pstack) with the original import. The original manifest pins remain unchanged. These are selective adaptations, not a full upstream upgrade:

- [Benchmark checklist](https://github.com/cursor/plugins/blob/df581122cde17e6e27686b5a448bde23e4ad4318/pstack/skills/benchmark-checklist/SKILL.md): add validity, completed-work, comparison, variability, and end-to-end checks to Hillclimb. Keep the checks independent of tools and fixed sample counts.
- [Architecture red flags](https://github.com/cursor/plugins/blob/df581122cde17e6e27686b5a448bde23e4ad4318/pstack/skills/architect/references/design-red-flags.md): reject importable internals and hand-synchronized lists without generation or consistency checks.
- [TypeScript patterns](https://github.com/cursor/plugins/blob/df581122cde17e6e27686b5a448bde23e4ad4318/pstack/skills/typescript-best-practices/references/patterns.md): replace the incomplete validator-and-cast example with schema-owned parsing. Preserve the existing-library policy.

The constraint, negative-type-test, duration, and premise fixes are local corrections. The premise skill uses a falsifiable hypothesis; actor census applies only to an imbalance hypothesis. Cursor model directives, fixed tool choices, and a second correction workflow remain excluded. Existing upstream license notices still apply.

## October 14 throughput and ownership review

This selective update reviewed pstack at [1e5c90a4](https://github.com/cursor/plugins/tree/1e5c90a4b6f249917bd21fe361b3a2a7deb741b8/pstack). The original import pins and license notices remain unchanged.

- [Verification and ownership changes, ce649c03](https://github.com/cursor/plugins/commit/ce649c03ac3b75b6ae80cbd15b7e2c536caedb5a): run the full swarm at code-ready and after new behavior, redesign, or a large new diff. Rebases, conflict resolutions, and minor fixes get one independent verifier at the new head. Current checks, live proof, and evidence audits remain required.
- [Autopilot-full](https://github.com/cursor/plugins/blob/1e5c90a4b6f249917bd21fe361b3a2a7deb741b8/pstack/skills/poteto-mode/playbooks/autopilot-full.md): replace stuck writers immediately, without confirmed-termination or access-revocation gates. Best-effort stop requests and ownership coordination remain. This deliberate throughput tradeoff accepts overlap risk. Pin publication to the last remote revision the owner pushed or explicitly took over. Stop on unexpected remote changes.
- [Autopilot-stack](https://github.com/cursor/plugins/blob/1e5c90a4b6f249917bd21fe361b3a2a7deb741b8/pstack/skills/poteto-mode/playbooks/autopilot-stack.md): freeze agent writes when operator landing starts. Transfer topology ownership to the landing owner. Mid-landing repairs wait for operator direction.
- [Root-cause signal, 36cecbf2](https://github.com/cursor/plugins/commit/36cecbf2b5089b275254d59cb4612d6f96f00fbd): after deep debugging, propose the cheapest reliable always-on signal for the deciding fact. A proposal does not widen repair authority.

These rules retain harness-neutral routing, jj-native publication protections, meaningful change descriptions, and the active forge's policies, including Azure DevOps. No model slugs, editor requirements, ketchup skill, multi-phase template, or unrelated upstream changes were imported.

## October 15 principle review

These two selective adaptations reviewed pstack at [e5136d82](https://github.com/cursor/plugins/tree/e5136d82418d2db3165ea1050d17577cd618cc05/pstack). The original import pins and license notices remain unchanged.

- [Fix root causes](https://github.com/cursor/plugins/blob/e5136d82418d2db3165ea1050d17577cd618cc05/pstack/skills/principle-fix-root-causes/SKILL.md): distinguish legitimate contract states from impossible internal states. Preserve boundary validation, containment, failure evidence, and the authorized repair scope.
- [Make operations idempotent](https://github.com/cursor/plugins/blob/e5136d82418d2db3165ea1050d17577cd618cc05/pstack/skills/principle-make-operations-idempotent/SKILL.md): reconcile observed and desired state, replacing mandatory PID checks with environment-appropriate ownership and staleness evidence. Preserve valid, live, or uncertain work and require atomicity and deduplication where concurrency calls for them.

## October 18 formal verification and catch-up

These are selective additions. Existing source pins and prior adaptation records remain unchanged. The manifest records each new source revision and its original bytes. Both skills retain the pstack MIT notice.

- [Create formal verification skill, 4382e687](https://github.com/cursor/plugins/blob/4382e687a50b8d2c5ce4d141d001186589cff8d5/pstack/skills/create-formal-verification-skill/SKILL.md): retain property-driven tooling and reproducible project-local verification. Add explicit effort limits, source/model mapping, assumptions, exclusions, and drift review. Replace the unconditional source-mutation claim with evidence appropriate to code-level checks or handwritten models. Negative controls establish sensitivity, not proof by themselves. Preserve findings and isolated scratch work.
- [Ketchup, bc144379](https://github.com/cursor/plugins/blob/bc1443790cc980d0ea857663260a831299884508/pstack/skills/ketchup/SKILL.md): adopt the current-conversation, read-only catch-up and complete decision brief. Include the earlier catch-up scope, current-state checks, alternatives, and missing-history disclosure. Remove the earlier 150-word cap and later fixed recap/item targets. Preserve every pending item and its decision evidence. Replace the mandatory bro voice, fixed visualization tools, and geometry rules with the existing writing guidance and available channel capabilities.

Both skills are explicit-only, with portable OpenCode and Codex metadata. Mako routes to them only for their requested workflows. The formal route does not alter the live-app verification or maintenance contracts. No other upstream changes are included.

## October 19 formal maintenance and unsupported-language fallback

These are selective adaptations, not a full upstream upgrade. The creation-specific manifest pin advances from the October 18 source at `4382e687a50b8d2c5ce4d141d001186589cff8d5` to `6b78e9f4e46c75d1697d837e51f07c2692e60b24`; its earlier source SHA-256 was `5f5c08d6f5787ce18ffc9f018113e9cc6e7ddcc7878aa7ae94ef56978978497b`. The earlier adaptation decisions above still apply. All unrelated manifest pins remain unchanged.

- [Maintain formal verification skill, 7b353f78](https://github.com/cursor/plugins/blob/7b353f78f6ec193bdbe48ed8059444eb09b6878e/pstack/skills/maintain-formal-verification-skill/SKILL.md): add the explicit maintenance route and retain discovery, history review, source-driven mapping updates, preserved findings, and verification-only edit scope. Separate mapping freshness from check results; do not infer a confirmed baseline from the latest verification-file edit. Bound investigation and reruns. Require evidence for an introduction commit, implementation bug, intentional contract change, and source/model correspondence. Preserve unknown or blocked states and distinguish model sensitivity from implementation sensitivity.
- [Create formal verification skill fallback, 6b78e9f4](https://github.com/cursor/plugins/blob/6b78e9f4e46c75d1697d837e51f07c2692e60b24/pstack/skills/create-formal-verification-skill/SKILL.md): adopt generated-input property testing or fuzzing against the real implementation when no suitable verifier supports its language. State that this is testing evidence, not formal proof or exhaustive coverage. Preserve least-cost, property-driven tool choice and the prior adaptation's bounds, evidence, and mutation-safety rules. Do not import the upstream blanket TLA+ default or unconditional source-mutation requirement.

The shared [formal claim and evidence contract](../skills/create-formal-verification-skill/references/formal-contract.md) is a local adaptation used by both routes. The manifest hashes identify the newly reviewed upstream bytes before adaptation. Both skills retain the pstack MIT notice and portable explicit-only discovery metadata. Live-app verification, feature-map maintenance, and ordinary feature or bug-fix gates are unchanged.
