---
name: refine-ui
description: Analyze an existing UI or design system. Surface evidence-backed visual gaps, explore a user-selected direction with temporary HTML/CSS mockups, and refine the accepted direction through rendered comparison while project design memory evolves. Also use for greenfield UI direction-setting when the user explicitly invokes the skill.
disable-model-invocation: true
---

# Refine UI

Improve interfaces through rendered evidence and explicit user decisions.

The workflow is:

> Observe → find a gap or frame a greenfield scope → user chooses → grill ↔ mock up until the frontier is empty → user confirms → implement a slice → compare → user accepts → record and optionally roll out

A model already knows how to write HTML and CSS. This skill supplies the process it does not follow reliably on its own:

- inspect the rendered product
- separate local symptoms from system causes
- show genuinely different directions
- identify reusable design-system opportunities
- stop for the user before commitment expands

## Non-negotiables

- Treat the rendered interface as the source of truth for the current experience. Compare it with documented intent and the executable design system. Disagreement among them is evidence, not permission to assume that one is correct.
- Keep the user in control at three gates: gap selection or greenfield-scope confirmation, direction selection or approval, and rendered production acceptance with a rollout decision. Only explicit user approval advances through a gate. Delegation never transfers these gates or final synthesis away from the main agent.
- Do not hide token changes, reusable-module extraction, migration, or `DESIGN.md` updates inside implementation. Present the proposed system delta at the direction gate. Immediately after direction approval, create or update root `DESIGN.md` with the accepted decision marked provisional. After rendered production acceptance, establish, revise, or remove it.
- Find environmental facts yourself. Ask the user for decisions, intent, taste, and constraints. Do not ask for facts available in the repository or the running application.
- When a preference is easier to react to than describe, suspend grilling and show alternatives instead of asking the user to imagine them.
- Create audit reports, screenshots, and HTML/CSS mockups in the OS temp directory by default or another user-approved external location, never in the user's repository. Do not add or copy mockup routes, files, or exploration dependencies into the user's project.
- If the selected external destination cannot be created or the capture tool cannot write there, stop and request another writable location outside the repository. Never stage artifacts in the repository as a fallback.
- Do not install browser tooling, packages, fonts, or MCP servers without approval.
- Use realistic, non-sensitive content. Never copy credentials, personal data, or unrelated authenticated browser content into an artifact.
- Accessibility is a constraint throughout, not a polish pass. Visual tactics never justify hiding required labels, focus indicators, status, terms, or controls.
- When a prepared design reference is available, do not recommend gaps, directions, or mockups from memory alone. Search the reference for the current question. Inspect the smallest relevant passages, and inspect page images when visual examples matter and vision is available. Record what the reference changed or confirmed.
- Never describe a mockup as ready merely because its HTML was generated or opened. The phase owner must render every required alternative, viewport, and state, capture screenshots, and inspect runtime evidence and the screenshots themselves when vision is available. The owner must fix defects and recapture before handoff.
- When a suitable delegate is available, delegate context-heavy phases before loading their raw evidence into the main conversation. Otherwise keep the phase inline while using the canonical packet, approved external evidence artifacts, and compact phase notes. Delegation changes context ownership, never the phase's quality bar.
- Do not distribute or track user-provided copyrighted references or their derivatives. Keep derived PDF artifacts only in the skill's private ignored cache or another approved external location. See [references/PDF-REFERENCE.md](references/PDF-REFERENCE.md).

## Load references progressively

Read only what the current phase requires. Treat every applicable "before" instruction below as a checkpoint, not a suggestion. Do not continue the phase without loading its reference.

- At the interview phase, load and follow the installed model-invoked `grilling` skill. If `grilling` is unavailable, say that you will use a reduced fallback interview, then follow section 5 directly.
- Before assigning or performing a context-heavy phase, read [references/DELEGATION.md](references/DELEGATION.md).
- Before diagnosing or creating a direction, read [references/DESIGN-DISCIPLINE.md](references/DESIGN-DISCIPLINE.md).
- Before inventorying, changing, or documenting a project's design system, read [references/DESIGN-SYSTEM.md](references/DESIGN-SYSTEM.md).
- Before controlling or inspecting a browser, read [references/BROWSER-OBSERVATION.md](references/BROWSER-OBSERVATION.md).
- Before writing the candidate report, read [references/HTML-REPORT.md](references/HTML-REPORT.md).
- Before creating HTML/CSS mockups, read [references/VISUAL-MOCKUPS.md](references/VISUAL-MOCKUPS.md).
- Before diagnosing or creating a direction, read [references/PDF-REFERENCE.md](references/PDF-REFERENCE.md) and check the skill's `.artifacts/pdf/` directory for a prepared `reference.md`. Source availability is optional. Consultation is mandatory when a prepared cache exists or the user supplies a licensed PDF. Use an existing cache without requiring the source PDF again.

