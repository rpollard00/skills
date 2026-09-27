# Design discipline

Use this priority order to diagnose and create UI. It is an independently written working discipline informed by practical interface-design literature, including Adam Wathan and Steve Schoger's *Refactoring UI*. It is not a substitute for the book. When a prepared licensed reference cache is available, complete the targeted consultation in [PDF-REFERENCE.md](PDF-REFERENCE.md) instead of relying on this summary or model memory alone.

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

Set the control, hierarchy, grouping, and interaction before adding explanation. For each text element, ask what becomes unclear if it disappears. Try a precise label or better placement before a paragraph. Keep explanation for the ambiguity that remains.

Do not turn implementation requirements into visible disclaimers or narrate every default. Summarize active restrictions at the decision they affect. Show actions available in the current state, with reasons or recovery paths where unavailable actions matter. Preserve consequential uncertainty, risk, status, warnings, accessible names, and required terms.

Give each fact one primary place near the decision it supports. An eyebrow, title, and subtitle do not each need to announce the same subject. A chart caption can explain its unit, scope, or uncertainty without narrating what the heading and axes already show. Repeat information when another task context needs it, not to fill a standard layout slot.

Data fidelity does not require a visible copy of the storage schema. Use one readable representation with the required precision and units. Keep exact identifiers when they support lookup or communication. Put diagnostic fields and additional formats behind a useful disclosure, or omit them when no user task needs them. A developer tool can legitimately require raw values; an operational screen does not inherit that requirement merely because an API supplies them.

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

## Content-removal pass

Before delivery, review the rendered result specifically for content and structure that can disappear:

1. Inspect the required viewports and states, including the initial view and relevant details or recovery states.
2. Identify repeated orientation, restated labels, obvious chart narration, diagnostic data, and empty containers as removal candidates.
3. For each candidate, name the user task or distinction that would fail without it. Accuracy alone does not justify inclusion.
4. Within writable scope, remove candidates with no such purpose. Improve a label or placement before adding replacement explanation.
5. Recheck orientation, data meaning, warnings, accessible names, and recovery actions. Recapture every state affected by an edit.

Respect read-only scope, accepted project constraints, and fixed parity baselines. Return out-of-scope findings instead of editing them. Do not force deletions, impose a word quota, or remove useful brand expression to make the result look sparse. The deliverable is the improved interface, not a mandatory inventory of every retained sentence.

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
