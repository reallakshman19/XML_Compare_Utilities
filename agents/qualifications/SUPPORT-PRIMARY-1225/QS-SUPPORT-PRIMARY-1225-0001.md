QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: PARSER_TOPOLOGY
QUALIFICATION_PROFILE_VERSION: 2
CHAIN_ID: SUPPORT-PRIMARY-1225
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1225
QUESTION_SET_ID: QS-SUPPORT-PRIMARY-1225-0001
QUALIFICATION_SCOPE_ID: QSCOPE-SUPPORT-PRIMARY-1225-RELEASE-HARDENING
QUALIFICATION_BASIS_HEAD: 759612b4e355a585aed7d64b566f199340429bdf
QUESTION_SET_STATUS: CURRENT
QUESTION_SET_AUTHOR: ChatGPT GPT-5.6 Sol / chatgpt:b9aad2dc-f140-42c6-b6af-01e9569c0b73
QUESTION_SET_ADMISSION_STATUS: PENDING_INDEPENDENT_ADMISSION
QUESTION_SET_ADMISSION_REQUIREMENT: REQUIRED_ON_TAKEOVER
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_MANIFEST: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE
PURPOSE: QUALIFICATION_ONLY
NOT_AN_IMPLEMENTATION_TASK: TRUE

# Q1 — Production Trace
Repository anchors:
- `tabs/support-steel-relationship-builder/support-report-addon.js`
- `tabs/support-steel-relationship-builder/support-report-engine.js`
- `tabs/support-steel-relationship-builder/support-primary-counting.js`
- `tabs/support-steel-relationship-builder/support-primary-orphan-recovery.js`

Production object/case:
Two simultaneous Support Report popups. Popup A snapshots orphan lateral multiplier 2.0; popup B snapshots 3.0 and is mutated last. A fixture candidate lies at 2.5x lateral distance and all non-distance recovery gates pass.

Required technical work:
Trace the effective orphan-recovery configuration from popup state through the build invocation to final orphan evaluation. Identify every state boundary where a module-global mirror could leak B's value into A.

Concrete payload:
A=2.0, B=3.0, candidate=2.5x. Expected: A rejects on lateral window; B may qualify subject to all other gates.

Required derivation:
State the exact configuration object that must be snapshotted per build, the downstream call chain that must receive it explicitly, and the audit value expected for each popup.

First authority/ownership boundaries:
UI owns invocation configuration; engine/counting/orphan modules consume explicit config and must not reread mutable popup/global state.

Fail if:
The answer allows module-global runtime config to decide a build after invocation or proposes widening orphan tolerances to make both popups agree.

# Q2 — Current Unresolved Problem / Failure Isolation
Repository anchors:
- `tabs/support-steel-relationship-builder/support-primary-counting.js`
- `tabs/support-steel-relationship-builder/support-primary-reconciliation.js`
- issue #1225 protected count rules

Calculation/reconstruction:
Reconstruct the ambiguity-floor count authority.

Concrete payload:
`explicitAssemblyIds.length = 4`, `additionalGeometryOccurrenceIds.length = 2`, `legacyGeometryCount = 7`.

Required derivation:
1. Compute `derivedMinimumCount`.
2. Compute final count when `ambiguityCount = 1`.
3. Compute final count when `ambiguityCount = 0`.
4. Explain why partial/conflicting explicit evidence cannot legitimately publish a count below legacy geometry evidence.

Predicted intermediate values:
`derivedMinimumCount = 6`; with ambiguity final = 7; without ambiguity final = 6.

First wrong boundary:
Any reconciliation/count path that discards unresolved geometry occurrences or bypasses the ambiguity floor.

Falsifier:
If current production code no longer uses the stated explicit-plus-geometry minimum/floor contract, stop and identify the actual current authority before proposing a patch.

Fail if:
The answer counts raw clash rows as final assembly count or treats ambiguity as permission to choose the nearest assembly.

# Q3 — Authority / Invariant
Repository anchors:
- `tabs/support-steel-relationship-builder/support-primary-input.js`
- `tabs/ps-family-clash-audit/ps-family-psclash-xml-parser.js`
- `tabs/support-steel-relationship-builder/support-report-relationship-typicality.js`
- issues #1216, #1222, #1225

