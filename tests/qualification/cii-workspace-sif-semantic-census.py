#!/usr/bin/env python3
"""Qualification-only census for CII SIF&TEES physical payloads.

This script deliberately assigns NO engineering meanings to raw SIF values.
It proves only physical/cardinality observations used by Issue #1005.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
import argparse
import json
import math
import re
import sys

WIDTHS = (15, 13, 13, 13, 13, 13)
SIF_BLOCK_ROWS = 10
SECTION_RX = re.compile(r"^\s*#\$\s+([A-Z0-9_&]+)\s*$", re.I)
DEFAULT_FILES = (
    Path("Benchmark/CIICompare/BM_CII_SOURCE.CII"),
    Path("Benchmark/CIICompare/BM_CII_TARGET1.CII"),
    Path("Benchmark/CIICompare/BM_CII_TARGET2.CII"),
)

EXPECTED_ROW0_FIELD1 = {
    "BM_CII_SOURCE.CII": [3, 3, 5, 3, 11, 11, 5, 11, 11],
    "BM_CII_TARGET1.CII": [11, 11, 5, 11, 11, 5, 3, 5, 3],
    "BM_CII_TARGET2.CII": [11, 11, 5, 11, 11, 5, 3, 5, 3],
}
EXPECTED_ROW5_NONZERO_FIELD1 = {
    "BM_CII_SOURCE.CII": [(3, 11), (7, 11)],
    "BM_CII_TARGET1.CII": [(3, 11), (6, 11)],
    "BM_CII_TARGET2.CII": [(3, 11), (6, 11)],
}


def fixed_fields(line: str) -> list[str]:
    out: list[str] = []
    offset = 0
    for width in WIDTHS:
        out.append(line[offset:offset + width])
        offset += width
    return out


def numeric_fields(line: str) -> list[float | None]:
    fields = fixed_fields(line)
    out: list[float | None] = []
    for raw in fields:
        text = raw.strip()
        if not text:
            out.append(None)
            continue
        try:
            value = float(text.replace("D", "E").replace("d", "E"))
        except ValueError as exc:
            raise AssertionError(f"NON_NUMERIC_FIXED_FIELD:{raw!r}") from exc
        if not math.isfinite(value):
            raise AssertionError(f"NON_FINITE_FIXED_FIELD:{raw!r}")
        out.append(value)
    return out


def parse_sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for raw in text.splitlines():
        line = raw.rstrip("\r\n")
        match = SECTION_RX.match(line)
        if match:
            current = match.group(1).upper()
            sections.setdefault(current, [])
            continue
        if current is not None:
            sections[current].append(line)
    return sections


def nonblank(rows: list[str]) -> list[str]:
    return [row for row in rows if row.strip()]


def control_sif_count(sections: dict[str, list[str]]) -> int:
    rows = nonblank(sections.get("CONTROL", []))
    if len(rows) < 3:
        raise AssertionError("CONTROL_REQUIRES_THREE_ROWS")
    values = numeric_fields(rows[2])
    raw = values[4]
    if raw is None or int(raw) != raw or raw < 0:
        raise AssertionError(f"CONTROL_SIF_COUNT_INVALID:{raw}")
    return int(raw)


def signature(block: list[list[float | None]]) -> str:
    parts: list[str] = []
    for row_index, row in enumerate(block):
        occupied = [
            f"{field_index}={value:g}"
            for field_index, value in enumerate(row)
            if value is not None and value != 0
        ]
        if occupied:
            parts.append(f"r{row_index}[" + ",".join(occupied) + "]")
    return ";".join(parts) or "ALL_ZERO"


def census_file(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8", errors="strict")
    sections = parse_sections(text)
    sif_rows = nonblank(sections.get("SIF&TEES", []))
    control_count = control_sif_count(sections)

    expected_rows = control_count * SIF_BLOCK_ROWS
    if len(sif_rows) != expected_rows:
        raise AssertionError(
            f"SIF_ROW_COUNT_MISMATCH:{path.name}:"
            f"control={control_count}:rows={len(sif_rows)}:expected={expected_rows}"
        )

    blocks: list[list[list[float | None]]] = []
    for offset in range(0, len(sif_rows), SIF_BLOCK_ROWS):
        block_rows = sif_rows[offset:offset + SIF_BLOCK_ROWS]
        if len(block_rows) != SIF_BLOCK_ROWS:
            raise AssertionError(f"SIF_BLOCK_TRUNCATED:{path.name}:{offset // 10 + 1}")
        blocks.append([numeric_fields(row) for row in block_rows])

    row0_field1 = []
    row5_nonzero_field1: list[tuple[int, int | float]] = []
    nonzero_positions: dict[str, list[dict[str, object]]] = defaultdict(list)
    sentinel_9999_positions: dict[str, int] = Counter()
    signatures = Counter()

    for block_index, block in enumerate(blocks, start=1):
        value = block[0][1]
        if value is None:
            raise AssertionError(f"ROW0_FIELD1_BLANK:{path.name}:block={block_index}")
        if int(value) == value:
            row0_field1.append(int(value))
        else:
            row0_field1.append(value)

        row5 = block[5][1]
        if row5 not in (None, 0):
            row5_nonzero_field1.append(
                (block_index, int(row5) if int(row5) == row5 else row5)
            )

        for row_index, row in enumerate(block):
            for field_index, field_value in enumerate(row):
                if field_value in (None, 0):
                    continue
                key = f"r{row_index}f{field_index}"
                nonzero_positions[key].append({
                    "block": block_index,
                    "value": field_value,
                })
                if abs(field_value - 9999.99) < 1e-9:
                    sentinel_9999_positions[key] += 1
        signatures[signature(block)] += 1

    expected_codes = EXPECTED_ROW0_FIELD1.get(path.name)
    if expected_codes is not None and row0_field1 != expected_codes:
        raise AssertionError(
            f"CANONICAL_ROW0_FIELD1_DRIFT:{path.name}:"
            f"actual={row0_field1}:expected={expected_codes}"
        )

    expected_row5 = EXPECTED_ROW5_NONZERO_FIELD1.get(path.name)
    if expected_row5 is not None and row5_nonzero_field1 != expected_row5:
        raise AssertionError(
            f"CANONICAL_ROW5_FIELD1_DRIFT:{path.name}:"
            f"actual={row5_nonzero_field1}:expected={expected_row5}"
        )

    return {
        "file": path.as_posix(),
        "control_sif_tee_blocks": control_count,
        "actual_sif_tee_blocks": len(blocks),
        "actual_sif_tee_rows": len(sif_rows),
        "row0_field1_values": row0_field1,
        "row0_field1_frequency": dict(sorted(Counter(row0_field1).items())),
        "row5_nonzero_field1": [
            {"block": block, "value": value}
            for block, value in row5_nonzero_field1
        ],
        "nonzero_positions": dict(sorted(nonzero_positions.items())),
        "positions_9999_99": dict(sorted(sentinel_9999_positions.items())),
        "block_signatures": dict(signatures),
    }


def aggregate(results: list[dict[str, object]]) -> dict[str, object]:
    row0 = Counter()
    row5 = Counter()
    positions_9999 = Counter()
    for result in results:
        row0.update(result["row0_field1_values"])
        for item in result["row5_nonzero_field1"]:
            row5[item["value"]] += 1
        positions_9999.update(result["positions_9999_99"])
    return {
        "files": len(results),
        "blocks": sum(int(item["actual_sif_tee_blocks"]) for item in results),
        "rows": sum(int(item["actual_sif_tee_rows"]) for item in results),
        "row0_field1_frequency": dict(sorted(row0.items())),
        "row5_nonzero_field1_frequency": dict(sorted(row5.items())),
        "positions_9999_99": dict(sorted(positions_9999.items())),
        "semantic_authority": "NONE_INFERRED_FROM_CENSUS",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="*", type=Path, default=list(DEFAULT_FILES))
    parser.add_argument("--json", action="store_true", help="Print complete JSON census.")
    args = parser.parse_args()

    files = args.files or list(DEFAULT_FILES)
    missing = [path.as_posix() for path in files if not path.is_file()]
    if missing:
        print(json.dumps({"status": "NOT_RUN", "missing_files": missing}, indent=2))
        return 2

    results = [census_file(path) for path in files]
    report = {
        "schema": "CIIWriter1CSifSemanticCensus.v1",
        "status": "PASS",
        "qualification_scope": "PHYSICAL_OBSERVATION_ONLY",
        "results": results,
        "aggregate": aggregate(results),
        "warning": (
            "Values 3, 5, 11 and 9999.99 are observations only. "
            "This census assigns no engineering semantics and grants no Writer authority."
        ),
    }

    expected_aggregate = {3: 7, 5: 8, 11: 12}
    actual_aggregate = Counter()
    for result in results:
        actual_aggregate.update(result["row0_field1_values"])
    if len(results) == 3 and {path.name for path in files} == set(EXPECTED_ROW0_FIELD1):
        if dict(sorted(actual_aggregate.items())) != expected_aggregate:
            raise AssertionError(
                f"CANONICAL_AGGREGATE_DRIFT:"
                f"actual={dict(sorted(actual_aggregate.items()))}:"
                f"expected={expected_aggregate}"
            )

    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print("SIF semantic census qualification passed")
        print(json.dumps(report["aggregate"], sort_keys=True))
        print(report["warning"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
