# Common Jujutsu situations

Load this reference for operations beyond direct editing of the working-copy commit. Inspect `jj status` and a relevant `jj log` before and after each recipe.

## Update from a Git remote

```bash
jj git fetch
jj log -r 'trunk() | @ | @-'
```

Fetching updates remote bookmarks; it does not imply that local mutable work should be rewritten. If the task is to place the current stack on the latest trunk, preview the selected work and check installed rebase help:

```bash
jj log -r 'trunk()..@'
jj rebase -o trunk()
```

`--onto` (`-o`) is current syntax; older material may use `--destination`/`-d`. For a nontrivial graph, select the source explicitly rather than assuming the default:

- `jj rebase -s <root> -o <destination>` moves the selected revision and its descendant subtree.
- `jj rebase -r <revision> -o <destination>` moves selected revisions while rebasing their descendants around the move.
- `jj rebase -b <revision> -o <destination>` selects a whole branch relative to the destination's ancestors.

These selectors differ materially. Run `jj help rebase`, preview the exact revset, and choose based on the intended graph transformation.

## Publish work

Bookmarks are publication pointers, not an automatically advancing “current branch.” Creating a child with `jj new` does not generally move a bookmark.

Inspect first:

```bash
jj bookmark list
jj log -r '@ | @- | bookmarks() | remote_bookmarks()'
```

Then deliberately create or move the intended bookmark and push it:

```bash
jj bookmark set <name> -r <revision>
jj git push --bookmark <name>
```

Before moving an existing shared bookmark, inspect its old and new targets. Never assume the working-copy commit should be published: after `jj new`, the finished described change is often `@-`, while `@` is an empty child.

Use `jj git push --change <revision>` only when its automatic bookmark behavior is specifically wanted and confirmed by `jj help git push` for the installed version.

## Amend or fold a follow-up

To keep the adjustment inspectable before incorporating it:

```bash
jj new <target>
# make adjustment
jj diff
jj squash
```

`jj squash` defaults to moving changes from `@` into `@-`. Use explicit `--from`/`--into` arguments for any other topology, after checking help. Use `jj squash -i` to choose hunks.

If the current change mixes multiple concerns, use `jj split` (interactive by default in common workflows) after reading `jj help split`. Verify both resulting changes and their descriptions.

`jj absorb` can distribute a fix into mutable ancestors based on line history. It is powerful and less explicit than an interactive squash; preview the operation's scope and inspect the result with `jj operation show -p`.

## Change the graph

Before any rewrite, show the selected revisions with the same revset you plan to mutate. Afterward, inspect both the graph and diff/content consequences; auto-rebased descendants can acquire conflicts.

Common intents:

- Start parallel work from a base: `jj new <base>`.
- Create a merge commit: `jj new <left> <right>`.
- Move a subtree: `jj rebase -s <root> -o <new-parent>`.
- Remove a revision and rebase descendants onto its parents: `jj abandon <revision>`.
- Duplicate work elsewhere instead of moving it: `jj duplicate <revision> -o <new-parent>`.

Do not use `abandon` as a synonym for deleting a bookmark. A bookmark is a pointer; the revisions it names are separate objects.

## Recover from a bad operation

First identify what actually happened:

```bash
jj operation log
jj operation show <operation-id>
```

Then choose the narrowest accurate recovery:

- Latest unwanted operation: `jj undo`.
- Undo was itself unwanted: `jj redo` when supported and applicable.
- Restore repository state to a chosen operation: `jj operation restore <operation-id>`.
- Inspect old state without changing current state: `jj --at-operation=<operation-id> status` or `log`.
- Trace versions of one change: `jj evolog -r <change-id>`.

Operation restoration affects repository state, including commits and refs/bookmarks. It is not merely a file checkout. Confirm before using it, especially if background tools or other workspaces may have recorded later operations.

## Colocated Git interaction

Colocation is the default recommendation, not an edge case: normal repositories should expose both `.jj/` and `.git/` over the same working copy so Git-dependent editors, build tools, and hosting workflows continue to work. Non-colocated Git-backed repositories are the less common exception and should have a concrete reason.

Bootstrap with `jj git clone`, `jj git init .` in an existing Git checkout, or `jj git init <directory>` for a new repository. These commands colocate by default; do not add a redundant `--colocate` flag. Convert an existing non-colocated repository with `jj git colocation enable` after inspecting its state.

Check with:

```bash
jj util backend name
jj git colocation status
```

In a colocated workspace, jj imports/exports relevant Git state around jj commands. Prefer one mutating interface at a time:

- use `jj` for commits, rebases, bookmarks, fetch, push, and recovery;
- use Git read-only when an external tool requires it;
- after an unavoidable external Git mutation, run `jj status` and inspect the resulting import operation;
- do not manipulate Git's index or resume a Git rebase/merge as if jj understood those states.

A non-colocated repository can still use the Git backend. Absence of a top-level `.git/` does not imply a native/non-Git backend—but for ordinary work, treat it as a reason to check whether colocation should be enabled, not as the preferred setup.

## Stale workspace

If jj reports that the working copy is stale, do not manually force files into place. Inspect other workspaces and use:

```bash
jj workspace list
jj workspace update-stale
```

Then review the resulting working-copy commit. A recovery commit may be created when the operation that last updated the workspace is no longer available.

## Sources

- [CLI reference](https://jj-vcs.github.io/jj/latest/cli-reference/)
- [Git compatibility](https://jj-vcs.github.io/jj/latest/git-compatibility/)
- [Operation log](https://jj-vcs.github.io/jj/latest/operation-log/)
- [Working copy](https://jj-vcs.github.io/jj/latest/working-copy/)
