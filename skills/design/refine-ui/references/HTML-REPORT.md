# Visual Gap Report

The report presents evidence-backed gaps so the user can choose what to explore. It is a decision artifact, not a style guide or an implementation plan.

## Location and packaging

Create a fresh directory under the OS temp directory by default, or another external location the user explicitly approved:

```text
<temp>/refine-ui-<project>-<timestamp>/
├── audit.html
└── evidence/
    ├── overview-wide.png
    ├── navigation-narrow.png
    └── ...
```

Write directly to the selected external destination. Never create the report or its evidence inside the user's repository. If that directory cannot be created or the capture adapter cannot write there, stop and ask for another writable location outside the repository. Do not stage artifacts in the repository and move them afterward.

Use plain HTML with embedded CSS and minimal optional JavaScript. Avoid CDNs and analytics. Reference evidence with relative paths or embed modest images as data URLs. The directory should remain viewable without the application running.

## Header

Include only useful context:

- product or repository name;
- reviewed scope;
- date;
- evidence level: rendered and vision-inspected, rendered with user visual review required, supplied screenshots, or source-only;
- viewports, themes, and states observed;
- link to the top recommendation.

Do not lead with methodology or a numeric score.

## Candidate card

Each candidate should contain:

### Title

Name the visible opportunity, not the source file or generic category.

Good:

- “Restore a clear decision hierarchy on the incident page”
- “Make related account details read as one group”

Weak:

- “Fix CSS”
- “Improve visual hierarchy”

### Evidence

Show a screenshot or focused crop at a useful rendered size. Annotate sparingly with CSS/SVG overlays when the gap would otherwise be hard to locate. Never alter the source screenshot in a way that exaggerates the problem.

Include route, state, and viewport in a compact caption.

### Observable gap

One or two sentences describing what can be seen. Do not begin with a speculative source-code diagnosis.

### User consequence

State which task becomes slower, ambiguous, error-prone, or needlessly effortful. If the consequence is purely aesthetic, say so plainly rather than inventing a usability claim.

### Reference lens

When a prepared design reference is available and relevant, name the consulted chapter, section, or local page range and paraphrase the applicable principle in your own words. Connect it to the product evidence and state the concrete implication. If the search found nothing relevant, omit this subsection from the card and retain the no-result search trace in the temporary reference brief.

Never include book page images or substantial quotations in the report. A reference supports diagnosis; it does not replace observable evidence or make a treatment automatically correct.

### Cause and scope

Label the current best classification:

- cause: content, composition, primitive, embedded pattern, token, asset, or interaction/state;
- scope: local or systemic;
- confidence: high, medium, or low.

Link relevant project files only when evidence supports the source relationship.

### System relationship

When the evidence implicates the design system, name the narrowest likely relationship: reuse, deepen, promote, add, or keep local. For a promotion candidate, identify the existing embedded consumer and the proposed second consumer, the shared semantics or invariants, and the likely extraction scope. Present this as an opportunity for the user to select, not as permission to refactor.

### Design question

Frame what the selected exploration must settle:

> Should this surface prioritize immediate action or comprehensive status?

A strong question can produce meaningfully different mockups. “How should this look better?” is not a design question.

### Likely lever

Name a probable avenue—hierarchy, grouping, density, typography, color role, elevation, or state treatment—without presenting it as a settled solution.

### Recommendation strength

Use one badge:

- **Strong:** clear user consequence, strong evidence, and proportionate scope;
- **Worth exploring:** credible improvement with a meaningful decision still open;
- **Speculative:** limited evidence or uncertain product consequence.

## Ordering

Order candidates by:

1. user impact;
2. recurrence;
3. confidence;
4. proportionate change scope.

Do not bury one systemic cause under many near-duplicate screen-level cards. Group recurring evidence into one candidate and show representative examples.

Keep the report selective. Three to six credible candidates are usually more useful than an exhaustive visual lint list.

## Top recommendation

End with one recommendation containing:

- candidate name;
- one sentence explaining why it should be explored first;
- the exact design question it would prototype or interview;
- a link back to its evidence.

The top recommendation is advice, not permission to proceed.

## Visual style

The report itself should demonstrate restraint:

- neutral, readable typography;
- generous but not wasteful space;
- one restrained accent plus semantic warning colors;
- clear evidence captions;
- no dashboard theatrics;
- no gradients, ornamental illustration, or animated decoration;
- responsive layout so the user can review it in a normal browser window.

The evidence carries the weight. Keep prose concise.

## Opening and handoff

Open `audit.html` with the platform-appropriate command when available. Report its absolute path in chat in case opening fails.

Summarize:

- number of candidates;
- top recommendation;
- evidence limitations.

Then ask exactly:

> Which gap would you like to explore?

Stop there. Do not start interviewing, mockups, or production edits in the same turn unless the user had already selected a gap before the report was created.
