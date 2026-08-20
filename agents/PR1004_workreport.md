# PR1004 — CII Writer 1C Phase-1 NODENAME Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY / IMPLEMENTATION COMPLETE / QUALIFICATION PARTIAL
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE1003_PHASE1
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1003
PR: 1004
BRANCH: agent/cii-writer-1c
REPORT_BASIS_HEAD: 19f020c11ae5d6dec97a7455b3d66954a5a70702
MAIN_HEAD_LAST_CHECKED: 5a5fa0ae5068a7c15eecc1a57557e71336b9754c
STACKED_BASE: PR1002 / agent/cii-writer-1c-roadmap@1dd7a4fc8823c54ef38f5f938167d13076d49c65
GROUNDING_EPOCH: GE-003 / 2026-08-20
CURRENT_STAGE: PHASE1_IMPLEMENTED / PRODUCT_EXPLICIT_PATH_INTEGRATED / FULL_REPO_QUALIFICATION_PENDING
CURRENT_BLOCKER: FULL_REPOSITORY_AND_BROWSER_EXECUTION_NOT_AVAILABLE_IN_CURRENT_RUNTIME
HIGHEST_RISK: real benchmark/core round-trip and browser workflow remain authored but not executed
LAST_DURABLE_CHECKPOINT: full 20-file PR diff reconciled; 0 unexplained files; no workflow/protected-converter changes
EXACT_NEXT_ACTION: execute focused Writer1C JS tests + real BM_CII_TARGET1 production-parser round-trip in a complete checkout; then execute CII Workspace browser workflow before any ready-for-review/merge transition
```

## 2. Handover in 60 Seconds

PR1004 implements **Writer 1C Phase 1 only**:

```text
existing TARGET NODENAME row
+ existing non-zero pointer
+ exact physical ownership
+ pointer/index unchanged
+ section cardinality unchanged
+ CONTROL unchanged
+ explicit APPLY
+ original-byte custody
+ exact preimage
+ equal-width ASCII byte replacement
+ independent byte/structure/semantic negative assurance
```

The implementation is end-to-end and explicitly selectable as `writerVersion: '1C'`, but the production default remains Writer 1B. It does not silently enable 1C.

The core safety rule is now implemented rather than merely documented:

```text
S_auth = spans independently derived from
         APPLY operations + TARGET physical custody + qualified NODENAME layout

D = actual changed byte indices

