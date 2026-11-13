"""U2d: plan PSI116 edits from a CII 2019 (v11) file written by the 3D_Converters XML->CII
converter, using P1.2d node pairs (match-psi116 --frame cii2019). Read-only; returns edits
in the U1 shape {ref, field, before, after}.

Owner D3: transfer Node Name, Weight and the Element block (process + material).
Values are read with the converter's own layout (see ../u3b-cii-check/u3b_core.py).
"""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "u3b-cii-check"))
from u3b_core import SENTINEL, num, parse_cii, same  # noqa: E402

WEIGHT_SCALE = 10.0      # the standalone tab writes kg x 10 (N) unless kgToNewton is off
DENSITY_FACTOR = 1e-6    # converter writes kg/m3 as kg/cm3
WALL_MISSING = 0.01      # converter writes 1.000000E-02 for a missing wall
NODE_CELLS = {"Node/WallThickness": (1, 0, "from"), "Node/InsulationThickness": (1, 1, "to"),
              "Node/CorrosionAllowance": (1, 2, "to")}


def case_cell(kind: str, n: int) -> tuple[int, int]:
    if kind == "Temperature":
        return (1, 2 + n) if n <= 3 else (2, n - 4)
    return (3, n - 1) if n <= 6 else (4, n - 7)


BRANCH_CELLS = {f"Branch/{k}/{k}{n}": case_cell(k, n) for k in ("Temperature", "Pressure") for n in range(1, 10)}
BRANCH_CELLS["Branch/FluidDensity"] = (5, 1)
ITEMS = {"name": ["Node/NodeName"], "weight": ["Node/Weight"],
         "element": [*NODE_CELLS, *BRANCH_CELLS, "Branch/MaterialNumber"]}


def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def leaf(el, path: str):
    """Decoded, trimmed text of a leaf (None when absent or not a leaf)."""
    for t in path.split("/"):
        el = next((c for c in el if local(c.tag) == t), None) if el is not None else None
    if el is None or len(el):
        return None
    return (el.text or "").strip()


def read_target(xml_bytes: bytes) -> tuple[dict, dict]:
    """(branchOrdinal, nodeOrdinal) -> node record; branchOrdinal -> branch record."""
    root = ET.fromstring(xml_bytes)
    branches = [b for p in root if local(p.tag) == "Pipe" for b in p if local(b.tag) == "Branch"] \
        or [b for b in root if local(b.tag) == "Branch"]
    nodes, brs = {}, {}
    for bi, b in enumerate(branches):
        name = leaf(b, "Branchname") or ""
        brs[bi] = {"name": name, "values": {f: leaf(b, f[7:]) for f in [*BRANCH_CELLS, "Branch/MaterialNumber"]}}
        for ni, n in enumerate([c for c in b if local(c.tag) == "Node"]):
            ref = {"branchOrdinal": bi, "branchName": name, "nodeOrdinal": ni,
                   "nodeNumber": leaf(n, "NodeNumber") or "", "componentRefNo": leaf(n, "ComponentRefNo") or ""}
            nodes[(bi, ni)] = {"ref": ref, "values": {f: leaf(n, f[5:]) for f in ["Node/NodeName", "Node/Weight", *NODE_CELLS]}}
    return nodes, brs


def text_number(v: float) -> str:
    """U1 numeric grammar: -?digits[.digits], no exponent, no negative zero."""
    s = f"{round(v, 6):.6f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def record_for(cii_node: str, pairs: dict, nodes: dict):
    """The PSI116 record the converter used for a CII node: NodeNumber equal to the CII node
    number, else the single positive-numbered record at that point; None when unclear."""
    cands = [nodes[k] for k in pairs.get(cii_node, [])]
    exact = [c for c in cands if num(c["ref"]["nodeNumber"]) == num(cii_node)]
    if len(exact) == 1:
        return exact[0]
    positive = [c for c in cands if (num(c["ref"]["nodeNumber"]) or 0) > 0]
    return positive[0] if len(positive) == 1 else None


