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
pypdfium2==5.8.0
Pillow==12.3.0
```

The converter records the actual backend versions in evidence and includes them in the canonical option hash. Running a different backend version therefore cannot masquerade as the same conversion profile.

The native slice does **not** use PyMuPDF and does not create a runtime dependency on Pdf-Hub. See `docs/pdf-dependency-review.md` for the dependency/license decision.

## Positioned source model

For each usable embedded-text character the backend retains text, top-left-coordinate bounding box `(x0, top, x1, bottom)` in PDF points, font name/size, and upright/matrix data when available. Characters are clustered into lines and style-consistent spans. Semantic PDF paragraphs retain block/page bbox, contributing line bboxes, positioned spans, and extraction method `embedded-text`.

Evidence declares `coordinateSystem: top-left-points`. Coordinates are rounded deterministically to three decimals before semantic use.

## Native text quality and page classification

Native text is evaluated before it is trusted. Current measurable quality gates include at least 20 visible non-whitespace characters, printable-character ratio >=0.90, replacement-character ratio <=0.02, control-character ratio <=0.01, and duplicate text-layer ratio <=0.35 after de-duplication.

Pages are classified as:

```text
BORN_DIGITAL
MIXED
SCANNED
IMAGE_HEAVY
TABLE_HEAVY
ENGINEERING_DRAWING
UNKNOWN
```

Examples of deliberate gates: 250+ vector objects with limited text -> `ENGINEERING_DRAWING`; 20+ vector objects with usable text -> `TABLE_HEAVY`; fewer than 20 visible characters with image coverage >=60% -> `SCANNED`.

An inadequate native layer emits `PDF_NATIVE_TEXT_INADEQUATE`. With controlled OCR enabled, that classification becomes the deterministic handoff into `--ocr auto`; healthy born-digital native text remains authoritative and does not invoke OCR.

## Line reconstruction and reading order

Characters first cluster by vertical overlap/baseline tolerance. A baseline group is split when a horizontal gap exceeds `max(24 pt, 4 * median font size)`, preventing common same-baseline two-column text from becoming one line.

Full-width anchor lines are recognized when they occupy at least 68% of page width or span approximately the 12%-88% band. For a two-column decision, line centers left of 45% and right of 55% form candidates; both sides need at least 3 lines, the smaller side needs at least 30% of the larger side's line count, median gutter must be at least `max(12 pt, 2.5% page width)`, and at most one line may remain in the middle band.

A convincing band is emitted left column top-to-bottom, then right column top-to-bottom. Substantial but inconclusive competing columns emit `PDF_READING_ORDER_AMBIGUOUS`; source y/x order is retained and evidence records lower confidence.

Paragraph joins are rejected when spacing/font/indent changes exceed deterministic thresholds. Heading inference is document-level and combines relative font size, boldness, numbering depth and maximum heading length rather than using `largest font = H1` alone.

## Running headers and footers

Repeated running content is suppressed from body Markdown by default and retained as metadata. Detection requires at least 3 pages, top/bottom 8% placement, exact normalized repetition on at least 80% of pages, and stable vertical position. Options are `--headers keep|metadata|drop` and `--footers keep|metadata|drop`; `metadata` is default and `drop` emits stable diagnostics.

## PDF table reconstruction

PDF tables use independent ruled/grid and whitespace/text-alignment strategies through `scripts/pdf_tables.py` and normalize into the **same** `TableBlock` / `TableCell` model used by DOCX. Native text is removed from the ordinary line stream only after a candidate passes reconciliation.

Ruled candidates may infer row/column spans only from explicit geometric boundaries and require confidence >=0.85. Text candidates require at least 3 rows, non-empty density >=0.85, median column whitespace score >=9.0, acceptable vertical compactness, and confidence >=0.78; they never infer rowspan from vertical whitespace gaps.

Overlapping high-confidence candidates with >=70% IoU and different shapes emit `PDF_TABLE_AMBIGUOUS`; same-shape candidates corroborate with ruled preferred. Contained duplicates emit `PDF_TABLE_DUPLICATE_CANDIDATE`, low-confidence candidates emit `PDF_TABLE_LOW_CONFIDENCE`, and backend strategy failures retain native text with `PDF_TABLE_EXTRACTION_FAILED`.

PDF tables use the shared renderer policy via `--table-mode auto|markdown|html|records`. Simple tables may render GFM, merged/omitted structures HTML, and wide tables records. Unsafe explicit Markdown requests use the same fallback contract as DOCX.

## Controlled OCR fallback

OCR is a page-level fallback over the native/table semantic document, not a whole-document replacement. The PDF CLI supports:

```text
--ocr auto|always|never
--ocr-language eng
--ocr-confidence-min 0.70
--ocr-scale 2.0
--ocr-max-pixels 16000000
--ocr-memory-mb 64
--ocr-max-pages 100
--ocr-max-job-pixels 250000000
--ocr-timeout 60
```

`auto` is default. It skips healthy `BORN_DIGITAL`, `MIXED`, and adequately extracted `TABLE_HEAVY` pages. It requests OCR for `SCANNED`, `IMAGE_HEAVY`, `UNKNOWN`, or otherwise inadequate native text. `always` forces OCR for qualification/debugging and `never` disables it. The decision/reason is recorded per page.

### Raster and memory limits

`PdfiumRasterizer` uses pinned `pypdfium2` and converts only selected pages. Requested scale is clamped before rendering by both pixel ceiling and a peak-memory working-set estimate. The estimate uses **10 bytes/pixel** to reserve headroom for the RGBA bitmap plus PIL/image-conversion and PNG-encoder buffers; post-render dimensions are checked again. A required scale below the configured minimum fails with `OCR_RASTER_LIMIT_EXCEEDED`.

The job also enforces OCR page count and cumulative raster-pixel budgets. Exceeding them is fatal (`OCR_PAGE_LIMIT_EXCEEDED` / `OCR_JOB_PIXEL_LIMIT_EXCEEDED`) so hostile or accidentally huge PDFs cannot consume unbounded OCR resources.

### Tesseract boundary and language policy

Recognition invokes the Tesseract CLI directly with TSV output; there is no shell invocation and no `pytesseract` runtime dependency. Tesseract is a separately deployed system dependency. Its actual version and the actual pypdfium2 version are recorded in evidence/canonical options whenever OCR runs. The language expression is restricted to a conservative alphanumeric/`_+.-` grammar before reaching the CLI.

The pinned Python OCR dependencies are `pypdfium2==5.8.0` and `Pillow==12.3.0`. The qualification environment package metadata reports pypdfium2's bundled license set as BSD-3-Clause/Apache-2.0 plus dependency licenses; its deployed Tesseract 5.5.0 package declares Apache-2.0. Release/container builds should pin the system Tesseract build and traineddata set explicitly and rerun the real-backend fixture.

### Confidence, provenance, and native/OCR merge

Tesseract words are mapped back from raster pixels into top-left PDF-point coordinates. Evidence retains word/line/paragraph text, bbox and confidence; engine/rasterizer versions; raster dimensions/scale/pixels/estimated working set; and the page decision reason. Semantic OCR paragraphs use `extraction: ocr` and carry confidence.

Native content remains authoritative on overlap. OCR that substantially overlaps native paragraphs is discarded when normalized text and engineering numeric tokens agree. Materially different overlap emits `OCR_NATIVE_CONFLICT` and retains the native value. OCR overlapping a native semantic table is treated as duplicate table text, preventing a second flattened copy of engineering cells.

Canonical OCR text is accepted only when page confidence meets `--ocr-confidence-min` (default 0.70). Empty/low-confidence output becomes an explicit `OCR_TEXT_EMPTY` / `OCR_LOW_CONFIDENCE` marker rather than guessed text. Layout-unsafe pages such as engineering drawings are not promoted to ordinary OCR paragraphs unless existing semantics make the merge safe; otherwise `OCR_LAYOUT_UNRESOLVED` is emitted visibly.

OCR mode, language, thresholds, raster budgets, timeout, OCR revision, and invoked engine/rasterizer versions participate in canonical options identity. Machines with different optional OCR installations still produce the same identity when `auto` does not invoke OCR (`not-invoked` versions).

## Security and resource gates

The native backend fails closed for encrypted PDFs without valid password (`PDF_ENCRYPTED`), malformed parser failures (`PDF_MALFORMED`), >2,000 pages by default, excessive page area, >1,000,000 extracted chars/page, or missing optional backend. OCR adds bounded pages, pixels, peak memory, job pixels and per-page subprocess timeout plus conservative language validation.

## Determinism and evidence

Canonical evidence contains source hashes, semantic/canonical/converter revisions, backend versions and canonical options identity, page quality/classification, reading-order mode/confidence, running-content metadata, block/span PDF provenance, table reconstruction evidence, OCR decisions/results when invoked, and stable diagnostics. Runtime timestamps and random UUIDs are not emitted.

## Current limitations

The implemented PDF path includes native positioned extraction, reading order, conservative ruled/whitespace table normalization, and controlled page-level OCR fallback with native/OCR deduplication.

Still deferred:

- engineering-drawing region extraction;
- figures/images as PDF assets;
- sophisticated side-note/caption graph reconstruction beyond the current column/anchor model.

When native text is inadequate, table reconstruction is ambiguous, OCR confidence is weak, or reading order is uncertain, diagnostics expose that uncertainty rather than silently claiming full fidelity.
