"""S-fix step 3 (Owner 23 Nov 2026, "ok proceed"): with step 10's CII sidecar listing the supports it wrote
(3D_Converters PR 443, `ciiSupports`), CAESAR II's supports are compared with those, not with the XML's on the
position pairs.

Inputs: fixtures/uxml-v2-transfer/{EF05,BM2}-on (step 10 with "Engine reads UXML" on; the sidecars carry ciiSupports,
3D_Converters main 33e2c350). CAESAR II edits are scripted on step10.cii's RESTRANT records. Checks (S-fix plan):
- untouched, with the sidecar: no support change and no listed support refusal (EF-05 none at all; BM2 counts its 2 XML
  supports on nodes step 10 does not write, as today);
- EF-05 node 800 (a support step 10 moved from an unnumbered node) friction 0.3 -> 0.2: one edit on the unnumbered node,
  none on node 800;
- BM2 node 120 (step 10's ANCI +Y, in no XML) edited: one support written on its ANCI node; deleted: refused, nothing
  written; a support added there: written with the +Y, which the XML then has to hold;
- an XML support edited or added: on its own node;
- a sidecar without the list keeps step 1's refusals; a malformed list, a place that is not a number and a sha256 that
  is not text are refused (U2D_SIDECAR_INVALID; T2 review K12).
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
from test_u2d_supports import ROOT, match_for  # noqa: E402
from u2d_plan import plan  # noqa: E402
from u2d_supports import (branch_nodes, child, step10_absorbed, step10_bare, step10_placeholders,  # noqa: E402
                          step10_written, step10_zero_info)

FIX = ROOT / "fixtures" / "uxml-v2-transfer"


def load(model: str) -> tuple[bytes, str, dict]:
    d = FIX / f"{model}-on"
    return ((d / "enriched.xml").read_bytes(), (d / "step10.cii").read_text(encoding="utf-8"),
            json.loads((d / "step10.cii.sidecar.json").read_text(encoding="utf-8")))


def slot_line(lines: list, node: float, slot: int = 0) -> int:
    """Index of RESTRANT slot `slot` (0-5) of the block whose first slot is at `node` (24 lines a block)."""
    at = lines.index("#$ RESTRANT")
    for i in range(at + 1, len(lines), 24):
        f = lines[i].split()
        if f and float(f[0]) == node:
            return i + 4 * slot
    raise KeyError(node)


def field(line: str, k: int, text: str) -> str:
    """The k-th value of a RESTRANT line replaced (2 leading spaces, then values 13 wide)."""
    assert len(text) == 13, text
    return line[:2 + 13 * k] + text + line[2 + 13 * (k + 1):]


def edited(cii: str, node: float, *, friction=None, delete=False, add=None) -> str:
    """step10.cii with one RESTRANT edit at `node`: its first support's friction, the support deleted, or a support
    added in slot 2 (add = (type code, cosines))."""
    nl = "\r\n" if "\r\n" in cii else "\n"
    lines = cii.split(nl)
    i = slot_line(lines, node)
    if friction is not None:
        lines[i] = field(lines[i], 4, f"{friction:13.6f}")
    if delete:
        lines[i] = field(lines[i], 0, f"{0:13.6f}")
    if add:
        j = slot_line(lines, node, 1)
        line = field(field(field(lines[i], 0, f"{node:13.3f}"), 1, f"{add[0]:13.4f}"), 4, f"{0.0:13.6f}")
        lines[j], lines[j + 1] = line, "  " + "".join(f"{c:13.6f}" for c in add[1])
    out = nl.join(lines)
    assert out != cii
    return out


def edited_and_copied(cii: str, node: float, written: dict, friction: float) -> str:
    """step10.cii with node's first support at `friction` and an identical copy added in slot 2 (`written` is the
    support step 10 wrote there, as the sidecar lists it)."""
    two = edited(edited(cii, node, friction=friction), node, add=(written["type"], tuple(written["cosines"])))
    nl = "\r\n" if "\r\n" in two else "\n"
    lines = two.split(nl)
    j = slot_line(lines, node, 1)
    lines[j] = field(lines[j], 4, f"{friction:13.6f}")
    return nl.join(lines)


@unittest.skipUnless(shutil.which("node"), "node missing: NOT_RUN")
class SupportsByStep10(unittest.TestCase):
    MODEL = "EF05"

    @classmethod
    def setUpClass(cls):
        cls.xml, cls.cii, cls.sidecar = load(cls.MODEL)
        cls.match = match_for(FIX / f"{cls.MODEL}-on" / "enriched.xml", cls.cii)

    def supports(self, cii=None, sidecar="same") -> dict:
        cii = cii or self.cii
        match = self.match if cii == self.cii else match_for(FIX / f"{self.MODEL}-on" / "enriched.xml", cii)
        return plan(self.xml, cii, match, 10.0, sidecar=self.sidecar if sidecar == "same" else sidecar)["supports"]

    def summary(self, cii=None, sidecar="same") -> dict:
        cii = cii or self.cii
        match = self.match if cii == self.cii else match_for(FIX / f"{self.MODEL}-on" / "enriched.xml", cii)
        return plan(self.xml, cii, match, 10.0, sidecar=self.sidecar if sidecar == "same" else sidecar)["summary"]["supports"]

    def listed_refusals(self, s: dict) -> list:
        return [r for r in s["refused"] if r["code"] != "U2D_SUPPORT_NOT_IN_CII"]

    def test_untouched_gives_no_support_change_and_no_listed_refusal(self):
        s = self.supports()
        self.assertEqual(s["changes"], [])
        self.assertEqual(self.listed_refusals(s), [])
        summary = self.summary()
        self.assertEqual(summary["comparedWith"], "step10")
        self.assertEqual(summary["pointsSame"], len(self.sidecar["ciiSupports"]))
        print(f"\n{self.MODEL} untouched with the sidecar: {json.dumps(summary['refused'])}; "
              f"without: {json.dumps(self.summary(sidecar=None)['refused'])}")

    def test_without_the_list_step_1_still_refuses(self):
        old = {k: v for k, v in self.sidecar.items() if k != "ciiSupports"}
        for side in (None, old):
            s = self.summary(sidecar=side)
            self.assertNotIn("comparedWith", s)
            self.assertGreater(s["refused"].get("U2D_SUPPORT_MAY_BE_STEP10", 0), 0, s)

    def test_a_malformed_list_or_sidecar_is_refused_not_a_crash(self):
        bad_list = {**self.sidecar, "ciiSupports": {"a": 1}}
        bad_entry = json.loads(json.dumps(self.sidecar))
        del bad_entry["ciiSupports"][0]["written"][0]["type"]
        bad_at = json.loads(json.dumps(self.sidecar))
        bad_at["nodes"][0]["ids"][0]["at"] = ["a", 0]        # T2 review K12
        bad_sha = json.loads(json.dumps(self.sidecar))
        bad_sha["enriched"]["sha256"] = 12345                # T2 review K12
        sides = [bad_list, bad_entry, bad_at, bad_sha]
        # PR 310 review B2: a node key that is not one number, a node listed twice, bad cosines, an empty list
        for change in (lambda b: b[0].update(cii=None), lambda b: b[0].update(cii=True), lambda b: b[0].update(cii="x"),
                       lambda b: b.append({"cii": b[0]["cii"], "written": []}), lambda b: b[0].update(written={}),
                       lambda b: b[0]["written"][0].update(cosines=["a", 0, 1]),
                       lambda b: b[0]["written"][0].update(cosines=[0, 1]), lambda b: b.clear()):
            side = json.loads(json.dumps(self.sidecar))
            change(side["ciiSupports"])
            sides.append(side)
        for side in sides:
            with self.assertRaisesRegex(ValueError, "^U2D_SIDECAR_INVALID"):
                self.supports(sidecar=side)

    def test_a_node_number_written_as_a_decimal_is_the_same_node(self):
        side = json.loads(json.dumps(self.sidecar))
        for b in side["ciiSupports"]:
            b["cii"] = float(b["cii"])
        s = self.supports(sidecar=side)
        self.assertEqual(s["changes"], [])
        self.assertEqual(self.listed_refusals(s), [])

    def test_an_open_end_anchor_deleted_in_caesar_ii_is_refused(self):
        node = next(b["cii"] for b in self.sidecar["ciiSupports"] if [w["from"] for w in b["written"]] == ["openEnd"])
        s = self.supports(edited(self.cii, node, delete=True))
        self.assertEqual(s["changes"], [])
        self.assertEqual([(r["code"], r["ciiNode"]) for r in self.listed_refusals(s)], [("U2D_SUPPORT_OPEN_END_REMOVED", str(node))])


class SupportsByStep10Ef05(SupportsByStep10):
    MODEL = "EF05"

    def test_untouched_ef05_refuses_nothing_at_all(self):
        self.assertEqual(self.supports()["refused"], [])

    def test_a_moved_support_edited_goes_to_its_unnumbered_node(self):
        s = self.supports(edited(self.cii, 800, friction=0.2))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual(len(s["changes"]), 1, s["changes"])
        c = s["changes"][0]
        self.assertEqual((c["ciiNode"], c["kind"], c["step10"]), ("800", "edited", ["moved"]))
        self.assertLessEqual(float(c["ref"]["nodeNumber"]), 0, c["ref"])
        w = next(w for b in self.sidecar["ciiSupports"] if b["cii"] == 800 for w in b["written"])
        at = next(i["at"] for n in self.sidecar["nodes"] + [{"ids": self.sidecar["notInCii"]}] for i in n["ids"] if i["id"] == w["fromId"])
        self.assertEqual([c["ref"]["branchOrdinal"], c["ref"]["nodeOrdinal"]], at, "the node the sidecar names")
        ops = [o for o in c["restraints"] if o["op"] != "keep"]
        self.assertEqual([(o["op"], o["before"].get("Friction"), o["after"].get("Friction")) for o in ops], [("edit", "0.3", "0.2")])


    def xml_support_node(self):
        """The first CII node step 10 wrote one support at, read from one XML record (in EF-05 every such record is an
        ATTA)."""
        return next(b for b in self.sidecar["ciiSupports"] if [w["from"] for w in b["written"]] == ["xml"])

    def test_a_moved_support_edited_and_copied_is_edited_on_its_source_with_a_row(self):
        """Step 3h: CAESAR II edits node 800's moved support and adds an identical copy. The edit goes to the unnumbered
        source. Step 10 merges identical supports of the source and node 800 into one (25 Nov round trip r2), so the
        copy is not written on node 800; a row says it is written once."""
        w = next(w for b in self.sidecar["ciiSupports"] if b["cii"] == 800 for w in b["written"])
        cii = edited_and_copied(self.cii, 800, w, 0.2)
        s = self.supports(cii)
        self.assertEqual([(r["code"], r["ciiNode"], r["after"]) for r in self.listed_refusals(s)],
                         [("U2D_SUPPORT_COPIES_WRITTEN_ONCE", "800", ["+Y, stiffness 1.7513E+12, friction 0.2"])])
        self.assertEqual([(c["kind"], float(c["ref"]["nodeNumber"]) > 0, c["afterText"]) for c in s["changes"]],
                         [("edited", False, "+Y, stiffness 1.7513E+12, friction 0.2")])
        self.assertEqual(self.summary(cii)["refused"], {"U2D_SUPPORT_COPIES_WRITTEN_ONCE": 1})

    def test_an_xml_support_deleted_is_removed_from_its_own_node(self):
        """An XML support of a record that is no ATTA, deleted in CAESAR II, is removed from that record. EF-05 has no
        such support, so: the BRAN [8,0] at CII node 3150 gets a +Y. Real step 10 (3D_Converters 33e2c350, 26 Nov run
        k3) wrote that +Y at 3150 in place of the open-end anchor and listed it from [8,0]; this is that input. 3150 is
        an open pipe end, so after this delete step 10 writes its open-end anchor there again (as on main; PR 321
        review point 4): this test checks the write to the XML, not a full round trip."""
        text = self.xml.decode("utf-8")
        nl = "\r\n" if "\r\n" in text else "\n"
        branch = [m.start() for m in re.finditer("<Branch>", text)][8]
        end = text.index("</Node>", text.index("<Node>", branch))
        text = text[:end] + nl.join(["<Restraint>", "<Type>+Y</Type>", "<Stiffness>1751270000000</Stiffness>",
                                     "<Gap>0</Gap>", "<Friction>0.3</Friction>", "</Restraint>"]) + nl + text[end:]
        xml = text.encode("utf-8")
        self.assertEqual(child(branch_nodes(xml)[8][0], "ComponentType").upper(), "BRAN")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        first = next(i["id"] for n in side["nodes"] if n["cii"] == 3150 for i in n["ids"] if i["at"] == [8, 0])
        for b in side["ciiSupports"]:
            if b["cii"] == 3150:
                b["written"] = [{"type": 14, "stiffness": 1751270000000, "gap": 0, "friction": 0.3,
                                 "cosines": [0, 1, 0], "from": "xml", "support": "u:test-3150", "id": first}]
        nl = "\r\n" if "\r\n" in self.cii else "\n"
        rows = self.cii.split(nl)
        k = slot_line(rows, 3150)
        rows[k] = field(field(field(rows[k], 1, f"{14:13.4f}"), 2, f"{1.75127e12:13.6E}"), 4, f"{0.3:13.6f}")
        rows[k + 1] = "  " + "".join(f"{c:13.6f}" for c in (0.0, 1.0, 0.0))
        one = nl.join(rows)
        self.assertEqual(self.plan_rows(xml, side, one), ([], []))
        changes, refused = self.plan_rows(xml, side, edited(one, 3150, delete=True))
        self.assertEqual((changes, refused), ([("3150", "removed", "none")], []))

    def test_the_last_support_of_an_atta_deleted_is_refused(self):
        """S-fix 3k (PR 320 review N1): step 10 gives every ATTA without a support its default rest support
        (atta-default-restraint-closure.js). Real round trips: main's delete at node 780 (an ATTA's own +Y) and the
        delete at 800 (a +Y step 10 moves there from an ATTA) both came back. So deleting an ATTA's last support is
        refused, and nothing is written; an edit of it is still written."""
        b = self.xml_support_node()
        at = next(i["at"] for n in self.sidecar["nodes"] for i in n["ids"] if i["id"] == b["written"][0]["id"])
        self.assertEqual(child(branch_nodes(self.xml)[at[0]][at[1]], "ComponentType").upper(), "ATTA")
        for node in (b["cii"], 800):
            s = self.supports(edited(self.cii, node, delete=True))
            self.assertEqual(s["changes"], [], node)
            rows = self.listed_refusals(s)
            self.assertEqual([(r["code"], r["ciiNode"]) for r in rows], [("U2D_SUPPORT_ATTA_DEFAULT", str(node))])
        self.assertEqual(len(self.supports(edited(self.cii, b["cii"], friction=0.2))["changes"]), 1)

    def test_identical_supports_on_two_ids_at_one_point_are_refused(self):
        """S-fix 3j round 1 (review N2, mutant K2): CII node 10 is two XML records ([0,0] and [1,35]) at one point.
        Given the same Y, real step 10 (v10, 3D_Converters 33e2c350) wrote one Y at 10 and listed it from one of them;
        this is that input (the CII slot for node 10 is the real run's, here in a free slot of node 50's block).
        Untouched: no row. A change of that Y is refused: written on one record, step 10 brings the other's back."""
        text = self.xml.decode("utf-8")
        nl = "\r\n" if "\r\n" in text else "\n"
        restraint = nl.join(["<Restraint>", "<Type>Y</Type>", "<Stiffness>0</Stiffness>", "<Gap>0</Gap>",
                             "<Friction>0.3</Friction>", "<DirectionCosineX>0.000000000</DirectionCosineX>",
                             "<DirectionCosineY>1.000000000</DirectionCosineY>",
                             "<DirectionCosineZ>0.000000000</DirectionCosineZ>", "</Restraint>"]) + nl
        branches = [m.start() for m in re.finditer("<Branch>", text)]
        starts = {bi: [m.start() + branches[bi] for m in re.finditer("<Node>", text[branches[bi]:])] for bi in (0, 1)}
        ends = [text.index("</Node>", starts[bi][ni]) for bi, ni in ((0, 0), (1, 35))]
        for end in sorted(ends, reverse=True):
            text = text[:end] + restraint + text[end:]
        xml = text.encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        first = next(i["id"] for n in side["nodes"] if n["cii"] == 10 for i in n["ids"] if i["at"] == [0, 0])
        side["ciiSupports"].append({"cii": 10, "written": [{"type": 3, "stiffness": 0, "gap": 0, "friction": 0.3,
                                    "cosines": [0, 1, 0], "from": "xml", "support": "u:test-10", "id": first}]})
        nl = "\r\n" if "\r\n" in self.cii else "\n"
        rows = self.cii.split(nl)
        j = slot_line(rows, 50, 1)
        rows[j] = "  " + "".join(f"{v:13.6f}" for v in (10, 3, 0, 0, 0.3, 0))
        rows[j + 1] = "  " + "".join(f"{c:13.6f}" for c in (0.0, 1.0, 0.0))

        def at10(friction=0.3, node=10):
            out = list(rows)
            out[j] = field(field(out[j], 4, f"{friction:13.6f}"), 0, f"{node:13.6f}")
            return nl.join(out)
        self.assertEqual(self.plan_rows(xml, side, at10()), ([], []))
        for cii in (at10(friction=0.2), at10(node=0)):
            self.assertEqual(self.plan_rows(xml, side, cii), ([], [("U2D_SUPPORT_MERGED_COPY", "10")]))

    def test_a_listed_moved_copy_does_not_block_an_edit_of_the_other_copy(self):
        """S-fix 3j (mutant I3 survived PR 319): node 800 holds a +Y without cosines and step 10 moves the ATTA's +Y
        onto it. Real step 10 (v9, 3D_Converters 33e2c350) wrote 2 +Y at 800 and listed both (`from: xml`, `from:
        moved`); this is that input (the CII has the two at node 800). Both are listed, so CAESAR II's change of one
        copy is written, not refused as a merged copy."""
        w = next(w for b in self.sidecar["ciiSupports"] if b["cii"] == 800 for w in b["written"])
        node = next(i for n in self.sidecar["nodes"] if n["cii"] == 800 for i in n["ids"])
        text = self.xml.decode("utf-8")
        nl = "\r\n" if "\r\n" in text else "\n"
        end = text.index("</Node>", text.index("<NodeNumber>800</NodeNumber>"))
        restraint = nl.join(["<Restraint>", "<Type>+Y</Type>", "<Stiffness>1751270000000</Stiffness>", "<Gap>0</Gap>",
                             "<Friction>0.3</Friction>", "</Restraint>"]) + nl
        xml = (text[:end] + restraint + text[end:]).encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        for b in side["ciiSupports"]:
            if b["cii"] == 800:
                own = {k: v for k, v in w.items() if k not in ("fromId", "support")}
                b["written"] = [{**own, "from": "xml", "support": "u:test-800", "id": node["id"]}, w]
        two = edited(self.cii, 800, add=(14, (0.0, 1.0, 0.0)))
        nl = "\r\n" if "\r\n" in two else "\n"
        rows = two.split(nl)
        j = slot_line(rows, 800, 1)
        rows[j] = field(rows[j], 4, f"{0.3:13.6f}")
        two = nl.join(rows)
        self.assertEqual(self.plan_rows(xml, side, two), ([], []))
        changes, refused = self.plan_rows(xml, side, edited(two, 800, friction=0.2))
        self.assertEqual(refused, [])
        self.assertEqual([c[2] for c in changes], ["+Y, stiffness 1.7513E+12, friction 0.2"])

    def test_a_moved_support_merged_into_the_same_support_on_its_node_is_refused(self):
        """S-fix 3i (PR 317 review N1): node 800 holds the same +Y as the unnumbered node step 10 moves onto it. Real
        step 10 (3D_Converters 33e2c350, 25 Nov) then wrote one +Y at 800, the same CII, and a sidecar listing only
        `from: xml` on node 800; this is that input. A change at 800 is refused: written on 800 alone, step 10 brings
        the moved +Y back (2 supports where CAESAR II has 1). Untouched, the moved node is not reported NOT_IN_CII."""
        w = next(w for b in self.sidecar["ciiSupports"] if b["cii"] == 800 for w in b["written"])
        source = next(i for n in self.sidecar["nodes"] + [{"ids": self.sidecar["notInCii"]}]
                      for i in n["ids"] if i["id"] == w["fromId"])
        node = next(i for n in self.sidecar["nodes"] if n["cii"] == 800 for i in n["ids"])
        text = self.xml.decode("utf-8")
        start = text.index("<NodeNumber>800</NodeNumber>")
        end = text.index("</Node>", start)
        moved = text.index("<Restraint>", text.index(source["ComponentRefNo"][0] + "<"))
        restraint = text[moved:text.index("</Restraint>", moved) + len("</Restraint>")]
        xml = (text[:end] + restraint + "\n" + text[end:]).encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        for b in side["ciiSupports"]:
            if b["cii"] == 800:
                b["written"] = [{**{k: v for k, v in w.items() if k != "fromId"}, "from": "xml", "id": node["id"]}]
        for cii in (self.cii, edited(self.cii, 800, friction=0.2), edited(self.cii, 800, delete=True)):
            match = self.match if cii == self.cii else match_for(FIX / "EF05-on" / "enriched.xml", cii)
            s = plan(xml, cii, match, 10.0, sidecar=side)["supports"]
            self.assertEqual(s["changes"], [])
            refused = [(r["code"], r.get("ciiNode")) for r in s["refused"]]
            self.assertEqual(refused, [] if cii == self.cii else [("U2D_SUPPORT_MERGED_COPY", "800")])

    def with_own_support(self, cii_nodes: tuple, move: tuple | None = None) -> tuple:
        """(xml, sidecar): the EF-05 fixture with the numbered nodes `cii_nodes` given the +Y that step 10 moves onto
        them (the moved node's restraint text), and `move` = (ComponentRefNo, new Position) of a node moved. The
        sidecar lists each of those supports `from: xml` on its numbered node, as real step 10 wrote these cases."""
        text = self.xml.decode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        refs = {i["id"]: i for n in side["nodes"] + [{"ids": side["notInCii"]}] for i in n["ids"]}
        for c in cii_nodes:
            entry = next(b for b in side["ciiSupports"] if b["cii"] == c)
            w = entry["written"][0]
            source = refs[w["fromId"]]["ComponentRefNo"][0]
            moved = text.index("<Restraint>", text.index(source + "<"))
            restraint = text[moved:text.index("</Restraint>", moved) + len("</Restraint>")]
            end = text.index("</Node>", text.index(f"<NodeNumber>{c}</NodeNumber>"))
            text = text[:end] + restraint + "\n" + text[end:]
            node = next(i for n in side["nodes"] if n["cii"] == c for i in n["ids"])
            entry["written"] = [{**{k: v for k, v in w.items() if k != "fromId"}, "from": "xml", "id": node["id"]}]
        if move:
            at = text.index(move[0] + "<")
            text = text[:at] + re.sub("<Position>[^<]*</Position>", f"<Position>{move[1]}</Position>", text[at:], 1)
        xml = text.encode("utf-8")
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        return xml, side

    def test_a_moved_support_on_a_node_step_10_contracts_away_is_refused(self):
        """PR 319 review round 2 B1 (m7): nodes 800 and 910 hold the +Y step 10 moves onto them, and ATTA 121152
        sits 3 mm on, at node 930, which step 10 contracts into 910 (a span of 6 mm or less). Step 10 writes one +Y
        at 910 and does not list the ATTA's. A change at 910 is refused (written on 910 alone, step 10 brings the
        ATTA's +Y back: real round trip rt7, 2 +Y where CAESAR II has 1); untouched, no row."""
        xml, side = self.with_own_support((800, 910), ("=1006649732/121152", "444665.15 -1472771.40 102707.15"))
        self.assertEqual(self.plan_rows(xml, side, self.cii), ([], []))
        for cii in (edited(self.cii, 910, friction=0.2), edited(self.cii, 910, delete=True)):
            self.assertEqual(self.plan_rows(xml, side, cii), ([], [("U2D_SUPPORT_MERGED_COPY", "910")]))

    def with_atta(self, index: int, position: str, ref: str, moved_from_new: bool) -> tuple:
        """(xml, sidecar): the EF-05 fixture with an unnumbered ATTA (+Y, like the fixture's ATTA at node 800's bend
        end) put in branch 3 (ordinal 2) at node ordinal `index`, the later places shifted, and its id listed under
        notInCii. moved_from_new: node 800's support is listed as moved from the new ATTA (else as before). This is
        how real step 10 (3D_Converters 33e2c350, PR 319 review, m4 and m5) wrote these cases; the CII is unchanged."""
        text = self.xml.decode("utf-8")
        branch = [m.start() for m in re.finditer("<Branch>", text)][2]
        nodes = [m.start() for m in re.finditer("<Node>", text[branch:])]
        atta = text[text.rindex("<Node>", 0, text.index("=1006649732/121138<")):]
        atta = atta[:atta.index("</Node>")] + "</Node>" + ("\r\n" if "\r\n" in text else "\n")
        node = re.sub("<Position>[^<]*</Position>", f"<Position>{position}</Position>",
                      atta.replace("=1006649732/121138<", ref + "<"))
        cut = branch + nodes[index]
        xml = (text[:cut] + node + text[cut:]).encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        for i in [i for n in side["nodes"] for i in n["ids"]] + side["notInCii"]:
            if i["at"][0] == 2 and i["at"][1] >= index:
                i["at"][1] += 1
        branch_name = next(i["branch"] for i in side["notInCii"] if i["at"][0] == 2)
        side["notInCii"].append({"id": "u:test-atta", "branch": branch_name, "NodeName": [], "ComponentRefNo": [ref],
                                 "at": [2, index], "nodeNumber": "-2"})
        if moved_from_new:
            for b in side["ciiSupports"]:
                if b["cii"] == 800:
                    b["written"] = [{**w, "fromId": "u:test-atta"} for w in b["written"]]
        return xml, side

    def plan_rows(self, xml: bytes, side: dict, cii: str) -> tuple:
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "enriched.xml").write_bytes(xml)
            match = match_for(Path(d) / "enriched.xml", cii)
        s = plan(xml, cii, match, 10.0, sidecar=side)["supports"]
        return ([(c["ciiNode"], c["kind"], c["afterText"]) for c in s["changes"]],
                [(r["code"], r.get("ciiNode")) for r in s["refused"]])

    def test_two_moved_supports_merged_into_one_are_refused(self):
        """PR 319 review B1 (m4): a second ATTA at node 800's own point. Step 10 puts both +Y on 800, writes one and
        lists it as moved from the ATTA at that point. A change at 800 is refused (written on one ATTA, step 10 would
        bring the other back); untouched, no row."""
        xml, side = self.with_atta(15, "444665.15 -1470651.70 100607.15", "=1006649732/129997", True)
        self.assertEqual(self.plan_rows(xml, side, self.cii), ([], []))
        for cii in (edited(self.cii, 800, friction=0.2), edited(self.cii, 800, delete=True)):
            self.assertEqual(self.plan_rows(xml, side, cii), ([], [("U2D_SUPPORT_MERGED_COPY", "800")]))

    def test_an_unnumbered_support_step_10_does_not_write_stays_not_in_cii(self):
        """PR 319 review B2 (m5): a second ATTA on the straight after the bend. Step 10 writes it nowhere ("no
        numbered node at that point"), so it is NOT_IN_CII, and node 800's own moved support is edited as before."""
        xml, side = self.with_atta(18, "444665.15 -1470651.70 101500.00", "=1006649732/129998", False)
        self.assertEqual(self.plan_rows(xml, side, self.cii), ([], [("U2D_SUPPORT_NOT_IN_CII", None)]))
        changes, refused = self.plan_rows(xml, side, edited(self.cii, 800, friction=0.2))
        self.assertEqual((changes, refused), ([("800", "edited", "+Y, stiffness 1.7513E+12, friction 0.2")],
                                              [("U2D_SUPPORT_NOT_IN_CII", None)]))

    def test_an_open_end_anchor_edited_is_added_on_its_node(self):
        node = next(b["cii"] for b in self.sidecar["ciiSupports"] if [w["from"] for w in b["written"]] == ["openEnd"])
        s = self.supports(edited(self.cii, node, friction=0.2))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([(c["ciiNode"], c["kind"], c["step10"]) for c in s["changes"]], [(str(node), "added", ["added"])])
        self.assertEqual([a["type"] for a in s["changes"][0]["after"]], [1])

    def test_a_sidecar_listing_fewer_copies_than_the_xml_node_holds_is_refused(self):
        """PR 310 review B1, step 3h: the XML node holds a support twice but the sidecar lists it once. Real step 10
        lists both copies, so the sidecar does not give the copies one by one: a change there is refused, not
        guessed."""
        b = self.xml_support_node()
        text = self.xml.decode("utf-8")
        i = text.index(f"<NodeNumber>{b['cii']}</NodeNumber>")
        start = text.index("<Restraint", i)
        end = text.index("</Restraint>", start) + len("</Restraint>")
        xml2 = (text[:end] + "\n" + text[start:end] + text[end:]).encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml2).hexdigest()
        run = lambda cii: plan(xml2, cii, self.match, 10.0, sidecar=side)["supports"]
        for cii in (edited(self.cii, b["cii"], friction=0.1), edited(self.cii, b["cii"], delete=True)):
            s = run(cii)
            self.assertEqual(s["changes"], [])
            self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_COPIES_NOT_LISTED"])

    def test_a_support_added_in_caesar_ii_identical_to_the_xml_nodes_is_written_as_a_copy(self):
        """Step 3h: step 10 writes both copies of one XML node (25 Nov check), so CAESAR II's second copy is written."""
        b = self.xml_support_node()
        w = b["written"][0]
        cii = edited(self.cii, b["cii"], add=(w["type"], tuple(w["cosines"])))
        nl = "\r\n" if "\r\n" in cii else "\n"
        lines = cii.split(nl)
        j = slot_line(lines, b["cii"], 1)
        lines[j] = field(lines[j], 4, f"{w['friction']:13.6f}")      # the copy equals the XML's support
        s = self.supports(nl.join(lines))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([(c["kind"], [o["op"] for o in c["restraints"]]) for c in s["changes"]],
                         [("edited", ["keep", "add"])])

    # PR 311 review round 2 ------------------------------------------------------------------------------------------
    def atta780_with_lim(self, attrs: str = "") -> tuple:
        """EF-05 with ATTA 780 [2,13] holding its +Y and a LIM with stiffness and gap 0 (attributes `attrs`); its
        sidecar re-hashed and listing both from the XML; CAESAR II's 780 with both, as step 10 wrote them (real run L1,
        PR 321 review point 1: +Y in slot 0, LIM type 9 stiffness 0 friction 0.3 cosines 0 0 1 in slot 1)."""
        text = self.xml.decode("utf-8")
        nl = "\r\n" if "\r\n" in text else "\n"
        node = text.index("<NodeNumber>780</NodeNumber>")
        end = text.index("</Restraint>", node) + len("</Restraint>")
        self.assertLess(end, text.index("</Node>", node))
        text = text[:end] + nl + nl.join([f"<Restraint{attrs}>", "<Type>LIM</Type>", "<Stiffness>0</Stiffness>",
                                          "<Gap>0</Gap>", "<Friction>0.3</Friction>", "</Restraint>"]) + text[end:]
        xml = text.encode("utf-8")
        self.assertEqual(child(branch_nodes(xml)[2][13], "ComponentType").upper(), "ATTA")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        b = next(b for b in side["ciiSupports"] if b["cii"] == 780)
        self.assertEqual([(w["type"], w["from"]) for w in b["written"]], [(14, "xml")])
        b["written"].append(dict(b["written"][0], type=9, stiffness=0, cosines=[0, 0, 1], support="u:test-780-lim"))
        nl = "\r\n" if "\r\n" in self.cii else "\n"
        rows = self.cii.split(nl)
        i = slot_line(rows, 780)
        j = slot_line(rows, 780, 1)
        rows[j] = field(field(rows[i], 1, f"{9:13.4f}"), 2, f"{0:13.6f}")
        rows[j + 1] = "  " + "".join(f"{c:13.6f}" for c in (0.0, 0.0, 1.0))
        return xml, side, nl.join(rows)

    def test_an_atta_left_with_only_a_zero_information_limit_is_refused(self):
        """S-fix 3l (PR 321 review point 1): step 10 counts a LIM with no stiffness, gap or direction as no support and
        replaces it by the ATTA's default rest support (real runs L1, L0: "1 placeholder(s) replaced", 780 back with
        +Y and no LIM). So deleting the +Y beside such a LIM is refused; deleting the LIM, or the +Y beside a LIM that
        carries a source, is written."""
        xml, side, two = self.atta780_with_lim()
        self.assertEqual(self.plan_rows(xml, side, two), ([], []))
        self.assertEqual(self.plan_rows(xml, side, edited(two, 780, delete=True)),
                         ([], [("U2D_SUPPORT_ATTA_DEFAULT", "780")]))
        nl = "\r\n" if "\r\n" in two else "\n"
        rows = two.split(nl)
        j = slot_line(rows, 780, 1)
        rows[j] = field(rows[j], 0, f"{0:13.6f}")
        changes, refused = self.plan_rows(xml, side, nl.join(rows))
        self.assertEqual(([(c, k) for c, k, _ in changes], refused), ([("780", "edited")], []))
        changes, refused = self.plan_rows(xml, side, edited(two, 780, friction=0.2))
        self.assertEqual(([(c, k) for c, k, _ in changes], refused), ([("780", "edited")], []))
        xml, side, two = self.atta780_with_lim(' source="survey"')
        changes, refused = self.plan_rows(xml, side, edited(two, 780, delete=True))
        self.assertEqual(([(c, k) for c, k, _ in changes], refused), ([("780", "edited")], []))

    def test_an_atta_support_changed_into_a_zero_information_limit_is_refused(self):
        """PR 322 review point 1: a LIM CAESAR II writes with no direction (cosines 0 0 0) and stiffness 0 is written
        back as LIM, stiffness 0, gap 0, friction: no cosine, no source, so step 10 replaces it by the default +Y.
        ATTA 780 holds +Y. Its +Y changed into such a LIM, or deleted and such a LIM added: refused. A LIM with a
        stiffness, or such a LIM added beside the kept +Y: written."""
        nl = "\r\n" if "\r\n" in self.cii else "\n"

        def lim(stiffness=0.0, keep=False):
            rows = self.cii.split(nl)
            i = slot_line(rows, 780)
            j = i if not keep else slot_line(rows, 780, 1)
            rows[j] = field(field(field(rows[i], 0, f"{780:13.3f}"), 1, f"{9:13.4f}"), 2, f"{stiffness:13.6f}")
            rows[j + 1] = "  " + "".join(f"{c:13.6f}" for c in (0.0, 0.0, 0.0))
            return nl.join(rows)

        def moved_to_slot_1():
            rows = lim().split(nl)
            i, j = slot_line(rows, 780), slot_line(rows, 780, 1)
            rows[j], rows[j + 1] = rows[i], rows[i + 1]
            rows[i] = field(self.cii.split(nl)[i], 0, f"{0:13.6f}")
            rows[i + 1] = self.cii.split(nl)[i + 1]
            return nl.join(rows)

        refused = ([], [("U2D_SUPPORT_ATTA_DEFAULT", "780")])
        self.assertEqual(self.plan_rows(self.xml, self.sidecar, lim()), refused)
        self.assertEqual(self.plan_rows(self.xml, self.sidecar, moved_to_slot_1()), refused)
        for cii in (lim(stiffness=1000.0), lim(keep=True)):
            changes, refused = self.plan_rows(self.xml, self.sidecar, cii)
            self.assertEqual(([(c, k) for c, k, _ in changes], refused), ([("780", "edited")], []))
        # An edit keeps the element and its attributes: with a source on 780's +Y, step 10 counts the LIM: written.
        text = self.xml.decode("utf-8")
        at = text.index("<Restraint", text.index("<NodeNumber>780</NodeNumber>"))
        xml = (text[:at] + '<Restraint source="survey"' + text[at + len("<Restraint"):]).encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        changes, refused = self.plan_rows(xml, side, lim())
        self.assertEqual(([(c, k) for c, k, _ in changes], refused), ([("780", "edited")], []))

    def node50(self, restraint=None, copies=0):
        """EF05 with node 50's <Restraint> replaced by `restraint` and/or followed by `copies` identical copies, its
        sidecar re-hashed, and a runner of plan() on that pair."""
        b = next(b for b in self.sidecar["ciiSupports"] if b["cii"] == 50)
        self.assertEqual([w["from"] for w in b["written"]], ["xml"])
        text = self.xml.decode("utf-8")
        start = text.index("<Restraint", text.index("<NodeNumber>50</NodeNumber>"))
        end = text.index("</Restraint>", start) + len("</Restraint>")
        block = restraint or text[start:end]
        xml2 = (text[:start] + block + ("\n" + block) * copies + text[end:]).encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml2).hexdigest()
        return side, next(b for b in side["ciiSupports"] if b["cii"] == 50), \
            lambda cii: plan(xml2, cii, self.match, 10.0, sidecar=side)["supports"]

    def slot(self, cii, slot, k, text):
        nl = "\r\n" if "\r\n" in cii else "\n"
        lines = cii.split(nl)
        j = slot_line(lines, 50, slot)
        lines[j] = field(lines[j], k, text)
        return nl.join(lines)

    def test_a_new_guide_where_the_xml_guide_has_no_direction_is_written(self):
        """An XML GUI without cosines, written by step 10 along X: a second guide along Z is new; a copy along X is
        written too (step 3h: copies count)."""
        side, b, run = self.node50("<Restraint>\n<Type>GUI</Type>\n<Stiffness>1.751270E+12</Stiffness>\n<Gap>0</Gap>\n"
                                   "<Friction>0.3</Friction>\n</Restraint>")
        b["written"][0].update(type=8, cosines=[1, 0, 0])
        nl = "\r\n" if "\r\n" in self.cii else "\n"
        lines = self.cii.split(nl)
        j = slot_line(lines, 50)
        lines[j] = field(lines[j], 1, f"{8:13.4f}")
        lines[j + 1] = "  " + "".join(f"{c:13.6f}" for c in (1, 0, 0))
        guide = nl.join(lines)
        self.assertEqual(run(guide)["changes"], [])
        for cos in ((0.0, 0.0, 1.0), (1.0, 0.0, 0.0)):
            s = run(self.slot(edited(guide, 50, add=(8, cos)), 1, 4, f"{0.3:13.6f}"))
            self.assertEqual(self.listed_refusals(s), [], cos)
            self.assertEqual([[o["op"] for o in c["restraints"]] for c in s["changes"]], [["keep", "add"]], cos)

    def test_copies_step_10_listed_one_by_one_are_changed_one_by_one(self):
        """Step 3h: node 50 holds its support twice and the sidecar lists both (as step 10 writes them). CAESAR II
        deleting or editing one copy changes one restraint; deleting both is refused (node 50 is an ATTA, S-fix 3k)."""
        side, b, run = self.node50(copies=1)
        b["written"].append(dict(b["written"][0]))
        w = b["written"][0]
        two = self.slot(edited(self.cii, 50, add=(w["type"], tuple(w["cosines"]))), 1, 4, f"{w['friction']:13.6f}")
        self.assertEqual(run(two)["changes"], [])
        for cii, ops in ((self.slot(two, 1, 0, f"{0:13.6f}"), ["keep", "remove"]),
                         (self.slot(two, 1, 4, f"{0.1:13.6f}"), ["keep", "edit"]),
                         (self.slot(self.slot(two, 1, 0, f"{0:13.6f}"), 0, 0, f"{0:13.6f}"), None)):
            s = run(cii)
            if ops is None:      # node 50 is an ATTA: deleting both copies is refused (S-fix 3k)
                self.assertEqual(([c["kind"] for c in s["changes"]], [r["code"] for r in self.listed_refusals(s)]),
                                 ([], ["U2D_SUPPORT_ATTA_DEFAULT"]))
                continue
            self.assertEqual(self.listed_refusals(s), [], ops)
            self.assertEqual([[o["op"] for o in c["restraints"]] for c in s["changes"]], [ops])

    def test_an_empty_list_is_refused_only_when_the_xml_has_supports(self):
        """Step 10 wrote no support from an XML without any: a support added in CAESAR II is not a broken sidecar."""
        side = json.loads(json.dumps(self.sidecar))
        for b in side["ciiSupports"]:
            b["written"] = []
        with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_INVALID"):
            plan(self.xml, self.cii, self.match, 10.0, sidecar=side)
        text = self.xml.decode("utf-8")
        while "<Restraint" in text:
            start = text.index("<Restraint")
            text = text[:start] + text[text.index("</Restraint>", start) + len("</Restraint>"):]
        bare = text.encode("utf-8")
        side["enriched"]["sha256"] = hashlib.sha256(bare).hexdigest()
        s = plan(bare, self.cii, self.match, 10.0, sidecar=side)["supports"]
        self.assertTrue(s["changes"], "CAESAR II's supports are carried as added")
        self.assertEqual({c["kind"] for c in s["changes"]}, {"added"})


    # S-fix step 3c: guides and limits without cosines in the XML (review of PR 311 round 2) -------------------------
    X, Z = (1.0, 0.0, 0.0), (0.0, 0.0, 1.0)

    @staticmethod
    def restraint(typ, cos=None, friction="0.3"):
        s = (f"<Restraint>\n<Type>{typ}</Type>\n<Stiffness>1.751270E+12</Stiffness>\n<Gap>0</Gap>\n"
             f"<Friction>{friction}</Friction>\n")
        if cos:
            s += "".join(f"<DirectionCosine{a}>{c:.9f}</DirectionCosine{a}>\n" for a, c in zip("XYZ", cos))
        return s + "</Restraint>"

    def at50(self, blocks, wrote):
        """Node 50's <Restraint> replaced by `blocks`; the sidecar says step 10 wrote `wrote` [(type, cosines)] there.
        Returns a runner of plan() taking CAESAR II's node 50 as [(type, cosines, friction)]; None for slot 0 deletes it."""
        text = self.xml.decode("utf-8")
        start = text.index("<Restraint", text.index("<NodeNumber>50</NodeNumber>"))
        end = text.index("</Restraint>", start) + len("</Restraint>")
        xml2 = (text[:start] + "\n".join(blocks) + text[end:]).encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml2).hexdigest()
        b = next(b for b in side["ciiSupports"] if b["cii"] == 50)
        b["written"] = [dict(b["written"][0], type=typ, cosines=list(cos), friction=0.3) for typ, cos in wrote]

        def run(slots):
            nl = "\r\n" if "\r\n" in self.cii else "\n"
            lines = self.cii.split(nl)
            i = slot_line(lines, 50)
            first = lines[i]
            if slots == [None]:
                lines[i] = field(first, 0, f"{0:13.6f}")
            for k, (typ, cos, fr) in enumerate(s for s in slots if s):
                j = i + 4 * k
                lines[j] = field(field(field(first, 0, f"{50:13.3f}"), 1, f"{typ:13.4f}"), 4, f"{fr:13.6f}")
                lines[j + 1] = "  " + "".join(f"{c:13.6f}" for c in cos)
            return plan(xml2, nl.join(lines), self.match, 10.0, sidecar=side)["supports"]
        return run

    def ops(self, s):
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual(len(s["changes"]), 1, s["changes"])
        return [(o["op"], o.get("after", {}).get("DirectionCosineZ"), o.get("after", {}).get("Friction"))
                for o in s["changes"][0]["restraints"]]

    def test_a_direction_only_change_of_a_guide_or_limit_without_cosines_is_written(self):
        for typ, code in (("GUI", 8), ("LIM", 9)):
            run = self.at50([self.restraint(typ)], [(code, self.X)])
            self.assertEqual(run([(code, self.X, 0.3)])["changes"], [])
            self.assertEqual(self.ops(run([(code, self.Z, 0.3)])), [("edit", "1.000000000", "0.3")], typ)

    def test_a_guide_without_cosines_edited_while_a_new_guide_is_added(self):
        run = self.at50([self.restraint("GUI")], [(8, self.X)])
        self.assertEqual(self.ops(run([(8, self.X, 0.1), (8, self.Z, 0.3)])),
                         [("edit", "0.000000000", "0.1"), ("add", "1.000000000", "0.3")])

    def wrote(self, s):
        """What the XML node holds after the one change, as (type, direction or None, friction)."""
        self.assertEqual(len(s["changes"]), 1, s["changes"])
        return sorted((a["type"], tuple(a["direction"]) if a["direction"] else None, a["friction"]) for a in s["changes"][0]["after"])

    def test_a_guide_without_cosines_next_to_one_with_cosines(self):
        """Step 3d (review of PR 312 N1), step 3h: a GUI without cosines (step 10 wrote it along X) and a GUI along Z.
        Each restraint is one support, so a change of one leaves the other as it is."""
        run = self.at50([self.restraint("GUI"), self.restraint("GUI", self.Z)], [(8, self.X), (8, self.Z)])
        self.assertEqual(run([(8, self.X, 0.3), (8, self.Z, 0.3)])["changes"], [])
        self.assertEqual(self.ops(run([(8, self.X, 0.3)])), [("keep", None, None), ("remove", None, None)])
        self.assertEqual(self.ops(run([(8, self.Z, 0.3)])), [("remove", None, None), ("keep", None, None)])
        s = run([(8, self.X, 0.3), (8, self.Z, 0.1)])
        self.assertEqual(self.ops(s), [("keep", None, None), ("edit", "1.000000000", "0.1")])
        self.assertEqual(s["changes"][0]["afterText"], "GUI, stiffness 1.7513E+12, friction 0.3, direction not given; "
                                                       "GUI, stiffness 1.7513E+12, friction 0.1, direction +Z")

    def test_a_guide_without_cosines_and_an_identical_one_with_cosines(self):
        """Review of PR 312 N1 (layout C), step 3h: an XML GUI without cosines and an identical GUI along X. Step 10
        writes both (the one without along Z here; 25 Nov check, variant v8). A sidecar listing only one GUI X does not
        give the restraints one by one, so a change there is refused."""
        for blocks in ([self.restraint("GUI"), self.restraint("GUI", self.X)], [self.restraint("GUI", self.X), self.restraint("GUI")]):
            run = self.at50(blocks, [(8, self.Z), (8, self.X)])
            self.assertEqual(run([(8, self.Z, 0.3), (8, self.X, 0.3)])["changes"], [])
            self.assertEqual(self.wrote(run([(8, self.Z, 0.3)])), [(8, None, 0.3)])
            self.assertEqual(self.wrote(run([(8, self.X, 0.3), (8, self.Z, 0.1)])),
                             [(8, self.Z, 0.1), (8, self.X, 0.3)])
            merged = self.at50(blocks, [(8, self.X)])
            self.assertEqual(merged([(8, self.X, 0.3)])["changes"], [])
            for slots in ([None], [(8, self.X, 0.1)]):
                s = merged(slots)
                self.assertEqual(s["changes"], [], slots)
                self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_COPIES_NOT_LISTED"], slots)

    def test_identical_guides_without_cosines_change_one_by_one(self):
        """Step 3h: step 10 writes each GUI without cosines once, all in one direction (25 Nov check: two or three give
        +Z each). Deleting, adding or turning one copy changes one restraint."""
        Y = (0.0, 1.0, 0.0)
        for n in (2, 3):
            run = self.at50([self.restraint("GUI")] * n, [(8, self.Z)] * n)
            self.assertEqual(run([(8, self.Z, 0.3)] * n)["changes"], [], n)
            for slots, ops in (([(8, self.Z, 0.3)] * (n - 1), ["remove"] + ["keep"] * (n - 1)),
                               ([(8, self.Z, 0.3)] * (n + 1), ["keep"] * n + ["add"]),
                               ([(8, self.Z, 0.3)] * (n - 1) + [(8, Y, 0.3)], ["edit"] + ["keep"] * (n - 1))):
                self.assertEqual(sorted(o[0] for o in self.ops(run(slots))), sorted(ops), (n, slots))   # copies alike
            s = run([(8, self.Z, 0.3)] * (n - 1) + [(8, Y, 0.3)])
            self.assertEqual(sorted(t.split(", ")[-1] for t in s["changes"][0]["afterText"].split("; ")),
                             ["direction +Y"] + ["direction not given"] * (n - 1))
            s = run([None])      # node 50 is an ATTA: deleting every guide is refused (S-fix 3k)
            self.assertEqual(s["changes"], [])
            self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_ATTA_DEFAULT"])

    def test_identical_guides_listed_in_two_directions_are_refused(self):
        """Reviews of PR 312 N2/N3 and PR 313 N1 built sidecars where identical GUIs without cosines were written in
        several directions (X and Z; Z, X, X). Step 10 does not do that (25 Nov check), and the sidecar then cannot say
        which restraint is which support: a change there is refused (step 3h), an untouched node is no change."""
        for n, wrote in ((2, [(8, self.X), (8, self.Z)]), (3, [(8, self.Z), (8, self.X), (8, self.X)])):
            run = self.at50([self.restraint("GUI")] * n, wrote)
            self.assertEqual(run([(t, c, 0.3) for t, c in wrote])["changes"], [], n)
            for slots in ([(t, c, 0.1) for t, c in wrote], [(t, c, 0.3) for t, c in wrote[1:]], [None]):
                s = run(slots)
                self.assertEqual(s["changes"], [], (n, slots))
                self.assertEqual({r["code"] for r in self.listed_refusals(s)}, {"U2D_SUPPORT_COPIES_NOT_LISTED"},
                                 (n, slots))
        # a sidecar listing another direction than the XML restraint's own cosines (same count) is refused the same way
        run = self.at50([self.restraint("GUI", self.X)], [(8, self.Z)])
        s = run([None])
        self.assertEqual(s["changes"], [])
        self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_COPIES_NOT_LISTED"])

    def test_a_direction_only_change_reads_as_one(self):
        """Review of PR 312 N4: the receipt texts name a guide's direction."""
        run = self.at50([self.restraint("GUI")], [(8, self.X)])
        c = run([(8, self.Z, 0.3)])["changes"][0]
        self.assertEqual((c["beforeText"], c["afterText"]), ("GUI, stiffness 1.7513E+12, friction 0.3, direction not given",
                                                             "GUI, stiffness 1.7513E+12, friction 0.3, direction +Z"))

    def test_a_rule_copy_of_an_xml_support_does_not_block_its_edit(self):
        """Step 3c (review N2): the sidecar lists node 50's xml +Y and an identical rule +Y; only copies from one XML
        record count as copies of one support, so an edit of one is carried, not refused."""
        side = json.loads(json.dumps(self.sidecar))
        b = next(b for b in side["ciiSupports"] if b["cii"] == 50)
        w = b["written"][0]
        b["written"].insert(0, {**{k: v for k, v in w.items() if k != "id"}, "from": "rule", "ids": [w["id"]]})
        two = edited(self.cii, 50, add=(w["type"], tuple(w["cosines"])))
        nl = "\r\n" if "\r\n" in two else "\n"
        lines = two.split(nl)
        j = slot_line(lines, 50, 1)
        lines[j] = field(lines[j], 4, f"{0.1:13.6f}")
        s = plan(self.xml, nl.join(lines), self.match, 10.0, sidecar=side)["supports"]
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([[o["op"] for o in c["restraints"]] for c in s["changes"]], [["keep", "add"]])

