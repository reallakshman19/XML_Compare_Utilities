"""Supports from CAESAR II, step 1 (Owner 18 Nov 2026): the CII's supports compared with the XML's on
the matcher's pairs. EF-05 sample files (step 10's Enriched XML and step 10's CII) with text edits.

    python -E -s -m unittest tests.test_u2d_supports -v     (node on PATH; U3B_3DC = a 3D_Converters
    checkout for the type-code check)
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path[:0] = [str(HERE.parent), str(HERE.parents[1] / "u3b-cii-check"), str(ROOT / "uxml" / "v2" / "vendor" / "cii-v11-v14")]
from u2d_supports import STEP10_DETAIL, TYPE_CODES, support, support_report  # noqa: E402

EF05 = ROOT / "fixtures" / "uxml-v2-transfer" / "EF05"
MATCHER = HERE.parents[1] / "p11-cii-map" / "cli.mjs"
sys.path.insert(0, str(HERE.parents[1] / "u3b-cii-check" / "tests"))
from test_u3b import CONVERTER  # noqa: E402


def match_for(xml: Path, cii_text: str) -> dict:
    from cii_v11_v14 import convert_bytes
    with tempfile.TemporaryDirectory(prefix="u2d-sup-") as t:
        v14 = Path(t) / "v14.cii"
        v14.write_bytes(convert_bytes(cii_text.encode("utf-8"), 14).data)
        out = subprocess.run(["node", str(MATCHER), "match-psi116", str(xml), str(v14), "--frame", "cii2019"],
                             capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def restrant_edit(text: str, old: str, new: str) -> str:
    """Replace the first line in RESTRANT that starts with `old` (same width)."""
    assert len(old) == len(new)
    i = text.index("#$ RESTRANT")
    j = text.index("\n" + old, i) + 1
    return text[:j] + new + text[j + len(old):]


@unittest.skipUnless(shutil.which("node"), "node missing: NOT_RUN")
class SupportsOnEf05(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.xml = (EF05 / "base.xml").read_bytes()
        cls.cii = (EF05 / "source.cii").read_text(encoding="utf-8")
        cls.match = match_for(EF05 / "base.xml", cls.cii)

    def report(self, cii=None, xml=None):
        return support_report(xml or self.xml, cii or self.cii, self.match)

    def test_no_edits_no_changes(self):
        s = self.report()["summary"]
        self.assertEqual(s["changes"], 0, s)
        self.assertEqual(s["pointsSame"], 162)
        self.assertEqual(s["step10Anchors"], 30)          # step 10's own open-end anchors are never "added"
        self.assertEqual(s["notWrittenByStep10"], 11)     # the 11 supports on nodes numbered -2
        self.assertEqual(s["refused"], {"U2D_SUPPORT_NOT_IN_CII": 11})

    def test_an_edited_stiffness_is_one_edit(self):
        cii = restrant_edit(self.cii, "        50.0000      14.0000 1.751270E+12", "        50.0000      14.0000 2.000000E+12")
        r = self.report(cii)
        self.assertEqual(r["summary"]["byKind"], {"edited": 1})
        c = r["changes"][0]
        self.assertEqual((c["ciiNode"], c["before"][0]["stiffness"], c["after"][0]["stiffness"]), ("50", 1.7513e12, 2e12))

    def test_a_support_removed_in_caesar_ii(self):
        cii = restrant_edit(self.cii, "        90.0000      14.0000", "       0.000000     0.000000")
        r = self.report(cii)
        self.assertEqual(r["summary"]["byKind"], {"removed": 1})
        self.assertEqual(r["changes"][0]["ciiNode"], "90")

    def test_a_support_added_on_an_existing_node(self):
        """The XML without node 90's support stands for a CII that gained one there."""
        text = self.xml.decode("utf-8")
        m = re.search(r"<NodeNumber>90</NodeNumber>.*?(<Restraint>.*?</Restraint>\s*)", text, re.S)
        xml = (text[:m.start(1)] + text[m.end(1):]).encode("utf-8")
        r = self.report(xml=xml)
        self.assertEqual(r["summary"]["byKind"], {"added": 1})
        self.assertEqual(r["changes"][0]["ciiNode"], "90")

    def test_a_support_on_a_node_the_xml_does_not_have_is_refused_in_plain_words(self):
        cii = restrant_edit(self.cii, "        50.0000      14.0000", "        99999.0      14.0000")
        r = self.report(cii)
        new = [x for x in r["refused"] if x["code"] == "U2D_SUPPORT_NEW_NODE"]
        self.assertEqual([x["ciiNode"] for x in new], ["99999"])
        self.assertEqual(new[0]["detail"], "this support is on a node the XML does not have")
        self.assertEqual(r["summary"]["byKind"], {"removed": 1})   # node 50 lost it

    def test_plan_summary_carries_the_support_counts_and_no_new_edits(self):
        from u2d_plan import plan
        r = plan(self.xml, self.cii, self.match, 10.0)
        self.assertEqual(r["summary"]["supports"]["changes"], 0)
        self.assertFalse(any("Restraint" in e["field"] for e in r["edits"]))
        self.assertFalse(any(x["code"].startswith("U2D_SUPPORT") for x in r["refused"]))

    # ---- step 2: each change names its XML node and says before/after in plain words; the receipt lists them
    def test_a_change_names_its_xml_node_and_plain_before_after(self):
        cii = restrant_edit(self.cii, "        50.0000      14.0000 1.751270E+12", "        50.0000      14.0000 2.000000E+12")
        c = self.report(cii)["changes"][0]
        self.assertEqual(c["ref"]["nodeNumber"], "50")
        self.assertTrue(c["ref"]["branchName"])
        self.assertEqual(c["beforeText"], "+Y, stiffness 1.7513E+12, friction 0.3")
        self.assertEqual(c["afterText"], "+Y, stiffness 2E+12, friction 0.3")

    def test_an_added_support_goes_on_the_node_numbered_like_the_cii_node(self):
        text = self.xml.decode("utf-8")
        m = re.search(r"<NodeNumber>90</NodeNumber>.*?(<Restraint>.*?</Restraint>\s*)", text, re.S)
        c = self.report(xml=(text[:m.start(1)] + text[m.end(1):]).encode("utf-8"))["changes"][0]
        self.assertEqual((c["kind"], c["ref"]["nodeNumber"], c["beforeText"]), ("added", "90", "none"))

    def test_the_receipt_lists_the_support_changes_and_keeps_its_value_changes(self):
        from u2d import build_receipt
        from u2d_plan import plan
        cii = restrant_edit(self.cii, "        90.0000      14.0000", "       0.000000     0.000000")
        r = plan(self.xml, cii, self.match, 10.0)
        u1 = {"sha256After": "0" * 64, "changes": []}
        receipt = build_receipt(names=("a.cii", "b.xml", "c.xml"), cii_bytes=b"", target=self.xml, revised=self.xml, u1=u1,
                                items=["name"], weight_scale=10.0, result=r, created_at="2026-11-18T00:00:00+00:00")
        self.assertEqual([(c["kind"], c["ref"]["nodeNumber"]) for c in receipt["supports"]["changes"]], [("removed", "90")])
        self.assertEqual(receipt["changes"], [])                      # nothing applied: value changes untouched
        self.assertFalse(any(x["code"].startswith("U2D_SUPPORT") for x in receipt["refused"]))


