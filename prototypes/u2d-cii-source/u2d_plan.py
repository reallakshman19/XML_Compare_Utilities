"""U2d: plan PSI116 edits from a CII 2019 (v11) file written by the 3D_Converters XML->CII
converter, using P1.2d node pairs (match-psi116 --frame cii2019). Read-only; returns edits
in the U1 shape {ref, field, before, after}.

Owner D3: transfer Node Name, Weight and the Element block (process + material).
Values are read with the converter's own layout (see ../u3b-cii-check/u3b_core.py).
"""
from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "u3b-cii-check"))
from u3b_core import element_label, num, parse_cii, same  # noqa: E402
from u2d_supports import support_report  # noqa: E402

NAME_LIMIT = 25          # CII NODENAME keeps 25 characters
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


def node_values(cii: dict, pairs: dict, nodes: dict, items: set, weight_scale: float) -> tuple[dict, list]:
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
            add("to", "Node/Weight", text_number(el["rigid"] / weight_scale))
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


def element_branch(el: dict) -> str | None:
    """Branch name: the element's line number, carried from the element it was written on when CAESAR II left it
    empty (u3b_core.carry_line_numbers)."""
    return el["lineNumber"] or None


def paired_into(el: dict, bi: int, pairs: dict, nodes: dict) -> bool:
    """Owner, 17 Nov 2026: a branch takes values only from CII elements whose two ends both matched
    this XML by position (match-psi116 pairs; a point with several PSI116 records still matched), with
    at least one matched record in that branch (a branch's first node may sit on its parent branch)."""
    ends = [pairs.get(node_key(el["E"][0][i]), []) for i in (0, 1)]
    if el.get("lineNumberAcrossJump"):
        # Its line number was carried across a jump (u3b_core.carry_line_numbers): both ends must be on the branch.
        return all(ends) and all(any(k[0] == bi for k in e) for e in ends)
    return all(ends) and any(k[0] == bi for e in ends for k in e)


def branch_values(cii: dict, brs: dict, pairs: dict, nodes: dict, sources: dict | None = None) -> tuple[dict, list]:
    """(branchOrdinal, field) -> set of texts from every element whose line-number field names
    the branch and whose ends matched this XML (paired_into). A branch named by CII elements none
    of which matched is refused (U2D_BRANCH_NOT_PAIRED). A CII temperature 0 is the converter's
    'unset' (-100000). A material equal to the one carried in from the previous element is not
    taken as the branch's own. sources, when given, gets (branchOrdinal, field) -> [[element, element its line number
    was written on], ...]: the CII elements each value came from."""
    by_name = {}
    for bi, b in brs.items():
        by_name.setdefault(b["name"], []).append(bi)
    want, refused, carried = {}, [], {}
    named, used = set(), set()
    prev = 1.0
    for el in cii["elements"]:
        name = element_branch(el)
        targets = by_name.get(name, [])
        if len(targets) > 1:
            refused.append({"code": "U2D_BRANCH_NAME_SHARED", "branch": name})
        if len(targets) == 1 and not paired_into(el, targets[0], pairs, nodes):
            named.add(targets[0])
        elif len(targets) == 1:
            bi = targets[0]
            used.add(bi)
            for field, (li, ci) in BRANCH_CELLS.items():
                v = num(el["E"][li][ci])
                if v is None:
                    continue
                if field == "Branch/FluidDensity":
                    v = v / DENSITY_FACTOR
                text = "-100000" if field.startswith("Branch/Temperature/") and same(v, 0.0) else text_number(v)
                want.setdefault((bi, field), set()).add(text)
                if sources is not None:
                    sources.setdefault((bi, field), []).append([element_label(el), el["lineNumberOn"]])
            if el["material"] is not None:
                want.setdefault((bi, "Branch/MaterialNumber"), set()).add(text_number(el["material"]))
                if sources is not None:
                    sources.setdefault((bi, "Branch/MaterialNumber"), []).append([element_label(el), el["lineNumberOn"]])
                carried.setdefault(bi, []).append(same(el["material"], prev))
        if el["material"] is not None:
            prev = el["material"]
    missing = [element_label(el) for el in cii["elements"] if not el["lineNumber"]]
    if missing:
        refused.append({"code": "U2D_LINE_NUMBER_MISSING", "elements": len(missing), "first": missing[:5],
                        "detail": "CII elements with no line number (none written before them, or unreadable): "
                                  "their branch values are not taken"})
    jumped = [element_label(el) for el in cii["elements"] if el.get("lineNumberAcrossJump")
              and len(by_name.get(element_branch(el), [])) == 1 and not paired_into(el, by_name[element_branch(el)][0], pairs, nodes)]
    if jumped:
        refused.append({"code": "U2D_LINE_NUMBER_ACROSS_JUMP", "elements": len(jumped), "first": jumped[:5],
                        "detail": "CII elements whose line number CAESAR II carried across a jump, with an end off that "
                                  "branch (a tee run): their values are not taken for it"})
    for bi in sorted(named - used):
        refused.append({"code": "U2D_BRANCH_NOT_PAIRED", "branch": brs[bi]["name"],
                        "detail": "no CII element of this branch matched the XML's nodes; its values are not taken"})
    for bi, flags in carried.items():
        if all(flags):
            want.pop((bi, "Branch/MaterialNumber"), None)
            refused.append({"code": "U2D_MATERIAL_CARRIED", "branch": brs[bi]["name"],
                            "detail": "the CII material equals the one carried in; the branch may have none of its own"})
    return want, refused