Required technical work:
Reconstruct the authority split for current/reference relationship XML, explicit Primary Support Assembly identity, geometry fallback, and Support/Steel carrier/steel production relationships.

Concrete payload:
Current relationship XML is scoped to the current selected exact ancestry. Reference relationship XML must scope from reference Support Report exact ancestry and must not inherit current popup selections. Missing explicit authority on one side must produce relationship-topology UNAVAILABLE rather than NO_MATCH.

Protected invariant:
Relationship evidence may establish Primary Support Assembly membership without becoming #1216 carrier/steel production authority; current/reference scoping remains independent; secondary typicality channels cannot promote structural rejection to TYPICAL.

First wrong boundary:
Any shared mutable current-zone state reused for the reference relationship bundle, or any adapter that promotes legacy relationship XML into carrier/steel truth.

Falsifier:
A current authoritative #1216 contract explicitly granting that XML carrier/steel production authority would require re-grounding; absent that, preserve the separation.

Invalid shortcut:
Use one combined relationship bundle for both current and reference sides.

Fail if:
The answer turns unavailable evidence into mismatch or lets relationship/axis channels rewrite structural candidate ordering.

# Q4 — Independent Validation
Repository anchors:
- `benchmarks/1884.zip`
- `benchmarks/1885.zip`
- `agents/chains/SUPPORT-PRIMARY-1222/QUALIFICATION-RUNBOOK.md`
- issue #1225 benchmark ledger

Independent oracle:
Owner-protected family counts and structural control, evaluated from the real governed benchmark inputs rather than production-generated expected values.

Concrete payload:
`PS-12060=1`, `PS-12877=4`, `PS-12860=6`, `PS-12120=14`, structural control `PS-11168 -> PS-14168`. Separate real-1835 relationship oracles are `PS-11167=6`, `PS-11236=4` only when the authoritative relationship XML is supplied.

Required derivation:
Explain which of these gates can be closed by real 1885 execution and which cannot. Show why synthetic PS-11167/PS-11236 fixtures may validate logic but cannot close the real-1835 gate.

Units/sign/tolerance:
Counts are exact integers. Structural control uses the governed structural matcher contract; no threshold is to be relaxed to preserve the positive control.

Falsifier:
Any receipt lacking actual execution of the required real input, or mixing outputs from different RC SHAs, invalidates the release claim.

Fail if:
The answer promotes source inspection, a no-step Actions job, reconstructed ZIP content, or synthetic fixtures to real-input PASS.

# Q5 — Next Contribution / Minimal Patch
Repository anchors:
- issue #1225 protected no-patch boundary
- current PR #1223 at qualification basis head
- focused Node/browser tests covering popup isolation, count authority, typicality publication and relationship scoping

Required technical work:
Given a hypothetical failing qualification case, identify the first wrong production boundary and the smallest legitimate patch; otherwise state the NO-PATCH disposition.

Concrete payload:
Example failure: popup A audit records lateral multiplier 3.0 after A snapshotted 2.0 because B was mutated last. Expected A behavior is 2.0 and rejection of the 2.5x candidate.

Safe patch boundary:
Remove/avoid the mutable global decision path and pass the invocation snapshot explicitly through the existing addon -> engine -> counting -> orphan-recovery seam. Do not alter grouping tolerances, orphan defaults, topology authority, consensus rules, Column 22 policy, or #1216 producer authority.

Expected before/after evidence:
Before: A observes 3.0 or recovers the 2.5x candidate. After: A audit shows 2.0/reject; B shows 3.0 and may recover; simultaneous builds remain isolated.

Validation required:
Focused unit/integration regression plus real multi-popup Playwright path and retained debug/audit evidence.

Negative test:
Start A1, B1, then A2. A1 may not publish after A2; B1 remains unaffected.

Rollback/falsifier boundary:
If the production path already snapshots and passes immutable per-build config correctly, do not patch it; isolate the failing test/harness/cache boundary instead.

No-patch condition:
If governed execution passes the protected invariants and no reproducible product defect is found, make no product algorithm change.

Fail if:
The proposed patch changes expected counts/tolerances to match output, rewrites structural/relationship/axis algorithms without an isolated defect, or changes product and oracle together.
