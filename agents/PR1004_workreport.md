# PR1004 — CII Writer 1C Phase-1 NODENAME Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY / IMPLEMENTATION COMPLETE / ENGINEERING PATH QUALIFIED / REPOSITORY-WIDE GATE PENDING
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: HARD_STOP_REPOSITORY_WIDE_CHECKOUT_UNAVAILABLE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE1003_PHASE1
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #1003
PR: 1004
BRANCH: agent/cii-writer-1c
REPORT_BASIS_HEAD: 0333be69859345e796011fbe8966530beb1b57ea
MAIN_HEAD_LAST_CHECKED: 5a5fa0ae5068a7c15eecc1a57557e71336b9754c
STACKED_BASE: PR1002 / agent/cii-writer-1c-roadmap@1dd7a4fc8823c54ef38f5f938167d13076d49c65
GROUNDING_EPOCH: GE-007 / 2026-08-20
CURRENT_STAGE: PHASE1 ENGINEERING PATH QUALIFIED / CHROMIUM PASS / EXACT TARGET1 CORE ROUND-TRIP PASS / FULL REPOSITORY SUITE PENDING
CURRENT_BLOCKER: complete private repository checkout is unavailable for repository-wide test execution
HIGHEST_RISK: repository-wide regression interaction remains NOT_OBSERVED; Writer1C engineering path itself has direct benchmark, falsifier, and browser evidence
LAST_DURABLE_CHECKPOINT: exact TARGET1 object identity + production intake + authored core round-trip + real negative-assurance/stale-target falsifiers PASS; 20-file scope reconciled; PR remains draft
EXACT_NEXT_ACTION: obtain complete private checkout/equivalent repository-wide execution capability, run full suite at current PR basis, then reconcile stacked base PR1002; do not mark ready or merge before that gate or an explicit owner acceptance of the documented limitation
```

AUTO MODE progressed every approved Issue1003 Phase-1 gate available in this runtime. AUTO MODE does **not** authorize scope expansion, workflow changes, engineering-authority relaxation, waiver of the remaining repository-wide qualification gate, ready-for-review transition, or merge.

## 2. Handover in 60 Seconds

PR1004 implements **Writer 1C Phase 1 only**: exact-byte mutation of already-existing TARGET NODENAME fixed fields with pointer/cardinality/topology immutability.

Authority chain:

```text
original TARGET bytes
 -> immutable physical line/section custody
 -> fixed-field ELEMENT NODENAME pointer custody
 -> NODENAME FROM/TO absolute byte spans + reverse owner set
 -> reviewed correspondence + explicit APPLY scope
 -> shared-span/redundant-span arbitration before writing
 -> exact preimage + equal-width ASCII patch
 -> modified-byte re-intake
 -> independently derived authorized-span validator
 -> structural invariants
 -> semantic postcondition
```

Mandatory pass rule:

```text
S_auth = independently authorized byte spans
D      = actual changed byte indices

