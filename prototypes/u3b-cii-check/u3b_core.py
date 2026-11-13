"""U3b: convert the base and the revised PSI116 to CII 2019 with the 3D_Converters app
converter, then report, for every change in the U2b receipt, whether its value reaches
the CII, and prove that no other CII value changed.

Python 3.10+, stdlib only. Inputs are read-only; writes only the report (and the CII
files and element lists when --cii-dir is given). See README.md.
"""
from __future__ import annotations

import hashlib
import json
import math
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

FORMAT = "u3b.cii-carry-report"
ENTRY = "xml_to_cii2019_runtime_custody.py"
ELEMENT_LINES = 15
NAME_LIMIT = 25
SENTINEL = -100000.0
DENSITY_FACTOR = 1e-6  # app converter: kg/m3 -> kg/cm3 (convertDensityKgM3ToKgCm3 default)
# Other sections and the transferred fields that legitimately change them
# (bend radius default and SIF use OD; REDUCERS rows carry OD and the second wall).
SECTION_FIELDS = {"BEND": {"Node/OutsideDiameter"}, "SIF&TEES": {"Node/OutsideDiameter"},
                  "REDUCERS": {"Node/OutsideDiameter", "Node/WallThickness"}}

# Element-block cell (line, column) per field, as written by the app converter
# (xml_to_cii2019_patched._patched_elements_payload_factory). "end" = which element end
# supplies the value: from / to / any.
NODE_CELLS = {
    "Node/OutsideDiameter": (0, 5, "any"),
    "Node/WallThickness": (1, 0, "from"),
    "Node/InsulationThickness": (1, 1, "to"),
    "Node/CorrosionAllowance": (1, 2, "to"),
}


def case_cell(kind: str, n: int) -> tuple[int, int]:
    if kind == "Temperature":
        return (1, 2 + n) if n <= 3 else (2, n - 4)
    return (3, n - 1) if n <= 6 else (4, n - 7)


BRANCH_CELLS = {f"Branch/{k}/{k}{n}": case_cell(k, n) for k in ("Temperature", "Pressure") for n in range(1, 10)}
BRANCH_CELLS["Branch/FluidDensity"] = (5, 1)
NOT_READ = {
    "Branch/Temperature": "the converter reads only nested Temperature1..9, not a single Temperature value",
    "Branch/Pressure": "the converter reads only nested Pressure1..9, not a single Pressure value",
    "Branch/InsulationDensity": "the converter always resets insulation density (its default when insulation is 50 mm or more, else 0)",
}


class Refusal(Exception):
    def __init__(self, code: str, detail: str):
        super().__init__(f"{code}: {detail}")
        self.code, self.detail = code, detail


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def num(text) -> float | None:
    try:
        v = float(text)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def same(a: float | None, b: float | None) -> bool:
    return a is not None and b is not None and abs(a - b) <= 1e-5 * max(1.0, abs(a), abs(b))


def expected_cii(field: str, after: str) -> float | None:
    """The CII number the converter should write for a transferred PSI116 value."""
    v = num(after)
    if v is None:
        return None
    if field.startswith("Branch/Temperature/") and abs(v - SENTINEL) < 1e-9:
        return 0.0
    if field in ("Branch/FluidDensity", "Branch/InsulationDensity"):
        return v * DENSITY_FACTOR
    return v


# ---------------------------------------------------------------- CII reading
def cells(line: str) -> list[str]:
    if not line.strip():
        return []
    out, rest = [line[:15].strip()], line[15:]
    while rest:
        out.append(rest[:13].strip())
        rest = rest[13:]
    return out


def sections_of(text: str) -> dict[str, list[str]]:
    sections, current = {}, None
    for line in text.splitlines():
        if line.startswith("#$ "):
            current = line[3:].strip()
            sections[current] = []
        elif current is not None:
            sections[current].append(line)
    for need in ("CONTROL", "ELEMENTS", "NODENAME", "RIGID", "MISCEL_1"):
        if need not in sections:
            raise Refusal("U3B_CII_UNREADABLE", f"section {need} missing")
    return sections


