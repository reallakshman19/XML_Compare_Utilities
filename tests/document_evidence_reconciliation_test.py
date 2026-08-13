import unittest
from document_evidence_correction import make_correction_event
from document_evidence_decision import reconcile_cell
from document_evidence_observation import make_observation
from document_evidence_surface import canonical_pdf_page_surface

SOURCE = "sha256:" + "a" * 64
GEO = {"type": "Quad", "coordinates": [[1, 1], [9, 1], [9, 4], [1, 4]]}
SURFACE = canonical_pdf_page_surface(SOURCE, 1, 100, 100)


def obs(text, confidence, kind="ocr", native_quality=None):
    return make_observation(
        kind, SOURCE, SURFACE, "fixture", "1", text, GEO,
        provider_confidence_raw=confidence, native_quality=native_quality,
    )


class ReconciliationTest(unittest.TestCase):
    def test_numeric_conflict_ignores_confidence(self):
        decision = reconcile_cell([obs("10.0", 0.88), obs("100", 0.97)], logical_cell_id="cell-B")
        self.assertEqual(decision["state"], "review_required")
        self.assertEqual(decision["diagnosticCodes"], ["OCR_NUMERIC_DISAGREEMENT"])
        self.assertNotIn("selectedObservationHash", decision)

    def test_exact_numeric_agreement(self):
        decision = reconcile_cell([obs("10.0", 0.40), obs("10", 0.99)])
        self.assertEqual((decision["state"], decision["effectiveNumericValue"]), ("accepted", 10.0))

    def test_strong_native_wins_confusable_text_without_using_ocr_confidence(self):
        native = obs("T3-1", 0.10, "native-text", {"status": "strong"})
        ocr = obs("T3-l", 0.99)
        decision = reconcile_cell([native, ocr], logical_cell_id="label")
        self.assertEqual((decision["state"], decision["effectiveText"]), ("accepted", "T3-1"))
        self.assertEqual(decision["selectedObservationHash"], native["observationHash"])
        self.assertEqual(decision["diagnosticCodes"], ["TEXT_CONFUSABLE_DISAGREEMENT"])

    def test_corrupt_native_mapping_allows_unanimous_ocr(self):
        native = obs("�3-1", 1.0, "native-text", {"status": "mapping_corrupt"})
        ocr = obs("T3-1", 0.65)
        decision = reconcile_cell([native, ocr], logical_cell_id="label")
        self.assertEqual((decision["state"], decision["effectiveText"]), ("accepted", "T3-1"))
        self.assertEqual(decision["selectedObservationHash"], ocr["observationHash"])
        self.assertEqual(decision["diagnosticCodes"], ["PDF_TEXT_MAPPING_CORRUPT"])

    def test_unknown_native_quality_keeps_confusable_text_under_review(self):
        decision = reconcile_cell([obs("T3-1", 0.10, "native-text"), obs("T3-l", 0.99)])
        self.assertEqual(decision["state"], "review_required")
        self.assertNotIn("selectedObservationHash", decision)

    def test_correction_does_not_mutate_observation(self):
        original = obs("1O.O MPa", 0.91)
        before = original["observationHash"]
        event = make_correction_event(before, "10.0 MPa", "reviewer", "2026-08-13T17:20:00Z", status="approved")
        self.assertEqual(original["observationHash"], before)
        self.assertEqual(event["targetObservationHash"], before)


if __name__ == "__main__":
    unittest.main()
