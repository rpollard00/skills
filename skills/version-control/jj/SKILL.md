---
name: jj
description: Work safely in Jujutsu (jj) repositories using the working-copy commit model and the normal colocated Git workflow. Use whenever a repository contains .jj, the user mentions jj/Jujutsu, or the task involves jj setup, status, history, revsets, bookmarks, rebasing, conflicts, undo, fetch, or push.
---

# Jujutsu

Use Jujutsu as Jujutsu, not as Git with different command names.

The essential model is:

> The files in the workspace are the contents of the current commit, `@`. Editing files rewrites `@`; most `jj` commands first snapshot filesystem changes into it. `@-` is its parent.

There is no normal staging-area step and no detached collection of “uncommitted changes.” A snapshot is not a request to finalize or publish the change.

## Non-negotiables

- If `.jj/` exists, use `jj` for status, diff, history mutation, recovery, fetch, and push. Do not substitute `git status`, `git add`, `git commit`, `git checkout`, `git reset`, `git rebase`, or Git's conflict workflow.
- Assume the repository uses the Git backend **and is colocated with Git**: `.jj/` and `.git/` share one working copy. This is the normal setup. If backend details matter, verify with `jj util backend name`; do not speculate about an exotic backend.
- Do not confuse **Git-backed** with **colocated**. A non-colocated repository can still use the Git backend hidden under `.jj/`, but that is the less common path and should require an explicit reason. Check with `jj git colocation status` rather than inferring from backend type alone.
- In a colocated workspace, prefer `jj` for mutations. Read-only Git tools are usually fine, but Git's index, in-progress rebase state, and conflict representation are not jj's model.
- Prefer stable **change IDs** when naming mutable work. Commit IDs change when a change is rewritten.
- Preview a nontrivial revset with `jj log -r '<same expression>'` before using it in `rebase`, `abandon`, bulk rewrite, or bookmark movement.
- Never push, move/delete a shared bookmark, abandon a range, or restore an old operation without the user's request or clear task authorization.
- Use installed help as the authority for version-sensitive syntax: `jj help <command>` or `jj <command> -h`. Do not retry remembered legacy spellings blindly.

## Bootstrap a repository

Prefer the default colocated Git repository. First confirm the installed CLI:

```bash
jj --version
```

Clone an existing remote:

```bash
jj git clone <url> [destination]
```

Add jj to an existing local Git checkout, from its root:

```bash
jj git init .
```

Create a new empty colocated Git repository:

```bash
jj git init <directory>
```

Then verify the result:

```bash
jj util backend name        # expected: git
jj git colocation status    # expected: colocated
jj status
```

If identity is not configured, ask for or use the user's intended identity, then set it explicitly:

```bash
jj config set --user user.name 'Name'
jj config set --user user.email 'name@example.com'
```

`jj git clone` and `jj git init` colocate by default. Do not add a redundant `--colocate` flag, and do not choose `--no-colocate` merely because jj supports it. Use a non-colocated Git-backed repository only when the user requests it or a concrete constraint requires it. If an existing jj repository is non-colocated and ordinary Git-tool compatibility is desired, inspect its state and use `jj git colocation enable`; verify afterward.

## Start every task by orienting

Run:

```bash
jj root
jj status
jj log -r '@ | @- | trunk()'
```

Then determine:

1. Does `@` already contain changes or a description?
2. Are those changes part of this task or pre-existing user work?
3. Which parent/base and bookmark matter?
4. Is the requested operation local rewriting, recovery, or remote exchange?

Do not erase, squash, describe, or build on unrelated existing work without first preserving its intent. If graph context is unclear, widen the log before editing.

## Normal working-copy workflow

### Make or continue one change

1. Inspect `jj status` and `jj diff`.
2. Edit files directly. Do **not** stage them.
3. Run the project's tests/checks.
4. Inspect `jj diff` and `jj status` again.
5. If asked to name the current change, use:

   ```bash
   jj describe -m 'description'
   ```

`jj describe` rewrites `@`; it does not create a new child.

### Finish this change and start the next

Use:

```bash
jj new
```

This leaves the completed change at `@-` and creates a new empty working-copy commit at `@`. The convenience command:

```bash
jj commit -m 'description'
```

is approximately “describe the current change, then create a new one.” Do not run either command merely to save files—jj has already snapshotted them.

### Add a follow-up to an earlier change

Prefer an inspectable child and squash:

```bash
jj new <change-id>
# edit and inspect
jj diff
jj squash
```

Use `jj edit <change-id>` only when directly rewriting that change is intentional; filesystem edits then amend it immediately. Descendants are normally rebased automatically after ancestor rewrites.

### Report state accurately

After work, report the current change and whether it is empty, described, bookmarked, or pushed. “Committed” is ambiguous in jj because the working copy is already a commit; say exactly what happened, such as “described `@`,” “created a new empty child,” or “moved bookmark `feature` to `@`.”

## Load references progressively

Read only the reference required by the situation:

- Before fetching, publishing, moving bookmarks, rebasing a stack, splitting/squashing, abandoning work, or recovering from a mistake, read [references/SITUATIONS.md](references/SITUATIONS.md).
- Before writing or executing a compound revset, or when change IDs, commit IDs, bookmarks, and remote bookmarks are being confused, read [references/REVSETS-AND-BOOKMARKS.md](references/REVSETS-AND-BOOKMARKS.md).
- As soon as `jj status`, `jj log`, or command output reports conflicts—or the user asks about conflict resolution or a conflict chain—read and follow [references/CONFLICTS.md](references/CONFLICTS.md).

## Recovery posture

Jujutsu records repository operations. When a mutation goes wrong, stop making speculative corrective edits and inspect:

```bash
jj operation log
jj operation show <operation-id>
```

Use `jj undo` only when the latest operation is truly the one to reverse. Use `jj operation restore <operation-id>` only after inspecting the target operation and confirming repository-wide restoration is intended. Prefer operation-log recovery over Git reset/checkout advice.

## Official documentation

These instructions follow the rolling official documentation:

- [Tutorial](https://jj-vcs.github.io/jj/latest/tutorial/)
- [Working copy](https://jj-vcs.github.io/jj/latest/working-copy/)
- [Git compatibility](https://jj-vcs.github.io/jj/latest/git-compatibility/)
- [CLI reference](https://jj-vcs.github.io/jj/latest/cli-reference/)

Because jj evolves quickly, reconcile examples with the installed version's help before consequential operations.