class SupportsByStep10Bm2(SupportsByStep10):
    MODEL = "BM2"

    def test_a_support_contracted_from_a_record_whose_number_lives_on_is_refused(self):
        """S-fix 3j (PR 319 round 3 review B1, m8): BM2 node 300 [1,74] is contracted into 280 while CII 300 lives on
        through branch 22's first node, so the sidecar lists [1,74] under 300 although no element uses it. With the same
        +Y on 280 [1,70] and on [1,74], real step 10 (3D_Converters 33e2c350) wrote one +Y at 280 (`from: xml`), the
        same CII; this is that input. A change at 280 is refused: written on 280 alone, step 10 brought [1,74]'s +Y back
        (real round trip rt8, 2 +Y where CAESAR II has 1). Untouched, no row."""
        text = self.xml.decode("utf-8")
        branch = [m.start() for m in re.finditer("<Branch>", text)][1]
        nodes = [m.start() + branch for m in re.finditer("<Node>", text[branch:])]
        nl = "\r\n" if "\r\n" in text else "\n"
        restraint = nl.join(["<Restraint>", "<Type>+Y</Type>", "<Stiffness>1751270031350</Stiffness>", "<Gap>0</Gap>",
                             "<Friction>0.3</Friction>", "</Restraint>"]) + nl
        for ni in (74, 70):                                      # the later one first, so the earlier place stays
            end = text.index("</Node>", nodes[ni])
            text = text[:end] + restraint + text[end:]
        xml = text.encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml).hexdigest()
        rid = next(i["id"] for n in side["nodes"] for i in n["ids"] if i["at"] == [1, 70])
        for b in side["ciiSupports"]:
            if b["cii"] == 280:
                b["written"] = [{"type": 14, "stiffness": 1751270031350, "gap": 0, "friction": 0.3,
                                 "cosines": [0, 1, 0], "from": "xml", "support": "u:test-280", "id": rid}]
        for cii, want in ((self.cii, []), (edited(self.cii, 280, friction=0.2), [("U2D_SUPPORT_MERGED_COPY", "280")]),
                          (edited(self.cii, 280, delete=True), [("U2D_SUPPORT_MERGED_COPY", "280")])):
            with tempfile.TemporaryDirectory() as d:
                (Path(d) / "enriched.xml").write_bytes(xml)
                match = match_for(Path(d) / "enriched.xml", cii)
            s = plan(xml, cii, match, 10.0, sidecar=side)["supports"]
            self.assertEqual((s["changes"], [(r["code"], r.get("ciiNode")) for r in s["refused"]]), ([], want))

    def test_the_same_copies_at_two_moved_nodes_get_a_row_each(self):
        """Step 3g, 3h: nodes 20 and 3500 (supports step 10 moved) each get the same friction edit and an identical
        copy. Each edit goes to its moved source, and each CII node gets its own written-once row (step 10 merges the
        copy)."""
        cii = self.cii
        for node in (20, 3500):
            w = next(w for b in self.sidecar["ciiSupports"] if b["cii"] == node for w in b["written"])
            self.assertEqual(w["from"], "moved", node)
            cii = edited_and_copied(cii, node, w, 0.1)
        s = self.supports(cii)
        self.assertEqual(sorted((r["code"], r["ciiNode"]) for r in self.listed_refusals(s)),
                         [("U2D_SUPPORT_COPIES_WRITTEN_ONCE", "20"), ("U2D_SUPPORT_COPIES_WRITTEN_ONCE", "3500")])
        self.assertEqual(sorted((c["ciiNode"], c["kind"]) for c in s["changes"]),
                         [("20", "edited"), ("3500", "edited")])

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.rule = next(b for b in cls.sidecar["ciiSupports"] if b["cii"] == 120)
        cls.anci = cls.rule["written"][0]["ids"][0]

    def ref_of(self, uid: str) -> list:
        return next(i["at"] for n in self.sidecar["nodes"] for i in n["ids"] if i["id"] == uid)

    def test_node_120_is_step_10s_anci_rule(self):
        self.assertEqual([(w["from"], w["rule"], w["type"]) for w in self.rule["written"]], [("rule", "componentType", 14)])

    def test_untouched_bm2_has_no_support_step_10_does_not_write(self):
        """S-fix 3i round 3: nodes 3300 and 3340 are second ANCI records at the points of 3290 and 3330, with the same
        +Y. Step 10 contracts them into those nodes (sidecar: notInCii) and writes one +Y each, so they are no longer
        reported NOT_IN_CII (before: 2)."""
        self.assertEqual(self.summary()["refused"], {})

    def test_an_edit_where_step_10_contracted_a_second_support_is_refused(self):
        """S-fix 3i round 3, real round trip (25-26 Nov): main wrote CAESAR II's friction 0.2 at node 3290 on 3290 only;
        step 10 then wrote +Y 0.2 and the +Y 0.3 of node 3300 at 3290, where CAESAR II has 1. Now refused."""
        for cii in (edited(self.cii, 3290, friction=0.2), edited(self.cii, 3290, delete=True)):
            s = self.supports(cii)
            self.assertEqual(s["changes"], [])
            self.assertEqual([(r["code"], r["ciiNode"]) for r in self.listed_refusals(s)],
                             [("U2D_SUPPORT_MERGED_COPY", "3290")])

    def test_a_rule_support_edited_is_written_on_its_anci_node(self):
        s = self.supports(edited(self.cii, 120, friction=0.2))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual(len(s["changes"]), 1, s["changes"])
        c = s["changes"][0]
        self.assertEqual((c["ciiNode"], c["kind"], c["step10"], c["afterText"]), ("120", "added", ["rule"], "+Y, stiffness 1.7513E+12, friction 0.2"))
        self.assertEqual([c["ref"]["branchOrdinal"], c["ref"]["nodeOrdinal"]], self.ref_of(self.anci))
        self.assertEqual([o["op"] for o in c["restraints"]], ["add"])

    def test_a_rule_support_deleted_is_refused_and_nothing_is_written(self):
        s = self.supports(edited(self.cii, 120, delete=True))
        self.assertEqual(s["changes"], [])
        self.assertEqual([(r["code"], r["ciiNode"]) for r in self.listed_refusals(s)], [("U2D_SUPPORT_RULE_REMOVED", "120")])

    def test_a_support_added_at_a_rule_node_brings_the_rule_support_along(self):
        # The ANCI node then holds a support in the XML, so step 10's rule no longer writes its +Y there.
        s = self.supports(edited(self.cii, 120, add=(13, (1.0, 0.0, 0.0))))
        self.assertEqual(len(s["changes"]), 1, s["changes"])
        c = s["changes"][0]
        self.assertEqual(sorted(a["type"] for a in c["after"]), [13, 14])
        self.assertEqual(sorted(c["step10"]), ["added", "rule"])
        self.assertEqual([c["ref"]["branchOrdinal"], c["ref"]["nodeOrdinal"]], self.ref_of(self.anci))

    def test_an_xml_support_edited_or_added_goes_to_its_own_node(self):
        b = next(b for b in self.sidecar["ciiSupports"] if [w["from"] for w in b["written"]] == ["xml"])
        own = self.ref_of(b["written"][0]["id"])
        for cii, after in ((edited(self.cii, b["cii"], friction=0.15), [14]), (edited(self.cii, b["cii"], add=(13, (1.0, 0.0, 0.0))), [13, 14])):
            s = self.supports(cii)
            self.assertEqual(self.listed_refusals(s), [])
            self.assertEqual([(c["ciiNode"], c["kind"]) for c in s["changes"]], [(str(b["cii"]), "edited")])
            c = s["changes"][0]
            self.assertEqual([c["ref"]["branchOrdinal"], c["ref"]["nodeOrdinal"]], own)
            self.assertEqual(sorted(a["type"] for a in c["after"]), after)


