# Upstream provenance

## Pinned sources

| Source | Revision | License |
| --- | --- | --- |
| [cursor/plugins](https://github.com/cursor/plugins/tree/12d587dfb20741cafc376c42c696c5f6e2a64487), `pstack/` | `12d587dfb20741cafc376c42c696c5f6e2a64487` | MIT, copyright Lauren Tan |
| Same repository, `cursor-team-kit/skills/deslop/` | Same revision | MIT, copyright 2026 Cursor |
| [mattpocock/skills](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7) | `c55ee46073ed923f86ce59a5eb3b6d895095d1b7` | MIT, copyright 2026 Matt Pocock |

Each imported or derived skill directory includes the applicable upstream `LICENSE`. The maintained `refine-ui`, `jj`, and writing skills keep their existing provenance.

[upstream-imports.json](upstream-imports.json) maps source files to local destinations. Its SHA-256 values identify upstream bytes before adaptation, not the final local files. The manifest is a provenance record, not a generated discovery index or an update mechanism.

## Import boundaries

Pstack supplies the selected investigation, design, review, verification, execution, and principle content. Mako's routing contract and harness reference implement the reviewed decisions. Its playbooks derive from the selected `poteto-mode` playbooks, without importing that router or its excluded orchestration runtime.

`no-comments/references/comment-sicko.md` preserves the upstream reviewer file byte-for-byte. Its parent skill changes invocation and repository mechanics, not the persona or deletion policy.

TypeScript's patterns file is byte-for-byte upstream. Its entry point changes only dependency links and explicit-only harness metadata. Tests normalize those additions and compare it with the pinned source hash.

Matt's imported skills are `codebase-design`, `domain-modeling`, `grilling`, and `improve-codebase-architecture`. `grill-me` implements the documented-grilling composition from `grill-with-docs`; it does not install two competing wrappers.

The unified `bug-fix` skill derives from pstack's bug-fix playbook and the reviewed failing-before/passing-after discipline. General TDD and Matt's broader bug-diagnosis workflow were not imported wholesale.

## Adaptation record

The authoritative selection is [skill-router-decisions.md](skill-router-decisions.md). Major changes are:

- Replace Cursor-only models, tools, transcript paths, authoring dependencies, cloud requirements, and wake loops with discovered harness capabilities.
- Resolve selected dependencies by source-relative links. Retain owned references, templates, scripts, and licenses.
- Compose architect, arena, and Design It Twice without nested candidate orchestration. Keep caller gates.
- Remove architecture recency bias, the five-finding heuristic, and automatic rejection by line count.
- Preserve one bug-fix workflow with separate failing-check and fix history.
- Retain `refine-ui` and the existing writing router. Replace competing prose routes.
- Correct the test-matcher blacklist. Preserve meaningful absence, public-contract, relational, and compile-time tests.
- Keep repairs within scope and preserve product and delivery approvals.
- Use jj when present; remove destructive Git reset shortcuts and blanket rebases.
- Retain real measurement and queryable forensics without mandating SQLite or an arbitrary attempt count.
- Keep readiness separate from landing, and stack delivery separate from merge authority.
- Reuse an adequate native decision journal; use the upstream TSV format and helper only as the fallback. Do not duplicate mission state.

No automatic upstream updater is included. Future upgrades require a fresh comparison against these adaptations and the protected-content tests.
