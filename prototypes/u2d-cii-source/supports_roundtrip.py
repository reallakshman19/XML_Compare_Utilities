"""Supports from CAESAR II, step 5 (Owner 18 Nov 2026): the round trip.

Runs step 10's writer (3D_Converters converters/scripts, via u3b_core.convert) on a revised XML and
compares the supports of the CII it writes with the supports of the edited CII, node by node.

- Step 10's own open-end anchors are left out on both sides (they are not supports from the model).
- A direction counts only where the edited CII gives one, as support_report compares them.

    python -E -s supports_roundtrip.py <revised.xml> <edited.cii> --converter <3D_Converters>/converters/scripts
    python -E -s supports_roundtrip.py <revised.xml> <edited.cii> --step10-cii <CII from the full step 10>

The second form compares a CII the full step 10 workflow already wrote (support locks step 4, run in the browser).

Prints JSON: {"nodes": n, "differ": [{"node", "step10", "edited"}]}. A support the transfer refused
(for example on a node the XML does not have) shows up in `differ`.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE.parent / "u3b-cii-check")]
from u2d_supports import cii_supports, matches, text_of  # noqa: E402
from u3b_core import convert  # noqa: E402


def model_supports(cii_text: str) -> dict:
    """CII node -> sorted model supports (step 10's own open-end anchors left out)."""
    return {n: sorted({s for s, own, _ in v if not own}, key=str)
            for n, v in cii_supports(cii_text).items() if any(not own for _, own, _ in v)}


def same(step10: list, edited: list) -> bool:
    if len(step10) != len(edited):
        return False
    pool = list(step10)
    for e in edited:
        hit = next((s for s in pool if matches(e, s)), None)
        if hit is None:
            return False
        pool.remove(hit)
    return True


def compare(step10_cii_text: str, edited_cii_text: str) -> dict:
    got = model_supports(step10_cii_text)
    want = model_supports(edited_cii_text)
    differ = [{"node": n, "step10": [text_of(s) for s in got.get(n, [])], "edited": [text_of(s) for s in want.get(n, [])]}
              for n in sorted(set(got) | set(want), key=lambda n: (float(n), n))
              if not same(got.get(n, []), want.get(n, []))]
    return {"nodes": len(set(got) | set(want)), "differ": differ}


def roundtrip(revised_xml: Path, edited_cii_text: str, converter: Path) -> dict:
    with tempfile.TemporaryDirectory(prefix="u2d-rt-") as t:
        out = Path(t) / "step10.cii"
        convert(converter.resolve(), revised_xml.resolve(), out, Path(t) / "edges.json")
        return compare(out.read_text(encoding="utf-8"), edited_cii_text)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("revised_xml", type=Path)
    p.add_argument("edited_cii", type=Path)
    how = p.add_mutually_exclusive_group(required=True)
    how.add_argument("--converter", type=Path)
    how.add_argument("--step10-cii", type=Path)
    a = p.parse_args(argv)
    edited = a.edited_cii.read_text(encoding="utf-8")
    out = (compare(a.step10_cii.read_text(encoding="utf-8"), edited) if a.step10_cii
           else roundtrip(a.revised_xml, edited, a.converter))
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
