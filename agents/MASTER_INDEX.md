# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Main base | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|---|
| PR982 | CII fixed-field ELEMENT parser qualification | `agent/cii-fixed-field-parser` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / DRAFT UNMERGED | ENGINEERING_CRITICAL | `ceb0c019` | `parser/fixed-field.js`, `parser/sections/elements.js`, focused regression + PR982 recovery records | SAFE; predecessor PR981 is merged | keep draft; stacked follow-on for benchmark oracle + capability states |
| PR981 | CII Workspace V1 anchored topology + transfer preview | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 / historical validation limitations retained | ENGINEERING_CRITICAL | `b0f13c99` | CII Workspace V1 + owner-approved OD validator and Utilities registry edits | HISTORICAL; no active claim blocker | none; see PR981 work report for retained limitations |

## PR982 GE-982-001 snapshot

Validated implementation head: `311a35851a78d135d00e52d7bd2642f51beb6260`. Later commits on the branch add Engineering PR Delivery recovery/coordination records only.

- Canonical six-field CAESAR II rows now decode using exact widths `[15,13,13,13,13,13]` before any compatibility fallback.
- The reported SOURCE `255→260` row independently reproduces `DX=0`, `DY=-0.000488281`, `DZ=-271.602`, `OD=60.3`.
- Regression source covers SOURCE/TARGET1/TARGET2 exact benchmark rows; execution of the repository test command remains `NOT_RUN` in the current tool environment.
- `converters/scripts/inputxml_to_cii2019.py` is unchanged; correspondence and transfer authorities are unchanged.
- PR982 is draft, mergeable, with no observed review threads, workflow runs, or commit statuses at the implementation head.

See `agents/PR982_workreport.md`, `agents/status/PR982.yaml`, and `agents/claims/PR982.yaml`.

## PR981 GE-011 historical snapshot

PR981 is **merged**. The validation notes below are retained as historical evidence from its work report rather than as a live blocker/claim.

Validated implementation head: `f5bfd5aeb4dc5cefef1583be12b94531dfa469f5`. Later commits updated recovery/status records only.

- **22 CII Workspace JavaScript test files PASS** in the reconstructed networkless sweep.
- Diameter policy regression intent: **5/5 PASS** in the reconstructed current policy/carry-default slice.
- Pre-existing CII2019 section-rule regression intents: **6/6 PASS** in the reconstructed current validator slice; the OD rule was additive without breaking their targeted assertions.
- Exact Utilities runtime + reconstructed CII Workspace installer: **PASS** for one-tile mount, open, destroy, and re-entry lifecycle in the DOM harness.
- Real Chromium/browser validation was **ENVIRONMENT_BLOCKED** at that time.
- GitHub Actions/status evidence was **WAIVED_BY_OWNER** for PR981 under the recorded 2026-08-16 direction.
- Stage06 remained visibly `NOT_IMPLEMENTED` and fail-closed.

## PR981 protected historical diff boundary

Owner authorization was recorded on Issue #980 comment `5308388872`.

The approved protected cumulative diff against its base was intentionally small:
- `converters/scripts/cii2019_section_rules.py`: +44 / -0 — generated ELEMENTS OD compatibility guard only.
- `tabs/psnm-utility-tab.js`: +1 / -0 — one CII Workspace installer descriptor.
- `parser/**`: unchanged in PR981.
- `converters/scripts/inputxml_to_cii2019.py`: unchanged.
- Revision Compare and model-converter authorities: unchanged.

PR982 is a later owner-authorized parser correction and therefore intentionally supersedes the historical `parser/** unchanged` boundary for its narrow fixed-field scope.
