# Optional PDF Reference

Use a PDF only when the user supplies a path to a copy they are authorized to use. The skill does not bundle, fetch, reconstruct, or distribute *Refactoring UI* or any other copyrighted reference.

## Why preprocessing is needed

Do not assume the harness or current model can read PDFs natively. For a visual book, text extraction alone also loses essential before/after examples.

Use two representations:

- extracted text to locate relevant sections;
- rendered page images for visual inspection by an image-capable model or the user.

## Extraction helper

Use the bundled script from the skill directory:

```bash
./scripts/extract-pdf-reference.sh "/path/to/reference.pdf"
./scripts/extract-pdf-reference.sh --pages 42-46 "/path/to/reference.pdf"
```

The first command creates a searchable text index and metadata. The second reuses that index and renders only the requested inclusive page range.

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
├── reference.txt
└── pages/
```

The source PDF is never copied. A content hash separates editions without putting the original path in the manifest.

This collection ignores every `.artifacts/` directory, so the cache remains available through the same skill symlink without appearing in commits. Gitignore is a safety net, not permission to distribute the contents. Before publishing, packaging, or copying a skill, verify that ignored artifacts are excluded.

If the installed skill directory is read-only, pass `--output-dir` or set `REFINE_UI_ARTIFACTS_DIR` to a private writable directory outside the user's product repository. Never fall back to the product repository.

To delete one PDF's derived cache:

```bash
./scripts/extract-pdf-reference.sh --clean "/path/to/reference.pdf"
```

## On-demand use

1. Prepare or reuse the private text index.
2. Search `reference.txt` locally for the current design question.
3. Load only the smallest relevant passage into model context.
4. Render only the relevant page range.
5. Inspect page images if the model supports images; otherwise open them for the user.
6. Apply the principle to the user's evidence rather than copying the book's example.

Do not load the full extracted book into model context or render the full book on every run.

## Copyright and privacy constraints

- Never track the source PDF, extracted text, metadata, or rendered pages.
- Never include book pages in the visual gap report or HTML/CSS mockup.
- Do not quote substantial passages. Summarize the applicable principle in original language and cite the user's local page or chapter when helpful.
- Do not upload the PDF or derived pages to remote services unless the user explicitly authorizes that service and upload.
- Remove the private cache when it is no longer useful.

The user's possession of a PDF is not permission to redistribute it.

## Manual fallback

If the helper cannot run but approved equivalent tools already exist, the same operations can be performed manually with `pdfinfo`, `pdftotext -layout`, and `pdftoppm -f <first> -l <last> -png -r 144`. Keep all outputs in a private ignored or external directory and preserve the same copyright constraints.

## Without a PDF

Continue using [DESIGN-DISCIPLINE.md](DESIGN-DISCIPLINE.md). It is an independent workflow reference and does not require the book. If deeper treatment would materially help, recommend the official source rather than recreating it.
