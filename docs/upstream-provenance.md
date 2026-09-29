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

[upstream-imports.json](upstream-imports.json) maps source files to local destinations. Its `sha256` values identify upstream bytes before adaptation, not the final local files. The TypeScript entry point also has a `list_format_sha256`, computed from the verified upstream text using `scripts/markdown_lists.py`, to protect its content after table-to-list conversion. The manifest is a provenance record, not a generated discovery index or an update mechanism.

## Import boundaries

Pstack supplies the selected investigation, design, review, verification, execution, and principle content. Mako's routing contract and harness reference implement the reviewed decisions. Its playbooks derive from the selected `poteto-mode` playbooks, without importing that router or its excluded orchestration runtime.

`no-comments/references/comment-sicko.md` preserves the upstream reviewer file byte-for-byte. Its parent skill changes invocation, repository mechanics, and approval inheritance, not the persona or deletion policy. Routine constraint encodings use the caller's existing implementation authority.

TypeScript's patterns file is byte-for-byte upstream. Its entry point changes only dependency references, explicit-only harness metadata, and table formatting. Tests normalize dependency links or exact skill names back to the upstream labels, remove the added metadata, then compare against the list-formatted upstream hash.

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
- Separate harness integration notes from the shared execution rules. Prefer independent implementers and reviewers where supported; disclose direct or sequential fallback rather than blocking merely because a harness lacks delegation.
- Use jj when present; remove destructive Git reset shortcuts and blanket rebases.
- Retain real measurement and queryable forensics without mandating SQLite or an arbitrary attempt count.
- Keep readiness separate from landing, and stack delivery separate from merge authority.
- Preserve Pstack's independent PR readiness lifecycle before stack admission. Transfer monitoring to one stack babysitter after admission. The pinned upstream assigns owner-level babysitting and one babysitter per stack, but leaves this handoff implicit. This adaptation makes the phase boundary explicit.
- Reuse an adequate native decision journal; use the upstream TSV format and helper only as the fallback. Do not duplicate mission state.

No automatic upstream updater is included. Future upgrades require a fresh comparison against these adaptations and the protected-content tests.
