# Harness integration notes

Use only the section relevant to the current host. The shared [execution rules](execution.md) do not depend on a particular harness or continuation framework. Installed tool contracts take precedence over these integration notes.

## Pi

Apply the shared [delegation default](execution.md#discover-capabilities) through available pi-subagents. Delegation does not require explicit Mako invocation or a separate user request. Underlying action permissions, explicit user limits, and host restrictions still apply.

Discover the installed pi-subagents tools and read their current skill and guides. Use the governed workflow, native notifications, and documented evidence/output routing. Do not reproduce a version-specific tool schema here.

The inspected pi-subagents implementation does not enforce mission-wide acceptance when closing a mission. Mako requires evidence reconciliation, but does not claim runtime enforcement.

If a Relentless run is active, keep it as the continuation owner. Delegate bounded tasks through pi-subagents only under its documented contract; do not arm a second goal driver. Neither framework is required to use Mako.

## Codex

Explicit-only skills include `agents/openai.yaml` with `policy.allow_implicit_invocation: false`. Invoke Mako explicitly with `$mako` when registered. Discover this installation's delegation and continuation capabilities rather than assume they match pi.

### Codex subagent routing

`spawn_agent` gives a new agent the parent's model and reasoning effort unless the call sets `model` or `reasoning_effort`. The tool description says to omit these overrides. Without the operator routing below, every subagent runs at the parent's cost.

The operator approves this routing for delegated read-only work: investigation, transcript or corpus reading, `why` source investigators, and `swarm` coverage slices.

- Pass `model: "gpt-6-luna"` and `reasoning_effort: "max"` together.
- Do not run Luna below `max`. Its results are not reliable at lower effort.
- Luna at `max` is slow. Use it for parallel fan-out, not for one serial step that blocks the parent.
- Keep coordination, design, synthesis, acceptance, and independent review on the inherited model. Implementers also inherit unless the operator says otherwise.

Confirm `gpt-6-luna` in the tool description's model list before you use it. Enterprise policy can remove it or reject the override. If so, inherit the parent model and report the routing gap.

The Codex instructions name only the model family. A model cannot tell its exact variant. Record the requested override, or `inherited`, as the subagent's model. Do not guess a model name.

## Claude Code

Invoke Mako with `/mako`. Claude Code blocks agent invocation and subagent preloading of skills with `disable-model-invocation: true`. Mako's dependencies must be loadable by the agent.

Use the bundle installer's Claude adapter. It keeps Mako explicit-only and removes that flag from generated dependency entrypoints. Shared source metadata stays unchanged for Pi, Codex, and OpenCode. Refresh generated entrypoints through the installer after source changes. Do not edit generated copies.

Respect skill permission denials. A denied invocation is not permission to load the same instructions through the file fallback. See [Claude Code's skill controls](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill).

## OpenCode 2

OpenCode 2 uses `metadata.opencode/autoinvoke: "false"` for explicit-only skills. Its skill API still lists them for explicit selection. The inspected v2 implementation excludes them from automatic skill guidance.

Select Mako from the `@mako` skill completion, then supply the task. Alternatively, explicitly ask the agent to read Mako's absolute source path. The bundle's discovery and autoinvoke flags are tested separately from UI interaction and model compliance.

Do not substitute a skill permission denial for explicit-only metadata. A denial forbids loading; explicit-only skills remain available when deliberately selected.
