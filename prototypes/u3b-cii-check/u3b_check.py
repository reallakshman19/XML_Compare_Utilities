"""U3b command line and judgement: for every change in a U2b receipt, does its value
reach the CII written by the 3D_Converters app converter, and did nothing else change?

    python u3b_check.py --converter <3DC>/converters/scripts --base base.xml \
        --revised revised.xml --receipt changes.json --out report.json [--cii-dir dir]

Exit 0 = PASS, 3 = FAIL (report written), 1 = refusal (no report), 2 = usage.
"""
from __future__ import annotations

import argparse
import difflib
import json
import sys
import tempfile
from pathlib import Path

from u3b_core import (BRANCH_CELLS, DENSITY_FACTOR, ENTRY, FORMAT, NAME_LIMIT, NODE_CELLS, NOT_READ, SECTION_FIELDS,
                      Refusal, convert, ends_at, expected_cii, git_head, num, parse_cii, same, sha256, xml_nodes)


def align(base_edges: list[dict], revised_edges: list[dict]) -> tuple[list[tuple[int, int]], list[dict]]:
    """Line base and revised elements up by (from node, to node, branch). Returns the
    matched (base, revised) index pairs and the blocks the converter rebuilt."""
    key = lambda e: (e["from"]["number"], e["to"]["number"], e["branch"])  # noqa: E731
    sm = difflib.SequenceMatcher(None, [key(e) for e in base_edges], [key(e) for e in revised_edges], autojunk=False)
    pairs, blocks = [], []
    for op, b0, b1, r0, r1 in sm.get_opcodes():
        if op == "equal":
            pairs += list(zip(range(b0, b1), range(r0, r1)))
        else:
            blocks.append({"base": list(range(b0, b1)), "revised": list(range(r0, r1))})
    return pairs, blocks


def explain_blocks(blocks: list[dict], base_edges: list[dict], revised_edges: list[dict], weight_refs: set) -> list[dict]:
    """A rebuilt block is explained only when every element in it touches a component whose
    weight was transferred (the converter splits a weighted RIGID from its flange)."""
    touches = lambda e: e["from"]["ref"] in weight_refs or e["to"]["ref"] in weight_refs  # noqa: E731
    name = lambda e: f'{e["from"]["number"]}-{e["to"]["number"]}'  # noqa: E731
    out = []
    for blk in blocks:
        old, new = [base_edges[i] for i in blk["base"]], [revised_edges[i] for i in blk["revised"]]
        ok = bool(new) and all(touches(e) for e in old + new)
        out.append({"baseElements": [name(e) for e in old], "revisedElements": [name(e) for e in new],
                    "explained": ok,
                    "why": "the converter splits a weighted RIGID from its flange" if ok else "not caused by a transferred weight"})
    return out


def cell_diffs(be: list[dict], re_: list[dict], pairs: list[tuple[int, int]]) -> list[tuple]:
    """Every differing CII value between matched elements, as (revised element, kind, line, column)."""
    out = []
    for bi, i in pairs:
        x, y = be[bi], re_[i]
        for li, (lx, ly) in enumerate(zip(x["E"], y["E"])):
            if lx == ly:
                continue
            if isinstance(lx, str):
                out.append((i, "E", li, None))
            else:
                out += [(i, "E", li, ci) for ci in range(max(len(lx), len(ly))) if lx[ci:ci + 1] != ly[ci:ci + 1]]
        out += [(i, "name", side, None) for side in (0, 1) if x["name"][side] != y["name"][side]]
        out += [(i, k, None, None) for k in ("rigid", "material") if x[k] != y[k]]
    return out


def judge_branch(row: dict, field: str, after: str, members: list[int], re_: list[dict]) -> tuple[dict, set]:
    if field == "Branch/MaterialNumber":
        seen, want = [re_[i]["material"] for i in members], num(after)
        claims = {(i, "material", None, None) for i in members}
    elif field in BRANCH_CELLS:
        li, ci = BRANCH_CELLS[field]
        seen, want = [num(re_[i]["E"][li][ci]) for i in members], expected_cii(field, after)
        claims = {(i, "E", li, ci) for i in members}
    else:
        return {**row, "status": "UNKNOWN_FIELD"}, set()
    ok = all(same(v, want) for v in seen)
    return {**row, "status": "CARRIED" if ok else "MISMATCH", "elements": len(members),
            "cii": sorted({v for v in seen if v is not None}), "expected": want}, claims


