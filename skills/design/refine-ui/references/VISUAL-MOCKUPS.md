# Temporary HTML/CSS Mockups

A visual mockup is throwaway HTML/CSS that answers one design question by giving the user concrete alternatives to react to.

It is not production code, a sales demo, or a miniature implementation of the whole application.

## Interface

### Inputs

- one-sentence design question;
- realistic content and relevant state;
- accepted product, brand, platform, accessibility, and design-system constraints;
- representative narrow and wide viewports;
- relevant visual evidence from the existing product, if any;
- the focused temporary reference brief when a prepared design reference is available.

### Outputs

- a runnable artifact in the OS temp directory;
- two to four alternatives, three by default;
- a stable URL or control for each alternative;
- comparable screenshots;
- a concise selection question for the user;
- a system delta for each alternative: reused choices, additions or changes, promotion or migration scope, exceptions, and unresolved decisions;
- a concise reference rationale for each alternative: which consulted principle it applies, challenges, or finds inapplicable.

### Invariants

- Keep content, data, and state constant across alternatives.
- Make alternatives disagree about structure, hierarchy, grouping, density, or interaction—not merely color and decoration.
- Use realistic density and edge cases relevant to the question.
- Keep the artifact independent of the user's project build.
- Preserve accepted system choices unless changing one is the explicit design question.
- Consult the focused reference brief before authoring alternatives; do not retrofit citations onto directions chosen from memory.
- Inspect every alternative in a browser before presenting it.
- Clearly label the artifact as a temporary visual mockup.
- Do not add mockup files, routes, packages, configuration, or dependencies to the user's repository.

## Temp location

Resolve the OS temp directory:

- `$TMPDIR` when set;
- otherwise `/tmp` on Unix-like systems;
- `%TEMP%` on Windows.

Create a fresh directory such as:

```text
<temp>/refine-ui-<project>-<timestamp>/
├── mockup.html
├── assets/
└── screenshots/
    ├── a-narrow.png
    ├── a-wide.png
    ├── b-narrow.png
    └── b-wide.png
```

Use a new timestamped directory for every exploration so stale assets or screenshots cannot masquerade as current output.

Do not write under the repository and then move the files. Create them in temp from the beginning. If the temp directory cannot be created or the browser adapter cannot write there, stop and request another writable location outside the repository. Never fall back to the repository.

## Artifact format

Prefer one `mockup.html` with minimal JavaScript. Keep assets local to the temp directory when embedding them would be unwieldy.

The file should open directly when practical. A tiny temp-directory server is acceptable when browser security rules or module behavior require it. Do not introduce a project framework or build step unless the design question itself depends on framework behavior—which should be rare for a visual mockup.

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

This is intentionally limited to throwaway temp artifacts. Never install Tailwind, add configuration, or modify dependencies in the user's repository for a mockup.

Tailwind is an implementation accelerator, not the design direction. Define deliberate mockup-specific tokens and compositions; do not let Tailwind's default palette, spacing, card patterns, or radius choices collapse structurally different alternatives into a generic aesthetic.

Use embedded plain CSS instead when the environment is offline, forbids external requests, contains sensitive material, or cannot execute the Play CDN reliably. State the fallback in the handoff. Do not block mockup exploration merely because the CDN is unavailable.

Do not fetch other UI kits, scripts, fonts, or imagery from CDNs by default. If the existing product's typeface or imagery materially affects the question, copy only necessary, non-sensitive assets that are project-owned or explicitly licensed for reproduction in the artifact. Do not copy third-party font binaries or imagery without confirmed permission. Otherwise use a documented fallback. Do not modify the source assets.

## Required chrome

The mockup needs a small, visually subordinate control surface that:

- states “Temporary visual mockup”;
- shows the one-sentence question;
- names the current alternative;
- switches alternatives;
- keeps the alternative in a URL query parameter such as `?variant=a` when possible;
- briefly reveals each alternative's thesis, main tradeoff, material system delta, and reference rationale when applicable.