PASS only if D ⊆ S_auth
```

Writer-reported mutation spans are audit testimony only and are cross-checked after independent authorization.

SIF/TEE field 2 remains semantically unqualified and blocked. Hangers, pointer/cardinality changes, Writer2 and Writer3 remain outside this PR.

## 3. Repository Ground Truth

```text
main                       5a5fa0ae5068a7c15eecc1a57557e71336b9754c
PR1002                      OPEN / DRAFT / MERGEABLE / UNMERGED
PR1002 head                 1dd7a4fc8823c54ef38f5f938167d13076d49c65
PR1004                      OPEN / DRAFT
PR1004 report-basis head    19f020c11ae5d6dec97a7455b3d66954a5a70702
PR1004 vs stacked base      ahead 41 / behind 0
PR1004 files                20 expected / 20 actual / 0 unexplained
GitHub commit checks        none observed
GitHub workflow runs        none observed
```

GitHub PR metadata currently reports `mergeable=false`, while the compare API reports a clean linear relationship (`ahead_by=41`, `behind_by=0`, merge base exactly PR1002 head). Do not infer merge readiness from either alone. PR1004 remains draft and stacked; re-evaluate/retarget after owner-authorized PR1002 merge.

`agents/MASTER_INDEX.md` is intentionally not edited in PR1004 because PR1002 currently owns that documentation path. PR1004's live status/claim/workreport are its coordination authority until the stacked predecessor is normalized.

## 4. Implemented Architecture

### 4.1 Original-byte physical custody

New `cii-workspace-physical-file.js`:
- accepts `Uint8Array` / `ArrayBuffer` / views as authoritative bytes;
- exact byte SHA input is retained independently of parser text;
- preserves CRLF/LF/CR and no-final-newline state with absolute offsets;
- string callers remain compatibility-only and are **not Writer1C byte eligible**;
- strict UTF-8 is used when valid; otherwise parser text may use replacement-compatible decoding while original bytes remain unchanged;
- exact Writer1C pointer/NODENAME fields must still be ASCII.

Intake now exposes:
`byteLength`, `byteAuthority`, `writer1CByteEligible`, `textEncodingAuthority`, and `physicalFile`.

### 4.2 NODENAME physical custody

`cii-workspace-nodename.js` now uses fixed-field numeric decoding and persists:

```text
ELEMENT rows/block             15
NODENAME pointer row           13 zero-based
NODENAME pointer fixed span    [67,80) width 13
FROM field                     [2,28)  width 26
TO field                       [28,53) width 25
```

`CIIWorkspaceNodeNamePhysicalCustody.v1` records exact element/block/pointer/row/field/absolute-byte ownership and a reverse `bySpan` alias-owner map.

Any semantic custody conflict (unreadable/out-of-range pointer, missing element block, unknown-node/conflicting-name evidence, etc.) also blocks physical Writer1C custody. Partial alias maps cannot authorize mutation.

### 4.3 Narrow transfer authority

Qualified NODENAME COPY gets only:

```text
CII_WRITER_1C_NODENAME_EXISTING_ROW_FIELD
```

Deletion remains blocked. Nonblank overwrite remains blocked unless the existing explicit overwrite option authorizes it. SIF raw changes remain `SIF_TEE_FIELD_SEMANTICS_UNQUALIFIED`.

### 4.4 Shared physical-span arbitration

`cii-workspace-writer1c-nodename.js` plans before writing:
- same physical span + same canonical bytes -> one mutation;
- same span + different requested bytes -> `WRITER_1C_NODENAME_SHARED_RECORD_CONFLICT`;
- mutation affects unselected alias owner -> `WRITER_1C_NODENAME_UNAPPROVED_ALIAS_EFFECT`;
- pointer zero requiring row creation -> Writer2 blockers;
- > fixed width or non-ASCII -> fail closed;
- exact semantic preimage required.

Sequential last-writer-wins is impossible in this path.

### 4.5 Byte-only patcher

`cii-workspace-target-writer-1c.js`:
- copies original bytes;
- rechecks exact byte preimage;
- writes exact equal-width ASCII slice;
- preserves total byte length;
- returns byte output as authority plus mutation testimony.

It does not rebuild the complete CII text.

### 4.6 Independent validation

`cii-workspace-writer1c-validation.js` does **not** import Writer/planner code. It independently recomputes allowed spans and validates:
- actual byte diff subset of authorized spans;
- exact pre/post field bytes;
- file byte length;
- physical line count and line-ending sequence;
- section order;
- ELEMENT 15-row cardinality and all auxiliary pointers;
- CONTROL raw rows;
- NODENAME/SIF/RESTRANT/RIGID/MISCEL_1 row counts;
- node identity/geometry and element connectivity;
- expected NODENAME semantic deltas only;
- auxiliary/hanger semantics unchanged;
- Writer-reported span set equals independently derived set.

The mandatory falsifier is caught twice in principle: unauthorized byte change and pointer ownership drift.

### 4.7 Explicit core/product routing

Core and scope enumerate `1A | 1B | 1C`; no `else => 1B` substitute for an explicit 1C request.

For Writer1C apply:

```text
TARGET original bytes
 -> current TARGET intake/hash check
 -> byte patcher
 -> modified TARGET re-intake from bytes
 -> independent Writer1C validator
 -> PASS result only after validation
