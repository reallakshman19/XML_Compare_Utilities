"""Build exact OCR TablePass evidence from an external reconstruction adapter."""
from __future__ import annotations

from document_evidence_pdf_ocr_provider import adapt_ocr_page
from document_evidence_table import TableEvidenceError, make_table_pass, reconcile_table_passes


def make_ocr_table_pass(
    source_hash,
    ocr_result,
    table_candidate_id,
    reconstructed_cells,
    *,
    pass_id,
    language="eng",
) -> dict:
    ocr_evidence = adapt_ocr_page(
        source_hash, ocr_result, language=language, pass_id=pass_id,
    )
    observations = ocr_evidence["observations"]
    cells = [
        _cell_from_membership(cell, observations)
        for cell in reconstructed_cells
    ]
    table_pass = make_table_pass(
        table_candidate_id, pass_id, ocr_evidence["pageSurface"], cells,
    )
    return {
        "schema": "DocumentEvidenceOcrTablePass.v1",
        "ocrEvidence": ocr_evidence,
        "tablePass": table_pass,
    }


def reconcile_table_evidence_passes(pass_evidence, *, required_pass_ids=None) -> tuple[dict, ...]:
    bundles = tuple(pass_evidence)
    table_passes = [item["tablePass"] for item in bundles]
    observations = {}
    for item in bundles:
        for observation in _bundle_observations(item):
            observations[observation["observationHash"]] = observation
    return reconcile_table_passes(
        table_passes, observations, required_pass_ids=required_pass_ids,
    )


def _bundle_observations(bundle):
    if "ocrEvidence" in bundle:
        return bundle["ocrEvidence"]["observations"]
    return bundle.get("observations", ())


def _cell_from_membership(cell, observations):
    indexes = tuple(cell.get("wordIndexes") or ())
    if not indexes:
        raise TableEvidenceError(
            "OCR_TABLE_CELL_WORD_REQUIRED",
            "OCR reconstructed cell requires at least one word index",
        )
    selected = []
    for index in indexes:
        if isinstance(index, bool) or not isinstance(index, int) or index < 0 or index >= len(observations):
            raise TableEvidenceError(
                "OCR_TABLE_WORD_INDEX_INVALID",
                f"OCR word index is outside observation range: {index}",
            )
        selected.append(observations[index])
    return {
        "rowIndex": cell["rowIndex"],
        "columnIndex": cell["columnIndex"],
        "geometry": cell["geometry"],
        "observations": selected,
    }
