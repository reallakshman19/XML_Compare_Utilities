"""T4 (road map 26 Nov 2026): the node table of a transfer by node id (u2d_plan.node_table, receipt.nodeTable).

Inputs: fixtures/uxml-v2-transfer/{EF05,BM2}-on (step 10 with "Engine reads UXML" on and its sidecar), and the CAESAR
II edits test_u2d_by_id scripts (names at the shared points, a renumbered node).
Checks: one row per CII node, in element order, each on the XML node(s) its element ends land on; the table adds up to
the transfer (value edits, support changes, refusals); a node renumbered in CAESAR II shows step 10's number and lands
on the same XML node as before; without a sidecar there is no table.
"""
from __future__ import annotations

import shutil
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import test_u2d_by_id as by_id  # noqa: E402  (a module import: discover must not run TransferById twice)
from test_u2d_by_id import FIX, load, renumber  # noqa: E402
from test_u2d_supports import match_for  # noqa: E402
from u2d_plan import node_table, parse_cii, plan  # noqa: E402
from u2d_sidecar import number_key  # noqa: E402


def cii_nodes(cii: str) -> list:
    """The CII node numbers in element order (from end, then to end), each once."""
    seen = {}
    for el in parse_cii(cii)["elements"]:
        for i in (0, 1):
            seen.setdefault(number_key(el["E"][0][i]), None)
    return list(seen)


@unittest.skipUnless(shutil.which("node"), "node missing: NOT_RUN")
class NodeTable(unittest.TestCase):
    MODEL = "EF05"
    NODES = 617

    @classmethod
    def setUpClass(cls):
        cls.xml, cls.cii, cls.sidecar = load(cls.MODEL)
        cls.match = match_for(FIX / f"{cls.MODEL}-on" / "enriched.xml", cls.cii)
        cls.today = plan(cls.xml, cls.cii, cls.match, 10.0)
        cls.shared = sorted({r["ciiNode"] for r in cls.today["refused"] if r["code"] == "U2D_NODE_AMBIGUOUS"},
                            key=float)

    def by_id(self, cii: str) -> dict:
        match = self.match if cii == self.cii else match_for(FIX / f"{self.MODEL}-on" / "enriched.xml", cii)
        return plan(self.xml, cii, match, 10.0, sidecar=self.sidecar)

    def assert_adds_up(self, r: dict) -> None:
        rows = r["nodeTable"]
        node_edits = [e for e in r["edits"] if not e["field"].startswith("Branch/")]
        self.assertEqual(sum(row["edits"] for row in rows), len(node_edits))
        self.assertEqual(sum(row["supports"] for row in rows), len(r["supports"]["changes"]))
        shown = {(row["cii"], c) for row in rows for c in row["refused"]}
        by_place = {(x["branchOrdinal"], x["node"] - 1): row for row in rows for x in row["xml"]}
        for s in r["supports"]["refused"]:
            if "ciiNode" in s:
                self.assertIn((s["ciiNode"], s["code"]), shown)
            elif (s["ref"]["branchOrdinal"], s["ref"]["nodeOrdinal"]) in by_place:  # else no CII node goes there
                self.assertIn(s["code"], by_place[(s["ref"]["branchOrdinal"], s["ref"]["nodeOrdinal"])]["refused"])
        for f in r["refused"]:
            if "ref" in f:
                row = by_place[(f["ref"]["branchOrdinal"], f["ref"]["nodeOrdinal"])]
                self.assertIn(f["code"], row["refused"])

    def test_untouched_one_row_per_cii_node_in_element_order(self):
        r = self.by_id(self.cii)
        rows = r["nodeTable"]
        self.assertEqual([row["cii"] for row in rows], cii_nodes(self.cii))
        self.assertEqual(len(rows), self.NODES)
        self.assertTrue(all(row["xml"] and row["step10"] == row["cii"] for row in rows))
        self.assertEqual(sum(row["edits"] for row in rows), 0)
        self.assert_adds_up(r)

    def test_each_row_lands_where_the_element_ends_go(self):
        r = self.by_id(self.cii)
        names = {row["cii"]: {x["name"] for x in row["xml"]} for row in r["nodeTable"]}
        for row in r["nodeTable"]:
            self.assertTrue(all(isinstance(x["node"], int) and x["node"] >= 1 for x in row["xml"]))
        self.assertGreater(sum(len(row["xml"]) > 1 for row in r["nodeTable"]), 0, "some CII nodes come from several ids")
        self.assertEqual(len(names), self.NODES)

    def test_the_table_adds_up_to_an_edited_transfer(self):
        cii, _ = by_id.TransferById.renamed_at_shared_points(self)
        r = self.by_id(cii)
        self.assertGreater(sum(row["edits"] for row in r["nodeTable"]), 0)
        self.assert_adds_up(r)

    def test_a_renumbered_node_shows_step_10_s_number_and_the_same_xml_node(self):
        cii, _ = by_id.TransferById.renamed_at_shared_points(self)
        point = by_id.TransferById.point_only_elements_name(self)
        before = {row["cii"]: row for row in self.by_id(cii)["nodeTable"]}
        after = {row["cii"]: row for row in self.by_id(renumber(cii, point, "99001"))["nodeTable"]}
        self.assertNotIn(point, after)
        self.assertEqual(after["99001"]["step10"], point)
        self.assertEqual(after["99001"]["xml"], before[point]["xml"])
        self.assertEqual(after["99001"]["edits"], before[point]["edits"])

    def test_without_a_sidecar_there_is_no_table(self):
        self.assertNotIn("nodeTable", self.today)


