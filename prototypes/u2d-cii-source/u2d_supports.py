"""Supports from CAESAR II, steps 1-2 (Owner 18 Nov 2026: "Supports from CAESAR II: restraints added,
removed or edited in CAESAR II come back onto existing nodes ... supports on new nodes are refused").

Read-only. Compares the supports (CII RESTRANT records) with the XML's <Restraint> entries on the
matcher's node pairs. Step 2: each change names the one XML node it belongs to (ref) and says
before/after in plain words, and the receipt lists them. Step 3 (Owner 18 Nov: "Yes, allow and lock"):
each change also carries `restraints`, the exact <Restraint> edits on that node (keep / edit / remove /
add, with the texts before and after), which section 5 applies and locks (uxml/v2/transfer/TransferStage.js).

Rules, from 3D_Converters' step 10 writer (converters/scripts/xml_to_cii2019.py):
- A CII point takes the supports of every XML record paired to it, without repeats: step 10 merges
  the supports of a dropped or coincident node into the node it keeps (_merge_restraint_specs).
- Step 10 adds its own anchor at an open pipe end (type 1, stiffness OPEN_END_STIFFNESS). It is not a
  support from the model and never counts as one added in CAESAR II.
- The XML type becomes the CAESAR II type code as step 10 writes it (TYPE_CODES, bare axes below).
- A negative XML friction (-1.0101 on BM2's guides) is not a friction; it counts as 0.
- Direction is compared only where the XML gives direction cosines.
- S-fix step 1 (Owner 23 Nov 2026): step 10 also writes supports the XML does not hold on that node (moved from an
  unnumbered node; ANCI and keyword rules). A change at such a node is refused, U2D_SUPPORT_MAY_BE_STEP10, never
  written or locked (step10_may_write).
- S-fix step 3 (Owner 23 Nov 2026): with step 10's CII sidecar listing what it wrote (ciiSupports), the CII's
  supports are compared with those instead (written_report); step 1's refusal stays for a CII without one.
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


def xml_node_refs(xml_bytes: bytes) -> dict:
    """(branchOrdinal, nodeOrdinal) -> the receipt's node ref (as u2d_plan.read_target names nodes)."""
    root = ET.fromstring(xml_bytes)
    branches = [b for p in root if local(p.tag) == "Pipe" for b in p if local(b.tag) == "Branch"] \
        or [b for b in root if local(b.tag) == "Branch"]
    return {(bi, ni): {"branchOrdinal": bi, "branchName": child(b, "Branchname"), "nodeOrdinal": ni,
                       "nodeNumber": child(n, "NodeNumber"), "componentRefNo": child(n, "ComponentRefNo")}
            for bi, b in enumerate(branches) for ni, n in enumerate([c for c in b if local(c.tag) == "Node"])}


RESTRAINT_TAGS = ("Type", "Stiffness", "Gap", "Friction", "DirectionCosineX", "DirectionCosineY", "DirectionCosineZ")
COSINES = RESTRAINT_TAGS[4:]


STEP10_NEAR_MM = 1.0      # step 10's UNNUMBERED_RESTRAINT_TOLERANCE_MM
STEP10_DETAIL = ("step 10 may have written this support itself (moved here from an unnumbered node, or by its own "
                 "rule for this component), so it is not written or locked")


def position(node) -> tuple | None:
    p = [num(x) for x in child(node, "Position").split()]
    return tuple(p) if len(p) == 3 and all(x is not None for x in p) else None


