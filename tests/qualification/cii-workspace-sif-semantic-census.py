#!/usr/bin/env python3
"""Qualification-only, edition-aware census/oracle for CII SIF&TEES.

The oracle intentionally distinguishes:
- official Version-12 neutral item-position authority; and
- the canonical repository target whose VERSION header advertises 11.0000.

It must never promote Version-12 item positions to Version-11 Writer authority
without an explicit authoritative edition bridge.
"""
from __future__ import annotations

from pathlib import Path
import argparse
import json
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

V12_ITEMS = {
    1: "Node", 2: "Type", 3: "In-Plane SIF (ii)", 4: "Out-Plane SIF (io)",
    5: "Weld d", 6: "Fillet", 7: "Pad Thk", 8: "Ftg Ro", 9: "Crotch R",
    10: "Weld ID", 11: "B1", 12: "B2", 13: "In-Plane Index (Ii)",
    14: "Out-Plane Index (Io)", 15: "Torsion SIF (it)", 16: "Axial SIF (ia)",
    17: "Pressure SIF (ip)", 18: "Pressure Index (Ip)",
    19: "Code-specific item 19", 20: "Code-specific item 20",
    21: "Code-specific item 21", 22: "Code-specific item 22",
    23: "Code-related Note option 23", 24: "Code-related Note option 24",
    25: "Axial Index (Ia)", 26: "Torsion Index (It)",
}
V12_REFERENCE_ITEMS = frozenset({3, 4})
CANONICAL_V11_WRITER_ITEMS = frozenset()  # fail closed until authority bridge exists


def neutral_position(row_index: int, field_index: int) -> tuple[int, int]:
    if not (0 <= row_index < SIF_BLOCK_ROWS and 0 <= field_index < 6):
        raise AssertionError(f"SIF_POSITION_OUT_OF_RANGE:r{row_index}f{field_index}")
    tee_slot = 1 if row_index < TEE_SLOT_ROWS else 2
    item = (row_index % TEE_SLOT_ROWS) * 6 + field_index + 1
    return tee_slot, item


def authority_self_test() -> dict[str, object]:
    positions = [
        (*neutral_position(row, field), row, field)
        for row in range(SIF_BLOCK_ROWS)
        for field in range(6)
    ]
    assert len(positions) == 60 and len(set(positions)) == 60
    assert neutral_position(0, 2) == (1, 3)
    assert neutral_position(0, 3) == (1, 4)
    assert neutral_position(5, 2) == (2, 3)
    assert neutral_position(5, 3) == (2, 4)
    assert V12_ITEMS[15] == "Torsion SIF (it)"
    assert V12_ITEMS[16] == "Axial SIF (ia)"
    assert len(V12_ITEMS) * 2 == 52
    assert len(CANONICAL_V11_WRITER_ITEMS) == 0
    return {
        "status": "PASS_VERSION12_REFERENCE_ONLY",
        "v12_fixed_positions": 60,
        "v12_direct_positions": 52,
        "v12_unresolved_positions": 8,
        "v12_ii_io_reference_positions": ["r0f2", "r0f3", "r5f2", "r5f3"],
        "canonical_v11_writer_eligible_positions": 0,
        "canonical_v11_gate": "V11_NEUTRAL_POSITION_AUTHORITY_UNRESOLVED",
    }


def parse_sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in text.splitlines():
        match = SECTION_RX.match(line)
        if match:
            current = match.group(1).upper()
            sections.setdefault(current, [])
        elif current is not None:
            sections[current].append(line)
    return sections


def fixed_fields(line: str) -> list[str]:
    out: list[str] = []
    offset = 0
    for width in WIDTHS:
        out.append(line[offset:offset + width])
        offset += width
    return out


def version_header(text: str) -> float | None:
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if line.strip().upper() == "#$ VERSION":
            for candidate in lines[index + 1:]:
                if not candidate.strip():
                    continue
                values = candidate.split()
                if len(values) < 2:
                    return None
                try:
                    return float(values[1])
                except ValueError:
                    return None
    return None


def control_sif_count(sections: dict[str, list[str]]) -> int:
    rows = [row for row in sections.get("CONTROL", []) if row.strip()]
    if len(rows) < 3:
        raise AssertionError("CONTROL_REQUIRES_THREE_ROWS")
    fields = fixed_fields(rows[2])
    value = float(fields[4].strip())
    if value < 0 or int(value) != value:
        raise AssertionError(f"CONTROL_SIF_COUNT_INVALID:{value}")
    return int(value)


def census_file(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8", errors="strict")
    sections = parse_sections(text)
    sif_rows = [row for row in sections.get("SIF&TEES", []) if row.strip()]
    count = control_sif_count(sections)
    expected = count * SIF_BLOCK_ROWS
    if len(sif_rows) != expected:
        raise AssertionError(
            f"SIF_ROW_COUNT_MISMATCH:{path.name}:control={count}:rows={len(sif_rows)}:expected={expected}"
        )
    return {
        "file": path.as_posix(),
        "version_header_second_field": version_header(text),
        "control_sif_blocks": count,
        "sif_rows": len(sif_rows),
        "observational_only": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="*", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--authority-self-test", action="store_true")
    args = parser.parse_args()

    authority = authority_self_test()
    files = args.files or list(DEFAULT_FILES)
    if args.authority_self_test and not args.files:
        print(json.dumps({"schema": "CIIWriter1CSifEditionAuthority.v3", **authority}, indent=2, sort_keys=True))
        return 0

    missing = [path.as_posix() for path in files if not path.is_file()]
    if missing:
        print(json.dumps({
            "status": "NOT_RUN",
            "qualification_verdict": "BLOCKED_V11_POSITION_AUTHORITY_UNRESOLVED",
            "authority_self_test": authority,
            "missing_files": missing,
        }, indent=2, sort_keys=True))
        return 2

    results = [census_file(path) for path in files]
    target1 = next((item for item in results if item["file"].endswith("BM_CII_TARGET1.CII")), None)
    if target1 is not None:
        assert target1["version_header_second_field"] == 11.0, target1

    report = {
        "schema": "CIIWriter1CSifEditionAuthority.v3",
        "status": "PASS_CENSUS_WITH_WRITER_BLOCKER",
        "qualification_verdict": "BLOCKED_V11_POSITION_AUTHORITY_UNRESOLVED",
        "authority_self_test": authority,
        "results": results,
        "warning": "Version12 neutral positions are reference evidence only; canonical V11 Writer authority remains zero until an authoritative edition bridge is supplied.",
    }
    print(json.dumps(report, indent=2, sort_keys=True) if args.json else report["warning"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
