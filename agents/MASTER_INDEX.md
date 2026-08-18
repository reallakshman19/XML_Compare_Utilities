# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Main base | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|---|
| PR983 | CII benchmark oracle/preflight + truthful capability states | `agent/cii-oracle-capability-states` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / STACKED DRAFT | ENGINEERING_CRITICAL | stacked on PR982 `aacbcf9e` | CII intake capability publication + test-only benchmark oracle/preflight | SAFE STACK; no matcher/parser/transfer edits | keep draft; execute full benchmark tests in qualified runner, then retarget after PR982 merge |
| PR982 | CII fixed-field ELEMENT parser qualification | `agent/cii-fixed-field-parser` | IMPLEMENTATION COMPLETE / VALIDATION PARTIAL / DRAFT UNMERGED | ENGINEERING_CRITICAL | `ceb0c019` | `parser/fixed-field.js`, `parser/sections/elements.js`, focused regression + PR982 recovery records | SAFE; PR983 is explicit stacked dependent | keep draft pending owner/review validation decision |
| PR981 | CII Workspace V1 anchored topology + transfer preview | `agent/issue-980-cii-workspace-v1` | MERGED 2026-08-16 / historical validation limitations retained | ENGINEERING_CRITICAL | `b0f13c99` | CII Workspace V1 + owner-approved OD validator and Utilities registry edits | HISTORICAL; no active claim blocker | none; see PR981 work report for retained limitations |

## PR983 GE-983-002 snapshot

PR983 is an explicit stacked follow-on to PR982. Production scope is limited to `tabs/cii-workspace/cii-workspace-capabilities.js` and the intake integration in `cii-workspace-intake.js`; the benchmark oracle and preflight live only under `Benchmark/CIICompare/` and `tests/`.

- Capability states are explicit: `PARSED`, `EMPTY`, `NOT_PARSED`, `UNSUPPORTED`, `PARSE_ERROR`.
- Nodes, elements, bends, restraints, forces, rigid mass, node names and pipe properties are published only from qualified parser outputs.
- Restraints are marked `PARTIAL`: raw rows are retained, but all CAESAR restraint-code/gap/friction semantics are not yet qualified.
- Hanger, SIF/tee, general weight and line-number semantic counts remain `null`/`NOT_PARSED`; raw section/marker presence is evidence only and cannot become a false zero.
- Process evidence is marked `PARTIAL` and exposes unique parsed P1/T1/T2 values/ranges, explicitly **not** load-case counts.
- `CII_COMPARE_EXPECTED.json` contains explicit SOURCE/TARGET1/TARGET2 mappings and quarantines ambiguous historical notes; numbering offsets are non-authoritative hints and target IDs may not be derived from them.
- Independent source inspection confirms the two oracle gangs are real consecutive paths in SOURCE, TARGET1 and TARGET2, including TARGET2 internal-length redistribution.
- Focused synthetic execution of capability/oracle mechanics passed earlier in the workstream; the exact all-three-file repository benchmark tests remain `NOT_RUN` in this environment after final semantic hardening.
- Stacked diff contains no `parser/**`, matcher/topology, transfer, converter or UI changes.

See `agents/PR983_workreport.md`, `agents/status/PR983.yaml`, and `agents/claims/PR983.yaml`.

## PR982 GE-982-001 snapshot

Validated implementation head: `311a35851a78d135d00e52d7bd2642f51beb6260`. Later commits on the branch add Engineering PR Delivery recovery/coordination records only.

- Canonical six-field CAESAR II rows now decode using exact widths `[15,13,13,13,13,13]` before any compatibility fallback.
- The reported SOURCE `255→260` row independently reproduces `DX=0`, `DY=-0.000488281`, `DZ=-271.602`, `OD=60.3`.
- Regression source covers SOURCE/TARGET1/TARGET2 exact benchmark rows; execution of the repository test command remains `NOT_RUN` in the current tool environment.
- `converters/scripts/inputxml_to_cii2019.py` is unchanged; correspondence and transfer authorities are unchanged.
- PR982 is draft/unmerged and is the explicit dependency base for PR983.

See `agents/PR982_workreport.md`, `agents/status/PR982.yaml`, and `agents/claims/PR982.yaml`.

## PR981 GE-011 historical snapshot

PR981 is **merged**. The validation notes below are retained as historical evidence from its work report rather than as a live blocker/claim.

Validated implementation head: `f5bfd5aeb4dc5cefef1583be12b94531dfa469f5`. Later commits updated recovery/status records only.

- **22 CII Workspace JavaScript test files PASS** in the reconstructed networkless sweep.
- Diameter policy regression intent: **5/5 PASS** in the reconstructed current policy/carry-default slice.
- Pre-existing CII2019 section-rule regression intents: **6/6 PASS** in the reconstructed current validator slice.
- Exact Utilities runtime + reconstructed CII Workspace installer passed one-tile mount/open/destroy/re-entry lifecycle in its DOM harness.
- Real Chromium/browser validation was `ENVIRONMENT_BLOCKED` at that time.
- GitHub Actions/status evidence was `WAIVED_BY_OWNER` for PR981 only under its recorded 2026-08-16 direction.
- Stage06 remained visibly `NOT_IMPLEMENTED` and fail-closed.

## PR981 protected historical diff boundary

Owner authorization was recorded on Issue #980 comment `5308388872`.

The approved protected cumulative diff against its base was intentionally small:
- `converters/scripts/cii2019_section_rules.py`: +44 / -0 — generated ELEMENTS OD compatibility guard only.
- `tabs/psnm-utility-tab.js`: +1 / -0 — one CII Workspace installer descriptor.
- `parser/**`: unchanged in PR981.
- `converters/scripts/inputxml_to_cii2019.py`: unchanged.
- Revision Compare and model-converter authorities: unchanged.

PR982 is a later owner-authorized parser correction and intentionally supersedes the historical `parser/** unchanged` boundary only for its narrow fixed-field scope.