def step10_may_write(xml_bytes: bytes) -> dict:
    """(branchOrdinal, nodeOrdinal) -> "moved" or "rule": numbered nodes where step 10 may write a support that the XML
    does not hold on that node. S-fix step 1 (Owner 23 Nov 2026, "Yes, as suggested"): from the CII alone such a support
    cannot be told from one added in CAESAR II, so support changes at these nodes are refused, never written or locked.

    From 3D_Converters' step 10 (kept a little wider than step 10's own rules, so that a change there stays refused):
    - moved: a node numbered 0 or less with a support. Step 10 puts it on a numbered node of the same branch at that
      point (within 1 mm), or after a bend on the bend's node (_place_unnumbered_restraints). Here: every numbered
      node of that branch within 1 mm of it, and the numbered node just before it.
    - rule: a numbered ANCI node without a support, which step 10 gives its +Y (xml_to_cii2019_direction).
    - ruleOnTop: a numbered ANCI node with its own support. With step 10's switch "use restraint type based on JSON"
      off, step 10 adds its +Y to the XML's support (_merge_spec_maps); the CII and its sidecar do not record the
      switch. support_report refuses a change here only when the CII holds the XML's supports plus exactly that +Y.
    DTXR text is not used (Owner 23 Nov 2026, "just transfer it"): supports at nodes with DTXR text are transferred.
    """
    root = ET.fromstring(xml_bytes)
    branches = [b for p in root if local(p.tag) == "Pipe" for b in p if local(b.tag) == "Branch"] \
        or [b for b in root if local(b.tag) == "Branch"]
    out = {}
    for bi, b in enumerate(branches):
        nodes = [c for c in b if local(c.tag) == "Node"]
        numbered = [ni for ni, n in enumerate(nodes) if (num(child(n, "NodeNumber")) or 0) > 0]
        for ni, n in enumerate(nodes):
            held = any(local(c.tag) == "Restraint" for c in n)
            if ni in numbered:
                if child(n, "ComponentType").upper() == "ANCI":
                    out.setdefault((bi, ni), "ruleOnTop" if held else "rule")
                continue
            if not held:
                continue
            here = position(n)
            near = [k for k in numbered if here and position(nodes[k]) and math.dist(here, position(nodes[k])) <= STEP10_NEAR_MM]
            for k in [k for k in numbered if k < ni][-1:] + near:
                out[(bi, k)] = "moved"
    return out


STEP10_ANCI = support(TYPE_CODES["+Y"], 1.75127e12, 0.0, 0.3, (0.0, 1.0, 0.0))   # step 10's ANCI +Y (default stiffness, friction)


def step10_on_top(xml: list, cii: list) -> bool:
    """True when the CII holds the XML's supports plus exactly step 10's ANCI +Y: what step 10 writes at an ANCI node
    with its own support when its switch "use restraint type based on JSON" is off. Compared without direction."""
    def key(s):
        return s[:4]
    left = [key(s) for s in cii]
    for s in xml:
        if key(s) not in left:
            return False
        left.remove(key(s))
    return left == [key(STEP10_ANCI)]


def xml_restraint_texts(xml_bytes: bytes) -> dict:
    """(branchOrdinal, nodeOrdinal) -> [{tag: text}] for each <Restraint>, in file order (every child tag)."""
    root = ET.fromstring(xml_bytes)
    branches = [b for p in root if local(p.tag) == "Pipe" for b in p if local(b.tag) == "Branch"]         or [b for b in root if local(b.tag) == "Branch"]
    return {(bi, ni): [{local(c.tag): (c.text or "").strip() for c in r} for r in n if local(r.tag) == "Restraint"]
            for bi, b in enumerate(branches) for ni, n in enumerate([c for c in b if local(c.tag) == "Node"])}


def matches(x: tuple, c: tuple) -> bool:
    """An XML support equals a CII one as same_supports compares them."""
    return x[:4] == c[:4] and (x[4] is None or c[4] == x[4])


def restraint_texts(c: tuple, raw: dict, old: dict | None) -> dict:
    """The <Restraint> texts for CII support `c`; a field that already equals CAESAR II keeps its XML text."""
    old = old or {}
    direction = c[4]
    old_dir = unit([num(old.get(k)) for k in COSINES]) if all(num(old.get(k)) is not None for k in COSINES) else None
    out = {}
    if old.get("Type") and type_code(old["Type"], direction) == c[0]:
        out["Type"] = old["Type"]
    elif c[0] in CII_AXIS_CODES.values():
        axis = next(a for a, v in CII_AXIS_CODES.items() if v == c[0])
        out["Type"] = next(x for x, y in PSI116_TO_CII_AXIS.items() if y == axis)
    else:
        out["Type"] = CODE_NAMES[c[0]]
    s = num(old.get("Stiffness"))
    out["Stiffness"] = old["Stiffness"] if s is not None and float(f"{s:.5g}") == c[1] else f"{raw['stiffness']:.6E}"
    g = num(old.get("Gap"))
    out["Gap"] = old["Gap"] if g is not None and round(g, 4) == c[2] else f"{raw['gap']:g}"
    f = num(old.get("Friction"))
    out["Friction"] = old["Friction"] if f is not None and round(f if f >= 0 else 0.0, 4) == c[3] else f"{max(raw['friction'], 0.0):g}"
    if direction is not None:
        same = old_dir is not None and tuple(round(x, 4) for x in old_dir) == direction
        for k, x in zip(COSINES, raw["direction"]):
            out[k] = old[k] if same else f"{x:.9f}"
    for k, v in old.items():           # tags this module does not model stay as they are
        if k not in RESTRAINT_TAGS:
            out[k] = v
    return out