```

Workspace shell and scoped UI now read files via `arrayBuffer()` and export validated Writer1C bytes. The host may explicitly pass `context.writerVersion`; no literal product default to 1C was added. Existing default remains Writer1B.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation truth |
|---|---|---|---|
| original-byte custody | DONE | intake + UI | local focused PASS |
| physical NODENAME custody | DONE | intake evidence | local focused PASS |
| shared-span arbitration | DONE | Writer1C plan | local focused PASS |
| equal-width byte patch | DONE | Writer1C apply | local focused PASS |
| independent negative assurance | DONE | core apply | local falsifier PASS |
| transfer policy token | DONE | transfer plan | focused source/local checks |
| explicit 1C scope/core routing | DONE | preview/apply | source/local checks |
| byte-aware shell/scoped UI | DONE | explicit host 1C path | source/local checks; browser NOT_RUN |
| independent Python oracle | DONE | qualification | PASS / independent reproduction |
| real benchmark production-parser round trip | AUTHORED | core apply | NOT_RUN |
| full repository suite | N/A | repository | NOT_RUN |
| Chromium/browser lifecycle | N/A | product | NOT_RUN |

## 6. Active Engineering Item Register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-1C-001 | ISS | HIGH | RESOLVED_BY_PR | original-byte custody reaches intake/core/shell/scoped apply |
| ISS-1C-002 | ISS | HIGH | RESOLVED_BY_PR | physical NODENAME spans + reverse aliases persisted |
| ISS-1C-003 | ISS | HIGH | RESOLVED_BY_PR | 1C validator derives authority independently of Writer reports |
| ISS-1C-004 | ISS | MEDIUM | RESOLVED_BY_PR | core/scope routing explicitly handles 1A/1B/1C |
| RISK-1C-001 | RISK | HIGH | MITIGATED | no whole-file Writer1C reserialization; original bytes remain authority |
| RISK-1C-002 | RISK | HIGH | OPEN_QUALIFICATION | real benchmark/full checkout/browser execution still required |
| RISK-1C-003 | RISK | MEDIUM | OPEN_COORDINATION | stacked PR currently has contradictory mergeability metadata; normalize only after PR1002 owner decision |
| DEBT-BASE-001 | DEBT | LOW | PREEXISTING | live `tests/cii-workspace-intake.test.js` expects older `parserAuthority` text than live main already returns; unrelated to PR1004 and intentionally not altered |
| DEC-1C-001 | DEC | HIGH | ACTIVE | validator-derived spans are authority; Writer spans are testimony |
| DEC-1C-002 | DEC | HIGH | ACTIVE | Phase1 allows NODENAME only; mixed mutable lower-writer + 1C APPLY remains blocked |
| DEC-1C-003 | DEC | HIGH | ACTIVE | unselected alias semantic effect blocks |
| DEC-1C-004 | DEC | HIGH | ACTIVE | default product writer stays 1B; 1C requires explicit selection |

## 7. Validation Evidence

### VAL-1C-001 — byte custody / shared ownership

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: IMPLEMENTATION_COUPLED_REGRESSION
```

Observed: exact CRLF/no-final-newline custody; pointer width 13; TO width 25; shared pointer produces one span with two owners; text-only compatibility is Writer1C blocked; malformed pointer makes semantic and physical custody fail closed; unrelated invalid UTF-8 byte remains byte-preserved.

### VAL-1C-002 — planner/patcher/fixed-field boundaries

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: FOCUSED_REGRESSION
```

Observed:
- blank -> 1 char READY;
- exact 25-byte TO READY;
- internal spaces/punctuation READY;
- non-ASCII blocked;
- 26-byte TO overflow blocked;
- identical shared requests canonicalize;
- `P-101A` vs `P-101B` conflicts;
- unselected alias blocks;
- pointer 0 routes to Writer2 blocker;
- valid `OLD -> NEW` changes only 3 bytes in the synthetic case.

### VAL-1C-003 — anti-drift falsifier

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_VALIDATOR_DERIVATION
```

A deliberate unrelated SIF-pointer digit change after the valid NODENAME patch is rejected with `UNAUTHORIZED_BYTE_CHANGE`.

### VAL-1C-004 — independent Python oracle

```text
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_REPRODUCTION
```

`tests/qualification/cii-workspace-writer1c-nodename-oracle.py` imports no production Writer. It independently computed the synthetic TO span `(2514,2539)`, observed 3 changed bytes for `OLD -> NEW`, and caught the SIF-pointer falsifier.

### VAL-1C-005 — legacy NODENAME semantic compatibility

```text
Status: PASS
Observation: LOCAL_RECONSTRUCTED_EXISTING_TEST
Oracle: PREEXISTING_TEST_EXPECTATIONS
```

The pre-existing NODENAME semantic cases were re-exercised after physical-custody hardening; unreadable pointer semantics remain `NODENAME_POINTER_UNREADABLE` rather than being silently reclassified.

### VAL-1C-006 — real benchmark production-parser/core round trip

```text
Status: AUTHORED_NOT_RUN
Observation: NOT_OBSERVED
Oracle: PRODUCTION_PARSER + INDEPENDENT_1C_VALIDATOR
```

`tests/cii-workspace-writer1c-benchmark-roundtrip.test.js` reads `Benchmark/CIICompare/BM_CII_TARGET1.CII` as bytes, discovers a safe existing non-aliased NODENAME owner, drives actual intake -> `applyCiiWorkspaceTargetWriter1C` -> byte re-intake -> independent validation, and requires byte length unchanged and unexpected semantic deltas = 0. It has not executed in the current connector runtime.

### NOT_RUN qualification

```text
focused repository Writer1C JS test files     NOT_RUN_AS_REPOSITORY_SUITE
real BM_CII_TARGET1 production round trip     AUTHORED_NOT_RUN
full CII Workspace shell lifecycle            NOT_RUN
Chromium/browser workflow                     NOT_RUN
full repository suite                         NOT_RUN
GitHub CI/status checks                        NOT_RUN / none present
GitHub workflow runs                           NOT_RUN / none present
```

No authored test is represented as PASS unless execution was actually observed.

