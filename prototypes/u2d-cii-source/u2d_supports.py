"""Supports from CAESAR II, step 1 (Owner 18 Nov 2026: "Supports from CAESAR II: restraints added,
removed or edited in CAESAR II come back onto existing nodes ... supports on new nodes are refused").

Read-only. Compares the supports (CII RESTRANT records) with the XML's <Restraint> entries on the
matcher's node pairs and reports what differs. Nothing is transferred yet (step 2 adds the changes
to the receipt, step 3 applies them under locks).

Rules, from 3D_Converters' step 10 writer (converters/scripts/xml_to_cii2019.py):
- A CII point takes the supports of every XML record paired to it, without repeats: step 10 merges
  the supports of a dropped or coincident node into the node it keeps (_merge_restraint_specs).
- Step 10 adds its own anchor at an open pipe end (type 1, stiffness OPEN_END_STIFFNESS). It is not a
  support from the model and never counts as one added in CAESAR II.
- The XML type becomes the CAESAR II type code as step 10 writes it (TYPE_CODES, bare axes below).
- A negative XML friction (-1.0101 on BM2's guides) is not a friction; it counts as 0.
- Direction is compared only where the XML gives direction cosines.
"""
from __future__ import annotations

import math
import xml.etree.ElementTree as ET

from u3b_core import num, sections_of

OPEN_END_STIFFNESS = 9.41952e19
RECORD_LINES = 4          # RESTRANT: node/type/stiffness/gap/friction/cnode; cosines; two tag lines
TYPE_CODES = {            # step 10's NATIVE_RESTRAINT_TYPE_CODES (tests check them against the writer)
    "ANC": 1, "GUI": 8, "GUIDE": 8, "LIM": 9, "LIMIT": 9, "XSNB": 10, "YSNB": 11, "ZSNB": 12,
    "+X": 13, "+Y": 14, "+Z": 15, "-X": 16, "-Y": 17, "-Z": 18,
    "+RX": 19, "+RY": 20, "+RZ": 21, "-RX": 22, "-RY": 23, "-RZ": 24,
    "+LIM": 25, "-LIM": 26, "XROD": 27, "YROD": 28, "ZROD": 29,
    "+XROD": 30, "+YROD": 31, "+ZROD": 32, "-XROD": 33, "-YROD": 34,
    "-ZROD": 35, "X2": 36, "Y2": 37, "Z2": 38, "RX2": 39, "RY2": 40,
    "RZ2": 41, "+X2": 42, "+Y2": 43, "+Z2": 44, "-X2": 45, "-Y2": 46,
    "-Z2": 47, "+RX2": 48, "+RY2": 49, "+RZ2": 50, "-RX2": 51,
    "-RY2": 52, "-RZ2": 53, "XSPR": 54, "YSPR": 55, "ZSPR": 56,
    "+XSNB": 57, "+YSNB": 58, "+ZSNB": 59, "-XSNB": 60, "-YSNB": 61,
    "-ZSNB": 62,
}
CII_AXIS_CODES = {"X": 2, "Y": 3, "Z": 4}
PSI116_TO_CII_AXIS = {"X": "X", "Y": "Z", "Z": "Y"}   # a bare XML axis letter is in the AVEVA frame


def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def child(el, name: str) -> str:
    c = next((c for c in el if local(c.tag) == name), None)
    return (c.text or "").strip() if c is not None else ""


def unit(v):
    if v is None or not all(math.isfinite(x) for x in v):
        return None
    n = math.sqrt(sum(x * x for x in v))
    return tuple(x / n for x in v) if n > 0 else None


