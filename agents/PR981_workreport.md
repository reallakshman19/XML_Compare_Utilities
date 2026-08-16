# PR981 — CII Workspace V1 Work Report

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY_FOR_OWNER_DECISIONS_WITH_FULL_SUITE_FOLLOWUP
PR_RECOVERY_STATE: HARDENED_NEW_FILE_CORE / FOCUSED_EXECUTION_VALIDATED
TAKEOVER_AUTHORITY: WRITE_ALLOWED (NEW FILES ONLY)
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #980
PR_OR_WIP: PR981
BRANCH: agent/issue-980-cii-workspace-v1
VALIDATED_PRODUCT_HEAD: 565d619b99ee188cb5b4a60797f1578744786ee5
MAIN_HEAD_LAST_CHECKED: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
MERGE_BASE: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
GROUNDING_EPOCH: GE-008 FOCUSED EXECUTION VALIDATION
```

## Validation truth

A networkless local validation slice was reconstructed from GitHub connector content at product head `565d619b99ee188cb5b4a60797f1578744786ee5`. The hardened CII Workspace modules and the protected baseline path-aligner were executed locally. Neutral-CII parser execution used the protected baseline neutral parser logic, including the exact `parser/sections/elements.js` element-start heuristic. XML/PDF parser imports were load-only shims because those parser branches were not exercised by the neutral-CII tests.

### CII Workspace result

**20 CII Workspace test files PASS in one fresh sweep.**

PASS:
1. `cii-workspace-alignment-semantics.test.js`
2. `cii-workspace-coordinate-invariance.test.js`
3. `cii-workspace-determinism.test.js`
4. `cii-workspace-disconnected-components.test.js`
5. `cii-workspace-export-audit.test.js`
6. `cii-workspace-gang-ambiguity.test.js`
7. `cii-workspace-geometry-authority.test.js`
8. `cii-workspace-hard-conflict.test.js`
9. `cii-workspace-intake-benchmark-slice.test.js`
10. `cii-workspace-landmarks.test.js`
11. `cii-workspace-nodename.test.js`
12. `cii-workspace-placeholder-gate.test.js`
13. `cii-workspace-reroute-unresolved.test.js`
14. `cii-workspace-rigid-custody.test.js`
15. `cii-workspace-shell-lifecycle.test.js`
16. `cii-workspace-single-anchor.test.js`
17. `cii-workspace-topology-route-gates.test.js`
18. `cii-workspace-topology.test.js`
19. `cii-workspace-transfer-preview.test.js`
20. `cii-workspace-transfer-review.test.js`

The repository-root `cii-workspace-intake.test.js` is **BLOCKED_BY_AUTHORITY**, not PASS. The root `output.cii` element records begin with OD `0.00000`; the protected baseline `isElemRow` heuristic rejects OD below 10. The failure mode `CII_WORKSPACE_ELEMENTS_REQUIRED` was reproduced against the exact leading root-file element block. Do not patch or bypass that parser under current authority.

All reconstructed CII Workspace JS modules also passed `node --check`.

## Focused protected-authority regressions

- **T11 XML topology/path — PASS (focused authority regression):** the exact protected baseline `xml-cii-inputxml-path-aligner.js` was executed by the topology, permutation, subdivision, ambiguity and disconnected-component tests. Path construction/alignment remained deterministic and target/path custody behavior remained intact.
- **T12 Revision Compare — PASS (focused authority regression):** the exact protected baseline `revision-compare-matching.js` was executed in a focused regression covering unique exact identity, duplicate-identity ambiguity, bounded candidate generation, winner-gap rejection, candidate cap and one-target custody.

These focused PASS results are **not** a claim that the repository's full `test:xml`, full Revision Compare qualification/browser suite, or all T1–T12 package-level regressions ran. Those broader suites remain `NOT_RUN` in this networkless reconstruction environment.

## Acceptance matrix

| Area | State | Evidence / remaining |
|---|---|---|
| Parser-supported neutral intake | PASS | parser-backed benchmark test |
| Root `output.cii` intake | BLOCKED_BY_AUTHORITY | protected OD heuristic rejects generated OD=0 element starts |
| Anchors / one-anchor behavior | PASS | single-anchor test + shell lifecycle |
| Geometry authority / transformed XYZ | PASS | geometry + coordinate-invariance tests |
| Candidate ambiguity / winner gap | PASS | gang ambiguity test |
| Multi-hop / path evidence | PASS | correspondence tests execute hardened evidence path |
| Structural OD/WT/branch/rigid conflicts | PASS | hard-conflict test |
| Permutation determinism | PASS | record-order and same-geometry P1/T1 permutations |
| Target custody | PASS | single-anchor competing-claim oracle |
| NODE / ELEMENT-PATH / COMPONENT custody | PASS | alignment, transfer, rigid-component tests |
| Review SHA/correspondence binding | PASS | transfer-review stale-identity tests |
| Engineer LOCK authority | PASS | bound review/LOCK test |
| Reroute / false subdivision gates | PASS | reroute/subdivision test |
| Stage 06 fail-closed placeholder | PASS | placeholder gate + shell lifecycle |
| Audit / CSV determinism | PASS | export-audit test |
| Shell lifecycle / stale invalidation | PASS | installer lifecycle test |
| T11 XML topology/path authority | PASS — FOCUSED | exact baseline path-aligner exercised; full XML suite NOT_RUN |
| T12 Revision Compare authority | PASS — FOCUSED | exact baseline bounded matcher exercised; full suite NOT_RUN |
| Utilities registration | BLOCKED_BY_AUTHORITY | requires protected `tabs/psnm-utility-tab.js` edit |

## Remaining hard stops

1. **AUTH-001 — parser decision required.** Decide authoritative behavior for zero/missing OD in neutral CII. Do not silently promote `output-normalizer.js` or weaken `parser/sections/elements.js` under current scope.
2. **AUTH-002 — Utilities registration required.** Live `Utilities -> CII Workspace` needs the authoritative existing registry edit; no alternate launcher is acceptable.
3. **FULL-SUITE-001 — follow-up validation.** Run the repository's full XML and Revision Compare suites in a normal authenticated checkout/CI before merge. Focused T11/T12 authority regressions pass, but full-suite evidence remains NOT_RUN.
4. **RIGID-001 — conservative limit.** Interior rigid-component ownership remains fail-closed outside the supportable unique-terminal rigid-record slice.

## Containment invariants

Current write scope remains only new `tabs/cii-workspace/**`, new `tests/cii-workspace-*`, and PR recovery records. Protected parser, model-converter, Revision Compare, XML Compare, converter/writer/navigation files and `tabs/psnm-utility-tab.js` remain untouched. Stage 06 remains `NOT_IMPLEMENTED`; no modified-target-CII bytes can be exported.

Keep PR draft. Do not merge, change parser authority, add writer authority, or bypass Utilities registration without explicit owner authorization.

## Qualification provenance

Issue #980 contains an owner-authored `QUALIFIED` marker before implementation commits. The five scored screening answers required by the original issue are not present in the issue discussion; treat the owner marker as the recorded authority, not as evidence that the scoring trail exists.