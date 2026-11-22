"""E4b step 1 (Owner 21 Nov 2026, "Yes, as suggested"): the transfer keeps the "|" names.

Step 10 joins the names of duplicate nodes at one point with "|" in the Enriched XML and gives the CII only the first
name. So a CII name equal to that first name is no change; a rename in CAESAR II replaces the first name and the
others stay. EF-05 sample files (step 10's Enriched XML and CII) with "|" names written in.

    python -E -s -m unittest tests.test_u2d_joined_names -v     (node on PATH)
"""
from __future__ import annotations

import re
import shutil
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from test_u2d_supports import EF05, match_for  # noqa: E402
from u2d_plan import NAME_LIMIT, differs, plan, written  # noqa: E402


def names(r: dict) -> list:
    return [e for e in r["edits"] if e["field"] == "Node/NodeName"]


class Rule(unittest.TestCase):
    def test_a_cii_name_equal_to_the_first_name_is_no_change(self):
        self.assertFalse(differs("Node/NodeName", "A|B|C", "A"))
        self.assertTrue(differs("Node/NodeName", "A|B", "Z"))
        long = "N" * (NAME_LIMIT + 5)
        self.assertFalse(differs("Node/NodeName", long + "|B", long[:NAME_LIMIT]), "the CII's 25 characters of the first name")

    def test_a_rename_replaces_the_first_name_and_the_others_stay(self):
        self.assertEqual(written("Node/NodeName", "A|B|C", "Z"), "Z|B|C")
        self.assertEqual(written("Node/NodeName", "A", "Z"), "Z")
        self.assertEqual(written("Node/Weight", "1|2", "3"), "3")

    def test_a_locked_name_written_back_whole_is_no_change(self):
        # E4b review B1: after a transfer the "|" name is locked and step 10 gives the CII the whole name.
        self.assertFalse(differs("Node/NodeName", "Z|B|C", "Z|B|C"))
        long = "R" * 14 + "|SL-142001.2"
        self.assertFalse(differs("Node/NodeName", long, long[:NAME_LIMIT]), "the CII's 25 characters of the whole name")
        self.assertTrue(differs("Node/NodeName", "A|B", "Z|B"), "a rename of a whole name is still a change")
        self.assertEqual(written("Node/NodeName", "A|B", "Z|B"), "Z|B", "a whole name is taken as it is")

    def test_names_without_bar_keep_todays_rule(self):
        self.assertFalse(differs("Node/NodeName", "A", "A"))
        self.assertTrue(differs("Node/NodeName", "A", "B"))
        long = "N" * (NAME_LIMIT + 5)
        self.assertFalse(differs("Node/NodeName", long, long[:NAME_LIMIT]))


@unittest.skipUnless(shutil.which("node"), "node missing: NOT_RUN")
class JoinedNamesOnEf05(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.xml = (EF05 / "base.xml").read_bytes()
        cls.cii = (EF05 / "source.cii").read_text(encoding="utf-8")
        cls.match = match_for(EF05 / "base.xml", cls.cii)
        cls.base = plan(cls.xml, cls.cii, cls.match, 10.0)
        text = cls.xml.decode("utf-8")
        # The first 6 named nodes get a "|" name, as step 10 writes for duplicate nodes it joined.
        assert names(cls.base) == [], "today's EF-05 sample has no name edits"
        spans = [m for m in re.finditer(r"<NodeName>([^<|]+)</NodeName>", text)][:40]
        cls.joined_at = spans[:6]
        assert len(cls.joined_at) == 6
        out, at = [], 0
        for m in cls.joined_at:
            out += [text[at:m.start(1)], m.group(1) + "|" + m.group(1) + ".J2|" + m.group(1) + ".J3"]
            at = m.end(1)
        cls.joined = (''.join(out) + text[at:]).encode("utf-8")

    def test_joined_names_give_no_edit_and_the_other_edits_are_todays(self):
        r = plan(self.joined, self.cii, self.match, 10.0)
        self.assertEqual(names(r), names(self.base))
        strip = lambda es: [(e["ref"]["nodeOrdinal"], e["field"], e["before"], e["after"]) for e in es]  # noqa: E731
        self.assertEqual(strip(r["edits"]), strip(self.base["edits"]))

    def test_a_rename_in_caesar_ii_is_still_transferred_and_keeps_the_others(self):
        # Wrong mode: the fix must not hide a real change. The XML's first name differs from the CII's on one node.
        m = self.joined_at[0]
        text = self.joined.decode("utf-8")
        old = m.group(1) + "|" + m.group(1) + ".J2|" + m.group(1) + ".J3"
        i = text.index("<NodeName>" + old + "</NodeName>") + len("<NodeName>")
        renamed = (text[:i] + "OLD-NAME" + text[i + len(m.group(1)):]).encode("utf-8")
        r = plan(renamed, self.cii, self.match, 10.0)
        mine = [e for e in names(r) if e["before"].startswith("OLD-NAME|")]
        self.assertEqual(len(mine), 1, names(r))
        self.assertEqual(mine[0]["after"], m.group(1) + "|" + m.group(1) + ".J2|" + m.group(1) + ".J3")

    def _cii_named(self, name: str, whole: str) -> str:
        # The CII's NODENAME fields are 25 wide; the whole name is written where the first name was.
        pad = lambda x: x[:NAME_LIMIT].ljust(NAME_LIMIT)  # noqa: E731
        assert pad(name) in self.cii
        return self.cii.replace(pad(name), pad(whole))

    def test_a_second_transfer_of_a_locked_name_makes_no_edit(self):
        # E4b review B1 round trip: the Enriched XML and the CII both hold the whole "|" name; nothing changed in
        # CAESAR II, so no edit and no refusal (short and cut names). A rename of that whole name is still transferred.
        m = self.joined_at[0]
        text = self.joined.decode("utf-8")
        was = m.group(1) + "|" + m.group(1) + ".J2|" + m.group(1) + ".J3"
        for whole in ("R1|J2", "RENAMED-142001|SL-142001.2"):
            xml = text.replace("<NodeName>" + was + "</NodeName>", "<NodeName>" + whole + "</NodeName>", 1).encode("utf-8")
            r = plan(xml, self._cii_named(m.group(1), whole), self.match, 10.0)
            self.assertEqual(names(r), [], (whole, names(r)))
            self.assertFalse([x for x in r.get("refused", []) if x.get("field") == "Node/NodeName"], whole)
            strip = lambda es: [(e["ref"]["nodeOrdinal"], e["field"], e["before"], e["after"]) for e in es]  # noqa: E731
            self.assertEqual(strip(r["edits"]), strip(self.base["edits"]))
        xml = text.replace("<NodeName>" + was + "</NodeName>", "<NodeName>R1|J2</NodeName>", 1).encode("utf-8")
        r = plan(xml, self._cii_named(m.group(1), "R2|J2"), self.match, 10.0)
        self.assertEqual([(e["before"], e["after"]) for e in names(r)], [("R1|J2", "R2|J2")])


if __name__ == "__main__":
    unittest.main()