def type_code(text: str, direction) -> int | None:
    """Step 10's _restraint_type_to_code; None for a type it does not know (it writes an anchor then)."""
    t = text.strip().upper()
    v = num(t)
    if v is not None and abs(v - round(v)) < 1e-6 and 1 <= round(v) <= 62:
        return int(round(v))
    if t in TYPE_CODES:
        return TYPE_CODES[t]
    if t in {"A", "ANCHOR", "FIXED", "FIX"}:
        return 1
    t = t[1:] if t[:1] in "+-" else t
    if t in PSI116_TO_CII_AXIS:
        axis = next((a for a, x in zip("XYZ", direction or ()) if abs(abs(x) - 1.0) < 1e-6), None)
        return CII_AXIS_CODES[axis or PSI116_TO_CII_AXIS[t]]
    return None


def support(code, stiffness, gap, friction, direction) -> tuple:
    """The compared form of one support."""
    f = friction or 0.0
    return (code, float(f"{stiffness or 0.0:.5g}"), round(gap or 0.0, 4), round(f if f >= 0 else 0.0, 4),
            tuple(round(x, 4) for x in direction) if direction else None)


def xml_supports(xml_bytes: bytes) -> tuple[dict, list]:
    """(branchOrdinal, nodeOrdinal) -> [support]; plus XML types step 10 does not know."""
    root = ET.fromstring(xml_bytes)
    branches = [b for p in root if local(p.tag) == "Pipe" for b in p if local(b.tag) == "Branch"] \
        or [b for b in root if local(b.tag) == "Branch"]
    out, unknown = {}, []
    for bi, b in enumerate(branches):
        for ni, n in enumerate([c for c in b if local(c.tag) == "Node"]):
            for r in (c for c in n if local(c.tag) == "Restraint"):
                raw = [num(child(r, "DirectionCosine" + a)) for a in "XYZ"]
                direction = unit(raw) if all(x is not None for x in raw) else None
                code = type_code(child(r, "Type"), direction)
                if code is None:
                    unknown.append({"branchOrdinal": bi, "nodeOrdinal": ni, "type": child(r, "Type")})
                    code = 1
                out.setdefault((bi, ni), []).append(support(code, num(child(r, "Stiffness")), num(child(r, "Gap")),
                                                            num(child(r, "Friction")), direction))
    return out, unknown


def xml_node_numbers(xml_bytes: bytes) -> dict:
    root = ET.fromstring(xml_bytes)
    branches = [b for p in root if local(p.tag) == "Pipe" for b in p if local(b.tag) == "Branch"] \
        or [b for b in root if local(b.tag) == "Branch"]
    return {(bi, ni): child(n, "NodeNumber") for bi, b in enumerate(branches)
            for ni, n in enumerate([c for c in b if local(c.tag) == "Node"])}


def cii_supports(cii_text: str) -> dict:
    """CII node (text, as the matcher names it) -> [(support, is step 10's open-end anchor)]."""
    rows = sections_of(cii_text).get("RESTRANT", [])
    out = {}
    for b in range(0, len(rows) - RECORD_LINES + 1, RECORD_LINES):
        c, d = rows[b].split(), rows[b + 1].split()
        node = num(c[0]) if c else None
        if not node:
            continue
        code, stiffness, gap, friction = int(round(num(c[1]))), num(c[2]), num(c[3]), num(c[4])
        direction = unit([num(x) for x in d[:3]]) if len(d) >= 3 else None
        own = code == 1 and stiffness is not None and stiffness >= 0.99 * OPEN_END_STIFFNESS
        key = str(int(node)) if node == int(node) else str(node)
        out.setdefault(key, []).append((support(code, stiffness, gap, friction, direction), own))
    return out


def same_supports(xml: list, cii: list) -> bool:
    """Equal as sets; direction only where the XML gives one."""
    if len(set(xml)) != len(set(cii)):
        return False
    pool = list(set(cii))
    for s in set(xml):
        hit = next((c for c in pool if c[:4] == s[:4] and (s[4] is None or c[4] == s[4])), None)
        if hit is None:
            return False
        pool.remove(hit)
    return True


def describe(s: tuple) -> dict:
    return {"type": s[0], "stiffness": s[1], "gap": s[2], "friction": s[3], "direction": list(s[4]) if s[4] else None}


