"""Native PDF -> semantic document conversion and deterministic Markdown/evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from document_model import (
    DocumentModel,
    PageBreakBlock,
    ParagraphBlock,
    PositionedSpan,
    SourceRef,
    build_evidence,
    canonical_json_bytes,
    options_hash,
)
from pdf_native import (
    NativeBlock,
    PdfPlumberBackend,
    classify_page,
    cluster_chars_into_lines,
    detect_running_content,
    group_lines_into_blocks,
    infer_heading_levels,
    native_text_quality,
    reconstruct_reading_order,
)

PDF_CONVERSION_REVISION = "pdf-native-layout-v1"


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def parse_pdf_bytes(
    pdf_bytes: bytes,
    *,
    password: str | None = None,
    header_mode: str = "metadata",
    footer_mode: str = "metadata",
    backend=None,
    max_pages: int = 2000,
) -> tuple[DocumentModel, dict]:
    backend = backend or PdfPlumberBackend()
    result = backend.extract(pdf_bytes, password=password, max_pages=max_pages)
    page_lines = []
    page_analysis: dict[int, dict] = {}
    diagnostics: list[dict] = []
    for page in result.pages:
        quality = native_text_quality(page.chars, page.signals.duplicate_ratio)
        classification = classify_page(page.signals, quality)
        lines = cluster_chars_into_lines(page.chars, page.signals.page)
        page_lines.append((page.signals.page, page.signals.height, lines))
        page_analysis[page.signals.page] = {
            "page": page.signals.page,
            "width": page.signals.width,
            "height": page.signals.height,
            "charCount": page.signals.char_count,
            "rawCharCount": page.signals.raw_char_count,
            "lineObjectCount": page.signals.line_object_count,
            "rectCount": page.signals.rect_count,
            "curveCount": page.signals.curve_count,
            "imageCount": page.signals.image_count,
            "imageAreaRatio": page.signals.image_area_ratio,
            "duplicateRatio": page.signals.duplicate_ratio,
            "nativeTextQuality": {
                "score": quality.score,
                "adequate": quality.adequate,
                "printableRatio": quality.printable_ratio,
                "replacementRatio": quality.replacement_ratio,
                "controlRatio": quality.control_ratio,
                "visibleCharCount": quality.visible_char_count,
                "reasons": list(quality.reasons),
            },
            "classification": classification.page_type,
            "classificationConfidence": classification.confidence,
            "classificationReasons": list(classification.reasons),
        }
        if not lines:
            diagnostics.append(_page_diagnostic(
                "PDF_TEXT_EMPTY", "WARNING", page.signals.page,
                "No usable native positioned text lines were extracted",
            ))
        if not quality.adequate:
            diagnostics.append(_page_diagnostic(
                "PDF_NATIVE_TEXT_INADEQUATE", "WARNING", page.signals.page,
                "; ".join(quality.reasons) or "native text quality is inadequate",
            ))
    suppressed, running = detect_running_content(tuple(page_lines))
    all_blocks: list[NativeBlock] = []
    running_headers = [item for item in running if item["kind"] == "header"]
    running_footers = [item for item in running if item["kind"] == "footer"]
    for page_number, height, lines in page_lines:
        page_info = page_analysis[page_number]
        filtered = tuple(
            line for line in lines
            if not _suppress_line(line.line_id, suppressed, line, height, header_mode, footer_mode)
        )
        order = reconstruct_reading_order(
            filtered, page_info["width"], page_info["height"], page_number,
        )
        diagnostics.extend(order.diagnostics)
        page_info["readingOrder"] = order.mode
        page_info["readingOrderConfidence"] = order.confidence
        page_info["lineCount"] = len(lines)
        page_info["bodyLineCount"] = len(filtered)
        all_blocks.extend(group_lines_into_blocks(order.lines, page_number))
    inferred = infer_heading_levels(tuple(all_blocks))
    inferred_by_page: dict[int, list[NativeBlock]] = {}
    for block in inferred:
        inferred_by_page.setdefault(block.page, []).append(block)
    semantic_blocks = []
    sorted_pages = sorted(page_analysis)
    for page_index, page_number in enumerate(sorted_pages):
        for block in inferred_by_page.get(page_number, []):
            semantic_blocks.append(_semantic_block(block))
        if page_index + 1 < len(sorted_pages):
            semantic_blocks.append(PageBreakBlock(
                f"pdf:p{page_number}:break",
                SourceRef("pdf", page=page_number, extraction="page-boundary"),
            ))
    metadata = {
        "backend": "pdfplumber/pdfminer.six",
        "backendVersions": result.backend_versions,
        "pdfMetadata": result.metadata,
        "coordinateSystem": "top-left-points",
        "pages": [page_analysis[index] for index in sorted_pages],
        "headerMode": header_mode,
        "footerMode": footer_mode,
        "runningHeaderCount": len(running_headers),
        "runningFooterCount": len(running_footers),
    }
    if header_mode != "drop":
        metadata["runningHeaders"] = running_headers
    else:
        diagnostics.extend(_drop_running_diagnostics(running_headers, "header"))
    if footer_mode != "drop":
        metadata["runningFooters"] = running_footers
    else:
        diagnostics.extend(_drop_running_diagnostics(running_footers, "footer"))
    document = DocumentModel(
        "pdf", tuple(semantic_blocks), metadata=metadata, diagnostics=tuple(diagnostics),
    )
    stats = {
        "pages": len(result.pages),
        "paragraphs": sum(len(value) for value in inferred_by_page.values()),
        "chars": sum(page.signals.char_count for page in result.pages),
        "reading_order_ambiguous_pages": sum(
            page_analysis[index].get("readingOrder") == "ambiguous" for index in sorted_pages
        ),
        "native_text_inadequate_pages": sum(
            not page_analysis[index]["nativeTextQuality"]["adequate"] for index in sorted_pages
        ),
        "backend_versions": result.backend_versions,
    }
    return document, stats


def _suppress_line(
    line_id: str, suppressed: set[str], line, height: float,
    header_mode: str, footer_mode: str,
) -> bool:
    if line_id not in suppressed:
        return False
    ratio = ((line.bbox[1] + line.bbox[3]) / 2.0) / max(1.0, height)
    if ratio <= 0.08:
        return header_mode != "keep"
    if ratio >= 0.92:
        return footer_mode != "keep"
    return False


def _semantic_block(block: NativeBlock) -> ParagraphBlock:
    provenance = SourceRef(
        "pdf", page=block.page, bbox=block.bbox, extraction="embedded-text",
    )
    source_refs = tuple(
        SourceRef("pdf", page=block.page, bbox=line.bbox, extraction="embedded-text")
        for line in block.lines
    )
    spans = tuple(
        PositionedSpan(
            span.text, span.bbox, span.font, span.size, span.bold, span.italic, block.page,
        )
        for line in block.lines for span in line.spans
    )
    return ParagraphBlock(
        f"pdf:p{block.page}:b{block.block_index}", block.text, provenance,
        heading_level=block.heading_level, source_refs=source_refs, positioned_spans=spans,
    )


def _page_diagnostic(code: str, severity: str, page: int, message: str) -> dict:
    return {
        "code": code,
        "severity": severity,
        "message": message,
        "provenance": {"source_type": "pdf", "page": page},
    }


def _drop_running_diagnostics(items: list[dict], kind: str) -> list[dict]:
    return [{
        "code": f"PDF_RUNNING_{kind.upper()}_DROPPED",
        "severity": "INFO",
        "message": f"Repeated PDF {kind} intentionally dropped: {item['text']}",
        "provenance": {"source_type": "pdf", "page": item["pages"][0]},
    } for item in items]


def render_pdf_document(document: DocumentModel) -> str:
    parts: list[str] = []
    for block in document.blocks:
        if isinstance(block, PageBreakBlock):
            parts.append("---")
        elif isinstance(block, ParagraphBlock):
            text = block.text.strip()
            if not text:
                continue
            if block.heading_level is not None:
                parts.append(f"{'#' * block.heading_level} {text}")
            else:
                parts.append(text)
    return "\n\n".join(parts).rstrip() + "\n" if parts else "\n"


def convert_pdf_bytes(
    pdf_bytes: bytes,
    *,
    password: str | None = None,
    header_mode: str = "metadata",
    footer_mode: str = "metadata",
    backend=None,
) -> tuple[bytes, dict]:
    document, stats = parse_pdf_bytes(
        pdf_bytes, password=password, header_mode=header_mode,
        footer_mode=footer_mode, backend=backend,
    )
    output = render_pdf_document(document).encode("utf-8")
    options = _canonical_options(
        header_mode, footer_mode, document.metadata.get("backendVersions", {}),
    )
    return output, {
        **stats,
        "source_sha256": sha256_hex(pdf_bytes),
        "source_git_blob_sha": git_blob_sha(pdf_bytes),
        "output_sha256": sha256_hex(output),
        "output_bytes": len(output),
        "options_hash": options_hash(options),
        "pdf_conversion_revision": PDF_CONVERSION_REVISION,
    }


def conversion_evidence(
    pdf_bytes: bytes,
    *,
    password: str | None = None,
    header_mode: str = "metadata",
    footer_mode: str = "metadata",
    backend=None,
) -> dict:
    document, _ = parse_pdf_bytes(
        pdf_bytes, password=password, header_mode=header_mode,
        footer_mode=footer_mode, backend=backend,
    )
    evidence = build_evidence(
        document,
        source_sha256=sha256_hex(pdf_bytes),
        source_git_blob_sha=git_blob_sha(pdf_bytes),
        profile="readable",
        options=_canonical_options(
            header_mode, footer_mode, document.metadata.get("backendVersions", {}),
        ),
    )
    evidence["pdfConversionRevision"] = PDF_CONVERSION_REVISION
    return evidence


def _canonical_options(
    header_mode: str, footer_mode: str, backend_versions: dict[str, str] | None = None,
) -> dict:
    return {
        "profile": "readable",
        "sourceType": "pdf",
        "headers": header_mode,
        "footers": footer_mode,
        "ocr": "never",
        "backendVersions": dict(sorted((backend_versions or {}).items())),
    }


def default_output_path(input_path: Path) -> Path:
    return input_path.with_suffix(".md")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Input PDF path")
    parser.add_argument("-o", "--output", type=Path, help="Output Markdown path")
    parser.add_argument("--evidence", type=Path, help="Optional deterministic evidence JSON path")
    parser.add_argument("--pdf-password", help="Password for an encrypted PDF")
    parser.add_argument(
        "--headers", choices=("keep", "metadata", "drop"), default="metadata",
        help="Repeated PDF header policy",
    )
    parser.add_argument(
        "--footers", choices=("keep", "metadata", "drop"), default="metadata",
        help="Repeated PDF footer policy",
    )
    parser.add_argument("--stats-json", action="store_true")
    return parser


def run_cli(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.input.is_file():
        raise ValueError(f"Input file does not exist: {args.input}")
    source = args.input.read_bytes()
    output, stats = convert_pdf_bytes(
        source, password=args.pdf_password, header_mode=args.headers, footer_mode=args.footers,
    )
    output_path = args.output or default_output_path(args.input)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(output)
    if args.evidence:
        args.evidence.parent.mkdir(parents=True, exist_ok=True)
        args.evidence.write_bytes(canonical_json_bytes(conversion_evidence(
            source, password=args.pdf_password, header_mode=args.headers, footer_mode=args.footers,
        )))
    if args.stats_json:
        print(json.dumps({**stats, "output_path": str(output_path)}, sort_keys=True))
    else:
        print(f"wrote {output_path} ({stats['output_bytes']} bytes)")
    return 0
