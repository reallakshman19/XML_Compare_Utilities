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
from u2d_supports import TYPE_CODES, support, support_report  # noqa: E402

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
