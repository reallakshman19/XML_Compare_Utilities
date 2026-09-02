# PR1080 Workreport — read-only FORCMNT oracle acquisition checker

## Delivery container

- PR: `#1080`
- Branch: `chore/cii-forcmnt-oracle-acquisition-v14`
- Base: `main@bfe3abbb67060c1212001f2e9d967c229a057640`
- Scope: diagnostic/evidence utility only
- Merge authority: Owner-only; not granted for this new PR.

## Progression performed

The preceding evidence leg was merged through transport PR #1079 as `main@bfe3abbb67060c1212001f2e9d967c229a057640`.

The next dependency hunt was broadened across connected repositories, commit history and public web search.

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

Rejected/insufficient leads include:

- `Benchmark/CIICompare/BM_CII_TARGET1.CII`: VERSION 11 / CONTROL FORCMNT 0.
- `reallaksh19/3D_Viewer_v2.0a/tmp/repro_user_error.cii`: VERSION 11 / CONTROL FORCMNT 0.
- pinned native `SYS-0001-v14.CII`: VERSION 14 but FORCMNT physical rows 0.
- BM4 ACCDB/InputXML: real semantic force/moment evidence, but no retained v14 neutral export carrying those records.
- connected commit/branch search and public-web search did not expose another exact v14/nonzero neutral file.

## Read-only acquisition checker

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

## Exact-source checker execution

The three-file executable closure was reconstructed from GitHub and accepted only after `git hash-object` reproduced the authoritative blob identities exactly:

```text
parser/fixed-field.js
485daa43553681ca54f488499e57f36d2239be58

scripts/cii-forcmnt-oracle-check.mjs
61da51acdbda3f1692b2aef5023db6fe509250bf

tests/cii-forcmnt-oracle-check.test.js
96d7fd3219675ba885118394320fae72f093c6dd
```

Execution:

```text
node --test tests/cii-forcmnt-oracle-check.test.js
```

Result:

```text
5 tests
5 pass
0 fail
0 cancelled
0 skipped
0 todo
```

Evidence: `agents/evidence/PR1080_forcmnt_checker_exact_execution.md`.

This qualifies the acquisition checker itself; it does not satisfy the missing retained-real specimen gate.

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
- exact-source focused synthetic checker tests: PASS 5/5
- exact candidate v14 nonzero FORCMNT: NOT_AVAILABLE
- FORCE retained-real semantic decode: NOT_RUN
- FORCE mutation qualification: NOT_QUALIFIED