def node_values(cii: dict, pairs: dict, nodes: dict, items: set) -> tuple[dict, list]:
    """(node key, field) -> set of CII-derived texts; plus refusals for unclear nodes."""
    want, refused = {}, []
    for el in cii["elements"]:
        ends = {"from": node_key(el["E"][0][0]), "to": node_key(el["E"][0][1])}
        recs = {end: record_for(n, pairs, nodes) for end, n in ends.items()}
        for end, rec in recs.items():
            if rec is None and ends[end] in pairs:
                refused.append({"code": "U2D_NODE_AMBIGUOUS", "ciiNode": ends[end], "detail": "several PSI116 records at this point"})
        add = lambda end, field, text: recs[end] and want.setdefault((key(recs[end]["ref"]), field), set()).add(text)  # noqa: E731
        if "name" in items:
            add("from", "Node/NodeName", el["name"][0])
            add("to", "Node/NodeName", el["name"][1])
        if "weight" in items and el["rigid"] is not None:
            add("to", "Node/Weight", text_number(el["rigid"] / WEIGHT_SCALE))
        if "element" in items:
            for field, (li, ci, end) in NODE_CELLS.items():
                v = num(el["E"][li][ci])
                if v is not None and not (field == "Node/WallThickness" and same(v, WALL_MISSING)):
                    add(end, field, text_number(v))
    return want, refused


def node_key(text: str) -> str:
    v = num(text)
    return str(int(v)) if v is not None and v == int(v) else text


def key(ref: dict) -> tuple[int, int]:
    return ref["branchOrdinal"], ref["nodeOrdinal"]


def branch_values(cii: dict, pairs: dict, nodes: dict) -> dict:
    """(branchOrdinal, field) -> set of texts, from every element whose to-node maps into the branch."""
    want = {}
    for el in cii["elements"]:
        rec = record_for(node_key(el["E"][0][1]), pairs, nodes)
        if rec is None:
            continue
        bi = rec["ref"]["branchOrdinal"]
        for field, (li, ci) in BRANCH_CELLS.items():
            v = num(el["E"][li][ci])
            if v is None:
                continue
            if field == "Branch/FluidDensity":
                v = v / DENSITY_FACTOR
            want.setdefault((bi, field), set()).add(text_number(v))
        if el["material"] is not None:
            want.setdefault((bi, "Branch/MaterialNumber"), set()).add(text_number(el["material"]))
    return want


def differs(field: str, before, after: str) -> bool:
    if field == "Node/NodeName":
        return before != after
    if field.startswith("Branch/Temperature/") and same(num(after), 0.0) and same(num(before), SENTINEL):
        return False  # CII 0 = unset; keep the PSI116 -100000 marker
    b = num(before)
    return b is None or not same(b, num(after))


def plan(target_bytes: bytes, cii_text: str, match: dict, items=("name", "weight", "element")) -> dict:
    nodes, brs = read_target(target_bytes)
    cii = parse_cii(cii_text)
    pairs = {}
    for p in match.get("nodePairs", []):
        pairs.setdefault(str(p["cii"]), []).append(key(p["xml"]))
    items = set(items)
    edits, refused = [], []
    nv, refused_nodes = node_values(cii, pairs, nodes, items)
    refused += refused_nodes
    for (k, field), texts in sorted(nv.items()):
        n = nodes[k]
        before = n["values"].get(field)
        if len(texts) != 1:
            refused.append({"code": "U2D_VALUE_SPLIT", "ref": n["ref"], "field": field, "values": sorted(texts)})
        elif before is None:
            refused.append({"code": "U2D_FIELD_UNAVAILABLE", "ref": n["ref"], "field": field})
        elif differs(field, before, next(iter(texts))):
            edits.append({"ref": n["ref"], "field": field, "before": before, "after": next(iter(texts)), "lineNo": "[TBA]"})
    if "element" in items:
        first = {}
        for k in sorted(nodes):
            first.setdefault(k[0], nodes[k]["ref"])
        for (bi, field), texts in sorted(branch_values(cii, pairs, nodes).items()):
            before = brs[bi]["values"].get(field)
            if len(texts) != 1:
                refused.append({"code": "U2D_BRANCH_FIELD_SPLIT", "branch": brs[bi]["name"], "field": field, "values": sorted(texts)})
            elif before is None:
                refused.append({"code": "U2D_FIELD_UNAVAILABLE", "branch": brs[bi]["name"], "field": field})
            elif differs(field, before, next(iter(texts))):
                edits.append({"ref": first[bi], "field": field, "before": before, "after": next(iter(texts)), "lineNo": "[TBA]"})
    by = {}
    for e in edits:
        by[e["field"]] = by.get(e["field"], 0) + 1
    codes = {}
    for r in refused:
        codes[r["code"]] = codes.get(r["code"], 0) + 1
    return {"ok": True, "edits": edits, "refused": refused,
            "summary": {"pairs": len(match.get("nodePairs", [])), "ciiElements": len(cii["elements"]),
                        "edits": len(edits), "byField": by, "refused": codes}}
