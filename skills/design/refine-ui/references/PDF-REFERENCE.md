# Optional PDF Reference

Use a PDF only when the user supplies a path to a copy they are authorized to use. The skill does not bundle, fetch, reconstruct, or distribute *Refactoring UI* or any other copyrighted reference.

## Why preprocessing is needed

Do not assume the harness or current model can read PDFs natively. For a visual book, text extraction alone also loses essential before/after examples.

Use two representations:

- extracted text to locate relevant sections;
- rendered page images for visual inspection by an image-capable model or the user.

## Prepared-cache discovery

Before asking for a PDF path or running extraction, inspect the installed skill's `.artifacts/pdf/` directory for `*/reference.md` and `*/manifest.txt`.

- If one complete cache exists, reuse it without requiring the source PDF.
- If several caches exist, inspect their manifests and select the edition relevant to the user's request. Ask only when the intended edition remains ambiguous.
- A complete all-page cache has a `reference.md` whose page headings match `page_count` and the same number of PNGs under `pages/`.
- Do not load the full Markdown file or image directory while discovering caches. Read manifest metadata first.
- Run extraction only when no suitable cache exists, the user supplies another authorized edition, or regeneration is required.

## Extraction helper

Use the bundled script from the skill directory:

```bash
./scripts/extract-pdf-reference.sh "/path/to/reference.pdf"
./scripts/extract-pdf-reference.sh --render-all "/path/to/reference.pdf"
./scripts/extract-pdf-reference.sh --pages 42-46 "/path/to/reference.pdf"
```

The first command creates raw text, page-labelled Markdown, and metadata. The second caches every page as a 144-DPI PNG. The third reuses the indexes and renders only the requested inclusive page range. Cached all-page rendering is idempotent at the same DPI. A cache uses one DPI consistently; pass `--force` to replace it at another resolution.

The script requires existing Poppler tools:

- `pdfinfo`;
- `pdftotext`;
- `pdftoppm` only when rendering pages.

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

## On-demand use

1. Prepare or reuse the private indexes and all-page image cache.
2. Search `reference.md` locally for the current design question.
3. Use its `## Page N` heading to select the matching `pages/page-NNN.png` file.
4. Load only the smallest relevant Markdown passage and page image into model context.
5. Inspect adjacent pages only when the example crosses a spread or the selected page lacks enough context.
6. Apply the principle to the user's evidence rather than copying the book's example.

Rendering every page once into the private cache is allowed and useful. Do not load the full Markdown extraction or the complete image set into model context.

## Copyright and privacy constraints

- Never track the source PDF, extracted text, metadata, or rendered pages.
- Never include book pages in the visual gap report or HTML/CSS mockup.
- Do not quote substantial passages. Summarize the applicable principle in original language and cite the user's local page or chapter when helpful.
- Do not upload the PDF or derived pages to remote services unless the user explicitly authorizes that service and upload.
- Remove the private cache when it is no longer useful.

The user's possession of a PDF is not permission to redistribute it.

## Manual fallback

If the helper cannot run but approved equivalent tools already exist, the same operations can be performed manually with `pdfinfo`, `pdftotext -layout`, and `pdftoppm -f <first> -l <last> -png -r 144`. Preserve form-feed page boundaries as explicit `## Page N` headings in any Markdown index. Keep all outputs in a private ignored or external directory and preserve the same copyright constraints.

## Without a PDF

Continue using [DESIGN-DISCIPLINE.md](DESIGN-DISCIPLINE.md). It is an independent workflow reference and does not require the book. If deeper treatment would materially help, recommend the official source rather than recreating it.
