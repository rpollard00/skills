---
name: setup-skills-sync
description: Install and verify this skills bundle's user-scoped systemd service and timer for automatic updates.
---

# Set up skills sync

Configure the existing updater:

1. Resolve `~/.agents/skills/reese`. Use its target's parent as the checkout. If absent, use the current Git root.
2. Verify `scripts/sync_skills.py` and `scripts/systemd/reese-skills-sync.{service,timer}` exist there. If the bundle is absent, run `scripts/link-skills.sh --apply` from that checkout.
3. Read the checkout's `README.md`, “Automatic updates with systemd.” Install missing launcher and units per that recipe. Reuse matching paths. Stop before replacement of foreign paths.
4. Validate installed units with `systemd-analyze --user verify ~/.config/systemd/user/reese-skills-sync.{service,timer}`. Reload user systemd, enable the timer, and start the service per the recipe.
5. Inspect the service journal and timer status. Accept local or ahead skips as expected. Never reset local work.
