#!/usr/bin/env python3
"""Convert a DOCX package to deterministic Markdown through a semantic model."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

from document_model import (
    CANONICALIZATION_VERSION,
    SEMANTIC_SCHEMA_VERSION,
    DocumentModel,
    InlineBreak,
    InlineHyperlink,
    InlineSymbol,
    InlineTab,
    InlineText,
    InlineUnsupported,
    PageBreakBlock,
    ParagraphBlock,
    TableBlock,
    TableCell,
    UnsupportedBlock,
    build_evidence,
    canonical_json_bytes,
    options_hash,
)
from docx_ooxml_parser import (
    DOC_PART,
    cell_colspan,
    count_nonempty_text_nodes,
    heading_level,
    local_name,
    paragraph_style,
    paragraph_text,
    parse_cell_blocks,
    parse_document_xml,
    parse_docx_package,
    parse_table,
    read_document_xml,
    table_colspan,
)
from ooxml_package import OoxmlPackage


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def render_paragraph(block: ParagraphBlock) -> str:
    content = _render_inlines(block.inlines) if _needs_inline_rendering(block.inlines) else block.text
    if block.heading_level is not None:
        return f"{'#' * block.heading_level} {content.strip()}"
    if block.list_info is not None:
        marker = "-" if block.list_info.number_format == "bullet" else "1."
        return f"{'  ' * block.list_info.level}{marker} {content}"
    return content


def _needs_inline_rendering(inlines) -> bool:
    return any(
        isinstance(value, (InlineHyperlink, InlineSymbol, InlineUnsupported))
        for value in inlines
    )


def _render_inlines(inlines) -> str:
    parts = []
    for inline in inlines:
        if isinstance(inline, InlineText):
            parts.append(inline.text)
        elif isinstance(inline, InlineTab):
            parts.append("\t")
        elif isinstance(inline, InlineBreak):
            parts.append("\n")
        elif isinstance(inline, InlineHyperlink):
            parts.append(_render_hyperlink(inline))
        elif isinstance(inline, InlineSymbol):
            parts.append(inline.text)
        elif isinstance(inline, InlineUnsupported):
            parts.append(inline.marker)
    return "".join(parts)


def _render_hyperlink(inline: InlineHyperlink) -> str:
    if not inline.target:
        return inline.text
    label = inline.text.replace("[", "\\[").replace("]", "\\]")
    target = inline.target.replace(" ", "%20").replace(")", "%29")
    return f"[{label}]({target})"


def render_cell_html(cell: TableCell) -> str:
    pieces = []
    for block in cell.blocks:
        if isinstance(block, ParagraphBlock):
            rendered = html.escape(render_paragraph(block), quote=False)
            pieces.append(rendered.replace("\t", "&#9;").replace("\n", "<br>"))
        elif isinstance(block, TableBlock):
            pieces.append(render_table_html(block))
        elif isinstance(block, UnsupportedBlock):
            pieces.append(html.escape(f"⟦{block.code}⟧", quote=False))
    return "<br>".join(pieces)


def render_table_html(table: TableBlock, indent: int = 0) -> str:
    prefix = " " * indent
    lines = [prefix + "<table>"]
    for row in table.rows:
        lines.append(prefix + "  <tr>")
        for cell in row.cells:
            attributes = []
            if cell.column_span != 1:
                attributes.append(f'colspan="{cell.column_span}"')
            if cell.row_span != 1:
                attributes.append(f'rowspan="{cell.row_span}"')
            attr = f" {' '.join(attributes)}" if attributes else ""
            lines.append(prefix + f"    <td{attr}>{render_cell_html(cell)}</td>")
        lines.append(prefix + "  </tr>")
    lines.append(prefix + "</table>")
    return "\n".join(lines)


def flatten_block_text(block) -> str:
    if isinstance(block, ParagraphBlock):
        return block.text.replace("\t", " ").replace("\n", " ")
    if isinstance(block, TableBlock):
        rows = block.position_rows or block.source_rows or block.rows
        return " / ".join(
            " | ".join(flatten_cell_text(cell) for cell in row.cells)
            for row in rows
        )
    if isinstance(block, UnsupportedBlock):
        return f"⟦{block.code}⟧"
    return ""


def flatten_cell_text(cell: TableCell) -> str:
    return " ".join(
        text for text in (flatten_block_text(block) for block in cell.blocks) if text
    )


def render_table_tsv(table: TableBlock) -> str:
    rows = table.position_rows or table.source_rows or table.rows
    return "\n".join(
        "\t".join(flatten_cell_text(cell) for cell in row.cells)
        for row in rows
    )


def html_paragraph_text(paragraph: ET.Element) -> str:
    text, _ = paragraph_text(paragraph)
    return html.escape(text, quote=False).replace("\t", "&#9;").replace("\n", "<br>")


def heading_prefix(style: str | None) -> str | None:
    level = heading_level(style)
    return None if level is None else "#" * level


def table_to_html(table: ET.Element, indent: int = 0) -> str:
    return render_table_html(parse_table(table, 0, "compat-table"), indent)


def flatten_table_text(table: ET.Element) -> str:
    semantic = parse_table(table, 0, "compat-table")
    return " / ".join(
        " | ".join(flatten_cell_text(cell) for cell in row.cells)
        for row in semantic.rows
    )


def table_to_tsv(table: ET.Element) -> str:
    return render_table_tsv(parse_table(table, 0, "compat-table"))


def render_document(document: DocumentModel, table_format: str) -> str:
    rendered: list[tuple[str, bool]] = []
    for block in document.blocks:
        item = _render_block(block, table_format)
        if item is not None:
            rendered.append(item)
    return _join_rendered_blocks(rendered)


def _render_block(block, table_format: str) -> tuple[str, bool] | None:
    if isinstance(block, PageBreakBlock):
        return "---", False
    if isinstance(block, ParagraphBlock):
        return render_paragraph(block), block.list_info is not None and block.heading_level is None
    if isinstance(block, TableBlock):
        text = render_table_html(block) if table_format == "html" else render_table_tsv(block)
        return text, False
    if isinstance(block, UnsupportedBlock):
        return f"<!-- {block.code}: {block.description} -->", False
    return None


def _join_rendered_blocks(rendered: list[tuple[str, bool]]) -> str:
    if not rendered:
        return "\n"
    output = rendered[0][0]
    for index in range(1, len(rendered)):
        text, is_list = rendered[index]
        previous_list = rendered[index - 1][1]
        output += ("\n" if is_list and previous_list else "\n\n") + text
    return output.rstrip() + "\n"


def convert_document_xml(document_xml: bytes, table_format: str) -> tuple[str, dict]:
    document, stats = parse_document_xml(document_xml)
    return render_document(document, table_format), stats


def convert_docx_bytes(docx_bytes: bytes, table_format: str) -> tuple[bytes, dict]:
    package = OoxmlPackage.from_bytes(docx_bytes)
    document, stats = parse_docx_package(package)
    output = render_document(document, table_format).encode("utf-8")
    option_values = _canonical_options(table_format)
    document_xml = package.require_part(DOC_PART)
    return output, _conversion_stats(
        docx_bytes, document_xml, package, document, stats, output, option_values,
        table_format,
    )


def _conversion_stats(
    docx_bytes: bytes,
    document_xml: bytes,
    package: OoxmlPackage,
    document: DocumentModel,
    stats: dict,
    output: bytes,
    option_values: dict,
    table_format: str,
) -> dict:
    return {
        **stats,
        "docx_bytes": len(docx_bytes),
        "document_xml_bytes": len(document_xml),
        "document_xml_crc32": f"0x{package.crc32[DOC_PART]:08x}",
        "source_git_blob_sha": git_blob_sha(docx_bytes),
        "source_sha256": sha256_hex(docx_bytes),
        "output_sha256": sha256_hex(output),
        "output_bytes": len(output),
        "table_format": table_format,
        "semantic_schema_version": SEMANTIC_SCHEMA_VERSION,
        "canonicalization_version": CANONICALIZATION_VERSION,
        "options_hash": options_hash(option_values),
        "package_parts": len(package.parts),
        "relationships": document.metadata.get("relationshipCount", 0),
        "styles": document.metadata.get("styleCount", 0),
        "numbering_instances": document.metadata.get("numberingInstanceCount", 0),
        "content_types": document.metadata.get("contentTypeCount", 0),
    }


def conversion_evidence(docx_bytes: bytes, table_format: str) -> dict:
    package = OoxmlPackage.from_bytes(docx_bytes)
    document, _ = parse_docx_package(package)
    options = _canonical_options(table_format)
    return build_evidence(
        document,
        source_sha256=sha256_hex(docx_bytes),
        source_git_blob_sha=git_blob_sha(docx_bytes),
        profile="readable",
        options=options,
    )


def _canonical_options(table_format: str) -> dict:
    return {"profile": "readable", "tableFormat": table_format, "revisions": "accepted"}


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
        "--table-format", choices=("html", "tsv"), default="html",
        help="Table rendering: faithful HTML tables or compact TSV rows",
    )
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
