#!/usr/bin/env python3
"""Qualification-only census and authority oracle for CII SIF&TEES.

This script does not grant Writer authority from benchmark values. Neutral item
semantics come from the source ledger; the census only checks physical shape and
observations. `--authority-self-test` is checkout-independent and validates the
2-tee x 30-item x 6-field mapping used by Phase 2A.
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
TEE_SLOT_ROWS = 5
ITEMS_PER_TEE = 30
SECTION_RX = re.compile(r"^\s*#\$\s+([A-Z0-9_&]+)\s*$", re.I)
DEFAULT_FILES = (
    Path("Benchmark/CIICompare/BM_CII_SOURCE.CII"),
    Path("Benchmark/CIICompare/BM_CII_TARGET1.CII"),
    Path("Benchmark/CIICompare/BM_CII_TARGET2.CII"),
)

# Version-12 neutral-file item names directly exposed by the qualified source.
V12_ITEMS = {
    1: "Node",
    2: "Type",
    3: "In-Plane SIF (ii)",
    4: "Out-Plane SIF (io)",
    5: "Weld d",
    6: "Fillet",
    7: "Pad Thk",
    8: "Ftg Ro",
    9: "Crotch R",
    10: "Weld ID",
    11: "B1",
    12: "B2",
    13: "In-Plane Index (Ii)",
    14: "Out-Plane Index (Io)",
    15: "Torsion SIF (it)",
    16: "Axial SIF (ia)",
    17: "Pressure SIF (ip)",
    18: "Pressure Index (Ip)",
    19: "Code-specific item 19",
    20: "Code-specific item 20",
    21: "Code-specific item 21",
    22: "Code-specific item 22",
    23: "Code-related Note option 23",
    24: "Code-related Note option 24",
    25: "Axial Index (Ia)",
    26: "Torsion Index (It)",
}
SELECTED_PHASE2B_ITEMS = frozenset({3, 4})

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


def neutral_position(row_index: int, field_index: int) -> tuple[int, int]:
    if not (0 <= row_index < SIF_BLOCK_ROWS and 0 <= field_index < 6):
        raise AssertionError(f"SIF_POSITION_OUT_OF_RANGE:r{row_index}f{field_index}")
    tee_slot = 1 if row_index < TEE_SLOT_ROWS else 2
    item = (row_index % TEE_SLOT_ROWS) * 6 + field_index + 1
    return tee_slot, item


def authority_self_test() -> dict[str, object]:
    positions = []
    selected = []
    direct = 0
    unresolved = 0
    for row in range(SIF_BLOCK_ROWS):
        for field in range(6):
            slot, item = neutral_position(row, field)
            positions.append((slot, item, row, field))
            if item in V12_ITEMS:
                direct += 1
            else:
                unresolved += 1
            if item in SELECTED_PHASE2B_ITEMS:
                selected.append((row, field, slot, item))

    assert len(positions) == 60
    assert len(set(positions)) == 60
    assert neutral_position(0, 0) == (1, 1)
    assert neutral_position(0, 1) == (1, 2)
    assert neutral_position(0, 2) == (1, 3)
    assert neutral_position(0, 3) == (1, 4)
    assert neutral_position(5, 0) == (2, 1)
    assert neutral_position(5, 1) == (2, 2)
    assert neutral_position(5, 2) == (2, 3)
    assert neutral_position(5, 3) == (2, 4)
    assert V12_ITEMS[15] == "Torsion SIF (it)"
    assert V12_ITEMS[16] == "Axial SIF (ia)"
    assert direct == 52
    assert unresolved == 8
    assert selected == [
        (0, 2, 1, 3), (0, 3, 1, 4),
        (5, 2, 2, 3), (5, 3, 2, 4),
    ]

    # Positive-value qualification fixture. This is not a production Writer
    # test; it proves the selected neutral positions and initial >=1.0 domain.
    synthetic = [[0.0] * 6 for _ in range(SIF_BLOCK_ROWS)]
    synthetic[0][0:4] = [100.0, 0.0, 1.25, 1.50]
    synthetic[5][0:4] = [200.0, 0.0, 2.00, 2.50]
    assert synthetic[0][2] >= 1.0 and neutral_position(0, 2) == (1, 3)
    assert synthetic[0][3] >= 1.0 and neutral_position(0, 3) == (1, 4)
    assert synthetic[5][2] >= 1.0 and neutral_position(5, 2) == (2, 3)
    assert synthetic[5][3] >= 1.0 and neutral_position(5, 3) == (2, 4)

    return {
        "status": "PASS",
        "tee_slots": 2,
        "rows_per_tee": 5,
        "items_per_tee": 30,
        "fixed_positions": 60,
        "direct_positions": direct,
        "unresolved_positions": unresolved,
        "selected_phase2b_positions": ["r0f2", "r0f3", "r5f2", "r5f3"],
        "positive_fixture": "PASS",
    }


def fixed_fields(line: str) -> list[str]:
    out: list[str] = []
    offset = 0
    for width in WIDTHS:
        out.append(line[offset:offset + width])
        offset += width
    return out


def numeric_fields(line: str) -> list[float | None]:
    out: list[float | None] = []
    for raw in fixed_fields(line):
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
            f"SIF_ROW_COUNT_MISMATCH:{path.name}:control={control_count}:"
            f"rows={len(sif_rows)}:expected={expected_rows}"
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
    sentinel_9999_positions: Counter[str] = Counter()
    signatures = Counter()

    for block_index, block in enumerate(blocks, start=1):
        value = block[0][1]
        if value is None:
            raise AssertionError(f"ROW0_FIELD1_BLANK:{path.name}:block={block_index}")
        row0_field1.append(int(value) if int(value) == value else value)

        row5 = block[5][1]
        if row5 not in (None, 0):
            row5_nonzero_field1.append((block_index, int(row5) if int(row5) == row5 else row5))

        for row_index, row in enumerate(block):
            for field_index, field_value in enumerate(row):
                if field_value in (None, 0):
                    continue
                slot, item = neutral_position(row_index, field_index)
                key = f"r{row_index}f{field_index}"
                nonzero_positions[key].append({
                    "block": block_index,
                    "tee_slot": slot,
                    "neutral_item": item,
                    "value": field_value,
                })
                if abs(field_value - 9999.99) < 1e-9:
                    sentinel_9999_positions[key] += 1
        signatures[signature(block)] += 1

    if path.name in EXPECTED_ROW0_FIELD1 and row0_field1 != EXPECTED_ROW0_FIELD1[path.name]:
        raise AssertionError(f"CANONICAL_ROW0_FIELD1_DRIFT:{path.name}:{row0_field1}")
    if path.name in EXPECTED_ROW5_NONZERO_FIELD1 and row5_nonzero_field1 != EXPECTED_ROW5_NONZERO_FIELD1[path.name]:
        raise AssertionError(f"CANONICAL_ROW5_FIELD1_DRIFT:{path.name}:{row5_nonzero_field1}")

    return {
        "file": path.as_posix(),
        "control_sif_tee_blocks": control_count,
        "actual_sif_tee_blocks": len(blocks),
        "actual_sif_tee_rows": len(sif_rows),
        "row0_field1_values": row0_field1,
        "row0_field1_frequency": dict(sorted(Counter(row0_field1).items())),
        "row5_nonzero_field1": [{"block": block, "value": value} for block, value in row5_nonzero_field1],
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
        "semantic_authority": "SOURCE_LEDGER_NOT_CENSUS",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="*", type=Path, default=list(DEFAULT_FILES))
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--authority-self-test", action="store_true")
    args = parser.parse_args()

    authority = authority_self_test()
    if args.authority_self_test and not args.files:
        print(json.dumps({"schema": "CIIWriter1CSifAuthoritySelfTest.v2", **authority}, indent=2, sort_keys=True))
        return 0

    files = args.files or list(DEFAULT_FILES)
    missing = [path.as_posix() for path in files if not path.is_file()]
    if missing:
        print(json.dumps({"status": "NOT_RUN", "authority_self_test": authority, "missing_files": missing}, indent=2))
        return 2

    results = [census_file(path) for path in files]
    report = {
        "schema": "CIIWriter1CSifSemanticCensus.v2",
        "status": "PASS",
        "qualification_scope": "PHYSICAL_OBSERVATION_WITH_SOURCE_QUALIFIED_POSITION_MAP",
        "authority_self_test": authority,
        "results": results,
        "aggregate": aggregate(results),
        "warning": "Benchmark values do not assign semantics; semantics come from the source ledger.",
    }

    if len(results) == 3 and {path.name for path in files} == set(EXPECTED_ROW0_FIELD1):
        actual = Counter()
        for result in results:
            actual.update(result["row0_field1_values"])
        assert dict(sorted(actual.items())) == {3: 7, 5: 8, 11: 12}

    print(json.dumps(report, indent=2, sort_keys=True) if args.json else (
        "SIF semantic census qualification passed\n"
        + json.dumps(report["aggregate"], sort_keys=True)
        + "\n" + report["warning"]
    ))
    return 0


if __name__ == "__main__":
    sys.exit(main())
