# Licensed PDF reference

Use a PDF only when the user supplies a path to a copy they are authorized to use. The skill does not bundle, fetch, reconstruct, or distribute *Refactoring UI* or any other copyrighted reference.

## Optional source, mandatory consultation

A source PDF is optional. When a validated page-labelled text cache is already available, or the user supplies an authorized source, consultation is a mandatory workflow checkpoint. Run it before you diagnose gaps, recommend a selected direction, or construct mockups. Page images strengthen visual interpretation but are not required for the text-search checkpoint.

Do not claim to apply *Refactoring UI* from memory while skipping an available local reference. The independent design discipline supplies a fallback when no prepared source exists. It does not replace targeted source consultation when one exists.

## Why preprocessing is needed

Do not assume the harness or current model can read PDFs natively. For a visual book, text extraction alone also loses essential before/after examples.

Use two representations:

- extracted text to locate relevant sections
- rendered page images for visual inspection by an image-capable model or the user

## Prepared-cache discovery

Before asking for a PDF path or running extraction, inspect the installed skill's `.artifacts/pdf/` directory for `*/reference.md` and `*/manifest.txt`.

- A usable text cache has a `manifest.txt` and page-labelled `reference.md` whose page headings match `page_count`. It is sufficient for mandatory searching even when some or all PNGs are absent.
- If one usable text cache exists, reuse it without requiring the source PDF.
- If several usable caches exist, inspect their manifests and select the edition relevant to the user's request. Ask only when the intended edition remains ambiguous.
- A complete visual cache additionally has `page_count` matching PNGs under `pages/`. Use those images when relevant, but do not classify a valid text cache as unavailable merely because they are absent.
- Do not load the full Markdown file or image directory while discovering caches. Read manifest metadata first, and count headings or images without opening their contents.
- Run text extraction only when no suitable text cache exists, the user supplies another authorized edition, or regeneration is required. Render matching pages only when visual inspection matters and the authorized source remains available. Otherwise continue with text and state the visual limitation.

## Extraction helper

Use the bundled script from the skill directory:

```bash
./scripts/extract-pdf-reference.sh "/path/to/reference.pdf"
./scripts/extract-pdf-reference.sh --render-all "/path/to/reference.pdf"
./scripts/extract-pdf-reference.sh --pages 42-46 "/path/to/reference.pdf"
```

The first command creates raw text, page-labelled Markdown, and metadata. The second caches every page as a 144-DPI PNG. The third reuses the indexes and renders only the requested inclusive page range. Cached all-page rendering is idempotent at the same DPI. A cache uses one DPI consistently. Pass `--force` to replace it at another resolution.

The script requires existing Poppler tools:

- `pdfinfo`
- `pdftotext`
- `pdftoppm`, only when rendering pages

It also requires `sha256sum` or `shasum`. Do not install missing tools without approval.

Run `./scripts/extract-pdf-reference.sh --help` for output overrides, force regeneration, DPI control, and cleanup.

## Private artifact cache

By default the helper writes beside the installed skill:

```text
<skill-directory>/.artifacts/pdf/<sanitized-name>-<content-hash>/
├── manifest.txt
├── metadata.txt
├── reference.md
├── reference.txt
└── pages/
    ├── page-001.png
    └── ...
```

The source PDF is never copied. A content hash separates editions without putting the original path in the manifest.

This collection ignores every `.artifacts/` directory, so the cache remains available through the same skill symlink without appearing in commits. Gitignore is a safety net, not permission to distribute the contents. Before publishing, packaging, or copying a skill, verify that ignored artifacts are excluded.

If the installed skill directory is read-only, pass `--output-dir` or set `REFINE_UI_ARTIFACTS_DIR` to a private writable directory outside the user's product repository. Never fall back to the product repository.

To delete one PDF's derived cache:

```bash
./scripts/extract-pdf-reference.sh --clean "/path/to/reference.pdf"
```

## Mandatory-use procedure

Run this procedure twice when a usable prepared reference is available:

- a broad pass before classifying and ranking visual gaps, or after confirming a greenfield scope
- a focused pass after the user selects a gap or confirms a greenfield scope, and before recommending or mocking up a direction

For each pass:

1. Prepare or reuse the private page-labelled text index. Reuse matching page images when available. Do not require an all-page visual cache.
2. Write the current design question in one sentence.
3. Derive three to eight concrete search terms from the question and observed evidence.
4. Search `reference.md` locally. Use `rg -n -i -C 6 '<term|term>' reference.md` or an equivalent local search. Never load the entire extraction.
5. Read only the smallest relevant page-labelled passage.
6. Use its `## Page N` heading to select the matching `pages/page-NNN.png` file when the visual example matters and image inspection is available.
7. Inspect adjacent pages only when an example crosses a spread or lacks enough context.
8. Write or update the temporary reference brief described below.
9. Apply the principle to the user's rendered evidence rather than copying the book's example.

Useful search families include:

- hierarchy and emphasis: `hierarchy|visual hierarchy|emphasize|de-emphasize`
- spacing and grouping: `spacing|white space|proximity|grouping|layout`
- sizing systems: `spacing and sizing system|scale|constrained set`
- typography: `type scale|font size|line height|font weight|readability`
- color: `color palette|shades|contrast|semantic|grey`
- depth and separation: `shadow|elevation|border|depth|overlap`
- imagery and icons: `image|photograph|icon|illustration|contrast`
- responsive composition: `mobile|responsive|width|canvas|grid`

These are starting points, not a substitute for terms from the actual product question. If no relevant passage appears, record the attempted terms and say that the prepared source did not materially guide this decision. Do not manufacture relevance.

Rendering every page once into the private cache is allowed and useful. Do not load the full Markdown extraction or the complete image set into model context.

## Temporary reference brief

Keep a small brief in the current temp report or mockup directory, never in the product repository:

```markdown
# Reference brief

## Design question
...

## Consulted material
- Local reference: chapter or section, pages N–M

## Applicable principles
- Principle paraphrased in your own words: ...
  Product evidence: ...
  Concrete implication: ...

## Limits or departures
- Not applicable because ...

## Search trace
- Terms: ...
- No-result terms: ...
```

Use one to three principles, not a book summary. The brief makes consultation observable and keeps smaller models from silently substituting confidence for evidence. Candidate reports and mockup rationales can paraphrase its relevant conclusions, but must not include book page images or substantial quotations.

## Copyright and privacy constraints

- Never track the source PDF, extracted text, metadata, or rendered pages.
- Never include book pages in the visual gap report or HTML/CSS mockup.
- Do not quote substantial passages. Summarize the applicable principle in original language, and cite the user's local page or chapter when helpful.
- Do not upload the PDF or derived pages to remote services unless the user explicitly authorizes that service and upload.
- Remove the private cache when it is no longer useful.

The user's possession of a PDF is not permission to redistribute it.

## Manual fallback

If the helper cannot run but approved equivalent tools already exist, you can perform the same operations manually with `pdfinfo`, `pdftotext -layout`, and `pdftoppm -f <first> -l <last> -png -r 144`. Preserve form-feed page boundaries as explicit `## Page N` headings in any Markdown index. Keep all outputs in a private ignored or external directory, and preserve the same copyright constraints.

## Without a PDF

Continue using [DESIGN-DISCIPLINE.md](DESIGN-DISCIPLINE.md). It is an independent workflow reference and does not require the book. If deeper treatment would materially help, recommend the official source rather than recreating it.
