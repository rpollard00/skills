# Opening a PR

Use this delivery step only when the task, repository, remote, and workflow warrant a PR. Investigation and local-only work do not require one.

## Prepare the change

Read [execution](../references/execution.md). Use [jj](../../../version-control/jj/SKILL.md) when `.jj` exists. Preserve user work and inspect the actual base. Do not reset or recreate a dirty checkout as a shortcut.

Keep logical changes small and ordered. Amend or split only within the task's authority. Preserve a separate failing-check change before a bug fix; that failing change need not merge independently.

Run [deslop](../../deslop/SKILL.md) before commits and [no-comments](../../no-comments/SKILL.md) before review. Review the final diff and run the relevant checks on the revision that will be published.

## Write the briefing

Apply the existing [writing](../../../writing/writing/SKILL.md) router. Use Conventional Commits: `type(scope): subject`, or `type: subject` when no scope is useful. Types include `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, and `perf`. Keep the subject short and imperative, without a trailing period.

The description explains intent, boundaries, tradeoffs, and proof. It is not a file-by-file narration or a lab notebook. Use these sections when they have something to say:

- `## Why`: intent and approach.
- `## Scope`: relevant symbols, paths, and meaningful exclusions.
- `## Tradeoffs`: rejected alternatives a reviewer would otherwise ask about.
- `## Blast Radius`: affected consumers and evidence-backed risks.
- `## Verification`: real commands or run paths, outcomes, and proof links.

For performance changes, include one primary before/after number with units. Link detailed methods and artifacts. Attach screenshots or recordings when they prove behavior. Keep negative results and unavailable checks visible. A commit body does not repeat its subject.

## Publish deliberately

Resolve the forge from repository conventions and available tools. Use one consistent forge for create, edit, view, watch, and merge. Do not require a specific vendor stack tool.

Follow the repository's draft/readiness policy. Verify actual PR state after creation. Publication does not authorize merging.

For a stack, the root targets trunk and each child targets its intended parent's branch/bookmark and exact revision. Keep one topology owner. Use repository-aware publication and verify the base chain afterward.

## Hand off

Post the URL, revision, verification, and remaining gates. Opening a PR does not automatically start babysitting. Run [Babysit](babysit.md) only when requested or explicitly included in the owner's lifecycle brief.

Autopilot owners report code-ready before the independent round, then merge-ready or STACK-READY after their assigned checks and babysit loop. Their merge authority still comes from the applicable playbook and user grant.
