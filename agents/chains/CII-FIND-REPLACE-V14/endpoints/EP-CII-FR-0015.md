# EP-CII-FR-0015 — FORCMNT acquisition checker exact-source PASS

CHAIN_ID: CII-FIND-REPLACE-V14
ENDPOINT_ID: EP-CII-FR-0015
PR: 1080
BRANCH: chore/cii-forcmnt-oracle-acquisition-v14
BASE_MAIN: bfe3abbb67060c1212001f2e9d967c229a057640
STATE: ACTIVE_DRAFT
CUSTODY_STATE: HELD
WRITE_AUTHORITY: DIAGNOSTIC_EVIDENCE_ONLY
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Q1 Production Trace

Merged Find & Replace remains unchanged:

```text
Target CII v14
  + CSV / editable Excel-style manual grid
  -> Preview + approval
  -> TARGET0-relative validation
  -> qualified in-memory TARGET1
  -> Apply to New Copy
  -> Download Modified CII
```

NODE NAME and DISPLACEMENT remain qualified. FORCE remains fail-closed and exposes zero mutable spans.

## Q2 Current Unresolved Problem / Failure Isolation

The read-only FORCMNT candidate checker is now executable and exact-source qualified, but no real CAESAR II v14 neutral file has been found that simultaneously proves:

```text
VERSION = 14
CONTROL FORCMNT > 0
positive ELEMENT FORCMNT pointer
CONTROL x 20 physical FORCMNT rows
```

The remaining blocker is acquisition of that retained-real specimen, not checker correctness.

## Q3 Authority / Invariant

Checker authority remains diagnostic only:

```text
PASS_CANDIDATE != FORCE_PASS
mutationAuthority = NONE
mutableSpans = []
```

No candidate result may enable FORCE until exact-byte retained-real semantic qualification separately proves both 10-row specifications, node/vector mapping, unused-spec sentinel behavior and adjacent ownership falsifiers.

## Q4 Independent Validation

Exact Git-blob-reconciled local execution at checker basis head `ccdf3c89c7b2cd7233c944c3d29873a33d176e62`:

```text
parser/fixed-field.js                    485daa43553681ca54f488499e57f36d2239be58
scripts/cii-forcmnt-oracle-check.mjs     61da51acdbda3f1692b2aef5023db6fe509250bf
tests/cii-forcmnt-oracle-check.test.js   96d7fd3219675ba885118394320fae72f093c6dd
```

`git hash-object` reproduced every authoritative blob exactly before execution.

Result:

```text
node --test tests/cii-forcmnt-oracle-check.test.js
5 tests / 5 pass / 0 fail / 0 skip
```

Evidence: `agents/evidence/PR1080_forcmnt_checker_exact_execution.md`.

## Q5 Next Contribution / Minimal Patch

No additional FORCE product patch is justified yet.

Exact next action:

1. obtain an exact CAESAR II v14 `.CII` with CONTROL FORCMNT > 0 and a positive ELEMENT FORCMNT pointer;
2. run `node scripts/cii-forcmnt-oracle-check.mjs <candidate>`;
3. if it returns `PASS_CANDIDATE`, preserve exact bytes/hash;
4. separately decode pointer -> 20-row block -> two 10-row specs -> NODE/vector semantics -> unused-spec sentinel -> adjacent falsifiers;
5. add retained-real byte-custody tests;
6. only after those gates pass may FORCE intake/resolver authority be reconsidered.

Until then:

```text
FORCE intake = BLOCKED
FORCE mutable spans = 0
FORCE mutation authority = NONE
```