del SupportsByStep10


class Step10Placeholders(unittest.TestCase):
    """S-fix 3l: the <Restraint>s step 10 counts as no restraint on an ATTA, as 3D_Converters
    isZeroInformationLimitRestraintElement reads them (v045 atta-default-restraint-closure.js)."""

    @staticmethod
    def found(*restraints: str) -> set:
        xml = ("<Model><Branch><Node><ComponentType>ATTA</ComponentType>" + "".join(restraints)
               + "</Node></Branch></Model>").encode("utf-8")
        return step10_placeholders(xml).get((0, 0), set())

    def test_a_limit_with_no_stiffness_gap_or_direction_counts_as_none(self):
        for typ in ("LIM", "Limit", " line stop ", "LINESTOP"):
            self.assertEqual(self.found(f"<Restraint><Type>{typ}</Type><Stiffness>0.0</Stiffness></Restraint>"), {0}, typ)
        self.assertEqual(self.found("<Restraint><Type>+Y</Type></Restraint>", "<Restraint><Type>LIM</Type></Restraint>"),
                         {1})

    def test_any_information_makes_it_a_support(self):
        for extra in ("<Stiffness>1</Stiffness>", "<Gap>2</Gap>", "<Gap>x</Gap>", "<DirectionCosineZ>1</DirectionCosineZ>",
                      "<OriginalText>LIM</OriginalText>", "<ResolvedFrom>a</ResolvedFrom>", "<SideloadRow>3</SideloadRow>"):
            self.assertEqual(self.found(f"<Restraint><Type>LIM</Type>{extra}</Restraint>"), set(), extra)
        for attr in ("source", "basis", "resolvedKey"):
            self.assertEqual(self.found(f'<Restraint {attr}="a"><Type>LIM</Type></Restraint>'), set(), attr)
        self.assertEqual(self.found("<Restraint><Type>GUI</Type></Restraint>"), set())

    def test_texts_and_attributes_read_as_step_10_reads_them(self):
        """PR 322 round 1: the rule on tag texts (what an edit or add would write) and the attributes an edit keeps."""
        self.assertTrue(step10_zero_info({"Type": "Line Stop", "Stiffness": "0.000000E+00", "Gap": "0", "Friction": "0.3"}))
        self.assertTrue(step10_zero_info({"Type": "LIM"}))
        for extra in ({"Stiffness": "0.5"}, {"Gap": "1e-9"}, {"DirectionCosineX": "1"}, {"DirectionCosineY": "0"},
                      {"OriginalText": "LIM"}, {"Type": "+Y"}):
            self.assertFalse(step10_zero_info({"Type": "LIM", **extra}), extra)
        xml = ('<Model><Branch><Node><Restraint><Type>LIM</Type></Restraint><Restraint source="a"><Type>LIM</Type>'
               '</Restraint><Restraint basis=" "><Type>LIM</Type></Restraint><Restraint resolvedKey="k"><Type>LIM</Type>'
               '</Restraint></Node></Branch></Model>').encode("utf-8")
        self.assertEqual(step10_bare(xml), {(0, 0): {0, 2}})
        self.assertEqual(step10_placeholders(xml), {(0, 0): {0, 2}})