def apply_restraint_ops(xml_bytes: bytes, changes: list) -> bytes:
    """Test helper: each change's <Restraint> edits applied to the XML (ElementTree), as section 5 applies them."""
    import xml.etree.ElementTree as ET
    root = ET.fromstring(xml_bytes)
    ns = root.tag[:root.tag.index("}") + 1] if root.tag.startswith("{") else ""
    branches = [b for p in root if p.tag == ns + "Pipe" for b in p if b.tag == ns + "Branch"] or [b for b in root if b.tag == ns + "Branch"]
    for c in changes:
        node = [n for n in branches[c["ref"]["branchOrdinal"]] if n.tag == ns + "Node"][c["ref"]["nodeOrdinal"]]
        old = [r for r in node if r.tag == ns + "Restraint"]
        assert len(old) == c["restraintCount"]
        for op in c["restraints"]:
            if op["op"] == "remove":
                node.remove(old[op["index"]])
            elif op["op"] in ("edit", "add"):
                r = old[op["index"]] if op["op"] == "edit" else ET.SubElement(node, ns + "Restraint")
                for k in list(r):
                    r.remove(k)
                for k, v in op["after"].items():
                    ET.SubElement(r, ns + k).text = v
    return ET.tostring(root, encoding="utf-8")


class SupportEditsApplied(unittest.TestCase):
    """Step 3 (Owner 18 Nov: "Yes, allow and lock"): the EF-05 four-edit CII (fixtures/uxml-v2-transfer/EF05/
    supports-edits.cii). Each change carries the exact <Restraint> edits; applied, CAESAR II and the XML agree."""

    @classmethod
    def setUpClass(cls):
        cls.xml = (EF05 / "base.xml").read_bytes()
        cls.cii = (EF05 / "supports-edits.cii").read_text(encoding="utf-8")
        cls.match = match_for(EF05 / "base.xml", cls.cii)
        cls.report = support_report(cls.xml, cls.cii, cls.match)

    def test_three_changes_and_one_new_node_refused(self):
        s = self.report["summary"]
        self.assertEqual(s["byKind"], {"edited": 1, "removed": 1, "added": 1})
        self.assertEqual(s["refused"], {"U2D_SUPPORT_NEW_NODE": 1, "U2D_SUPPORT_NOT_IN_CII": 11})
        self.assertEqual(s["step10Anchors"], 30)          # never "added"

    def test_the_edits_are_exact_and_keep_unchanged_texts(self):
        ops = {c["ciiNode"]: c["restraints"] for c in self.report["changes"]}
        self.assertEqual([o["op"] for o in ops["50"]], ["edit"])
        self.assertEqual({k: v for k, v in ops["50"][0]["after"].items() if ops["50"][0]["before"][k] != v}, {"Stiffness": "2.000000E+12"})
        self.assertEqual([o["op"] for o in ops["90"]], ["remove"])
        self.assertEqual(ops["240"], [{"op": "add", "after": {"Type": "GUI", "Stiffness": "1.751270E+12", "Gap": "0", "Friction": "0"}}])

    def test_applied_the_xml_matches_caesar_ii(self):
        revised = apply_restraint_ops(self.xml, self.report["changes"])
        s = support_report(revised, self.cii, self.match)["summary"]
        self.assertEqual(s["changes"], 0, s)
        self.assertEqual(s["refused"], {"U2D_SUPPORT_NEW_NODE": 1, "U2D_SUPPORT_NOT_IN_CII": 11})

    def test_a_bare_axis_type_edited_keeps_its_letter_when_it_still_fits(self):
        from u2d_supports import restraint_texts, support
        old = {"Type": "Y", "Stiffness": "1.751270E+12", "Gap": "0", "Friction": "0.3",
               "DirectionCosineX": "0.000000000", "DirectionCosineY": "1.000000000", "DirectionCosineZ": "0.000000000"}
        c = support(3, 1.75127e12, 0.0, 0.3, (0.0, 1.0, 0.0))
        self.assertEqual(restraint_texts(c, {"stiffness": 1.75127e12, "gap": 0.0, "friction": 0.3, "direction": (0.0, 1.0, 0.0)}, old), old)


