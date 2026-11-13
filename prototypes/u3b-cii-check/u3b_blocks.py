"""U3b comparison helpers: line base and revised elements up, list every differing CII
value, and judge blocks the converter rebuilt, CONTROL and the row sections.

Diff keys are (revised element, kind, line, column); values are the revised CII values.
Only u3b_check decides which keys are explained.
"""
from __future__ import annotations

import difflib

from u3b_core import ROW_SECTIONS, num, same

# ELEMENTS pointer rows 13-15 (0-based within "ptr"): bend, rigid, restraint / sif, nodename / reducer.
PTR_RIGID, PTR_NAME = (0, 1), (1, 5)
PTR_COUNTED = ((0, 0), (0, 3), (1, 4), (2, 0))  # bend, restraint, SIF, reducer


def align(base_edges: list[dict], revised_edges: list[dict]) -> tuple[list[tuple[int, int]], list[dict]]:
    """Match elements by (from node, to node, branch); return pairs and rebuilt blocks."""
    key = lambda e: (e["from"]["number"], e["to"]["number"], e["branch"])  # noqa: E731
    sm = difflib.SequenceMatcher(None, [key(e) for e in base_edges], [key(e) for e in revised_edges], autojunk=False)
    pairs, blocks = [], []
    for op, b0, b1, r0, r1 in sm.get_opcodes():
        if op == "equal":
            pairs += list(zip(range(b0, b1), range(r0, r1)))
        else:
            blocks.append({"base": list(range(b0, b1)), "revised": list(range(r0, r1))})
    return pairs, blocks


def present(v) -> bool:
    return v not in ("0", "", None)


def cell_diffs(x: list, y: list, i: int, kind: str, lines=None) -> dict:
    out = {}
    for li in (lines if lines is not None else range(max(len(x), len(y)))):
        lx, ly = (x[li] if li < len(x) else []), (y[li] if li < len(y) else [])
        if lx == ly:
            continue
        if isinstance(ly, str) or isinstance(lx, str):
            out[(i, kind, li, None)] = ly
        else:
            for ci in range(max(len(lx), len(ly))):
                a, b = (lx[ci] if ci < len(lx) else None), (ly[ci] if ci < len(ly) else None)
                if a != b:
                    out[(i, kind, li, ci)] = b
    return out


def compare_pair(x: dict, y: dict, i: int, exact_ptr: bool) -> dict:
    """Every differing value of one matched element (ELEMENTS, pointers, names, RIGID, material)."""
    out = cell_diffs(x["E"], y["E"], i, "E")
    for li in range(3):
        for ci in range(max(len(x["ptr"][li]), len(y["ptr"][li]))):
            a = x["ptr"][li][ci] if ci < len(x["ptr"][li]) else None
            b = y["ptr"][li][ci] if ci < len(y["ptr"][li]) else None
            # rigid and name record numbers shift when records are added; the others never do
            by_presence = (li, ci) == PTR_NAME or ((li, ci) == PTR_RIGID and not exact_ptr)
            if (present(a) != present(b)) if by_presence else (a != b):
                out[(i, "ptr", li, ci)] = b
    out.update({(i, "name", s, None): y["name"][s] for s in (0, 1) if x["name"][s] != y["name"][s]})
    if x["nameLines"][1:] != y["nameLines"][1:]:
        out[(i, "nameLines", None, None)] = y["nameLines"]
    if len(x["rigidRows"]) != len(y["rigidRows"]):
        out[(i, "rigidRows", None, None)] = len(y["rigidRows"])
    else:
        out.update(cell_diffs(x["rigidRows"], y["rigidRows"], i, "rigid"))
    if x["material"] != y["material"]:
        out[(i, "material", None, None)] = y["material"]
    return out


def compare_block(blk: dict, base_edges: list, revised_edges: list, bel: list, rel: list, weight_refs: set) -> tuple[dict, dict]:
    """A rebuilt block is accepted only as the converter's weighted-RIGID split: one base
    element, same end nodes and total length, every element on a weighted component, one
    RIGID record, the same bend/restraint/SIF/reducer records; every other value is compared
    against the base element and must be claimed like any other change."""
    old, new = blk["base"], blk["revised"]
    name = lambda e: f'{e["from"]["number"]}-{e["to"]["number"]}'  # noqa: E731
    report = {"baseElements": [name(base_edges[i]) for i in old], "revisedElements": [name(revised_edges[i]) for i in new]}
    if len(old) != 1 or not new:
        return {**report, "explained": False, "why": "not a single-element split"}, {}
    b, be = bel[old[0]], base_edges[old[0]]
    touches = all(e["from"]["ref"] in weight_refs or e["to"]["ref"] in weight_refs for e in [be] + [revised_edges[i] for i in new])
    ends = revised_edges[new[0]]["from"]["number"] == be["from"]["number"] and revised_edges[new[-1]]["to"]["number"] == be["to"]["number"]
    length = collinear([[num(rel[i]["E"][0][c]) or 0.0 for c in (2, 3, 4)] for i in new],
                       [num(b["E"][0][c]) or 0.0 for c in (2, 3, 4)])
    records = all(same_record(b["ptr"][li][ci], [rel[i]["ptr"][li][ci] for i in new]) for li, ci in PTR_COUNTED)
    rigid = [i for i in new if rel[i]["rigidRows"]]
    diffs = {}
    for k, i in enumerate(new):
        y = rel[i]
        diffs.update(cell_diffs(b["E"], y["E"], i, "E", lines=range(1, 12)))
        if b["E"][0][5:6] != y["E"][0][5:6]:
            diffs[(i, "E", 0, 5)] = y["E"][0][5] if len(y["E"][0]) > 5 else None
        if y["material"] != b["material"]:
            diffs[(i, "material", None, None)] = y["material"]
        for s in (0, 1):
            outer = (s == 0 and k == 0) or (s == 1 and k == len(new) - 1)
            if outer and y["name"][s] != b["name"][s]:
                diffs[(i, "name", s, None)] = y["name"][s]
            elif not outer and y["name"][s]:
                diffs[(i, "name", s, "inner")] = y["name"][s]
    one_rigid = len(rigid) == 1 and bool(b["rigidRows"]) and len(rel[rigid[0]]["rigidRows"]) == len(b["rigidRows"])
    if one_rigid:
        diffs.update(cell_diffs(b["rigidRows"], rel[rigid[0]]["rigidRows"], rigid[0], "rigid"))
    ok = touches and ends and length and records and one_rigid
    why = "the converter splits a weighted RIGID from its flange" if ok else \
        "not explained: " + ", ".join(k for k, v in (("not on a weighted component", touches), ("end nodes differ", ends),
                                                     ("not on the original line", length), ("records moved", records),
                                                     ("RIGID record not kept once", one_rigid)) if not v)
    return {**report, "explained": ok, "why": why}, diffs


