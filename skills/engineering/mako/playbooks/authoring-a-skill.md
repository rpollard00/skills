# Authoring or modifying a skill

Own the skill's instructions and evidence. Read [execution](../references/execution.md) and apply the existing [writing](../../../writing/writing/SKILL.md) router. No vendor-specific authoring skill is required.

1. State the skill's purpose, invocation policy, authority boundaries, inputs, outputs, dependencies, and approval gates.
2. Inspect the source skill and referenced artifacts before changing them. Preserve selected upstream substance, provenance, and license notices.
3. Keep `SKILL.md` focused on decisions and workflow. Put conditional detail in references. Link dependencies by file path instead of restating them.
4. Validate metadata, unique names, matching directory names, referenced files, and cross-skill links. Verify the installed layout, not only source paths.
5. Exercise representative tasks, including a negative routing case and relevant approval gates. Grade tool reads and artifacts, not self-reported compliance. Use [Eval](eval.md) when comparing variants.
6. Distinguish static validation, loader checks, and behavioral evidence. A prose preference needs judgment; a structural requirement needs a check.
7. Deliver through the repository's process. Use [Opening a PR](opening-a-pr.md) when warranted. Do not replace installed shared skills or merge repairs without separate authority.

Keep only instructions that change a decision. Apply [encode lessons in structure](../../../engineering-principles/principle-encode-lessons-in-structure/SKILL.md) where an actual mechanism can enforce a rule. Do not remove guidance before that enforcement exists.

Report the skill, design choices, validation performed, and remaining gaps.
