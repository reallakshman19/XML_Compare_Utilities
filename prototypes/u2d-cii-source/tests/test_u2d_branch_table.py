"""T3 (Owner 22 Nov 2026, T plan: "the branch table is filled from the ids and the user changes only what is wrong"):
with step 10's CII sidecar, branch values (Temperature, Pressure, material) find their XML branch through the node ids
of the CII line's elements, not through the line name.

Inputs: fixtures/uxml-v2-transfer/{EF05,BM2}-on (step 10 with "Engine reads UXML" on and its sidecar). CAESAR II edits
are scripted on step10.cii: a line renamed on the element it is written on, Temperature 1 raised on a line's elements.
Checks: untouched, every line maps to the branch of its own name and gives today's edits; a renamed line still goes to
its branch; a user row moves one line's values to another branch or skips them; a bad table is refused.
"""
from __future__ import annotations

import shutil
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
from test_u2d_by_id import ELEMENT_LINES, FIX, load, section  # noqa: E402
from test_u2d_supports import match_for  # noqa: E402
from u2d_plan import branch_table, parse_cii, plan, read_target  # noqa: E402

T1 = "Branch/Temperature/Temperature1"


@unittest.skipUnless(shutil.which("node"), "node missing: NOT_RUN")
class BranchTable(unittest.TestCase):
    MODEL = "EF05"

    @classmethod
    def setUpClass(cls):
        cls.xml, cls.cii, cls.sidecar = load(cls.MODEL)
        cls.match = match_for(FIX / f"{cls.MODEL}-on" / "enriched.xml", cls.cii)
        cls.brs = read_target(cls.xml)[1]
        cls.lines = [el["lineNumber"] for el in parse_cii(cls.cii)["elements"]]

    def run_plan(self, cii: str, branch_map=None, sidecar="same") -> dict:
        match = self.match if cii == self.cii else match_for(FIX / f"{self.MODEL}-on" / "enriched.xml", cii)
        return plan(self.xml, cii, match, 10.0, sidecar=self.sidecar if sidecar == "same" else sidecar,
                    branch_map=branch_map)

    def edited(self, raise_on: set, rename: dict | None = None) -> str:
        """step10.cii with Temperature 1 raised by 10 on every element of the lines `raise_on`, and the line names in
        `rename` {old: new} changed on the elements they are written on."""
        rows = self.cii.split("\n")
        el = section(rows, "ELEMENTS")
        for k, line in enumerate(self.lines):
            if line in raise_on:
                r = rows[el + k * ELEMENT_LINES + 1]
                t1 = float(r[15 + 13 * 2:15 + 13 * 3])
                rows[el + k * ELEMENT_LINES + 1] = r[:15 + 13 * 2] + f"{t1 + 10:.3f}".rjust(13) + r[15 + 13 * 3:]
            i = el + k * ELEMENT_LINES + 10
            text = rows[i].rstrip("\r")
            for old, new in (rename or {}).items():
                if text.strip() == f"{len(old)} {old}":
                    end = "\r" if rows[i].endswith("\r") else ""
                    rows[i] = text.replace(f"{len(old)} {old}", f"{len(new)} {new}") + end
        out = "\n".join(rows)
        self.assertNotEqual(out, self.cii)
        return out

    def t1_branches(self, r: dict) -> set:
        return {e["ref"]["branchName"] for e in r["edits"] if e["field"] == T1}

    def test_untouched_every_line_maps_to_its_own_branch_and_today_s_edits_hold(self):
        r = self.run_plan(self.cii)
        rows = r["branchTable"]
        self.assertEqual(len(rows), len({x for x in self.lines if x}))
        self.assertEqual([x for x in rows if x["by"] != "ids" or x["branches"] != [x["line"]]], [])
        same = plan(self.xml, self.cii, self.match, 10.0, sidecar=self.sidecar, branch_map={})
        self.assertEqual(r["edits"], same["edits"])
        self.assertEqual(sum(x["elements"] for x in rows), sum(1 for x in self.lines if x))
        self.assertEqual(r["xmlBranches"], [{"ordinal": bi, "name": x["name"]} for bi, x in sorted(self.brs.items())])

    def test_a_line_on_two_branches_is_refused_not_split(self):
        """Review of PR 318 (4): CAESAR II names line a's elements after line b, so line b lands on two branches.
        Its values are refused (U2D_BRANCH_LINE_SPLIT), none is written on either branch."""
        a, b = sorted({x for x in self.lines if x})[:2]
        r = self.run_plan(self.edited({a, b}, {a: b}))
        row = next(x for x in r["branchTable"] if x["line"] == b)
        self.assertEqual(sorted(row["branches"]), sorted([a, b]))
        self.assertIn(("U2D_BRANCH_LINE_SPLIT", b), {(x["code"], x.get("branch")) for x in r["refused"]})
        self.assertEqual(self.t1_branches(r), set())

    def test_a_line_renamed_in_caesar_ii_still_goes_to_its_branch(self):
        line = sorted({x for x in self.lines if x})[0]
        cii = self.edited({line}, {line: "RENAMED-IN-CAESAR-II"})
        r = self.run_plan(cii)
        row = next(x for x in r["branchTable"] if x["line"] == "RENAMED-IN-CAESAR-II")
        self.assertEqual((row["branches"], row["by"]), ([line], "ids"))
        self.assertEqual(self.t1_branches(r), {line})
        without = self.run_plan(cii, sidecar=None)
        self.assertEqual(self.t1_branches(without), set(), "by name the renamed line finds no branch")

    def test_a_user_row_moves_one_line_or_skips_it(self):
        a, b = sorted({x for x in self.lines if x})[:2]
        ordinal = {x["name"]: bi for bi, x in self.brs.items()}
        one = self.edited({a})
        self.assertEqual(self.t1_branches(self.run_plan(one)), {a})
        # line a mapped onto branch b: a's raised Temperature 1 meets b's own there, so b's value splits; a gets none
        moved = self.run_plan(one, {a: ordinal[b]})
        self.assertEqual(next(x for x in moved["branchTable"] if x["line"] == a)["by"], "user")
        self.assertEqual(self.t1_branches(moved), set())
        splits = {(x.get("branch"), x.get("field")) for x in moved["refused"] if x["code"] == "U2D_BRANCH_FIELD_SPLIT"}
        self.assertIn((b, T1), splits)
        cii = self.edited({a, b})
        self.assertEqual(self.t1_branches(self.run_plan(cii)), {a, b})
        skipped = self.run_plan(cii, {a: None})
        self.assertEqual(self.t1_branches(skipped), {b})
        self.assertEqual([e for e in skipped["edits"] if not e["field"].startswith("Branch/")],
                         [e for e in self.run_plan(cii)["edits"] if not e["field"].startswith("Branch/")],
                         "skipping a line keeps its node values")

    def test_a_bad_table_is_refused(self):
        line = next(x for x in self.lines if x)
        for bad in ({"NO-SUCH-LINE": 0}, {line: 10 ** 6}, {line: "1"}, {line: True}, [], "x"):
            with self.assertRaisesRegex(ValueError, "^U2D_BRANCH_MAP_INVALID"):
                self.run_plan(self.cii, bad)
        with self.assertRaisesRegex(ValueError, "^U2D_BRANCH_MAP_INVALID"):
            self.run_plan(self.cii, {line: 0}, sidecar=None)


class BranchTableByToEnd(unittest.TestCase):
    def test_an_element_goes_by_its_to_end(self):
        """Review of PR 318 (5): an element whose ends lie on two branches (a branch's first element starts on the
        branch before it) belongs to the branch of its "to" end. Neither fixture has one, so a small table here."""
        cii = {"elements": [{"lineNumber": "L1"}, {"lineNumber": "L2"}, {"lineNumber": "L2"}, {"lineNumber": None}]}
        ids = {"ends": [((0, 0), (0, 1)), ((0, 1), (1, 0)), ((1, 0), (1, 1)), ((1, 1), (2, 0))]}
        self.assertEqual(branch_table(cii, ids), {"L1": {"branches": [0], "by": "ids", "elements": 1},
                                                  "L2": {"branches": [1], "by": "ids", "elements": 2}})
        self.assertEqual(branch_table(cii, ids, {"L2": None})["L2"], {"branches": [], "by": "user", "elements": 2})


class BranchTableBm2(BranchTable):
    MODEL = "BM2"


if __name__ == "__main__":
    unittest.main()
