"""Provider-neutral surface identity helpers for DocumentEvidence.v1."""
from __future__ import annotations

import hashlib
import json


def canonical_json_bytes(value) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
    ).encode("utf-8")


def canonical_hash(value) -> str:
    return f"sha256:{hashlib.sha256(canonical_json_bytes(value)).hexdigest()}"


def make_surface(
    source_hash: str,
    kind: str,
    width: float,
    height: float,
    unit: str,
    origin: str,
    x_axis: str,
    y_axis: str,
    *,
    page_number: int | None = None,
    parent_surface_id: str | None = None,
    provider_profile_hash: str | None = None,
    render_profile_hash: str | None = None,
    metadata: dict | None = None,
) -> dict:
    identity = {
        "schema": "Surface.v1",
        "sourceHash": source_hash,
        "kind": kind,
        "width": round(float(width), 6),
        "height": round(float(height), 6),
        "unit": unit,
        "origin": origin,
        "xAxis": x_axis,
        "yAxis": y_axis,
    }
    _optional(identity, "pageNumber", page_number)
    _optional(identity, "parentSurfaceId", parent_surface_id)
    _optional(identity, "providerProfileHash", provider_profile_hash)
    _optional(identity, "renderProfileHash", render_profile_hash)
    if metadata:
        identity["metadata"] = metadata
    surface_hash = canonical_hash(identity)
    return {
        **identity,
        "surfaceId": f"surface:{kind}:{surface_hash[7:31]}",
        "surfaceHash": surface_hash,
    }


def canonical_pdf_page_surface(
    source_hash: str,
    page_number: int,
    width: float,
    height: float,
    *,
    metadata: dict | None = None,
) -> dict:
    return make_surface(
        source_hash, "pdf-canonical-page", width, height, "pt",
        "top-left", "right", "down", page_number=page_number, metadata=metadata,
    )


def rendered_raster_surface(
    source_hash: str,
    page_surface: dict,
    width: int,
    height: int,
    *,
    image_sha256: str,
    renderer: str,
    renderer_version: str,
    render_scale: float,
    metadata: dict | None = None,
) -> dict:
    raster_metadata = {
        "imageSha256": image_sha256,
        "renderer": renderer,
        "rendererVersion": renderer_version,
        "renderScale": round(float(render_scale), 6),
        **(metadata or {}),
    }
    return make_surface(
        source_hash, "rendered-raster", width, height, "px",
        "top-left", "right", "down", page_number=page_surface.get("pageNumber"),
        parent_surface_id=page_surface["surfaceId"], metadata=raster_metadata,
    )


def canonical_pdf_coordinate_system() -> dict:
    return {
        "contract": "DocumentEvidence.v1",
        "surfaceKind": "pdf-canonical-page",
        "units": "PDF points",
        "origin": "top-left",
        "xDirection": "right",
        "yDirection": "down",
        "bboxOrder": ["x0", "top", "x1", "bottom"],
        "nonAxisAlignedGeometry": "polygon-or-quad",
    }


def _optional(target: dict, key: str, value) -> None:
    if value is not None:
        target[key] = value
