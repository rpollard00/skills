# History sources

Use the stores that the current host exposes. Installed tool contracts take precedence over these notes. Layouts change between versions, so confirm a path before you rely on it. Read stores directly only when no supported search tool is available.

## Scope a repository across worktrees

A repository can have several working directories: the main checkout, Git worktrees, and orchestrator worktrees. Run `git worktree list` to get them. Most stores key conversations by working directory, so search each directory in scope.

## Known stores

- T3 Code: use the `t3_thread_search`, `t3_thread_list`, and `t3_thread_read` tools when present. They cover T3 threads for every provider and project. Filter to this project.
- Claude Code: `~/.claude/projects/<slug>/<session-id>.jsonl`. The slug is the absolute working directory with each `/` and `.` changed to `-`. Each line is one event.
- Codex: `~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-*.jsonl`. The first `session_meta` event records `cwd`. Filter on it.
- Pi: `~/.pi/agent/sessions/--<path>--/*.jsonl`. The directory name is the working directory without its leading `/`, with each other `/` changed to `-`.
- OpenCode: a SQLite store under `~/.local/share/opencode/`. Prefer its documented export or session commands. Open the database read-only.
- Other hosts: find the documented transcript or export location. If none exists, record the gap.

Do not modify a history store. Do not read stores that belong to another project or user without explicit direction.
