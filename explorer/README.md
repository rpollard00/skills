# Skill explorer

The skill explorer reads `../skills`, finds the relations between skills, and serves them to a local browser client. It keeps a committed index in `index/`.

## Start

Run all commands in `explorer/`. Node.js 24 or later is necessary.

1. For the first start, run `npm ci`.
2. Run `npm start`.
3. Open `http://127.0.0.1:4747`.

`npm start` is the one command for use of the explorer. It builds the client and serves the API and the client.

For work on the client, use two terminals:

1. In the first terminal, run `npm run serve`. It serves the API on port 4747.
2. In the second terminal, run `npm run dev`, and open `http://127.0.0.1:4748`. The page then changes when you save a file.

`npm run dev` serves the client only. It sends each API request to port 4747, and it starts no other process. When it starts, it makes one request and prints one line: either that it uses the explorer API on that port, or that no explorer API answers there, with the command that starts one. If no API answers, the page says so and gives the two commands. Start the API, then select **Retry**.

Two variables change the ports:

| Variable | Default | Port of |
| --- | --- | --- |
| `EXPLORER_PORT` | 4747 | The server of `npm start` and `npm run serve`: the API and the built client. `npm run dev` sends each API request to this port. |
| `EXPLORER_DEV_PORT` | 4748 | The dev server of `npm run dev`. |

For example, `EXPLORER_PORT=4800 npm start` serves the explorer at `http://127.0.0.1:4800`. Two explorers can thus run on one machine. For work on the client of the second one, give the same `EXPLORER_PORT` to `npm run serve` and to `npm run dev`.

## Commands

The tool finds the repository from its own location, not from the working directory.

