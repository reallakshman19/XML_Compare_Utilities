"""Permanent tests from the independent review of 5fd1e0c3 (probes P0-P7, P1c).
Public RMS-BLOW-1 only. Each case builds base/revised XML and a receipt, converts with the
real converter, optionally tampers the revised CII (a converter that does not carry a value
or changes something else), and calls u3b_check.check(). False PASS = test failure.
"""
from __future__ import annotations

import hashlib
import re
import shutil
import tempfile
import unittest
from pathlib import Path

from test_u3b import BENCH, CONVERTER
import u3b_check
from u3b_core import convert, parse_cii, sections_of, xml_nodes

sha = lambda b: hashlib.sha256(b).hexdigest()  # noqa: E731


def node_span(text, number, refno):
    for m in re.finditer(r"<Node>.*?</Node>", text, re.S):
        if f"<NodeNumber>{number}</NodeNumber>" in m.group(0) and f"<ComponentRefNo>{refno}</ComponentRefNo>" in m.group(0):
            return m.start(), m.end()
    raise KeyError((number, refno))


def set_node(text, number, refno, tag, value):
    a, b = node_span(text, number, refno)
    blk, n = re.subn(rf"<{tag}>[^<]*</{tag}>", f"<{tag}>{value}</{tag}>", text[a:b], count=1)
    assert n == 1
    return text[:a] + blk + text[b:]


def branches(text):
    return list(re.finditer(r"<Branch>.*?</Branch>", text, re.S))


def set_branch(text, bi, tag, value):
    b = branches(text)[bi]
    blk, n = re.subn(rf"<{tag}>[^<]*</{tag}>", f"<{tag}>{value}</{tag}>", b.group(0), count=1)
    assert n == 1
    return text[:b.start()] + blk + text[b.end():]


def ref_of(xmlb, number, refno):
    for (bi, ni), n in xml_nodes(xmlb).items():
        if n["numberText"] == str(number) and n["ref"] == refno:
            return {"branchOrdinal": bi, "branchName": n["branch"], "nodeOrdinal": ni, "nodeNumber": n["numberText"], "componentRefNo": refno}
    raise KeyError(number)


def bref(xmlb, bi):
    n = next(n for (b, _), n in sorted(xml_nodes(xmlb).items()) if b == bi)
    return {"branchOrdinal": bi, "branchName": n["branch"], "nodeOrdinal": 0, "nodeNumber": n["numberText"], "componentRefNo": n["ref"]}


def _pos(ci):
    return (0, 15) if ci == 0 else (15 + 13 * (ci - 1), 13)


def tamper_line(cii, sec, k_rel, ci, value):
    lines = cii.splitlines(keepends=True)
    k = next(i for i, l in enumerate(lines) if l.startswith(f"#$ {sec}")) + 1 + k_rel
    a, w = _pos(ci)
    lines[k] = lines[k][:a] + value.rjust(w) + lines[k][a + w:]
    return "".join(lines)


def tamper(cii, el, li, ci, value):
    return tamper_line(cii, "ELEMENTS", el * 15 + li, ci, value)


def cell(cii, el, li, ci):
    lines = cii.splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith("#$ ELEMENTS")) + 1
    a, w = _pos(ci)
    return lines[start + el * 15 + li][a:a + w].strip()


def receipt(bb, rb, changes):
    return {"format": "u2.transfer-receipt", "base": {"sha256": sha(bb)}, "revised": {"sha256": sha(rb)}, "changes": changes}


