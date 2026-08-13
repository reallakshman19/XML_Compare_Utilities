#!/usr/bin/env python3
"""Compatibility entry point for PDF -> deterministic Markdown with controlled OCR."""

from pdf_conversion import default_output_path, parse_pdf_bytes
from pdf_ocr_conversion import build_parser, conversion_evidence, convert_pdf_bytes, run_cli
from pdf_native import PdfExtractionError
from pdf_ocr import OcrError


if __name__ == "__main__":
    try:
        raise SystemExit(run_cli())
    except (OSError, ValueError, PdfExtractionError, OcrError) as exc:
        print(f"pdf_to_markdown: {exc}", file=__import__("sys").stderr)
        raise SystemExit(2)
