# Resolving Jujutsu conflicts and conflict chains

Jujutsu conflicts are first-class commit data. A rebase or merge can finish successfully while producing conflicted commits, and descendants can continue to be rebased. There is no `--continue` gate and no `git add` step.

## Core rule

> Resolve the earliest causal conflict first, rewrite that commit with the resolution, and let jj rebase descendants. Then reassess what conflicts remain.

Do not independently resolve every conflicted descendant up front. Many downstream conflicts only propagate an unresolved ancestor and disappear after the earliest conflict is fixed.

## Diagnose before editing

Run:

```bash
jj status
jj log -r 'conflicts()'
jj resolve --list
```

Then inspect graph relationships and each relevant change:

```bash
jj log -r '::conflicts() | conflicts()::'
jj show <change-id>
```

Adapt the log revset if the repository is large. Identify:

1. the oldest conflict on the affected ancestry path;
2. which operation introduced it (`jj operation log` / `jj operation show`);
3. whether later conflicted commits introduce real additional overlap or merely inherit the earlier conflict;
4. whether multiple independent conflict roots exist on separate branches.

A rebase that reports conflicts still completed. Do not search for or invent `jj rebase --continue`.

## Preferred resolution workflow

The most inspectable workflow creates a temporary child on the earliest conflicted commit:

```bash
jj new <earliest-conflicted-change>
jj resolve --list
# Edit conflict markers directly, or:
jj resolve [paths...]
jj diff
jj squash
```

Why this works:

- the new working-copy child materializes the parent's conflicts;
- edits in the child represent only the resolution, so `jj diff` can review it;
- `jj squash` moves the resolution into the conflicted parent;
- jj then automatically rebases descendants onto the rewritten parent;
- propagated descendant conflicts may resolve automatically.

After squashing, run:

```bash
jj log -r 'conflicts()'
jj status
```

Repeat from the next earliest genuine conflict.

## Direct-edit alternative

```bash
jj edit <earliest-conflicted-change>
# resolve files
jj status
```

This rewrites the conflicted change directly and also triggers descendant rebasing. It is valid, but the resolution is harder to review separately because filesystem edits amend the target commit immediately. Prefer child-plus-squash when auditability matters.

## Editing markers manually

When a conflicted revision is materialized in the working copy, jj writes conflict markers. Resolve by replacing the entire conflicted region with the desired final content. Partial resolution is allowed; jj parses remaining valid markers back into conflict state on the next snapshot.

Jujutsu's default marker format may contain snapshot sections (`+++++++`) and diffs (`%%%%%%%` / `\\\\\\\`) rather than Git's `<<<<<<<` / `=======` / `>>>>>>>` three-way layout. Read the labels and apply each displayed diff to the snapshot; do not assume the first or last side is automatically correct.

Use `jj resolve` for conflicts supported by a configured external merge tool. Check `jj resolve --list` afterward; a clean-looking file is not enough evidence if marker syntax was damaged.

## Multiple conflict roots

If `jj log -r 'conflicts()'` shows independent branches, resolve each branch's earliest conflict separately. Do not force an arbitrary total order across unrelated roots. After each resolution, refresh the conflict log because graph rewriting can change the remaining set.

## When descendants stay conflicted

After resolving and squashing the earliest conflict:

1. Refresh `jj log -r 'conflicts()'`.
2. Inspect the next earliest remaining conflicted change with `jj show` and `jj diff -r <change>`.
3. Resolve it if it represents a genuine later semantic overlap.
4. If the expected descendants were not rebased, inspect the graph and `jj help rebase`; only then explicitly rebase the intended subtree.

Do not blindly rebase `conflicts()` as a set. A set can contain several roots and descendants, and rebase selector semantics (`--source`, `--revision`, `--branch`) matter.

## Choosing one side or restoring content

If the intended resolution is exactly the content from another revision, use `jj restore --from <revision> <paths>` in the working-copy resolution commit, then inspect `jj diff`. This is safer than copying files through Git commands and preserves jj's conflict model.

For non-file conflicts or unusual file/directory/symlink conflicts, inspect `jj help restore` and official docs. External merge tools mainly handle ordinary file conflicts; do not guess at unsupported structural resolution.

## Back out or recover instead

If the conflict-producing graph operation was wrong—not merely difficult to resolve—prefer operation recovery:

```bash
jj operation log
jj operation show <operation-id>
jj undo
```

Use `jj undo` only if that operation is still the latest intended target. Otherwise inspect and, with confirmation, use `jj operation restore <operation-id>`. Do not use Git reset to repair jj graph state.

## Verify completion

A conflict-resolution task is complete only when:

- `jj log -r 'conflicts()'` shows no relevant conflicted commits;
- `jj resolve --list` reports no conflicts in the current working copy;
- `jj status` matches the intended current change;
- tests or checks covering the merged behavior pass;
- the final graph and diffs preserve both sides' intended semantics, not merely valid syntax.

## Sources

- [First-class conflicts](https://jj-vcs.github.io/jj/latest/conflicts/)
- [Working-copy conflict behavior](https://jj-vcs.github.io/jj/latest/working-copy/#conflicts)
- [Tutorial conflict walkthrough](https://jj-vcs.github.io/jj/latest/tutorial/#conflicts)
- [CLI reference: resolve](https://jj-vcs.github.io/jj/latest/cli-reference/#jj-resolve)