class ContractionWalk(unittest.TestCase):
    def test_a_contracted_node_goes_to_the_written_node_before_or_after_it(self):
        """S-fix 3j (PR 319 round 3 review N1): step 10 keeps the node of a short span with the higher priority, which
        can be the later one, so the walk goes both ways. Neither fixture has a holder after its node, so a small
        XML."""
        def node(number, x):
            return (f"<Node><NodeNumber>{number}</NodeNumber><ComponentType>PIPE</ComponentType>"
                    f"<Position>{x} 0 0</Position></Node>")
        xml = ("<PipingModel><Pipe><Branch><Branchname>/B</Branchname>" + node(10, 0) + node(20, 3) + node(30, 100)
               + node(40, 104) + "</Branch></Pipe></PipingModel>").encode("utf-8")
        self.assertEqual(step10_absorbed(xml, {(0, 1), (0, 3)}), {(0, 0): [(0, 1)], (0, 2): [(0, 3)]})
        self.assertEqual(step10_absorbed(xml, {(0, 0), (0, 2)}), {(0, 1): [(0, 0)], (0, 3): [(0, 2)]})
        self.assertEqual(step10_absorbed(xml, {(0, 0), (0, 3)})[(0, 1)], [(0, 0)])
        self.assertEqual(step10_absorbed(xml, {(0, 0), (0, 3)})[(0, 2)], [(0, 3)])

    def test_a_listed_record_no_element_uses_and_no_neighbour_holds_is_written(self):
        """S-fix 3j round 1 (review B1, m9): step 10 makes no element for a branch with one numbered node, yet writes
        its supports (real m9 run: one +Y at 1060). Listed and alone, it counts as written, and an unlisted numbered
        record 3 mm on goes to it; listed but next to a written node, it is contracted as before (m8). A small XML: its
        branch /B tests the walk only (step 10 itself keeps a two-node branch whole)."""
        def node(number, x):
            return (f"<Node><NodeNumber>{number}</NodeNumber><ComponentType>PIPE</ComponentType>"
                    f"<Position>{x} 0 0</Position></Node>")
        xml = ("<PipingModel><Pipe><Branch><Branchname>/A</Branchname>" + node(10, 0) + node(20, 100)
               + node(25, 103) + "</Branch><Branch><Branchname>/B</Branchname>" + node(30, 500) + node(40, 503)
               + "</Branch></Pipe></PipingModel>").encode("utf-8")
        in_cii, absorbed = step10_written(xml, {(0, 0), (0, 1), (0, 2), (1, 0)}, {(0, 0), (0, 1)})
        self.assertEqual(in_cii, {(0, 0), (0, 1), (1, 0)})
        self.assertEqual(absorbed, {(0, 2): [(0, 1)], (1, 1): [(1, 0)]})


if __name__ == "__main__":
    unittest.main()
