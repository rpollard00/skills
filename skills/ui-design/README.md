# UI design

An explicit-only shared discipline for UI investigation, planning, implementation, and verification. Read [SKILL.md](SKILL.md) directly or load it as a dependency. Install it beside the other skills in this bundle.

[refine-ui](../refine-ui/SKILL.md) adds the interactive workflow and human gates. Mako's applicable UI routes load this discipline without forcing that workflow.

## References

- [Design discipline](references/DESIGN-DISCIPLINE.md): task, content, hierarchy, composition, and accessibility.
- [Design system](references/DESIGN-SYSTEM.md): reuse, promotion, and useful design memory under the caller's authority.
- [Browser observation](references/BROWSER-OBSERVATION.md): runtime evidence, stable captures, image inspection, and capability gaps.
- [Visual mockups](references/VISUAL-MOCKUPS.md): optional temporary artifacts with required rendered verification when used.
- [Licensed references](references/PDF-REFERENCE.md): targeted consultation, private cache discovery, and copyright limits.

## PDF helper

Run the [helper](scripts/extract-pdf-reference.sh) with `--help` for its options. It uses existing Poppler tools and writes new caches under this skill's ignored `.artifacts/pdf/` directory. `--output-dir` overrides `UI_DESIGN_ARTIFACTS_DIR`, which overrides the legacy `REFINE_UI_ARTIFACTS_DIR` fallback.

Existing caches under the sibling `refine-ui/.artifacts/pdf/` remain discoverable and reusable in place. Do not move or copy them during extraction of this skill. Never include private caches when distributing the bundle. Reports, screenshots, and mockups belong outside the product repository.
