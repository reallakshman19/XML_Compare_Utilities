"""U3b tests. Public data only: the 3D_Converters benchmark RMS-BLOW-1.xml (C-R1X) as the
target, and an invented source made by editing chosen nodes of a copy.

Needs a 3D_Converters checkout: set U3B_3DC to its root (default ../../../wt-modeb-isolation
next to this XCU worktree). Without it every test is skipped (NOT_RUN, never PASS).

    python -E -s -m unittest discover -s tests -v
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import u3b_check  # noqa: E402
from u3b_core import Refusal, convert, sha256, xml_nodes  # noqa: E402

ROOT_3DC = Path(os.environ.get("U3B_3DC", HERE.parents[3] / "wt-modeb-isolation"))
CONVERTER = ROOT_3DC / "converters" / "scripts"
BENCH = ROOT_3DC / "Benchmarks" / "XML to CII 2019" / "Sample 1.1" / "RMS-BLOW-1.xml"
BENCH_SHA = "8f616417c382f89d451028c71fab5fb4e9bbc2addfe09246a3ee9549c1019261"
U2 = HERE.parents[1] / "u2-uxml-transfer" / "cli.mjs"


def node_spans(text: str) -> dict[tuple[int, int], tuple[int, int]]:
    out = {}
    for bi, b in enumerate(re.finditer(r"<Branch>.*?</Branch>", text, re.S)):
        for ni, n in enumerate(re.finditer(r"<Node>.*?</Node>", b.group(0), re.S)):
            out[(bi, ni)] = (b.start() + n.start(), b.start() + n.end())
    return out


def set_leaf(text: str, span: tuple[int, int], tag: str, value: str) -> str:
    block = text[span[0]:span[1]]
    new, n = re.subn(rf"<{tag}>[^<]*</{tag}>", f"<{tag}>{value}</{tag}>", block, count=1)
    assert n == 1, (tag, span)
    return text[:span[0]] + new + text[span[1]:]


def set_branch(text: str, bi: int, path: str, value: str) -> str:
    b = list(re.finditer(r"<Branch>.*?</Branch>", text, re.S))[bi]
    inner = b.group(0)
    tag = path.split("/")[-1]
    new, n = re.subn(rf"<{tag}>[^<]*</{tag}>", f"<{tag}>{value}</{tag}>", inner, count=1)
    assert n == 1, path
    return text[:b.start()] + new + text[b.end():]


@unittest.skipUnless(BENCH.exists() and U2.exists() and shutil.which("node"), "3D_Converters checkout or node missing: NOT_RUN")
class U3bOnPublicBenchmark(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp(prefix="u3b-"))
        target = BENCH.read_bytes()
        assert sha256(target) == BENCH_SHA, "benchmark changed"
        (cls.tmp / "target.xml").write_bytes(target)
        edges = convert(CONVERTER.resolve(), (cls.tmp / "target.xml").resolve(), cls.tmp / "t.cii", cls.tmp / "t.json")["edges"] \
            if False else convert(CONVERTER.resolve(), (cls.tmp / "target.xml").resolve(), cls.tmp / "t.cii", cls.tmp / "t.json")
        cii = u3b_check.parse_cii((cls.tmp / "t.cii").read_text(encoding="utf-8"))
        nodes = xml_nodes(target)
        by_id = {(n["ref"], n["number"]): k for k, n in nodes.items() if (n["number"] or 0) > 0}
        rigid_to = [by_id[(e["to"]["ref"], e["to"]["number"])] for i, e in enumerate(edges)
                    if cii["elements"][i]["rigid"] is not None and (e["to"]["ref"], e["to"]["number"]) in by_id]
        from_ends = [by_id[(e["from"]["ref"], e["from"]["number"])] for e in edges if (e["from"]["ref"], e["from"]["number"]) in by_id]
        text = target.decode("utf-8-sig")
        spans = node_spans(text)
        cls.plan = {"weight": rigid_to[:3], "name": from_ends[3:6], "wall": [k for k in from_ends[8:11] if k not in rigid_to]}
        for k in cls.plan["weight"]:
            text = set_leaf(text, spans[k], "Weight", "123.5")
        for j, k in enumerate(cls.plan["name"]):
            text = set_leaf(text, spans[k], "NodeName", f"U3B-{j}")
        for k in cls.plan["wall"]:
            text = set_leaf(text, spans[k], "WallThickness", "9.53")
        for path, value in (("Temperature/Temperature1", "180"), ("Pressure/Pressure2", "12.5"),
                            ("FluidDensity", "870"), ("InsulationDensity", "120"), ("MaterialNumber", "106")):
            text = set_branch(text, 1, path, value)
        (cls.tmp / "source.xml").write_bytes(b"\xef\xbb\xbf" + text.encode("utf-8"))
        pairs = [{"source": cls.ref(n, k), "target": cls.ref(n, k)} for k, n in sorted(nodes.items())]
        (cls.tmp / "pairs.json").write_text(json.dumps(pairs), encoding="utf-8")
        r = subprocess.run(["node", str(U2), "apply", str(cls.tmp / "source.xml"), str(cls.tmp / "target.xml"),
                            str(cls.tmp / "pairs.json"), "--out", str(cls.tmp / "revised.xml"), "--changes",
                            str(cls.tmp / "changes.json")], capture_output=True, text=True)
        assert r.returncode == 0, r.stdout + r.stderr
        cls.receipt = json.loads((cls.tmp / "changes.json").read_text(encoding="utf-8"))

    @staticmethod
    def ref(n, k):
        return {"branchOrdinal": k[0], "branchName": n["branch"], "nodeOrdinal": k[1],
                "nodeNumber": n["numberText"], "componentRefNo": n["ref"]}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True) if not os.environ.get("U3B_KEEP") else print(cls.tmp)

    def run_check(self, name: str, receipt=None, revised="revised.xml"):
        rp = self.tmp / f"{name}.receipt.json"
        rp.write_text(json.dumps(receipt or self.receipt), encoding="utf-8")
        out = self.tmp / f"{name}.report.json"
        code = u3b_check.main(["--converter", str(CONVERTER), "--base", str(self.tmp / "target.xml"),
                               "--revised", str(self.tmp / revised), "--receipt", str(rp), "--out", str(out),
                               "--cii-dir", str(self.tmp / name)])
        return code, (json.loads(out.read_text(encoding="utf-8")) if out.exists() else None)

    def test_t1_every_planned_value_reaches_the_cii(self):
        code, rep = self.run_check("t1")
        self.assertEqual(code, 0, rep and rep["counts"])
        status = {}
        for row in rep["rows"]:
            status.setdefault(row["field"], set()).add(row["status"])
        for field in ("Node/Weight", "Node/NodeName", "Node/WallThickness", "Branch/Temperature/Temperature1",
                      "Branch/Pressure/Pressure2", "Branch/FluidDensity", "Branch/MaterialNumber"):
            self.assertEqual(status.get(field), {"CARRIED"}, field)
        self.assertEqual(status.get("Branch/InsulationDensity"), {"NOT_CARRIED"})
        self.assertEqual(len(rep["structureChanges"]), 3)  # each weighted RIGID is split from its flange
        self.assertTrue(all(x["explained"] for x in rep["structureChanges"]))
        self.assertEqual(rep["unexplainedCiiChanges"], [])

    def test_t2_a_tampered_cii_value_is_a_mismatch(self):
        rows = self.receipt["changes"]
        w = next(c for c in rows if c["field"] == "Node/Weight")
        bad = json.loads(json.dumps(self.receipt))
        next(c for c in bad["changes"] if c["ref"] == w["ref"] and c["field"] == "Node/Weight")["after"] = "999"
        code, rep = self.run_check("t2", receipt=bad)
        self.assertEqual(code, 3)
        self.assertIn("MISMATCH", rep["counts"])

    def test_t3_a_receipt_that_hides_a_change_leaves_it_unexplained(self):
        bad = json.loads(json.dumps(self.receipt))
        bad["changes"] = [c for c in bad["changes"] if c["field"] != "Branch/Pressure/Pressure2"]
        code, rep = self.run_check("t3", receipt=bad)
        self.assertEqual(code, 3)
        self.assertTrue(any(d["kind"] == "E" and d["line"] == 3 for d in rep["unexplainedCiiChanges"]))

    def test_t4_empty_receipt_never_passes_when_the_cii_differs(self):
        bad = {**self.receipt, "changes": []}
        code, rep = self.run_check("t4", receipt=bad)
        self.assertEqual(code, 3)
        self.assertGreater(len(rep["unexplainedCiiChanges"]), 0)

    def test_t5_wrong_revised_file_is_refused(self):
        code, rep = self.run_check("t5", revised="target.xml")
        self.assertEqual((code, rep), (1, None))

    def test_t6_negative_numbered_node_is_reported_not_carried(self):
        nodes = xml_nodes((self.tmp / "target.xml").read_bytes())
        k, n = next((k, n) for k, n in sorted(nodes.items()) if (n["number"] or 0) < 0)
        fake = {**self.receipt, "changes": [{"field": "Node/NodeName", "before": "", "after": "X",
                                              "ref": {**self.ref(n, k), "nodeNumber": "-1"}}]}
        rows, _ = u3b_check.judge_change(fake["changes"][0], n, nodes, [], [])
        self.assertEqual(rows["status"], "NOT_CARRIED")
        self.assertIn("0 or below", rows["reason"])


class U3bPure(unittest.TestCase):
    def test_receipt_format_is_required(self):
        with self.assertRaises(Refusal) as e:
            u3b_check.check(b"", b"", {"format": "other"}, "", "", [], [])
        self.assertEqual(e.exception.code, "U3B_RECEIPT_INVALID")


if __name__ == "__main__":
    unittest.main()