def cii_source(rows: list) -> dict:
    """Where a branch value came from in the CII: its elements, and for each element whose line number CAESAR II left
    empty, the element it was written on."""
    return {"elements": [e for e, _ in rows], "lineNumberCarried": {e: on for e, on in rows if on != e}}


def differs(field: str, before, after: str) -> bool:
    if field == "Node/NodeName":
        return before != after and not (len(before) > NAME_LIMIT and before[:NAME_LIMIT] == after)
    b = num(before)
    return b is None or not same(b, num(after))


def check_weight_scale(edits: list, weight_scale: float) -> None:
    """Refuse the whole transfer when the weight edits look like a wrong unit: at least 5 weight
    edits and 80 % of them exactly 10x or 0.1x the PSI116 weight (review 17 Nov 2026)."""
    ratios = [num(e["after"]) / num(e["before"]) for e in edits
              if e["field"] == "Node/Weight" and num(e["before"]) and num(e["after"]) is not None]
    off = sum(1 for r in ratios if same(r, 10.0) or same(r, 0.1))
    if len(ratios) >= 5 and off >= 0.8 * len(ratios):
        raise ValueError(f"U2D_WEIGHT_SCALE_SUSPECT: {off} of {len(ratios)} weight changes are exactly 10x or 0.1x the "
                         f"XML weight; the CII weight unit (--weight-scale {weight_scale:g}) is probably wrong. Nothing was transferred.")


def plan(target_bytes: bytes, cii_text: str, match: dict, weight_scale: float, items=("name", "weight", "element")) -> dict:
    nodes, brs = read_target(target_bytes)
    cii = parse_cii(cii_text)
    pairs = {}
    for p in match.get("nodePairs", []):
        pairs.setdefault(str(p["cii"]), []).append(key(p["xml"]))
    items = set(items)
    edits, refused = [], []
    nv, refused_nodes = node_values(cii, pairs, nodes, items, weight_scale)
    refused += [dict(t) for t in sorted({tuple(sorted((k, str(v)) for k, v in r.items())) for r in refused_nodes})]
    for (k, field), texts in sorted(nv.items()):
        n = nodes[k]
        before = n["values"].get(field)
        if len(texts) != 1:
            refused.append({"code": "U2D_VALUE_SPLIT", "ref": n["ref"], "field": field, "values": sorted(texts)})
        elif before is None:
            refused.append({"code": "U2D_FIELD_UNAVAILABLE", "ref": n["ref"], "field": field})
        elif field == "Node/NodeName" and len(next(iter(texts))) == NAME_LIMIT and differs(field, before, next(iter(texts))):
            refused.append({"code": "U2D_NAME_MAY_BE_CUT", "ref": n["ref"], "field": field,
                            "detail": f"the CII keeps {NAME_LIMIT} characters; the full name is unknown"})
        elif field == "Node/Weight" and same(num(next(iter(texts))) or 0.0, 0.0) and not same(num(before) or 0.0, 0.0):
            # Owner, 14 Nov: EF-05 got 171 zero weights (valves, flanges, rigids) from a CII whose RIGIDs
            # carry 0. A CII weight of 0 means "no weight written", never a real value over a real one.
            refused.append({"code": "U2D_WEIGHT_ZERO", "ref": n["ref"], "field": field, "before": before,
                            "detail": "the CII weight is 0; the PSI116 weight is kept"})
        elif differs(field, before, next(iter(texts))):
            edits.append({"ref": n["ref"], "field": field, "before": before, "after": next(iter(texts)), "lineNo": "[TBA]"})
    if "element" in items:
        first = {}
        for k in sorted(nodes):
            first.setdefault(k[0], nodes[k]["ref"])
        sources = {}
        bv, refused_branches = branch_values(cii, brs, pairs, nodes, sources)
        refused += [dict(t) for t in sorted({tuple(sorted((k, str(v)) for k, v in r.items())) for r in refused_branches})]
        for (bi, field), texts in sorted(bv.items()):
            before = brs[bi]["values"].get(field)
            if len(texts) != 1:
                refused.append({"code": "U2D_BRANCH_FIELD_SPLIT", "branch": brs[bi]["name"], "field": field, "values": sorted(texts)})
            elif before is None:
                refused.append({"code": "U2D_FIELD_UNAVAILABLE", "branch": brs[bi]["name"], "field": field})
            elif differs(field, before, next(iter(texts))):
                edits.append({"ref": first[bi], "field": field, "before": before, "after": next(iter(texts)), "lineNo": "[TBA]",
                              "cii": cii_source(sources[(bi, field)])})
    check_weight_scale(edits, weight_scale)
    by = {}
    for e in edits:
        by[e["field"]] = by.get(e["field"], 0) + 1
    codes = {}
    for r in refused:
        codes[r["code"]] = codes.get(r["code"], 0) + 1
    # Supports from CAESAR II (Owner 18 Nov 2026): listed in the receipt (step 2); not applied to the XML yet.
    supports = support_report(target_bytes, cii_text, match)
    return {"ok": True, "edits": edits, "refused": refused,
            "supports": {"changes": supports["changes"], "refused": supports["refused"]},
            "summary": {"pairs": len(match.get("nodePairs", [])), "ciiElements": len(cii["elements"]),
                        "edits": len(edits), "byField": by, "refused": codes, "supports": supports["summary"]}}
