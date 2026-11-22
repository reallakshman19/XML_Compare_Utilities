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
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from u2d_plan import plan

U1 = Path(__file__).resolve().parents[1] / "u1-psi116-uxml" / "cli.mjs"


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


MARK = "TOPOFIX-TRANSFER-PROTECT"
MARK_RE = re.compile(rb"<!--\s*" + MARK.encode() + rb"\s*(.*?)-->", re.S)


def protect(revised: bytes, changes: list) -> bytes:
    """Add (or extend) the comment that tells the 3D_Converters step 10 which values the transfer
    moved, so its master refills keep them (Owner D5: transferred values win)."""
    found = MARK_RE.search(revised)
    data = json.loads(found.group(1)) if found else {"v": 1, "branches": {}, "nodes": {}}
    if data.get("v") != 1:
        raise ValueError("U2D_PROTECT_VERSION: the XML carries a protection note of another version")
    for c in changes:
        ref, field = c["ref"], c["field"]
        scope, _, path = field.partition("/")
        if scope == "Branch":
            data["branches"].setdefault(ref["branchName"], [])
            if path not in data["branches"][ref["branchName"]]:
                data["branches"][ref["branchName"]].append(path)
        elif scope == "Node":
            k = f"{ref['branchName']}|{ref['nodeNumber']}"
            data["nodes"].setdefault(k, [])
            if path not in data["nodes"][k]:
                data["nodes"][k].append(path)
    body = json.dumps(data, ensure_ascii=True, separators=(",", ":"))
    body = body.replace("-", "\\u002d")  # a comment may not hold two dashes; JSON reads the escape as a dash
    note = f"<!--{MARK} {body}-->".encode("ascii")
    if found:
        return revised[:found.start()] + note + revised[found.end():]
    decl = re.match(rb"(?:\xef\xbb\xbf)?\s*<\?xml[^>]*\?>\r?\n?", revised)
    at = decl.end() if decl else 0
    nl = b"\r\n" if b"\r\n" in revised[:4096] else b"\n"
    return revised[:at] + note + nl + revised[at:]


def control_elements(text: str) -> int | None:
    """Element count: first number of the first row after '#$ CONTROL'."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("#$ CONTROL") and i + 1 < len(lines):
            parts = lines[i + 1].split()
            return int(float(parts[0])) if parts else None
    return None


def check_inputs(target: bytes, cii_bytes: bytes, v14: bytes, match: dict) -> None:
    """The match must be match-psi116 output (frame cii2019) for this PSI116 and this v14 copy of this CII."""
    if "nodePairs" not in match or not match.get("ok", True):
        raise ValueError("U2D_MATCH_INVALID: expected match-psi116 output")
    inputs = match.get("inputs") or {}
    if (inputs.get("xml") or {}).get("sha256") != sha256(target):
        raise ValueError("U2D_MATCH_FILE_MISMATCH: match was made for another PSI116")
    if (inputs.get("cii") or {}).get("sha256") != sha256(v14):
        raise ValueError("U2D_MATCH_FILE_MISMATCH: match was made from another CII")
    if control_elements(v14.decode("latin-1")) != control_elements(cii_bytes.decode("utf-8")):
        raise ValueError("U2D_CII_PAIR_MISMATCH: --cii and --cii-v14 hold different element counts")
    if (match.get("summary") or {}).get("frame") != "cii2019":
        raise ValueError("U2D_MATCH_FRAME: run match-psi116 with --frame cii2019")


def u1_envelope(target: bytes, result: dict) -> dict:
    """The edits U1 applies, in its {fileSha256, edits} envelope."""
    return {"fileSha256": sha256(target),
            "edits": [{k: e[k] for k in ("ref", "field", "before", "after")} for e in result["edits"]]}


def source_of(change: dict, result: dict) -> dict:
    """{"cii": ...} from the plan's edit for the same ref and field (U1 keeps only ref, field, before, after)."""
    key = (json.dumps(change["ref"], sort_keys=True), change["field"])
    for e in result.get("edits", []):
        if (json.dumps(e["ref"], sort_keys=True), e["field"]) == key and "cii" in e:
            return {"cii": e["cii"]}
    return {}


