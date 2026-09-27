# Design discipline

Use this priority order to diagnose and create UI. It is an independently written working discipline informed by practical interface-design literature, including Adam Wathan and Steve Schoger's *Refactoring UI*. It is not a substitute for the book. When a prepared licensed reference cache is available, complete the targeted consultation in [PDF-REFERENCE.md](PDF-REFERENCE.md) instead of relying on this summary or model memory alone.

## Compose from the task

For new UI or an authorized redesign, choose content before choosing the page shell or component arrangement:

1. Identify the primary user task and representative data. Select the facts, controls, and outcomes needed to complete it.
2. Group content by the question or action it supports. Place each fact where users need it, including relevant detail and recovery contexts.
3. Set the hierarchy and interaction for each group. Decide what needs a label, value, action, or explanation before writing the copy.
4. Define what each consequential state makes available, unknown, or actionable. Choose components that express those relationships instead of filling a predetermined set of slots.

Establish the primary task region with realistic content before elaborating the surrounding page. Reuse accepted shells, components, and project rules for scoped work. These choices do not require a separate document, mockup, or approval gate. Carry consequential choices into the caller's existing plan or implementation brief when useful.

## Rendered evidence first

A source value is not a visual result. Cascades, inherited styles, fonts, content density, viewport size, and neighboring elements determine what users see.

- Inspect the running interface when possible.
- Diagnose observable effects before you prescribe source edits.
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

Labels identify controls and values. Actions name outcomes. Add explanation only for a specific ambiguity, consequence, or recovery need.

Implementation constraints do not belong in UI copy.

Give each fact one primary home near the decision it supports. If the context already conveys the meaning, omit the explanation. Optional component slots do not require text. Repeat information when another task context needs it.

State concrete consequences of uncertainty or restrictions where they affect users. Preserve meaningful warnings, risk, status, accessible names, and required terms. Brevity must not hide them.

Present data in the user's terms with the required precision and units. Preserve identifiers needed for lookup or communication. Raw fields, literal nulls, and duplicate formats need a task-specific purpose.

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

Preserve density appropriate to the task, expertise, and frequency of use. More space is not automatically better. A constrained spacing scale is a decision aid, not a ban on optical correction.

Separate content selection from its presentation. A card can group useful content yet use too much space. A sidebar can provide suitable navigation yet need different treatment at narrow widths. Adjust dimensions, spacing, grouping, or order when the content is useful but the composition obstructs the task. An item below the initial viewport is not, by itself, evidence of filler.

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
- Do foreground and background pairs meet the project's accessibility target?

Do not create arbitrary shades because an existing shade is slightly inconvenient. Do not preserve a token scale that fails in real composition merely for mathematical neatness.

### 6. Surfaces, borders, and depth

- Is separation necessary, or would spacing or background contrast work better?
- Are borders used around everything by default?
- Does elevation correspond to actual layering and interaction?
- Are shadows consistent with an implied light source?
- If every element floats, which one is actually elevated?

For each container, ask what relationship or interaction becomes unclear if it disappears. Prefer the least decoration that makes structure clear. Do not add cards, banners, or dashboard panels just to fill a layout.

### 7. Images and icons

- Does imagery carry useful content or generic decoration?
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

An empty dataset has different recovery options from a filter that matches nothing. Preserve filters or reset controls that can recover results. Remove data-dependent controls and framing that cannot help in the current state. A known zero can still answer a useful question; missing or unavailable data must not masquerade as zero. Keep the explanation near the affected value or recovery action rather than filling the page with repeated warnings.

## Local versus systemic change

A recurring visual symptom can originate at different levels:

- **Content.** Order, labels, density, or missing information.
- **Composition.** One screen combines sound primitives poorly.
- **Primitive.** A reusable control or pattern encodes the wrong hierarchy.
- **Token.** The available choices make inconsistency likely.
- **Asset.** Imagery or icon treatment breaks the system.
- **Interaction and state.** The default looks correct but behavior states do not.

Require repeated evidence before you call a problem systemic. When the cause is systemic, validate the proposed system change on one representative production composition before broad migration.

A reusable opportunity can already exist inside a tightly coupled screen element. Treat it as an embedded pattern, not automatically as a reusable primitive. Offer promotion only when its current usage and the proposed refined usage are two concrete consumers of the same semantics, states, and invariants. Also require a small interface that hides meaningful design or behavior complexity. Otherwise keep the composition local instead of extracting cosmetic flags.

## Personality and context

Do not default to a generic agent aesthetic: purple gradients, uniformly rounded cards, excessive shadows, ornamental blobs, sparse dashboard tiles, or every section inside a container.

Establish contextual dials instead:

- formal ↔ casual
- reserved ↔ expressive
- spacious ↔ dense
- familiar ↔ distinctive
- editorial ↔ utilitarian

These are not independent style controls. A trusted financial workflow, a children's learning app, and an expert operations console need different evidence of quality.

## Accessibility floor

At every phase, preserve or improve:

- semantic structure and accessible names
- visible keyboard focus
- usable keyboard order
- sufficient contrast
- non-color status cues
- touch target size appropriate to platform
- zoom and text resizing
- reduced-motion preferences
- understandable errors and state changes

An attractive inaccessible mockup is not a viable direction.

## Practical visual tests

Use these as observations, not scores:

- **Squint or blur.** Does the intended attention order remain?
- **Grayscale.** Is color compensating for weak hierarchy?
- **Reading order.** Does the eye encounter information in task order?
- **Proximity.** Are group relationships unambiguous?
- **Density.** Does representative content still fit the composition?
- **Edge cases.** Do long text, missing assets, and error states remain coherent?
- **Repetition.** Does the same treatment mean the same thing across surfaces?

Do not produce a numeric design score. State the evidence, consequence, confidence, and decision that follows.