def parse_cii(text: str) -> dict:
    s = sections_of(text)
    control = [cells(l) for l in s["CONTROL"]]
    n_el, n_names, n_rigid = int(control[0][0]), int(control[0][3]), int(control[1][1])
    el, names, rigid = s["ELEMENTS"], s["NODENAME"], s["RIGID"]
    if len(el) != n_el * ELEMENT_LINES:
        raise Refusal("U3B_CII_UNREADABLE", f"ELEMENTS has {len(el)} lines, expected {n_el}x{ELEMENT_LINES}")
    if (n_names and len(names) % n_names) or (n_rigid and len(rigid) % n_rigid):
        raise Refusal("U3B_CII_UNREADABLE", "NODENAME/RIGID line count does not match CONTROL")
    per_name, per_rigid = (len(names) // n_names if n_names else 1), (len(rigid) // n_rigid if n_rigid else 1)
    mat_rows = math.ceil(n_el / 6)
    materials = [c for l in s["MISCEL_1"][:mat_rows] for c in cells(l)]
    if len(materials) != n_el:
        raise Refusal("U3B_CII_UNREADABLE", f"MISCEL_1 has {len(materials)} materials for {n_el} elements")
    elements = []
    for i in range(n_el):
        block = el[i * ELEMENT_LINES:(i + 1) * ELEMENT_LINES]
        rigid_ptr, name_ptr = int(cells(block[12])[1]), int(cells(block[13])[5])
        name = names[(name_ptr - 1) * per_name] if name_ptr else ""
        rows = rigid[(rigid_ptr - 1) * per_rigid:rigid_ptr * per_rigid] if rigid_ptr else []
        elements.append({
            "E": [cells(l) for l in block[:10]] + [block[10], block[11]],
            "name": (name[2:28].rstrip(), name[28:].rstrip()) if name_ptr else ("", ""),
            "rigid": num(cells(rows[0])[0]) if rows else None,
            "material": num(materials[i]),
        })
    other = {k: v for k, v in s.items() if k not in ("CONTROL", "ELEMENTS", "NODENAME", "RIGID", "MISCEL_1")}
    other["MISCEL_1(tail)"] = s["MISCEL_1"][mat_rows:]
    return {"control": control, "elements": elements, "other": other}


# ---------------------------------------------------------------- XML identity
def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def kids(el, name: str) -> list:
    return [c for c in el if local(c.tag) == name]


def xml_nodes(xml_bytes: bytes) -> dict[tuple[int, int], dict]:
    """(branchOrdinal, nodeOrdinal) -> branch name, ComponentRefNo and Position, walking
    Pipe/Branch/Node in document order as the U1/U2 PSI116 index does."""
    root = ET.fromstring(xml_bytes)
    branches = [b for p in kids(root, "Pipe") for b in kids(p, "Branch")] or kids(root, "Branch")
    out = {}
    for bi, b in enumerate(branches):
        bname = "".join((kids(b, "Branchname") or [ET.Element("x")])[0].itertext()).strip()
        for ni, n in enumerate(kids(b, "Node")):
            text = lambda t: "".join((kids(n, t) or [ET.Element("x")])[0].itertext()).strip()  # noqa: E731
            pos = [num(v) for v in text("Position").split()]
            out[(bi, ni)] = {"branch": bname, "ref": text("ComponentRefNo"), "pos": pos,
                             "number": num(text("NodeNumber")), "numberText": text("NodeNumber")}
    return out


def ends_at(edges: list[dict], node: dict, xml: dict) -> list[tuple[int, str]]:
    """Element ends (index, 'from'|'to') that the converter built from this XML node.

    Identity = ComponentRefNo + Position, plus the node number: a positive XML number must
    be kept by the converter; a node numbered 0 or below can only be a converter-renumbered
    end that no positive XML node at the same ref and position already claims."""
    def at(n, x):
        return n["ref"] == x["ref"] and len(n["pos"]) == len(x["pos"]) and all(
            same(a, b) for a, b in zip(n["pos"], x["pos"]))
    positive = node["number"] is not None and node["number"] > 0
    taken = {x["number"] for x in xml.values() if x["number"] and x["number"] > 0 and at(x, node)}
    hits = []
    for i, e in enumerate(edges):
        for end in ("from", "to"):
            n = e[end]
            if at(n, node) and (n["number"] == node["number"] if positive else n["number"] not in taken):
                hits.append((i, end))
    return hits


# ---------------------------------------------------------------- conversion
def convert(converter_dir: Path, xml_path: Path, out_cii: Path, out_edges: Path) -> list[dict]:
    dump = Path(__file__).with_name("u3b_dump.py")
    cmd = [sys.executable, "-E", "-s", str(dump), str(converter_dir), str(out_edges), "--",
           "--input", str(xml_path), "--output", str(out_cii)]
    r = subprocess.run(cmd, cwd=converter_dir, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0 or not out_cii.exists() or not out_edges.exists():
        tail = (r.stderr or r.stdout).strip().splitlines()[-1:] or ["no output"]
        raise Refusal("U3B_CONVERT_FAILED", f"{xml_path.name}: {tail[0]}")
    return json.loads(out_edges.read_text(encoding="utf-8"))["edges"]


def git_head(path: Path) -> str | None:
    r = subprocess.run(["git", "-c", "core.protectNTFS=false", "rev-parse", "HEAD"], cwd=path, capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None
