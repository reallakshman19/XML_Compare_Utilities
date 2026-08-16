#!/usr/bin/env python3
"""CAESAR II InputXML -> CII2019 entrypoint with neutral-parser diameter custody.

The implementation lives in ``_inputxml_to_cii2019_impl.py``.  This facade
keeps the historical public module/script name while enforcing the repository
neutral-parser contract before any CII text is built or written: every resolved
element OD must be at least 10.0 model-length units.  Missing diameter may still
inherit from an earlier explicit element or from an explicit ``--default-diameter``;
it may no longer silently fall back to 0.0.
"""

from __future__ import annotations

import math
import _inputxml_to_cii2019_impl as _impl

MIN_NEUTRAL_ELEMENT_OD = 10.0
_original_parse_model = _impl._parse_model


def _validate_resolved_diameters(model) -> None:
    invalid = []
    for index, element in enumerate(model.elements, start=1):
        value = float(element.diameter)
        if not math.isfinite(value) or value < MIN_NEUTRAL_ELEMENT_OD:
            invalid.append((index, element.from_node, element.to_node, value))
    if not invalid:
        return

    preview = ", ".join(
        f"#{index} {from_node:g}->{to_node:g} OD={value:g}"
        for index, from_node, to_node, value in invalid[:6]
    )
    if len(invalid) > 6:
        preview += f", ... {len(invalid) - 6} more"
    raise ValueError(
        "InputXML->CII2019 cannot emit ELEMENTS rows with unresolved/invalid OD "
        f"(< {MIN_NEUTRAL_ELEMENT_OD:g}); repository neutral parsing would not recognize them. "
        "Provide a real PIPINGELEMENT/DIAMETER, allow carry-forward from an earlier real diameter, "
        f"or supply --default-diameter >= {MIN_NEUTRAL_ELEMENT_OD:g}. Invalid elements: {preview}"
    )


def _parse_model(path, defaults):
    model = _original_parse_model(path, defaults)
    _validate_resolved_diameters(model)
    return model


# Preserve the implementation module's complete public/private API for existing
# workflow imports, including underscore-prefixed helpers used by regression tools.
for _name in dir(_impl):
    if _name.startswith("__") or _name in globals():
        continue
    globals()[_name] = getattr(_impl, _name)

_impl._parse_model = _parse_model
main = _impl.main


if __name__ == "__main__":
    raise SystemExit(main())