| Command | Result |
| --- | --- |
| `npm ci` | Installs the pinned dependencies. |
| `npm start` | Builds the client, then serves the API and the client at `http://127.0.0.1:4747`. |
| `npm run dev` | Serves the client from the source files at `http://127.0.0.1:4748`. It needs the API of `npm run serve` on port 4747, and it does not start it. |
| `npm run serve` | Serves the API and the last build of the client at `http://127.0.0.1:4747`. It builds nothing. |
| `npm run build` | Builds the client into `dist/`. |
| `npm run index` | Scans `../skills`, writes `index/scan.json`, and prints the open tickets. |
| `npm run index -- --prune` | Does the same, and removes each judgment that answers no question. |
| `npm run index -- --judged` | Does the same as `npm run index`, and also lists each answered ticket. |
| `npm run judge -- <ticket> <answer> [--conditional]` | Records one answer in `index/judgments.json`, or replaces an answer. |
| `npm run check` | Exits 0 only when the index is complete and current. |
| `npm run typecheck` | Runs `tsc --noEmit`. |
| `npm test` | Runs the tests. See [Tests](#tests). |

## The client

The client reads the live index when the page loads, and again each time the window gets the focus. It makes no request to a different host. The fonts are in the bundle.

### The map

The map has four columns. From left to right they show the distance from a request: the router, its playbooks, the skills, and the principles.

- The order of the playbooks is the order of the routes in the router. The order of the principles is the order of the principle index of the router. The skills are in name order.
- A seat on the rest map comes from the column and the rank only. A query, the reader, and a change of relations move no node. A new skill moves the nodes below it in its column by one row. A selection moves nodes into a focus arrangement, and the end of the selection puts each node back on its seat.
- A name that is longer than its column is cut in the middle. The strip and the reader show the full name.

| Mark | Meaning |
| --- | --- |
| Double ring, green | The router. |
| Rounded square | A playbook. |
| Ring, disc | A skill that only a person or a skill can name, and a skill that the model can invoke. |
| Diamond, filled diamond | A principle that only a person or a skill can name, and a principle that the model can invoke. |
| Small dot after a name | A hosted file of that skill. |
| `+3` after the dots | The skill has three more hosted files, and the row has no room for their dots. The reader lists each file. |
| Solid triangle, open triangle before a node | The router routes to the node, or the router triggers it. |
| Short line before a node | The router names the node, and the reference is not a route or a trigger. |
| Pink bar, pink prompt | The skill has a bundled script, or a shell fence of the skill runs a command. Pink has no other use. |
| Small triangle at the top right of a node | The node changed after the last `npm run index`. |
| Line through the node | The scan found a defect in the skill. The reader gives the defect. |

At rest, the map shows each relation as a thin line. A track is brighter where relations share it. The relations of the router show as one rail and as the triangles. The rail has the green of the router. It is brightest at the router and goes dim along the playbooks. A link to a hosted file shows only when the pointer or the selection is on one of its ends.

Move the pointer to a node of the rest map. The map shows the relations of that node in place: green for what the node needs, orange for what needs it. The lines out of the node leave on one trunk. For the router, that trunk is the rail. No node moves.

### Lines

Each line is solid. No line has a dash pattern.

| Mark | Meaning |
| --- | --- |
| Green line | From the selection to a node that it needs. |
| Orange line | From a node that needs the selection. |
| Strong line | The source acts through the target: `route`, `trigger`, `runs`, `requires`, `handoff`. |
| Light line | The source only refers to the target: `applies-principle`, `reads`, `artifact-path`, `see-also`, `boundary`, `mentions`. |
| Small hollow ring on a line | The relation has a condition. |
| Arrow at the end of a line | The target. The lines that come to one side of a node share one arrow. |
| Bar at the end of a line | A `boundary` relation: the source limits or forbids the use of the target. |
| Orange arrow at the start of a green line | The target also needs the selection. The arrow is closed, as a triangle with no fill, when that relation back has a condition. |
| Word on a line | The kind of the relation, in a focus arrangement: `runs`, `requires`, `handoff`, `route`, `trigger`, `applies`, `reads`, `see also`, `boundary`, `mentions`. The word `if` follows for a relation with a condition. `mentions` is a pair with an open ticket. |
| Word beside a name or under a name | The same word, for a lit line of a locked view that has no room for it. It has the color of its line. |

### A selection

Click a node, or press Enter on it, to select it. The nodes then move into a focus arrangement:

- The selected node goes to the middle.
- Each node that needs it goes to a zone on its left. An orange line goes from each of these nodes to one trunk, and the trunk goes into the selected node.
- Each node that it needs goes to a zone on its right. A green line leaves the selected node on one trunk and branches to each of these nodes.
- Thus each line goes from left to right, and each row reads as a sentence: the source, the word on the line, the target.
- A node that needs the selected node and that the selected node needs is on the right. An orange arrow at the start of its line shows the relation back. The arrow is a closed triangle with no fill when the relation back has a condition.
- A zone has one group for each kind of node, in the order of the rest map: router, playbooks, skills, principles, files. A group is in the order of the rest map. A relation between two neighbours changes no position.
- A hosted file that the selected node reads has a row of its own, with the name of its host. The hosted files of the selected node stay on its row as dots.
- A zone with more than 30 rows splits into columns by group. The arrangement of the router is thus near to the rest map.
- Each other node goes out of view.

The arrangement comes from the index and the selection only. The same selection always gives the same arrangement. The reader opens the entry file of the node, and the keyboard focus moves into the reader. The camera fits the arrangement into the area beside the reader.

Click a neighbour to select it. To go back to the rest map, press Escape two times, or click the empty area of the map. Each node then goes back to its seat.

Move the pointer to a lit line or to a lit node, or move the keyboard focus to a lit node. The strip below the map shows the sentence that states the relation. After the sentence it shows the file, the line, and each heading above the block. If an answer can change the relation, the strip also shows the command that changes it. If the strip has too little room, it cuts the list of answers first, then the headings, then the sentence. To open the file at that line, click the line on the map, select the file name in the strip, or press `E`. The selection stays.

### The lock

**Lock**, or the `L` key, holds each node where it is. While the lock is on, a click changes what is lit and moves no node.

- On the rest map, the lock gives a way to look at relations in place. Click a node: green lines go to each node that it needs, and orange lines come from each node that needs it. The lines of each side share one trunk where the columns permit it.
- In a focus arrangement, the lock holds that arrangement. Click a node in it: the node opens in the reader, and its relations to the other nodes of the arrangement light where the nodes are. The node does not go to the middle. The lines of the arrangement stay as quiet gray lines, so you can see how the view is arranged.
- A line in place can go from right to left, because the lock keeps the positions and not the direction.
- A lit line says what it is where a word has a place. The word of a line in place is on the line, next to the other node, on the level part that ends at that node. If that part has no room, the word is beside the name of the other node, in the color of the line. For a relation with a condition, the word ends with `if` in the one place and in the other. A relation has its word in one place only.
- A word is only where it cannot be the word of a different relation:
  - It stands on its own line, on a part that no other lit line uses, or beside its own name, where no line is.
  - It is inside what the camera fits, so it is not under the reader.
  - It touches no name, no glyph, no dot, no tool mark, no count, no caption, no arrowhead, no ring of a different relation, and no other word. It is not on a line that goes up or down.
  - A word that has no such place is not shown. A wrong word is worse than no word. Move the pointer to the line or to the node: the strip gives the kind and the condition.
- Two lit lines between the same two ports are one line on the stage: a relation and the relation back in a locked arrangement, or the lines to a skill and to one of its files. That line has one word and one ring: those of the first line out of the selection, or of the first line into it if no line goes out. The word of the line to a file is then beside the name. The relation back of a pair has no word: the row shows the word of the line from the selection, and the dot in the glyph shows that the relation goes both ways.
- Two lit lines that come to one port from two different nodes share the last part of their way. That part has no word, because the word would read as the word of each of the two. For a trace, a step and a relation that the route states can share a port in this way.
- The word beside a name comes after the name, and after the dots and the tool marks of the row. In the left zone of a locked arrangement, where a row is a mirror image, it comes before the name. A word of a hosted file has a dot before it, as the file has a dot on the row.
- A word takes no character from a name. A name on a locked view is the same as with no selection.
- A word that has no room on its line next to the other node takes the first of these places that is free:
  1. After the name, in the empty room there. If its own line leaves the node there, the word stands on the first part of that line, and the ring of that line is then not there. A line that ends at the node there has its arrowhead in that place, so the word is not there.
  2. On its line next to the other node, with less air than a word has there at first.
  3. Under the name, directly below the label. The word is then nearer to its own name than to the row below. If the row below is lit and is under the word, the word is not there, because it would read as the word of that row.
  4. On the other side of the node.
  5. On its line next to the selected node, or for a trace next to the source, if no other lit line uses that part.
- If no place is free, the relation shows no word. A relation with a condition then keeps its ring if the ring has a place of its own.
- A word has a box in the color of the background, so it does not go where a line goes up or down, and not where a second word is. This is true for a lit line and for a gray line of a locked arrangement. A gray line can be under a word only where the lit line of the word is on it.
- With the Tools lens on, a chip is drawn over each line. Thus a row keeps its tool marks folded while a lit line, its arrowhead, or its ring is where the chips of the row are.
- A locked view cannot show a relation with a node that is not in it, in the one direction or in the other. The strip gives the number, for example `3 relations are not in this view.` Two of them can be with one node, so the strip does not give the number of nodes. For a trace, the strip gives the number of steps that are not in the view. The number is in the strip only while the strip describes the selection, and not while it describes the node under the pointer.
- If you select a node that is not in the locked view, for example from the finder, the reader opens it and the map lights nothing. The strip says that the node is not in this view.
- Escape closes the reader and then ends the selection. A click on the empty area of the map ends the selection. The lock stays on.
- A click does not put the camera back to the fit. If you did not move the camera, it keeps the fit of the locked view in the area beside the reader. If you moved it, it then moves only as far as is necessary to keep the selected node clear of the reader. `0` fits the locked view.
- A mark at the top left of the map shows that the lock is on, and names what the lock holds.

Turn the lock off to arrange the map for the selection: the focus arrangement of the selected node or of the route, or the rest map if nothing is selected.

### The finder and the trace

Type in the finder to search names, titles, descriptions, the route tasks of the router, and its trigger conditions. Nodes that do not match go dim. No node moves.

Press Enter on a route to trace it. The trace is a focus arrangement in step order: the router on the left, then the playbook of the route on the same row, then the steps in one column from top to bottom. Each step is a relation of the playbook, in the order of the lines of the playbook. The trace does not show a `boundary` relation. A step has a number. A step with a condition has a hollow number. For a route without a playbook, the steps are the skills that the route names, next to the router. If a route names a skill that is also a step of its playbook, the skill has one row, as the step, and the words `the route names it` follow its name. No line goes from the router to that row. At the start of a trace the strip gives the task of the route and the line of the route in the router. Two routes can go to one playbook, and each shows its own line.

### The reader

The reader shows the facts from the index, then each file of the skill, then the text. For an imported skill, the facts give the upstream repository, the revision, and the path of the source file in that repository. A code span that holds the name of a skill is live: the pointer rings the node on the map, and a click selects it. This rule also applies to the description and the trigger conditions in the facts. A relative link opens in the reader. An `http` or `https` link opens a new tab. A link with a different scheme shows as text. The reader shows HTML source and images as text, and loads none of them.

The reader shows CommonMark. It has no extension for tables or for the other GitHub additions. The known limits give the effect.

When a line is marked, the mark covers the block that holds the line. For a list item, the mark covers the text of the item and not the items below it. For a line in a code fence, the mark covers the fence.

### Keys

| Key | Result |
| --- | --- |
| `/` | Puts the cursor in the finder. |
| Up, Down, Enter in the finder | Moves through the hits, and opens a hit. |
| Tab | Moves through the nodes by column, then by row. In a focus arrangement: the left zone from top to bottom, the selected node, then the right zone from top to bottom. |
| Enter or Space on a node | Selects the node, and moves the keyboard focus into the reader. |
| `E` | Opens the file of the sentence in the strip, at its line. |
| Left, Right during a trace | Moves to the previous or the next step. The reader goes to the line of the step. |
| `L` | Turns the lock on or off. A key that stays down counts one time. A press before the map is there waits, and the lock turns when the map shows. The key types the letter while the cursor is in the finder. |
| Escape | Closes the reader, and the keyboard focus returns to the node. A second press ends the selection, and each node goes back to its seat. A third press removes the query. With the lock on, no node moves and the lock stays on. |
| Click on the empty area of the map | Ends the selection and closes the reader. With the lock on, no node moves and the lock stays on. |
| Escape in the key | Closes the key, and the keyboard focus returns to the **Key** control. |
| `0` | Fits the rest map, or the focus arrangement on the map, to the window. The fit does not make the rest map smaller than 80% of its size, and a focus arrangement not smaller than 60%. If the window is smaller than that, the map shows from its top-left corner. |
| Wheel, drag | Zooms at the pointer, and moves the map. |

**Tools** dims each node without a script or a command, and shows the names of the scripts and the commands on the rest map. In a focus arrangement a row shows the two pink marks and not the names. **Key** shows the marks, and each line row in it hides or shows one kind of line. When the key opens, the keyboard focus moves to its first line row.

The address of the page holds the selection, the lock, the open file, the query, and the lens. For example, `#/skill/how?lock=skill/architect` is the node `how`, selected in the locked arrangement of `architect`. Thus a reload and the Back button of the browser return to the same place. The lock adds no entry to the history. A lock value that is not a view of the index gives no lock: the map then follows the selection. If the address names a node or a file that the index does not hold, the client removes that part from the address and adds no entry to the history.

If an error stops the page, the page shows the message of the error and a control that loads the page again.

## The index

The index has two files. Each file has one writer.

| File | Writer | Contents |
| --- | --- | --- |
| `index/scan.json` | `npm run index` | Everything that the tool can find without judgment: nodes, routes, triggers, files, and references. |
| `index/judgments.json` | `npm run judge` | One answer for each reference that needs a reader. `--prune` only removes answers. |

Do not edit these files. The tool never writes below `../skills`.

Only an absent file counts as absent. If `judgments.json` exists and the tool cannot read it or decode it, each command fails and no command replaces the file. If `scan.json` exists and the tool cannot read it, each command fails. A `scan.json` in an old format counts as absent, and `npm run index` writes it again.

`judge` and `--prune` hold the lock file `index/judgments.json.lock` while they read and write `judgments.json`. A second command waits for a maximum of 10 seconds. If a command stops before it removes the lock file, the next command fails and names the file. Remove the file if no `judge` command is running.

`scan.json` is a pure function of `../skills` and `../docs/upstream-imports.json`. It contains no timestamp and no absolute path. Two runs on the same files write the same bytes.

The browser client does not read `scan.json`. `GET /api/index` scans the files for each request, so the client always shows the current files. The response says if `scan.json` is behind the files.

### Nodes

| Kind | Source |
| --- | --- |
| `skill` | A directory in `../skills` that holds `SKILL.md`. |
| `playbook` | A file `playbooks/*.md` of a skill. The skill that owns playbooks is the router. |
| `hosted` | A file that is not an entry file and that a different node links to. |

A playbook is the source of the references in its file. A hosted file is a target only. A link to `skills/mako/references/execution.md` is a relation to that file, not to `mako`.

A skill with a problem is still a node. Its `defects` list gives each problem:

- The frontmatter is absent, is not a mapping, or is not valid YAML. An unquoted glob such as `paths: [*.ts]` is not valid YAML.
- The frontmatter has no `name` or no `description`, or the name is not the directory name.
- A file of the skill exists and cannot be read.
- The upstream repository of the skill in `../docs/upstream-imports.json` is not an `http` or `https` URL. The origin of the skill is then `unknown`.

### References

The scan reads each paragraph, list item, heading, and frontmatter `description`. Each of these is one block. The scan does not read fenced code. It finds a reference from these rules:

| Rule | Example |
| --- | --- |
| `link` | `[execution](../mako/references/execution.md)` |
| `backtick` | `` `architect` `` |
| `sigil` | `` `/how` ``, `` `$mako` ``, `` `@mako` ``, `` `/skill:refine-ui` `` |
| `named-skill` | "the how, why, and architect skills" |
| `bare-name` | "belongs to simple-technical-english" |
| `short-principle` | "the **boundary-discipline** principle skill" |
| `artifact-path` | `` `ui-design/.artifacts/pdf/` `` |

Some references get their kind from position, path, or name:

| Kind | Condition |
| --- | --- |
| `route` | The reference is in a bullet under `## Playbooks` in the entry file of the router. |
| `trigger` | The reference is the first skill in a bullet under `## Phase triggers`, or in a bullet of `references/principles.md` of the router. |
| `reads` | The reference is a link to a hosted file. |
| `artifact-path` | The reference is a code span that starts with the directory of a different skill. |
| `applies-principle` | The target is a principle skill. |

A pair with the kind `route`, `trigger`, `reads`, or `applies-principle` needs no judgment. The kind `artifact-path` does not decide a pair. If a pair has an artifact path and a second mention of the target, the pair gets a ticket. Its kinds are then the answer, followed by `artifact-path`.

### Tickets

A ticket asks one question about one ordered pair of nodes: what is the relation of the source to the target? `npm run index` and `npm run check` print each open ticket in this layout:

```text
  a7bb91fd  kind     skill:alpha > skill:beta  new
            to: Fixture skill with no outbound reference.
            skills/alpha/SKILL.md:13 › Alpha
            | If the fix crosses a boundary, apply `beta`.
            npm run judge -- a7bb91fd <none|boundary|handoff|runs|requires|see-also> [--conditional]
```

- The first line gives the ticket id, the reason, the pair, and the status.
- The `to:` line gives the description of the target, cut to one line. For a playbook it gives the purpose.
- Then each block that mentions the target follows. The first line gives the file, the line of the first mention, and each heading above the block, from the top heading down. The second line gives the whole block. A pair lists a block one time.
- The last line is the command that answers the ticket.

The identity of a ticket is a hash of 64 characters. The printed id is the start of that hash: 8 characters, or more when two current tickets start with the same 8. `judge` accepts each start of 8 characters or more that fits exactly one current ticket. If a start fits more than one ticket, `judge` changes no file and prints the full ids.

| Reason | Question |
| --- | --- |
| `kind` | The scan found a reference, and no mechanical kind decides it. What is the reference? |
| `refers` | The scan found text that can be a reference. Is it one? |

| Status | Meaning |
| --- | --- |
| `new` | The pair has no answer. |
| `changed; was: <answer>` | A block of the evidence changed after the answer. The ticket has a new id. |
| `invalid; was: <answer>, conditional` | `judgments.json` holds an answer that is not a legal combination. The answer does not apply. |
| `judged: <answer>` | The answer applies. Only `npm run index -- --judged` lists these tickets. They are not open. |

A `refers` ticket comes from three narrow rules:

- A one-word skill name after `use`, `run`, `apply`, `load`, or `invoke`, or after "skills such as".
- The capitalized, spaced form of a name, for example "Bug fix" or "Laziness Protocol".
- The short form of a principle name, for example "boundary-discipline".

The answers are in decision order. Compare the text with each answer from the top, and give the first answer that fits. The tool prints the answers in this order in each command and message. The order comes from one list, `Answer` in `src/shared/model.ts`.

| Answer | Meaning |
| --- | --- |
| `none` | The text is not a reference. |
| `boundary` | The source names the target to limit or forbid its use. |
| `handoff` | The source stops and the target continues. |
| `runs` | The source runs the workflow of the target as a step. |
| `requires` | The source reads, loads, or adopts the target before it acts. |
| `see-also` | The target is a companion or a contrast. |

Add `--conditional` when a condition guards the reference ("if", "when", "unless", "for"). The flag is legal only with `handoff`, `runs`, and `requires`. `judge` rejects it with `none`, `boundary`, and `see-also`, and changes no file.

`judge` accepts the id of an open ticket. It also accepts the id of an answered ticket while the evidence is the same. An answer to an answered ticket replaces the record, and the command prints `revised`. Find the id of an answered ticket with `npm run index -- --judged`. `judge` rejects each other id and changes no file.

A judgment applies only while the evidence is the same. The evidence of a pair is each block that mentions the target, with the headings above that block. The evidence hash covers the text and the headings of each block. It does not cover the file name, the line number, or the rule. The ticket id comes from the pair and this hash.

- If a block or a heading above it changes, the ticket opens again with a new id and shows the previous answer.
- A change in a different part of the file opens nothing.
- If a pair is gone or needs no judgment, its judgment is an orphan, and `npm run index -- --prune` removes it.

### The summary line

```text
scan   4 skills  1 playbook  1 hosted file  10 relations   +1 added  ~1 changed  -0 removed
       added    skill:gamma
       changed  playbook:build
```

- The relation count is the number of relations that the client draws: the scan joined with the answers. `npm run index` and the `check ok` line count the same thing. The count changes when you answer tickets: `none` removes a pair, and an answer to a `refers` ticket adds one.
- The three numbers compare the nodes with the `scan.json` that the command replaced. The lines below name the nodes. A group shows a maximum of 10 ids, then `and N more`.
- If the old `scan.json` is absent or has an old format, each node counts as added.

A pair with an open `kind` ticket shows in the client as `mentions`. A pair with an open `refers` ticket does not show.

### Tooling facts

- A script is a file of a skill that is executable, starts with `#!`, or is in `scripts/`. The index records each line of the skill's markdown that names the script.
- A command is the first word of a command line in a `bash`, `sh`, `shell`, or `zsh` fence. Fences in the `README.md` of a skill do not count. A command line that starts with a bundled script counts for the script.

## HTTP API

The server listens on `127.0.0.1:4747` only. `EXPLORER_PORT` changes the port. The `Host` rule and each message then use that port. It keeps no state between requests. When it starts, it prints `Skill explorer: http://127.0.0.1:4747`. After that it prints warnings and errors only.

The server answers a request only when the `Host` header is `127.0.0.1:4747` or `localhost:4747`. Each other request gets status 403 and one line of text. This rule stops a page on a different site that points its own host name at this computer.

If port 4747 is in use, the server prints one line and exits with code 1. The explorer is then possibly already in operation at that address.

| Request | Response |
| --- | --- |
| `GET /api/index` | The live index: `ExplorerIndex` in `src/shared/model.ts`. `record` is `current`, `behind`, or `missing`. `open` is the number of open tickets. Each relation that an answer can change has its `ticket` id. For a relation with only mechanical kinds, `ticket` is null. |
| `GET /api/doc?path=skills/...` | The text of one file: `SkillDoc`. Each line of the text ends with LF. A path that the live scan does not list gets status 404 with `DocNotFound`. A listed file that is not UTF-8 text, or that cannot be read, gets the same 404. |
| `GET /` | The built client from `dist/`. If `dist/` is absent when the server starts, one line of text. |

`src/shared/` has no Node.js imports. The client imports the schemas, the API definition, and the markdown rules from it.

## Dependencies

All versions are exact. `package-lock.json` is committed.

`package.json` has this override:

```json
"overrides": { "@effect/platform-node-shared": "4.0.2" }
```

Do not remove it while `effect` is at 4.0.2. `@effect/platform-node@4.0.2` asks for `@effect/platform-node-shared@^4.0.2`. Without the override, npm installs 4.0.3 of that package, which needs `effect@^4.0.3`. That version of `effect` is not published, so the installation fails. Remove the override when you move all Effect packages to a published 4.0.3 or later.

npm can print a warning that `esbuild` has an install script. Do not approve the script. `tsx` works without it.

## Source layout

| Path | Contents |
| --- | --- |
| `src/shared/model.ts` | Every schema and branded type. |
| `src/shared/api.ts` | The HTTP API definition. It also exports `HOST` and `PORT`. |
| `src/shared/address.ts` | `HOST`, the default ports, and `portFrom`, which reads a port from the text of a variable. The file is also in the browser bundle, so it reads no variable: `src/server/main.ts` and `vite.config.ts` read the variables and give the text to `portFrom`. |
| `src/shared/order.ts` | `byCodeUnit`: the one comparator for names and paths. |
| `src/shared/markdown.ts` | Frontmatter split, blocks, code spans, links, heading slugs, link resolution. |
| `src/index/corpus.ts` | `readCorpus` and `readCorpusFile`: the only reads of `../skills`. This file owns the skip rules. |
| `src/index/scan.ts` | `scan(corpus)`: pure. `detect.ts` holds the name rules. `tooling.ts` holds scripts and commands. |
| `src/index/resolve.ts` | `resolve(scan, judgments)`: pure. Relations, tickets, orphans. |
| `src/index/report.ts` | `renderReport`: the text that the CLI prints. |
| `src/index/skill-index.ts` | The `SkillIndex` service: `live`, `refresh`, `judge`, `check`, `document`. |
| `src/commands.ts` | The commands `index`, `judge`, and `check`, and each message that they print. |
| `src/cli.ts` | Runs the commands on this repository. |
| `src/server/server.ts` | The HTTP handlers, the `Host` rule, and `serverLayer`. |
| `src/server/main.ts` | Starts the server on this repository, on the port of `EXPLORER_PORT`. |
| `src/server/dev-notice.ts` | The one line that `npm run dev` prints about the API, and the check for Vitest. Pure. |
| `vite.config.ts` | The dev server, on the port of `EXPLORER_DEV_PORT`, and the build. The dev server prints one line that says whether an explorer API answers. It starts no process, and it makes no request when Vitest loads this file. |
| `src/reported-failure.ts` | The failure that ends a command with exit code 1 after one printed line. |
| `src/shared/graph.ts` | `toGraph(index)`: the index with lookups, and each column in rank order. |
| `src/shared/layout.ts` | `layout(graph)`: pure. The rest map: seats, pips, cables, and the size of the world. Also `cablesOnOneTrunk` for the preview of one node. |
| `src/shared/focus-layout.ts` | `focusLayout(graph, focus)`: pure. The focus arrangement of a selected node or of a route: rows, captions, and cables. |
| `src/shared/polyline.ts` | The part of a cable that has grown, the parts of a cable that go up or down and left or right, and the places that the gate and the word can have on a cable. |
| `src/shared/stage-lattice.ts` | `latticeOf(arrangement)` and `routeInPlace`: the gutters of a focus arrangement, and a cable between two nodes that stay where they are. Pure. |
| `src/shared/view/state.ts` | The view state, the events, and the place that the address holds. `Pin` is what is arranged, apart from `Focus`, which is what is selected. |
| `src/shared/view/step.ts` | `step(state, event, stage)`: the reducer. Pure. |
| `src/shared/view/scene.ts` | `deriveScene`: what the map draws for one state. Pure. `ports.ts` gives one mark for each port. `arranged.ts` keeps the arrangement of each view. |
| `src/shared/view/lit.ts` | `litOf`: what a state lights. The lines of its own arrangement, or its relations in place on a locked view, with the count of what the view cannot show. It also decides which line in place has the word and the ring of a port, and it puts the word on the line where the line has room that no other line uses. |
| `src/shared/view/keys.ts` | `keyPressOf`: what a key event of the browser is for the map. `togglesLock` and `lockPressOf`: whether one key event turns the lock, and whether it waits for the index. `lockKey`: the lock key of one page, which counts the presses that wait and applies them when the index arrives. |
| `src/shared/view/beside.ts` | `wordsBeside`: the place of each relation word that has no room on its line next to the other node, or no place. Pure. |
| `src/shared/view/trace.ts`, `finder.ts`, `strip.ts`, `sentence.ts` | The trace of a route, the hits of a query, the line below the map, and the sentence that it quotes. |
| `src/shared/view/camera.ts` | The fit, the zoom, and the rule that keeps the focused node clear of the reader. |
| `src/shared/view/hash.ts`, `history.ts` | The address of a place, and the decision to add, replace, or keep a history entry. |
| `src/shared/view/cable-class.ts` | The line classes of the key, the kinds in each class, the weight of a class, and the word of a kind. |
| `src/client/App.tsx` | Connects the index, the reducer, the address, the keys, and the keyboard focus. |
| `src/client/main.tsx`, `ErrorBoundary.tsx` | Starts the client, and shows a message if an error stops it. |
| `src/client/useIndex.ts`, `remote.ts` | The typed API client. The shared schemas decode each response. |
| `src/client/SkillMap.tsx` | Draws a scene as SVG. It holds the motion and no rule. |
| `src/client/timing.ts` | Each duration of the motion, and the time at which a line arrives at its node. |
| `src/client/Reader.tsx`, `Markdown.tsx` | The facts, the files, and the text of one file. |
| `src/client/LiveName.tsx`, `OriginFact.tsx` | A code span that names a skill, and the origin of an imported skill. |
| `src/client/TopBar.tsx`, `Finder.tsx` | The bar above the map: the finder, the lens, **Key**, **Fit**, **Lock**, and the status of the index. |
| `src/client/Strip.tsx`, `Legend.tsx`, `StageCue.tsx` | The line below the map, the key, and the mark of a locked view. |
| `src/client/styles/tokens.css` | The colors and the type. A color has the name of its role: `--needs`, `--needed-by`, `--tooling`. |
| `src/client/styles/*.css` | One stylesheet for each part: `shell`, `map`, `nodes`, `finder`, `strip-and-key`, `reader`. |

`readCorpus` skips each entry whose name starts with a dot, each `node_modules` and `__pycache__` directory, and each symbolic link. Thus `.artifacts` directories are never read. It also skips an entry that goes away during the read. An entry that exists and cannot be read becomes a defect of its skill. Text with CRLF line ends is read as text with LF line ends.

The client adds `react`, `react-dom`, `motion`, `react-markdown`, the two `@fontsource-variable` font packages, `vite`, and the React types. It has no graph library, no layout library, no CSS framework, and no state library.

## Tests

`npm test` runs each test. An edit of the text in `../skills` must not fail a test. Thus the tests read the skills in two ways.

- **A rule reads the live skills.** A rule holds for each content of `../skills`. Example: each lit relation shows its word in one place, or no place that the rules permit has room for the word. A test of a rule names no skill, no playbook, no route, and no file. It states no count and no list. Its only lower bound says that its loop was not empty, and that bound comes from the index. Example: at least one pick for each node on the stage.
- **A fact reads the snapshot.** A test that names a skill, a playbook, a route, or a file, or that states a count or a list, reads `snapshotIndex` from `test/support.ts`. The snapshot is `test/fixtures/live-index.json`. It is the response of `GET /api/index` at the last refresh, encoded with the shared schema. `test/fixtures/docs/` holds the two files of the skills that the reader tests quote. `test/fixtures/snapshot-docs.ts` lists them.

Many tests do both: one function holds the rule, and the test runs it on the live skills and on the snapshot. Only the run on the snapshot states a count.

Refresh the snapshot only when you want the facts to follow the skills:

```sh
npx tsx test/fixtures/refresh-snapshot.ts
```

A refresh is a deliberate change, not a step of a build. After a refresh:

1. Run `npx tsx test/recount-words.ts --pin`. It writes `test/words-left-off.ts`: the number of relations without a word for each locked stage. It also prints the numbers of the two known limits about a locked view below. Update them.
2. Run `npm test`, and update each list and each count that a test states about the snapshot. They are in each assertion that reads `snapshotIndex` or `snapshotStage`.

Do not refresh the snapshot to make a failed rule pass.

`test/word-rules.ts` holds the rules of a relation word on a locked stage. It reads a scene as the map draws it: the box of each word, each line, and each part of each row. It does not call the code that places a word. The rules are:

- A lit relation shows its word in one place, with its own text and the color of its own line. The relation back of a pair shows none.
- A word is inside what the camera fits. It is on no line of a different relation, over no part of a row, no caption, no arrowhead, no ring, and no other word. A word under a name has no lit row directly below it.
- A relation shows no word only when no permitted place has room for it. The test tries each permitted place itself, with more room than the client needs: each position on the two end parts of the line, after the name, under the name, and on the other side of the node.

`lock.test.ts` applies them to each pick and each trace on each locked stage, for the live skills and for the snapshot. `beside.test.ts` gives the placement one row with one obstacle at a time.

`test/on-changed-content.mjs` shows that the tests do not depend on the content. It copies the repository to a temporary directory, changes the `skills/` of the copy, prints the size of the index of the copy, runs the tests there, and removes the copy. It does not write to `../skills`.

```sh
node test/on-changed-content.mjs A
```

| Set | Change in the copy |
| --- | --- |
| `A` | Ordinary edits: two new sentences that name a skill, one new skill, one removed step of a playbook, and one new route. |
| `B` | One skill removed, and one playbook renamed together with its link in the router. |
| `C` | Hard content: a skill with a name of 40 characters, four more files of the router that a different skill links to, six more principles, and one skill that names twelve skills in one paragraph. |
| `D` | No router: the directory of the router is removed, so the copy has no playbook and no route. |
| `E` | A small repository: only the three skills `how`, `teach`, and `why`. |
| `F` | A large repository: forty more skills, each of which names four skills. |

Each set must give 0 failures with no edit of a test file between the runs. If a rule fails on a set, the client has a defect: correct the client and do not weaken the rule. If the skills no longer hold a text that a set changes, the script stops and names the text. Change the set then.

## Known limits

- The trace stops at the last step of a playbook. It does not continue into a playbook that the last step names.
- A trace draws no line for a step that goes back to the router or to the playbook of the route, because each of the two is on the left of the steps. The strip still gives the step.
- A neighbour that needs the selection and that the selection needs has one line. The relation back shows as an orange arrow, and its sentence shows when you select the neighbour.
- The Key hides a class of lines. A neighbour that has only a hidden line keeps its row in the arrangement.
- With the lock on and a node selected, the pointer on a second node makes the line between the two brighter. It does not show the other relations of the second node. Click the second node to see them.
- With the lock on, a line with a condition can have no small ring. The level part next to the other node is then too short for it, or a word is in its place, or the ring would be on a trunk that other lines use. The word of the line ends with `if`. In the snapshot of the tests, 16 of the 369 lines without a word have a condition and no ring.
- With the lock on, a relation can show no word. A word stands only on its own line or beside its own name, clear of each other thing, and a name gives no character to a word. Where no such place is free, the relation has no word. In the snapshot of the tests this occurs for 369 of the 6,266 lit lines of all picks and traces on all locked stages. 100 of them are in the locked arrangement of the router, where the rows stand close together and the gray lines go between them. 12 are on the locked rest map. The others are in 64 smaller arrangements, most often where lit rows are one below the other, or where two lit lines come to one port. `npx tsx test/recount-words.ts` prints these numbers, and `test/words-left-off.ts` has the number for each locked stage. Move the pointer to the line or to the node: the strip gives the kind and the condition.
- With the lock on, the relation back of a pair that goes both ways has no word of its own, and no sign of its condition if it has one. Select the other node to see it. Without the lock, the orange arrow of the relation back is a closed triangle when the relation has a condition.
- The Back button of the browser can go to an address from before the lock. The map then has the arrangement of that address.
- A node that is new after a refresh of the index shows at once in its row. It has no animation of its own.
- The reader shows CommonMark only. A pipe table, strikethrough, a task list, and a bare address show as written.
- If the window is narrower than approximately 1300 px, the map does not fit beside the open reader. The camera keeps the focused node in view. Zoom or drag to see the other columns.

- Three skills name commands only in inline code (`improve-codebase-architecture`, `show-me-your-work`, `mako`). They get no command mark.
- A one-word skill name without backticks is a reference only for `deslop`, `mako`, and `unslop`. This list of three names is in `src/index/detect.ts`. If a new skill has a one-word coined name and a file names it without backticks, add the name to the list. If you do not, the scan does not find that reference.
- The verb `see` is not a cue for a `refers` ticket, because "see how" and "see why" are ordinary English.
- A renamed skill makes its judgments orphans. Prune them and judge the new tickets.
- A pair with the kind `route`, `trigger`, `reads`, or `applies-principle` gets no ticket, also when a different mention of the pair has a different meaning.
- File digests use the bytes of each file. In a checkout with CRLF line ends the relations are the same, and the record shows as behind.
- The evidence hash does not cover the sentence that introduces a list, the parent of a nested list item, or the description of the target. A change to one of them does not open a ticket again.
- If a directory directly in `../skills` cannot be read, its skill is absent from the map.
- The scan knows two headings and one path of the router: `## Playbooks`, `## Phase triggers`, and `references/principles.md`. If they change, change `src/index/scan.ts`.
