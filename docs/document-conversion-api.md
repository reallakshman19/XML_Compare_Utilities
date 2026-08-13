# Document conversion and PDF search HTTP API

The API is a thin, local/server HTTP adapter over the existing deterministic DOCX/PDF -> Markdown engine. It does not contain a second parser or renderer.

For PDF discovery it also exposes a deterministic native-text search index. The search design adapts the useful concepts in `reallaksh19/Pdf-Hub` search indexing: cache positioned page text by document identity, return page/snippet/rectangle hits, and keep search separate from navigation/conversion. There is no runtime dependency on Pdf-Hub. The reviewed Pdf-Hub frontend search code is MIT-licensed.

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

## Search first, then choose pages, then convert

The intended application flow is:

```text
controlled PDF
  -> POST /v1/search
  -> caller receives every literal native-text match
  -> caller/app selects the required page range
  -> POST /v1/convert with that explicit range
  -> Markdown + evidence/diagnostics
```

The search service never infers or silently expands the page range to convert.

### 1. Search `T2.3`

```bash
curl --fail --silent --show-error \
  http://127.0.0.1:8765/v1/search \
  -H 'Content-Type: application/json' \
  --data-binary @- <<'JSON'
{
  "sourcePath": "/Common/EI - AVIFF Guidelines 2nd Edition.pdf",
  "query": "T2.3",
  "options": {
    "caseSensitive": false,
    "wholeWord": false,
    "useRegex": false
  }
}
JSON
```

Example response shape:

```json
{
  "schema": "PdfSearchApi.v1",
  "source": {
    "logicalPath": "/Common/EI - AVIFF Guidelines 2nd Edition.pdf",
    "type": "pdf",
    "sha256": "sha256:...",
    "sizeBytes": 10348594
  },
  "index": {
    "indexId": "sha256:...",
    "revision": "pdf-search-index-v1",
    "cacheHit": false,
    "totalPages": 0,
    "indexedLines": 0,
    "indexedChars": 0,
    "nativeTextPages": 0,
    "pagesWithoutNativeText": [],
    "nativeTextOnly": true,
    "backendVersions": {}
  },
  "query": "T2.3",
  "options": {
    "caseSensitive": false,
    "wholeWord": false,
    "useRegex": false
  },
  "searchHash": "sha256:...",
  "summary": {
    "totalMatches": 0,
    "pagesWithMatches": [
      { "page": 56, "matches": 2 },
      { "page": 61, "matches": 1 }
    ]
  },
  "matches": [
    {
      "id": "pdf-search:...",
      "page": 56,
      "lineId": "p56:l12",
      "matchText": "T2.3",
      "lineText": "...",
      "charRange": { "start": 8, "end": 12 },
      "snippet": "...T2.3...",
      "snippetMatchRange": { "start": 8, "end": 12 },
      "bbox": [72.0, 118.0, 410.0, 131.0],
      "bboxPrecision": "line",
      "extraction": "embedded-text"
    }
  ],
  "diagnostics": []
}
```

The example page numbers above illustrate the response schema; they are not asserted source locators for the EI document until the API is run against the exact controlled PDF.

Search properties:

- page numbers are original PDF **1-based** page numbers;
- all literal matches are returned or the request fails with `PDF_SEARCH_RESULT_LIMIT_EXCEEDED`;
- hits are deterministic and ordered by source page/layout order;
- hit IDs are stable for the same source occurrence;
- line-level bboxes are returned for caller navigation/highlighting;
- the first search builds an in-memory index keyed by source identity; later searches reuse it;
- encrypted-source cache entries are partitioned by password fingerprint so a prior decrypted index cannot satisfy a passwordless request;
- the index contains no timestamps and has a deterministic `indexId`/`searchHash`;
- regex execution is intentionally disabled in API v1 (`PDF_SEARCH_REGEX_UNSUPPORTED`).

This first search slice indexes **native embedded PDF text only**. If pages have no native searchable text, the response lists them under `pagesWithoutNativeText` and emits `PDF_SEARCH_NATIVE_TEXT_INCOMPLETE`. OCR-derived search indexing is a later slice; conversion itself still retains its existing controlled OCR policies.

### 2. Caller chooses a range

The caller may decide, for example, that the relevant source section is pages 56-68. That choice remains caller/application authority rather than a search heuristic.

### 3. Convert the chosen pages

