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
        cls.code = u2d.main(["--target", str(t / "target.xml"), "--cii", str(t / "standalone.cii"), "--match", str(t / "match.json"),
                             "--out", str(t / "revised.xml"), "--changes", str(t / "changes.json")])

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
        code = u2d.main(["--target", str(t / "target.xml"), "--cii", str(t / "standalone.cii"), "--match", str(t / "bad.json"),
                         "--out", str(t / "x.xml"), "--changes", str(t / "x.json")])
        self.assertEqual(code, 1)
        self.assertFalse((t / "x.xml").exists())


if __name__ == "__main__":
    unittest.main()
