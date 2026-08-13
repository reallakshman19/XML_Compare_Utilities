# Document Evidence Contract v1

This directory is the canonical, provider-neutral contract authority for the shared document-evidence platform governed by issue #974.

## Scope

The contract covers source identity, surfaces, coordinate transforms, geometry, provider and render profiles, native-text quality, text/OCR observations, structured diagnostics, evidence decisions, overlays, deterministic machine evidence, and append-only human correction events.

It does **not** assign engineering, screening, publication, benchmark, or design authority. An `accepted` evidence decision means only that extraction evidence resolves what the identified source surface says.

## Authority and portability

XML_Compare_Utilities owns these schemas and canonical conformance vectors. Python implementations here and TypeScript implementations in Pdf-Hub must conform to these files; neither implementation is the schema authority and there is no runtime dependency between repositories.

## Contract rules

1. Every coordinate is attached to a named `Surface`.
2. Geometry-changing operations use `SurfaceTransform` forward/inverse matrices.
3. Machine observations are immutable; decisions and corrections do not rewrite them.
4. Provider confidence remains raw provider evidence.
5. `strong` or `mapping_corrupt` native quality requires supporting evidence and an assessment profile bound to the observation provider profile.
6. DOCX rendered evidence binds a `RenderProfile` including renderer/environment/font/display-policy identity.
7. Diagnostic severity, retained evidence, blocked use, and reviewer resolution come from `diagnostic-catalog.json`.
8. Differing normalized numeric values default to `review_required` unless an explicit versioned reconciliation profile says otherwise.

## Normative files

- `source.schema.json`
- `surface.schema.json`
- `transform.schema.json`
- `geometry.schema.json`
- `provider-profile.schema.json`
- `render-profile.schema.json`
- `native-quality.schema.json`
- `observation.schema.json`
- `diagnostic.schema.json`
- `diagnostic-catalog.json`
- `decision.schema.json`
- `overlay.schema.json`
- `machine-evidence-envelope.schema.json`
- `correction-event.schema.json`
- `coordinate-conventions.md`
- `canonicalization.md`
- `openapi.yaml`
- `conformance/transform-vectors.json`

Provider/render profiles, native-text quality, and diagnostics are normative v1 objects rather than opaque repository-local payloads. Unknown provider coordinate conventions remain representable but are not trusted for coordinate use until resolved.

## Versioning

The directory name is the schema major version. Breaking coordinate semantics, hash semantics, required identity fields, or decision-state meaning require a new major directory.
