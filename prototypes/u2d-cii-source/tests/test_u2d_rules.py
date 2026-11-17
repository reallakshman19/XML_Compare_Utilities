"""Review 17 Nov 2026 rules: branch values only from paired elements (Owner), weight-unit guard."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from u2d_plan import check_weight_scale, paired_into  # noqa: E402


def element(a: str, b: str) -> dict:
    return {"E": [[a, b]]}


class BranchPairing(unittest.TestCase):
    pairs = {"10": [(0, 0)], "20": [(0, 1)], "30": [(1, 0), (0, 2)], "40": [(1, 1)]}

    def test_both_ends_matched_with_one_in_the_branch(self):
        self.assertTrue(paired_into(element("10", "20"), 0, self.pairs, {}))
        self.assertTrue(paired_into(element("30", "40"), 1, self.pairs, {}))  # first node on the parent branch

    def test_an_unmatched_end_or_another_branch_is_not_taken(self):
        self.assertFalse(paired_into(element("10", "99"), 0, self.pairs, {}))
        self.assertFalse(paired_into(element("10", "20"), 1, self.pairs, {}))


def weight(before: str, after: str) -> dict:
    return {"field": "Node/Weight", "before": before, "after": after}


class WeightScale(unittest.TestCase):
    def test_mostly_tenfold_weights_are_refused(self):
        edits = [weight(str(w), str(w * 10)) for w in (365, 346.25, 17, 59, 29)]
        with self.assertRaisesRegex(ValueError, "U2D_WEIGHT_SCALE_SUSPECT"):
            check_weight_scale(edits, 1.0)

    def test_real_weight_changes_pass(self):
        edits = [weight("365", "370"), weight("17", "17.5"), weight("59", "590"), weight("29", "30"), weight("10", "12")]
        check_weight_scale(edits, 10.0)
        check_weight_scale([weight("1", "10")] * 4, 10.0)  # fewer than 5: not judged


if __name__ == "__main__":
    unittest.main()
