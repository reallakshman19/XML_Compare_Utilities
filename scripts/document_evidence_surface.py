"""Provider-neutral surface identity helpers for DocumentEvidence.v1."""
from __future__ import annotations

import hashlib
import json


def canonical_json_bytes(value) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def canonical_hash(value) -> str:
    return f"sha256:{hashlib.sha256(canonical_json_bytes(value)).hexdigest()}"


def validate_render_profile(profile: dict) -> dict:
    if not isinstance(profile, dict) or profile.get("schema") != "RenderProfile.v1":
        raise ValueError("RENDER_PROFILE_SCHEMA_INVALID")
    claimed = profile.get("renderProfileHash")
    identity = {key: value for key, value in profile.items() if key not in {"renderProfileId", "renderProfileHash"}}
    if claimed != canonical_hash(identity):
        raise ValueError("RENDER_PROFILE_HASH_INVALID")
    if identity.get("documentKind") == "docx":
        _validate_docx_render_profile(identity)
    return profile


def make_surface(
    source_hash: str, kind: str, width: float, height: float, unit: str, origin: str,
    x_axis: str, y_axis: str, *, page_number: int | None = None,
    parent_surface_id: str | None = None, provider_profile_hash: str | None = None,
    render_profile_hash: str | None = None, metadata: dict | None = None,
) -> dict:
    identity = {
        "schema": "Surface.v1", "sourceHash": source_hash, "kind": kind,
        "width": round(float(width), 6), "height": round(float(height), 6),
        "unit": unit, "origin": origin, "xAxis": x_axis, "yAxis": y_axis,
    }
    _optional(identity, "pageNumber", page_number)
    _optional(identity, "parentSurfaceId", parent_surface_id)
    _optional(identity, "providerProfileHash", provider_profile_hash)
    _optional(identity, "renderProfileHash", render_profile_hash)
    if metadata:
        identity["metadata"] = metadata
    surface_hash = canonical_hash(identity)
    return {**identity, "surfaceId": f"surface:{kind}:{surface_hash[7:31]}", "surfaceHash": surface_hash}


def canonical_pdf_page_surface(source_hash: str, page_number: int, width: float, height: float, *, metadata: dict | None = None) -> dict:
    return make_surface(source_hash, "pdf-canonical-page", width, height, "pt", "top-left", "right", "down", page_number=page_number, metadata=metadata)


def rendered_raster_surface(
    source_hash: str, page_surface: dict, width: int, height: int, *, image_sha256: str,
    renderer: str, renderer_version: str, render_scale: float,
    render_profile_hash: str | None = None, render_profile: dict | None = None,
    metadata: dict | None = None,
) -> dict:
    profile_hash = _render_profile_hash(render_profile, render_profile_hash)
    raster_metadata = {
        "imageSha256": image_sha256, "renderer": renderer,
        "rendererVersion": renderer_version, "renderScale": round(float(render_scale), 6),
        **(metadata or {}),
    }
    return make_surface(
        source_hash, "rendered-raster", width, height, "px", "top-left", "right", "down",
        page_number=page_surface.get("pageNumber"), parent_surface_id=page_surface["surfaceId"],
        render_profile_hash=profile_hash, metadata=raster_metadata,
    )


def _render_profile_hash(profile, explicit_hash):
    if profile is None:
        return explicit_hash
    validate_render_profile(profile)
    profile_hash = profile["renderProfileHash"]
    if explicit_hash is not None and explicit_hash != profile_hash:
        raise ValueError("RENDER_PROFILE_HASH_CONFLICT")
    return profile_hash


def _validate_docx_render_profile(identity):
    required = {"rendererBinaryHash", "fontManifestHash", "locale", "trackedRevisionDisplay", "fieldUpdatePolicy", "environment"}
    missing = sorted(key for key in required if key not in identity)
    environment = identity.get("environment") or {}
    if not environment.get("osFamily") or not environment.get("architecture"):
        missing.append("environment.osFamily+architecture")
    if missing:
        raise ValueError(f"DOCX_RENDER_PROFILE_INCOMPLETE: {', '.join(missing)}")


def canonical_pdf_coordinate_system() -> dict:
    return {
        "contract": "DocumentEvidence.v1", "surfaceKind": "pdf-canonical-page",
        "units": "PDF points", "origin": "top-left", "xDirection": "right",
        "yDirection": "down", "bboxOrder": ["x0", "top", "x1", "bottom"],
        "nonAxisAlignedGeometry": "polygon-or-quad",
    }


def _optional(target: dict, key: str, value) -> None:
    if value is not None:
        target[key] = value
