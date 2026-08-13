"""Thin HTTP-operation adapters for governed DocumentEvidence table routes."""
from __future__ import annotations

from document_evidence_pdf_table_provider import (
    make_pdf_table_candidate_provider,
    make_pdf_table_page_provider,
)
from document_evidence_table_extract import (
    GovernedTableError,
    discover_table_candidates,
    extract_table_evidence,
)

DISCOVER_ROUTE = "/v2/tables/discover"
EXTRACT_ROUTE = "/v2/tables/extract"


def table_route_operations(config) -> dict:
    return {
        DISCOVER_ROUTE: lambda body: _as_conversion_api_error(
            discover_tables_request, body, config,
        ),
        EXTRACT_ROUTE: lambda body: _as_conversion_api_error(
            extract_tables_request, body, config,
        ),
    }


def discover_tables_request(
    payload,
    config,
    *,
    source_loader=None,
    candidate_provider=None,
) -> dict:
    request = _parse_payload(payload, required=("sourcePath",), allowed=("sourcePath",))
    source_bytes, source = (source_loader or _default_source_loader)(request, config)
    provider = candidate_provider or make_pdf_table_candidate_provider(
        max_source_pages=config.max_source_pages,
    )
    result = discover_table_candidates(source_bytes, provider)
    return {**result, "source": source}


def extract_tables_request(
    payload,
    config,
    *,
    source_loader=None,
    page_provider=None,
) -> dict:
    request = _parse_payload(
        payload,
        required=("sourcePath", "sourceHash", "pages"),
        allowed=("sourcePath", "sourceHash", "pages"),
    )
    source_bytes, source = (source_loader or _default_source_loader)(request, config)
    provider = page_provider or make_pdf_table_page_provider(
        max_source_pages=config.max_source_pages,
    )
    result = extract_table_evidence(
        source_bytes,
        request["sourceHash"],
        request["pages"],
        provider,
        max_selected_pages=config.max_range_pages,
    )
    return {**result, "source": source}


def table_api_capabilities() -> dict:
    return {
        "documentEvidenceTables": {
            "discoveryEndpoint": DISCOVER_ROUTE,
            "extractionEndpoint": EXTRACT_ROUTE,
            "governedExtractionRequires": ["sourceHash", "pages"],
            "encryptedPdf": False,
            "engineeringAuthority": "NONE",
        }
    }


def _parse_payload(payload, *, required, allowed):
    if not isinstance(payload, dict):
        raise GovernedTableError("TABLE_API_PAYLOAD_INVALID", "request body must be an object")
    unknown = sorted(set(payload) - set(allowed))
    if unknown:
        raise GovernedTableError(
            "TABLE_API_OPTION_UNKNOWN",
            f"unsupported request field(s): {', '.join(unknown)}",
        )
    missing = [key for key in required if payload.get(key) in (None, "", [])]
    if missing:
        raise GovernedTableError(
            "TABLE_API_FIELD_REQUIRED",
            f"required request field(s): {', '.join(missing)}",
        )
    return dict(payload)


def _default_source_loader(request, config):
    from document_conversion_service import _read_bounded, resolve_source_path

    resolved = resolve_source_path(request["sourcePath"], config.allowed_roots)
    if resolved.suffix.lower() != ".pdf":
        raise GovernedTableError("TABLE_PDF_SOURCE_REQUIRED", "table evidence routes require a PDF source")
    source_bytes = _read_bounded(resolved, config.max_source_bytes)
    return source_bytes, {
        "logicalPath": request["sourcePath"],
        "type": "pdf",
        "sizeBytes": len(source_bytes),
    }


def _as_conversion_api_error(operation, payload, config):
    try:
        return operation(payload, config)
    except GovernedTableError as exc:
        from document_conversion_service import ConversionApiError
        raise ConversionApiError(exc.code, str(exc), 422) from exc
