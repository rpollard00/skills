### Pause safely

**You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause.

1. Read [execution](../references/execution.md). Stop at a safe boundary and request that every child stop writing. Verify termination or a safe checkpoint before transferring ownership; a stop receipt alone is insufficient.
2. Take no irreversible action to pause. An existing PR does not grant fresh publication authority; push only when already authorized and necessary.
3. Make the work durable through the repository's version-control model. In jj, inspect and snapshot the working-copy change without creating unnecessary commits. For a Git checkpoint, use a scoped Conventional Commit such as `chore: checkpoint task`, preserving unrelated user edits. Record broken or unverified state explicitly.
4. Write the resume note off-context. Capture intent, what you were doing, progress and what's verified, current state, next steps, key files, and gotchas. For the compaction trigger write it to a file like `/tmp/<slug>-resume.md`. If a show-me-your-work trail exists, point at it instead of duplicating it.

**Reply:** where you are in the loop, what's on disk versus still in your head (paths, no diff dumps), the commits you made and whether the tree is clean, and the first action on resume. This is a pause, not a final report.
