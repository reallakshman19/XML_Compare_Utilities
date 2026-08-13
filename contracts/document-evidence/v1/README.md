# Document Evidence Contract v1

This directory is the canonical, provider-neutral contract authority for the shared document-evidence platform governed by issue #974.

## Scope

The contract covers source identity, surfaces, coordinate transforms, geometry, text/OCR observations, evidence decisions, overlays, deterministic machine evidence, and append-only human correction events.

It does **not** assign engineering, screening, publication, benchmark, or design authority. An `accepted` evidence decision means only that extraction evidence resolves what the identified source surface says.

## Authority and portability

XML_Compare_Utilities owns these schemas and canonical conformance vectors. Python implementations here and TypeScript implementations in Pdf-Hub must conform to these files; neither implementation is the schema authority and there is no runtime dependency between repositories.

## Contract rules

1. Every coordinate is attached to a named `Surface`.
2. Every geometry-changing operation is represented by a `SurfaceTransform` with forward and inverse 3x3 matrices.
3. Machine observations are immutable.
4. Evidence decisions do not mutate observations.
5. Human corrections are append-only events outside deterministic machine evidence.
6. Provider confidence is raw provider evidence unless a separately identified calibration model exists.
7. Non-axis-aligned geometry is a polygon or quad; an axis-aligned bbox is derived only.
8. Stale source or transform references fail closed for aligned overlays.
9. Differing normalized numeric values default to `review_required`; a non-zero tolerance requires a separately versioned reconciliation profile.
10. Machine evidence identity excludes execution-time noise but includes provider, source, surface, and transform differences that can change meaning.

## Files

- `source.schema.json`
- `surface.schema.json`
- `transform.schema.json`
- `geometry.schema.json`
- `observation.schema.json`
- `decision.schema.json`
- `overlay.schema.json`
- `machine-evidence-envelope.schema.json`
- `correction-event.schema.json`
- `coordinate-conventions.md`
- `canonicalization.md`
- `openapi.yaml`
- `conformance/transform-vectors.json`

Provider/render profile schemas and the structured diagnostic catalog are the next contract extension before runtime migration. Until then, profile and diagnostic objects in the machine envelope are opaque extension points and implementations must not invent incompatible shared semantics.

## Versioning

The directory name is the schema major version. Breaking coordinate semantics, hash semantics, required identity fields, or decision-state meaning require a new major directory.
