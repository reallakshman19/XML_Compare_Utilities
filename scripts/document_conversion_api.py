#!/usr/bin/env python3
"""Small controlled HTTP API over the existing DOCX/PDF -> Markdown converters."""
from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import threading

from document_conversion_service import (
    API_SCHEMA,
    ConversionApiError,
    ConversionServiceConfig,
    DocumentConversionService,
)
from pdf_search_index import (
    DEFAULT_MAX_CACHE_DOCUMENTS,
    DEFAULT_MAX_INDEX_CHARS,
    DEFAULT_MAX_SEARCH_RESULTS,
)

DEFAULT_MAX_REQUEST_BYTES = 128 * 1024


class ConversionHttpServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, server_address, handler_cls, *, service, max_request_bytes, max_concurrency):
        super().__init__(server_address, handler_cls)
        self.service = service
        self.max_request_bytes = max_request_bytes
        self.semaphore = threading.BoundedSemaphore(max_concurrency)


class ConversionRequestHandler(BaseHTTPRequestHandler):
    server_version = "DocumentConversionApi/1"

    def do_GET(self):
        if self.path == "/healthz":
            self._write_json(200, {"status": "ok", "schema": API_SCHEMA})
            return
        if self.path == "/v1/capabilities":
            self._write_json(200, {
                "schema": API_SCHEMA,
                "sourceTypes": ["docx", "pdf"],
                "pdfPageRange": {"supported": True, "numbering": "1-based-inclusive"},
                "pdfSearch": {
                    "supported": True,
                    "endpoint": "/v1/search",
                    "nativeTextOnly": True,
                    "caseSensitive": True,
                    "wholeWord": True,
                    "regex": False,
                    "completeOrError": True,
                },
                "assetTransport": False,
                "remoteSourceFetch": False,
            })
            return
        self._write_error(404, "API_ROUTE_NOT_FOUND", "route not found")

    def do_POST(self):
        operation = {
            "/v1/convert": self.server.service.convert,
            "/v1/search": self.server.service.search,
        }.get(self.path)
        if operation is None:
            self._write_error(404, "API_ROUTE_NOT_FOUND", "route not found")
            return
        payload = self._read_json_request()
        if payload is None:
            return

        if not self.server.semaphore.acquire(blocking=False):
            self._write_error(503, "API_BUSY", "conversion/search concurrency limit reached")
            return
        try:
            result = operation(payload)
            self._write_json(200, result)
        except ConversionApiError as exc:
            self._write_json(exc.status, exc.to_dict())
        except Exception as exc:
            self._write_error(500, "API_INTERNAL_ERROR", f"request failed: {type(exc).__name__}")
        finally:
            self.server.semaphore.release()

    def _read_json_request(self):
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            self._write_error(415, "API_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json")
            return None
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._write_error(400, "API_CONTENT_LENGTH_INVALID", "Content-Length must be an integer")
            return None
        if length <= 0 or length > self.server.max_request_bytes:
            self._write_error(
                413,
                "API_REQUEST_SIZE_LIMIT_EXCEEDED",
                f"request body must be 1..{self.server.max_request_bytes} bytes",
            )
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._write_error(400, "API_JSON_INVALID", "request body must be valid UTF-8 JSON")
            return None

    def log_message(self, format, *args):
        super().log_message(format, *args)

    def _write_error(self, status: int, code: str, message: str):
        self._write_json(status, {"error": {"code": code, "message": message}})

    def _write_json(self, status: int, payload: dict):
        data = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument(
        "--allow-root",
        action="append",
        default=[],
        help="Allowed local source root. Repeat for multiple roots. Required unless DOCUMENT_CONVERSION_ALLOWED_ROOTS is set.",
    )
    parser.add_argument("--max-source-mb", type=int, default=512)
    parser.add_argument("--max-range-pages", type=int, default=50)
    parser.add_argument("--max-source-pages", type=int, default=2000)
    parser.add_argument("--max-search-index-chars", type=int, default=DEFAULT_MAX_INDEX_CHARS)
    parser.add_argument("--max-search-results", type=int, default=DEFAULT_MAX_SEARCH_RESULTS)
    parser.add_argument("--max-search-cache-documents", type=int, default=DEFAULT_MAX_CACHE_DOCUMENTS)
    parser.add_argument("--max-request-kb", type=int, default=128)
    parser.add_argument("--max-concurrency", type=int, default=2)
    return parser


def _roots(args) -> list[str]:
    roots = list(args.allow_root)
    env = os.environ.get("DOCUMENT_CONVERSION_ALLOWED_ROOTS", "")
    if env:
        roots.extend(value for value in env.split(os.pathsep) if value)
    if not roots:
        raise ConversionApiError(
            "API_ALLOWED_ROOT_REQUIRED",
            "configure --allow-root or DOCUMENT_CONVERSION_ALLOWED_ROOTS; arbitrary filesystem access is disabled",
            500,
        )
    return roots


def run(argv=None) -> int:
    args = build_parser().parse_args(argv)
    if not (1 <= args.port <= 65535):
        raise ConversionApiError("API_PORT_INVALID", "port must be between 1 and 65535", 500)
    limits = (
        args.max_source_mb,
        args.max_range_pages,
        args.max_source_pages,
        args.max_search_index_chars,
        args.max_search_results,
        args.max_search_cache_documents,
        args.max_request_kb,
        args.max_concurrency,
    )
    if min(limits) <= 0:
        raise ConversionApiError("API_POLICY_INVALID", "all API resource limits must be positive", 500)
    config = ConversionServiceConfig.from_roots(
        _roots(args),
        max_source_bytes=args.max_source_mb * 1024 * 1024,
        max_range_pages=args.max_range_pages,
        max_source_pages=args.max_source_pages,
        max_search_index_chars=args.max_search_index_chars,
        max_search_results=args.max_search_results,
        max_search_cache_documents=args.max_search_cache_documents,
    )
    service = DocumentConversionService(config)
    server = ConversionHttpServer(
        (args.host, args.port),
        ConversionRequestHandler,
        service=service,
        max_request_bytes=args.max_request_kb * 1024,
        max_concurrency=args.max_concurrency,
    )
    print(f"document conversion API listening on http://{args.host}:{args.port}")
    print(f"allowed source roots: {len(config.allowed_roots)} configured")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except ConversionApiError as exc:
        print(f"document_conversion_api: {exc.code}: {exc}", file=__import__("sys").stderr)
        raise SystemExit(2)
