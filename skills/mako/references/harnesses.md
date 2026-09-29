# Harness integration notes

Use only the section relevant to the current host. The shared [execution rules](execution.md) do not depend on a particular harness or continuation framework. Installed tool contracts take precedence over these integration notes.

## Pi

An explicit Mako invocation supplies user authorization for delegation under its [activation policy](../SKILL.md#activation). Do not ask the user to repeat that authorization separately for pi-subagents. Explicit user limits and host restrictions still apply.

Discover the installed pi-subagents tools and read their current skill and guides. Use the governed workflow, native notifications, and documented evidence/output routing. Do not reproduce a version-specific tool schema here.

The inspected pi-subagents implementation does not enforce mission-wide acceptance when closing a mission. Mako requires evidence reconciliation, but does not claim runtime enforcement. Its automatic Git-worktree isolation is also not a verified jj integration.

If a Relentless run is active, keep it as the continuation owner. Delegate bounded tasks through pi-subagents only under its documented contract; do not arm a second goal driver. Neither framework is required to use Mako.

## Codex

Explicit-only skills include `agents/openai.yaml` with `policy.allow_implicit_invocation: false`. Invoke Mako explicitly with `$mako` when registered. Discover this installation's delegation and continuation capabilities rather than assume they match pi.

## OpenCode 2

OpenCode 2 uses `metadata.opencode/autoinvoke: "false"` for explicit-only skills. Its skill API still lists them for explicit selection. The inspected v2 implementation excludes them from automatic skill guidance.

Select Mako from the `@mako` skill completion, then supply the task. Alternatively, explicitly ask the agent to read Mako's absolute source path. The bundle's discovery and autoinvoke flags are tested separately from UI interaction and model compliance.

Do not substitute a skill permission denial for explicit-only metadata. A denial forbids loading; explicit-only skills remain available when deliberately selected.