def collinear(parts: list[list[float]], whole: list[float], offset_mm: float = 0.5) -> bool:
    """The halves add up to the base element and each lies on its line, in the same direction."""
    if not all(same(sum(p[c] for p in parts), whole[c]) for c in range(3)):
        return False
    norm = sum(x * x for x in whole) ** 0.5
    if norm == 0:
        return all(abs(x) < 1e-9 for p in parts for x in p)
    for p in parts:
        dot = sum(a * b for a, b in zip(p, whole)) / norm
        cross = [p[1] * whole[2] - p[2] * whole[1], p[2] * whole[0] - p[0] * whole[2], p[0] * whole[1] - p[1] * whole[0]]
        if dot < -1e-9 or sum(x * x for x in cross) ** 0.5 / norm > offset_mm:
            return False
    return True


def same_record(base_value, revised_values: list) -> bool:
    """A bend/restraint/SIF/reducer record of the base element sits, with the same number,
    on exactly one element of the split; the other halves have none."""
    held = [v for v in revised_values if present(v)]
    return held == ([base_value] if present(base_value) else [])


def restraint_misplaced(r: dict, edges: list[dict]) -> list[int]:
    """Elements whose restraint record names a node that is not one of their ends (the
    converter puts a restraint on the first element touching its node)."""
    out = []
    for i, el in enumerate(r["elements"]):
        k = el["ptr"][0][3] if len(el["ptr"][0]) > 3 else "0"
        if present(k):
            node = r["restraintNodes"].get(int(k))
            if node is None or node not in (edges[i]["from"]["number"], edges[i]["to"]["number"]):
                out.append(i)
    return out


def control_ok(bc: list, rc: list, added: int, names_changed: bool) -> bool:
    """CONTROL must equal the base, except the element count (+ elements the converter
    added) and the NODENAME count when names were transferred or elements added."""
    if len(bc) != len(rc) or any(len(x) != len(y) for x, y in zip(bc, rc)):
        return False
    for li, (x, y) in enumerate(zip(bc, rc)):
        for ci, (a, b) in enumerate(zip(x, y)):
            if (li, ci) == (0, 0):
                if int(b) != int(a) + added:
                    return False
            elif (li, ci) == (0, 3):
                if a != b and not (names_changed or added):
                    return False
            elif a != b:
                return False
    return True


SECTION_PTR = {"BEND": (0, 0), "SIF&TEES": (1, 4), "REDUCERS": (2, 0)}


def section_changes(b: dict, r: dict, allowed: dict) -> list[dict]:
    """Other sections must be identical. In BEND / SIF&TEES / REDUCERS a differing cell is
    allowed only in the record of an element that carries a transferred OD (or wall, for
    REDUCERS) at one of its ends, and only when it equals that value
    (allowed: element -> {section: values})."""
    out = []
    for k in sorted(set(b["other"]) | set(r["other"])):
        x, y = b["other"].get(k), r["other"].get(k)
        if x == y:
            continue
        ok = k in ROW_SECTIONS and x is not None and y is not None and len(x) == len(y) and bool(r["per"].get(k))
        if ok:
            li, ci = SECTION_PTR[k]
            owner = {int(el["ptr"][li][ci]): i for i, el in enumerate(r["elements"]) if present(el["ptr"][li][ci])}
            for row, (lx, ly) in enumerate(zip(x, y)):
                i = owner.get(row // r["per"][k] + 1)
                values = allowed.get(i, {}).get(k, []) if i is not None else []
                for c in range(max(len(lx), len(ly))):
                    a, v = (lx[c] if c < len(lx) else None), (ly[c] if c < len(ly) else None)
                    if a != v and not any(same(num(v), w) for w in values):
                        ok = False
        out.append({"section": k, "explained": ok})
    return out
