# Browser Observation

Use browser tools through a capability interface rather than depending on one vendor or exact tool name.

## Required capabilities

Seek the strongest available combination of:

- launch or attach to a browser;
- list and select pages;
- navigate and wait for stable content;
- inspect semantic page structure;
- interact with elements;
- resize or emulate a viewport and input mode;
- capture viewport, full-page, and element screenshots;
- evaluate JavaScript and computed styles;
- inspect console output when rendering appears broken.

Chrome DevTools MCP, Playwright MCP/CLI, Puppeteer, Cypress, and project-specific browser harnesses can all act as adapters. Prefer what is already configured and suitable for the task.

## Discover before declaring unavailable

1. Inspect the tools currently exposed by the harness.
2. If MCP discovery exists, search for terms such as `browser`, `chrome`, `devtools`, `playwright`, `navigate`, `snapshot`, `screenshot`, and `resize`.
3. Inspect repository manifests and tests for browser dependencies and existing commands.
4. Check whether a development or component-catalog command is documented.
5. Ask before installing, downloading a browser, changing MCP configuration, or opening a remote service.

Do not treat the absence of a tool named `browser` as proof that browser observation is unavailable.

## Evidence roles

Use each representation for what it does well.

### Semantic snapshot

Use for:

- understanding interactive structure;
- identifying controls by role and accessible name;
- navigation, clicking, filling, and keyboard operation;
- checking reading and focus order;
- avoiding coordinate guessing.

Refresh the snapshot after navigation or meaningful DOM changes because element references may become stale.

### Screenshot

Use for:

- hierarchy, composition, spacing, typography, color, and depth;
- canvas, charts, images, and visual clipping;
- before/after comparison;
- communicating evidence to the user.

A full-page screenshot is useful for overview, but viewport screenshots and focused crops are usually better for judging an interface at its intended size.

### Script evaluation and computed styles

Use for:

- identifying rendered fonts, sizes, colors, gaps, radii, borders, and shadows;
- measuring bounds, line lengths, overflow, and contrast inputs;
- grouping frequently rendered values during design-system investigation;
- disabling animation for stable capture when safe;
- confirming that an apparent issue is not a loading or runtime failure.

Do not label every uncommon computed value a defect. Optical adjustments and content-driven sizing can be intentional.

## Interaction rule

> Navigate and interact semantically; judge appearance visually.

Prefer roles, labels, text, and snapshot references. Use coordinate interaction only when semantic targets are unavailable, such as canvas content or a genuinely visual control. Never use image coordinates merely because screenshots are available.

## Stable capture protocol

For every baseline and comparison, record or control:

- URL and route parameters;
- a non-secret authentication descriptor such as account role, fixture name, or isolated-profile identifier;
- fixture or data state;
- viewport dimensions and device scale when exposed;
- theme and color scheme;
- reduced-motion setting;
- font and image loading;
- scroll position;
- open menus, dialogs, selections, and hover/focus state;
- current time or randomized content when it affects rendering.

Wait for the app to settle. Capture the same conditions after implementation. If exact determinism is impossible, state the difference instead of presenting the images as a strict comparison.

## Suggested observation matrix

Infer the smallest matrix that represents the scoped user experience. It often includes:

- one narrow and one wide viewport;
- the default state;
- the most consequential non-default state;
- each supported theme when the selected gap involves color or surface treatment.

Do not mechanically capture every route, viewport, and state. Evidence collection should remain proportional to the decision.

## Vision capability

If the current model accepts images, inspect screenshots directly. If not:

- use semantic snapshots and computed styles for facts;
- still capture screenshots for the user;
- ask the user to judge visual alternatives;
- lower confidence on aesthetic findings that cannot be verified visually.

Do not pretend that file dimensions, OCR, a DOM tree, or CSS values amount to visual inspection.

## Mockup verification

Temporary mockups have a stricter handoff requirement than source-only diagnosis. Follow the blocking gate in [VISUAL-MOCKUPS.md](VISUAL-MOCKUPS.md): capture every required alternative, viewport, and state; inspect runtime and layout evidence; visually open every screenshot when vision is available; fix and recapture defects; and write the temporary verification manifest.

If the current model lacks vision, objective browser checks may establish runtime health but not visual readiness. Capture the screenshots, mark user visual review as required, and wait for that review before asking the user to choose a direction. If screenshot capture itself is unavailable, do not claim the mockup is ready.

## Privacy and browser profiles

Browser automation can expose everything visible to the controlled profile.

- Prefer an isolated or app-specific profile for observation.
- Connect to the user's normal browser only when they explicitly choose to share its state.
- Avoid unrelated tabs, password managers, personal accounts, and production data.
- Do not place cookies, tokens, serialized storage state, credentials, screenshots containing sensitive data, or network dumps in notes, reports, or mockup directories.
- Control authentication material only through the browser adapter's protected profile or storage mechanism. Record a non-secret descriptor for reproducibility, never the material itself.
- If authenticated state is necessary, use the least-sensitive available development account and keep its state in the tool's protected cache rather than the artifact directory.

## Application startup

Use documented project commands. If none exist, infer the narrowest likely development command from manifests and configuration. Avoid changing dependencies merely to launch the UI.

Run servers so their lifecycle is clear. Report the command and URL. Stop processes you started when they are no longer needed unless the user asks to keep them running.

## Failure modes

- **Blank or broken screenshot:** inspect console and network before judging design.
- **Missing fonts/assets:** wait or correct the development environment before comparing typography.
- **Authentication wall:** ask for a safe access approach; do not bypass it.
- **Unstable data:** use an existing fixture or controlled state if available.
- **No browser capability:** continue with supplied screenshots or source analysis and mark the report lower-confidence.
