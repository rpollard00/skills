# Temporary HTML/CSS mockups

A visual mockup is throwaway HTML/CSS. It answers one design question with concrete alternatives that the user can react to.

It is not production code, a sales demo, or a miniature implementation of the whole application.

## Interface

### Inputs

- one-sentence design question
- realistic content and relevant state
- accepted product, brand, platform, accessibility, and design-system constraints
- representative narrow and wide viewports
- relevant visual evidence from the existing product, if any
- the focused temporary reference brief, when a prepared design reference is available

### Outputs

- a runnable artifact in the OS temp directory
- two to four alternatives, three by default
- a stable URL or control for each alternative
- comparable screenshots
- a concise selection question for the user
- a system delta for each alternative: reused choices, additions or changes, promotion or migration scope, exceptions, and unresolved decisions
- a concise reference rationale for each alternative: which consulted principle it applies, challenges, or finds inapplicable
- a temporary verification manifest covering every required alternative, viewport, and state

### Invariants

- Keep content, data, and state constant across alternatives.
- Make alternatives disagree about structure, hierarchy, grouping, density, or interaction, not merely color and decoration.
- Use realistic density and edge cases relevant to the question.
- Keep the artifact independent of the user's project build.
- Preserve accepted system choices unless changing one is the explicit design question.
- Consult the focused reference brief before authoring alternatives. Do not add citations to directions chosen from memory.
- Pass the mockup-readiness gate for every required alternative, viewport, and state before you present it as verified.
- Clearly label the artifact as a temporary visual mockup.
- Do not add mockup files, routes, packages, configuration, or dependencies to the user's repository.

## Temp location

Use the OS temp directory by default, or another external location the user explicitly approved. Resolve OS temp as:

- `$TMPDIR` when it is set
- `/tmp` on Unix-like systems otherwise
- `%TEMP%` on Windows

Create a fresh directory such as:

```text
<temp>/refine-ui-<project>-<timestamp>/
├── mockup.html
├── verification.md
├── assets/
└── screenshots/
    ├── a-default-390x844-light.png
    ├── a-default-1440x900-light.png
    ├── b-default-390x844-light.png
    ├── b-default-1440x900-light.png
    ├── c-default-390x844-light.png
    └── c-default-1440x900-light.png
```

Use a new timestamped directory for every exploration, so stale assets or screenshots cannot pose as current output.

Do not write under the repository and then move the files. Create them in the selected external destination from the beginning. If that directory cannot be created or the browser adapter cannot write there, stop and request another writable location outside the repository. Never fall back to the repository.

## Artifact format

Prefer one `mockup.html` with minimal JavaScript. Keep assets local to the temp directory when embedding them would be unwieldy.

The file must open directly when practical. A tiny temp-directory server is acceptable when browser security rules or module behavior require it. Do not introduce a project framework or build step unless the design question itself depends on framework behavior. That dependence is rare for a visual mockup.

### Preferred styling adapter: Tailwind Play CDN

For temporary mockups, prefer Tailwind CSS v4's development-only Play CDN when external network access is available and allowed:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style type="text/tailwindcss">
  @theme {
    /* Mockup-specific tokens derived from the selected direction. */
  }