## 8. 20-File Changed Ledger

Recovery/custody:
```text
agents/PR1004_workreport.md
agents/claims/PR1004.yaml
agents/status/PR1004.yaml
```

Production:
```text
tabs/cii-workspace/cii-workspace-core.js
tabs/cii-workspace/cii-workspace-intake.js
tabs/cii-workspace/cii-workspace-nodename.js
tabs/cii-workspace/cii-workspace-physical-file.js
tabs/cii-workspace/cii-workspace-shell.js
tabs/cii-workspace/cii-workspace-tab.js
tabs/cii-workspace/cii-workspace-target-writer-1c.js
tabs/cii-workspace/cii-workspace-transfer-policy.js
tabs/cii-workspace/cii-workspace-transfer-scope-ui.js
tabs/cii-workspace/cii-workspace-transfer-scope.js
tabs/cii-workspace/cii-workspace-writer1c-nodename.js
tabs/cii-workspace/cii-workspace-writer1c-validation.js
```

Tests/oracle:
```text
tests/cii-workspace-writer1c-benchmark-roundtrip.test.js
tests/cii-workspace-writer1c-byte-custody.test.js
tests/cii-workspace-writer1c-nodename.test.js
tests/cii-workspace-writer1c-routing.test.js
tests/qualification/cii-workspace-writer1c-nodename-oracle.py
```

Final reconciliation at report basis: **20 expected / 20 actual / 0 unexplained**.

Protected converter, section rules, parser, Writer1A, Writer1B, SIF/hanger mutation, topology and `.github/workflows/**` are unchanged.

## 9. Review / CI / Merge State

- PR1004 remains **DRAFT**.
- No owner merge authorization exists.
- No GitHub checks/statuses or workflow runs are present at the report-basis head.
- PR1002 remains draft/unmerged; PR1004 is intentionally stacked on it.
- GitHub PR metadata says `mergeable=false`; compare API says `ahead 41 / behind 0` with exact stacked merge base. Treat this as unresolved PR normalization state, not an engineering validation failure or a merge authorization.

## 10. Continuation State

Start here:
1. run the four Writer1C JS tests in a complete checkout;
2. run the real `BM_CII_TARGET1.CII` production-parser round-trip;
3. run relevant existing NODENAME/intake/Writer1A/Writer1B regressions;
4. run scoped shell/browser flow with explicit Writer1C host selection;
5. run full repository suite;
6. update this report with exact command/output and keep failures fail-closed;
7. after PR1002 owner decision, re-ground main and normalize PR1004 base/history before review readiness.

Do **not**:
- start SIF/TEE Writer code;
- weaken alias/byte/semantic blockers to make a fixture pass;
- modify the protected converter;
- add workflow changes as a substitute for local qualification;
- flip the product default from 1B to 1C;
- merge without explicit owner authorization.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

A competent takeover engineer must answer all five from repository evidence:

**A1 — Physical trace.** Trace one element's 6th field on ELEMENT row 13 `[67,80)` through the 1-based NODENAME pointer to FROM `[2,28)` or TO `[28,53)` and absolute byte offsets. Explain why whitespace tokenization is not write authority.

**A2 — Shared custody.** Given two elements sharing the same TO span, prove when two operations collapse, when `SHARED_RECORD_CONFLICT` fires, and why an unselected alias is a blocker even without a competing requested value.

**A3 — Independent anti-drift.** Reconstruct `S_auth` without importing Writer1C planner/patcher code and show why an unrelated SIF pointer digit is a hard FAIL although output reparses.

**A4 — Encoding/custody.** Explain the distinction among `ORIGINAL_BYTES`, parser `textEncodingAuthority`, and ASCII qualification of the exact writable field. Show why an unrelated non-UTF8 byte must not be normalized by Writer1C.

**A5 — Phase boundary.** Explain why SIF field2, NODENAME creation/deletion/reindexing, and hanger count/payload mutation are not Phase1 even if physical locations can be found.

Pass standard retained: >=92/100 total and >=17/20 each; fabricated or implementation-coupled evidence presented as independent is automatic failure.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

- GE-001: live re-ground; Engineering PR Delivery skill read; Issue1003 expert gate resolved; PR1004 allocated.
- GE-002: byte custody, NODENAME physical custody, planner, patcher, validator and independent oracle implemented; local focused evidence recorded.
- GE-003: explicit core/scope/product byte routing completed; compatibility and fail-closed audits fixed fatal-UTF8 convenience dependency and incomplete-custody authorization; 20-file diff reconciled; real benchmark round-trip authored; full-repository/browser execution remains NOT_RUN.
