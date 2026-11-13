"""Run the 3D_Converters app converter (xml_to_cii2019_runtime_custody.py) unchanged and
write, next to the CII, the converter's own element list (which XML node is at each
element end). Used by u3b_check.py so node identity never comes from guessing.

Usage: python u3b_dump.py <converter scripts dir> <sidecar.json> -- <converter args...>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def node(n) -> dict:
    return {"number": n.node_number, "ref": n.component_ref_no, "pos": list(n.position),
            "type": n.component_type, "endpoint": n.endpoint, "name": n.node_name}


def od_end(e) -> str:
    """Which end supplies the element OD, mirroring xml_to_cii2019._element_outside_diameter."""
    if e.connected_port_outside_diameter is not None:
        return "port"
    if e.to_node.component_type == "BRAN" and e.to_node.endpoint == 2:
        return "to"
    return "from"


def own_material(e):
    """The element's own material (xml_to_cii2019._material_id_for_edge); None = carried forward."""
    for candidate in (e.to_node.material_code, e.from_node.material_code, e.branch_material_number):
        if candidate is not None and candidate > 0:
            return candidate
    return None


def main() -> None:
    conv, sidecar = Path(sys.argv[1]), Path(sys.argv[2])
    assert sys.argv[3] == "--"
    sys.path.insert(0, str(conv))
    import xml_to_cii2019 as base  # noqa: E402
    import xml_to_cii2019_runtime_custody as rc  # noqa: E402

    original = base._build_cii_text
    seen = {}

    def capture(model, *args, **kwargs):
        seen["edges"] = [{"branch": e.branch_name, "from": node(e.from_node), "to": node(e.to_node), "odEnd": od_end(e),
                          "ownMaterial": own_material(e)}
                         for e in model.edges]
        return original(model, *args, **kwargs)

    base._build_cii_text = capture
    sys.argv = [str(conv / rc.__name__) + ".py", *sys.argv[4:]]
    rc.main()
    if "edges" not in seen:
        raise SystemExit("U3B_DUMP_NOT_CAPTURED")
    sidecar.write_text(json.dumps(seen), encoding="utf-8")


if __name__ == "__main__":
    main()