## 1. Determine the entry mode

Infer the mode from the request and repository. Ask only if ambiguity would change the work.

### Existing UI

Inspect the running application before interviewing about visual direction. Existing evidence makes later questions concrete.

### Design-system refinement

Inspect repeated primitives, tokens, rendered states, embedded patterns, and representative product screens. A component catalog alone cannot show whether the system works in composition. Look for both existing reusable modules and tightly coupled elements whose current surface plus the selected need can justify promotion.

### Greenfield

There is no rendered evidence yet. Use the grilling discipline from section 5, and limit the initial frontier to prerequisites needed for useful mockups:

- primary user and task
- representative screen or flow
- realistic content and density
- personality and trust signals
- brand, platform, and accessibility constraints

Do not interview toward a complete imagined design. Settle enough to create useful alternatives, then let the user react to rendered mockups.

Confirm the representative scope and content fixture with the user. This confirmation is the greenfield equivalent of the gap-selection gate. Then establish observation capability, create the temporary reference brief through section 3's reference checkpoint, and continue the grilling frontier in section 5 until it reaches a visual question. Do not manufacture an evidence-gap report for a product that does not exist.

### Mode paths

- **Existing UI and design-system refinement:** sections 2 → 3 → 4 → 5 → 6 → 7. When no mockup is needed, use sections 2 → 3 → 4 → 5 → 7.
- **Greenfield:** initial grilling and scope confirmation above → section 2 → section 3 reference checkpoint only → section 5 → section 6 → section 7. When no mockup is needed, go from section 5 directly to section 7. Skip the rest of sections 3 and 4 except where an existing brand or system supplies evidence worth inspecting.

Every mode passes through section 7's direction gate and provisional design-memory write before section 8.

## 2. Establish observation and delegation capability

Before concluding that browser observation is unavailable:

1. Inspect exposed tools.
2. Search available MCP tools if the harness supports discovery.
3. Inspect the repository for an existing browser automation or end-to-end setup.
4. Prefer an already configured capability.

Look for capabilities rather than a specific product name: navigate, inspect a semantic snapshot, interact, resize or emulate, capture screenshots, and evaluate page scripts or computed styles.

Use the strongest available evidence:

1. Browser control plus screenshots plus image-capable model.
2. Browser control and semantic or computed-style evidence, with the user judging images if necessary.
3. User-provided screenshots or design exports.
4. Source and token analysis, explicitly marked lower-confidence.

Also inspect the harness's system instructions and exposed tools for delegated or isolated execution. Do not assume a particular product, command, agent name, or context model. Following [references/DELEGATION.md](references/DELEGATION.md), identify the available delegates, if any, that can read the repository, write approved external artifacts, control a browser, capture screenshots, inspect images, or modify production code. Do not delegate a phase to a context that lacks one of its required capabilities.

Once the scope is known and before the first delegation, the main agent creates the initial compact direction packet in the approved external working directory. The packet holds the known question, constraints, unresolved decisions, and evidence pointers. It remains canonical throughout the workflow.

Do not modify production source during observation.

## 3. Explore and build a UI profile

Apply the delegation checkpoint before broad scanning. A capable evidence delegate can own repository reconnaissance, rendered observation, the broad reference pass, baseline capture, UI profiling, and candidate-report construction as one bounded phase. The main agent receives a compact handoff and artifact paths rather than raw screenshots, snapshots, logs, or source inventories. If no suitable delegate exists, the main agent remains phase owner.

Scope the review before scanning widely. If the user named a screen, flow, primitive, or system concern, begin there. Otherwise prioritize important and recently changing product surfaces.

Read project `CONTEXT.md` files for domain language and root `DESIGN.md` for accepted visual intent. Locate deeper design documentation, executable tokens, reusable modules, catalogs, and reference surfaces. Compare documented intent, executable constraints, and rendered behavior. Do not create or update project documentation during observation.

Add a design-memory plan to the temporary UI profile: whether root `DESIGN.md` exists, which deeper sources it would index, and what provisional entry will be created or updated if the user approves a direction. Existing component catalogs, token docs, or framework documentation do not substitute for the root design-memory entry point.

The main agent owns and updates the compact direction packet defined in [references/DELEGATION.md](references/DELEGATION.md). Update it with the UI profile and after every user decision. Delegates consume its path and evidence pointers. They do not silently redefine settled meaning.

### Reference checkpoint

