"""U2d in the browser (Pyodide; Owner 17 Nov 2026 "transfer in the app").

The same steps as u2d.py, without files or subprocesses. The page runs, in order:
  to_v14(cii)                      -> the v14 copy (3D_Converters cii_v11_v14, unchanged)
  (JavaScript) match-psi116 --tol 1 --frame cii2019 on target + v14
  plan_edits(target, cii, v14, match_json, weight_scale, items[, sidecar]) -> {"envelope", "result"} JSON
  (JavaScript) U1 applyPsi116Edits(target, envelope)
  finish(...)                      -> (revised XML bytes with the protection note, receipt JSON text)
The receipt text is what u2d.py writes for the same inputs and file names (json indent 1). sidecar: the bytes of step
10's CII sidecar, to transfer by node id (T2); its file name is then names_json[3].
"""
from __future__ import annotations

import json

from cii_v11_v14 import convert_bytes
from u2d import build_receipt, check_inputs, plan_with_sidecar, protect, sha256, u1_envelope


def to_v14(cii: bytes) -> bytes:
    return convert_bytes(bytes(cii), 14).data


def plan_edits(target: bytes, cii: bytes, v14: bytes, match_json: str, weight_scale: float, items: str, sidecar=None) -> str:
    target, cii, v14 = bytes(target), bytes(cii), bytes(v14)
    match = json.loads(match_json)
    check_inputs(target, cii, v14, match)
    result = plan_with_sidecar(target, cii, match, float(weight_scale), items.split(","), None if sidecar is None else bytes(sidecar))
    return json.dumps({"envelope": u1_envelope(target, result), "result": result})


def finish(target: bytes, cii: bytes, revised: bytes, u1_json: str, plan_json: str, names_json: str,
           weight_scale: float, items: str, created_at: str | None = None):
    """names_json = ["<cii file>", "<target file>", "<revised file>"(, "<sidecar file>")]."""
    target, cii, revised = bytes(target), bytes(cii), bytes(revised)
    u1, result = json.loads(u1_json), json.loads(plan_json)["result"]
    if sha256(revised) != u1["sha256After"]:
        raise ValueError("U2D_ROUNDTRIP_MISMATCH: revised file hash differs from U1")
    if u1["changes"]:
        revised = protect(revised, u1["changes"])
    receipt = build_receipt(names=tuple(json.loads(names_json)), cii_bytes=cii, target=target, revised=revised, u1=u1,
                            items=items.split(","), weight_scale=float(weight_scale), result=result, created_at=created_at)
    return revised, json.dumps(receipt, indent=1)
