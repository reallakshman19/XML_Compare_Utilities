# PR981 — CII Workspace V1 Work Report

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY_FOR_FULL_SUITE_AND_BROWSER_VALIDATION
PR_RECOVERY_STATE: CORE + APPROVED PROTECTED INTEGRATION IMPLEMENTED
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #980
PR_OR_WIP: PR981
BRANCH: agent/issue-980-cii-workspace-v1
VALIDATED_IMPLEMENTATION_HEAD: f5bfd5aeb4dc5cefef1583be12b94531dfa469f5
MAIN_BASE: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
GROUNDING_EPOCH: GE-010 APPROVED PROTECTED INTEGRATION
OWNER_AUTHORIZATION_COMMENT: Issue #980 comment 5308388872
```

## What changed after owner authorization

The owner explicitly approved the GE-009 protected changes at 2026-08-16 20:06 +04:00. Recovery provenance is recorded on Issue #980 comment `5308388872`.

### AUTH-002 — Utilities registration IMPLEMENTED

`tabs/psnm-utility-tab.js` now contains exactly one authoritative installer descriptor:

```js
['CII Workspace', './cii-workspace/cii-workspace-tab.js', 'installCiiWorkspaceTile', true]
```

The existing Utilities runtime remains lifecycle authority: it passes `(deckRoot, ctx)`, retains the returned destroy function, and cleans it on Utilities teardown/retry. No alternate launcher was added.

### AUTH-001A — zero/missing-OD writer contract IMPLEMENTED

The generic neutral parser was not weakened. The existing CII2019 pre-write section validator now rejects generated ELEMENTS start rows whose OD is non-finite or below `10`, matching `parser/sections/elements.js` element-start authority.

The unchanged `inputxml_to_cii2019.py` already calls `cii2019_section_rules.assert_cii2019_sections_valid(cii_text)` before `_build_cii_text()` returns. Therefore normal CLI output, workflow callers using `_build_cii_text`, and compatibility raw ELEMENTS overrides all fail closed before invalid neutral CII can be returned/written.

Existing source semantics remain intact:
- a real InputXML diameter is used;
- later missing/sentinel diameter inherits the prior resolved diameter;
- an explicit qualified `--default-diameter` can resolve an initially missing value;
- unresolved, sub-threshold, or non-finite OD cannot become generated neutral CII.

The 3,617-line converter itself is byte-identical to baseline. The final protected diff is surgical: `cii2019_section_rules.py` has 44 added lines / 0 deleted lines and `tabs/psnm-utility-tab.js` has 1 added line / 0 deleted lines.

The historical root `output.cii` is not assigned invented engineering data. Its OD=0 rows remain a legacy-invalid artifact. The full-file CII Workspace intake regression now uses the maintained `Benchmark/Pipeline/CII` corpus instead.

## Validation truth

### CII Workspace

**22 CII Workspace JavaScript test files PASS** in the reconstructed networkless validation environment after the protected integration changes. This includes the previous 20 hardened tests plus:
- full-file intake path using `Benchmark/Pipeline/CII` semantics;
- exact one-descriptor Utilities registry authority check.

All hardened correspondence, permutation, coordinate-invariance, ambiguity/winner-gap, target custody, SHA-bound review, engineer LOCK, rigid COMPONENT custody, transfer, NODENAME, reroute/subdivision, Stage06 fail-closed, export/audit and shell lifecycle oracles remain green in that sweep.

### Diameter contract

A focused contract harness PASS verifies the approved semantics: unresolved first OD fails the threshold, explicit fallback succeeds, real OD carries across a later sentinel, OD 5 fails, OD 10 passes, and non-finite OD fails.

`tests/test_inputxml_to_cii2019_diameter_policy.py` is added as the repository regression binding those semantics to the unchanged converter `_parse_model` behavior plus the actual `cii2019_section_rules.validate_elements_rows` pre-write enforcement point.

### Protected authority regressions

- **T11 XML topology/path — PASS (focused):** exact baseline `xml-cii-inputxml-path-aligner.js` previously executed through topology, permutation, subdivision, ambiguity and disconnected-component oracles.
- **T12 Revision Compare — PASS (focused):** exact baseline bounded matcher previously executed for unique/duplicate identity, candidate cap, winner-gap and target custody.
- **T1 Utilities integration — IMPLEMENTED / focused source+lifecycle checks PASS:** authoritative descriptor exists exactly once and CII installer lifecycle test passes. A full browser Utilities smoke remains required before merge.

GitHub Actions has no workflow run attached to implementation head `f5bfd5a...`; do not represent these focused executions as CI.

## Acceptance matrix

| Area | State | Evidence / remaining |
|---|---|---|
| Parser-supported neutral intake | PASS | parser-backed benchmark + maintained full-file path |
| Generated unknown/sub-threshold OD | PASS — FAIL-CLOSED | pre-write section rule matches neutral parser threshold |
| Legacy root `output.cii` | DOCUMENTED INVALID ARTIFACT | not rewritten with invented engineering OD |
| Live Utilities registration | IMPLEMENTED | one authoritative descriptor; browser smoke NOT_RUN |
| Anchors / one-anchor behavior | PASS | focused execution |
| Geometry authority / transformed XYZ | PASS | focused execution |
| Candidate ambiguity / winner gap | PASS | focused execution |
| Multi-hop / path evidence | PASS | focused execution |
| Structural OD/WT/branch/rigid conflicts | PASS | focused execution |
| Permutation determinism | PASS | focused execution |
| Target custody | PASS | focused execution |
| NODE / ELEMENT-PATH / COMPONENT custody | PASS | focused execution |
| Review SHA/correspondence binding | PASS | focused execution |
| Engineer LOCK authority | PASS | focused execution |
| Reroute / false subdivision gates | PASS | focused execution |
| Stage 06 fail-closed placeholder | PASS | no writer/mutation authority added |
| Audit / CSV determinism | PASS | focused execution |
| Shell lifecycle / stale invalidation | PASS | focused execution |
| T11 XML topology/path | PASS — FOCUSED | full XML suite NOT_RUN |
| T12 Revision Compare | PASS — FOCUSED | full Revision Compare suite NOT_RUN |

## Remaining before merge

1. **FULL-SUITE-001:** run the repository's full XML topology/model-converter suite in a normal authenticated checkout/CI.
2. **FULL-SUITE-002:** run the full Revision Compare qualification/browser/scale suite.
3. **BROWSER-001:** smoke `Utilities -> CII Workspace` in the real Utilities deck, including mount/destroy/re-entry and Revision Compare coexistence.
4. **PYTHON-001:** run the repository Python converter/section-rule tests, including `tests/test_inputxml_to_cii2019_diameter_policy.py`, in a normal checkout. The focused contract harness passed, but no GitHub CI run is attached.
5. **RIGID-001:** broader interior rigid-component ownership remains deliberately fail-closed outside the supportable unique-terminal rigid-record slice.

## Containment / safety invariants

- `parser/**` remains unchanged; no OD=0 parser bypass was introduced.
- `inputxml_to_cii2019.py` remains unchanged relative to baseline; enforcement is in its existing pre-write section-rule authority.
- Utilities integration is the single approved registry descriptor; no alternate launcher exists.
- Stage06 target-CII mutation/export remains visibly `NOT_IMPLEMENTED` and no modified-target bytes can be exported.
- PR remains draft and merge remains owner-only until broad validation is complete.

## Qualification provenance

Issue #980 contains the owner-authored `QUALIFIED` marker before implementation. The five scored screening answers required by the original issue are not present in the issue discussion; treat the owner marker as recorded authority, not as evidence that the full scoring trail exists.