Before classifying or ranking gaps, follow the mandatory-use procedure in [references/PDF-REFERENCE.md](references/PDF-REFERENCE.md). If a prepared reference is available:

1. derive search terms from the observed hierarchy, composition, typography, color, depth, image, responsive, or state problem
2. search page-labelled Markdown rather than relying on remembered advice
3. read only the smallest relevant passages, and inspect matching page images when visual examples matter and vision is available
4. add a temporary reference brief to the UI profile. Record the consulted sections or pages, one to three principles paraphrased in your own words, their concrete implication for this product, and any limitation or conflict.

If no relevant result is found, record the attempted terms and proceed using the independent design discipline. Do not invent a citation or force an irrelevant principle.

Gather only evidence relevant to the scope:

- primary user task and information priority
- representative routes and states
- supported viewports and themes
- typography, spacing, color, radius, border, and shadow systems
- reusable primitives and important variants
- tightly coupled elements that can contain coherent embedded patterns
- rendered computed styles when available
- empty, loading, error, disabled, focus, hover, overflow, and realistic-density states
- intentional brand or product constraints

Capture stable baseline screenshots. Use identical content, state, viewport, theme, font loading, and animation settings for later comparisons.

Classify each credible gap on two axes.

**Cause:**

- content or information hierarchy
- screen composition
- reusable primitive
- embedded pattern or promotion candidate
- design token
- asset
- interaction or state

**Scope:**

- local: evidence is confined to this surface
- systemic: the same cause recurs across surfaces

Do not infer a systemic cause from one occurrence. Do not recommend a local override for repeated system evidence.

Also classify the likely system relationship as reuse, deepen, promote, add, or keep local, following [references/DESIGN-SYSTEM.md](references/DESIGN-SYSTEM.md). An existing embedded element plus the proposed refined usage can provide two concrete consumers. Promotion is credible only when they share semantics and admit a small interface, not merely similar markup.

## 4. Present gaps and stop

The phase owner writes one visual candidate report to a fresh approved external directory, following [references/HTML-REPORT.md](references/HTML-REPORT.md). If a delegate already produced it under the phase contract, the main agent validates the handoff rather than regenerating the report.

A candidate identifies an observable gap and frames the decision it opens. It can name a likely design lever, but it must not pretend that the first proposed treatment is settled. Include a concise reference lens from the temporary brief when an applicable prepared source exists. When system evidence exists, include the likely relationship (reuse, deepen, promote, add, or keep local) and identify existing and proposed consumers of any promotion candidate.

Rank candidates qualitatively by user impact, recurrence, confidence, and change scope. Do not assign numeric design scores.

When this phase was delegated, validate the compact handoff against its contract before presenting anything. Expand raw evidence only for the spot-check triggers in [references/DELEGATION.md](references/DELEGATION.md). Do not automatically reload the delegate's screenshot gallery or detailed logs into the main context.

The main agent opens the report for the user when possible, provides its absolute path, summarizes the top recommendation in chat, and asks:

> Which gap would you like to explore?

Do not interview, create mockups, or edit production code until the user chooses.

## 5. Grill the selected gap or scope

The main agent loads and follows the installed model-invoked `grilling` skill. Treat the selected gap or confirmed greenfield scope as the root of the design tree. Grilling's rounds, frontier discipline, recommended answers, fact-finding responsibility, and shared-understanding confirmation govern the interview. Do not delegate the user conversation or design-tree synthesis.

Before the first recommendation for the selected gap or confirmed greenfield scope, the main agent can assign a bounded read-only delegate. That delegate runs the focused reference pass and writes the temporary brief. Whether delegated or inline, use the exact design question and likely levers to search. For greenfield, derive terms from the confirmed task, fixture, constraints, personality, and proposed visual lever. Update the temporary reference brief with anything newly applicable. The broad pass does not substitute for this focused pass.

If `grilling` is unavailable, state that the interview uses a reduced fallback. Interview in rounds, ask the whole current frontier, number each question, and give a recommended answer. Investigate facts yourself and defer questions whose prerequisites remain unsettled.

Adapt grilling to visual work:

- ask only decisions that affect the selected gap or scope
- distinguish requirements from preferences
- expose conflicts such as density versus calm, novelty versus familiarity, local improvement versus system change, or the benefit of extraction versus an over-general interface
- ask language-shaped decisions in the current round
- do not ask the user to describe a visual or spatial preference that can be rendered
- convert each visual branch into a one-sentence mockup question
- when several visual branches exist, mock up the earliest independent decision and leave dependent branches off the frontier until it is answered

A mockup suspends grilling. It does not end the design tree. After the user reacts, section 7 feeds that answer back into the tree and recomputes the frontier.

