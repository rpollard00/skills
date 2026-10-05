---
name: writing
description: Apply to all prose, including every chat response. Routes technical instructions to simple-technical-english and conversational or persuasive prose to unslop. Reuse instructions already in context; read only missing or changed guidance.
---

# Writing

## Application and loading

Apply this skill whenever you produce prose, across turns and after compaction.

Use the routing rules below to select the required style. Read this skill and the selected dependency when their instructions are absent from context. Reuse instructions already present unless you have evidence that the source changed.

A new turn does not require another read. Load only the dependency needed for the current prose.

## Compaction

Preserve this skill's applicability, routing rules, and the active style's instructions in the compaction summary.

After compaction, reuse retained instructions. Read any missing guidance before writing. A note that a skill was previously loaded does not preserve its instructions.

## Styles: 

**simple-technical-english** — the reader must act or understand correctly, and a misread causes harm:

- Documentation, READMEs, API guides, architecture explanations
- Runbooks, procedures, instructions
- Error messages, factual UI copy
- Release notes, commit messages, incident reports
- Agent instructions

**unslop** — the text has a voice and persuades:

- Blog posts and essays, including about technical topics
- Marketing copy, launch posts, brand writing
- Conversation: chat replies, email prose

A technical blog post goes to unslop. It explains, but it argues and entertains; STE deletes that by design.

## Edge cases

- **User names STE, ASD-STE100, or strict mode** → simple-technical-english, even for marketing copy. Say that STE deletes persuasion and offer unslop for that part.
- **User asks for voice, personality, or fun** → unslop, even for technical topics.
- **Mixed documents** (README with a friendly intro) → one skill per document: simple-technical-english. Keep the intro, de-slop it by hand.
- **Code syntax and identifiers** are not prose. Do not edit them as writing. User-visible strings are writing even inside templates, JSX, source code, or localization files. Factual UI copy follows simple-technical-english; persuasive or brand prose follows unslop. Comments and commit messages follow simple-technical-english.
- **UI labels** quoted in documentation stay exact. Newly authored or edited labels require clarity and consistent terminology; their location in code does not exempt them.
- **Throwaway notes** (TODO comment) simple-technical-english.

## Do not blend

The skills conflict on purpose: STE bans hedging and persuasion; unslop wants opinions and rhythm. Half of both is neither.
