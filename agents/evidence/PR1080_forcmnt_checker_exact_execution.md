# PR1080 FORCMNT acquisition-checker exact-source execution

PR: `#1080`
Branch: `chore/cii-forcmnt-oracle-acquisition-v14`
Execution basis head: `ccdf3c89c7b2cd7233c944c3d29873a33d176e62`
Scope: diagnostic checker only; no FORCE mutation authority.

## Exact source custody

The locally executed three-file closure was reconstructed from GitHub and accepted only after `git hash-object` reproduced the authoritative repository blobs exactly:

```text
parser/fixed-field.js
  expected 485daa43553681ca54f488499e57f36d2239be58
  actual   485daa43553681ca54f488499e57f36d2239be58

scripts/cii-forcmnt-oracle-check.mjs
  expected 61da51acdbda3f1692b2aef5023db6fe509250bf
  actual   61da51acdbda3f1692b2aef5023db6fe509250bf

tests/cii-forcmnt-oracle-check.test.js
  expected 96d7fd3219675ba885118394320fae72f093c6dd
  actual   96d7fd3219675ba885118394320fae72f093c6dd
```

No normalized/reimplemented helper was substituted.

## Execution

Command:

```text
node --test tests/cii-forcmnt-oracle-check.test.js
```

Result:

```text
TAP tests     5
pass          5
fail          0
cancelled     0
skipped       0
todo          0
```

Passing gates:

1. structurally valid v14/nonzero candidate returns `PASS_CANDIDATE` only and grants `mutationAuthority: NONE`, `mutableSpans: []`;
2. v11 target is blocked;
3. zero CONTROL FORCMNT is blocked;
4. physical row count not equal to CONTROL x 20 is blocked;
5. positive ELEMENT FORCMNT pointer outside the physical block range is blocked.

## Candidate search continuation

After checker qualification, connected-repository and public-web search was repeated for an exact neutral file with all of:

```text
VERSION = 14
CONTROL FORCMNT > 0
positive ELEMENT FORCMNT pointer
physically populated FORCMNT section
```

No qualifying candidate was found.

Additional rejected candidates/leads:

- `reallaksh19/3D_Viewer_v2.0a/tmp/repro_user_error.cii`: VERSION 11, CONTROL FORCMNT 0.
- `Benchmark/CIICompare/BM_CII_TARGET1.CII`: VERSION 11, CONTROL FORCMNT 0.
- pinned `SYS-0001-v14.CII`: VERSION 14 but FORCMNT physical rows 0.
- BM4 ACCDB/InputXML: real FORCE/MOMENT semantic evidence at 12 nodes, but no retained v14 neutral export carrying those records.
- searches of current connected branches/commits and public web did not expose another exact v14/nonzero neutral file.

## Authority result

```text
FORCMNT acquisition checker execution   PASS 5/5
candidate structural gate               QUALIFIED
real v14 nonzero FORCMNT candidate      NOT_AVAILABLE
retained-real two-spec decode           NOT_RUN
FORCE mutation authority                NONE
FORCE mutable spans                     0
```

A future `PASS_CANDIDATE` still requires exact-byte retention followed by two 10-row specification decoding, NODE/vector semantics, unused-spec sentinel proof, adjacent ownership falsifiers, and retained-real byte-custody tests before any FORCE product change.