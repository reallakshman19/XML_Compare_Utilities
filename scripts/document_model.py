"""Versioned semantic document model and deterministic evidence helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import hashlib
import json
from typing import Any

SEMANTIC_SCHEMA_VERSION = "1"
CANONICALIZATION_VERSION = "1"
CONVERTER_REVISION = "docx-semantic-v1"


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
class ParagraphBlock:
    block_id: str
    text: str
    provenance: SourceRef
    heading_level: int | None = None

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
class TableCell:
    blocks: tuple["Block", ...]
    provenance: SourceRef
    column_span: int = 1
    row_span: int = 1


@dataclass(frozen=True)
class TableRow:
    cells: tuple[TableCell, ...]


@dataclass(frozen=True)
class TableBlock:
    block_id: str
    rows: tuple[TableRow, ...]
    provenance: SourceRef

    @property
    def kind(self) -> str:
        return "table"


Block = ParagraphBlock | PageBreakBlock | TableBlock


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


def block_evidence(block: Block) -> dict[str, Any]:
    evidence: dict[str, Any] = {
        "blockId": block.block_id,
        "kind": block.kind,
        "provenance": block.provenance.to_dict(),
    }
    if isinstance(block, ParagraphBlock) and block.heading_level is not None:
        evidence["headingLevel"] = block.heading_level
    if isinstance(block, TableBlock):
        evidence["rows"] = [
            [
                {
                    "columnSpan": cell.column_span,
                    "rowSpan": cell.row_span,
                    "provenance": cell.provenance.to_dict(),
                }
                for cell in row.cells
            ]
            for row in block.rows
        ]
    return evidence


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
        "blocks": [block_evidence(block) for block in document.blocks],
        "diagnostics": list(document.diagnostics),
    }
