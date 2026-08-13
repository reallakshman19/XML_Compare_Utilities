# Document conversion API worklog

## Scope

Add an API boundary over the merged DOCX/PDF -> Markdown converters, including bounded PDF page-range conversion such as original pages 50-55, without creating a second parsing/conversion path.

## Design

- stdlib Python `ThreadingHTTPServer`; no new runtime package;
- `POST /v1/convert`, `GET /healthz`, `GET /v1/capabilities`;
- source files come only from configured local/mounted allow roots; no URL fetching;
- PDF page ranges are 1-based/inclusive and use injected range-aware native/table/figure/engineering backends;
- OCR keeps original page numbers because the full source bytes remain the raster source;
- API request identity includes source SHA-256 + page range + normalized options;
- API v1 returns Markdown/evidence only and requires `images=skip` until binary asset transport is defined;
- DOCX uses the existing whole-document converter and rejects PDF-style page ranges.

## Validation

Local pure/API contract suite:

```text
13 tests / 13 PASS
```

Covers page-range validation, deterministic range request identity, range limit, DOCX range rejection, source-root enforcement, symlink escape, remote URL rejection, unknown option rejection, asset transport fail-closed behavior, health/capabilities, conversion HTTP request and content-type rejection.

Real backend smoke:

- generated 60-page PDF;
- range requested: 50-55;
- native backend pages observed: 50,51,52,53,54,55;
- table backend keys observed: 50,51,52,53,54,55;
- shared adapter state reported totalPages=60.

Python compile checks passed for all three new modules.

## Files

- `scripts/pdf_page_range.py`
- `scripts/document_conversion_service.py`
- `scripts/document_conversion_api.py`
- `tests/document_conversion_api_test.py`
- `docs/document-conversion-api.md`
- `.agent-worklogs/20260813_0945_document-conversion-api/worklog.md`