def judge_node(row: dict, field: str, after: str, hits: list[tuple[int, str]], re_: list[dict]) -> tuple[dict, set]:
    if field == "Node/NodeName":
        want = (after or "")[:NAME_LIMIT]
        sides = [(i, 0 if end == "from" else 1) for i, end in hits]
        seen = [re_[i]["name"][s] for i, s in sides]
        out = {**row, "status": "CARRIED" if all(v == want for v in seen) else "MISMATCH", "cii": sorted(set(seen))}
        if out["status"] == "CARRIED" and len(after or "") > NAME_LIMIT:
            out.update(status="CARRIED_TRUNCATED", reason=f"CII NODENAME keeps {NAME_LIMIT} characters")
        return out, {(i, "name", s, None) for i, s in sides}
    if field == "Node/Weight":
        owners = [i for i, end in hits if end == "to" and re_[i]["rigid"] is not None]
        if not owners:
            return {**row, "status": "NOT_CARRIED",
                    "reason": "this node does not own a RIGID element; CII keeps weights only on RIGID elements"}, set()
        seen = [re_[i]["rigid"] for i in owners]
        ok = all(same(v, num(after)) for v in seen)
        return {**row, "status": "CARRIED" if ok else "MISMATCH", "cii": seen}, {(i, "rigid", None, None) for i in owners}
    if field in NODE_CELLS:
        li, ci, end = NODE_CELLS[field]
        owners = [i for i, e in hits if end in ("any", e)]
        if not owners:
            return {**row, "status": "NOT_CARRIED", "reason": f"no element takes this value from the node's {end} end"}, set()
        seen = [num(re_[i]["E"][li][ci]) for i in owners]
        ok = any(same(v, num(after)) for v in seen)
        return ({**row, "status": "CARRIED" if ok else "MISMATCH", "cii": sorted({v for v in seen if v is not None})},
                {(i, "E", li, ci) for i in owners})
    return {**row, "status": "UNKNOWN_FIELD"}, set()


def judge_change(ch: dict, node: dict | None, xml: dict, edges: list[dict], re_: list[dict]) -> tuple[dict, set]:
    """Status of one receipt change, and the CII cells it accounts for."""
    field, after, ref = ch.get("field"), ch.get("after"), ch.get("ref") or {}
    row = {"field": field, "branchName": ref.get("branchName"), "nodeNumber": ref.get("nodeNumber"),
           "componentRefNo": ref.get("componentRefNo"), "before": ch.get("before"), "after": after}
    if field in NOT_READ:
        return {**row, "status": "NOT_CARRIED", "reason": NOT_READ[field]}, set()
    if str(field).startswith("Branch/"):
        members = [i for i, e in enumerate(edges) if e["branch"] == ref.get("branchName")]
        if not members:
            return {**row, "status": "NOT_CARRIED", "reason": "the converter built no element for this branch"}, set()
        return judge_branch(row, field, after, members, re_)
    hits = ends_at(edges, node, xml) if node else []
    if not hits:
        return {**row, "status": "NOT_CARRIED",
                "reason": ("the converter skips nodes numbered 0 or below in this run" if node and (node["number"] or 0) <= 0
                           else "the converter built no element end from this node (merged into a neighbour or dropped)")}, set()
    return judge_node(row, field, after, hits, re_)


def control_unchanged(b: list, r: list, names_changed: bool) -> bool:
    """CONTROL must be identical, except the NODENAME count when names were transferred."""
    if b == r:
        return True
    keep = lambda c: [c[0][:3] + c[0][4:]] + c[1:]  # noqa: E731
    return names_changed and keep(b) == keep(r)


