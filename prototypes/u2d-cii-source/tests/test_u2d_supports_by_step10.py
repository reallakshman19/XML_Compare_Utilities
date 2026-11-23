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

import json
import shutil
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
from test_u2d_supports import ROOT, match_for  # noqa: E402
from u2d_plan import plan  # noqa: E402

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
        for side in (bad_list, bad_entry, bad_at, bad_sha):
            with self.assertRaisesRegex(ValueError, "^U2D_SIDECAR_INVALID"):
                self.supports(sidecar=side)

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


class SupportsByStep10Bm2(SupportsByStep10):
    MODEL = "BM2"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.rule = next(b for b in cls.sidecar["ciiSupports"] if b["cii"] == 120)
        cls.anci = cls.rule["written"][0]["ids"][0]

    def ref_of(self, uid: str) -> list:
        return next(i["at"] for n in self.sidecar["nodes"] for i in n["ids"] if i["id"] == uid)

    def test_node_120_is_step_10s_anci_rule(self):
        self.assertEqual([(w["from"], w["rule"], w["type"]) for w in self.rule["written"]], [("rule", "componentType", 14)])

    def test_untouched_bm2_counts_only_the_supports_step_10_does_not_write(self):
        self.assertEqual(self.summary()["refused"], {"U2D_SUPPORT_NOT_IN_CII": 2})

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

if __name__ == "__main__":
    unittest.main()
