---
name: writing
description: ALWAYS invoke this writing skill. Must always apply.
---

# Writing

ALWAYS Load both `simple-technical-english` and `unslop`, and understand these guidelines on where to apply both styles.  

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