def check(base_bytes: bytes, revised_bytes: bytes, receipt: dict, base_cii: str, revised_cii: str,
          base_edges: list[dict], revised_edges: list[dict]) -> dict:
    if receipt.get("format") != "u2.transfer-receipt" or not isinstance(receipt.get("changes"), list):
        raise Refusal("U3B_RECEIPT_INVALID", "expected a u2.transfer-receipt with a changes array")
    for key, data in (("base", base_bytes), ("revised", revised_bytes)):
        if (receipt.get(key) or {}).get("sha256") != sha256(data):
            raise Refusal("U3B_SHA256_MISMATCH", f"receipt {key}.sha256 differs from the {key} XML")
    b, r = parse_cii(base_cii), parse_cii(revised_cii)
    if len(b["elements"]) != len(base_edges) or len(r["elements"]) != len(revised_edges):
        raise Refusal("U3B_CII_UNREADABLE", "CII element count differs from the converter's element list")
    pairs, blocks = align(base_edges, revised_edges)
    weight_refs = {(c.get("ref") or {}).get("componentRefNo") for c in receipt["changes"] if c.get("field") == "Node/Weight"}
    structure = explain_blocks(blocks, base_edges, revised_edges, weight_refs)
    nodes, diffs, rows, claimed = xml_nodes(revised_bytes), cell_diffs(b["elements"], r["elements"], pairs), [], set()
    for ch in receipt["changes"]:
        ref = ch.get("ref") or {}
        row, claims = judge_change(ch, nodes.get((ref.get("branchOrdinal"), ref.get("nodeOrdinal"))), nodes,
                                   revised_edges, r["elements"])
        rows.append(row)
        claimed |= claims
    fields = {c.get("field") for c in receipt["changes"]}
    if "Branch/MaterialNumber" in fields:  # the converter carries a material forward to following elements
        claimed |= {d for d in diffs if d[1] == "material"}
    unexplained = [d for d in diffs if d not in claimed]
    sections = [{"section": k, "explained": bool(SECTION_FIELDS.get(k, set()) & fields)}
                for k in sorted(set(b["other"]) | set(r["other"])) if b["other"].get(k) != r["other"].get(k)]
    control_ok = control_unchanged(b["control"], r["control"], "Node/NodeName" in fields) or (
        bool(structure) and all(x["explained"] for x in structure))
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["status"]] = counts.get(row["status"], 0) + 1
    bad = counts.get("MISMATCH") or counts.get("UNKNOWN_FIELD") or unexplained or not control_ok \
        or any(not s["explained"] for s in sections) or any(not x["explained"] for x in structure)
    return {"format": FORMAT, "version": 1, "verdict": "FAIL" if bad else "PASS", "elements": len(r["elements"]),
            "changes": len(rows), "counts": counts,
            "unexplainedCiiChanges": [{"element": d[0], "fromNode": revised_edges[d[0]]["from"]["number"],
                                       "toNode": revised_edges[d[0]]["to"]["number"], "kind": d[1], "line": d[2],
                                       "column": d[3]} for d in unexplained],
            "otherSectionChanges": sections, "controlUnchanged": control_ok, "structureChanges": structure, "rows": rows}


def run(a: argparse.Namespace) -> dict:
    if a.out.exists():
        raise Refusal("U3B_OUTPUT_EXISTS", str(a.out))
    if not (a.converter / ENTRY).exists():
        raise Refusal("U3B_CONVERTER_MISSING", str(a.converter / ENTRY))
    base_bytes, rev_bytes = a.base.read_bytes(), a.revised.read_bytes()
    try:
        receipt = json.loads(a.receipt.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise Refusal("U3B_RECEIPT_INVALID", str(e))
    with tempfile.TemporaryDirectory() as tmp:
        d = (a.cii_dir or Path(tmp)).resolve()
        d.mkdir(parents=True, exist_ok=True)
        be = convert(a.converter.resolve(), a.base.resolve(), d / "base.cii", d / "base.elements.json")
        re_ = convert(a.converter.resolve(), a.revised.resolve(), d / "revised.cii", d / "revised.elements.json")
        bc, rc = (d / "base.cii").read_text(encoding="utf-8"), (d / "revised.cii").read_text(encoding="utf-8")
    report = check(base_bytes, rev_bytes, receipt, bc, rc, be, re_)
    report["converter"] = {"entry": ENTRY, "commit": git_head(a.converter), "weightScale": 1,
                           "densityFactor": DENSITY_FACTOR}
    report["inputs"] = {"base": sha256(base_bytes), "revised": sha256(rev_bytes),
                        "baseCii": sha256(bc.encode()), "revisedCii": sha256(rc.encode())}
    with open(a.out, "x", encoding="utf-8") as f:
        json.dump(report, f, indent=1)
    return report


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="U3b: does the CII carry the transferred values?")
    p.add_argument("--converter", required=True, type=Path, help="3D_Converters converters/scripts folder")
    p.add_argument("--base", required=True, type=Path, help="PSI116 before the transfer (U2b base)")
    p.add_argument("--revised", required=True, type=Path, help="revised PSI116 written by U2b")
    p.add_argument("--receipt", required=True, type=Path, help="U2b changes JSON (u2.transfer-receipt)")
    p.add_argument("--out", required=True, type=Path, help="new report JSON (must not exist)")
    p.add_argument("--cii-dir", type=Path, help="keep base.cii, revised.cii and element lists here")
    try:
        report = run(p.parse_args(argv))
    except Refusal as r:
        print(json.dumps({"refusal": r.code, "detail": r.detail}), file=sys.stderr)
        return 1
    print(json.dumps({"verdict": report["verdict"], "changes": report["changes"], "counts": report["counts"],
                      "unexplained": len(report["unexplainedCiiChanges"]), "otherSections": report["otherSectionChanges"]}))
    return 0 if report["verdict"] == "PASS" else 3


if __name__ == "__main__":
    sys.exit(main())