def restraint_ops(xml_list: list, texts: list, after: list) -> list:
    """The <Restraint> edits that turn one XML node's supports into CAESAR II's.

    xml_list[i] is the compared form of the node's i-th <Restraint>, texts[i] its tag texts; after is
    [(support, raw)] from the CII. A restraint already equal to a CII support is kept; the others are
    edited into the remaining CII supports (same type first), removed, or the CII support is added."""
    ops, free, todo = [], list(range(len(xml_list))), []
    for c, raw in after:
        hit = next((i for i in free if matches(xml_list[i], c)), None)
        if hit is None:
            todo.append((c, raw))
        else:
            free.remove(hit)
            ops.append({"op": "keep", "index": hit, "before": texts[hit]})
    for i in [i for i in free if any(matches(xml_list[i], c) for c, _ in after)]:
        free.remove(i)                 # a repeat of a kept support (step 10 merges repeats)
        ops.append({"op": "keep", "index": i, "before": texts[i]})
    for c, raw in todo:
        i = next((i for i in free if xml_list[i][0] == c[0]), free[0] if free else None)
        if i is None:
            ops.append({"op": "add", "after": restraint_texts(c, raw, None)})
        else:
            free.remove(i)
            ops.append({"op": "edit", "index": i, "before": texts[i], "after": restraint_texts(c, raw, texts[i])})
    ops += [{"op": "remove", "index": i, "before": texts[i]} for i in free]
    return sorted(ops, key=lambda o: (o["op"] == "add", o.get("index", 0)))


CODE_NAMES = {**{v: k for k, v in reversed(list(TYPE_CODES.items()))}, **{v: k for k, v in CII_AXIS_CODES.items()}, 1: "ANC"}


def text_of(s: tuple) -> str:
    """One support in plain words: 'GUI, stiffness 1.7513E+12, gap 5, friction 0.3'."""
    words = [CODE_NAMES.get(s[0], f"type {s[0]}"), f"stiffness {s[1]:.5G}"]
    words += [f"gap {s[2]:g}"] if s[2] else []
    words += [f"friction {s[3]:g}"] if s[3] else []
    return ", ".join(words)


def target_of(kind: str, node: str, records: list, xml: dict, refs: dict):
    """The one XML node a change belongs to, or (None, reason). Edited/removed: the node that holds the
    supports at this point; added: the node numbered like the CII node, else the only numbered node there."""
    if kind != "added":
        holders = [k for k in records if xml.get(k)]
        return (holders[0], None) if len(holders) == 1 else (None, "the supports at this point sit on more than one XML node")
    exact = [k for k in records if num(refs[k]["nodeNumber"]) == num(node)]
    numbered = [k for k in records if (num(refs[k]["nodeNumber"]) or 0) > 0]
    pick = exact if len(exact) == 1 else numbered
    return (pick[0], None) if len(pick) == 1 else (None, "several XML nodes at this point could take the new support")


