#!/usr/bin/env python3
"""Convert a DOCX Word body to deterministic Markdown.

The public CLI and conversion function remain compatible with the original
stdlib converter while parsing through a versioned semantic document model.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import sys
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

from document_model import (
    CANONICALIZATION_VERSION,
    SEMANTIC_SCHEMA_VERSION,
    DocumentModel,
    PageBreakBlock,
    ParagraphBlock,
    SourceRef,
    TableBlock,
    TableCell,
    TableRow,
    build_evidence,
    canonical_json_bytes,
    options_hash,
)

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{WORD_NS}}}"
DOC_PART = "word/document.xml"


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_document_xml(docx_bytes: bytes) -> tuple[bytes, int]:
    try:
        with zipfile.ZipFile(BytesIO(docx_bytes)) as package:
            try:
                info = package.getinfo(DOC_PART)
                return package.read(info), info.CRC
            except KeyError as exc:
                raise ValueError(f"DOCX does not contain {DOC_PART}") from exc
    except zipfile.BadZipFile as exc:
        raise ValueError("Input is not a valid DOCX/ZIP package") from exc


def local_name(node: ET.Element) -> str:
    return node.tag.rsplit("}", 1)[-1]


def paragraph_style(paragraph: ET.Element) -> str | None:
    properties = paragraph.find(W + "pPr")
    if properties is None:
        return None
    style = properties.find(W + "pStyle")
    return None if style is None else style.get(W + "val")


def paragraph_text(paragraph: ET.Element) -> tuple[str, bool]:
    parts: list[str] = []
    page_break = False
    for node in paragraph.iter():
        name = local_name(node)
        if name == "t":
            parts.append(node.text or "")
        elif name == "tab":
            parts.append("\t")
        elif name == "br":
            page_break = page_break or node.get(W + "type") == "page"
            parts.append("\n")
    return "".join(parts), page_break


def table_colspan(cell: ET.Element) -> int:
    properties = cell.find(W + "tcPr")
    grid_span = None if properties is None else properties.find(W + "gridSpan")
    raw = None if grid_span is None else grid_span.get(W + "val")
    try:
        return max(1, int(raw)) if raw is not None else 1
    except ValueError:
        return 1


def heading_level(style: str | None) -> int | None:
    if not style or not style.startswith("Heading"):
        return None
    level_text = style.removeprefix("Heading")
    if not level_text.isdigit():
        return None
    level = int(level_text)
    return level if 1 <= level <= 6 else None


def parse_cell_blocks(cell: ET.Element, table_index: int, row_index: int, cell_index: int) -> tuple:
    blocks = []
    for child_index, child in enumerate(list(cell)):
        name = local_name(child)
        provenance = SourceRef("docx", DOC_PART, table_index=table_index, row_index=row_index, cell_index=cell_index)
        if name == "p":
            text, _ = paragraph_text(child)
            if text:
                blocks.append(ParagraphBlock(f"docx:t{table_index}:r{row_index}:c{cell_index}:p{child_index}", text, provenance))
        elif name == "tbl":
            blocks.append(parse_table(child, table_index, f"docx:t{table_index}:r{row_index}:c{cell_index}:t{child_index}"))
    return tuple(blocks)


def parse_table(table: ET.Element, table_index: int, block_id: str | None = None) -> TableBlock:
    rows = []
    for row_index, row in enumerate(table.findall(W + "tr")):
        cells = []
        for cell_index, cell in enumerate(row.findall(W + "tc")):
            provenance = SourceRef("docx", DOC_PART, table_index=table_index, row_index=row_index, cell_index=cell_index)
            cells.append(TableCell(parse_cell_blocks(cell, table_index, row_index, cell_index), provenance, table_colspan(cell)))
        rows.append(TableRow(tuple(cells)))
    return TableBlock(block_id or f"docx:t{table_index}", tuple(rows), SourceRef("docx", DOC_PART, table_index=table_index))


def count_nonempty_text_nodes(body: ET.Element) -> int:
    return sum(1 for node in body.iter(W + "t") if node.text not in (None, ""))


def parse_document_xml(document_xml: bytes) -> tuple[DocumentModel, dict]:
    try:
        root = ET.fromstring(document_xml)
    except ET.ParseError as exc:
        raise ValueError(f"{DOC_PART} is not valid XML: {exc}") from exc
    body = root.find(W + "body")
    if body is None:
        raise ValueError(f"{DOC_PART} does not contain w:body")

    blocks = []
    paragraph_count = 0
    table_count = 0
    for child in list(body):
        name = local_name(child)
        if name == "p":
            paragraph_index = paragraph_count
            paragraph_count += 1
            text, has_page_break = paragraph_text(child)
            provenance = SourceRef("docx", DOC_PART, paragraph_index=paragraph_index)
            if has_page_break:
                blocks.append(PageBreakBlock(f"docx:p{paragraph_index}:page-break", provenance))
                text = text.lstrip("\n")
            if text:
                blocks.append(ParagraphBlock(f"docx:p{paragraph_index}", text, provenance, heading_level(paragraph_style(child))))
        elif name == "tbl":
            blocks.append(parse_table(child, table_count))
            table_count += 1

    document = DocumentModel("docx", tuple(blocks), metadata={"part": DOC_PART})
    stats = {
        "paragraphs": paragraph_count,
        "tables": table_count,
        "nonempty_text_nodes": count_nonempty_text_nodes(body),
    }
    return document, stats


def render_paragraph(block: ParagraphBlock) -> str:
    if block.heading_level is None:
        return block.text
    return f"{'#' * block.heading_level} {block.text.strip()}"


def render_cell_html(cell: TableCell) -> str:
    pieces = []
    for block in cell.blocks:
        if isinstance(block, ParagraphBlock):
            pieces.append(html.escape(block.text, quote=False).replace("\t", "&#9;").replace("\n", "<br>"))
        elif isinstance(block, TableBlock):
            pieces.append(render_table_html(block))
    return "<br>".join(pieces)


def render_table_html(table: TableBlock, indent: int = 0) -> str:
    prefix = " " * indent
    lines = [prefix + "<table>"]
    for row in table.rows:
        lines.append(prefix + "  <tr>")
        for cell in row.cells:
            attr = f' colspan="{cell.column_span}"' if cell.column_span != 1 else ""
            lines.append(prefix + f"    <td{attr}>{render_cell_html(cell)}</td>")
        lines.append(prefix + "  </tr>")
    lines.append(prefix + "</table>")
    return "\n".join(lines)


def flatten_block_text(block) -> str:
    if isinstance(block, ParagraphBlock):
        return block.text.replace("\t", " ").replace("\n", " ")
    if isinstance(block, TableBlock):
        return " / ".join(" | ".join(flatten_cell_text(cell) for cell in row.cells) for row in block.rows)
    return ""


def flatten_cell_text(cell: TableCell) -> str:
    return " ".join(text for text in (flatten_block_text(block) for block in cell.blocks) if text)


def render_table_tsv(table: TableBlock) -> str:
    return "\n".join("\t".join(flatten_cell_text(cell) for cell in row.cells) for row in table.rows)


def render_document(document: DocumentModel, table_format: str) -> str:
    blocks = []
    for block in document.blocks:
        if isinstance(block, PageBreakBlock):
            blocks.append("---")
        elif isinstance(block, ParagraphBlock):
            blocks.append(render_paragraph(block))
        elif isinstance(block, TableBlock):
            blocks.append(render_table_html(block) if table_format == "html" else render_table_tsv(block))
    return "\n\n".join(blocks).rstrip() + "\n"


def convert_document_xml(document_xml: bytes, table_format: str) -> tuple[str, dict]:
    document, stats = parse_document_xml(document_xml)
    return render_document(document, table_format), stats


def convert_docx_bytes(docx_bytes: bytes, table_format: str) -> tuple[bytes, dict]:
    document_xml, document_crc = read_document_xml(docx_bytes)
    document, stats = parse_document_xml(document_xml)
    output = render_document(document, table_format).encode("utf-8")
    option_values = {"profile": "readable", "tableFormat": table_format}
    return output, {
        **stats,
        "docx_bytes": len(docx_bytes),
        "document_xml_bytes": len(document_xml),
        "document_xml_crc32": f"0x{document_crc:08x}",
        "source_git_blob_sha": git_blob_sha(docx_bytes),
        "source_sha256": sha256_hex(docx_bytes),
        "output_sha256": sha256_hex(output),
        "output_bytes": len(output),
        "table_format": table_format,
        "semantic_schema_version": SEMANTIC_SCHEMA_VERSION,
        "canonicalization_version": CANONICALIZATION_VERSION,
        "options_hash": options_hash(option_values),
    }


def conversion_evidence(docx_bytes: bytes, table_format: str) -> dict:
    document_xml, _ = read_document_xml(docx_bytes)
    document, _ = parse_document_xml(document_xml)
    options = {"profile": "readable", "tableFormat": table_format}
    return build_evidence(
        document,
        source_sha256=sha256_hex(docx_bytes),
        source_git_blob_sha=git_blob_sha(docx_bytes),
        profile="readable",
        options=options,
    )


def default_output_path(input_path: Path) -> Path:
    return input_path.with_suffix(".md")


def verify_expected(label: str, actual: str, expected: str | None) -> None:
    if expected and actual.lower() != expected.lower():
        raise ValueError(f"{label} mismatch: {actual} != {expected}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Input DOCX path")
    parser.add_argument("-o", "--output", type=Path, help="Output Markdown path")
    parser.add_argument("--table-format", choices=("html", "tsv"), default="html", help="Table rendering: faithful HTML tables or compact TSV rows")
    parser.add_argument("--evidence", type=Path, help="Optional deterministic evidence JSON path")
    parser.add_argument("--expected-git-blob-sha", help="Expected source Git blob SHA-1")
    parser.add_argument("--expected-output-sha256", help="Expected Markdown SHA-256")
    parser.add_argument("--stats-json", action="store_true", help="Print deterministic conversion statistics as JSON")
    return parser


def run_cli(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.input.is_file():
        raise ValueError(f"Input file does not exist: {args.input}")
    source = args.input.read_bytes()
    output, stats = convert_docx_bytes(source, args.table_format)
    verify_expected("source Git blob SHA", stats["source_git_blob_sha"], args.expected_git_blob_sha)
    verify_expected("output SHA-256", stats["output_sha256"], args.expected_output_sha256)
    output_path = args.output or default_output_path(args.input)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(output)
    if args.evidence:
        args.evidence.parent.mkdir(parents=True, exist_ok=True)
        args.evidence.write_bytes(canonical_json_bytes(conversion_evidence(source, args.table_format)))
    if args.stats_json:
        print(json.dumps({**stats, "output_path": str(output_path)}, sort_keys=True))
    else:
        print(f"wrote {output_path} ({stats['output_bytes']} bytes)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(run_cli())
    except (OSError, ValueError) as exc:
        print(f"docx_to_markdown: {exc}", file=sys.stderr)
        raise SystemExit(2)
