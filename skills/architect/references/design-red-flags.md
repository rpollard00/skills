# Design red flags

Screen every candidate before synthesis. A red flag is a reason to revise or reject the shape.

## Shallow module

A shallow module exposes a large interface while hiding little complexity. Judge depth by the capability and policy hidden behind the public surface relative to the size of that surface. Prefer a simple interface backed by substantial behavior.

Do not confuse a deep module with a deep call chain. A deep call chain scatters understanding across layers. A deep module concentrates capability behind one interface.

Look for these signs:

- Callers coordinate several methods to complete one operation.
- Public options expose internal stages or implementation choices.
- Learning the interface does not save the caller from learning the implementation.

## Information leakage

Information leakage makes multiple modules depend on the same internal decision. A representation, policy, or protocol detail appears in more than one place, so changing it requires coordinated edits.

Public re-exports of transport or wire types are leakage. Parse external data into domain types behind the interface. Keep storage schemas, framework objects, and protocol details private.

Internal data exposed through public fields, getters, or import paths remains accessible. Documentation that calls it private changes nothing. Check whether callers can bypass the intended boundary or mutate state without its invariant checks. Make unintended external access fail a build or CI check. Expose required behavior through a deliberate domain operation. Documentation alone does not enforce the boundary.

Hand-synchronized lists duplicate one fact across registries, enums, dispatch tables, exports, or documentation. Ask whether adding one member requires coordinated edits elsewhere. Generate dependent lists from one authoritative source. If generation does not fit, make a build or CI check fail when the lists disagree. Separate lists with distinct domain meanings are not duplicates merely because their current values match.

## Temporal decomposition

Temporal decomposition organizes modules by execution order instead of the knowledge they own. Separate load, validate, transform, and save stages often repeat one representation and its invariants across several boundaries.

Group code around domain knowledge and ownership. Methods that run at different times can still belong to one module when they protect the same decisions.

## Pass-through method

A pass-through method forwards the same arguments to another method with the same shape. It adds a layer without hiding complexity.

Remove it or move responsibility to the module that can complete the operation. Keep a forwarding boundary only when it adds policy, adaptation, or a distinct abstraction.