A visual question must be expressible in one sentence:

> This mockup exists to answer whether…

Examples:

- whether navigation is persistent or contextual
- whether the page leads with status or next action
- whether grouping relies on whitespace, surfaces, or dividers
- whether this area becomes denser or more selective

If no meaningful visual uncertainty remains, continue grilling until the frontier is empty. Then form the proposed direction and continue to section 7 for the shared-understanding direction gate and provisional design-memory write. Do not jump directly to production.

## 6. Create temporary HTML/CSS mockups

Follow [references/VISUAL-MOCKUPS.md](references/VISUAL-MOCKUPS.md). Prefer its Tailwind Play CDN adapter for temporary mockups when external requests are available and allowed. Use its embedded-CSS fallback otherwise. Never add Tailwind to the user's repository.

Before consuming mockup implementation or screenshot context in the main conversation, assign one capable phase owner when delegation is available. Prefer one delegate for the whole loop: focused evidence consumption, alternative construction, browser rendering, screenshot inspection, defect repair, recapture, and the verification manifest. Do not split that loop among several delegates merely to parallelize it. The main agent provides the direction packet and remains responsible for presenting the result and receiving the user's decision.

Create two to four alternatives that answer the selected question. Use three by default. Keep content and state constant so the structural difference is legible. Preserve accepted project-system constraints unless changing one is the design question. For each alternative, record its proposed system delta and which consulted principle it applies, deliberately challenges, or finds inapplicable. References inform coherent choices. Do not copy the book's examples or turn alternatives into cosmetic demonstrations of one rule.

The designated phase owner runs the blocking mockup-readiness gate in [references/VISUAL-MOCKUPS.md](references/VISUAL-MOCKUPS.md). Render every required alternative × viewport × state. Capture current screenshots. Inspect console and layout evidence. Visually inspect each screenshot when vision is available. Fix defects, and recapture anything that an edit invalidated. Write the temporary verification manifest. Do not proceed while any required cell is failed, stale, or uninspected. When delegated, the main agent validates the compact handoff and manifest status without duplicating the full screenshot inspection unless a spot-check trigger fires.

If the phase owner's model cannot inspect images, complete the objective checks and captures, mark the manifest `USER VISUAL REVIEW REQUIRED`, and hand off only to request visual verification. Name every matrix cell and provide the same visual checklist used by an image-capable model. Do not describe the mockup as ready or ask for direction selection yet. Wait until the user explicitly verifies every cell, reported defects are fixed and recaptured, and the manifest is updated to `PASS`.

Only after the gate passes, open the mockup for the user. Provide its absolute path and verification summary. Explain each alternative's thesis and tradeoff briefly. Then ask the user to:

- select one
- combine named traits from several
- request a focused revision
- reject all of them

Rejection returns to grilling or to a newly framed mockup question, unless the user chooses to stop. It never falls through to production.

Do not treat a whole variant as indivisible. "B's hierarchy with A's density" is a valid and useful answer.

## 7. Finalize the chosen direction and design memory

The main agent owns this phase. Every path enters it before production: either the user selected a mockup alternative or trait combination, or section 5 produced a mockup-free proposal with an empty frontier. If the user rejected every alternative, return to grilling or reframe the mockup question instead.

For a mockup selection, treat the user's selection and named trait combinations as answers in the grilling design tree. Recompute the frontier:

- if language-shaped decisions are now unblocked, return to section 5
- if another visual decision is now unblocked, return to section 6 with a new one-sentence question
- if the frontier is empty, consolidate the chosen direction

For a mockup-free proposal, verify that the frontier is already empty, then use the proposal as the direction to confirm. When mockup feedback exists, turn it into one consolidated temporary mockup. Resolve only the decisions the user actually settled. Do not silently add a new aesthetic direction.

Capture:

- the question
- the accepted traits
- rejected traits and load-bearing reasons
- constraints the production implementation must preserve
- accepted system delta, including any promotion and migration scope
- reference basis paraphrased in your own words and any deliberate departure from it

Whenever a consolidated or revised mockup is created, or any render input changes, invalidate and rerun every affected readiness-matrix cell before showing it. Reuse prior verification only for byte-identical render inputs under identical matrix conditions. Visual similarity is not evidence freshness. For a mockup-free proposal, present the consolidated direction in words. Summarize the settled tree and get explicit shared-understanding confirmation before production work. Whether the direction came from mockups or a mockup-free proposal, production work cannot begin while the frontier is non-empty or without this direction approval.

