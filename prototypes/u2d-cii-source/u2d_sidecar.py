"""T2 (Owner 22 Nov 2026, "Yes, build T2"): the CAESAR II transfer by node id, using the CII sidecar that step 10
writes when "Engine reads UXML" is on (3D_Converters xml-cii-uxml-sidecar.js, format xml-cii-sidecar v1, from T1).

The sidecar names, for every CII element in file order, the node id the engine wrote at each end (elements[k]
{from, to, fromId, toId}), and for every id its place in the delivered Enriched XML (at = [branchOrdinal,
nodeOrdinal], the ordinals of u2d_plan.read_target). With it each element end goes to the XML record the engine wrote
it from, instead of a record chosen by position and node number (u2d_plan.record_for), which refuses a point that holds
several records. The position pairs stay as a cross-check only.

Node numbers changed in CAESAR II are followed by element order: CII element k is step 10's element k when the
element counts are equal and the numbers map one to one. Otherwise the sidecar is refused.

Refusals (ValueError; nothing is transferred):
  U2D_SIDECAR_INVALID           not an xml-cii-sidecar v1 with an element list and node places
  U2D_SIDECAR_NO_PLACES         the sidecar has no places in an Enriched XML (step 10 output "CII only", or an Enriched
                                XML that was not written from the document)
  U2D_SIDECAR_OTHER_XML         the sidecar was made for another Enriched XML (sha256 of the file differs)
  U2D_SIDECAR_PLACE_MISMATCH    an id's place in this XML does not hold that id's NodeName and ComponentRefNo
  U2D_SIDECAR_ELEMENT_COUNT     the CII has another number of elements than step 10 wrote
  U2D_SIDECAR_RENUMBER_UNCLEAR  the CII node numbers do not map one to one onto step 10's by element order, or a node
                                taken as renumbered is not at its node id's place by position (elements shifted along a
                                run in CAESAR II: an element deleted at one end and one added elsewhere; T2 review B1)
A sidecar whose content is malformed (a place or number that is not one) is U2D_SIDECAR_INVALID (T2 review N1).
"""
from __future__ import annotations

import hashlib

FORMAT, VERSION = "xml-cii-sidecar", 1


def number_key(value) -> str:
    """A node number as u2d_plan.node_key writes it ("10", not "10.0")."""
    v = float(value)
    return str(int(v)) if v == int(v) else str(value)


def check_header(sidecar: dict, target_bytes: bytes) -> None:
    if not isinstance(sidecar, dict) or sidecar.get("format") != FORMAT or sidecar.get("version") != VERSION \
            or not isinstance(sidecar.get("elements"), list) or not isinstance(sidecar.get("nodes"), list):
        raise ValueError("U2D_SIDECAR_INVALID: this is not a CII sidecar (xml-cii-sidecar v1) from step 10. Nothing was transferred.")
    enriched = sidecar.get("enriched")
    if not isinstance(enriched, dict) or enriched.get("error") or not enriched.get("sha256"):
        why = (enriched or {}).get("error") if isinstance(enriched, dict) else None
        raise ValueError("U2D_SIDECAR_NO_PLACES: the sidecar does not place its node ids in an Enriched XML"
                         + (f" ({why})" if why else " (step 10 wrote only the CII, or the Enriched XML was not written from the document)")
                         + ". Transfer without the sidecar, or run step 10 again with output \"both\". Nothing was transferred.")
    got = hashlib.sha256(target_bytes).hexdigest()
    if enriched["sha256"] != got:
        raise ValueError(f"U2D_SIDECAR_OTHER_XML: the sidecar was made for another Enriched XML ({enriched['sha256'][:12]}, "
                         f"this file is {got[:12]}). Use the sidecar step 10 wrote with this Enriched XML. Nothing was transferred.")


def joined(values) -> str:
    return "|".join(values or [])


def places(sidecar: dict, nodes: dict) -> dict:
    """id -> (branchOrdinal, nodeOrdinal), each checked against the XML record at that place."""
    out, taken = {}, {}
    entries = [i for n in sidecar["nodes"] for i in n.get("ids", [])] + list(sidecar.get("notInCii") or [])
    for i in entries:
        at = i.get("at")
        if not (isinstance(at, list) and len(at) == 2):
            raise ValueError(f"U2D_SIDECAR_INVALID: node id {i.get('id')} has no place in the Enriched XML. Nothing was transferred.")
        k = (int(at[0]), int(at[1]))
        rec = nodes.get(k)
        name = (rec or {}).get("values", {}).get("Node/NodeName") or ""
        if rec is None or k in taken or rec["ref"]["componentRefNo"] != joined(i.get("ComponentRefNo")) or name != joined(i.get("NodeName")):
            raise ValueError(f"U2D_SIDECAR_PLACE_MISMATCH: node id {i.get('id')} is placed at branch {k[0] + 1}, node {k[1] + 1}, "
                             "which does not hold its name and component of this Enriched XML. Nothing was transferred.")
        out[i["id"]], taken[k] = k, i["id"]
    return out


