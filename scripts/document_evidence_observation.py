"""Immutable text/OCR observation builders for DocumentEvidence.v1."""
from __future__ import annotations

import unicodedata

from document_evidence_surface import canonical_hash


class ObservationError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKC", str(value)).replace("\r\n", "\n").replace("\r", "\n").strip()


def make_observation(
    kind: str, source_hash: str, surface: dict, provider: str, provider_version: str,
    raw_text: str, document_geometry: dict, *, provider_profile_hash: str | None = None,
    input_raster_hash: str | None = None, provider_confidence_raw: float | None = None,
    provider_geometry: dict | None = None, preprocessing_transform_hashes=(),
    native_quality: dict | None = None, raw_provider_evidence_hash: str | None = None,
    extensions: dict | None = None,
) -> dict:
    _validate_binding(kind, source_hash, surface, provider, provider_version)
    identity = _base_identity(
        kind, source_hash, surface, provider, provider_version, raw_text, document_geometry,
    )
    optional = {
        "providerProfileHash": provider_profile_hash,
        "inputRasterHash": input_raster_hash,
        "providerGeometry": provider_geometry,
        "nativeQuality": native_quality,
        "rawProviderEvidenceHash": raw_provider_evidence_hash,
    }
    for key, value in optional.items():
        _optional(identity, key, value)
    if provider_confidence_raw is not None:
        identity["providerConfidenceRaw"] = float(provider_confidence_raw)
    if preprocessing_transform_hashes:
        identity["preprocessingTransformHashes"] = list(preprocessing_transform_hashes)
    if extensions:
        identity["extensions"] = extensions
    observation_hash = canonical_hash(identity)
    prefix = "native" if kind == "native-text" else "ocr"
    return {**identity, "observationId": f"observation:{prefix}:{observation_hash[7:31]}", "observationHash": observation_hash}


def _base_identity(kind, source_hash, surface, provider, provider_version, raw_text, document_geometry):
    return {
        "schema": "Observation.v1", "kind": kind, "sourceHash": source_hash,
        "surfaceId": surface["surfaceId"], "surfaceHash": surface["surfaceHash"],
        "provider": provider, "providerVersion": provider_version,
        "rawText": str(raw_text), "normalizedText": normalize_text(raw_text),
        "documentGeometry": document_geometry,
    }


def _validate_binding(kind, source_hash, surface, provider, provider_version):
    if kind not in {"native-text", "ocr"}:
        raise ObservationError("OBSERVATION_KIND_INVALID", f"unsupported observation kind: {kind}")
    if surface.get("sourceHash") != source_hash:
        raise ObservationError("EVIDENCE_SOURCE_UNBOUND", "observation source does not match surface source")
    if not provider or not provider_version:
        raise ObservationError("OBSERVATION_PROVIDER_REQUIRED", "provider and provider version are required")


def _optional(target: dict, key: str, value) -> None:
    if value is not None:
        target[key] = value
