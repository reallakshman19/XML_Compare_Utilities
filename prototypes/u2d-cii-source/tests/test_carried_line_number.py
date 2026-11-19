"""CAESAR II writes an element's line number only where it changes (Owner 19 Nov 2026: "populating each sentinel
values back to UXML"): u3b_core.carry_line_numbers gives every element its explicit line number and where it was written."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "u3b-cii-check"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from u3b_core import carry_line_numbers  # noqa: E402
from u2d_plan import cii_source, element_branch  # noqa: E402


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

    def test_source_lists_carried_elements_only(self):
        self.assertEqual(cii_source([["10-20", "10-20"], ["20-30", "10-20"]]),
                         {"elements": ["10-20", "20-30"], "lineNumberCarried": {"20-30": "10-20"}})


if __name__ == "__main__":
    unittest.main()
