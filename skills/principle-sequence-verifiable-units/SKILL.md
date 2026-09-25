---
name: principle-sequence-verifiable-units
description: "Apply to multi-step work (sweeps, migrations, runs of similar edits) and to how you stack commits and PRs. Break work into small units that each end in a verifiable state, check each before the next, and order delivery so the sequence proves itself to a reviewer."
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Sequence work into verifiable units

Order work as a sequence of small units, each ending in a state you can check, and do not advance until the current unit meets its declared verification boundary. A preserved bug reproduction intentionally proves failure before the fix.

**Why:** A break caught at the unit that caused it is cheap to localize. A break caught after a batch is buried, and you have already built further on a broken base. Sequencing those same units into a delivery a reviewer can replay turns "trust me" into "watch it go red, then green."

**Execution.** In a sweep, migration, or any run of similar edits, verify each change before starting the next. Each unit is a before/after bracket: known-good state, one change, run the check, then proceed. Establish the actual baseline and preserve user work. Rebase only when the task or delivery process requires it, using the repository's version-control model. When a lever does the edits, the per-unit check is nearly free. Run it anyway.

**Delivery.** Stack commits and PRs in the order that proves the work. The canonical shape is the failing test first, then the fix on top. Other story orders are a subtraction before the reshape, a baseline capture before the treatment, the scaffold before the feature. Preserve separate failing-check and fix commits/changes for bug fixes; they need not merge independently. Align migration units with declared boundaries. The sequence reads as an argument.

The sequencing complement to the `principle-prove-it-works` principle skill, which keeps each check real, and the `principle-build-the-lever` principle skill, which makes the per-unit check cheap.
