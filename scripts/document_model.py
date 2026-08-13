"""Versioned semantic document model and deterministic evidence helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import hashlib
import json
from typing import Any

SEMANTIC_SCHEMA_VERSION = "3"
CANONICALIZATION_VERSION = "3"
CONVERTER_REVISION = "docx-table-render-policy-v1"


@dataclass(frozen=True)
class SourceRef:
    source_type: str
    part: str | None = None
    paragraph_index: int | None = None
    table_index: int | None = None
    row_index: int | None = None
    cell_index: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {key: value for key, value in asdict(self).items() if value is not None}


@dataclass(frozen=True)
class ListInfo:
    num_id: int
    level: int
    number_format: str
    level_text: str
    start: int


@dataclass(frozen=True)
class InlineText:
    text: str


@dataclass(frozen=True)
class InlineTab:
    pass


@dataclass(frozen=True)
class InlineBreak:
    break_type: str = "line"


@dataclass(frozen=True)
class InlineHyperlink:
    text: str
    target: str | None
    relationship_id: str | None = None
    anchor: str | None = None


@dataclass(frozen=True)
class InlineSymbol:
    text: str
    font: str | None
    char_code: str | None


@dataclass(frozen=True)
class InlineUnsupported:
    marker: str
    code: str


Inline = InlineText | InlineTab | InlineBreak | InlineHyperlink | InlineSymbol | InlineUnsupported


@dataclass(frozen=True)
class ParagraphBlock:
    block_id: str
    text: str
    provenance: SourceRef
    heading_level: int | None = None
    style_id: str | None = None
    style_chain: tuple[str, ...] = ()
    outline_level: int | None = None
    list_info: ListInfo | None = None
    inlines: tuple[Inline, ...] = ()

    @property
    def kind(self) -> str:
        return "heading" if self.heading_level is not None else "paragraph"


@dataclass(frozen=True)
class PageBreakBlock:
    block_id: str
    provenance: SourceRef

    @property
    def kind(self) -> str:
        return "page_break"


@dataclass(frozen=True)
class UnsupportedBlock:
    block_id: str
    provenance: SourceRef
    code: str
    description: str

    @property
    def kind(self) -> str:
        return "unsupported"


@dataclass(frozen=True)
class TableCell:
    blocks: tuple["Block", ...]
    provenance: SourceRef
    column_span: int = 1
    row_span: int = 1
    row_index: int | None = None
    column_index: int | None = None
    is_omitted: bool = False
    v_merge: str | None = None
    source_refs: tuple[SourceRef, ...] = ()


@dataclass(frozen=True)
class TableRow:
    cells: tuple[TableCell, ...]
    grid_before: int = 0
    grid_after: int = 0


@dataclass(frozen=True)
class TableBlock:
    block_id: str
    rows: tuple[TableRow, ...]
    provenance: SourceRef
    source_rows: tuple[TableRow, ...] = ()
    position_rows: tuple[TableRow, ...] = ()
    grid_width: int | None = None

    @property
    def kind(self) -> str:
        return "table"


Block = ParagraphBlock | PageBreakBlock | UnsupportedBlock | TableBlock


@dataclass(frozen=True)
class DocumentModel:
    source_type: str
    blocks: tuple[Block, ...]
    metadata: dict[str, Any] = field(default_factory=dict)
    diagnostics: tuple[dict[str, Any], ...] = ()
    semantic_schema_version: str = SEMANTIC_SCHEMA_VERSION


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def options_hash(options: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_json_bytes(options)).hexdigest()


def inline_evidence(inline: Inline) -> dict[str, Any] | None:
    if isinstance(inline, InlineHyperlink):
        return {
            "kind": "hyperlink",
            "text": inline.text,
            "target": inline.target,
            "relationshipId": inline.relationship_id,
            "anchor": inline.anchor,
        }
    if isinstance(inline, InlineSymbol):
        return {
            "kind": "symbol",
            "text": inline.text,
            "font": inline.font,
            "charCode": inline.char_code,
        }
    if isinstance(inline, InlineUnsupported):
        return {"kind": "unsupported", "code": inline.code, "marker": inline.marker}
    return None


def block_evidence(block: Block) -> dict[str, Any]:
    evidence: dict[str, Any] = {
        "blockId": block.block_id,
        "kind": block.kind,
        "provenance": block.provenance.to_dict(),
    }
    if isinstance(block, ParagraphBlock):
        _add_paragraph_evidence(evidence, block)
    if isinstance(block, TableBlock):
        evidence["rows"] = _table_rows_evidence(block)
        if block.source_rows:
            evidence["sourceRows"] = _table_rows_evidence_rows(block.source_rows)
            evidence["sourceRowGrid"] = [
                {"gridBefore": row.grid_before, "gridAfter": row.grid_after}
                for row in block.source_rows
            ]
        if block.position_rows:
            evidence["positionRows"] = _table_rows_evidence_rows(block.position_rows)
        if block.grid_width is not None:
            evidence["gridWidth"] = block.grid_width
    if isinstance(block, UnsupportedBlock):
        evidence.update({"code": block.code, "description": block.description})
    return evidence


def _add_paragraph_evidence(evidence: dict[str, Any], block: ParagraphBlock) -> None:
    if block.heading_level is not None:
        evidence["headingLevel"] = block.heading_level
    if block.style_id is not None:
        evidence["styleId"] = block.style_id
    if block.style_chain:
        evidence["styleChain"] = list(block.style_chain)
    if block.outline_level is not None:
        evidence["outlineLevel"] = block.outline_level
    if block.list_info is not None:
        evidence["list"] = asdict(block.list_info)
    inline_items = [item for item in (inline_evidence(value) for value in block.inlines) if item]
    if inline_items:
        evidence["inlines"] = inline_items


def _table_rows_evidence(block: TableBlock) -> list[list[dict[str, Any]]]:
    return _table_rows_evidence_rows(block.rows)


def _table_rows_evidence_rows(rows: tuple[TableRow, ...]) -> list[list[dict[str, Any]]]:
    return [
        [_table_cell_evidence(cell) for cell in row.cells]
        for row in rows
    ]


def _table_cell_evidence(cell: TableCell) -> dict[str, Any]:
    value: dict[str, Any] = {
        "columnSpan": cell.column_span,
        "rowSpan": cell.row_span,
        "provenance": cell.provenance.to_dict(),
    }
    if cell.row_index is not None:
        value["row"] = cell.row_index
    if cell.column_index is not None:
        value["column"] = cell.column_index
    if cell.is_omitted:
        value["omitted"] = True
    if cell.v_merge is not None:
        value["vMerge"] = cell.v_merge
    if cell.source_refs:
        value["sourceProvenance"] = [ref.to_dict() for ref in cell.source_refs]
    return value


def build_evidence(
    document: DocumentModel,
    *,
    source_sha256: str,
    source_git_blob_sha: str,
    profile: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    return {
        "sourceSha256": source_sha256,
        "sourceGitBlobSha": source_git_blob_sha,
        "converterRevision": CONVERTER_REVISION,
        "semanticSchemaVersion": document.semantic_schema_version,
        "canonicalizationVersion": CANONICALIZATION_VERSION,
        "profile": profile,
        "optionsHash": options_hash(options),
        "metadata": document.metadata,
        "blocks": [block_evidence(block) for block in document.blocks],
        "diagnostics": list(document.diagnostics),
    }
