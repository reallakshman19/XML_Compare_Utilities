"""U2d command line: CII 2019 values -> revised PSI116 + receipt.

    python -E -s u2d.py --target t.xml --cii standalone.cii --match match.json \
        --out revised.xml --changes changes.json [--items name,weight,element]

match.json = `node ../p11-cii-map/cli.mjs match-psi116 t.xml <v14 copy of the CII> --frame cii2019`.
Writes the revised PSI116 with the unchanged U1 write-back and a u2.transfer-receipt that
U3a (review page) and U3b (CII check) accept. Exit 0 = written, 1 = refusal, 2 = usage.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from u2d_plan import plan

U1 = Path(__file__).resolve().parents[1] / "u1-psi116-uxml" / "cli.mjs"


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="U2d: transfer CII 2019 values into a PSI116")
    for a in ("--target", "--cii", "--match", "--out", "--changes"):
        p.add_argument(a, required=True, type=Path)
    p.add_argument("--items", default="name,weight,element")
    a = p.parse_args(argv)
    created = False
    try:
        for f in (a.out, a.changes):
            if f.exists():
                raise ValueError(f"U2D_OUTPUT_EXISTS: {f}")
        target, cii_bytes = a.target.read_bytes(), a.cii.read_bytes()
        match = json.loads(a.match.read_text(encoding="utf-8"))
        if "nodePairs" not in match or not match.get("ok", True):
            raise ValueError("U2D_MATCH_INVALID: expected match-psi116 output")
        if match.get("inputs", {}).get("xml", {}).get("sha256") not in (None, sha256(target)):
            raise ValueError("U2D_MATCH_FILE_MISMATCH: match was made for another PSI116")
        if (match.get("summary") or {}).get("frame") != "cii2019":
            raise ValueError("U2D_MATCH_FRAME: run match-psi116 with --frame cii2019")
        result = plan(target, cii_bytes.decode("utf-8"), match, a.items.split(","))
        with tempfile.TemporaryDirectory() as tmp:
            edits = Path(tmp) / "edits.json"
            edits.write_text(json.dumps({"fileSha256": sha256(target),
                                         "edits": [{k: e[k] for k in ("ref", "field", "before", "after")} for e in result["edits"]]}),
                             encoding="utf-8")
            r = subprocess.run(["node", str(U1), "apply", str(a.target), str(edits), str(a.out)], capture_output=True, text=True)
        if r.returncode != 0:
            raise ValueError(r.stderr.strip() or "U1 refused")
        created = True
        u1 = json.loads(r.stdout)
        revised = a.out.read_bytes()
        if sha256(revised) != u1["sha256After"]:
            raise ValueError("U2D_ROUNDTRIP_MISMATCH: revised file hash differs from U1")
        receipt = {"ok": True, "format": "u2.transfer-receipt", "version": 1, "kind": "cii-source",
                   "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                   "source": {"fileName": a.cii.name, "sha256": sha256(cii_bytes)},
                   "base": {"fileName": a.target.name, "sha256": sha256(target)},
                   "revised": {"fileName": a.out.name, "sha256": u1["sha256After"]},
                   "options": {"items": a.items.split(","), "weightScale": 10, "densityFactor": 1e-6},
                   "changes": [{**c, "lineNo": "[TBA]"} for c in u1["changes"]],
                   "refused": result["refused"], "summary": result["summary"]}
        with open(a.changes, "x", encoding="utf-8") as f:
            json.dump(receipt, f, indent=1)
        print(json.dumps(result["summary"]))
        return 0
    except ValueError as e:
        print(json.dumps({"refusal": str(e)}), file=sys.stderr)
        if created and not a.changes.exists():
            a.out.unlink()  # never leave a revised PSI116 without its receipt
        return 1


if __name__ == "__main__":
    sys.exit(main())