The control surface must not be confused with the proposed product UI. A fixed bottom toolbar usually works, but choose another neutral treatment if it obscures the design being evaluated.

## Designing alternatives

Start by naming genuinely different theses. Examples:

- persistent navigation versus contextual navigation;
- status-first versus action-first hierarchy;
- whitespace grouping versus surface grouping versus divider grouping;
- dense operational view versus selective decision view;
- linear workflow versus split-context workflow.

Do not use labels such as “modern,” “clean,” or “premium” without saying what structural choice creates that effect.

Each alternative should be coherent on its own. Do not intentionally weaken alternatives to manufacture a winner. Include your recommendation separately rather than biasing the rendering.

### Constant fixture

Use the same fixture across all alternatives:

- exact copy;
- item count and data distribution;
- selected, loading, empty, or error state being evaluated;
- image dimensions and availability;
- user role and permissions when visible.

Sanitize real data. Representative invented data is better than copying sensitive production content.

### Scope

Render only enough surrounding context to judge the question. A navigation question needs the application shell; a button-hierarchy question may need one realistic form or action panel. Do not mock the whole product.

## Implementation quality

The code may be disposable, but the visual evidence must be trustworthy.

- Use semantic HTML and keyboard-operable mock controls.
- Honor reduced motion.
- Avoid inaccessible contrast or interaction merely to explore a style.
- Let layouts reflow instead of scaling a desktop canvas down.
- Ensure alternatives work at the selected viewports.
- Surface relevant overflow and long-content behavior.
- Keep JavaScript limited to alternative and state switching.
- Do not add persistence, analytics, tests, error infrastructure, or production abstractions.

## Browser inspection

For each alternative:

1. Open its stable URL.
2. Set the representative viewport.
3. Confirm the correct alternative and fixture are visible.
4. Inspect for broken assets, overflow, console errors, and accidental toolbar overlap.
5. Capture a viewport screenshot.
6. Repeat for the other representative viewport and relevant state.

Use identical conditions across alternatives. If a model can inspect images, critique the screenshots against the design question before showing them to the user. Fix execution mistakes, but do not collapse deliberate differences.

## Presenting to the user

Open the mockup when possible and provide:

- the absolute path;
- the design question;
- a one-sentence thesis and tradeoff for each alternative;
- your recommended alternative and why;
- an invitation to select, combine named traits, revise, or reject;
- material consequences for token, reusable-module, extraction, or migration scope;
- the consulted principles that materially influenced the recommendation and any deliberate departure.

Good feedback:

- “B's hierarchy with A's density.”
- “C, but keep the persistent actions from A.”
- “None; seeing these confirms the current grouping.”

Poor framing:

- “Which one looks nicest?”
- “Pick your favorite color.”

Tie the choice back to the user's task and constraints.

## Consolidation

When the user combines traits, create one consolidated temp mockup if the result cannot be inferred confidently from an existing alternative. Do not silently mix unrelated decorative details.

Record alongside the artifact, either in the HTML or a small temp note:

- the question answered;
- accepted traits;
- rejected traits and load-bearing reasons;
- unresolved decisions;
- accepted system delta, including any embedded-pattern promotion and migration scope;
- date and source product surface.

These exploration notes remain temporary. After explicit direction approval, translate only the accepted design rule and system delta into a provisional root `DESIGN.md` entry; never copy the mockup, screenshots, discarded variants, or exploratory notes into the product repository.

## Cleanup and durability

Temp artifacts can disappear. Always tell the user where they are and that they are temporary.

Do not write, copy, or commit mockups to the product repository. If the user wants durable mockup evidence, ask for an approved location outside that repository. Direction approval may create or update only provisional design memory; section 9 rendered acceptance establishes it and may add approved production visual-test baselines. Prefer recording the accepted rule and production comparison rather than preserving every discarded alternative.
