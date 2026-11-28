"""T4 step 2 (road map 26 Nov 2026): the CAESAR II side of the round-trip test tests/uxml-v2-step10-roundtrip.test.mjs.

    python -E -s roundtrip_t4.py edits <enriched.xml> <step10.cii> <sidecar.json> <roundtrip.json> <out.cii>
        The fixed edit set of roundtrip.json applied to step 10's CII: wall thickness and insulation at every point
        today's transfer refuses (edit_shared_points), one support edited and copied, one support edited, one point-only
        node renumbered. Prints {"shared": n}.
    python -E -s roundtrip_t4.py compare <edited.cii> <cii2>
        What step 10's second CII has that differs from the edited CII, over the whole file:
        "values": element value cells, rows 0-9 (as numbers, so 5.00000 and 5.000000 are the same; a missing or
        extra cell is None on the side that lacks it);
        "supports": the model supports per node (step 10's open-end anchors left out);
        "lines": every other line of every section (names, weights, materials, bends, SIFs, reducers, coordinates,
        line numbers, the pointers, CONTROL, RESTRANT itself), token by token with numbers as numbers; a line with
        any text in it must be the same text exactly.
        Prints {"values": [[element, row, column, edited, cii2]], "supports": [[node, edited, cii2]],
        "lines": [[section, line, edited, cii2]]}.
"""
from __future__ import annotations

import json
import sys
from itertools import zip_longest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
from test_u2d_by_id import edit_shared_points, renumber  # noqa: E402
from test_u2d_supports import match_for  # noqa: E402
from test_u2d_supports_by_step10 import edited, edited_and_copied  # noqa: E402
from u2d_plan import num, parse_cii, plan  # noqa: E402
from u3b_core import ELEMENT_LINES, sections_of  # noqa: E402
from u2d_supports import cii_supports, text_dir  # noqa: E402


def edit_set(xml_path: Path, cii: str, sidecar: dict, spec: dict) -> tuple[str, int]:
    """The edited CII and how many shared points got values."""
    today = plan(xml_path.read_bytes(), cii, match_for(xml_path, cii), 10.0)
    shared = sorted({r["ciiNode"] for r in today["refused"] if r["code"] == "U2D_NODE_AMBIGUOUS"}, key=float)
    out, _ = edit_shared_points(cii, sidecar, shared)
    copy = spec["copy"]
    written = next(w for b in sidecar["ciiSupports"] if b["cii"] == copy["node"] for w in b["written"])
    out = edited_and_copied(out, copy["node"], written, copy["friction"])
    out = edited(out, spec["edit"]["node"], friction=spec["edit"]["friction"])
    return renumber(out, spec["renumber"]["from"], spec["renumber"]["to"]), len(shared)


def model_supports(text: str) -> dict:
    """CII node -> its supports as text, sorted (step 10's own open-end anchors left out)."""
    return {n: sorted(text_dir(s) for s, own, _ in v if not own) for n, v in cii_supports(text).items()}


def differences(a_text: str, b_text: str) -> dict:
    a, b = parse_cii(a_text)["elements"], parse_cii(b_text)["elements"]
    if len(a) != len(b):
        raise SystemExit(f"element counts differ: {len(a)} vs {len(b)}")
    # Re-review of PR 323: a cell missing from or added to a row shows too (None on the side that lacks it).
    values = [[k, r, c, x, y] for k, (ea, eb) in enumerate(zip(a, b)) for r in range(10)
              for c, (x, y) in enumerate(zip_longest(ea["E"][r], eb["E"][r]))
              if x is None or y is None or num(x) != num(y)]
    sa, sb = model_supports(a_text), model_supports(b_text)
    supports = [[n, sa.get(n, []), sb.get(n, [])] for n in sorted(set(sa) | set(sb), key=float)
                if sa.get(n, []) != sb.get(n, [])]
    return {"values": values, "supports": supports, "lines": other_lines(a_text, b_text)}


def same_line(x: str, y: str) -> bool:
    """Numbers as numbers; a line with any text (a name in its fixed columns) must be the same text exactly, so a name
    that moves to the other end of its element shows (re-review of PR 323)."""
    tx, ty = x.split(), y.split()
    if any(num(p) is None for p in tx + ty):
        return x.rstrip() == y.rstrip()
    return len(tx) == len(ty) and all(num(p) == num(q) for p, q in zip(tx, ty))


def other_lines(a_text: str, b_text: str) -> list:
    """Every line "values" does not cover, in every section of either file: [section, line, edited, cii2] where they
    differ (a missing line or section is None). Review of PR 323: the transfer writing a name nobody asked for must
    show here."""
    sa, sb = sections_of(a_text), sections_of(b_text)
    out = []
    for name in list(sa) + [k for k in sb if k not in sa]:
        la, lb = sa.get(name), sb.get(name)
        if la is None or lb is None:
            out.append([name, None, la is not None, lb is not None])
            continue
        for i in range(max(len(la), len(lb))):
            if name == "ELEMENTS" and i % ELEMENT_LINES < 10:
                continue  # in "values"
            x, y = (la[i] if i < len(la) else None), (lb[i] if i < len(lb) else None)
            if x is None or y is None or not same_line(x, y):
                out.append([name, i, x and x.rstrip(), y and y.rstrip()])
    return out


def main(argv: list[str]) -> None:
    if argv[:1] == ["edits"] and len(argv) == 6:
        xml, cii, side, spec, out = map(Path, argv[1:])
        text, shared = edit_set(xml, cii.read_text(encoding="utf-8"), json.loads(side.read_text(encoding="utf-8")),
                                json.loads(spec.read_text(encoding="utf-8"))["edits"])
        out.write_text(text, encoding="utf-8", newline="")
        print(json.dumps({"shared": shared}))
    elif argv[:1] == ["compare"] and len(argv) == 3:
        print(json.dumps(differences(*(Path(p).read_text(encoding="utf-8") for p in argv[1:]))))
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
