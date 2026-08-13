import unittest
from document_evidence_correction import make_correction_event
from document_evidence_decision import reconcile_cell
from document_evidence_observation import make_observation
from document_evidence_surface import canonical_pdf_page_surface

SOURCE = "sha256:" + "a" * 64
GEO = {"type": "Quad", "coordinates": [[1, 1], [9, 1], [9, 4], [1, 4]]}
SURFACE = canonical_pdf_page_surface(SOURCE, 1, 100, 100)


def obs(text, confidence, kind="ocr"):
    return make_observation(kind, SOURCE, SURFACE, "fixture", "1", text, GEO, provider_confidence_raw=confidence)


class ReconciliationTest(unittest.TestCase):
    def test_numeric_conflict_ignores_confidence(self):
        decision = reconcile_cell([obs("10.0", 0.88), obs("100", 0.97)], logical_cell_id="cell-B")
        self.assertEqual(decision["state"], "review_required")
        self.assertEqual(decision["diagnosticCodes"], ["OCR_NUMERIC_DISAGREEMENT"])
        self.assertNotIn("selectedObservationHash", decision)

    def test_exact_numeric_agreement(self):
        decision = reconcile_cell([obs("10.0", 0.40), obs("10", 0.99)])
        self.assertEqual((decision["state"], decision["effectiveNumericValue"]), ("accepted", 10.0))

    def test_correction_does_not_mutate_observation(self):
        original = obs("1O.O MPa", 0.91)
        before = original["observationHash"]
        event = make_correction_event(before, "10.0 MPa", "reviewer", "2026-08-13T17:20:00Z", status="approved")
        self.assertEqual(original["observationHash"], before)
        self.assertEqual(event["targetObservationHash"], before)


if __name__ == "__main__":
    unittest.main()
