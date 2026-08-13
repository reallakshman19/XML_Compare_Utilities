"""Extraction-only reconciliation decisions for DocumentEvidence.v1."""
from __future__ import annotations

from decimal import Decimal, InvalidOperation

from document_evidence_surface import canonical_hash


class EvidenceDecisionError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def reconcile_cell(observations, *, logical_cell_id: str | None = None) -> dict:
    values = tuple(observations)
    if not values:
        return make_decision("not_found", (), diagnostics=("TABLE_CELL_NOT_FOUND",), notes=_notes(logical_cell_id))
    _validate_observations(values)
    texts = {item["normalizedText"] for item in values}
    if len(texts) == 1:
        selected = _deterministic_selection(values)
        numeric = _exact_decimal(selected["normalizedText"])
        return make_decision(
            "accepted", values, selected=selected,
            effective_text=selected["normalizedText"], effective_numeric=numeric,
            notes=_notes(logical_cell_id),
        )
    numeric_values = tuple(_exact_decimal(item["normalizedText"]) for item in values)
    if all(value is not None for value in numeric_values):
        if len(set(numeric_values)) == 1:
            selected = _deterministic_selection(values)
            return make_decision(
                "accepted", values, selected=selected,
                effective_text=selected["normalizedText"], effective_numeric=numeric_values[0],
                notes=_notes(logical_cell_id),
            )
        return make_decision(
            "review_required", values, diagnostics=("OCR_NUMERIC_DISAGREEMENT",),
            notes=_notes(logical_cell_id),
        )
    return make_decision(
        "review_required", values, diagnostics=("TEXT_OBSERVATION_CONFLICT",),
        notes=_notes(logical_cell_id),
    )


def make_decision(
    state: str,
    observations,
    *,
    selected: dict | None = None,
    effective_text: str | None = None,
    effective_numeric: Decimal | None = None,
    diagnostics=(),
    reconciliation_profile_hash: str | None = None,
    notes: dict | None = None,
) -> dict:
    if state not in {"accepted", "review_required", "blocked", "not_found"}:
        raise EvidenceDecisionError("EVIDENCE_DECISION_STATE_INVALID", f"unsupported decision state: {state}")
    if state == "accepted" and selected is None:
        raise EvidenceDecisionError("EVIDENCE_DECISION_SELECTION_REQUIRED", "accepted decision requires selected observation")
    identity = {
        "schema": "EvidenceDecision.v1",
        "state": state,
        "observationHashes": sorted(item["observationHash"] for item in observations),
        "diagnosticCodes": sorted(set(diagnostics)),
    }
    if selected is not None:
        identity["selectedObservationHash"] = selected["observationHash"]
    if state == "accepted" and effective_text is not None:
        identity["effectiveText"] = str(effective_text)
    if state == "accepted" and effective_numeric is not None:
        identity["effectiveNumericValue"] = float(effective_numeric)
    if reconciliation_profile_hash is not None:
        identity["reconciliationProfileHash"] = reconciliation_profile_hash
    if notes:
        identity["notes"] = notes
    decision_hash = canonical_hash(identity)
    return {
        **identity,
        "decisionId": f"decision:{state}:{decision_hash[7:31]}",
        "decisionHash": decision_hash,
    }


def _validate_observations(observations):
    source_hashes = {item["sourceHash"] for item in observations}
    if len(source_hashes) != 1:
        raise EvidenceDecisionError("EVIDENCE_SOURCE_CONFLICT", "cell observations must share one source")


def _deterministic_selection(observations):
    return sorted(observations, key=lambda item: (item["kind"] != "native-text", item["observationHash"]))[0]


def _exact_decimal(text):
    try:
        value = Decimal(str(text))
    except (InvalidOperation, ValueError):
        return None
    return value if value.is_finite() else None


def _notes(logical_cell_id):
    return {"logicalCellId": logical_cell_id} if logical_cell_id else None