</style>
```

This adapter is intentionally limited to throwaway temp artifacts. Never install Tailwind, add configuration, or modify dependencies in the user's repository for a mockup.

Tailwind speeds up implementation. It is not the design direction. Define deliberate mockup-specific tokens and compositions. Do not let Tailwind's default palette, spacing, card patterns, or radius choices collapse structurally different alternatives into a generic aesthetic.

Use embedded plain CSS instead when the environment is offline, forbids external requests, contains sensitive material, or cannot execute the Play CDN reliably. State the fallback in the handoff. Do not block mockup exploration merely because the CDN is unavailable.

Do not fetch other UI kits, scripts, fonts, or imagery from CDNs by default. If the existing product's typeface or imagery materially affects the question, copy only necessary, non-sensitive assets that are project-owned or explicitly licensed for reproduction in the artifact. Do not copy third-party font binaries or imagery without confirmed permission. Otherwise use a documented fallback. Do not modify the source assets.

## Required chrome

The mockup needs a small, visually subordinate control surface that:

- states "Temporary visual mockup"
- shows the one-sentence question
- names the current alternative
- switches alternatives
- keeps the alternative in a URL query parameter such as `?variant=a` when possible
- briefly reveals each alternative's thesis, main tradeoff, material system delta, and reference rationale when applicable

The control surface must not be confused with the proposed product UI. A fixed bottom toolbar usually works, but choose another neutral treatment if it obscures the design under evaluation.

## Designing alternatives

Start by naming genuinely different theses. Examples:

- persistent navigation versus contextual navigation
- status-first versus action-first hierarchy
- whitespace grouping versus surface grouping versus divider grouping
- dense operational view versus selective decision view
- linear workflow versus split-context workflow

Do not use labels such as "modern", "clean", or "premium" without saying what structural choice creates that effect.

Each alternative must be coherent on its own. Do not intentionally weaken alternatives to manufacture a winner. Include your recommendation separately rather than biasing the rendering.

### Constant fixture

Use the same fixture across all alternatives:

- exact copy
- item count and data distribution
- selected, loading, empty, or error state being evaluated
- image dimensions and availability
- user role and permissions when visible

Sanitize real data. Use representative invented data instead of copying sensitive production content.

### Scope

Render only enough surrounding context to judge the question. A navigation question needs the application shell. Sometimes one realistic form or action panel is enough for a button-hierarchy question. Do not mock the whole product.

## Implementation quality

The code can be disposable, but the visual evidence must be trustworthy.

- Use semantic HTML and keyboard-operable mock controls.
- Honor reduced motion.
- Do not use inaccessible contrast or interaction merely to explore a style.
- Let layouts reflow instead of scaling a desktop canvas down.
- Verify that alternatives work at the selected viewports.
- Surface relevant overflow and long-content behavior.
- Keep JavaScript limited to alternative and state switching.
- Do not add persistence, analytics, tests, error infrastructure, or production abstractions.

## Blocking mockup-readiness gate

Generating HTML, receiving a successful navigation response, or confirming that screenshot files exist is not verification. Complete the following gate before you call a mockup ready.

### 1. Define the verification matrix

List every required combination of:

- alternative
- representative narrow and wide viewport
- relevant default and consequential non-default state
- supported theme, when color or surfaces are part of the question
- scroll position, when the viewport cannot show all relevant content or fixed chrome behavior depends on it

Keep the matrix proportional, but never omit an alternative or the agreed narrow and wide viewports merely to finish faster. Use explicit defaults such as `state=default`, `theme=default`, and `scroll=top` rather than leaving dimensions ambiguous.

### 2. Stabilize each render

For every matrix cell:

1. Open the stable variant URL in a real browser.
2. Set the exact viewport, state, theme, and scroll position.
3. Wait for the document, Tailwind Play CDN when used, fonts, and images to finish loading. Disable or settle animation for capture.
4. Confirm the URL selected the intended alternative and that the constant fixture is intact.
5. Compute one render-input fingerprint over `mockup.html` and every local asset that can affect rendering, excluding `screenshots/` and `verification.md`. Record external dependency URLs, resolved versions when exposed, and verification time separately, because mutable CDN output cannot be proven by a local hash.

### 3. Check runtime and layout evidence

Inspect what the browser adapter exposes:

- console errors and relevant warnings
- failed script, stylesheet, font, and image loads
- `document.fonts` and image completion when available
- document width versus viewport width for accidental horizontal overflow
- relevant element bounds for clipping, off-canvas controls, and fixed-toolbar overlap
- semantic structure and keyboard operation of mockup controls
- correct variant, fixture, and state

Do not treat clean console output as visual verification.

### 4. Capture and inspect screenshots

Capture a fresh viewport screenshot for every matrix cell. Give it a unique filename that contains the alternative, state, viewport, and theme, such as `b-error-390x844-dark.png`. Add a scroll suffix when you capture multiple positions. Never let states or themes overwrite the same path. When the current model can inspect images, open every screenshot and actively look for:

- overlapping, clipped, cropped, or unexpectedly truncated content
- horizontal scroll, off-screen actions, or broken responsive reflow
- fixed controls covering product content
- missing assets, icon failures, fallback fonts, or unstyled browser defaults
- awkward wrapping, collapsed spacing, alignment drift, or inconsistent component geometry
- incorrect stacking, transparency, shadows, borders, or background seams
- unreadable contrast and hierarchy failures obvious in the render
- the wrong alternative, state, content fixture, or viewport

Judge deliberate design differences against the design question, but classify execution glitches separately. A screenshot file that was never visually opened is uninspected.

### 5. Fix and recapture

Fix every execution defect before handoff, then rerun the affected matrix cells and replace their screenshots. Any edit to shared HTML, CSS, JavaScript, tokens, fixture content, local assets, or mockup chrome invalidates all affected captures. A changed shared input normally invalidates every alternative. Reuse a row only when its render-input fingerprint and all matrix dimensions are identical. Do not present stale pre-fix screenshots.

Do not "fix" a deliberate structural difference merely because it differs from another alternative. The gate removes broken evidence. It does not choose the winning direction.

### 6. Write `verification.md`

Keep the manifest beside the mockup:

```markdown
# Mockup verification

