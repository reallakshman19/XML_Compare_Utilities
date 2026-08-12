#!/usr/bin/env python3
"""Convert a DOCX Word body to deterministic Markdown using only Python stdlib.

The converter reads ``word/document.xml`` from the DOCX ZIP package and walks
paragraphs/tables in document order. It preserves Word heading styles, tabs,
line/page breaks, table text, nested tables, and horizontal grid spans.

Inputs:
  - A local .docx path.
  - Optional expected Git blob SHA-1 for source identity.
  - Optional expected SHA-256 for generated Markdown identity.

Outputs:
  - Markdown in either HTML-table or compact TSV-table form.
  - Optional JSON conversion statistics on stdout.

No Office application, OCR, Pandoc, or third-party package is required.
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

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{WORD_NS}}}"


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_document_xml(docx_bytes: bytes) -> tuple[bytes, int]:
    try:
        with zipfile.ZipFile(BytesIO(docx_bytes)) as package:
            try:
                info = package.getinfo("word/document.xml")
                return package.read(info), info.CRC
            except KeyError as exc:
                raise ValueError("DOCX does not contain word/document.xml") from exc
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


def html_paragraph_text(paragraph: ET.Element) -> str:
    parts: list[str] = []
    for node in paragraph.iter():
        name = local_name(node)
        if name == "t":
            parts.append(html.escape(node.text or "", quote=False))
        elif name == "tab":
            parts.append("&#9;")
        elif name == "br":
            parts.append("<br>")
    return "".join(parts)


def table_colspan(cell: ET.Element) -> str | None:
    properties = cell.find(W + "tcPr")
    if properties is None:
        return None
    grid_span = properties.find(W + "gridSpan")
    return None if grid_span is None else grid_span.get(W + "val")


def table_cell_html(cell: ET.Element) -> str:
    pieces: list[str] = []
    for child in list(cell):
        name = local_name(child)
        if name == "p":
            text = html_paragraph_text(child)
            if text:
                pieces.append(text)
        elif name == "tbl":
            pieces.append(table_to_html(child))
    return "<br>".join(pieces)


def table_to_html(table: ET.Element, indent: int = 0) -> str:
    prefix = " " * indent
    lines = [prefix + "<table>"]
    for row in table.findall(W + "tr"):
        lines.append(prefix + "  <tr>")
        for cell in row.findall(W + "tc"):
            colspan = table_colspan(cell)
            attr = f' colspan="{colspan}"' if colspan and colspan != "1" else ""
            lines.append(prefix + f"    <td{attr}>{table_cell_html(cell)}</td>")
        lines.append(prefix + "  </tr>")
    lines.append(prefix + "</table>")
    return "\n".join(lines)


def flatten_table_text(table: ET.Element) -> str:
    rows: list[str] = []
    for row in table.findall(W + "tr"):
        cells = [flatten_cell_text(cell) for cell in row.findall(W + "tc")]
        rows.append(" | ".join(cells))
    return " / ".join(rows)


def flatten_cell_text(cell: ET.Element) -> str:
    pieces: list[str] = []
    for child in list(cell):
        name = local_name(child)
        if name == "p":
            text, _ = paragraph_text(child)
            if text:
                pieces.append(text.replace("\t", " ").replace("\n", " "))
        elif name == "tbl":
            nested = flatten_table_text(child)
            if nested:
                pieces.append(nested)
    return " ".join(pieces)


def table_to_tsv(table: ET.Element) -> str:
    rows: list[str] = []
    for row in table.findall(W + "tr"):
        cells = [flatten_cell_text(cell) for cell in row.findall(W + "tc")]
        rows.append("\t".join(cells))
    return "\n".join(rows)


def heading_prefix(style: str | None) -> str | None:
    if not style or not style.startswith("Heading"):
        return None
    level_text = style.removeprefix("Heading")
    if not level_text.isdigit():
        return None
    level = int(level_text)
    return "#" * level if 1 <= level <= 6 else None


def count_nonempty_text_nodes(body: ET.Element) -> int:
    return sum(
        1
        for node in body.iter(W + "t")
        if node.text is not None and node.text != ""
    )


def convert_document_xml(document_xml: bytes, table_format: str) -> tuple[str, dict]:
    try:
        root = ET.fromstring(document_xml)
    except ET.ParseError as exc:
        raise ValueError(f"word/document.xml is not valid XML: {exc}") from exc
    body = root.find(W + "body")
    if body is None:
        raise ValueError("word/document.xml does not contain w:body")

    blocks: list[str] = []
    paragraph_count = 0
    table_count = 0
    for child in list(body):
        name = local_name(child)
        if name == "p":
            paragraph_count += 1
            style = paragraph_style(child)
            text, has_page_break = paragraph_text(child)
            if has_page_break:
                blocks.append("---")
                text = text.lstrip("\n")
            if not text:
                continue
            prefix = heading_prefix(style)
            blocks.append(f"{prefix} {text.strip()}" if prefix else text)
        elif name == "tbl":
            table_count += 1
            blocks.append(
                table_to_html(child) if table_format == "html" else table_to_tsv(child)
            )

    markdown = "\n\n".join(blocks).rstrip() + "\n"
    stats = {
        "paragraphs": paragraph_count,
        "tables": table_count,
        "nonempty_text_nodes": count_nonempty_text_nodes(body),
    }
    return markdown, stats


def convert_docx_bytes(docx_bytes: bytes, table_format: str) -> tuple[bytes, dict]:
    document_xml, document_crc = read_document_xml(docx_bytes)
    markdown, stats = convert_document_xml(document_xml, table_format)
    output = markdown.encode("utf-8")
    return output, {
        **stats,
        "docx_bytes": len(docx_bytes),
        "document_xml_bytes": len(document_xml),
        "document_xml_crc32": f"0x{document_crc:08x}",
        "source_git_blob_sha": git_blob_sha(docx_bytes),
        "output_sha256": sha256_hex(output),
        "output_bytes": len(output),
        "table_format": table_format,
    }


def default_output_path(input_path: Path) -> Path:
    return input_path.with_suffix(".md")


def verify_expected(label: str, actual: str, expected: str | None) -> None:
    if expected and actual.lower() != expected.lower():
        raise ValueError(f"{label} mismatch: {actual} != {expected}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Input DOCX path")
    parser.add_argument("-o", "--output", type=Path, help="Output Markdown path")
    parser.add_argument(
        "--table-format",
        choices=("html", "tsv"),
        default="html",
        help="Table rendering: faithful HTML tables or compact TSV rows",
    )
    parser.add_argument("--expected-git-blob-sha", help="Expected source Git blob SHA-1")
    parser.add_argument("--expected-output-sha256", help="Expected Markdown SHA-256")
    parser.add_argument(
        "--stats-json",
        action="store_true",
        help="Print deterministic conversion statistics as JSON",
    )
    return parser


def run_cli(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.input.is_file():
        raise ValueError(f"Input file does not exist: {args.input}")

    source = args.input.read_bytes()
    output, stats = convert_docx_bytes(source, args.table_format)
    verify_expected(
        "source Git blob SHA",
        stats["source_git_blob_sha"],
        args.expected_git_blob_sha,
    )
    verify_expected(
        "output SHA-256",
        stats["output_sha256"],
        args.expected_output_sha256,
    )

    output_path = args.output or default_output_path(args.input)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(output)
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