Immediately after approval, create root `DESIGN.md` if absent or update it if present. Capture only the accepted intent, selection rule, invariants, proposed system delta, implementation or validation surface, and unresolved risks. Mark new or changed rules **provisional**. Link deeper existing design sources rather than duplicating them. Do not wait until implementation cleanup, and do not invent unrelated foundations to make the file appear complete.

## 8. Implement one production slice

After direction approval and the provisional root `DESIGN.md` write, the main agent can assign one mutation-capable delegate as the sole production writer. Give it the current direction packet, relevant repository paths, approved system and migration scope, validation contract, authority limits, and required compact handoff. Do not send the entire conversation when a fresh or minimal context plus canonical artifacts is sufficient. Do not run overlapping writers in one checkout.

Implement the smallest representative slice that can validate the direction in the real product.

Before editing production code, verify that root `DESIGN.md` exists and contains the approved direction as provisional. If it does not, stop and complete section 7. Do not treat a deeper design document as a substitute.

- Use production semantics, accessibility, content, and states.
- Reuse the project's architecture and conventions.
- Translate accepted visual decisions into intentional tokens, primitives, or patterns when the evidence is systemic.
- Prefer reuse, deepening, or promotion over adding a parallel local implementation when the approved evidence supports it.
- For an approved promotion, extract a small semantic interface, migrate the original embedded consumer, and apply it to the new consumer in the same validation slice. Do not add cosmetic flags or speculative flexibility.
- Do not copy mockup code mechanically. The mockup is evidence, not production architecture.
- Preserve behavior unless interaction was explicitly part of the selected question.
- Avoid broad migration until the slice is accepted.

Run the application's normal checks.

## 9. Compare and stop

A fresh capable validation delegate can own reproduction, browser interaction, screenshot inspection, and comparison evidence. Give it the direction packet and current artifacts rather than the implementation worker's reasoning transcript. The main agent validates the handoff, reconciles conflicts, and retains the rendered-production and rollout gate.

The phase owner reproduces the baseline conditions and captures the production slice. Compare the before and after states with both semantic evidence and screenshots.

Check:

- whether information priority now reads correctly
- whether the accepted mockup traits and applicable reference principles survived implementation
- narrow and wide layouts
- supported themes
- keyboard and focus behavior
- contrast
- loading, empty, error, disabled, hover, and overflow states relevant to the slice
- unexpected regressions outside the selected scope
- for an approved promotion, both the original and new consumers across relevant states and viewports

Present the comparison and ask the user to choose:

1. refine the slice
2. accept the slice and roll out farther
3. return to mockup exploration
4. accept and keep only the validated slice, with no wider migration

Options 2 and 4 are explicit acceptance of the rendered production result and proceed to recording. Only option 2 permits broader rollout. When the validated slice includes an approved promotion, option 4 retains that bounded system change: the extracted module plus its original and new consumers. Do not describe that change as merely local.

Keep design memory synchronized with the decision. Option 1 updates the provisional entry as the slice changes. Option 3 revises, supersedes, or removes the provisional entry before exploration resumes. Options 2 and 4 mark the accepted rules established. Do not leave a rejected direction documented as active intent.

Do not roll out merely because the implementation matches the mockup. The user approves the rendered production result.

## 10. Record and optionally roll out

After option 2, propagate the accepted decision only as far as the evidence justifies. Consolidate repeated values, update affected primitives or patterns, migrate relevant surfaces, and add visual regression coverage where it will protect an intentional result. After option 4, retain only the accepted validation slice and do not migrate additional surfaces.

For either accepted option, follow [references/DESIGN-SYSTEM.md](references/DESIGN-SYSTEM.md), mark the corresponding root `DESIGN.md` entries established, and reconcile their implementation paths and reference surfaces with the accepted result. Keep raw values canonical in executable tokens. The root file records meanings, selection rules, invariants, links to deeper sources, and accepted exceptions.

Keep temporary reports, screenshots, and mockups out of the user's repository. Persist only approved production implementation and durable project knowledge justified by the result. Keep domain terminology in `CONTEXT.md`. Keep visual and interaction intent discoverable from root `DESIGN.md` and its linked deeper sources.

End with:

- phase ownership: delegated or inline, with compact handoff paths where applicable
- absolute path and current version of the canonical direction packet
- changed production files
- checks run
- surfaces migrated
- design-system modules or tokens reused, deepened, promoted, or added
- design memory status: root `DESIGN.md` created, updated, or unchanged with an explicit reason
- references consulted, relevant sections or local pages, and how they affected the direction
- mockup verification status and absolute path to its temporary manifest when mockups were used, otherwise `not applicable`
- remaining visual risks or intentionally deferred gaps
- absolute paths to temporary artifacts while they still exist
