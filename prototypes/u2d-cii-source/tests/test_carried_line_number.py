"""CAESAR II writes an element's line number only where it changes (Owner 19 Nov 2026: "populating each sentinel
values back to UXML"): u3b_core.carry_line_numbers gives every element its explicit line number and where it was written."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "u3b-cii-check"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from u3b_core import carry_line_numbers  # noqa: E402
from u2d_plan import branch_values, case_cell, cii_source, element_branch  # noqa: E402


def el(a, b, field):
    return {"E": [[f"{a}.0000", f"{b}.0000"]] + [[]] * 9 + [field, ""]}


NAMED = "          24 /GF30-01-8\"-P0001-A1A/B1          "
EMPTY = "           0                                  "


class CarriedLineNumber(unittest.TestCase):
    def test_empty_field_is_the_previous_elements(self):
        els = [el(10, 20, NAMED), el(20, 30, EMPTY), el(30, 40, EMPTY),
               el(40, 50, "           9 /OTHER/B1         "), el(50, 60, EMPTY)]
        carry_line_numbers(els)
        self.assertEqual([e["lineNumber"] for e in els],
                         ['/GF30-01-8"-P0001-A1A/B1'] * 3 + ["/OTHER/B1"] * 2)
        self.assertEqual([e["lineNumberOn"] for e in els], ["10-20", "10-20", "10-20", "40-50", "40-50"])
        self.assertEqual(element_branch(els[2]), '/GF30-01-8"-P0001-A1A/B1')

    def test_no_line_number_before_the_first_written_one(self):
        els = [el(10, 20, EMPTY), el(20, 30, NAMED)]
        carry_line_numbers(els)
        self.assertEqual([e["lineNumber"] for e in els], ["", '/GF30-01-8"-P0001-A1A/B1'])
        self.assertIsNone(els[0]["lineNumberOn"])
        self.assertIsNone(element_branch(els[0]))

    def test_carried_across_a_jump_is_marked(self):
        # Review of PR 296 (S1): CAESAR II carries across a jump to a tee run 20-500, 500-510; it is marked so the
        # transfer takes it for branch A only if both ends are on A.
        els = [el(10, 20, NAMED), el(20, 30, EMPTY), el(20, 500, EMPTY), el(500, 510, EMPTY),
               el(500, 520, "           6 /T/B1                 ")]
        carry_line_numbers(els)
        self.assertEqual([e["lineNumber"] for e in els], ['/GF30-01-8"-P0001-A1A/B1'] * 4 + ["/T/B1"])
        self.assertEqual([e["lineNumberAcrossJump"] for e in els], [False, False, True, True, False])

    def test_unreadable_field_is_no_line_number_and_breaks_the_carry(self):
        els = [el(10, 20, NAMED), el(20, 30, "          1B                    "), el(30, 40, EMPTY)]
        carry_line_numbers(els)
        self.assertEqual([e["lineNumber"] for e in els], ['/GF30-01-8"-P0001-A1A/B1', "", ""])

    def test_tee_run_across_a_jump_is_refused_not_taken_for_the_branch_before(self):
        # Review of PR 296 (S1): tee T off node 20 of A, no line number written for T (CAESAR II carries A's); the
        # engineer sets T's T1 to 200. A keeps its own 100, 20-500 is not among A's sources, and the run is reported.
        li, ci = case_cell("Temperature", 1)
        def at(a, b, field, t1):
            e = el(a, b, field)
            e["E"] = [e["E"][0] + [""] * 4] + [[""] * 6 for _ in range(9)] + e["E"][10:]
            e["E"][li][ci] = str(t1)
            e["material"] = None
            return e
        els = [at(10, 20, "           1 A", 100), at(20, 30, EMPTY, 100), at(20, 500, EMPTY, 200), at(500, 510, EMPTY, 200)]
        carry_line_numbers(els)
        brs = {0: {"name": "A", "values": {}}, 1: {"name": "T", "values": {}}}
        pairs = {"10": [(0, 0)], "20": [(0, 1), (1, 0)], "30": [(0, 2)], "500": [(1, 1)], "510": [(1, 2)]}
        sources = {}
        want, refused = branch_values({"elements": els}, brs, pairs, {}, sources)
        self.assertEqual(want, {(0, "Branch/Temperature/Temperature1"): {"100"}})
        self.assertEqual([e for e, _ in sources[(0, "Branch/Temperature/Temperature1")]], ["10-20", "20-30"])
        jump = [r for r in refused if r["code"] == "U2D_LINE_NUMBER_ACROSS_JUMP"]
        self.assertEqual([(r["elements"], r["first"]) for r in jump], [(2, ["20-500", "500-510"])])

    def test_source_lists_carried_elements_only(self):
        self.assertEqual(cii_source([["10-20", "10-20"], ["20-30", "10-20"]]),
                         {"elements": ["10-20", "20-30"], "lineNumberCarried": {"20-30": "10-20"}})


if __name__ == "__main__":
    unittest.main()