def support_report(target_bytes: bytes, cii_text: str, match: dict) -> dict:
    """What differs between the CII's supports and the XML's, on the matcher's pairs. Read-only."""
    xml, unknown = xml_supports(target_bytes)
    numbers = xml_node_numbers(target_bytes)
    not_written = sorted(k for k in xml if (num(numbers.get(k)) or 0) <= 0)
    for k in not_written:          # step 10 skips every node numbered 0 or less, with its supports
        xml.pop(k)
    cii = cii_supports(cii_text)
    pairs = {}
    for p in match.get("nodePairs", []):
        pairs.setdefault(str(p["cii"]), []).append((p["xml"]["branchOrdinal"], p["xml"]["nodeOrdinal"]))
    paired_xml = {k for ks in pairs.values() for k in ks}
    crowded_cii = {str(n) for a in match.get("ambiguities", []) for n in a.get("ciiNodes", [])}
    crowded_xml = {(r["branchOrdinal"], r["nodeOrdinal"]) for a in match.get("ambiguities", []) for r in a.get("xmlNodes", [])}
    counts = {"pointsSame": 0, "step10Anchors": 0, "changes": 0, "notWrittenByStep10": len(not_written)}
    changes, refused = [], []
    for node in sorted(set(pairs) | set(cii), key=lambda n: (num(n) is None, num(n) or 0, n)):
        here = cii.get(node, [])
        own = [s for s, o in here if o]
        theirs = [s for s, o in here if not o]
        records = pairs.get(node, [])
        want = sorted({s for k in records for s in xml.get(k, [])}, key=str)
        if own and not want:
            counts["step10Anchors"] += 1
        else:
            theirs += own
        if not records:
            if theirs and node in crowded_cii:
                refused.append({"code": "U2D_SUPPORT_AMBIGUOUS", "ciiNode": node,
                                "detail": "several nodes sit at this support's point; it is not clear which one it belongs to",
                                "supports": [describe(s) for s in theirs]})
            elif theirs:
                refused.append({"code": "U2D_SUPPORT_NEW_NODE", "ciiNode": node,
                                "detail": "this support is on a node the XML does not have",
                                "supports": [describe(s) for s in theirs]})
            continue
        if not want and not theirs:
            continue
        if same_supports(want, theirs):
            counts["pointsSame"] += 1
            continue
        kind = "added" if not want else "removed" if not theirs else "edited"
        changes.append({"ciiNode": node, "kind": kind, "xmlRecords": [list(k) for k in records],
                        "before": [describe(s) for s in want], "after": [describe(s) for s in sorted(set(theirs), key=str)]})
    for k in sorted(set(xml) - paired_xml):
        if k in crowded_xml:
            refused.append({"code": "U2D_SUPPORT_AMBIGUOUS", "xml": list(k),
                            "detail": "several nodes sit at this support's point; it is not clear which one it belongs to"})
        else:
            refused.append({"code": "U2D_SUPPORT_NOT_PAIRED", "xml": list(k),
                            "detail": "this XML support's node has no CII node at its position"})
    for k in not_written:
        refused.append({"code": "U2D_SUPPORT_NOT_IN_CII", "xml": list(k), "nodeNumber": numbers.get(k),
                        "detail": "step 10 does not write supports on a node numbered 0 or less, so CAESAR II never had it"})
    counts["changes"] = len(changes)
    by_kind = {}
    for c in changes:
        by_kind[c["kind"]] = by_kind.get(c["kind"], 0) + 1
    codes = {}
    for r in refused:
        codes[r["code"]] = codes.get(r["code"], 0) + 1
    return {"summary": {**counts, "byKind": by_kind, "refused": codes,
                        "xmlSupports": sum(len(v) for v in xml.values()), "xmlSupportNodes": len(xml),
                        "ciiSupports": sum(len(v) for v in cii.values()), "ciiSupportNodes": len(cii),
                        "unknownXmlTypes": len(unknown)},
            "changes": changes, "refused": refused, "unknownXmlTypes": unknown}
