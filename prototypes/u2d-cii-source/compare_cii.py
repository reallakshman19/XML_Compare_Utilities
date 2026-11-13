"""Benchmark for U2d: how many values of a reference CII 2019 (the Owner's standalone CII)
does a converted CII reproduce? Elements are matched by (from node, to node); counts only.

    python -E -s compare_cii.py reference.cii converted.cii [--weight-scale 10]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "u3b-cii-check"))
from u3b_core import num, parse_cii, same  # noqa: E402

CELLS = {"wall": (1, 0), "insul": (1, 1), "corr": (1, 2), "T1": (1, 3), "T2": (1, 4), "T3": (1, 5),
         "P1": (3, 0), "fluidDensity": (5, 1)}


def compare(ref_text: str, conv_text: str, weight_scale: float) -> dict:
    ref, conv = parse_cii(ref_text)["elements"], parse_cii(conv_text)["elements"]
    key = lambda el: (el["E"][0][0], el["E"][0][1])  # noqa: E731
    by = {key(el): el for el in conv}
    out = {"referenceElements": len(ref), "convertedElements": len(conv), "matchedElements": 0}
    tally = {k: [0, 0] for k in [*CELLS, "nameFrom", "nameTo", "rigidWeight", "material"]}
    for r in ref:
        c = by.get(key(r))
        if c is None:
            continue
        out["matchedElements"] += 1
        for k, (li, ci) in CELLS.items():
            tally[k][0 if same(num(r["E"][li][ci]), num(c["E"][li][ci])) else 1] += 1
        tally["nameFrom"][0 if r["name"][0] == c["name"][0] else 1] += 1
        tally["nameTo"][0 if r["name"][1] == c["name"][1] else 1] += 1
        if r["rigid"] is not None:
            ok = c["rigid"] is not None and same(r["rigid"], c["rigid"] * weight_scale)
            tally["rigidWeight"][0 if ok else 1] += 1
        tally["material"][0 if same(r["material"], c["material"]) else 1] += 1
    out["equal/different"] = {k: f"{a}/{b}" for k, (a, b) in tally.items()}
    return out


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("reference", type=Path)
    p.add_argument("converted", type=Path)
    p.add_argument("--weight-scale", type=float, default=10.0, help="converted weights x this = reference units")
    a = p.parse_args(argv)
    print(json.dumps(compare(a.reference.read_text(encoding="utf-8"), a.converted.read_text(encoding="utf-8"), a.weight_scale)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
