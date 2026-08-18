# PR987 — CII auxiliary custody and benchmark qualification Work Report

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: IMPLEMENTATION_COMPLETE_VALIDATION_PARTIAL_STACKED_DRAFT
TAKEOVER_AUTHORITY: OWNER_OR_REQUALIFIED_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_PHASE7_AUX_CUSTODY_AND_BENCHMARK
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
PR_OR_WIP: PR987
BRANCH: agent/cii-aux-custody-benchmark
PR_HEAD_OBSERVED: 098762d6e35408f691dd8c506d54cd7d22bc3eac
REPORT_BASIS_HEAD: 098762d6e35408f691dd8c506d54cd7d22bc3eac
STACKED_BASE_PR: PR986
STACKED_BASE_HEAD: 2e84648cb0dfd71ef304be744ea7e2dcb3f3e35f
STACKED_DEPENDENCY: PR982 -> PR983 -> PR984 -> PR985 -> PR986 -> PR987
GROUNDING_EPOCH: GE-987-002
CURRENT_STAGE: IMPLEMENT_VALIDATE_RECONCILE
CURRENT_BLOCKER: FULL_AUTHENTICATED_CHECKOUT_UNAVAILABLE
HIGHEST_RISK: REAL-FILE END-TO-END CORRESPONDENCE/DELTA EXECUTION NOT YET OBSERVED
EXACT_NEXT_ACTION: execute committed PR987 focused tests and the real-file benchmark qualification test in a complete checkout; do not enable target mutation.
```

## 1. Handover in 60 seconds

PR987 fixes auxiliary CII custody that the generic parser cannot safely establish. The protected writer is the format authority. ELEMENT rows 12–14 point to auxiliary sections; RESTRANT line1 fixed fields define numeric type/stiffness/gap/friction/connecting-node; RIGID first field is a pointer-bound weight; SIF&TEES is pointer-bound raw evidence with field-2 meaning intentionally unresolved.

The implementation is local to CII Workspace. It does **not** rewrite the generic parser and does not alter M1/M2 policy, propagation policy, or target mutation authority.

## 2. Source authority established

Protected reference inspected: `reallaksh19/3D_Converters/converters/scripts/inputxml_to_cii2019.py`.

- `_row()` widths = `[15] + [13] * remaining`;
- ELEMENT block = 15 raw rows;
- row12 pointer order = bend, rigid, expjt, restraint, displmnt, forcmnt;
- row13 pointer order = uniform, wind, offset, allowbl, SIF&TEES, NODENAME;
- row14 pointer order = reducer, flange, equipment;
- RESTRANT = six 4-row slots per pointer block;
- RESTRANT line1 = node, type, stiffness, gap, friction, connecting node;
- RESTRANT line2 = X/Y/Z direction cosines;
- RIGID pointer resolves a record whose first field is writer `rigid_weight`;
- SIF&TEES record/node custody is pointer-bound; current source does not justify assigning a semantic name to raw field2;
- MISCEL_1 contains hanger-related groups, but benchmark hanger node/group custody is not yet qualified.

## 3. Implemented production changes

### `cii-workspace-auxiliary.js`

- parses raw 15-row ELEMENT blocks;
- extracts row12/13/14 auxiliary pointers;
- maps raw blocks back to parsed elements by index + FROM/TO custody;
- parses source-qualified RESTRANT numeric fields and 4-row slot custody;
- builds RESTRANT `byPointer` and `byNode` evidence;
- resolves RIGID records by 1-based pointer and publishes writer weight;
- resolves SIF&TEES raw record spans by pointer and strips only the renumbered node field from normalized payload equality;
- exposes per-element `restraintRecords`, `rigidRecord`, and `sifTeeRecord`;
- fail-closes auxiliary family capabilities to `PARSE_ERROR` on custody/decode conflicts;
- reports raw MISCEL_1 presence for Hanger while keeping Hanger `NOT_PARSED`.

### `cii-workspace-intake.js`

- attaches `auxiliaryEvidence` after generic parse;
- overlays baseline capability states with pointer-qualified restraint/rigid/SIF states;
- reports `auxiliaryConflictCount`.

### `cii-workspace-topology-adapter.js`

- RIGID component identity is determined only by pointer-bound RIGID evidence;
- the unsafe generic `parsed.rigids` node/mass association is no longer used for CII Workspace topology;
- SIF/TEE is retained only as downstream evidence;
- **SIF/TEE is excluded from `packetEvidence`, neighbourhood tokens and M2 identity** so a revision SIF change cannot change correspondence identity.

### `cii-workspace-components.js`

- rigid component custody is tied to matched element + pointer-bound RIGID evidence;
- missing pointer custody is a fail-closed component conflict.

### `cii-workspace-engineering-delta.js`

For pointer-qualified real CII evidence:

- restraint presence;
- numeric restraint code set (code descriptions remain partial/unmapped);
- restraint gap values;
- restraint friction values;
- restraint stiffness values;
- direction-cosine set;
- qualified numeric restraint record set;
- SIF/Tee record presence;
- SIF/Tee raw code field2 and normalized raw payload, both PARTIAL semantics;
- rigid weight based on pointer-bound record;
- native node-location evidence and registered-node-location evidence are separate rows.

For legacy/synthetic documents without auxiliary custody, old conservative behavior is retained: no gap/friction semantic labels are invented.

### `cii-workspace-core.js`

Qualified geometry registration is explicitly passed into engineering-delta generation so native and registered coordinate bases remain distinct evidence.

## 4. Benchmark qualification findings

### Restraint 130

SOURCE:

```text
node 130
raw type code 15
friction 0.0
```

TARGET1:

```text
node 20130
raw type code 9
friction 0.3
```

TARGET2:

```text
node 10130
raw type code 9
friction 0.0
```

Gap/friction field positions are source-qualified by the protected writer. Human-readable meaning of type codes 9/15 is not asserted.

### SIF/Tee 70

Pointer-bound raw SIF&TEES evidence:

```text
SOURCE  node 70     raw field2 code 3
TARGET1 node 20070  raw field2 code 5
TARGET2 node 10070  raw field2 code 5
```

The raw code changes are valid engineering evidence. The semantic label for code 3/5 remains unresolved.

### 113→116 weight note — benchmark contradiction

SOURCE `113→116` uses RIGID pointer 9.
TARGET1/TARGET2 corresponding span uses pointer 11.

Pointer-resolved first-field writer weight:

```text
SOURCE   pointer 9  -> 111.200
TARGET1  pointer 11 -> 111.200
TARGET2  pointer 11 -> 111.200
```

Therefore **pointer index changed, writer weight did not**. The historical statement “weight changed” is quarantined in `CII_COMPARE_EXPECTED.json`; code is not tuned to manufacture that change.

### Hanger at 205

MISCEL_1 is present, and the protected writer shows hanger groups live there. However a defensible benchmark node/group custody for the claimed 205 hanger deletion has not yet been established. Hanger remains `NOT_PARSED`, count `null`, with raw MISCEL_1 presence shown. No deletion claim is asserted.

## 5. Benchmark oracle corrections

`Benchmark/CIICompare/CII_COMPARE_EXPECTED.json` now:

- keeps numbering offsets as non-authoritative hints;
- retains corrected 130→20130/10130 mappings;
- records qualified restraint 130 expectations;
- records pointer-bound SIF raw-code expectations;
- quarantines 10→20000, 30→20130, unvalidated 50→20050, and the contradicted 113–116 weight-change note.

## 6. Tests committed

- `tests/cii-workspace-auxiliary-custody.test.js`
  - synthetic fixed-field pointer custody;
  - restraint gap/friction;
  - deliberate bogus generic RIGID parser evidence ignored;
  - pointer-bound rigid classification.
- `tests/cii-workspace-auxiliary-delta.test.js`
  - restraint 15→9 / friction 0→0.3;
  - SIF raw 3→5;
  - pointer-bound rigid weight delta;
  - native vs registered geometry basis.
- `tests/cii-workspace-auxiliary-sif-identity-separation.test.js`
  - proves SIF/TEE change does not alter M2 packet/neighbourhood identity.
- `tests/cii-workspace-benchmark-qualification.test.js`
  - real SOURCE/TARGET1/TARGET2 intake and auxiliary assertions;
  - proves pointer9/11 weights are all 111.2;
  - confirms corrected oracle/quarantine.
- inherited `tests/cii-workspace-engineering-delta.test.js`
  - updated to explicit native-basis label while preserving legacy partial restraint semantics.

## 7. Validation ledger

### VAL-987-01 — source authority

```text
Status: PASS
Observation: SOURCE_INSPECTION
Authority: protected 3D_Converters writer + benchmark CII raw records
```

### VAL-987-02 — fixed-field/pointer hand check

```text
Status: PASS
Observation: RECONSTRUCTED_LOCAL_HAND_CHECK
Checked: pointer rows; TARGET1 20130 line1; SOURCE pointer9/TARGET1 pointer11 rigid weight
Result: restraint fields decode as expected; both pointer-resolved weights = 111.2
Limitation: not literal repository test execution
```

### VAL-987-03 — committed focused Node tests

```text
Status: NOT_RUN
Reason: complete authenticated checkout unavailable in current container; github.com DNS resolution fails
Tests:
  node tests/cii-workspace-auxiliary-custody.test.js
  node tests/cii-workspace-auxiliary-delta.test.js
  node tests/cii-workspace-auxiliary-sif-identity-separation.test.js
  node tests/cii-workspace-engineering-delta.test.js