@unittest.skipUnless(shutil.which("node"), "node missing: NOT_RUN")
class Step10OwnSupports(unittest.TestCase):
    """S-fix step 1 (Owner 23 Nov 2026, "Yes, as suggested"): step 10 also writes supports the XML does not hold on
    that node. On an untouched step 10 CII (switch on, 3DC main fed7783d) the transfer listed EF-05 10 and BM2 30 of
    them as added in CAESAR II and section 5 wrote and locked them. Now they are refused and nothing is written."""

    @classmethod
    def setUpClass(cls):
        cls.files = {}
        for m in ("EF05", "BM2"):
            d = ROOT / "fixtures" / "uxml-v2-transfer" / f"{m}-on"
            xml, cii = (d / "enriched.xml").read_bytes(), (d / "step10.cii").read_text(encoding="utf-8")
            side = json.loads((d / "step10.cii.sidecar.json").read_text(encoding="utf-8"))
            cls.files[m] = (xml, cii, match_for(d / "enriched.xml", cii), side)

    def report(self, m, xml=None):
        x, cii, match, _ = self.files[m]
        return support_report(xml or x, cii, match)

    def test_ef05_untouched_moved_supports_are_refused_not_written(self):
        r = self.report("EF05")
        s = r["summary"]
        self.assertEqual((s["changes"], s["pointsSame"], s["step10Anchors"]), (0, 162, 30), s)
        self.assertEqual(s["refused"], {"U2D_SUPPORT_MAY_BE_STEP10": 11, "U2D_SUPPORT_NOT_IN_CII": 11})
        mine = [x for x in r["refused"] if x["code"] == "U2D_SUPPORT_MAY_BE_STEP10"]
        self.assertEqual(sorted(int(x["ciiNode"]) for x in mine),
                         [800, 910, 1500, 2110, 2710, 4650, 4760, 5990, 6650, 7020, 7700])   # step 10's placement log
        self.assertEqual({tuple(x["step10"]) for x in mine}, {("moved",)})
        self.assertEqual(mine[0]["detail"], STEP10_DETAIL)

    def test_bm2_untouched_engine_rule_supports_are_refused_not_written(self):
        r = self.report("BM2")
        s = r["summary"]
        self.assertEqual((s["changes"], s["pointsSame"], s["step10Anchors"]), (0, 11, 3), s)
        self.assertEqual(s["refused"], {"U2D_SUPPORT_MAY_BE_STEP10": 30, "U2D_SUPPORT_AMBIGUOUS": 16})
        mine = [x for x in r["refused"] if x["code"] == "U2D_SUPPORT_MAY_BE_STEP10"]
        self.assertEqual({tuple(x["step10"]) for x in mine}, {("rule",)})    # numbered ANCI nodes without a support
        self.assertEqual({x["after"][0] for x in mine}, {"+Y, stiffness 1.7513E+12, friction 0.3"})

    def test_the_plan_writes_no_support_with_or_without_the_sidecar(self):
        from u2d_plan import plan
        for m in ("EF05", "BM2"):
            xml, cii, match, side = self.files[m]
            for kw in ({}, {"sidecar": side}):
                r = plan(xml, cii, match, 10.0, **kw)
                self.assertEqual((r["summary"]["supports"]["changes"], r["supports"]["changes"]), (0, []), (m, kw.keys()))

    def test_a_support_added_on_a_plain_node_is_still_written(self):
        """The XML without node 50's support (an ATTA with its own <Restraint>) stands for a CII that gained one there."""
        text = self.files["EF05"][0].decode("utf-8")
        m = re.search(r"<NodeNumber>50</NodeNumber>.*?(<Restraint>.*?</Restraint>\s*)", text, re.S)
        r = self.report("EF05", xml=(text[:m.start(1)] + text[m.end(1):]).encode("utf-8"))
        self.assertEqual([(c["kind"], c["ciiNode"]) for c in r["changes"]], [("added", "50")])
        self.assertEqual(r["summary"]["refused"]["U2D_SUPPORT_MAY_BE_STEP10"], 11)

    def without_guard(self, m):
        import u2d_supports
        keep = u2d_supports.step10_may_write
        u2d_supports.step10_may_write = lambda xml_bytes: {}
        try:
            return self.report(m)
        finally:
            u2d_supports.step10_may_write = keep

    def test_mutant_without_the_guard_the_false_additions_come_back(self):
        """The guard is what removes them: switched off, the old 10 / 30 additions return, and the refused nodes are
        exactly those (EF-05 also 4650, refused before as unclear)."""
        for m, extra in (("EF05", {"4650"}), ("BM2", set())):
            old = self.without_guard(m)
            added = {c["ciiNode"] for c in old["changes"]}
            self.assertEqual(old["summary"]["byKind"], {"added": {"EF05": 10, "BM2": 30}[m]})
            mine = {x["ciiNode"] for x in self.report(m)["refused"] if x["code"] == "U2D_SUPPORT_MAY_BE_STEP10"}
            self.assertEqual(mine, added | extra, m)

    def test_the_guard_marks_only_nodes_step_10_may_write_on(self):
        from u2d_supports import step10_may_write
        made = step10_may_write(self.files["EF05"][0])
        self.assertEqual((len(made), set(made.values())), (11, {"moved"}))   # measured: one node for each of the 11 unnumbered supports
        self.assertEqual(made[(2, 15)], "moved")          # CII 800: the bend's node before the unnumbered support
        self.assertNotIn((0, 7), made)                     # node 50 holds its own support


class SupportRules(unittest.TestCase):
    def test_a_negative_friction_counts_as_zero(self):
        self.assertEqual(support(8, 1.75127e12, 5.0, -1.0101, None), support(8, 1.75127e12, 5.0, 0.0, None))

    @unittest.skipUnless((CONVERTER / "xml_to_cii2019.py").exists(), "3D_Converters checkout missing (U3B_3DC): NOT_RUN")
    def test_type_codes_equal_step_10s(self):
        src = (CONVERTER / "xml_to_cii2019.py").read_text(encoding="utf-8")
        body = re.search(r"NATIVE_RESTRAINT_TYPE_CODES: Final\[dict\[str, int\]\] = (\{.*?\})", src, re.S).group(1)
        self.assertEqual(TYPE_CODES, eval(body, {}))  # noqa: S307 (a dict literal from the writer)


if __name__ == "__main__":
    unittest.main()
