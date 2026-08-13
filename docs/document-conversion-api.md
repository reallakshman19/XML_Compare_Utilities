# Document conversion HTTP API

The conversion API is a thin, local/server HTTP adapter over the existing deterministic DOCX/PDF -> Markdown engine. It does not contain a second parser or renderer.

## Start the service

The server refuses to start without at least one allowed source root.

```bash
python scripts/document_conversion_api.py \
  --host 127.0.0.1 \
  --port 8765 \
  --allow-root /Common
```

For a sibling checkout instead:

```bash
python scripts/document_conversion_api.py --allow-root ../Common
```

`DOCUMENT_CONVERSION_ALLOWED_ROOTS` may also contain one or more roots separated by the platform path separator.

## Convert PDF pages 50-55

Page numbers are **1-based and inclusive** and provenance keeps the original PDF page numbers.

```bash
curl --fail --silent --show-error \
  http://127.0.0.1:8765/v1/convert \
  -H 'Content-Type: application/json' \
  --data-binary @- <<'JSON'
{
  "sourcePath": "/Common/EI - AVIFF Guidelines 2nd Edition.pdf",
  "pages": { "start": 50, "end": 55 },
  "options": {
    "tableMode": "auto",
    "ocr": "auto",
    "ocrLanguage": "eng",
    "images": "skip",
    "headers": "metadata",
    "footers": "metadata",
    "engineeringRegions": "auto"
  }
}
JSON
```

The response includes:

```json
{
  "schema": "DocumentConversionApi.v1",
  "source": {
    "logicalPath": "/Common/EI - AVIFF Guidelines 2nd Edition.pdf",
    "type": "pdf",
    "sha256": "sha256:...",
    "sizeBytes": 10348594
  },
  "pageRange": { "start": 50, "end": 55, "count": 6 },
  "requestHash": "sha256:...",
  "markdown": "...",
  "markdownSha256": "sha256:...",
  "converterOptionsHash": "sha256:...",
  "evidence": {},
  "diagnostics": [],
  "stats": {}
}
```

`requestHash` includes the full source SHA-256, page range and normalized API options. Changing only pages 50-55 to 51-56 therefore produces a different request identity even when the source file is unchanged.

## DOCX

The same endpoint accepts `.docx` sources. DOCX conversion is whole-document in API v1; sending `pages` with a DOCX request returns `DOCX_PAGE_RANGE_UNSUPPORTED`.

```json
{
  "sourcePath": "/Common/Energy-Institute-AVIFF---Worked-Examples.doc.docx",
  "options": {
    "tableMode": "auto",
    "revisions": "accepted",
    "images": "skip"
  }
}
```

## Range semantics

The PDF range layer injects range-aware adapters into the existing native-text, table, figure and engineering-geometry backend seams. It does not create a temporary six-page PDF, so page 50 remains page 50 for:

- native text provenance;
- table provenance;
- OCR rasterization;
- figure geometry;
- engineering-region extraction.

Document-level heading and running-content inference is scoped to the selected range. Evidence therefore emits `PDF_PAGE_RANGE_CONTEXT_LIMITED` so a range conversion is never represented as identical to a whole-document semantic pass.

## API v1 options

Supported request options:

```text
headers             keep | metadata | drop
footers             keep | metadata | drop
tableMode           auto | markdown | html | records
ocr                 auto | always | never
ocrLanguage         Tesseract language expression, e.g. eng
images              skip
engineeringRegions  auto | always | never
revisions            accepted | rejected | markup   (DOCX)
```

Binary asset transport is intentionally not part of API v1. `images=extract` fails with `API_ASSET_TRANSPORT_NOT_IMPLEMENTED` instead of returning Markdown with inaccessible asset links.

## Security boundary

The service is designed for an application/backend deployment, not as an unrestricted filesystem proxy.

- remote URLs are never fetched;
- source paths must resolve under an explicit `--allow-root`;
- symlink/path traversal escapes are rejected after canonical path resolution;
- only `.pdf` and `.docx` are accepted;
- source byte size, requested range length, total PDF page count, request body size and concurrent conversions are bounded;
- existing PDF/OCR memory, pixel, timeout and confidence limits still apply;
- passwords may be supplied in the JSON request but are not included in request identity or access logs;
- responses use `Cache-Control: no-store`.

Default server limits:

```text
source bytes        512 MiB
page range          50 pages
source PDF pages    2000
JSON request        128 KiB
concurrent jobs     2
```

## Health and capabilities

```text
GET /healthz
GET /v1/capabilities
POST /v1/convert
```

No CORS header is emitted by default. A future browser UI should call this through the application origin/reverse proxy or add an explicitly governed origin policy rather than enabling wildcard CORS.
