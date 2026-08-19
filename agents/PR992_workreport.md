# PR992 — CII Writer 1B qualified cardinality-preserving fields

## Recovery Header

```text
WORK_ID: PR992
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MUTATION_AUTHORITY: WRITE_ALLOWED_WITHIN_DECLARED_SCOPE
REPOSITORY: reallaksh19/XML_Compare_Utilities
BASE_BRANCH: main
BASE_BASIS_SHA: edf297f7e749d4ff2fe68a84d2482d5344c284d5
WORKING_BRANCH: agent/cii-writer-1b-qualified-slice
PR: 992
PR_STATE: DRAFT_UNMERGED
CURRENT_STAGE: IMPLEMENT
HANDOVER_READINESS: READY
EXACT_NEXT_ACTION: implement source-qualified extended ELEMENT fields, conditional reducer-safe OD, and existing-block restraint slot create/clear; keep SIF/TEE and unqualified auxiliary families fail-closed.
```

## Handover in 60 Seconds

Writer 1A is merged into `main`. PR992 is the successor Writer 1B slice. It is intentionally restricted to mutation semantics that can now be traced to the protected CII writer without guessing.

Qualified production scope:

```text
ELEMENT row 2: WT, insulation thickness, corrosion allowance, T1, T2, T3
ELEMENT row 3: T4, T5, T6, T7, T8, T9
ELEMENT row 4: P1, P2, P3, P4, P5, P6
ELEMENT row 5: P7, P8, P9
ELEMENT row 6: insulation density, fluid density, hydro pressure
ELEMENT header: conditional OD only when reducer/component custody remains plain and pointer-neutral
RESTRANT: create/clear one slot inside an already-owned 24-row block without changing its pointer or section cardinality
```

Explicitly blocked in this PR:

```text
SIF/TEE payload rewrite
new RESTRANT block / pointer re-indexing
BEND/FORCMNT/DISPLMNT/UNIFORM/WIND/OFFSETS/ALLOWBLS mutation
node/element/connectivity/geometry mutation
workflow changes
protected external writer changes
```

## Live Ground Truth

- live base at PR creation: `main@edf297f7e749d4ff2fe68a84d2482d5344c284d5`;
- predecessor PR #990 merged at `87123aa6f7ba0980c9cd94c3ff4f479601cfccf7`;
- predecessor PR #991 merged at `edf297f7e749d4ff2fe68a84d2482d5344c284d5`;
- branch created directly from that main SHA;
- draft PR #992 allocated from `agent/cii-writer-1b-qualified-slice` to `main`;
- live open-PR scan found no active CII Writer overlap;
- repository instructions: `AGENTS.md` plus `Common/skills/engineering-pr-delivery`;
- workflow edits are forbidden without separate authorization;
- protected external writer is read-only authority: `reallaksh19/3D_Converters/converters/scripts/inputxml_to_cii2019.py`.

## Source Qualification

### Q1 — extended ELEMENT fixed fields: QUALIFIED

Protected writer `ElementResolved` and rendering logic establish:

```text
row 2 fields 1..6 = wall, insulation, corrosion, T1, T2, T3
row 3 fields 1..6 = T4, T5, T6, T7, T8, T9
row 4 fields 1..6 = P1, P2, P3, P4, P5, P6
row 5 fields 1..3 = P7, P8, P9
row 6 field 1 = insulation density
row 6 field 2 = fluid density
row 6 field 6 = hydro pressure
```

The protected writer comments tie T4–T9/P1–P9/density/hydro to CAESAR neutral REL item ranges and use zero as the nonspecified real default. Writer 1B may therefore parse/compare/write only these exact fields; other row5/row6 columns remain untouched.

### Q2 — restraint block/empty slot: QUALIFIED

Protected writer establishes:

```text
6 slots / block
4 rows / slot
24 rows / block
empty slot = 2 zero numeric rows + empty tag row + empty GUID row
```

The existing workspace already qualifies the element restraint pointer as a 1-based 24-row block index and each nonempty slot's numeric line1/line2 fields. Writer 1B may use an empty slot only when the target block already exists and remains owned by the same target element(s).

### Q3 — SIF/TEE mutation: NOT QUALIFIED

The workspace currently records `POINTER_BOUND_RAW_SIF_TEE_RECORD; FIELD_2_SEMANTICS_UNQUALIFIED`. A known 10-row block pointer is not enough authority to rewrite semantic fields. SIF/TEE remains blocked.

## Scope / Acceptance

### In scope

1. Extend `parser/sections/elements.js` to normalize every qualified Writer 1B ELEMENT field without changing topology parsing.
2. Carry those fields as downstream engineering evidence in the topology adapter; never inject them into M1/M2 identity.
3. Emit engineering-delta rows with exact authority tokens.
4. Add transfer-policy support only for exact qualified fields.
5. Add conditional OD eligibility; no blanket PIPE_SIZE unprotection.
6. Add existing-block RESTRANT slot mutation planning for one cardinality step per node (+1 or -1) with deterministic pairing of unchanged records.
7. Add Writer 1B readiness/apply with exact fixed-field preimage/overflow/duplicate claims.
8. Reparse and prove expected-vs-actual semantic change with pointer/cardinality preservation.
9. Add focused tests and real-benchmark assertions where existing benchmark data can support them.

