# Revsets, identities, and bookmarks

Use this reference when selecting revisions or crossing a sharing boundary.

## Identities

A log entry commonly shows both:

- **Change ID**: stable identity for an evolving change; prefer this in commands and conversation about mutable work.
- **Commit ID**: content/history hash for one version of that change; it changes when the change is described, edited, rebased, or otherwise rewritten.

`jj evolog -r <change-id>` traces older commit versions belonging to a change.

## High-value revsets

| Expression | Meaning |
|---|---|
| `@` | current working-copy commit |
| `@-` | parent of the working-copy commit |
| `x+` | children of `x` |
| `::x` | ancestors of `x`, including `x` |
| `x::` | descendants of `x`, including `x` |
| `x::y` | DAG range from `x` through `y` |
| `x..y` | ancestors of `y` excluding ancestors of `x` |
| `x \| y` | union |
| `x & y` | intersection |
| `x ~ y` | difference |
| `trunk()` | configured primary remote-tracking trunk |
| `bookmarks()` | local bookmark targets |
| `remote_bookmarks()` | remote bookmark targets |
| `conflicts()` | commits containing conflicted files |
| `mutable()` | revisions jj considers mutable |

Quote compound revsets in the shell:

```bash
jj log -r 'trunk()..@'
jj log -r 'roots(trunk()..@)'
jj log -r 'conflicts() & ::@'
```

Before mutation, validate the exact expression with `jj log -r '<expression>'`. Do not “simplify” a graph selector from memory: `-r`, `-s`, and `-b` on `jj rebase` encode different graph behavior.

## Bookmarks are pointers

A local bookmark such as `feature` points to a commit. A remote bookmark such as `feature@origin` records a remote's last fetched position. Tracking relates the remote bookmark to the corresponding local bookmark.

Unlike Git's checked-out branch model:

- there is no single current bookmark that automatically follows every new commit;
- `jj new` usually leaves bookmarks where they were;
- moving a bookmark does not itself rewrite or delete commits;
- deleting or forgetting a bookmark and abandoning commits are different actions.

Inspect all relevant pointers before changing one:

```bash
jj bookmark list --all-remotes
jj log -r 'bookmarks() | remote_bookmarks() | @ | @-'
```

Common actions:

```bash
jj bookmark set <name> -r <revision>       # create or update deliberately
jj bookmark move <name> --to <revision>    # move an existing bookmark
jj bookmark track <name>@<remote>          # begin tracking a remote bookmark
jj git push --bookmark <name>              # publish the selected bookmark
```

Use `jj help bookmark <subcommand>` and `jj help git push` before consequential shared-pointer changes; this command family has evolved across jj releases.

## Remote update pattern

A normal Git-backed update is:

```bash
jj git fetch
jj log -r 'trunk() | @ | @-'
```

Fetching and rebasing are separate decisions. Do not automatically rebase all mutable work just because a remote moved. If rebasing is requested, identify the intended stack root and destination, preview them, and follow `SITUATIONS.md`.

## Sources

- [Revsets](https://jj-vcs.github.io/jj/latest/revsets/)
- [Bookmarks](https://jj-vcs.github.io/jj/latest/bookmarks/)
- [Tutorial](https://jj-vcs.github.io/jj/latest/tutorial/)