def build_receipt(*, names, cii_bytes, target, revised, u1, items, weight_scale, result, created_at=None) -> dict:
    """The u2.transfer-receipt; names = (CII file, target file, revised file)."""
    cii_name, target_name, out_name = names[:3]
    receipt = {"ok": True, "format": "u2.transfer-receipt", "version": 1, "kind": "cii-source",
            "createdAt": created_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source": {"fileName": cii_name, "sha256": sha256(cii_bytes)},
            "base": {"fileName": target_name, "sha256": sha256(target)},
            "revised": {"fileName": out_name, "sha256": sha256(revised), "u1Sha256": u1["sha256After"]},
            "options": {"items": items, "weightScale": weight_scale, "densityFactor": 1e-6},
            "changes": [{**c, "lineNo": "[TBA]", **source_of(c, result)} for c in u1["changes"]],
            "refused": result["refused"], "summary": result["summary"],
            # Supports from CAESAR II (Owner 18 Nov 2026): listed only; TransferStage does not apply them yet.
            "supports": result.get("supports", {"changes": [], "refused": []})}
    if result.get("byId"):
        # T2 (Owner 22 Nov 2026): transferred by node id with step 10's CII sidecar (names[3] is its file name).
        receipt["byId"] = {**result["byId"], "sidecarFileName": names[3] if len(names) > 3 else None}
    return receipt


def plan_with_sidecar(target: bytes, cii_bytes: bytes, match: dict, weight_scale: float, items: list,
                      sidecar: bytes | None) -> dict:
    """plan(), by node id when step 10's CII sidecar (its file bytes) is given (T2, Owner 22 Nov 2026)."""
    if sidecar is None:
        return plan(target, cii_bytes.decode("utf-8"), match, weight_scale, items)
    try:
        side = json.loads(bytes(sidecar).decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise ValueError(f"U2D_SIDECAR_INVALID: the sidecar is not JSON ({e}). Nothing was transferred.") from e
    result = plan(target, cii_bytes.decode("utf-8"), match, weight_scale, items, sidecar=side)
    result["byId"]["sidecarSha256"] = sha256(bytes(sidecar))
    return result


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="U2d: transfer CII 2019 values into a PSI116")
    for a in ("--target", "--cii", "--match", "--out", "--changes"):
        p.add_argument(a, required=True, type=Path)
    p.add_argument("--cii-v14", required=True, type=Path, help="the v14 copy the match was made from")
    p.add_argument("--weight-scale", required=True, type=float, choices=[1.0, 10.0],
                   help="RIGID weight units of the CII per kg: 10 = the standalone tab default (kg x 10 = N), 1 = kg")
    p.add_argument("--items", default="name,weight,element")
    p.add_argument("--sidecar", type=Path, help="step 10's CII sidecar for --target: transfer by node id (T2)")
    a = p.parse_args(argv)
    created = False
    try:
        for f in (a.out, a.changes):
            if f.exists():
                raise ValueError(f"U2D_OUTPUT_EXISTS: {f}")
        target, cii_bytes = a.target.read_bytes(), a.cii.read_bytes()
        match = json.loads(a.match.read_text(encoding="utf-8"))
        check_inputs(target, cii_bytes, a.cii_v14.read_bytes(), match)
        side = a.sidecar.read_bytes() if a.sidecar else None
        result = plan_with_sidecar(target, cii_bytes, match, a.weight_scale, a.items.split(","), side)
        with tempfile.TemporaryDirectory() as tmp:
            edits = Path(tmp) / "edits.json"
            edits.write_text(json.dumps(u1_envelope(target, result)), encoding="utf-8")
            r = subprocess.run(["node", str(U1), "apply", str(a.target), str(edits), str(a.out)], capture_output=True, text=True)
        if r.returncode != 0:
            raise ValueError(r.stderr.strip() or "U1 refused")
        created = True
        u1 = json.loads(r.stdout)
        revised = a.out.read_bytes()
        if sha256(revised) != u1["sha256After"]:
            raise ValueError("U2D_ROUNDTRIP_MISMATCH: revised file hash differs from U1")
        if u1["changes"]:
            revised = protect(revised, u1["changes"])
            a.out.write_bytes(revised)
        names = (a.cii.name, a.target.name, a.out.name) + ((a.sidecar.name,) if a.sidecar else ())
        receipt = build_receipt(names=names, cii_bytes=cii_bytes, target=target,
                                revised=revised, u1=u1, items=a.items.split(","), weight_scale=a.weight_scale, result=result)
        with open(a.changes, "x", encoding="utf-8") as f:
            json.dump(receipt, f, indent=1)
        print(json.dumps(result["summary"]))
        return 0
    except (ValueError, OSError, KeyError) as e:
        print(json.dumps({"refusal": str(e)}), file=sys.stderr)
        if created and not a.changes.exists():
            a.out.unlink()  # never leave a revised PSI116 without its receipt
        return 1


if __name__ == "__main__":
    sys.exit(main())
