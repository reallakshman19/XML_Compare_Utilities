"""U3b command line and judgement: for every change in a U2b receipt, does its value
reach the CII written by the 3D_Converters app converter, and did nothing else change?

    python -E -s u3b_check.py --converter <3DC>/converters/scripts --base base.xml \
        --revised revised.xml --receipt changes.json --out report.json [--cii-dir dir]

Exit 0 = PASS, 3 = FAIL (report written), 1 = refusal (no report), 2 = usage.

Rule: every CII value that differs between base and revised must be claimed by one
receipt change AND hold the value that change predicts; anything else is unexplained.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

from u3b_blocks import align, compare_block, compare_pair, control_ok, section_changes
from u3b_core import (BRANCH_CELLS, DENSITY_FACTOR, ENTRY, FORMAT, NAME_LIMIT, NODE_CELLS, NOT_READ, Refusal, convert,
                      ends_at, expected_cii, git_head, num, parse_cii, same, sha256, xml_nodes)

BAD = ("MISMATCH", "UNKNOWN_FIELD", "BRANCH_NAME_SHARED")


def judge_branch(row: dict, field: str, after: str, members: list[int], edges: list[dict], re_: list[dict]) -> tuple[dict, dict]:
    if field == "Branch/MaterialNumber":
        want = num(after)
        claims = {(i, "material", None, None): want for i in members}
        i = max(members) + 1  # the converter carries it forward until an element has its own material
        while i < len(re_) and edges[i].get("ownMaterial") is None:
            claims[(i, "material", None, None)] = want
            i += 1
        seen = [re_[i]["material"] for i in members if edges[i].get("ownMaterial") is None or same(edges[i]["ownMaterial"], want)]
        if not seen:
            return {**row, "status": "NOT_CARRIED",
                    "reason": "every element of this branch takes its material from a node material code"}, {}
    elif field in BRANCH_CELLS:
        li, ci = BRANCH_CELLS[field]
        want = expected_cii(field, after)
        claims = {(i, "E", li, ci): want for i in members}
        seen = [num(re_[i]["E"][li][ci]) for i in members]
    else:
        return {**row, "status": "UNKNOWN_FIELD"}, {}
    ok = all(same(v, want) for v in seen)
    return {**row, "status": "CARRIED" if ok else "MISMATCH", "elements": len(members),
            "cii": sorted({v for v in seen if v is not None}), "expected": want}, claims


def judge_node(row: dict, field: str, after: str, hits: list[tuple[int, str]], edges: list[dict],
               re_: list[dict]) -> tuple[dict, dict]:
    if field == "Node/NodeName":
        want = (after or "")[:NAME_LIMIT]
        sides = [(i, 0 if end == "from" else 1) for i, end in hits]
        seen = [re_[i]["name"][s] for i, s in sides]
        out = {**row, "status": "CARRIED" if all(v == want for v in seen) else "MISMATCH", "cii": sorted(set(seen))}
        if out["status"] == "CARRIED" and len(after or "") > NAME_LIMIT:
            out.update(status="CARRIED_TRUNCATED", reason=f"CII NODENAME keeps {NAME_LIMIT} characters")
        claims = {(i, "name", s, None): want for i, s in sides}
        claims.update({(i, "ptr", 1, 5): "present" if want else "any" for i, _ in sides})
        return out, claims
    if field == "Node/Weight":
        owners = [i for i, end in hits if end == "to" and re_[i]["rigid"] is not None]
        if not owners:
            return {**row, "status": "NOT_CARRIED",
                    "reason": "this node does not own a RIGID element; CII keeps weights only on RIGID elements"}, {}
        seen = [re_[i]["rigid"] for i in owners]
        ok = all(same(v, num(after)) for v in seen)
        return ({**row, "status": "CARRIED" if ok else "MISMATCH", "cii": seen},
                {(i, "rigid", 0, 0): num(after) for i in owners})
    if field in NODE_CELLS:
        li, ci, end = NODE_CELLS[field]
        if end == "any":  # OD: only elements whose OD the converter takes from this node's end
            owners = [i for i, e in hits if edges[i]["odEnd"] == e]
            port = [i for i, e in hits if edges[i]["odEnd"] == "port"]
        else:
            owners, port = [i for i, e in hits if e == end], []
        if not owners:
            reason = ("the converter takes these elements' OD from the connected port" if port
                      else "no element takes this value from this node's end")
            return {**row, "status": "NOT_CARRIED", "reason": reason}, {}
        want = expected_cii(field, after)
        seen = [num(re_[i]["E"][li][ci]) for i in owners]
        ok = all(same(v, want) for v in seen)
        return ({**row, "status": "CARRIED" if ok else "MISMATCH", "cii": sorted({v for v in seen if v is not None})},
                {(i, "E", li, ci): want for i in owners})
    return {**row, "status": "UNKNOWN_FIELD"}, {}


def judge_change(ch: dict, node: dict | None, xml: dict, edges: list[dict], re_: list[dict],
                 shared: set) -> tuple[dict, dict]:
    """Status of one receipt change, and the CII cells it claims with their expected values."""
    field, after, ref = ch.get("field"), ch.get("after"), ch.get("ref") or {}
    row = {"field": field, "branchName": ref.get("branchName"), "nodeNumber": ref.get("nodeNumber"),
           "componentRefNo": ref.get("componentRefNo"), "before": ch.get("before"), "after": after}
    if field in NOT_READ:
        return {**row, "status": "NOT_CARRIED", "reason": NOT_READ[field]}, {}
    if str(field).startswith("Branch/"):
        if ref.get("branchName") in shared:
            return {**row, "status": "BRANCH_NAME_SHARED",
                    "reason": "several branches share this name and the converter applies branch values by name"}, {}
        members = [i for i, e in enumerate(edges) if e["branch"] == ref.get("branchName")]
        if not members:
            return {**row, "status": "NOT_CARRIED", "reason": "the converter built no element for this branch"}, {}
        return judge_branch(row, field, after, members, edges, re_)
    hits = ends_at(edges, node, xml) if node else []
    if not hits:
        return {**row, "status": "NOT_CARRIED",
                "reason": ("the converter skips nodes numbered 0 or below in this run" if node and (node["number"] or 0) <= 0
                           else "the converter built no element end from this node (merged into a neighbour or dropped)")}, {}
    return judge_node(row, field, after, hits, edges, re_)


def explained(diff: tuple, value, claims: dict) -> bool:
    """A differing CII value is explained only when claimed and equal to the claimed value."""
    if diff not in claims:
        return False
    want = claims[diff]
    if want == "any":
        return True
    if want == "present":
        return value not in ("0", "", None)
    if isinstance(want, str):
        return value == want
    return same(value if isinstance(value, float) else num(value), want)


def branch_names_shared(nodes: dict) -> set:
    names = {}
    for (bi, _), n in nodes.items():
        names.setdefault(bi, n["branch"])
    values = list(names.values())
    return {n for n in values if values.count(n) > 1}


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
    changes = receipt["changes"]
    pairs, blocks = align(base_edges, revised_edges)
    diffs: dict = {}
    for bi, i in pairs:
        diffs.update(compare_pair(b["elements"][bi], r["elements"][i], i, exact_ptr=not blocks))
    weight_refs = {(c.get("ref") or {}).get("componentRefNo") for c in changes if c.get("field") == "Node/Weight"}
    structure = []
    for blk in blocks:
        report, cell_diffs = compare_block(blk, base_edges, revised_edges, b["elements"], r["elements"], weight_refs)
        structure.append(report)
        diffs.update(cell_diffs)
    nodes = xml_nodes(revised_bytes)
    shared = branch_names_shared(nodes)
    rows, claims = [], {}
    for ch in changes:
        ref = ch.get("ref") or {}
        row, c = judge_change(ch, nodes.get((ref.get("branchOrdinal"), ref.get("nodeOrdinal"))), nodes,
                              revised_edges, r["elements"], shared)
        rows.append(row)
        claims.update(c)
    unexplained = [d for d, v in diffs.items() if not explained(d, v, claims)]
    afters: dict[str, list] = {}
    for c in changes:
        afters.setdefault(c.get("field"), []).append(expected_cii(str(c.get("field")), c.get("after")))
    sections = section_changes(b["other"], r["other"], afters)
    ctl = control_ok(b["control"], r["control"], len(revised_edges) - len(base_edges),
                     any(c.get("field") == "Node/NodeName" for c in changes))
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["status"]] = counts.get(row["status"], 0) + 1
    bad = any(counts.get(k) for k in BAD) or unexplained or not ctl or any(not s["explained"] for s in sections) \
        or any(not x["explained"] for x in structure)
    return {"format": FORMAT, "version": 2, "verdict": "FAIL" if bad else "PASS", "elements": len(r["elements"]),
            "changes": len(rows), "counts": counts,
            "unexplainedCiiChanges": [{"element": d[0], "fromNode": revised_edges[d[0]]["from"]["number"],
                                       "toNode": revised_edges[d[0]]["to"]["number"], "kind": d[1], "line": d[2],
                                       "column": d[3], "value": diffs[d]} for d in unexplained],
            "otherSectionChanges": sections, "controlUnchanged": ctl, "structureChanges": structure, "rows": rows}


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