PASS only if:
D subset-of S_auth
pointer/cardinality/topology drift count = 0
unexpected semantic delta count = 0
```

Writer-reported spans remain audit testimony only. Production default remains Writer 1B. Writer 1C is explicit-only. SIF/TEE raw field 2 remains `SIF_TEE_FIELD_SEMANTICS_UNQUALIFIED`. NODENAME/SIF insert-delete-reindex, hanger mutation, Writer2, Writer3, protected converter changes and workflow changes remain out of scope.

## 3. Live Repository Ground Truth — GE-007

At the GE-007 live refresh before recovery-record commits:

```text
main                           5a5fa0ae5068a7c15eecc1a57557e71336b9754c
PR1002                         OPEN / DRAFT / UNMERGED
PR1002 head                    1dd7a4fc8823c54ef38f5f938167d13076d49c65
PR1004                         OPEN / DRAFT / MERGEABLE
PR1004 tested code basis       0333be69859345e796011fbe8966530beb1b57ea
PR1004 changed paths           20 actual / 20 explained
PR reviews                     0
PR review threads              0
GitHub commit statuses         none present
GitHub PR workflow runs        none present
merge authority                OWNER_ONLY
```

Recovery-record commits after the tested code basis do not alter Writer1C production behavior. Re-run live PR metadata after any further branch mutation before closure.

PR1004 remains intentionally stacked on PR1002. Mergeability is not merge authorization. Retarget/reconcile only after owner action on PR1002.

## 4. Mission, Scope and Definition of Done

### In scope

```text
existing NODENAME row
existing non-zero pointer
pointer/index unchanged
NODENAME cardinality unchanged
CONTROL unchanged
explicit APPLY
original-byte authority
fixed-width ASCII field
exact preimage
shared/redundant physical ownership arbitration
independent byte/structure/semantic negative assurance
explicit Writer1C browser routing and byte-preserving file IO
```

### Out of scope

- NODENAME create/delete/reindex;
- SIF/TEE write while field semantics remain unqualified;
- hanger payload mutation;
- auxiliary block insert/delete/reorder;
- CONTROL count mutation;
- Writer2 pointer/cardinality transaction engine;
- Writer3 topology transaction engine;
- protected `converters/scripts/inputxml_to_cii2019.py`;
- protected `converters/scripts/cii2019_section_rules.py`;
- workflow modification.

### Definition of Done

```text
unauthorized changed-byte count = 0                 PASS
pointer/cardinality/topology drift count = 0        PASS
unexpected semantic delta count = 0                 PASS
independent Python oracle                            PASS
existing Writer1A/1B focused regressions             PASS
exact BM_CII_TARGET1 production core round-trip      PASS
real benchmark anti-drift/stale-target falsifiers    PASS
Chromium scoped Writer1C contract                     PASS
full repository qualification                        NOT_RUN
```

The engineering path is qualified. The PR remains draft because the full repository suite is still an explicit DoD gate unless the owner separately accepts the documented runtime limitation.

## 5. Implemented Architecture / Invariants

### 5.1 Original-byte custody

`cii-workspace-physical-file.js` accepts `Uint8Array`/`ArrayBuffer` authority, preserves CRLF/LF/CR/no-final-newline and absolute byte offsets, and separates parser-text compatibility from original-byte custody. String-only callers are not Writer1C-byte-eligible. Writable fixed fields are ASCII-strict.

### 5.2 Fixed-field NODENAME custody

```text
ELEMENT rows/block             15
NODENAME pointer row           13 zero-based
pointer numeric field          [67,80) width 13
NODENAME FROM                  [2,28) width 26
NODENAME TO                    [28,53) width 25
```

Physical custody persists element/block/pointer/row/field ownership plus reverse owner sets. Unreadable/out-of-range/missing/conflicting custody blocks Writer1C.

### 5.3 Narrow transfer authority

Only qualified existing-row NODENAME COPY receives:

```text
CII_WRITER_1C_NODENAME_EXISTING_ROW_FIELD
```

Deletion remains blocked. Nonblank overwrite remains separately gated. SIF raw field2 changes remain blocked.

### 5.4 Shared/redundant custody

```text
same physical span + same output        -> one canonical mutation
same physical span + different output   -> WRITER_1C_NODENAME_SHARED_RECORD_CONFLICT
unselected alias affected               -> WRITER_1C_NODENAME_UNAPPROVED_ALIAS_EFFECT
one semantic node in multiple spans     -> mutate all qualified owned spans atomically
pointer 0 / row creation                 -> Writer2 blocker
over-width / non-ASCII / stale preimage -> fail closed
```

Real TARGET1 contains one semantic name in incoming TO plus outgoing FROM fields. The benchmark-derived regression proves that redundancy can be changed without creating a NODENAME conflict.

### 5.5 Writer and validator separation

Writer1C patches a copy of original bytes and never rebuilds the CII from parsed objects. Independent validation does not import Writer1C planner/patcher authority. It independently recomputes permitted spans and validates byte diff, pre/post bytes, line endings, section order, ELEMENT cardinality, all auxiliary pointers, CONTROL, auxiliary section counts, node/connectivity invariants, expected NODENAME semantics and writer-testimony consistency.

### 5.6 Explicit core/product routing

Core/scope enumerate `1A | 1B | 1C`; product default remains `1B`.

```text
TARGET original bytes
 -> stale-target SHA gate
 -> Writer1C patch
 -> modified-byte re-intake
 -> independent Writer1C validator
 -> PASS result