def renumber_map(sidecar: dict, cii: dict) -> dict:
    """CII node number -> step 10's node number, from the element order (one to one, or refused)."""
    els = sidecar["elements"]
    if len(els) != len(cii["elements"]):
        raise ValueError(f"U2D_SIDECAR_ELEMENT_COUNT: the CII has {len(cii['elements'])} elements and step 10 wrote {len(els)}; "
                         "elements were added or removed in CAESAR II, so they cannot be followed by node id. "
                         "Transfer without the sidecar (by position). Nothing was transferred.")
    fwd, back = {}, {}
    for k, (el, s) in enumerate(zip(cii["elements"], els)):
        for i, end in ((0, "from"), (1, "to")):
            c, n = number_key(el["E"][0][i]), number_key(s[end])
            if fwd.setdefault(c, n) != n or back.setdefault(n, c) != c:
                raise ValueError(f"U2D_SIDECAR_RENUMBER_UNCLEAR: CII element {k + 1} ({number_key(el['E'][0][0])}-"
                                 f"{number_key(el['E'][0][1])}) does not follow step 10's numbering ({number_key(s['from'])}-"
                                 f"{number_key(s['to'])}) one to one. Transfer without the sidecar. Nothing was transferred.")
    return fwd


def by_id(sidecar: dict, target_bytes: bytes, cii: dict, nodes: dict, position_pairs: dict) -> dict:
    """The record keys of every CII element end, the pairs they give (CII number -> keys), and the cross-checks."""
    check_header(sidecar, target_bytes)
    try:
        return follow(sidecar, cii, nodes, position_pairs)
    except (TypeError, AttributeError, KeyError, IndexError) as e:
        raise ValueError(f"U2D_SIDECAR_INVALID: the sidecar's content is malformed ({type(e).__name__}: {e}). "
                         "Nothing was transferred.") from e


def confirm_renumbered(moved_ends: list) -> None:
    """A node number changed in CAESAR II is followed only where the position match puts that CII node at its id's
    place. When elements shift along a run (one deleted at a free end, one added elsewhere: the count stays), every
    moved number still maps one to one, but each id would land on the neighbouring node (T2 review B1)."""
    if moved_ends:
        r = moved_ends[0]
        raise ValueError(f"U2D_SIDECAR_RENUMBER_UNCLEAR: {len(moved_ends)} element end(s) at node numbers changed in CAESAR II "
                         f"are not at their node id's place by position (first: CII node {r['ciiNode']}, element {r['element']}, "
                         f"step 10 node {r['step10']}). Elements were probably moved, deleted or added in CAESAR II; transfer "
                         "without the sidecar (by position). Nothing was transferred.")


def follow(sidecar: dict, cii: dict, nodes: dict, position_pairs: dict) -> dict:
    at = places(sidecar, nodes)
    renumber = renumber_map(sidecar, cii)
    ends, pairs, other, unpaired, moved_ends = [], {}, [], [], []
    for k, (el, s) in enumerate(zip(cii["elements"], sidecar["elements"])):
        keys = []
        for i, end in ((0, "fromId"), (1, "toId")):
            if s.get(end) not in at:
                raise ValueError(f"U2D_SIDECAR_INVALID: element {k + 1} names node id {s.get(end)}, which has no place. Nothing was transferred.")
            c, key = number_key(el["E"][0][i]), at[s[end]]
            keys.append(key)
            if key not in pairs.setdefault(c, []):
                pairs[c].append(key)
            seen = position_pairs.get(c)
            row = {"ciiNode": c, "element": k + 1, "id": s[end], "branch": key[0] + 1, "node": key[1] + 1}
            if not seen:
                unpaired.append(row)
            elif key not in seen:
                other.append(row)
            if renumber[c] != c and (not seen or key not in seen):
                moved_ends.append({**row, "step10": renumber[c]})
        ends.append(tuple(keys))
    confirm_renumbered(moved_ends)
    moved = sorted([[c, n] for c, n in renumber.items() if c != n], key=lambda r: float(r[0]))
    return {"ends": ends, "pairs": pairs,
            "report": {"elements": len(ends), "renumbered": moved,
                       "positionCheck": {"ends": 2 * len(ends), "otherPlace": other, "notPairedByPosition": unpaired}}}
