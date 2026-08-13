import http.client
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from document_conversion_api import ConversionHttpServer, ConversionRequestHandler
from document_conversion_service import (
    ConversionApiError,
    ConversionServiceConfig,
    DocumentConversionService,
)
from pdf_native import NativeChar, PageExtraction, PageSignals, PdfBackendResult

try:
    import pdfplumber  # noqa: F401
    from reportlab.pdfgen import canvas
except ImportError:
    canvas = None


def _page(page: int, text: str) -> PageExtraction:
    chars = []
    x = 40.0
    for char in text:
        width = 3.0 if char.isspace() else 5.0
        chars.append(NativeChar(char, (x, 100.0, x + width, 110.0), "Helvetica", 10.0))
        x += width
    signals = PageSignals(
        page, 600.0, 800.0, len(chars), len(chars),
        0, 0, 0, 0, 0.0, 0.0,
    )
    return PageExtraction(signals, tuple(chars))


class FakeSearchBackend:
    def __init__(self):
        self.calls = 0
        self.passwords = []

    def extract(self, pdf_bytes, *, password=None, max_pages=2000):
        self.calls += 1
        self.passwords.append(password)
        pages = (
            _page(1, "Section T2.3 first"),
            _page(2, "T2.30 then T2.3 and t2.3"),
            _page(3, ""),
        )
        return PdfBackendResult(pages, {}, {"fake-search": "1"})


class PdfSearchServiceTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name).resolve()
        self.pdf = self.root / "source.pdf"
        self.pdf.write_bytes(b"%PDF-search-fixture")
        self.docx = self.root / "source.docx"
        self.docx.write_bytes(b"PK-search-fixture")
        self.backend = FakeSearchBackend()
        self.config = ConversionServiceConfig(
            (self.root,),
            max_source_bytes=1024,
            max_search_index_chars=10000,
            max_search_results=20,
            max_search_cache_documents=2,
        )
        self.service = DocumentConversionService(self.config, search_backend=self.backend)

    def tearDown(self):
        self.tmp.cleanup()

    def test_literal_search_returns_every_match_and_cache_reuses_index(self):
        first = self.service.search({"sourcePath": str(self.pdf), "query": "T2.3"})
        self.assertEqual(first["summary"]["totalMatches"], 4)
        self.assertEqual(
            first["summary"]["pagesWithMatches"],
            [{"page": 1, "matches": 1}, {"page": 2, "matches": 3}],
        )
        self.assertEqual([hit["page"] for hit in first["matches"]], [1, 2, 2, 2])
        self.assertFalse(first["index"]["cacheHit"])
        self.assertEqual(first["index"]["pagesWithoutNativeText"], [3])
        self.assertEqual(first["diagnostics"][0]["code"], "PDF_SEARCH_NATIVE_TEXT_INCOMPLETE")

        second = self.service.search({"sourcePath": str(self.pdf), "query": "first"})
        self.assertTrue(second["index"]["cacheHit"])
        self.assertEqual(self.backend.calls, 1)

    def test_case_and_whole_word_controls_match_pdf_hub_style_contract(self):
        whole = self.service.search({
            "sourcePath": str(self.pdf),
            "query": "T2.3",
            "options": {"wholeWord": True},
        })
        sensitive = self.service.search({
            "sourcePath": str(self.pdf),
            "query": "T2.3",
            "options": {"caseSensitive": True},
        })
        self.assertEqual(whole["summary"]["totalMatches"], 3)
        self.assertEqual(sensitive["summary"]["totalMatches"], 3)
        common = next(hit for hit in whole["matches"] if hit["page"] == 1)
        baseline = self.service.search({"sourcePath": str(self.pdf), "query": "T2.3"})
        self.assertEqual(common["id"], next(hit for hit in baseline["matches"] if hit["page"] == 1)["id"])

    def test_invalid_queries_and_regex_fail_before_expensive_indexing(self):
        with self.assertRaises(ConversionApiError) as caught:
            self.service.search({"sourcePath": str(self.pdf), "query": ""})
        self.assertEqual(caught.exception.code, "PDF_SEARCH_QUERY_REQUIRED")
        self.assertEqual(self.backend.calls, 0)

        with self.assertRaises(ConversionApiError) as caught:
            self.service.search({
                "sourcePath": str(self.pdf),
                "query": "T2.3",
                "options": {"useRegex": True},
            })
        self.assertEqual(caught.exception.code, "PDF_SEARCH_REGEX_UNSUPPORTED")
        self.assertEqual(self.backend.calls, 0)

    def test_search_is_pdf_only_and_result_limit_is_fail_closed(self):
        with self.assertRaises(ConversionApiError) as caught:
            self.service.search({"sourcePath": str(self.docx), "query": "T2.3"})
        self.assertEqual(caught.exception.code, "PDF_SEARCH_SOURCE_REQUIRED")

        limited = DocumentConversionService(
            ConversionServiceConfig(
                (self.root,),
                max_source_bytes=1024,
                max_search_index_chars=10000,
                max_search_results=2,
            ),
            search_backend=self.backend,
        )
        with self.assertRaises(ConversionApiError) as caught:
            limited.search({"sourcePath": str(self.pdf), "query": "T2.3"})
        self.assertEqual(caught.exception.code, "PDF_SEARCH_RESULT_LIMIT_EXCEEDED")

    def test_encrypted_index_cache_is_partitioned_by_password(self):
        self.service.search({"sourcePath": str(self.pdf), "query": "T2.3", "password": "alpha"})
        self.service.search({"sourcePath": str(self.pdf), "query": "T2.3", "password": "alpha"})
        self.service.search({"sourcePath": str(self.pdf), "query": "T2.3", "password": "beta"})
        self.assertEqual(self.backend.passwords, ["alpha", "beta"])


class PdfSearchHttpTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name).resolve()
        self.pdf = self.root / "source.pdf"
        self.pdf.write_bytes(b"%PDF-search-fixture")
        self.backend = FakeSearchBackend()
        self.service = DocumentConversionService(
            ConversionServiceConfig((self.root,), max_source_bytes=1024),
            search_backend=self.backend,
        )
        self.server = ConversionHttpServer(
            ("127.0.0.1", 0),
            ConversionRequestHandler,
            service=self.service,
            max_request_bytes=4096,
            max_concurrency=1,
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.tmp.cleanup()

    def _request(self, method, path, payload=None):
        body = None if payload is None else json.dumps(payload)
        headers = {}
        if body is not None:
            headers = {
                "Content-Type": "application/json",
                "Content-Length": str(len(body.encode("utf-8"))),
            }
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=2)
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        data = json.loads(response.read().decode("utf-8"))
        connection.close()
        return response.status, data

    def test_http_search_and_capability_contract(self):
        status, capabilities = self._request("GET", "/v1/capabilities")
        self.assertEqual(status, 200)
        self.assertTrue(capabilities["pdfSearch"]["supported"])
        self.assertTrue(capabilities["pdfSearch"]["nativeTextOnly"])

        status, result = self._request("POST", "/v1/search", {
            "sourcePath": str(self.pdf),
            "query": "T2.3",
        })
        self.assertEqual(status, 200)
        self.assertEqual(result["schema"], "PdfSearchApi.v1")
        self.assertEqual(result["summary"]["totalMatches"], 4)


@unittest.skipIf(canvas is None, "reportlab/pdfplumber unavailable")
class PdfSearchRealIntegrationTest(unittest.TestCase):
    def test_real_sixty_page_pdf_returns_original_pages_50_and_55(self):
        from io import BytesIO

        stream = BytesIO()
        pdf = canvas.Canvas(stream, pagesize=(600, 800))
        for page in range(1, 61):
            pdf.setFont("Helvetica", 10)
            text = f"Page {page} ordinary content"
            if page in {50, 55}:
                text += " Section T2.3 controlled marker"
            pdf.drawString(50, 740, text)
            pdf.showPage()
        pdf.save()

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            source = root / "sixty-pages.pdf"
            source.write_bytes(stream.getvalue())
            service = DocumentConversionService(ConversionServiceConfig((root,)))
            result = service.search({"sourcePath": str(source), "query": "T2.3"})
        self.assertEqual(result["index"]["totalPages"], 60)
        self.assertEqual([item["page"] for item in result["matches"]], [50, 55])


if __name__ == "__main__":
    unittest.main()