```

Shell/scoped UI use `File.arrayBuffer()` and binary Writer1C export. Host selection of Writer1C remains explicit.

## 6. Validation Ledger — GE-007

### VAL-1C-001 — exact repository TARGET1 object identity

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: AUTHORITATIVE_GIT_BLOB_IDENTITY
```

```text
benchmark: Benchmark/CIICompare/BM_CII_TARGET1.CII
expected bytes: 64462
actual bytes:   64462
expected Git blob: 1a1cb9ac27e9c347cfcd3e4a8766ebad0e4b7853
actual Git blob:   1a1cb9ac27e9c347cfcd3e4a8766ebad0e4b7853
```

An earlier same-length reconstruction had the wrong blob SHA and was quarantined. It was never used as benchmark evidence. Final qualification used the exact Git object only.

### VAL-1C-002 — exact production neutral intake on TARGET1

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: PRODUCTION_PARSER + FIXED_FIELD_CUSTODY
```

Exercised branch blobs included:

```text
parser/caesar-parser.js                       46b921c656fff242354c27b6d1a83dd40791f7ec
parser/sections/elements.js                   e0f6fbb30a4849d2659608eb10965a53b823286d
parser/fixed-field.js                         485daa43553681ca54f488499e57f36d2239be58
parser/validator.js                           90cef22039bcedbe0699ed9137855ea84c1d3f34
tabs/.../cii-workspace-auxiliary.js           7459677eccb2ca460b1971ac6d75c22f2f5ae870
tabs/.../cii-workspace-hanger.js              71e5bca8cb3429878785244b5508e104add2fc57
tabs/.../cii-workspace-capabilities.js        db7b67ed25ccad6f8bb46c03561747ea7b2094c1
tabs/.../cii-workspace-intake.js              f5347036c2add51d68a5ebdae9707edabea5f12d
tabs/.../cii-workspace-nodename.js            797999b4fdb8344e94852ee9bee6fa3ffee2fee1
tabs/.../cii-workspace-physical-file.js       0c4c445fbd3d4b929b1f9288b789b244547c8867
```

Observed:

```text
byte length                64462
SHA-256                    aa84f8a70bbf7b41bfdbf69c664ca10b0f068cec5a40f670b8dff7581a237110
format                     NEUTRAL
elements                   40
nodes                      40
NODENAME                   {20035: PS-NEW1}
NODENAME conflicts         0
physical custody           QUALIFIED
auxiliary conflicts        0
hanger status              QUALIFIED
line endings               CRLF
```

Import-resolution limitation: XML/PDF parser imports were fail-fast stubs because the exact benchmark is NEUTRAL; neither format branch executed. No neutral-path implementation was stubbed.

### VAL-1C-003 — exact authored TARGET1 production core round-trip

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: PRODUCTION_INTAKE + EXACT_CORE + WRITER1C + INDEPENDENT_1C_VALIDATOR
```

Identity immediately before execution:

```text
core blob                  bfdd20f0716ff47c394de564c26379e259e3f2e7
benchmark test blob        b0b4662d03b47298bac0c3434fa4723165d2917c
Writer1C validator blob    c8594d4f260ee58feba5823483f23b152322d8b9
target blob                1a1cb9ac27e9c347cfcd3e4a8766ebad0e4b7853
```

The repository-authored `tests/cii-workspace-writer1c-benchmark-roundtrip.test.js` passed:

```text
selected node              20030
physical spans             1
mutations                  1
changed bytes              8
writer                     WRITER_1C
output byte length         unchanged
expected semantic deltas   1
unexpected semantic deltas 0
authorized spans           mutation count
modified SHA               differs from original
validation                 PASS
```

Core-import boundary: unrelated comparison/topology imports were fail-fast stubs. `adaptCiiDocumentToTopologyGraph` returned a sentinel graph because core computes it during apply, but Writer1C does not consume that graph. Any unexpected unrelated stub invocation would have failed the test.

### VAL-1C-004 — real TARGET1 negative-assurance falsifier

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: INDEPENDENT_VALIDATOR_DERIVATION
```

After a valid Writer1C patch, an unrelated header-space byte was changed at absolute byte index 2. The file still reparsed, but `validateCiiWriter1CRoundTrip` rejected it as `UNAUTHORIZED_BYTE_CHANGE`. Parseability therefore did not mask unauthorized drift.

### VAL-1C-005 — real TARGET1 stale-target falsifier

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: CORE_SHA_PRECONDITION
```

A one-byte stale TARGET modification was rejected before mutation with:

```text
CII_WRITER_1C_STALE_TARGET_HASH
```

### VAL-1C-006 — TARGET1 redundant FROM/TO semantic custody

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: BENCHMARK_DERIVED_FIXED_FIELD_PATTERN + INDEPENDENT_VALIDATOR
```

```text
PS-NEW1 -> PS-NEW2
physical mutations              2
field identities                NODENAME_TO + NODENAME_FROM
authorized spans                2
expected semantic deltas        1
actual semantic deltas          1
unexpected semantic deltas      0
post-reparse NODENAME conflicts 0
```

### VAL-1C-007 — independent Python byte oracle

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: INDEPENDENT_REPRODUCTION
```

```text
authorized span (synthetic) 2514:2539
OLD -> NEW changed bytes    3
SIF pointer falsifier       caught
```

### VAL-1C-008 — focused Writer1A/1B non-regression

```text
Writer1A fixed-field regression          PASS
Writer1A paired-restraint regression     PASS
Writer1B extended fixed-field regression PASS
Writer1B restraint-slot CREATE/CLEAR     PASS
```

These cover exact fixed-field width/cardinality preservation, target-native restraint identity, connecting-node projection, slot-local CREATE/CLEAR and stale/unapproved fail-closed behavior.

