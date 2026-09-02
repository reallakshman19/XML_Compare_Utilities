# EP-CII-FR-0014 — FORCMNT oracle acquisition checker

CHAIN_ID: CII-FIND-REPLACE-V14
ENDPOINT_ID: EP-CII-FR-0014
PR: 1080
BRANCH: chore/cii-forcmnt-oracle-acquisition-v14
BASE_MAIN: bfe3abbb67060c1212001f2e9d967c229a057640
STATE: ACTIVE_DRAFT
CUSTODY_STATE: HELD
WRITE_AUTHORITY: DIAGNOSTIC_EVIDENCE_ONLY
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Q1 Production Trace

Merged Find & Replace remains:

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

FORCMNT physical shape and pointer schema are documented, and BM4 supplies real ACCDB/InputXML force semantics, but no retained/public v14 neutral file with nonzero FORCMNT has yet been found.

Known candidates fail the physical-oracle prerequisite:

- BM_CII_TARGET1.CII: VERSION 11 / CONTROL FORCMNT 0.
- SYS-0001-v14.CII: VERSION 14 / FORCMNT 0 rows.
- prior retained CII corpus: inspected CONTROL FORCMNT counts 0.

## Q3 Authority / Invariant

The acquisition checker consumes only established structural authority:

- VERSION must be 14;
- CONTROL row 2 field 6 is FORCMNT cardinality;
- ELEMENT blocks are 15 rows;
- FORCMNT is auxiliary pointer item 6 on the established six-pointer ELEMENT row (zero-based row 12 / field 5);
- FORCMNT physical cardinality is 20 rows per block.

It grants no mutation authority:

```text
mutationAuthority = NONE
mutableSpans = []
```

## Q4 Independent Validation

Authored synthetic tests cover:

1. structurally valid v14 nonzero candidate -> PASS_CANDIDATE only;
2. VERSION 11 -> BLOCKED;
3. CONTROL FORCMNT 0 -> BLOCKED;
4. CONTROL x20 physical cardinality mismatch -> BLOCKED;
5. positive pointer out of physical range -> BLOCKED.

Execution status in current connector-only substrate: NOT_RUN.

## Q5 Next Contribution / Minimal Patch

Run:

```text
node scripts/cii-forcmnt-oracle-check.mjs <candidate-v14.cii>
```

on any newly obtained exact CAESAR II v14 neutral file.

If and only if it returns `PASS_CANDIDATE`, retain exact bytes/hash and perform the separate semantic qualification:

```text
pointer
 -> exact 20-row block
 -> two 10-row specs
 -> NODE_NUM + nine force/moment vectors
 -> unused-spec sentinel
 -> adjacent falsifiers
 -> retained-real preimage/postimage tests
```

Do not enable FORCE from `PASS_CANDIDATE` alone.