Render-input fingerprint: ...
External dependencies: URL, resolved version if exposed, verification time
Browser adapter: ...
Visual inspector: model | user | user-required
Overall status: PASS | USER VISUAL REVIEW REQUIRED | FAIL

| Alternative | State | Viewport | Theme | Scroll | Screenshot | Input fingerprint | Screenshot SHA-256 | Runtime | Visual | Result |
|---|---|---:|---|---|---|---|---|---|---|---|
| A | default | 390×844 | light | top | screenshots/a-default-390x844-light.png | ... | ... | pass | pass | pass |

## Defects fixed
- ...

## Remaining limitations
- ...
```

`PASS` requires current screenshots, passing runtime checks, and direct visual inspection of every required cell. Immediately before granting `PASS`, recompute the complete local render-input fingerprint and confirm that it matches every row. Also record a SHA-256 for each screenshot. If an external CDN is used, verify that it loaded for every cell, and disclose that its mutable output is timestamped rather than covered by the local fingerprint.

If the model cannot inspect images, complete the runtime checks and captures, mark `USER VISUAL REVIEW REQUIRED`, and open the artifact and uniquely named screenshots for the user. List every matrix cell and give the user the same glitch checklist from step 4. Proceed only after the user explicitly verifies every named cell. Then record `Visual inspector: user` and update each cell and the overall status to `PASS`. If the user reports defects, fix and recapture first. A general preference such as "I like B" or an unscoped "looks fine" is not verification of the matrix. Do not claim the mockup is verified or ready while user review remains outstanding.

If screenshots cannot be captured, mark `FAIL`, explain the missing capability, and stop. Do not silently downgrade to source inspection for a visual mockup.

## Presenting to the user

Open the mockup when possible and provide:

- the absolute path
- the design question
- a one-sentence thesis and tradeoff for each alternative
- your recommended alternative and why
- an invitation to select, combine named traits, revise, or reject
- material consequences for token, reusable-module, extraction, or migration scope
- the consulted principles that materially influenced the recommendation, and any deliberate departure

Good feedback:

- "B's hierarchy with A's density."
- "C, but keep the persistent actions from A."
- "None. Seeing these confirms the current grouping."

Poor framing:

- "Which one looks nicest?"
- "Pick your favorite color."

Tie the choice back to the user's task and constraints.

## Consolidation

When the user combines traits, create one consolidated temp mockup if the result cannot be inferred confidently from an existing alternative. Do not silently mix unrelated decorative details.

Every consolidated or revised artifact starts unverified. Rerun all readiness-matrix cells affected by any render-input change and update `verification.md` before showing it. Reuse a prior row only when the render inputs are byte-identical and the alternative, state, viewport, theme, and scroll conditions are identical.

Record alongside the artifact, either in the HTML or a small temp note:

- the question answered
- accepted traits
- rejected traits and load-bearing reasons
- unresolved decisions
- accepted system delta, including any embedded-pattern promotion and migration scope
- date and source product surface

These exploration notes remain temporary. After explicit direction approval, translate only the accepted design rule and system delta into a provisional root `DESIGN.md` entry. Never copy the mockup, screenshots, discarded variants, or exploratory notes into the product repository.

## Cleanup and durability

Temp artifacts can disappear. Always tell the user where they are and that they are temporary.

Do not write, copy, or commit mockups to the product repository. If the user wants durable mockup evidence, ask for an approved location outside that repository. Direction approval can create or update only provisional design memory. Section 9 rendered acceptance establishes it and can add approved production visual-test baselines. Prefer recording the accepted rule and production comparison rather than preserving every discarded alternative.