```

### VAL-987-04 — real benchmark file qualification

```text
Status: NOT_RUN
Test: node tests/cii-workspace-benchmark-qualification.test.js
Reason: benchmark files unavailable in a complete local checkout
```

### VAL-987-05 — full SOURCE/TARGET1/TARGET2 CII Workspace preview

```text
Status: NOT_RUN
Requirement: full intake -> correspondence -> deltas -> review with frozen policy
```

## 8. Safety invariants

- no protected writer edits;
- no generic parser ELEMENT/RESTRANT edit in PR987;
- no M1/M2 scoring changes;
- no propagation changes;
- no node-number-offset identity rule;
- SIF/TEE changes are downstream engineering evidence only;
- unsupported hanger semantics stay unresolved;
- target CII mutation remains blocked;
- Stage06 remains NOT_IMPLEMENTED.

## 9. Continuation

The next qualified step is **runtime qualification**, not more semantic expansion:

1. run all PR987 focused tests in a complete checkout;
2. run the real three-file auxiliary benchmark test;
3. run SOURCE→TARGET1 full preview and freeze/record actual correspondence outcomes;
4. run TARGET2 blind with no policy retuning;
5. only then consider a separate Hanger/MISCEL_1 qualification or transfer-authority PR.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_SAME_AGENT_CONTINUATION` for the current agent. A future different implementation agent must re-ground against live branch/PR state and source authority before engineering-critical mutation.
