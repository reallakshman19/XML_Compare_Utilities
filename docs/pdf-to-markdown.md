# PDF to Markdown utility

Native PDF support is an optional layer beside the dependency-free DOCX path. Install the pinned PDF extra:

```bash
python -m pip install -r requirements-pdf.txt
```

Then use either the PDF-specific entry point or unified dispatcher:

```bash
python scripts/pdf_to_markdown.py input.pdf -o output.md --evidence output.evidence.json
python scripts/document_to_markdown.py input.pdf -o output.md --evidence output.evidence.json
```

The existing DOCX command remains available and does not import `pdfplumber` unless PDF conversion is requested.

## Backend boundary

`scripts/pdf_native.py` contains a small `PdfPlumberBackend` adapter and separate pure layout algorithms. The backend only exposes source objects/signals; Markdown is not built while traversing pdfplumber objects.

The optional runtime is pinned in `requirements-pdf.txt`:

```text
pdfplumber==0.11.10
pdfminer.six==20260107
```

The converter records the actual backend versions in evidence and includes them in the canonical option hash. Running a different backend version therefore cannot masquerade as the same conversion profile.

The native slice does **not** use PyMuPDF and does not create a runtime dependency on Pdf-Hub. See `docs/pdf-dependency-review.md` for the dependency/license decision.

## Positioned source model

For each usable embedded-text character the backend retains:

- text;
- top-left-coordinate bounding box `(x0, top, x1, bottom)` in PDF points;
- font name;
- font size;
- upright/matrix data when available.

Characters are clustered into lines and style-consistent spans. Semantic PDF paragraphs retain:

- block/page bounding box;
- every contributing line bounding box as `sourceProvenance`;
- positioned spans with text, bbox, font, size, bold/italic flags and page;
- extraction method `embedded-text`.

Evidence declares `coordinateSystem: top-left-points`. Coordinates are rounded deterministically to three decimals before semantic use.

## Native text quality and page classification

Native text is evaluated before it is trusted. Current measurable quality gates include:

- at least 20 visible non-whitespace characters for an adequate text layer;
- printable-character ratio at least 0.90;
- Unicode replacement-character ratio at most 0.02;
- disallowed control-character ratio at most 0.01;
- duplicate text-layer ratio at most 0.35 after pdfplumber de-duplication.

Pages are classified using these quality signals plus image coverage and vector-object counts. Current classes are:

```text
BORN_DIGITAL
MIXED
SCANNED
IMAGE_HEAVY
TABLE_HEAVY
ENGINEERING_DRAWING
UNKNOWN
```

Examples of deliberate gates:

- 250+ vector line/rect/curve objects with limited text -> `ENGINEERING_DRAWING`;
- 20+ vector line/rect/curve objects with usable text -> `TABLE_HEAVY`;
- less than 20 visible characters with image coverage >= 60% -> `SCANNED`.

An inadequate native text layer emits `PDF_NATIVE_TEXT_INADEQUATE`. No OCR is performed in this slice; canonical options explicitly record `ocr: never`. The diagnostic is the handoff point for the later controlled OCR policy.

## Line reconstruction

Characters first cluster by vertical overlap/baseline tolerance. A baseline group is then split when an unusually large horizontal gap exceeds:

```text
max(24 pt, 4 * median font size)
```

This is required for common two-column PDFs where left/right text shares the same y-coordinate. Normal word spacing remains within one line; large gutters become separate line segments.

Superscript/subscript-like characters remain on the same line when their vertical boxes overlap or their centers fall within the font-relative baseline tolerance. This is tested with engineering text such as `m²`.

## Reading order

Reading order is reconstructed from coordinates; plain whole-page text extraction is not used as the only path.

Full-width anchor lines are recognized when they occupy at least 68% of page width, or span approximately the 12%-88% page-width band. Each vertical band between anchors is evaluated independently.

For a two-column decision:

- line centers left of 45% page width form the left candidate;
- line centers right of 55% form the right candidate;
- both sides need at least 3 lines;
- the smaller side must contain at least 30% as many lines as the larger side;
- the median gutter must be at least `max(12 pt, 2.5% page width)`;
- at most one line may remain in the middle band.

A convincing two-column band is emitted left-column top-to-bottom, then right-column top-to-bottom. If two substantial candidate columns exist but the gutter/middle conditions are not convincing, the converter emits `PDF_READING_ORDER_AMBIGUOUS` rather than claiming a confident order. The page remains readable in source y/x order and evidence marks the page mode `ambiguous` with lower confidence.

## Paragraph grouping and heading inference

Lines only join a paragraph when they remain in the same reading-order region and satisfy deterministic spacing/font constraints. A join is rejected when, among other things:

- vertical gap exceeds `max(5 pt, 0.8 * font size)`;
- font-size difference exceeds `max(1 pt, 15% of font size)`;
- bold state changes;
- left edges differ by more than 18 pt.

Heading inference is document-level. It estimates body size from ordinary text, then combines relative font size, boldness, numbering depth and maximum heading length. It deliberately does not use `largest font = H1` as a standalone rule.

## Running headers and footers

Repeated running content is suppressed from body Markdown by default and retained as metadata. Detection is deliberately conservative:

- at least 3 pages are required;
- candidate text must occur in the top 8% or bottom 8% of the page;
- exact normalized text must repeat on at least 80% of pages (minimum 3 pages);
- vertical position ratio may vary by no more than 0.02.

Options:

```text
--headers keep|metadata|drop
--footers keep|metadata|drop
```

`metadata` is the default. `drop` emits stable diagnostics rather than silently deleting the fact that repeated content existed.

## Security and resource gates

The native backend fails closed for:

- encrypted/password-protected PDFs without a valid password -> `PDF_ENCRYPTED`;
- malformed parser failures -> `PDF_MALFORMED`;
- more than 2,000 pages by default -> `PDF_PAGE_LIMIT_EXCEEDED`;
- non-positive or excessive page area (> 200,000,000 point²) -> `PDF_PAGE_DIMENSIONS_EXCESSIVE`;
- more than 1,000,000 extracted characters on one page -> `PDF_CHAR_LIMIT_EXCEEDED`;
- missing optional backend -> `PDF_BACKEND_MISSING`.

An explicit password can be supplied with `--pdf-password`.

## Determinism and evidence

Canonical evidence contains:

- source SHA-256 and Git blob SHA;
- semantic schema / canonicalization / converter revisions;
- backend versions;
- backend versions inside the canonical options hash;
- page quality/classification/reasons;
- reading-order mode/confidence;
- running-content metadata;
- block/line/span PDF provenance and bboxes;
- stable diagnostics.

Runtime timestamps and random UUIDs are not emitted.

## Current limitations

This slice is intentionally **native positioned extraction + reading order**, not the entire PDF roadmap.

Still deferred:

- PDF table regions normalized into the shared semantic table model;
- controlled OCR (`--ocr auto|always|never`) and OCR/native merge;
- raster memory/timeout/language/confidence policy;
- engineering-drawing region extraction;
- figures/images as PDF assets;
- sophisticated side-note/caption graph reconstruction beyond the current column/anchor model.

When native text is inadequate or order is ambiguous, diagnostics expose that uncertainty rather than silently claiming full fidelity.
