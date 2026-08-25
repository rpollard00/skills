---
name: refine-ui
description: Analyze an existing UI or design system, surface evidence-backed visual gaps, explore a user-selected direction with temporary HTML/CSS mockups, and refine one accepted direction through rendered comparison. Also use for greenfield UI direction-setting when the user explicitly invokes the skill.
disable-model-invocation: true
---

# Refine UI

Improve interfaces through rendered evidence and explicit user decisions.

The workflow is:

> Observe → find gaps → user chooses → interview → mock up → user chooses → implement a slice → compare → user approves → roll out

A model already knows how to write HTML and CSS. This skill supplies the process it will not follow reliably on its own: inspect the rendered product, separate local symptoms from system causes, show genuinely different directions, and stop for the user before commitment expands.

## Non-negotiables

- Treat the rendered interface as the source of truth. Do not finish after merely editing CSS or passing tests.
- Keep the user in control at three gates: gap selection, mockup direction, and rollout approval.
- Find environmental facts yourself. Ask the user for decisions, intent, taste, and constraints—not facts available in the repository or running application.
- When a preference is easier to react to than describe, show alternatives instead of prolonging the interview.
- Create audit reports, screenshots, and HTML/CSS mockups in the OS temp directory, never in the user's repository. Do not add mockup routes, prototype files, or exploration dependencies to their project.
- Do not install browser tooling, packages, fonts, or MCP servers without approval.
- Use realistic, non-sensitive content. Never copy credentials, personal data, or unrelated authenticated browser content into an artifact.
- Accessibility is a constraint throughout, not a polish pass. Visual tactics never justify hiding required labels, focus indicators, status, terms, or controls.
- Do not distribute or persist user-provided copyrighted references. See [references/PDF-REFERENCE.md](references/PDF-REFERENCE.md).

## Load references progressively

Read only what the current phase requires:

- Before diagnosing or creating a direction, read [references/DESIGN-DISCIPLINE.md](references/DESIGN-DISCIPLINE.md).
- Before controlling or inspecting a browser, read [references/BROWSER-OBSERVATION.md](references/BROWSER-OBSERVATION.md).
- Before writing the candidate report, read [references/HTML-REPORT.md](references/HTML-REPORT.md).
- Before creating HTML/CSS mockups, read [references/VISUAL-MOCKUPS.md](references/VISUAL-MOCKUPS.md).
- If the user supplies a licensed PDF reference, read [references/PDF-REFERENCE.md](references/PDF-REFERENCE.md).

## 1. Determine the entry mode

Infer the mode from the request and repository. Ask only if ambiguity would change the work.

### Existing UI

Inspect the running application before interviewing about visual direction. Existing evidence makes later questions concrete.

### Design-system refinement

Inspect repeated primitives, tokens, rendered states, and representative product screens. A component catalog alone cannot show whether the system works in composition.

### Greenfield

There is no rendered evidence yet. Begin with a short interview to settle:

- primary user and task;
- representative screen or flow;
- realistic content and density;
- personality and trust signals;
- brand, platform, and accessibility constraints.

Do not interview toward a complete imagined design. Settle enough to create useful alternatives, then let the user react to rendered mockups.

## 2. Establish observation capability

Before concluding that browser observation is unavailable:

1. Inspect exposed tools.
2. Search available MCP tools if the harness supports discovery.
3. Inspect the repository for an existing browser automation or end-to-end setup.
4. Prefer an already configured capability.

Look for capabilities rather than a specific product name: navigate, inspect a semantic snapshot, interact, resize or emulate, capture screenshots, and evaluate page scripts or computed styles.

Use the strongest available evidence:

1. Browser control plus screenshots plus image-capable model.
2. Browser control and semantic/computed-style evidence, with the user judging images if necessary.
3. User-provided screenshots or design exports.
4. Source and token analysis, explicitly marked lower-confidence.

Do not modify production source during observation.

## 3. Explore and build a UI profile

Scope the review before scanning widely. If the user named a screen, flow, primitive, or system concern, begin there. Otherwise prioritize important and recently changing product surfaces.

Gather only evidence relevant to the scope:

- primary user task and information priority;
- representative routes and states;
- supported viewports and themes;
- typography, spacing, color, radius, border, and shadow systems;
- reusable primitives and important variants;
- rendered computed styles when available;
- empty, loading, error, disabled, focus, hover, overflow, and realistic-density states;
- intentional brand or product constraints.

Capture stable baseline screenshots. Use identical content, state, viewport, theme, font loading, and animation settings for later comparisons.

