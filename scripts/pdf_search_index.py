"""Deterministic native-text search indexing for PDF API callers."""
from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
import hashlib
import json
import re
import threading
from typing import Callable

PDF_SEARCH_SCHEMA = "PdfSearchApi.v1"
PDF_SEARCH_INDEX_REVISION = "pdf-search-index-v1"
DEFAULT_MAX_INDEX_CHARS = 20_000_000
DEFAULT_MAX_SEARCH_RESULTS = 5_000
DEFAULT_MAX_CACHE_DOCUMENTS = 8
DEFAULT_SNIPPET_CHARS = 220
MAX_QUERY_CHARS = 512


class PdfSearchError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class PdfSearchIndexLine:
    page: int
    line_id: str
    text: str
    bbox: tuple[float, float, float, float]


@dataclass(frozen=True)
class PdfSearchIndex:
    source_sha256: str
    index_id: str
    total_pages: int
    lines: tuple[PdfSearchIndexLine, ...]
    indexed_chars: int
    pages_without_native_text: tuple[int, ...]
    backend_versions: dict[str, str]


class PdfSearchIndexCache:
    """Small process-local LRU cache keyed by source identity + index revision."""

    def __init__(self, max_documents: int = DEFAULT_MAX_CACHE_DOCUMENTS):
        if max_documents <= 0:
            raise PdfSearchError("PDF_SEARCH_CACHE_POLICY_INVALID", "max cache documents must be positive")
        self.max_documents = max_documents
        self._values: OrderedDict[str, PdfSearchIndex] = OrderedDict()
        self._lock = threading.Lock()

    def get_or_build(self, key: str, builder: Callable[[], PdfSearchIndex]) -> tuple[PdfSearchIndex, bool]:
        with self._lock:
            cached = self._values.get(key)
            if cached is not None:
                self._values.move_to_end(key)
                return cached, True
            built = builder()
            self._values[key] = built
            self._values.move_to_end(key)
            while len(self._values) > self.max_documents:
                self._values.popitem(last=False)
            return built, False


def build_pdf_search_index(
    pdf_bytes: bytes,
    *,
    backend=None,
    password: str | None = None,
    max_pages: int = 2000,
    max_index_chars: int = DEFAULT_MAX_INDEX_CHARS,
) -> PdfSearchIndex:
    if max_pages <= 0 or max_index_chars <= 0:
        raise PdfSearchError("PDF_SEARCH_INDEX_POLICY_INVALID", "search index limits must be positive")
    from pdf_native import PdfPlumberBackend, cluster_chars_into_lines

    native_backend = backend or PdfPlumberBackend()
    try:
        result = native_backend.extract(pdf_bytes, password=password, max_pages=max_pages)
    except ValueError as exc:
        raise PdfSearchError(str(getattr(exc, "code", "PDF_SEARCH_INDEX_FAILED")), str(exc)) from exc

    source_sha = hashlib.sha256(pdf_bytes).hexdigest()
    lines: list[PdfSearchIndexLine] = []
    pages_without_text: list[int] = []
    indexed_chars = 0
    for page in result.pages:
        page_lines = cluster_chars_into_lines(page.chars, page.signals.page)
        useful = tuple(line for line in page_lines if line.text.strip())
        if not useful:
            pages_without_text.append(page.signals.page)
        for line in useful:
            indexed_chars += len(line.text)
            if indexed_chars > max_index_chars:
                raise PdfSearchError(
                    "PDF_SEARCH_INDEX_CHAR_LIMIT_EXCEEDED",
                    f"native-text search index exceeds {max_index_chars} characters",
                )
            lines.append(PdfSearchIndexLine(
                int(page.signals.page),
                str(line.line_id),
                line.text,
                tuple(float(value) for value in line.bbox),
            ))

    backend_versions = dict(sorted((result.backend_versions or {}).items()))
    identity = {
        "revision": PDF_SEARCH_INDEX_REVISION,
        "sourceSha256": source_sha,
        "backendVersions": backend_versions,
    }
    index_id = hashlib.sha256(_canonical_json(identity)).hexdigest()
    return PdfSearchIndex(
        source_sha,
        f"sha256:{index_id}",
        len(result.pages),
        tuple(lines),
        indexed_chars,
        tuple(pages_without_text),
        backend_versions,
    )


