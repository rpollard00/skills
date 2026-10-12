---
name: create-verification-skill
description: "Generate a project-local verification skill that drives your app the way a user does — any language, framework, or platform. Use for /create-verification-skill, \"make a control skill for this repo\", or when a project has no scripted way to prove UI/CLI/service behavior."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Create a verification skill

Every serious project needs a scripted way to drive the real app and prove behavior: launch it, exercise a feature the way a user would, and capture evidence. This skill generates that as a project-local skill (normally `.agents/skills/verify-<app>/`, or the repository's supported skill location) tailored to the repo. You write the generator's output for the next agent, not for a human: it will be read cold, mid-task, by an agent that has never seen the app.

## 1. Interview the repo, not the user

Answer these from the codebase and only ask the user what you cannot observe:

- **Surface:** what does a user actually touch? A web UI, a CLI/TUI, a desktop app, an API, a mobile app, a library? A repo can have several; pick the primary one and note the rest.
- **Run:** how does the app become usable from empty disposable data? Prefer the repo's own documented setup and dev commands (package scripts, Makefile, README quickstart). Identify dependency installation, required services, env vars, migrations, seed/fixture creation, auth, and startup order; note ports and the intended target environment.
- **Drive:** how can an agent interact with it programmatically? Existing harnesses first — Playwright/Cypress specs, expect scripts, PTY helpers, curl-able endpoints, a debug port. Only then pick a generic recipe: browser/CDP for web and Electron, a tmux/PTY harness for CLI/TUI, plain HTTP for services.
- **Observe:** what evidence can be captured? Screenshots, terminal transcripts, response bodies, logs, exit codes, DB state.
- **Isolate:** can two instances run side by side (ports, data dirs, profiles)? If not, say so in the generated skill: refusing to double-drive a shared instance beats corrupting the user's session.

If the checkout doesn't build or start as-is, fix that first within authorized scope (or report it precisely) before generating; a skill written against a broken base teaches wrong steps. When an irrelevant missing asset blocks startup (a static dir the API never serves, a sample config), the generated skill may create it, clearly marked as verification scaffolding, and remove it in cleanup.

Missing data required by the intended user journey is a setup failure, not permission to weaken the journey. Create the required fixtures in isolated disposable state using supported setup paths, or report the unmet precondition and leave that journey unverified. Do not replace a populated-state assertion with an empty state, skip a dependent action, or select an easier feature merely because fixtures are missing.

If the intended target is unavailable and an authorized substitute environment is used, enumerate its complete bootstrap: runtime/tool versions, dependency installation, backing services, configuration, migrations, seed/fixture commands, build and launch commands, and any deviations from the target. Keep substitute-run evidence separate from target claims. Label the target setup **unverified** until those setup instructions and the intended journey have been exercised on the actual target; success in a substitute does not establish target readiness.

## 2. Generate the skill

Select the project-local skill location supported by its target harnesses. Write `<skill-dir>/verify-<app>/SKILL.md` with YAML frontmatter (`name: verify-<app>` and a `description` that names the app, the surface, and when to reach for it — without frontmatter the skill never registers) and these sections, each grounded in what the interview actually found (no placeholders left):

- **Launch:** exact ordered commands to bootstrap empty disposable data, apply required migrations, create the mapped journey's seed/fixtures, and start the app. Define readiness as a usable state for that journey: the real user surface loads or responds, auth works where required, and the expected fixture state is observable. A startup log, listening port, health response, or prompt alone is insufficient. Include teardown. For a short-lived CLI or TUI there is no server to keep alive: build the binary (or install deps) once, prepare its disposable state, then start each drive in its own isolated PTY or tmux session and check the usable command/prompt state.
- **Doctor:** one read-only check that answers "is this instance worth driving?" — process up, right version/build, port owned by us where applicable, auth valid, required migrations applied, and expected fixtures accessible through the real user surface. It must fail when the app answers but the mapped journey's preconditions are unmet. An agent runs this first whenever anything looks off.
- **Drive:** the harness recipe with real selectors/commands from this repo, not examples. Prefer stable handles (ARIA labels, data attributes, prompt strings, route paths) over coordinates and tab order.
- **Evidence:** what to capture for a proof and where it goes. State the proof standards: exercise the real user path, not internal setters or test-only endpoints; capture the action and the resulting state, not just the final screen; verify side effects (files written, rows inserted, messages sent) alongside what's visible; mocks only where a production boundary already isolates the external system. When the safe path is a dry-run or test mode, verify what it actually skips by observing (files, network, git refs) rather than trusting its name: some dry-runs still touch the network or open a browser.
- **Cleanup:** how to tear down instances the run created. Never kill by process name; kill what you started. Cleanup removes instances and scratch state, never the evidence: proof artifacts survive the teardown, in a location the skill names.
- **Helpers:** any script the skill ships is executable and its invocation is shown in the skill body. A helper the reader has to reverse-engineer is not a helper.

## 3. Seed the feature map

Create `<skill-dir>/verify-<app>/features/README.md` plus one file per user-facing feature you can identify (aim for the top 3-5 to start, from routes, commands, menus, or docs). Follow the shape in [`references/feature-map-example/`](references/feature-map-example), with a README index and one file per feature. Each file answers, from the user's point of view: what the feature is, how to reach it, how to drive it with the harness, and what observable end state proves it works. The four H2s are `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, and `Gotchas`. The map is the repo's maintained verification source; a proof that drives one convenient entry point is incomplete when the map lists others.

## 4. Prove the generated skill before handing it over

Run its own instructions end to end once, starting from empty disposable data rather than a previously initialized database or data directory: bootstrap, migrate, seed, launch, doctor, drive ONE mapped feature (one is enough; the map exists so later runs can cover the rest), capture evidence, clean up. Choose the feature before setup and preserve its intended journey and assertions if fixtures are missing. Record the environment and successful setup commands with the proof. After cleanup, confirm the evidence still exists at the named location — a cleanup that eats the proof fails this step. Fix what fails, and run the generated cleanup after every failed iteration too, so broken attempts don't strand processes and ports. A generated skill that was never executed is a draft, not a deliverable; one exercised only in a substitute environment must retain the explicit target-setup-unverified label.

## 5. Offer the maintenance loop

Point the user at `/maintain-verification-skill` for keeping the map honest as the app changes. Suggest a cadence only if they ask.
