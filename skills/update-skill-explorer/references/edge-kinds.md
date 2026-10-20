# Edge kinds

An answer gives the edge kind of a pair. The edge kind is the relation that the explorer draws from the source to the target.

Compare the text with the six answers in the order of this file. Give the first answer that fits. The order matters because a sentence that forbids a skill can contain the word "run" or "use".

Each example shows a file path, then one sentence from that file.

## 1. `none`

The text does not refer to the target: the name is an ordinary word, an example, or a fixture.

```text
skills/mako/playbooks/eval.md
Genuine task, project, and skill content can contain words such as `eval`, `test`, `benchmark`, or `arena`.
```

The last name in this sentence is the name of a skill. The sentence uses that name only as an example of a word. This text gives `none`. A `none` answer removes the pair from the graph.

Before you answer `none`, search the file for the name of the target. If a different text in the file refers to the target, answer for that text.

```text
skills/mako/playbooks/eval.md
**Spawn one fresh blinded judge** per arena's judge contract, preserving configured judge routing.
```

This text is in the same file, and it applies the rules of that skill. The answer for the pair is `requires`.

A command name alone does not imply a dependency on a skill that does not exist. For example, “use Git in the assigned worktree” does not create a skill edge: this bundle has no skill named Git. An explicit instruction to load an existing skill does create an edge, with `--conditional` when its activation has a condition.

## 2. `boundary`

The text tells the reader not to use the target, or says that the target is not part of this work. Because of this text, the source does not use the target.

```text
skills/mako/playbooks/feature.md
Do not force an interactive `refine-ui` session or expand the user's scope and authority.
```

If the text permits the target in a stated case, the answer is not `boundary`. Give the answer for that use. Add `--conditional`.

```text
skills/mako/playbooks/opening-a-pr.md
Run [Babysit](babysit.md) only when requested or explicitly included in the owner's lifecycle brief.
```

The answer for this sentence is `runs` with `--conditional`.

## 3. `handoff`

The source stops at this point, and the work continues in the target. A sentence that routes one type of work to the target is also a `handoff`.

The test is the work of the source. If the source continues its own work after the target, the answer is `runs`. If the source stops its own work, the answer is `handoff`.

```text
skills/mako/playbooks/refactoring.md
Large or cross-cutting structural work belongs to the `figure-it-out` skill.
```

## 4. `runs`

The source invokes the workflow of the target as a step, then continues with the result.

```text
skills/architect/SKILL.md
Run the `arena` skill with the design-sketch task and the Phase A grounding artifacts.
```

If the source gets to the target only through a different skill, the answer is not `runs`. The answer is `see-also`.

```text
skills/figure-it-out/SKILL.md
For one-way-door design decisions, run the `architect` skill (it runs `arena`).
```

The answer for the target in the parentheses is `see-also`.

## 5. `requires`

The source tells the reader to read, load, or adopt the target before the work.

```text
skills/refine-ui/SKILL.md
Read `ui-design` before observation, planning, or UI implementation.
```

The target of `requires` gives rules or vocabulary that the source obeys. The target of `runs` does a job and returns a result. The description of the target in the ticket shows which of the two fits.

These rules settle the cases that are not clear:

- If the verb in the text and the description of the target disagree, obey the verb in the text.
- A principle gives rules. If the text applies a principle, the answer is `requires`.
- If the source uses only a part of the target, answer for that part. Rules from the target give `requires`. A step from the target gives `runs`.

## 6. `see-also`

The text names the target as a companion or a contrast, and the source does not use it.

```text
skills/why/SKILL.md
Companion to the `how` skill.
```

This answer also fits these two cases:

- The source uses only an output of the target, for example a file that the target wrote.
- The source gets to the target only through a different skill.

## `--conditional`

When the source uses the target only in a stated case, add `--conditional`. The explorer permits the flag only with `runs`, `requires`, and `handoff`.

Words such as "if", "when", "unless", and "only when" state a case. A phrase such as "For UI work," before the instruction also states a case. A heading or a lead-in sentence can state the case for the text that it introduces.

```text
skills/bug-fix/SKILL.md
If the fix crosses a function boundary, apply `architect`.
```

The answer for this sentence is `runs` with `--conditional`.

Do not add the flag in these cases:

- The source always uses the target.
- The word "for" after the instruction gives a purpose, not a case.
- A word such as "once" or "before" gives a time in the usual sequence of the work, not a case.
- The answer is `handoff`, and the text only names the type of work that goes to the target. Add the flag to a `handoff` only for a word such as "if" or "when".

```text
skills/bug-fix/SKILL.md
Use `how` for the affected subsystem and `why` for regression history.
```

The word "for" gives a purpose in this sentence. The answer for each of the two targets is `runs` without the flag.

## More than one quoted text

A ticket is for one pair. The report can quote more than one text for that pair. Give one answer for the pair:

1. Find the answer for each quoted text.
2. If each text is `none`, answer `none`.
3. If the texts give different answers, ignore the texts that are `none`.
4. Use the first answer in this list that a text gives: `runs`, `requires`, `handoff`, `see-also`, `boundary`.
5. If each text that gives this answer states a case, add `--conditional`. If not, do not add the flag.