def search_pdf_index(
    index: PdfSearchIndex,
    query: str,
    *,
    case_sensitive: bool = False,
    whole_word: bool = False,
    max_results: int = DEFAULT_MAX_SEARCH_RESULTS,
    snippet_chars: int = DEFAULT_SNIPPET_CHARS,
) -> dict:
    _validate_query(query, max_results, snippet_chars)
    pattern = _literal_pattern(query, case_sensitive=case_sensitive, whole_word=whole_word)
    matches = []
    page_counts: dict[int, int] = {}
    for item in index.lines:
        for found in pattern.finditer(item.text):
            if len(matches) >= max_results:
                raise PdfSearchError(
                    "PDF_SEARCH_RESULT_LIMIT_EXCEEDED",
                    f"search exceeds the configured limit of {max_results} matches; narrow the query",
                )
            hit = _match_record(index, item, found, snippet_chars)
            matches.append(hit)
            page_counts[item.page] = page_counts.get(item.page, 0) + 1

    options = {"caseSensitive": case_sensitive, "wholeWord": whole_word, "useRegex": False}
    search_identity = {
        "indexId": index.index_id,
        "query": query,
        "options": options,
        "revision": PDF_SEARCH_INDEX_REVISION,
    }
    search_hash = hashlib.sha256(_canonical_json(search_identity)).hexdigest()
    return {
        "schema": PDF_SEARCH_SCHEMA,
        "indexRevision": PDF_SEARCH_INDEX_REVISION,
        "indexId": index.index_id,
        "searchHash": f"sha256:{search_hash}",
        "query": query,
        "options": options,
        "matches": matches,
        "summary": {
            "totalMatches": len(matches),
            "pagesWithMatches": [
                {"page": page, "matches": page_counts[page]} for page in sorted(page_counts)
            ],
        },
    }


def index_metadata(index: PdfSearchIndex, *, cache_hit: bool) -> dict:
    return {
        "indexId": index.index_id,
        "revision": PDF_SEARCH_INDEX_REVISION,
        "cacheHit": cache_hit,
        "totalPages": index.total_pages,
        "indexedLines": len(index.lines),
        "indexedChars": index.indexed_chars,
        "nativeTextPages": index.total_pages - len(index.pages_without_native_text),
        "pagesWithoutNativeText": list(index.pages_without_native_text),
        "backendVersions": index.backend_versions,
        "nativeTextOnly": True,
    }


def _validate_query(query: str, max_results: int, snippet_chars: int) -> None:
    if not isinstance(query, str) or not query.strip():
        raise PdfSearchError("PDF_SEARCH_QUERY_REQUIRED", "query must be a non-empty string")
    if len(query) > MAX_QUERY_CHARS:
        raise PdfSearchError(
            "PDF_SEARCH_QUERY_LIMIT_EXCEEDED",
            f"query length {len(query)} exceeds limit {MAX_QUERY_CHARS}",
        )
    if max_results <= 0 or snippet_chars <= 0:
        raise PdfSearchError("PDF_SEARCH_POLICY_INVALID", "search result/snippet limits must be positive")


def _literal_pattern(query: str, *, case_sensitive: bool, whole_word: bool) -> re.Pattern:
    escaped = re.escape(query)
    pattern = f"(?<!\\w){escaped}(?!\\w)" if whole_word else escaped
    return re.compile(pattern, 0 if case_sensitive else re.IGNORECASE)


def _match_record(index, item, found, snippet_chars: int) -> dict:
    start, end = found.span()
    snippet, snippet_start = _snippet(item.text, start, end, snippet_chars)
    hit_identity = (
        f"{index.source_sha256}\0{item.page}\0{item.line_id}\0{start}\0{end}\0{found.group(0)}"
    ).encode("utf-8")
    hit_id = hashlib.sha256(hit_identity).hexdigest()[:24]
    return {
        "id": f"pdf-search:{hit_id}",
        "page": item.page,
        "lineId": item.line_id,
        "matchText": found.group(0),
        "lineText": item.text,
        "charRange": {"start": start, "end": end},
        "snippet": snippet,
        "snippetMatchRange": {"start": start - snippet_start, "end": end - snippet_start},
        "bbox": [round(value, 3) for value in item.bbox],
        "bboxPrecision": "line",
        "extraction": "embedded-text",
    }


def _snippet(text: str, start: int, end: int, limit: int) -> tuple[str, int]:
    if len(text) <= limit:
        return text, 0
    match_length = max(1, end - start)
    room = max(0, limit - match_length)
    left = min(start, room // 2)
    snippet_start = start - left
    snippet_end = min(len(text), snippet_start + limit)
    snippet_start = max(0, snippet_end - limit)
    prefix = "…" if snippet_start > 0 else ""
    suffix = "…" if snippet_end < len(text) else ""
    return f"{prefix}{text[snippet_start:snippet_end]}{suffix}", snippet_start - len(prefix)


def _canonical_json(value) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