### Protected invariants

- node count and node IDs unchanged;
- element count/order unchanged;
- FROM/TO/DX/DY/DZ unchanged;
- geometry unchanged;
- auxiliary pointer values/ownership unchanged;
- section row cardinality unchanged;
- existing unrelated restraint slots unchanged;
- reducer pointer and component semantics unchanged for OD Writer 1B;
- no unsupported operation silently skipped;
- no node-number-offset identity;
- protected writer unchanged.

## Active Findings / Decisions

- `IMP-1`: Writer 1A transfer policy protects all PIPE_SIZE. Writer 1B must special-case OD using an explicit eligibility authority rather than removing PIPE_SIZE protection generally.
- `IMP-2`: current parser normalizes only T1/T2/P1 despite protected writer rendering the full qualified process layout. Parser qualification is a prerequisite to transfer authority.
- `IMP-3`: current core negative assurance treats OD as always immutable and only knows WT/P1/T1/T2 as mutable ELEMENT fields. Writer 1B must derive expected mutable fields from actual writer mutations.
- `IMP-4`: current restraint negative assurance requires identical nonempty pointer-slot sets. Writer 1B must allow only the exact expected slot addition/removal while preserving the 24-row block and element pointer set.
- `DEC-1`: SIF/TEE remains blocked until semantic field mapping is independently qualified.
- `DEC-2`: restraint metadata policy is conservative: free-slot CREATE/CLEAR is allowed only when tag and GUID are empty on the inserted/deleted record, so Writer 1B never invents or partially preserves unqualified string metadata.
- `DEC-3`: initial slot mutation supports exactly one net restraint addition or deletion per qualified node correspondence; larger cardinality differences remain blocked.
- `DEC-4`: conditional OD requires source and target edges to be plain `PIPE`, each have reducer pointer `0`, and no BEND/RIGID component transition. It does not use OD as identity evidence.
- `RISK-1`: if existing-record pairing is not unique around a +1/-1 restraint change, slot mutation must fail closed.
- `RISK-2`: extended fields must not alter canonical edge keys or network identity tokens; they are revision evidence only.

## Validation Ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| live main grounding | PASS | SOURCE_INSPECTION | GitHub live state | base `edf297f7...` |
| active CII Writer overlap | PASS | SOURCE_INSPECTION | GitHub live state | none found |
| extended ELEMENT layout | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | protected writer exact row/field rendering |
| restraint block constants | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | 6 × 4 = 24 rows |
| restraint empty-slot encoding | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | two zero numeric + empty tag/GUID |
| SIF/TEE semantic rewrite authority | FAIL | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | semantics explicitly unqualified; kept blocked |
| Writer 1B production runtime | NOT_RUN | NOT_OBSERVED | NONE | implementation in progress |
| full benchmark/browser suite | NOT_RUN | NOT_OBSERVED | NONE | execute if complete runtime becomes available |

## Changed-file Ledger

Current durable files only:

- `agents/PR992_workreport.md` — PR recovery authority.
- `agents/status/PR992.yaml` — live machine-readable status.
- `agents/claims/PR992.yaml` — scope/authority claim.
- `agents/MASTER_INDEX.md` — repository coordination entry.

Product/test files will be added to this ledger as each implementation unit lands.

## Appendix A — Implementation Qualification

### A1 Production Trace — 20/20
Traced `parser -> topology evidence -> engineering delta -> transfer classification -> transfer plan -> writer readiness -> fixed-field patch -> re-intake -> semantic negative assurance -> export`. Identified current Writer 1A gates that must be extended without weakening them.

### A2 Current Failure Isolation — 20/20
Writer 1B gap is downstream mutation authority, not correspondence. OD is blocked by category policy/negative assurance; extended P/T fields are absent from parser/evidence; free-slot restraints are blocked by equal-cardinality pairing/readiness.

### A3 Authority / Invariant — 20/20
Protected writer is format authority. Target-native node, element, auxiliary pointer, block cardinality, unrelated bytes and topology remain protected. Writer 1B only changes explicitly approved fixed fields/slots.

### A4 Independent Validation — 19/20
Protected writer independently qualifies the extended ELEMENT layout and restraint empty-slot representation. Exact Writer 1B production execution remains pending, so no runtime PASS is claimed.

### A5 Next-Commit / Minimal Patch — 19/20
First implementation batches: parser/evidence fields, transfer/readiness/writer fields, then restraint slot mutation and negative assurance. SIF/TEE and other auxiliary families remain untouched.

```text
TOTAL = 98/100
MINIMUM = 19/20
TAKEOVER/IMPLEMENTATION QUALIFICATION = PASS
```
