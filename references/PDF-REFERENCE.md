# Optional PDF Reference

Use a PDF only when the user supplies a path to a copy they are authorized to use. The skill does not bundle, fetch, reconstruct, or distribute *Refactoring UI* or any other copyrighted reference.

## Why preprocessing is needed

Do not assume the harness or current model can read PDFs natively. For a visual book, text extraction alone also loses essential before/after examples.

Use two representations:

- extracted text to locate relevant sections;
- rendered page images for visual inspection by an image-capable model or the user.

## Local preparation

Check which local tools are already available. Common Poppler commands are:

```bash
pdfinfo "/path/to/reference.pdf"
pdftotext -layout "/path/to/reference.pdf" "/tmp/refine-ui-reference-<hash>/reference.txt"
pdftoppm -f <first> -l <last> -png -r 144 \
  "/path/to/reference.pdf" "/tmp/refine-ui-reference-<hash>/page"
```

Alternatives such as `mutool` are acceptable. Do not install PDF tooling without approval.

Use a cache directory outside the user's repository, preferably under the OS temp directory for ephemeral work or the user's cache directory when they explicitly want reusable local indexing. Derive the cache key from file identity without exposing its original path in shared artifacts.

## On-demand use

1. Extract metadata and text.
2. Search headings and text for the current design question.
3. Render only the relevant page range.
4. Inspect page images if the model supports images; otherwise open them for the user.
5. Apply the principle to the user's evidence rather than copying the book's example.

Do not ingest or render the full book on every run.

## Copyright and privacy constraints

- Never add extracted text, rendered pages, or the source PDF to the skill or product repository.
- Never include book pages in the visual gap report or HTML/CSS mockup.
- Do not quote substantial passages. Summarize the applicable principle in original language and cite the user's local page or chapter when helpful.
- Do not upload the PDF or derived pages to remote services unless the user explicitly authorizes that service and upload.
- Delete ephemeral rendered pages when they are no longer needed if they contain licensed or sensitive material.

The user's possession of a PDF is not permission to redistribute it.

## Without a PDF

Continue using [DESIGN-DISCIPLINE.md](DESIGN-DISCIPLINE.md). It is an independent workflow reference and does not require the book. If deeper treatment would materially help, recommend the official source rather than recreating it.