```bash
curl --fail --silent --show-error \
  http://127.0.0.1:8765/v1/convert \
  -H 'Content-Type: application/json' \
  --data-binary @- <<'JSON'
{
  "sourcePath": "/Common/EI - AVIFF Guidelines 2nd Edition.pdf",
  "pages": { "start": 56, "end": 68 },
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

Page numbers are **1-based and inclusive** and provenance keeps the original PDF page numbers.

The conversion response includes:

```json
{
  "schema": "DocumentConversionApi.v1",
  "source": {
    "logicalPath": "/Common/EI - AVIFF Guidelines 2nd Edition.pdf",
    "type": "pdf",
    "sha256": "sha256:...",
    "sizeBytes": 10348594
  },
  "pageRange": { "start": 56, "end": 68, "count": 13 },
  "requestHash": "sha256:...",
  "markdown": "...",
  "markdownSha256": "sha256:...",
  "converterOptionsHash": "sha256:...",
  "evidence": {},
  "diagnostics": [],
  "stats": {}
}
```

`requestHash` includes the full source SHA-256, page range and normalized API options. Changing only pages 56-68 to 57-69 therefore produces a different request identity even when the source file is unchanged.

## PDF search implementation

The search index uses the same positioned native PDF backend already used by the converter (`pdfplumber` / `pdfminer.six`) and the existing deterministic character-to-line clustering. It records searchable line text with original page number and line bbox.

The design references these Pdf-Hub concepts without copying its browser runtime into this repository:

```text
Pdf-Hub SearchIndexer
  -> document-keyed in-memory positioned-text cache
  -> literal/case/whole-word search

Pdf-Hub OCR search index
  -> page/source/bbox-aware search records
  -> stable result ordering and source context
```

This repository adapts those ideas to the server/Python conversion architecture and source SHA-256 identities.

## DOCX

`POST /v1/convert` also accepts `.docx` sources. DOCX conversion is whole-document in API v1; sending `pages` with a DOCX request returns `DOCX_PAGE_RANGE_UNSUPPORTED`.

`POST /v1/search` is PDF-only in this first slice; DOCX search returns `PDF_SEARCH_SOURCE_REQUIRED`.

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

The PDF range layer injects range-aware adapters into the existing native-text, table, figure and engineering-geometry backend seams. It does not create a temporary subset PDF, so source page 56 remains page 56 for:

- native text provenance;
- table provenance;
- OCR rasterization;
- figure geometry;
- engineering-region extraction.

Document-level heading and running-content inference is scoped to the selected range. Evidence therefore emits `PDF_PAGE_RANGE_CONTEXT_LIMITED` so a range conversion is never represented as identical to a whole-document semantic pass.

## Conversion options

Supported conversion request options:

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

## Search options

```text
caseSensitive  boolean, default false
wholeWord      boolean, default false
useRegex       false only in v1
```

Queries must be non-empty and at most 512 characters. The default hard result cap is 5,000 matches. A search that would exceed the cap fails rather than returning an incomplete result set.

## Security boundary

The service is designed for an application/backend deployment, not as an unrestricted filesystem proxy.

- remote URLs are never fetched;
- source paths must resolve under an explicit `--allow-root`;
- symlink/path traversal escapes are rejected after canonical path resolution;
- only `.pdf` and `.docx` are accepted by the conversion source resolver;
- search is explicitly restricted to `.pdf`;
- source byte size, requested range length, total PDF page count, search-index characters, search results, cache size, request body size and concurrent requests are bounded;
- invalid/empty search queries are rejected before PDF indexing begins;
- arbitrary regex search is disabled in the HTTP API v1;
- existing PDF/OCR memory, pixel, timeout and confidence limits still apply to conversion;
- passwords may be supplied in JSON requests but are not included in public response identity or access logs;
- decrypted search caches are partitioned by password fingerprint;
- responses use `Cache-Control: no-store`.

Default server limits:

```text
source bytes              512 MiB
page range                50 pages
source PDF pages          2000
search indexed characters 20,000,000
search matches            5,000 (complete-or-error)
search cached documents   8
JSON request              128 KiB
concurrent jobs           2
```

Relevant server flags:

```text
--max-search-index-chars
--max-search-results
--max-search-cache-documents
```

## Health and capabilities

```text
GET  /healthz
GET  /v1/capabilities
POST /v1/search
POST /v1/convert
```

No CORS header is emitted by default. A future browser UI should call this through the application origin/reverse proxy or add an explicitly governed origin policy rather than enabling wildcard CORS.