class NodeTableRows(unittest.TestCase):
    """node_table on a small made-up transfer (review of PR 323: the fixtures have no refusal with a ref, so dropping
    refusals or swapping the check labels went unseen)."""

    def test_refusals_edits_and_the_check_land_on_their_rows(self):
        at = lambda b, n: {"branchOrdinal": b, "nodeOrdinal": n}  # noqa: E731
        ids = {"report": {"positionCheck": {"otherPlace": [{"ciiNode": "20"}], "notPairedByPosition": [{"ciiNode": "30"}]}},
               "pairs": {"10": [(0, 0)], "20": [(0, 1)], "30": [(1, 0), (1, 1)]}, "renumber": {"20": "21"}}
        nodes = {k: {"ref": {"branchName": f"/B{k[0] + 1}", "nodeNumber": str(10 * (k[0] + k[1] + 1))}, "values": {}}
                 for k in [(0, 0), (0, 1), (1, 0), (1, 1)]}
        edits = [{"field": "Node/WallThickness", "ref": at(0, 0)}, {"field": "Branch/Temperature/1", "ref": at(0, 0)},
                 {"field": "Node/InsulationThickness", "ref": at(1, 1)}]
        refused = [{"code": "U2D_NODE_AMBIGUOUS", "ref": at(1, 1)}, {"code": "U2D_MATERIAL_CARRIED"}]
        supports = {"changes": [{"ciiNode": "10"}],
                    "refused": [{"code": "U2D_SUPPORT_COPIES_WRITTEN_ONCE", "ciiNode": "20"},
                                {"code": "U2D_SUPPORT_NOT_IN_CII", "ref": at(1, 0)}]}
        rows = {r["cii"]: r for r in node_table(ids, nodes, edits, refused, supports)}
        self.assertEqual(list(rows), ["10", "20", "30"])
        self.assertEqual([rows[c]["check"] for c in rows], ["agrees", "other place", "not paired by position"])
        self.assertEqual([rows[c]["step10"] for c in rows], ["10", "21", "30"])
        self.assertEqual([rows[c]["edits"] for c in rows], [1, 0, 1])  # the Branch/ edit is not a node value
        self.assertEqual([rows[c]["supports"] for c in rows], [1, 0, 0])
        self.assertEqual([rows[c]["refused"] for c in rows],
                         [[], ["U2D_SUPPORT_COPIES_WRITTEN_ONCE"], ["U2D_NODE_AMBIGUOUS", "U2D_SUPPORT_NOT_IN_CII"]])
        self.assertEqual([x["node"] for x in rows["30"]["xml"]], [1, 2])


class NodeTableBm2(NodeTable):
    MODEL = "BM2"
    NODES = 423  # distinct node numbers over BM2's 433 elements


if __name__ == "__main__":
    unittest.main()