### VAL-1C-009 — consolidated reconstructed regression gate

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
LIMITATION: focused exact-file reconstruction, not complete private repository checkout
```

Fail-fast gate:

```text
node tests/cii-workspace-writer1c-byte-custody.test.js
node tests/cii-workspace-writer1c-nodename.test.js
node tests/cii-workspace-nodename.test.js
node tests/routing-policy-slice.test.js
node tests/cii-workspace-target-writer-1a.test.js
node tests/cii-workspace-target-writer-restraint.test.js
node tests/cii-workspace-target-writer-1b.test.js
node tests/cii-workspace-restraint-slot-writer-1b.test.js
node tests/cii-workspace-writer1c-benchmark-roundtrip.test.js
python3 tests/qualification/cii-workspace-writer1c-nodename-oracle.py
```

Result: **ALL PASS**.

### VAL-1C-010 — Chromium scoped Writer1C browser contract

```text
STATUS: PASS
OBSERVATION: LOCAL_EXECUTION
ORACLE: BROWSER_BEHAVIOR
RUNTIME: /usr/bin/chromium via Python Playwright, headless
```

Observed:

```text
initial scope                         UNBOUND
initial Writer1C apply                disabled
APPLY-all without bind                still disabled
explicit bind                         BOUND
bound counts                          1 APPLY / 0 EXCLUDE
writer chrome                         Writer 1C READY
TARGET input                          File.arrayBuffer()
input bytes observed                  [10,13,0,65,128,255,32,90]
actual dispatch                       Writer 1C
wrong Writer1A/1B stubs               not called
download authority                    Writer1C binary byteString
downloaded bytes                      [0,1,2,65,128,255]
completion                            2 field changes / 0 unexpected semantic deltas
review change                         invalidates bound scope and disables apply
browser page errors                   0
browser console errors                0
```

The managed runtime blocked localhost/file browser navigation; successful browser execution used Chromium's existing page with injected current scoped UI code. Heavy engineering/core computation was stubbed at the imported module boundary only; exact core behavior is separately covered by VAL-1C-003.

### VAL-1C-011 — full repository suite

```text
STATUS: NOT_RUN
OBSERVATION: NOT_OBSERVED
ORACLE: NONE
REASON: complete private repository checkout is unavailable in this runtime
```

No workflow was added or changed to manufacture a green result. This remains the only unsatisfied explicit DoD gate.

### VAL-1C-012 — GitHub remote state

```text
commit statuses   NOT_RUN / none present at live tested PR head
workflow runs     NOT_RUN / no PR-triggered runs present
reviews           0
review threads    0
```

## 7. Active Engineering Register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-1C-001 | ISS | HIGH | RESOLVED_BY_PR | original-byte custody reaches intake/core/shell/scoped apply |
| ISS-1C-002 | ISS | HIGH | RESOLVED_BY_PR | NODENAME pointer/row/FROM/TO physical spans and reverse ownership persisted |
| ISS-1C-003 | ISS | HIGH | RESOLVED_BY_PR | validator derives authorization independently of Writer reports |
| ISS-1C-004 | ISS | MEDIUM | RESOLVED_BY_PR | explicit 1A/1B/1C routing; production default remains 1B |
| IMP-1C-005 | IMP | HIGH | RESOLVED_BY_PR | redundant FROM/TO semantic-node custody proven |
| IMP-1C-006 | IMP | HIGH | RESOLVED | Chromium byte-IO/scope/dispatch/download/review invalidation PASS |
| IMP-1C-007 | IMP | HIGH | RESOLVED | exact Git-blob TARGET1 production core round-trip PASS |
| RISK-1C-001 | RISK | HIGH | MITIGATED | Writer1C does not reserialize whole CII |
| RISK-1C-002 | RISK | HIGH | RESOLVED_ENGINEERING_PATH | exact TARGET1 production parser/core/validator route PASS |
| RISK-1C-003 | RISK | HIGH | RESOLVED_ENGINEERING_PATH | real unauthorized-byte and stale-target falsifiers PASS |
| RISK-1C-004 | RISK | MEDIUM | OPEN_COORDINATION | PR1004 remains stacked on unmerged PR1002 |
| RISK-1C-005 | RISK | MEDIUM | OPEN_QUALIFICATION | full private-repository regression suite is NOT_RUN |
| DEBT-BASE-001 | DEBT | LOW | PREEXISTING | intake test expects older parserAuthority string than live main already returns; unrelated and unchanged |
| DEC-1C-001 | DEC | HIGH | ACTIVE | independent validator-derived spans are authority; Writer spans are testimony |
| DEC-1C-002 | DEC | HIGH | ACTIVE | Phase1 stays NODENAME-only; mixed lower-writer mutable APPLY remains blocked |
| DEC-1C-003 | DEC | HIGH | ACTIVE | unselected alias semantic effect blocks |
| DEC-1C-004 | DEC | HIGH | ACTIVE | production default Writer remains 1B; 1C is explicit-only |

## 8. Changed-File Ledger

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

GE-007 reconciliation: **20 actual / 20 explained / 0 unexplained**.

Protected converter, section rules, parser implementation, Writer1A/1B implementation, SIF/hanger mutation, topology and `.github/workflows/**` remain unchanged by PR1004.

## 9. Review / CI / Merge State

- PR1004 remains **OPEN / DRAFT**.
- Live refresh found it mergeable, but mergeability is not authorization.
- PR1002 remains OPEN / DRAFT / UNMERGED and is PR1004's stacked base.
- Reviews: 0.
- Review threads: 0.
- Commit statuses: none present.
- PR-triggered workflows: none present.
- No workflow was modified.
- No owner merge authorization exists.
- Do **not** mark ready for review while the explicit full-repository qualification gate remains NOT_RUN unless the owner explicitly accepts that documented limitation.

## 10. Exact Continuation State

AUTO MODE has reached a legitimate hard stop. Continue only when a complete private checkout or equivalent repository-wide execution capability exists:

1. re-ground current PR1004 head and PR1002 stacked base;
2. execute the full repository suite at that exact head;
3. classify any failure as PREEXISTING / INTRODUCED_BY_PR / UNKNOWN before modifying production code;
4. re-run Writer1C exact TARGET1 benchmark and Chromium gate if a material production path changes;
5. reconcile all changed paths and review/check state;
6. if full suite is green, normalize PR1004's base only after owner action on PR1002;
7. ready-for-review is a separate transition; merge remains OWNER_ONLY.

Do **not** proceed to SIF/TEE writing, Writer2, Writer3, hanger mutation, tolerance weakening, workflow creation, or any new engineering scope under this AUTO authorization.

# APPENDIX A — TAKEOVER QUALIFICATION

Status: CURRENT.

Any new agent making further engineering-critical production changes must answer repository-specific gates:

```text
A1 Production trace
Trace exact TARGET bytes -> ELEMENT block -> row13 fixed pointer field -> NODENAME row -> FROM/TO absolute byte span -> Writer1C patch -> re-intake -> validator. State what is authority at each boundary and what must remain invariant.

A2 Failure isolation
Given a valid NODENAME patch plus one unrelated SIF-pointer byte change that still reparses, identify the first mandatory failing check and explain why parseability cannot authorize the result.

A3 Shared/redundant custody
Explain the difference between two semantic owners sharing one physical span and one semantic node owning two physical spans. State which case conflicts, which can canonicalize, and the unselected-alias blocker.

A4 Independent validation
Describe how `S_auth`, Writer testimony and actual byte-diff set are independently compared. Explain why using Writer-reported spans to define authority would invalidate the qualification.

A5 Minimal next action
At GE-007, justify whether any production-code patch is currently warranted. The correct answer must be grounded in the exact TARGET1 and Chromium evidence and the remaining full-repository NOT_RUN gate.
```

Threshold: total >=92/100 and every question >=17/20. Fabricated evidence, weakening fail-closed behavior, or presenting implementation output as an independent oracle is an automatic failure.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

- **GE-001:** live repository re-grounded; Issue1003 expert gate established; PR1004 allocated as stacked implementation follow-on.
- **GE-002:** original-byte custody, physical NODENAME ownership, planner, byte patcher, independent validator and Python oracle implemented.
- **GE-003:** explicit core/scope/product Writer1C routing integrated; 20-file scope reconciled; browser/full repository remained unavailable.
- **GE-004:** focused branch-slice execution began; TARGET1 redundant FROM/TO custody pattern discovered and committed as regression.
- **GE-005:** reconstructed Writer1C plus Writer1A/1B regression gate and independent Python oracle PASS; exact TARGET1 production core and Chromium still pending.
- **GE-006:** owner enabled AUTO MODE; Chromium scoped Writer1C contract PASS, including explicit binding, `arrayBuffer()` input, correct writer dispatch, binary download and review-invalidates-scope behavior.
- **GE-007:** exact TARGET1 Git object identity proven; production neutral intake PASS; repository-authored exact core round-trip PASS (`node 20030`, 1 mutation, 8 changed bytes, 0 unexpected semantic deltas); real unauthorized-byte and stale-target falsifiers PASS; consolidated 9-JS + Python focused gate PASS. Only full private-repository suite remains NOT_RUN; AUTO MODE hard-stops without waiving it.