Classify each credible gap on two axes.

**Cause:**

- content or information hierarchy;
- screen composition;
- reusable primitive;
- design token;
- asset;
- interaction or state.

**Scope:**

- local: evidence is confined to this surface;
- systemic: the same cause recurs across surfaces.

Do not infer a systemic cause from one occurrence. Do not recommend a local override for repeated system evidence.

## 4. Present gaps and stop

Write a visual candidate report to a fresh temp directory. Follow [references/HTML-REPORT.md](references/HTML-REPORT.md).

A candidate identifies an observable gap and frames the decision it opens. It may name a likely design lever, but it must not pretend the first proposed treatment is settled.

Rank candidates qualitatively by user impact, recurrence, confidence, and change scope. Do not assign numeric design scores.

Open the report for the user when possible, provide its absolute path, summarize the top recommendation in chat, and ask:

> Which gap would you like to explore?

Do not interview, create mockups, or edit production code until the user chooses.

## 5. Interview the selected gap

Interview in rounds using a design tree. Each round asks the current frontier: decisions whose prerequisites are already settled. Give a recommended answer for each question.

During the interview:

- investigate facts yourself;
- ask only decisions that affect the selected gap;
- distinguish requirements from preferences;
- expose conflicts such as density versus calm, novelty versus familiarity, or local improvement versus system change;
- defer dependent questions to later rounds;
- convert visual preference questions into mockup questions whenever seeing alternatives will answer them faster.

A visual question must be expressible in one sentence:

> This mockup exists to answer whether…

Examples:

- whether navigation should be persistent or contextual;
- whether the page should lead with status or next action;
- whether grouping should rely on whitespace, surfaces, or dividers;
- whether this area should become denser or more selective.

If no meaningful visual uncertainty remains, skip mockups and state why before moving to the production slice.

## 6. Create temporary HTML/CSS mockups

Follow [references/VISUAL-MOCKUPS.md](references/VISUAL-MOCKUPS.md).

Create two to four alternatives—three by default—that answer the selected question. Keep content and state constant so the structural difference is legible. Inspect every alternative in a browser and capture comparable screenshots.

Open the mockup for the user, provide its absolute path, explain each alternative's thesis and tradeoff briefly, and ask the user to:

- select one;
- combine named traits from several;
- request a focused revision; or
- reject all of them.

Do not treat a whole variant as indivisible. “B's hierarchy with A's density” is a valid and useful answer.

## 7. Consolidate the chosen direction

Turn the user's feedback into one consolidated temporary mockup. Resolve only the decisions their feedback actually settles; do not silently add a new aesthetic direction.

Capture:

- the question;
- the accepted traits;
- rejected traits and load-bearing reasons;
- constraints the production implementation must preserve.

Show the consolidated mockup when the combination materially differs from every prior alternative. Get confirmation before production work.

## 8. Implement one production slice

Implement the smallest representative slice that can validate the direction in the real product.

- Use production semantics, accessibility, content, and states.
- Reuse the project's architecture and conventions.
- Translate accepted visual decisions into intentional tokens or primitives when the evidence is systemic.
- Do not copy mockup code mechanically. The mockup is evidence, not production architecture.
- Preserve behavior unless interaction was explicitly part of the selected question.
- Avoid broad migration until the slice is accepted.

Run the application's normal checks.

## 9. Compare and stop

Reproduce the baseline conditions and capture the production slice. Compare before and after using both semantic evidence and screenshots.

Check:

- whether information priority now reads correctly;
- whether the accepted mockup traits survived implementation;
- narrow and wide layouts;
- supported themes;
- keyboard and focus behavior;
- contrast;
- loading, empty, error, disabled, hover, and overflow states relevant to the slice;
- unexpected regressions outside the selected scope.

Present the comparison and ask the user to choose:

1. refine the slice;
2. accept and roll out;
3. return to mockup exploration;
4. stop with the local improvement.

Do not roll out merely because the implementation matches the mockup. The user approves the rendered production result.

## 10. Roll out and record

After approval, propagate the accepted decision only as far as the evidence justifies. Consolidate repeated values, update affected primitives, migrate relevant surfaces, and add visual regression coverage where it will protect an intentional result.

Keep temporary reports, screenshots, and mockups out of the user's repository. Persist only durable project knowledge the user wants: accepted design decisions, token meanings, component contracts, or test baselines.

End with:

- changed production files;
- checks run;
- surfaces migrated;
- remaining visual risks or intentionally deferred gaps;
- absolute paths to temporary artifacts while they still exist.
