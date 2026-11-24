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
        return next(b for b in self.sidecar["ciiSupports"] if [w["from"] for w in b["written"]] == ["xml"])

    def test_an_xml_support_deleted_is_removed_from_its_own_node(self):
        b = self.xml_support_node()
        s = self.supports(edited(self.cii, b["cii"], delete=True))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([(c["ciiNode"], c["kind"]) for c in s["changes"]], [(str(b["cii"]), "removed")])
        at = next(i["at"] for n in self.sidecar["nodes"] for i in n["ids"] if i["id"] == b["written"][0]["id"])
        self.assertEqual([s["changes"][0]["ref"]["branchOrdinal"], s["changes"][0]["ref"]["nodeOrdinal"]], at)

    def test_a_moved_support_deleted_is_removed_from_its_unnumbered_node(self):
        s = self.supports(edited(self.cii, 800, delete=True))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([(c["ciiNode"], c["kind"], c["step10"]) for c in s["changes"]], [("800", "removed", ["moved"])])
        self.assertLessEqual(float(s["changes"][0]["ref"]["nodeNumber"]), 0)

    def test_an_open_end_anchor_edited_is_added_on_its_node(self):
        node = next(b["cii"] for b in self.sidecar["ciiSupports"] if [w["from"] for w in b["written"]] == ["openEnd"])
        s = self.supports(edited(self.cii, node, friction=0.2))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([(c["ciiNode"], c["kind"], c["step10"]) for c in s["changes"]], [(str(node), "added", ["added"])])
        self.assertEqual([a["type"] for a in s["changes"][0]["after"]], [1])

    def test_identical_copies_on_one_node_are_all_replaced(self):
        """PR 310 review B1: step 10 writes two identical supports on one XML node once; CAESAR II's change replaces both."""
        b = self.xml_support_node()
        text = self.xml.decode("utf-8")
        i = text.index(f"<NodeNumber>{b['cii']}</NodeNumber>")
        start = text.index("<Restraint", i)
        end = text.index("</Restraint>", start) + len("</Restraint>")
        xml2 = (text[:end] + "\n" + text[start:end] + text[end:]).encode("utf-8")
        side = json.loads(json.dumps(self.sidecar))
        side["enriched"]["sha256"] = hashlib.sha256(xml2).hexdigest()
        run = lambda cii: plan(xml2, cii, self.match, 10.0, sidecar=side)["supports"]
        self.assertEqual(run(self.cii)["changes"], [])
        for cii, after in ((edited(self.cii, b["cii"], friction=0.1), ["0.1"]), (edited(self.cii, b["cii"], delete=True), [])):
            s = run(cii)
            self.assertEqual(self.listed_refusals(s), [])
            self.assertEqual(len(s["changes"]), 1, s["changes"])
            self.assertEqual(len(s["changes"][0]["before"]), 2)
            self.assertEqual([f"{a['friction']:g}" for a in s["changes"][0]["after"]], after)

    def test_a_support_added_in_caesar_ii_identical_to_the_xml_nodes_is_not_written_twice(self):
        b = self.xml_support_node()
        w = b["written"][0]
        cii = edited(self.cii, b["cii"], add=(w["type"], tuple(w["cosines"])))
        nl = "\r\n" if "\r\n" in cii else "\n"
        lines = cii.split(nl)
        j = slot_line(lines, b["cii"], 1)
        lines[j] = field(lines[j], 4, f"{w['friction']:13.6f}")      # the copy equals the XML's support
        s = self.supports(nl.join(lines))
        self.assertEqual(s["changes"], [])
        self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_ALREADY_ON_NODE"])

    # PR 311 review round 2 ------------------------------------------------------------------------------------------
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
        """An XML GUI without cosines, written by step 10 along X: a second guide along Z is new, a copy along X is not."""
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
        s = run(self.slot(edited(guide, 50, add=(8, (0.0, 0.0, 1.0))), 1, 4, f"{0.3:13.6f}"))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([[o["op"] for o in c["restraints"]] for c in s["changes"]], [["keep", "add"]])
        s = run(self.slot(edited(guide, 50, add=(8, (1.0, 0.0, 0.0))), 1, 4, f"{0.3:13.6f}"))
        self.assertEqual(s["changes"], [])
        self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_ALREADY_ON_NODE"])

    def test_copies_step_10_listed_one_by_one_are_changed_all_or_refused(self):
        """The sidecar lists node 50's support twice (step 10 did not merge them): CAESAR II changing one copy is refused
        (the XML cannot tell the copies apart); deleting both removes both."""
        side, b, run = self.node50(copies=1)
        b["written"].append(dict(b["written"][0]))
        w = b["written"][0]
        two = self.slot(edited(self.cii, 50, add=(w["type"], tuple(w["cosines"]))), 1, 4, f"{w['friction']:13.6f}")
        self.assertEqual(run(two)["changes"], [])
        for cii in (self.slot(two, 1, 0, f"{0:13.6f}"), self.slot(two, 1, 4, f"{0.1:13.6f}")):
            s = run(cii)
            self.assertEqual(s["changes"], [])
            self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_SOME_COPIES_CHANGED"])
        s = run(self.slot(self.slot(two, 1, 0, f"{0:13.6f}"), 0, 0, f"{0:13.6f}"))
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([[o["op"] for o in c["restraints"]] for c in s["changes"]], [["remove", "remove"]])

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
        """Step 3d (review of PR 312 N1): the direction-less guide also stands for Z, so a change of the Z guide removes
        it too, and the X guide CAESAR II keeps is written back with its direction (step 3c kept it without cosines)."""
        run = self.at50([self.restraint("GUI"), self.restraint("GUI", self.Z)], [(8, self.X), (8, self.Z)])
        self.assertEqual(run([(8, self.X, 0.3), (8, self.Z, 0.3)])["changes"], [])
        s = run([(8, self.X, 0.3)])
        self.assertEqual(self.ops(s), [("edit", "0.000000000", "0.3"), ("remove", None, None)])
        self.assertEqual(self.wrote(s), [(8, self.X, 0.3)])
        self.assertEqual(self.ops(run([(8, self.Z, 0.3)])), [("remove", None, None), ("keep", None, None)])
        s = run([(8, self.X, 0.3), (8, self.Z, 0.1)])
        self.assertEqual(self.ops(s), [("edit", "0.000000000", "0.3"), ("edit", "1.000000000", "0.1")])
        self.assertEqual(self.wrote(s), [(8, self.Z, 0.1), (8, self.X, 0.3)])

    def test_a_guide_without_cosines_merged_with_an_identical_one_with_cosines(self):
        """Review of PR 312 N1 (layout C): an XML GUI without cosines and an identical GUI along X; step 10 merged them
        and wrote one GUI X. A delete removes both, an edit leaves one guide."""
        for blocks in ([self.restraint("GUI"), self.restraint("GUI", self.X)], [self.restraint("GUI", self.X), self.restraint("GUI")]):
            run = self.at50(blocks, [(8, self.X)])
            self.assertEqual(run([(8, self.X, 0.3)])["changes"], [])
            s = run([None])
            self.assertEqual(self.listed_refusals(s), [])
            self.assertEqual([c["kind"] for c in s["changes"]], ["removed"])
            self.assertEqual(self.wrote(run([(8, self.X, 0.1)])), [(8, self.X, 0.1)])
            self.assertEqual(self.wrote(run([(8, self.Z, 0.3)])), [(8, self.Z, 0.3)])

    def test_identical_guides_written_in_two_directions_change_together(self):
        """Review of PR 312 N2 and N3 (layout K4): two identical GUIs without cosines, written as X and Z. Changing both,
        or one while the other is deleted, is carried (was NOT_ON_NODE). X turned to Z gives one Z guide; step 3e: with a
        row saying CAESAR II's second Z is written once (review of PR 313 round 2 N1)."""
        Y = (0.0, 1.0, 0.0)
        run = self.at50([self.restraint("GUI"), self.restraint("GUI")], [(8, self.X), (8, self.Z)])
        for slots, want in (([(8, self.X, 0.1), (8, self.Z, 0.1)], [(8, self.Z, 0.1), (8, self.X, 0.1)]),
                            ([(8, Y, 0.3)], [(8, Y, 0.3)]),
                            ([(8, self.X, 0.1), (8, Y, 0.3)], [(8, Y, 0.3), (8, self.X, 0.1)])):
            s = run(slots)
            self.assertEqual(self.listed_refusals(s), [], slots)
            self.assertEqual(self.wrote(s), sorted(want), slots)
        s = run([(8, self.Z, 0.3), (8, self.Z, 0.3)])
        self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_COPIES_WRITTEN_ONCE"])
        self.assertEqual(self.wrote(s), [(8, self.Z, 0.3)])
        s = run([None])
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([c["kind"] for c in s["changes"]], ["removed"])

    def test_copies_are_still_checked_for_a_support_a_removed_guide_stood_for(self):
        """Review of PR 313 N1: three identical GUIs without cosines, the sidecar lists Z once and X twice. Removing Z's
        restraints also removes the X copies they stood for, so CAESAR II changing only one X copy is refused, not lost."""
        Y = (0.0, 1.0, 0.0)
        run = self.at50([self.restraint("GUI")] * 3, [(8, self.Z), (8, self.X), (8, self.X)])
        self.assertEqual(run([(8, self.Z, 0.3), (8, self.X, 0.3), (8, self.X, 0.3)])["changes"], [])
        for slots in ([(8, self.X, 0.3), (8, Y, 0.3)], [(8, self.X, 0.3)], [(8, self.X, 0.3), (8, self.X, 0.1)]):
            s = run(slots)
            self.assertEqual(s["changes"], [], slots)
            self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_SOME_COPIES_CHANGED"], slots)
        s = run([None])
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual([c["kind"] for c in s["changes"]], ["removed"])

    def test_copies_caesar_ii_holds_twice_are_written_once_with_a_row(self):
        """Step 3e (review of PR 313 round 2 N1): three identical GUIs without cosines listed Z, X, X. CAESAR II deletes
        Z (and may edit both X copies alike): one GUI X is written, as step 10 writes identical supports once, and a row
        says CAESAR II's second copy is written once (step 3d wrote one copy with no row)."""
        run = self.at50([self.restraint("GUI")] * 3, [(8, self.Z), (8, self.X), (8, self.X)])
        for fr in (0.3, 0.1):
            s = run([(8, self.X, fr), (8, self.X, fr)])
            self.assertEqual([r["code"] for r in self.listed_refusals(s)], ["U2D_SUPPORT_COPIES_WRITTEN_ONCE"], fr)
            self.assertEqual(self.listed_refusals(s)[0]["after"], [f"GUI, stiffness 1.7513E+12, friction {fr:g}, direction +X"])
            self.assertEqual(self.wrote(s), [(8, self.X, fr)], fr)

    def test_a_removed_twin_is_not_kept_as_a_repeat_of_a_written_back_guide(self):
        """Step 3e (review of PR 313 round 2 N2): four identical GUIs without cosines listed X, Y, Z and [0,0,0]; CAESAR
        II deletes Z. The guide without a direction is written back once, not kept four times next to GUI X and GUI Y."""
        Y, O = (0.0, 1.0, 0.0), (0.0, 0.0, 0.0)
        run = self.at50([self.restraint("GUI")] * 4, [(8, self.X), (8, Y), (8, self.Z), (8, O)])
        self.assertEqual(run([(8, self.X, 0.3), (8, Y, 0.3), (8, self.Z, 0.3), (8, O, 0.3)])["changes"], [])
        s = run([(8, self.X, 0.3), (8, Y, 0.3), (8, O, 0.3)])
        self.assertEqual(self.listed_refusals(s), [])
        self.assertEqual(len(s["changes"]), 1, s["changes"])
        after = s["changes"][0]["after"]
        self.assertEqual(sorted(repr(a["direction"] and tuple(a["direction"])) for a in after), sorted(map(repr, [None, self.X, Y])))
        self.assertEqual([o["op"] for o in s["changes"][0]["restraints"]], ["keep", "edit", "edit", "remove"])

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

    def test_identical_guides_written_in_two_directions_keep_the_one_caesar_ii_keeps(self):
        run = self.at50([self.restraint("GUI"), self.restraint("GUI")], [(8, self.X), (8, self.Z)])
        self.assertEqual(run([(8, self.X, 0.3), (8, self.Z, 0.3)])["changes"], [])
        self.assertEqual(self.ops(run([(8, self.X, 0.3)])), [("edit", "0.000000000", "0.3"), ("remove", None, None)])


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