def cii_supports(cii_text: str) -> dict:
    """CII node (text, as the matcher names it) -> [(support, is step 10's open-end anchor, raw values)]."""
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
        raw = {"stiffness": stiffness or 0.0, "gap": gap or 0.0, "friction": friction or 0.0, "direction": direction}
        out.setdefault(key, []).append((support(code, stiffness, gap, friction, direction), own, raw))
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
    refs = xml_node_refs(target_bytes)
    texts = xml_restraint_texts(target_bytes)
    made = step10_may_write(target_bytes)
    not_written = sorted(k for k in xml if (num(refs[k]["nodeNumber"]) or 0) <= 0)
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
        own = [s for s, o, _ in here if o]
        theirs = [s for s, o, _ in here if not o]
        raws = {}
        for s, _, raw in here:
            raws.setdefault(s, raw)
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
                                "supports": [text_of(s) for s in theirs]})
            elif theirs:
                refused.append({"code": "U2D_SUPPORT_NEW_NODE", "ciiNode": node,
                                "detail": "this support is on a node the XML does not have",
                                "supports": [text_of(s) for s in theirs]})
            continue
        if not want and not theirs:
            continue
        if same_supports(want, theirs):
            counts["pointsSame"] += 1
            continue
        kind = "added" if not want else "removed" if not theirs else "edited"
        after = sorted(set(theirs), key=str)
        how = sorted({made[k] for k in records if k in made} - ({"ruleOnTop"} if not step10_on_top(want, after) else set()))
        if how:                       # S-fix step 1: maybe step 10's own support; never written or locked
            refused.append({"code": "U2D_SUPPORT_MAY_BE_STEP10", "ciiNode": node, "kind": kind, "step10": how,
                            "detail": STEP10_DETAIL, "before": [text_of(s) for s in want], "after": [text_of(s) for s in after]})
            continue
        target, why = target_of(kind, node, records, xml, refs)
        if target is None:
            refused.append({"code": "U2D_SUPPORT_TARGET_UNCLEAR", "ciiNode": node, "kind": kind, "detail": why,
                            "before": [text_of(s) for s in want], "after": [text_of(s) for s in after]})
            continue
        changes.append({"ciiNode": node, "kind": kind, "ref": refs[target],
                        "restraintCount": len(texts[target]),
                        "restraints": restraint_ops(xml.get(target, []), texts[target], [(s, raws[s]) for s in after]),
                        "before": [describe(s) for s in want], "after": [describe(s) for s in after],
                        "beforeText": "; ".join(map(text_of, want)) or "none", "afterText": "; ".join(map(text_of, after)) or "none"})
    for k in sorted(set(xml) - paired_xml):
        if k in crowded_xml:
            refused.append({"code": "U2D_SUPPORT_AMBIGUOUS", "ref": refs[k],
                            "detail": "several nodes sit at this support's point; it is not clear which one it belongs to"})
        else:
            refused.append({"code": "U2D_SUPPORT_NOT_PAIRED", "ref": refs[k],
                            "detail": "this XML support's node has no CII node at its position"})
    for k in not_written:
        refused.append({"code": "U2D_SUPPORT_NOT_IN_CII", "ref": refs[k],
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


# S-fix step 3 (Owner 23 Nov 2026, "ok proceed"): with step 10's CII sidecar (3D_Converters PR 443, `ciiSupports`) the
# CII's supports are compared with the supports step 10 wrote at that CII node, each with where it came from, instead of
# with the XML's supports on the position pairs. Then a support step 10 moved or made itself is no longer a change.
WRITTEN_DETAIL = {
    "U2D_SUPPORT_RULE_REMOVED": ("step 10 made this support by its own rule for this component (no support in the XML), "
                                 "and CAESAR II deleted it; the XML cannot say \"no support here\" without changing the "
                                 "Support Mapper rules, so it is not transferred"),
    "U2D_SUPPORT_OPEN_END_REMOVED": ("step 10 writes this anchor at an open pipe end itself, and CAESAR II deleted it; "
                                     "the XML cannot keep that, so it is not transferred"),
    "U2D_SUPPORT_SOURCE_UNKNOWN": "the sidecar does not say where step 10 got this support, so its change is not transferred",
    "U2D_SUPPORT_MERGED_COPY": ("step 10 wrote one support from identical supports on several XML nodes at this point; "
                                "a change cannot be placed on one of them"),
    "U2D_SUPPORT_NOT_ON_NODE": "the XML node step 10 took this support from does not hold it, so the change is not placed",
    "U2D_SUPPORT_TARGET_UNCLEAR": ("the sidecar does not name one XML node for this support (several nodes at this point, "
                                   "or a node id with no place in the XML)"),
    "U2D_SUPPORT_ALREADY_ON_NODE": ("the XML node already holds this support and step 10 writes identical supports at one "
                                    "node once, so a second copy is not written"),
}


def _invalid(what: str) -> ValueError:
    return ValueError(f"U2D_SIDECAR_INVALID: the sidecar's support list (ciiSupports) {what}. Nothing was transferred.")


def _cii_key(value) -> str:
    """A CII node number of the sidecar as one key ("50" for 50 and 50.0); anything else is refused (PR 310 review B2)."""
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise _invalid(f"has a CII node that is not a number ({value!r})")
    try:
        v = float(value)
    except ValueError:
        raise _invalid(f"has a CII node that is not a number ({value!r})") from None
    if not math.isfinite(v):
        raise _invalid(f"has a CII node that is not a number ({value!r})")
    return str(int(v)) if v == int(v) else repr(v)


def written_support(w: dict) -> tuple:
    """The compared form of one support the sidecar lists as step 10 wrote it."""
    cos = w["cosines"]
    if not (isinstance(cos, list) and len(cos) == 3 and all(isinstance(x, (int, float)) and not isinstance(x, bool)
                                                            and math.isfinite(x) for x in cos)):
        raise _invalid(f"has a support whose direction cosines are not 3 numbers ({cos!r})")
    return support(int(w["type"]), float(w["stiffness"]), float(w["gap"]), float(w["friction"]),
                   unit([float(x) for x in w["cosines"]]))


def pair_up(gone: list, new: list) -> tuple[list, list, list]:
    """(edited [(w, c)], removed [w], added [c]): step 10's supports CAESAR II no longer has, and CAESAR II's that step 10
    did not write, paired same type first, then in order (as restraint_ops pairs them)."""
    gone, new, edited = list(gone), list(new), []
    for w in list(gone):
        c = next((c for c in new if c[0][0] == w[0][0]), None)
        if c is not None:
            gone.remove(w)
            new.remove(c)
            edited.append((w, c))
    while gone and new:
        edited.append((gone.pop(0), new.pop(0)))
    return edited, gone, new


def written_report(target_bytes: bytes, cii_text: str, sidecar: dict, ids: dict) -> dict:
    """support_report's result, compared with what step 10 wrote (the sidecar's ciiSupports). Read-only.

    Per CII node (its step 10 number through the element order, u2d_sidecar.renumber_map): CAESAR II's supports against
    step 10's. Equal: no change. Otherwise each support goes to the XML node that keeps it:
    - xml: the node id it was read from; moved: the unnumbered (or dropped) node id it came from, never a second
      support on the numbered node;
    - rule (componentType, keyword) edited: written as a support on its one node id, so the XML then wins over the rule;
      deleted: refused (U2D_SUPPORT_RULE_REMOVED; the Support Mapper rules stay as they are);
    - openEnd edited: CAESAR II's support is added on the node; deleted: refused (U2D_SUPPORT_OPEN_END_REMOVED);
    - added: on the node id step 10 wrote that CII node from (the only one there, or the only one its elements use).
    - a node id that gets a support this way loses step 10's rule there, so the rule supports CAESAR II kept at that CII
      node are written on it too.
    A changed support that step 10 wrote from identical copies on several node ids is refused (U2D_SUPPORT_MERGED_COPY).
    """
    xml, unknown = xml_supports(target_bytes)
    refs = xml_node_refs(target_bytes)
    texts = xml_restraint_texts(target_bytes)
    at, renumber = ids["at"], ids["renumber"]
    id_of = {k: i for i, k in at.items()}
    ids_at, used_at, written = {}, {}, {}
    for n in sidecar["nodes"]:
        ids_at[_cii_key(n["cii"])] = [i["id"] for i in n["ids"]]
    for el in sidecar["elements"]:
        for end in ("from", "to"):
            used_at.setdefault(_cii_key(el[end]), set()).add(el[end + "Id"])
    for b in sidecar["ciiSupports"]:
        key = _cii_key(b["cii"])
        if key in written:
            raise _invalid(f"lists CII node {key} twice")
        if not isinstance(b["written"], list):
            raise _invalid(f"has no list of supports at CII node {key}")
        written[key] = [(written_support(w), w) for w in b["written"]]
    cii = cii_supports(cii_text)
    if not any(written.values()) and any(cii.values()):
        raise _invalid("lists no support, but the CII has supports (step 10 lists every support it writes)")
    step10_of = {c: n for c, n in renumber.items()}
    counts = {"pointsSame": 0, "step10Anchors": 0, "changes": 0, "notWrittenByStep10": 0}
    refused, plans = [], {}

    def refuse(code, c, **more):
        refused.append({"code": code, "ciiNode": c, "detail": WRITTEN_DETAIL.get(code, ""), **more})

    def plan_for(k, c, src):
        p = plans.setdefault(k, {"cii": c, "drop": [], "add": [], "from": set()})
        if p["cii"] != c:
            return None
        p["from"].add(src)
        return p

    def home(w):
        """The XML record that keeps step 10's support w."""
        if w["from"] == "xml":
            return at.get(w.get("id"))
        if w["from"] == "moved":
            return at.get(w.get("fromId"))
        rule_ids = w.get("ids") or []
        return at.get(rule_ids[0]) if len(rule_ids) == 1 else None

    def target_for_added(n):
        here = [i for i in ids_at.get(n, []) if i in at]
        used = [i for i in here if i in used_at.get(n, set())]
        pick = here if len(here) == 1 else used
        return at[pick[0]] if len(pick) == 1 else None

    for c in sorted(set(cii) | set(step10_of), key=lambda x: (num(x) is None, num(x) or 0, x)):
        n = step10_of.get(c)
        if n is None:
            theirs = [s for s, own, _ in cii.get(c, []) if not own]
            if theirs:
                refused.append({"code": "U2D_SUPPORT_NEW_NODE", "ciiNode": c, "detail": "this support is on a node the XML does not have",
                                "supports": [text_of(s) for s in theirs]})
            continue
        mine = list(written.get(_cii_key(n), []))
        pool, new = list(mine), []
        for s, _, raw in cii.get(c, []):
            hit = next((m for m in pool if m[0] == s), None)
            if hit is None:
                new.append((s, raw))
            else:
                pool.remove(hit)
        if not pool and not new:
            if mine:
                counts["pointsSame"] += 1
                counts["step10Anchors"] += sum(1 for _, w in mine if w["from"] == "openEnd")
            continue
        edited, removed, added = pair_up(pool, new)
        for (s, w), (cs, raw) in edited:
            if w["from"] == "openEnd":
                added.append((cs, raw))
            elif w["from"] not in ("xml", "moved", "rule"):
                refuse("U2D_SUPPORT_SOURCE_UNKNOWN", c, before=[text_of(s)], after=[text_of(cs)])
            elif (k := home(w)) is None:
                refuse("U2D_SUPPORT_TARGET_UNCLEAR", c, before=[text_of(s)], after=[text_of(cs)])
            elif (p := plan_for(k, c, w["from"])) is None:
                refuse("U2D_SUPPORT_TARGET_UNCLEAR", c, ref=refs[k], before=[text_of(s)], after=[text_of(cs)])
            else:
                if w["from"] != "rule":       # a rule support is in no XML: CAESAR II's support is added on its node
                    p["drop"].append(s)
                p["add"].append((cs, raw))
        for s, w in removed:
            if w["from"] == "rule":
                refuse("U2D_SUPPORT_RULE_REMOVED", c, before=[text_of(s)])
            elif w["from"] == "openEnd":
                refuse("U2D_SUPPORT_OPEN_END_REMOVED", c, before=[text_of(s)])
            elif w["from"] not in ("xml", "moved"):
                refuse("U2D_SUPPORT_SOURCE_UNKNOWN", c, before=[text_of(s)])
            elif (k := home(w)) is None or (p := plan_for(k, c, w["from"])) is None:
                refuse("U2D_SUPPORT_TARGET_UNCLEAR", c, before=[text_of(s)])
            else:
                p["drop"].append(s)
        for cs, raw in added:
            k = target_for_added(_cii_key(n))
            if k is None or (p := plan_for(k, c, "added")) is None:
                refuse("U2D_SUPPORT_TARGET_UNCLEAR", c, after=[text_of(cs)])
            else:
                p["add"].append((cs, raw))
        # A node id that now gets a support in the XML loses step 10's rule there (the XML wins over the rule), so the
        # rule supports CAESAR II kept unchanged on it are written into the XML too.
        raws = {s: raw for s, _, raw in cii.get(c, [])}
        matched = list(mine)
        for m in pool:
            matched.remove(m)
        for s, w in matched:
            k = home(w) if w["from"] == "rule" else None
            if k is not None and k in plans and plans[k]["cii"] == c and plans[k]["add"]:
                plans[k]["add"].append((s, raws[s]))
                plans[k]["from"].add("rule")
    changes = []
    for k, p in sorted(plans.items()):
        c, n = p["cii"], _cii_key(step10_of[p["cii"]])
        have = list(xml.get(k, []))
        after, why = [(s, None) for s in have], None
        dropped = []
        for s in p["drop"]:
            hits = [i for i, (x, _) in enumerate(after) if matches(x, s)]
            if not hits and any(matches(d, s) for d in dropped):
                continue
            if not hits:
                why = "U2D_SUPPORT_NOT_ON_NODE"
            elif any(i != id_of.get(k) and i in at and any(matches(x, s) for x in xml.get(at[i], [])) for i in ids_at.get(n, [])):
                why = "U2D_SUPPORT_MERGED_COPY"
            else:
                # step 10 writes identical supports on one node once: CAESAR II's change replaces every copy (review B1)
                after = [a for i, a in enumerate(after) if i not in hits]
                dropped.append(s)
                continue
            break
        if why:
            refuse(why, c, ref=refs[k], before=[text_of(s) for s in p["drop"]], after=[text_of(s) for s, _ in p["add"]])
            continue
        for cs, raw in p["add"]:
            if any(matches(x, cs) for x, _ in after):
                refuse("U2D_SUPPORT_ALREADY_ON_NODE", c, ref=refs[k], after=[text_of(cs)])
            else:
                after.append((cs, raw))
        if [x for x, _ in after] == have:
            continue
        want = [s for s, _ in after]
        kind = "added" if not have else "removed" if not want else "edited"
        changes.append({"ciiNode": c, "kind": kind, "ref": refs[k], "restraintCount": len(texts[k]),
                        "restraints": restraint_ops(have, texts[k], after), "step10": sorted(p["from"]),
                        "before": [describe(s) for s in have], "after": [describe(s) for s in want],
                        "beforeText": "; ".join(map(text_of, have)) or "none", "afterText": "; ".join(map(text_of, want)) or "none"})
    # XML supports step 10 did not write: neither listed as read from their node, nor equal to one step 10 wrote at the
    # CII node of that node id (step 10 writes identical supports at one point once).
    kept, merged = {}, {}
    for b in sidecar["ciiSupports"]:
        for w in b["written"]:
            uid = w.get("id") if w["from"] == "xml" else w.get("fromId") if w["from"] == "moved" else None
            if uid in at:
                kept.setdefault(at[uid], []).append(written_support(w))
    for n, sup in written.items():
        for i in ids_at.get(n, []):
            if i in at:
                merged.setdefault(at[i], []).extend(s for s, _ in sup)
    for k, sup in sorted(xml.items()):
        left = list(kept.get(k, []))
        for s in sup:
            hit = next((x for x in left if matches(s, x)), None)
            if hit is not None:
                left.remove(hit)
            elif not any(matches(s, x) for x in merged.get(k, [])):
                counts["notWrittenByStep10"] += 1
                refused.append({"code": "U2D_SUPPORT_NOT_IN_CII", "ref": refs[k],
                                "detail": "step 10 did not write this support (its sidecar does not list it), so CAESAR II never had it"})
    counts["changes"] = len(changes)
    by_kind, codes = {}, {}
    for ch in changes:
        by_kind[ch["kind"]] = by_kind.get(ch["kind"], 0) + 1
    for r in refused:
        codes[r["code"]] = codes.get(r["code"], 0) + 1
    return {"summary": {**counts, "byKind": by_kind, "refused": codes, "comparedWith": "step10",
                        "xmlSupports": sum(len(v) for v in xml.values()), "xmlSupportNodes": len(xml),
                        "ciiSupports": sum(len(v) for v in cii.values()), "ciiSupportNodes": len(cii),
                        "unknownXmlTypes": len(unknown)},
            "changes": changes, "refused": refused, "unknownXmlTypes": unknown}