@unittest.skipUnless(BENCH.exists(), "3D_Converters checkout missing: NOT_RUN")
class ReviewProbes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp(prefix="u3b-probes-"))
        cls.src = BENCH.read_bytes().decode("utf-8-sig")
        cls.BB, cls.BC, cls.BE = cls.conv("bench", cls.src)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    @classmethod
    def conv(cls, name, text):
        p = cls.tmp / f"{name}.xml"
        p.write_bytes(text.encode("utf-8"))
        e = convert(CONVERTER.resolve(), p.resolve(), cls.tmp / f"{name}.cii", cls.tmp / f"{name}.json")
        return p.read_bytes(), (cls.tmp / f"{name}.cii").read_text(encoding="utf-8"), e

    def verdict(self, bb, rb, ch, bc, rc, be, re_):
        return u3b_check.check(bb, rb, receipt(bb, rb, ch), bc, rc, be, re_)["verdict"]

    def test_p0_identical_files_pass(self):
        self.assertEqual(self.verdict(self.BB, self.BB, [], self.BC, self.BC, self.BE, self.BE), "PASS")

    def test_p1_od_must_be_on_the_elements_that_take_it(self):
        b1, c1, e1 = self.conv("p1base", set_node(self.src, 100, "=67132086/1665", "OutsideDiameter", "300"))
        ch = [{"field": "Node/OutsideDiameter", "before": "300", "after": "355.6", "ref": ref_of(self.BB, 100, "=67132086/1665")}]
        self.assertEqual(self.verdict(b1, self.BB, ch, c1, self.BC, e1, self.BE), "PASS")
        i5 = next(i for i, e in enumerate(self.BE) if e["from"]["number"] == 100)
        bad = tamper(self.BC, i5, 0, 5, cell(c1, i5, 0, 5))
        self.assertEqual(self.verdict(b1, self.BB, ch, c1, bad, e1, self.BE), "FAIL")

    def test_p1c_od_not_taken_from_this_node_is_not_reported_carried(self):
        b, c, e = self.conv("p1cbase", set_node(self.src, 680, "=67132086/491", "OutsideDiameter", "50"))
        ch = [{"field": "Node/OutsideDiameter", "before": "50", "after": "60.3", "ref": ref_of(self.BB, 680, "=67132086/491")}]
        rep = u3b_check.check(b, self.BB, receipt(b, self.BB, ch), c, self.BC, e, self.BE)
        self.assertNotEqual(rep["rows"][0]["status"], "CARRIED")

    def test_p2_material_change_elsewhere_is_unexplained(self):
        r2, c2, e2 = self.conv("p2rev", set_branch(self.src, 2, "MaterialNumber", "106"))
        ch = [{"field": "Branch/MaterialNumber", "before": "0", "after": "106", "ref": bref(self.BB, 2)}]
        self.assertEqual(self.verdict(self.BB, r2, ch, self.BC, c2, self.BE, e2), "PASS")
        bad = tamper_line(c2, "MISCEL_1", 0, 0, "999.000")
        self.assertEqual(self.verdict(self.BB, r2, ch, self.BC, bad, self.BE, e2), "FAIL")

    def test_p3_pointer_moves_are_unexplained(self):
        n = len(self.BE)
        rest = [i for i in range(n) if cell(self.BC, i, 12, 3) not in ("0", "")]
        i, j = rest[0], next(k for k in range(n) if k not in rest)
        moved = tamper(tamper(self.BC, i, 12, 3, "0"), j, 12, 3, cell(self.BC, i, 12, 3))
        bend = next(k for k in range(n) if cell(self.BC, k, 12, 0) not in ("0", ""))
        sif = next(k for k in range(n) if cell(self.BC, k, 13, 4) not in ("0", ""))
        for bad in (moved, tamper(self.BC, bend, 12, 0, "0"), tamper(self.BC, sif, 13, 4, "0")):
            self.assertEqual(self.verdict(self.BB, self.BB, [], self.BC, bad, self.BE, self.BE), "FAIL")

    def test_p4_values_inside_a_rebuilt_block_and_control_are_checked(self):
        pc = parse_cii(self.BC)
        k0 = next(k for k in range(len(self.BE)) if pc["elements"][k]["rigid"] is not None and self.BE[k]["to"]["number"] > 0)
        tn = self.BE[k0]["to"]
        r4, c4, e4 = self.conv("p4rev", set_node(self.src, tn["number"], tn["ref"], "Weight", "123.5"))
        ch = [{"field": "Node/Weight", "before": "0", "after": "123.5", "ref": ref_of(self.BB, tn["number"], tn["ref"])}]
        self.assertEqual(self.verdict(self.BB, r4, ch, self.BC, c4, self.BE, e4), "PASS")
        t = u3b_check.align(self.BE, e4)[1][0]["revised"][0]
        self.assertEqual(self.verdict(self.BB, r4, ch, self.BC, tamper(tamper(c4, t, 1, 3, "999.000"), t, 0, 5, "10.0000"), self.BE, e4), "FAIL")
        self.assertEqual(self.verdict(self.BB, r4, ch, self.BC, tamper_line(c4, "CONTROL", 1, 2, "7"), self.BE, e4), "FAIL")

    def test_p5_od_does_not_waive_unrelated_section_rows(self):
        r5, c5, e5 = self.conv("p5rev", set_node(self.src, 100, "=67132086/1665", "OutsideDiameter", "355.60"))
        ch = [{"field": "Node/OutsideDiameter", "before": "355.6", "after": "355.60", "ref": ref_of(self.BB, 100, "=67132086/1665")}]
        secs = sections_of(c5)
        tsec = next(s for s in ("BEND", "SIF&TEES", "REDUCERS") if any(l.strip() for l in secs[s]))
        self.assertEqual(self.verdict(self.BB, r5, ch, self.BC, tamper_line(c5, tsec, 0, 0, "777.000"), self.BE, e5), "FAIL")

    def test_p6_shared_branch_names_fail(self):
        names = [re.search(r"<Branchname>([^<]*)</Branchname>", b.group(0)).group(1) for b in branches(self.src)]
        coll = self.src.replace(f"<Branchname>{names[2]}</Branchname>", f"<Branchname>{names[1]}</Branchname>", 1)
        b6, c6, e6 = self.conv("p6base", coll)
        r6, c6r, e6r = self.conv("p6rev", set_branch(coll, 2, "Temperature1", "180"))
        ch = [{"field": "Branch/Temperature/Temperature1", "before": "-100000", "after": "180", "ref": bref(b6, 2)}]
        self.assertEqual(self.verdict(b6, r6, ch, c6, c6r, e6, e6r), "FAIL")

    def test_p7_every_rigid_cell_is_compared(self):
        bad = tamper_line(self.BC, "RIGID", 0, 1, "5.00000")
        self.assertEqual(self.verdict(self.BB, self.BB, [], self.BC, bad, self.BE, self.BE), "FAIL")

    def test_material_carries_forward_through_a_weighted_split(self):
        pc = parse_cii(self.BC)
        k0 = next(k for k in range(len(self.BE)) if pc["elements"][k]["rigid"] is not None and self.BE[k]["to"]["number"] > 0
                  and self.BE[k]["branch"] != self.BE[0]["branch"])
        tn = self.BE[k0]["to"]
        text = set_node(set_branch(self.src, 0, "MaterialNumber", "106"), tn["number"], tn["ref"], "Weight", "55.5")
        r, c, e = self.conv("carry", text)
        ch = [{"field": "Branch/MaterialNumber", "before": "0", "after": "106", "ref": bref(self.BB, 0)},
              {"field": "Node/Weight", "before": "0", "after": "55.5", "ref": ref_of(self.BB, tn["number"], tn["ref"])}]
        rep = u3b_check.check(self.BB, r, receipt(self.BB, r, ch), self.BC, c, self.BE, e)
        self.assertEqual(rep["verdict"], "PASS", rep["unexplainedCiiChanges"][:3])
        self.assertTrue(rep["structureChanges"])
        last = len(e) - 1
        bad = tamper_line(c, "MISCEL_1", last // 6, last % 6, "107.000")
        self.assertEqual(u3b_check.check(self.BB, r, receipt(self.BB, r, ch), self.BC, bad, self.BE, e)["verdict"], "FAIL")

    def split(self):
        tn = self.BE[0]["to"]
        r4, c4, e4 = self.conv("r1rev", set_node(self.src, tn["number"], tn["ref"], "Weight", "123.5"))
        ch = [{"field": "Node/Weight", "before": "0", "after": "123.5", "ref": ref_of(self.BB, tn["number"], tn["ref"])}]
        return r4, c4, e4, ch

    def test_r1_record_pointers_stay_exact_when_a_split_exists(self):
        r4, c4, e4, ch = self.split()
        self.assertEqual(self.verdict(self.BB, r4, ch, self.BC, c4, self.BE, e4), "PASS")
        for li, ci in ((12, 3), (12, 0)):
            held = [k for k in range(2, len(e4)) if cell(c4, k, li, ci) not in ("0", "")]
            a, b = held[0], held[-1]
            bad = tamper(tamper(c4, a, li, ci, cell(c4, b, li, ci)), b, li, ci, cell(c4, a, li, ci))
            self.assertEqual(self.verdict(self.BB, r4, ch, self.BC, bad, self.BE, e4), "FAIL", (li, ci))

    def test_r1_restraint_stays_on_its_half_and_halves_stay_on_the_line(self):
        r4, c4, e4, ch = self.split()
        h0, h1 = cell(c4, 0, 12, 3), cell(c4, 1, 12, 3)
        moved = tamper(tamper(c4, 0, 12, 3, h1), 1, 12, 3, h0)
        self.assertEqual(self.verdict(self.BB, r4, ch, self.BC, moved, self.BE, e4), "FAIL")
        dy0, dy1 = float(cell(c4, 0, 0, 3)), float(cell(c4, 1, 0, 3))
        off = tamper(tamper(c4, 0, 0, 3, f"{dy0 + 500:.4f}"), 1, 0, 3, f"{dy1 - 500:.4f}")
        self.assertEqual(self.verdict(self.BB, r4, ch, self.BC, off, self.BE, e4), "FAIL")

    def test_r1_section_rows_change_only_through_their_own_element(self):
        r5, c5, e5 = self.conv("r1od", set_node(self.src, 100, "=67132086/1665", "OutsideDiameter", "300"))
        ch = [{"field": "Node/OutsideDiameter", "before": "355.6", "after": "300", "ref": ref_of(self.BB, 100, "=67132086/1665")}]
        self.assertEqual(self.verdict(self.BB, r5, ch, self.BC, c5, self.BE, e5), "PASS")
        secs = sections_of(c5)
        for s in ("BEND", "REDUCERS"):
            if any(l.strip() for l in secs[s]):
                self.assertEqual(self.verdict(self.BB, r5, ch, self.BC, tamper_line(c5, s, 0, 0, "300.000"), self.BE, e5), "FAIL", s)

    def test_sentinels_and_zero_wall_expectations(self):
        self.assertEqual(u3b_check.expected_cii("Branch/Pressure/Pressure3", "-100000"), 0.0)
        self.assertEqual(u3b_check.expected_cii("Branch/Temperature/Temperature2", "-100000"), 0.0)
        self.assertEqual(u3b_check.expected_cii("Node/WallThickness", "0"), 0.01)


if __name__ == "__main__":
    unittest.main()
