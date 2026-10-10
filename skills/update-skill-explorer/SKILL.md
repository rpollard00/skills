---
name: update-skill-explorer
description: "Refresh the skill explorer index after skills in this collection are added, removed, renamed, or edited. It rescans, answers each open ticket, prunes orphans, and proves the result with the check command. It applies only in a checkout of this skills repository. Use for /update-skill-explorer or \"update the skill explorer\"."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Update the skill explorer

The skill explorer is the tool in `explorer/`. It keeps an index of this collection in two files:

- `explorer/index/scan.json` holds the skills, files, and relations that the scan finds.
- `explorer/index/judgments.json` holds one answer for each relation that the scan cannot classify.

The index is behind after skills are added, removed, renamed, or edited. This skill makes the index complete and current again, and proves that state.

## Limits

- Work only in the skills repository that contains the explorer. The procedure in "Find the explorer" gives the test.
- Change the index only with `npm run index` and `npm run judge`. These commands write only the two index files.
- Do not edit the two index files by hand.
- Write nothing under `skills/`.
- Do not change the text of a skill to close a ticket. If the text of a skill is the problem, tell the user the file and line.
- Do not commit, push, or run the skill installer (`scripts/link-skills.sh`) without a request from the user.

## Find the explorer

Do not use a path relative to this file to find `explorer/`. An installed skill can be a generated copy outside the repository. Find the repository root from the working directory:

```bash
jj root || git rev-parse --show-toplevel
```

If the two commands fail, stop. Tell the user that the working directory is not in a repository.

Make sure that this root passes these three tests:

- The root contains the `skills/` folder.
- The root contains the file `explorer/package.json`.
- That file gives the package name `skill-explorer`.

If a test fails, stop. Do not run an `npm` command. Tell the user which test failed, and that this skill applies only in the skills repository that contains the explorer.

Run each `npm` command in this skill from the `explorer/` folder of this root.

## Update loop

1. **Find the root.** Do the procedure in "Find the explorer".
2. **Install dependencies.** If `explorer/node_modules` is absent, run `npm ci`. If it is present, do not install.
3. **Scan.** Run `npm run index`. This command prints the report. If the scan changed, the command also writes `scan.json`.
4. **Answer the tickets.** Do the procedure in "Answer a ticket" for each open ticket in the report.
5. **Prune orphans.** If the report lists orphans, run `npm run index -- --prune`. If the new report shows open tickets, do step 4 again.
6. **Prove the result.** Run `npm run check`. Then apply the gate in "Completion".
7. **Tell the user.** Give the user the items in "Tell the user".

## The report

`npm run index` prints the nodes that changed after the last scan, each open ticket, and the orphans. A line that starts with `wrote` or `unchanged` shows the state of `scan.json`. The number of relations changes while you answer tickets.

A ticket is one question about one pair of nodes: what is the relation of the source to the target? The source holds the text. The target is the node that the text names. Each open ticket shows these items:

- Ticket id
- Reason
- Pair, written as `<source> > <target>`
- Status
- Description of the target, after `to:`
- File, line, and heading path of each text
- Each quoted text
- Exact command that answers the ticket.

The quoted text is the whole paragraph or list item. The printed line is the line of the name in that text.

The reason is one of two values:

- `kind`: The text contains the name of the target.
- `refers`: The scan is not sure that the text names the target. If it does not, the answer is `none`.

The status is one of three values:

- `new`: The pair has no answer.
- `changed`: The text changed after an earlier answer. The report prints that answer after `was:`. The new text decides the new answer. The ticket has a new id.
- `invalid`: An earlier answer used `--conditional` with an answer that does not permit it. The report prints that answer after `was:`.

The report does not ask about each mention. The scan classifies some pairs without an answer, for example a route of the router or a reference to a principle.

An orphan is a judgment that no longer applies to a pair. A deleted skill leaves orphans. A renamed skill leaves orphans for its old name, and its references return as new tickets. A pair that the scan now classifies without an answer also leaves an orphan.

## Answer a ticket

1. Read each quoted text.
2. Read the description of the target.
3. If the quoted text does not decide the answer, open the file at the printed line. Read the text around that line and the heading that introduces it.
4. Select one answer with the rules in [edge kinds](references/edge-kinds.md).
5. Examine the text for a stated case that limits the use of the target. The same file gives the rule.
6. Run the printed command with the answer. If the source uses the target only in a stated case, add `--conditional`.

```bash
npm run judge -- <ticket> <answer> [--conditional]
```

The answers are `none`, `boundary`, `handoff`, `runs`, `requires`, and `see-also`. The explorer permits `--conditional` only with `runs`, `requires`, and `handoff`.

Obey these rules for each ticket:

- Read each quoted text. Do not give one answer to a group of tickets that you did not read.
- Do not run two `judge` commands at the same time. Each command writes `judgments.json` again. A sequence of `judge` commands is permitted.
- Each `judge` command prints its result and the next open ticket. Use the report from step 3 to keep your place.
- If the explorer rejects a ticket id, the text changed after the report. Run `npm run index` again, then read the new report.
- Do not use a ticket id or an answer that you remember from an earlier run.
- If the text is unclear, give the answer that fits best. Then tell the user the file and line.

## Correct an answer

Correct an answer only in these two cases:

- The user tells you that an answer is wrong.
- You find that an answer from this run is wrong.

1. Run `npm run index -- --judged`. This command prints each answered pair with its ticket id and its answer.
2. Find the pair. Read each quoted text again.
3. Run the `judge` command with that ticket id and the new answer. The new answer replaces the old answer.

## Completion

The completion gate is one result: `npm run check` exits with code 0 and prints the `check ok` line. No other evidence is completion. A plan to run the command is not completion. A count of answers is not completion.

If the command prints `check failed`, read each cause that it prints. Do steps 3 to 5 again. Then run `npm run check` again.

If you cannot get the `check ok` line, tell the user that the update is not complete. Give the last output of `npm run check`.

## Tell the user

Give the user these items:

- The `check ok` line, copied exactly
- The number of tickets that you answered
- The index files that changed. If the report shows `wrote`, `scan.json` changed. If you ran a `judge` command or pruned orphans, `judgments.json` changed.
- Each text problem that made an answer unclear, with its file and line.

Then offer to show the result. `npm start` builds the client and serves the explorer at `http://127.0.0.1:4747`. The command does not return while the explorer is in operation. If the user accepts, run `npm start` as a background process.
