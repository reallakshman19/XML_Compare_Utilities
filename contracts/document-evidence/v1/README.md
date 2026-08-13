# Document Evidence Contract v1

This directory is the canonical, provider-neutral contract authority for the shared document-evidence platform governed by issue #974.

## Scope

The contract covers generic source identity, rendered surfaces, coordinate transforms, geometry, text/OCR observations, evidence decisions, diagnostics, overlays, deterministic machine evidence, and append-only human correction events.

It deliberately does **not** assign engineering, screening, publication, benchmark, or design authority. An `accepted` evidence decision means only that the extraction evidence resolves what the identified source surface says.

## Authority and portability

XML_Compare_Utilities owns these schemas and canonical conformance vectors. Python implementations in this repository and TypeScript implementations in Pdf-Hub must conform to these files; neither implementation is the schema authority and there is no runtime dependency between the repositories.

## Contract rules

1. Every coordinate is attached to a named `Surface`.
2. Every geometry-changing operation is represented by a `SurfaceTransform` with forward and inverse 3x3 matrices.
3. Machine observations are immutable.
4. Evidence decisions do not mutate observations.
5. Human corrections are append-only events outside deterministic machine evidence.
6. Provider confidence is raw provider evidence unless a separately identified calibration model exists.
7. Non-axis-aligned geometry is represented as polygons/quadrilaterals; axis-aligned bounding boxes may be derived indexes only.
8. Stale source or transform references fail closed for aligned overlays.
9. Generic numeric disagreement defaults to `review_required` when normalized numeric values differ; non-zero tolerances require a separately versioned reconciliation profile.
10. Machine evidence identity excludes execution-time noise but includes all provider/profile/source/transform differences capable of changing meaning.

## Files

- `source.schema.json` — immutable source identity.
- `surface.schema.json` — named coordinate-bearing surfaces.
- `transform.schema.json` — forward/inverse transform lineage.
- `geometry.schema.json` — provider-neutral geometry without lossy Bezier flattening.
- `profile.schema.json` — provider/render/preprocessing identity inputs.
- `observation.schema.json` — immutable native/OCR observations.
- `diagnostic.schema.json` — structured fail-closed diagnostics.
- `decision.schema.json` — extraction-evidence decisions only.
- `overlay.schema.json` — universal document-coordinate overlays.
- `machine-evidence-envelope.schema.json` — deterministic machine evidence bundle.
- `correction-event.schema.json` — append-only reviewer correction event.
- `coordinate-conventions.md` — normative coordinate chain and numerical gates.
- `canonicalization.md` — deterministic JSON/hash rules.
- `openapi.yaml` — schema catalog for HTTP consumers; runtime paths are intentionally not declared in this contract-only slice.
- `conformance/transform-vectors.json` — shared transform test vectors.

## Versioning

The directory name is the schema major version. Compatible additive changes may increment an individual schema's minor metadata. Breaking coordinate semantics, hash semantics, required identity fields, or decision-state meaning require a new major directory.
