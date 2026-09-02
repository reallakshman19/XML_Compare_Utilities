# PR1080 Workreport — read-only FORCMNT oracle acquisition checker

## Delivery container

- PR: `#1080`
- Branch: `chore/cii-forcmnt-oracle-acquisition-v14`
- Base: `main@bfe3abbb67060c1212001f2e9d967c229a057640`
- Scope: diagnostic/evidence utility only
- Merge authority: Owner-only; not granted for this new PR.

## Progression performed

The preceding evidence leg was merged through transport PR #1079 as `main@bfe3abbb67060c1212001f2e9d967c229a057640`.

The next dependency hunt was broadened across connected repositories and public web search.

### Stronger semantic evidence found

`reallaksh19/Advanced_Analysis` PR #893 independently extracted 12 real rows from CAESAR ACCDB `INPUT_FORCMNT`, all force set `F1`, at nodes:

```text
20120 20330 20340 20500 20690 20700
21430 21590 21600 21720 22250 22350
```

The paired BM4 InputXML also carries `FORCESMOMENTS` records at those source nodes. This strengthens semantic `FORCMNT_PTR / FORCMNT_NUM / NODE_NUM / VECTOR_NUM / FX/FY/FZ/MX/MY/MZ` authority.

It does **not** establish v14 neutral-file physical byte custody.

### Neutral-file search result

No retained/public textual CAESAR II v14 `.CII` was found that simultaneously has:

- VERSION 14;
- CONTROL FORCMNT > 0;
- positive ELEMENT FORCMNT pointer;
- physically populated FORCMNT payload.

`Benchmark/CIICompare/BM_CII_TARGET1.CII` contains BM4 node identities including 20120/20330, but it is VERSION 11 and its CONTROL FORCMNT count is zero. It is therefore rejected as an oracle.

The pinned native v14 benchmark `SYS-0001-v14.CII` is independently known to have `FORCMNT 0` rows.

## New read-only checker

Added:

- `scripts/cii-forcmnt-oracle-check.mjs`
- `tests/cii-forcmnt-oracle-check.test.js`

Command:

```text
node scripts/cii-forcmnt-oracle-check.mjs <candidate-v14.cii>
```

The checker requires:

1. VERSION = 14;
2. CONTROL row 2 field 6 FORCMNT count > 0;
3. exact 15-row ELEMENT blocks;
4. integer FORCMNT pointer at ELEMENT zero-based row 12 / zero-based field 5;
5. at least one positive pointer;
6. FORCMNT physical rows = CONTROL count x 20;
7. each positive pointer <= physical FORCMNT block count.

A structurally valid candidate returns:

```text
status: PASS_CANDIDATE
mutationAuthority: NONE
mutableSpans: []
```

`PASS_CANDIDATE` is intentionally **not** a FORCE qualification verdict.

## Remaining retained-real gate

After a candidate passes the acquisition checker, qualification still requires:

1. preserve exact source bytes/hash;
2. decode both 10-row specifications per pointed 20-row block;
3. prove NODE_NUM and nine FX/FY/FZ/MX/MY/MZ vector semantics;
4. characterize the unused second-spec sentinel from real CAESAR output;
5. prove adjacent element/block negative ownership falsifiers;
6. add retained-real tests;
7. run preimage/postimage byte-custody validation;
8. only then consider changing FORCE intake/resolver authority.

## Protected authority

Unchanged:

```text
FORCE intake                    BLOCKED
FORCE resolver mutable spans    0
FORCE mutation authority        NONE
TARGET0 overwrite               DISABLED
Writer1/Writer2                 NOT INVOKED BY FIND & REPLACE
```

No Find & Replace production module, parser, converter, writer, workflow, benchmark, or oracle content is modified by PR #1080.

## Validation truth

- source/diff design review: PASS / bounded inspection
- focused synthetic checker tests: AUTHORED / NOT_RUN in connector-only substrate
- exact candidate v14 nonzero FORCMNT: NOT_AVAILABLE
- FORCE retained-real semantic decode: NOT_RUN
- FORCE mutation qualification: NOT_QUALIFIED
