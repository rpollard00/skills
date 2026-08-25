# Design Discipline

Use this priority order to diagnose and create UI. It is an independently written working discipline informed by practical interface-design literature, including Adam Wathan and Steve Schoger's *Refactoring UI*. It is not a substitute for the book.

## Rendered evidence first

A source value is not a visual result. Cascades, inherited styles, fonts, content density, viewport size, and neighboring elements determine what users see.

- Inspect the running interface when possible.
- Diagnose observable effects before prescribing source edits.
- Compare changes under identical rendered conditions.
- Treat static-analysis findings as leads, not visual defects by definition.

## Priority order

Work from structural questions toward decoration. Do not polish a hierarchy that is still wrong.

### 1. User task and content

- What is the user here to decide, understand, or do?
- What information is essential to that task?
- Is the interface organized around the feature or around a convenient layout template?
- Does realistic content reveal missing space, weak grouping, or inappropriate density?

Prefer real domain language and representative data over placeholder copy. A sparse mockup cannot validate a data-dense product.

### 2. Information and visual hierarchy

- What should attract attention first, second, and third?
- Does the order survive grayscale and squint tests?
- Are secondary labels, metadata, and actions competing with primary content?
- Are size, weight, contrast, and placement working together deliberately rather than all being maximized?

De-emphasize to emphasize. Not every important distinction requires making its primary element larger.

Keep required form labels and accessible names. Advice to reduce labels applies to redundant presentation labels, not controls whose purpose would become ambiguous.

### 3. Composition, grouping, and spacing

- Do proximity and alignment express relationships?
- Is space within a group smaller than space between groups?
- Is the page filling width merely because width is available?
- Does the layout match content and task rather than a default grid?
- Is density appropriate for expertise and frequency of use?

Start with generous space, then remove it where information density earns its place. A constrained spacing scale is a decision aid, not a ban on optical correction.

### 4. Typography

- Is line length comfortable for the reading task?
- Do type size, weight, line height, and letter spacing form a coherent scale?
- Are headings and body copy tuned for their different jobs?
- Are baselines and text edges aligned where the eye expects them?
- Are too many fonts or weights creating noise?

Typography carries hierarchy before color is added.

### 5. Color and contrast

- Does the interface work before brand color does the hierarchy's job?
- Are neutral, primary, and semantic colors systematic enough for actual product states?
- Does colored text remain legible on colored surfaces?
- Is meaning available without color alone?
- Do foreground/background pairs meet the project's accessibility target?

Do not create arbitrary shades because an existing shade is slightly inconvenient. Do not preserve a token scale that fails in real composition merely for mathematical neatness.

### 6. Surfaces, borders, and depth

- Is separation necessary, or would spacing or background contrast work better?
- Are borders being used around everything by default?
- Does elevation correspond to actual layering and interaction?
- Are shadows consistent with an implied light source?
- If every element floats, which one is actually elevated?

Use fewer borders. Prefer the least decoration that makes structure clear.

### 7. Images and icons

- Is imagery carrying useful content or generic decoration?
- Are crops, aspect ratios, and intended display sizes controlled?
- Does text remain legible over variable images?
- Are icon style, stroke, size, and alignment coherent?
- Are user-uploaded and missing assets handled?

### 8. States, responsiveness, and motion

- Does the composition survive realistic narrow and wide widths?
- Are loading, empty, error, disabled, selected, hover, and focus states designed rather than inherited accidentally?
- Does long or localized text break the intended hierarchy?
- Does motion explain cause, continuity, or status?
- Is reduced motion respected?

## Local versus systemic change

A recurring visual symptom may originate at different levels:

- **Content:** order, labels, density, or missing information.
- **Composition:** one screen combines sound primitives poorly.
- **Primitive:** a reusable control or pattern encodes the wrong hierarchy.
- **Token:** the available choices make inconsistency likely.
- **Asset:** imagery or icon treatment breaks the system.
- **Interaction/state:** the default looks correct but behavior states do not.

Require repeated evidence before calling a problem systemic. When the cause is systemic, validate the proposed system change on one representative production composition before broad migration.

## Personality and context

Do not default to a generic agent aesthetic: purple gradients, uniformly rounded cards, excessive shadows, ornamental blobs, sparse dashboard tiles, or every section inside a container.

Establish contextual dials instead:

- formal ↔ casual;
- reserved ↔ expressive;
- spacious ↔ dense;
- familiar ↔ distinctive;
- editorial ↔ utilitarian.

These are not independent style controls. A trusted financial workflow, a children's learning app, and an expert operations console need different evidence of quality.

## Accessibility floor

At every phase preserve or improve:

- semantic structure and accessible names;
- visible keyboard focus;
- usable keyboard order;
- sufficient contrast;
- non-color status cues;
- touch target size appropriate to platform;
- zoom and text resizing;
- reduced-motion preferences;
- understandable errors and state changes.

An attractive inaccessible mockup is not a viable direction.

## Practical visual tests

Use these as observations, not scores:

- **Squint/blur:** does the intended attention order remain?
- **Grayscale:** is color compensating for weak hierarchy?
- **Reading order:** does the eye encounter information in task order?
- **Proximity:** are group relationships unambiguous?
- **Density:** does representative content still fit the composition?
- **Edge cases:** do long text, missing assets, and error states remain coherent?
- **Repetition:** does the same treatment mean the same thing across surfaces?

Do not produce a numeric design score. State the evidence, consequence, confidence, and decision that follows.
