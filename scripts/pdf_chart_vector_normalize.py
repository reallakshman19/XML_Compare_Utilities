"""Stable JSON normalization for pdfplumber vector drawing primitives."""
from __future__ import annotations

import hashlib
import json
import math


def normalize_primitive(source_sha, page, index, kind, item):
    body = {
        "page": page,
        "kind": kind,
        "bbox": _bbox(item),
        "path": _path(item.get("path") or ()),
        "lineWidth": _optional_number(item.get("linewidth")),
        "stroke": bool(item.get("stroke", False)),
        "fill": bool(item.get("fill", False)),
        "evenOdd": bool(item.get("evenodd", False)),
        "strokingColor": _json_value(item.get("stroking_color")),
        "nonStrokingColor": _json_value(item.get("non_stroking_color")),
        "dash": _json_value(item.get("dash")),
    }
    identity = {"sourceSha256": source_sha, "sourceIndex": index, **body}
    digest = hashlib.sha256(_canonical_json(identity)).hexdigest()[:24]
    return {
        "id": f"pdf-vector:p{page}:{index}:{digest}",
        "sourceIndex": index,
        **body,
    }


def _path(path):
    result = []
    for command in path:
        if not isinstance(command, (tuple, list)) or not command:
            continue
        points = []
        for value in command[1:]:
            if isinstance(value, (tuple, list)) and len(value) >= 2:
                x, y = value[0], value[1]
                if _finite(x) and _finite(y):
                    points.append([_round(x), _round(y)])
        result.append({"op": str(command[0]), "points": points})
    return result


def _bbox(item):
    if not all(key in item for key in ("x0", "top", "x1", "bottom")):
        return None
    values = [item["x0"], item["top"], item["x1"], item["bottom"]]
    if not all(_finite(value) for value in values):
        return None
    x0, top, x1, bottom = (float(value) for value in values)
    return [
        _round(min(x0, x1)), _round(min(top, bottom)),
        _round(max(x0, x1)), _round(max(top, bottom)),
    ]


def _canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def _json_value(value):
    if value is None or isinstance(value, (str, int, bool)):
        return value
    if isinstance(value, float):
        return _round(value) if math.isfinite(value) else None
    if isinstance(value, (tuple, list)):
        return [_json_value(item) for item in value]
    return str(value)


def _optional_number(value):
    return _round(value) if _finite(value) else None


def _finite(value):
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def _round(value):
    return round(float(value), 6)
