"""Deterministic OCR-word assignment to already-proven table cells."""
from __future__ import annotations


def assign_ocr_words_to_cells(table_pass, words) -> dict:
    cells = table_pass["cells"]
    assignments = {cell["cellId"]: [] for cell in cells}
    diagnostics = []
    for index, word in enumerate(words):
        center = _bbox_center(word.bbox)
        matches = [cell for cell in cells if _contains(cell["geometry"], center)]
        if len(matches) == 1:
            assignments[matches[0]["cellId"]].append((index, word))
        elif len(matches) > 1:
            diagnostics.append({
                "code": "OCR_TABLE_WORD_AMBIGUOUS",
                "wordIndex": index,
                "matchingCellIds": sorted(cell["cellId"] for cell in matches),
            })
    reconstructed = []
    for cell in cells:
        members = sorted(
            assignments[cell["cellId"]],
            key=lambda item: (_bbox_top(item[1].bbox), _bbox_left(item[1].bbox), item[0]),
        )
        if not members:
            continue
        reconstructed.append({
            "rowIndex": cell["rowIndex"],
            "columnIndex": cell["columnIndex"],
            "geometry": cell["geometry"],
            "wordIndexes": [index for index, _ in members],
        })
    return {"cells": reconstructed, "diagnostics": diagnostics}


def _contains(geometry, point):
    if geometry.get("type") not in {"Quad", "Polygon"}:
        return False
    xs = [float(item[0]) for item in geometry["coordinates"]]
    ys = [float(item[1]) for item in geometry["coordinates"]]
    x, y = point
    return min(xs) <= x <= max(xs) and min(ys) <= y <= max(ys)


def _bbox_center(bbox):
    x0, top, x1, bottom = (float(value) for value in bbox)
    return ((x0 + x1) / 2.0, (top + bottom) / 2.0)


def _bbox_top(bbox):
    return min(float(bbox[1]), float(bbox[3]))


def _bbox_left(bbox):
    return min(float(bbox[0]), float(bbox[2]))
