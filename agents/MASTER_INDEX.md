# Agent Work Index

Live GitHub state remains authoritative over this snapshot.

| Work | Mission | Branch | State | Criticality | Main checked | Scope claim | Coordination | Next action |
|---|---|---|---|---|---|---|---|---|
| PR981 | CII Workspace V1 anchored topology + transfer preview | `agent/issue-980-cii-workspace-v1` | FOCUSED EXECUTION VALIDATED / TWO AUTHORITY BLOCKERS / FULL-SUITE FOLLOW-UP | ENGINEERING_CRITICAL | `b0f13c99` | new `tabs/cii-workspace/**`, focused tests/recovery only | SAFE WITH PROTECTED AUTHORITY BLOCKERS | owner decisions on zero/missing-OD parser authority and Utilities registry; run full XML + Revision Compare suites before merge |

## PR981 validation snapshot

Validated product-code head: `565d619b99ee188cb5b4a60797f1578744786ee5`.

- **20 current CII Workspace test files PASS** in one fresh reconstructed execution sweep.
- Parser-backed neutral benchmark intake PASS.
- Repository-root `output.cii` intake is **BLOCKED_BY_PARSER_AUTHORITY** because protected `parser/sections/elements.js` rejects generated element-start rows with OD `0.00000`.
- T11 XML topology/path authority: **PASS — focused regression** using the exact protected baseline path-aligner; full XML suite remains NOT_RUN.
- T12 Revision Compare authority: **PASS — focused regression** using the exact protected baseline bounded matcher/custody logic; full Revision Compare suite remains NOT_RUN.
- All reconstructed CII Workspace JS modules pass `node --check`.
- Stage06 remains visibly `NOT_IMPLEMENTED` and fail-closed.
- Utilities registration remains **BLOCKED_BY_AUTHORITY**; no alternate launcher exists.

## Acceptance snapshot

- Anchors: explicit `CIIWorkspaceAnchor.v1`; one or more user-locked pairs supported; one anchor does not grant registered geometry or automatic HIGH confidence.
- Correspondence: bounded candidate evidence, winner gap, multi-hop neighbourhood, path-sequence evidence, path/reroute gates, target custody and production `alignElementPaths` audit reuse.
- Determinism: parser record index removed from canonical element identity; true source/target record-permutation fixtures PASS.
- Review: `CIIWorkspaceReviewLedger.v1` binds source/target SHA and complete correspondence/evidence identity; engineer LOCK is distinct from computed confidence.
- Custody: NODE, ELEMENT/PATH and explicit RIGID COMPONENT correspondence are separated; ambiguous adjacent evidence downgrades node custody.
- Transfer: reducer/size-transition paths fail closed for P1/T1; rigid weight requires reviewed/locked COMPONENT authority; non-ready correspondence cannot produce a ready transfer plan.
- Fixed-format NODENAME: raw ELEMENTS block pointers are mapped by FROM/TO identity to prevent ordinal drift when the protected parser skips a block.
- Stage01 inspection: version, nodes, elements, terminals, branches, component counts, bends and rigid records are exposed.

Subsequent commits after the validated product-code head are recovery/status documentation only. See `agents/PR981_workreport.md` for the exact GE-008 validation ledger and remaining hard stops.
