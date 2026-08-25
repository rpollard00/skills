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

Use a working directory outside the user's repository. Default to the OS temp directory for ephemeral work. Use the user's cache directory only when they explicitly approve reusable local indexing; record that approval in the conversation and keep the cache exclusively in the approved external location. Derive the cache key from file identity without exposing its original path in shared artifacts.

The full `reference.txt` produced by the example is a transient local search index, not content to load wholesale into model context. Search it locally and load only the smallest relevant passage. Delete it after the task unless reusable local indexing was explicitly approved.

## On-demand use

1. Extract metadata and a transient local text index.
2. Search headings and text locally for the current design question.
3. Load only the smallest relevant text section and render only the relevant page range.
4. Inspect page images if the model supports images; otherwise open them for the user.
5. Apply the principle to the user's evidence rather than copying the book's example.

Do not load the full extracted book into model context or render the full book on every run.

## Copyright and privacy constraints

- Never add extracted text, rendered pages, or the source PDF to the skill or product repository.
- Never include book pages in the visual gap report or HTML/CSS mockup.
- Do not quote substantial passages. Summarize the applicable principle in original language and cite the user's local page or chapter when helpful.
- Do not upload the PDF or derived pages to remote services unless the user explicitly authorizes that service and upload.
- Delete all ephemeral derived material—including extracted text and rendered pages—when it is no longer needed. Retain it only in an explicitly approved external cache.

The user's possession of a PDF is not permission to redistribute it.

## Without a PDF

Continue using [DESIGN-DISCIPLINE.md](DESIGN-DISCIPLINE.md). It is an independent workflow reference and does not require the book. If deeper treatment would materially help, recommend the official source rather than recreating it.
