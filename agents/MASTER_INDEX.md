# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Main base | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|---|
| PR981 | CII Workspace V1 anchored topology + transfer preview | `agent/issue-980-cii-workspace-v1` | APPROVED PROTECTED INTEGRATION IMPLEMENTED / FOCUSED VALIDATION PASS / BROAD VALIDATION REQUIRED | ENGINEERING_CRITICAL | `b0f13c99` | new CII Workspace + owner-approved OD validator and Utilities registry edits | AUTH-001A + AUTH-002 COMPLETE; KEEP DRAFT | run full XML, Revision Compare, Python converter and real browser Utilities validation before merge |

## PR981 GE-010 snapshot

Validated implementation head: `f5bfd5aeb4dc5cefef1583be12b94531dfa469f5`. Later commits update recovery/status records only.

- **22 CII Workspace JavaScript test files PASS** in the reconstructed networkless sweep.
- InputXML→CII2019 generated OD now fails closed in the existing pre-write section validator when OD is non-finite or below the repository neutral-parser threshold of 10.
- `converters/scripts/inputxml_to_cii2019.py` remains unchanged from baseline; normal source OD, carry-forward, and explicit qualified fallback semantics remain intact.
- Legacy root `output.cii` is documented as an invalid historical artifact and is not assigned invented OD values; maintained full-file intake coverage uses `Benchmark/Pipeline/CII`.
- `Utilities -> CII Workspace` is registered through exactly one descriptor in `tabs/psnm-utility-tab.js`; no alternate launcher exists.
- T11 XML topology/path authority: **PASS — focused regression**; full XML suite remains NOT_RUN.
- T12 Revision Compare authority: **PASS — focused regression**; full Revision Compare suite remains NOT_RUN.
- Stage06 remains visibly `NOT_IMPLEMENTED` and fail-closed.
- No GitHub Actions run is attached to the validated implementation head.

## Protected diff boundary

Owner authorization is recorded on Issue #980 comment `5308388872`.

The approved protected cumulative diff against base is intentionally small:
- `converters/scripts/cii2019_section_rules.py`: +44 / -0 — generated ELEMENTS OD compatibility guard only.
- `tabs/psnm-utility-tab.js`: +1 / -0 — one CII Workspace installer descriptor.
- `parser/**`: unchanged.
- `converters/scripts/inputxml_to_cii2019.py`: unchanged.
- Revision Compare and model-converter authorities: unchanged.

## Remaining validation

Before merge, execute the full repository XML/model-converter regressions, full Revision Compare qualification/browser/scale suite, Python converter/section-rule tests including `tests/test_inputxml_to_cii2019_diameter_policy.py`, and a real browser Utilities mount/destroy/re-entry smoke verifying CII Workspace and Revision Compare coexistence.

See `agents/PR981_workreport.md` for the detailed GE-010 acceptance matrix and safety invariants.
