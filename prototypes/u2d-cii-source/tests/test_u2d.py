"""U2d end-to-end on public data. The 'standalone CII' is made by the real converter (weight
scale 10, as the standalone tab) from an invented, value-edited copy of RMS-BLOW-1; the target
is the untouched RMS-BLOW-1. U2d must bring those values back into the target PSI116.

    python -E -s -m unittest discover -s tests -v      (needs a 3D_Converters checkout: U3B_3DC)
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parents[1] / "u3b-cii-check"))
sys.path.insert(0, str(HERE.parents[1] / "u3b-cii-check" / "tests"))
import u2d  # noqa: E402
from compare_cii import compare  # noqa: E402
from test_u3b import BENCH, CONVERTER  # noqa: E402

MATCHER = HERE.parents[1] / "p11-cii-map" / "cli.mjs"


def edit_branch(text: str, bi: int, tag: str, value: str) -> str:
    b = list(re.finditer(r"<Branch>.*?</Branch>", text, re.S))[bi]
    new, n = re.subn(rf"<{tag}>[^<]*</{tag}>", f"<{tag}>{value}</{tag}>", b.group(0), count=1)
    assert n == 1
    return text[:b.start()] + new + text[b.end():]


@unittest.skipUnless(BENCH.exists() and shutil.which("node"), "3D_Converters checkout or node missing: NOT_RUN")
class U2dEndToEnd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = t = Path(tempfile.mkdtemp(prefix="u2d-"))
        text = BENCH.read_bytes().decode("utf-8-sig")
        (t / "target.xml").write_bytes(BENCH.read_bytes())
        src = text
        for bi in range(3):
            src = edit_branch(src, bi, "Temperature1", "150")
            src = edit_branch(src, bi, "Pressure1", "1200")
            src = edit_branch(src, bi, "FluidDensity", "870")
        src = re.sub(r"<WallThickness>0</WallThickness>", "<WallThickness>6.02</WallThickness>", src)
        (t / "source.xml").write_text(src, encoding="utf-8")
        run = lambda *a, **k: subprocess.run(list(a), capture_output=True, text=True, **k)  # noqa: E731
        r = run(sys.executable, "-E", "-s", str(CONVERTER / "xml_to_cii2019_runtime_custody.py"), "--input", str(t / "source.xml"),
                "--output", str(t / "standalone.cii"), "--weight-scale", "10", cwd=CONVERTER)
        assert r.returncode == 0, r.stderr[-300:]
        r = run(sys.executable, "-E", "-s", str(CONVERTER / "cii_v11_v14.py"), str(t / "standalone.cii"), str(t / "standalone-v14.cii"), cwd=CONVERTER)
        assert r.returncode == 0, r.stderr[-300:]
        r = run("node", str(MATCHER), "match-psi116", str(t / "target.xml"), str(t / "standalone-v14.cii"), "--tol", "1", "--frame", "cii2019")
        (t / "match.json").write_text(r.stdout, encoding="utf-8")
        cls.code = u2d.main(cls.args("target", "standalone", "match", "revised", "changes"))

    @classmethod
    def args(cls, target, cii, match, out, changes, scale="10"):
        t = cls.tmp
        return ["--target", str(t / f"{target}.xml"), "--cii", str(t / f"{cii}.cii"), "--cii-v14", str(t / f"{cii}-v14.cii"),
                "--match", str(t / f"{match}.json"), "--out", str(t / f"{out}.xml"), "--changes", str(t / f"{changes}.json"),
                "--weight-scale", scale]

    @classmethod
    def make(cls, name, text, scale="10", target="target"):
        """Write name.xml, convert it to name.cii (+ v14) and match it against target.xml."""
        t = cls.tmp
        (t / f"{name}.xml").write_text(text, encoding="utf-8")
        run = lambda *a, **k: subprocess.run(list(a), capture_output=True, text=True, **k)  # noqa: E731
        r = run(sys.executable, "-E", "-s", str(CONVERTER / "xml_to_cii2019_runtime_custody.py"), "--input", str(t / f"{name}.xml"),
                "--output", str(t / f"{name}.cii"), "--weight-scale", scale, cwd=CONVERTER)
        assert r.returncode == 0, r.stderr[-300:]
        r = run(sys.executable, "-E", "-s", str(CONVERTER / "cii_v11_v14.py"), str(t / f"{name}.cii"), str(t / f"{name}-v14.cii"), cwd=CONVERTER)
        assert r.returncode == 0, r.stderr[-300:]
        r = run("node", str(MATCHER), "match-psi116", str(t / f"{target}.xml"), str(t / f"{name}-v14.cii"), "--tol", "1", "--frame", "cii2019")
        (t / f"m-{name}.json").write_text(r.stdout, encoding="utf-8")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_transfer_writes_the_values_back(self):
        self.assertEqual(self.code, 0)
        rec = json.loads((self.tmp / "changes.json").read_text(encoding="utf-8"))
        fields = {c["field"] for c in rec["changes"]}
        for f in ("Branch/Temperature/Temperature1", "Branch/Pressure/Pressure1", "Branch/FluidDensity", "Node/WallThickness"):
            self.assertIn(f, fields)
        t1 = {c["after"] for c in rec["changes"] if c["field"] == "Branch/Temperature/Temperature1"}
        self.assertEqual(t1, {"150"})
        self.assertEqual({c["after"] for c in rec["changes"] if c["field"] == "Branch/FluidDensity"}, {"870"})

    def test_revised_file_carries_the_protection_note_for_step_10(self):
        """Owner D5: step 10 keeps what the note lists; the receipt hashes the file as written."""
        revised = (self.tmp / "revised.xml").read_bytes()
        rec = json.loads((self.tmp / "changes.json").read_text(encoding="utf-8"))
        self.assertEqual(rec["revised"]["sha256"], u2d.sha256(revised))
        found = u2d.MARK_RE.search(revised)
        self.assertIsNotNone(found)
        self.assertNotIn(b"--", found.group(1))
        note = json.loads(found.group(1))
        for c in rec["changes"]:
            scope, _, path = c["field"].partition("/")
            if scope == "Branch":
                self.assertIn(path, note["branches"][c["ref"]["branchName"]])
            else:
                self.assertIn(path, note["nodes"][f"{c['ref']['branchName']}|{c['ref']['nodeNumber']}"])
        self.assertEqual(u2d.protect(revised, rec["changes"]), revised, "a second note is never added")

    def test_converted_revised_cii_reproduces_the_standalone_values(self):
        t = self.tmp
        r = subprocess.run([sys.executable, "-E", "-s", str(CONVERTER / "xml_to_cii2019_runtime_custody.py"), "--input",
                            str(t / "revised.xml"), "--output", str(t / "revised.cii"), "--weight-scale", "10"],
                           capture_output=True, text=True, cwd=CONVERTER)
        self.assertEqual(r.returncode, 0, r.stderr[-300:])
        rep = compare((t / "standalone.cii").read_text(encoding="utf-8"), (t / "revised.cii").read_text(encoding="utf-8"), 1.0)
        for k in ("T1", "P1", "fluidDensity", "nameFrom", "nameTo", "material"):
            self.assertTrue(rep["equal/different"][k].endswith("/0"), (k, rep["equal/different"][k]))

    def test_match_from_the_wrong_frame_is_refused(self):
        t = self.tmp
        bad = json.loads((t / "match.json").read_text(encoding="utf-8"))
        bad["summary"]["frame"] = "psi116"
        (t / "bad.json").write_text(json.dumps(bad), encoding="utf-8")
        code = u2d.main(self.args("target", "standalone", "bad", "x", "x"))
        self.assertEqual(code, 1)
        self.assertFalse((t / "x.xml").exists())


class U2dReviewCases(U2dEndToEnd):
    """Cases from the independent review of 2e43abd8 (probes B, D, E, F, C)."""

    def plan_of(self, name, scale="10"):
        code = u2d.main(self.args("target", name, f"m-{name}", f"rev-{name}", f"ch-{name}", scale))
        self.assertEqual(code, 0)
        return json.loads((self.tmp / f"ch-{name}.json").read_text(encoding="utf-8"))

    def test_b_untouched_file_against_its_own_cii_plans_nothing(self):
        self.make("own", BENCH.read_bytes().decode("utf-8-sig"))
        rec = self.plan_of("own")
        self.assertEqual(rec["changes"], [], [(c["field"], c["before"], c["after"]) for c in rec["changes"]][:5])

    def test_d_long_names_are_not_cut_to_25(self):
        text = BENCH.read_bytes().decode("utf-8-sig")
        long = re.sub(r"<NodeName>PS-171100.2</NodeName>", "<NodeName>PS-171100.2-AAAAAAAAAAAAAAAAAAAAAA</NodeName>", text, count=1)
        (self.tmp / "tlong.xml").write_text(long, encoding="utf-8")
        self.make("long", long, target="tlong")
        code = u2d.main(self.args("tlong", "long", "m-long", "rev-long", "ch-long"))
        self.assertEqual(code, 0)
        rec = json.loads((self.tmp / "ch-long.json").read_text(encoding="utf-8"))
        self.assertFalse([c for c in rec["changes"] if c["field"] == "Node/NodeName"])

    def test_e_weight_scale_is_explicit_and_honoured(self):
        text = BENCH.read_bytes().decode("utf-8-sig")
        heavy = re.sub(r"(<NodeNumber>20</NodeNumber>.*?<Weight>)[^<]*(</Weight>)", r"\g<1>123.5\2", text, count=1, flags=re.S)
        self.make("kg", heavy, scale="1")
        rec = self.plan_of("kg", scale="1")
        self.assertIn("123.5", {c["after"] for c in rec["changes"] if c["field"] == "Node/Weight"})
        with self.assertRaises(SystemExit):
            u2d.main([a for a in self.args("target", "kg", "m-kg", "x2", "x2") if a not in ("--weight-scale", "10")])

    def test_g_a_zero_cii_weight_never_replaces_a_real_weight(self):
        # Owner, 14 Nov: EF-05 valves, flanges and rigids got weight 0 from an older CII.
        text = BENCH.read_bytes().decode("utf-8-sig")
        node20 = r"(<NodeNumber>20</NodeNumber>.*?<Weight>)[^<]*(</Weight>)"
        sub = lambda w: re.sub(node20, rf"\g<1>{w}\g<2>", text, count=1, flags=re.S)  # noqa: E731
        (self.tmp / "theavy.xml").write_text(sub("123.5"), encoding="utf-8")
        self.make("zero", sub("0"), target="theavy")
        self.assertEqual(u2d.main(self.args("theavy", "zero", "m-zero", "rev-zero", "ch-zero")), 0)
        rec = json.loads((self.tmp / "ch-zero.json").read_text(encoding="utf-8"))
        self.assertFalse([c for c in rec["changes"] if c["field"] == "Node/Weight" and float(c["after"]) == 0])
        self.assertIn("U2D_WEIGHT_ZERO", {r["code"] for r in rec["refused"]})

    def test_f_unset_temperature_stays_unset(self):
        text = BENCH.read_bytes().decode("utf-8-sig")
        hot = edit_branch(text, 0, "Temperature1", "150")
        (self.tmp / "thot.xml").write_text(hot, encoding="utf-8")
        self.make("cold", text, target="thot")
        code = u2d.main(self.args("thot", "cold", "m-cold", "rev-cold", "ch-cold"))
        self.assertEqual(code, 0)
        rec = json.loads((self.tmp / "ch-cold.json").read_text(encoding="utf-8"))
        t1 = [c for c in rec["changes"] if c["field"] == "Branch/Temperature/Temperature1"]
        self.assertEqual([c["after"] for c in t1], ["-100000"])

    def test_c_cii_that_was_not_matched_is_refused(self):
        code = u2d.main(["--target", str(self.tmp / "target.xml"), "--cii", str(self.tmp / "standalone.cii"),
                         "--cii-v14", str(self.tmp / "target.xml"), "--match", str(self.tmp / "match.json"),
                         "--out", str(self.tmp / "y.xml"), "--changes", str(self.tmp / "y.json"), "--weight-scale", "10"])
        self.assertEqual(code, 1)
        self.assertFalse((self.tmp / "y.xml").exists())


if __name__ == "__main__":
    unittest.main()
