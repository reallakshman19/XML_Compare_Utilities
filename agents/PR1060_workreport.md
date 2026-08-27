# PR1060 Work Report — Writer2 BM-W2-04 exact runtime closure

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
BASE_MAIN: 29766c0432665e5f4b1340e59f9a16e7d4ef3999
BRANCH: agent/cii-writer2-bmw204-runtime-closure
PR: #1060 / DRAFT / OPEN
PREDECESSOR: PR #1059 / squash-merged at ba4659e2cfb0c7242738ca7e6f372d94c3e44541
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: INVESTIGATE / VALIDATE / IMPLEMENT_ONLY_ON_REPRODUCED_DEFECT
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
RELEASE_FREEZE: NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

## Merge and successor custody

Owner explicitly instructed `merge and proceed next` on 2026-08-27. PR #1059 was marked ready-for-review and squash-merged from exact head `312fc847d0d29fcac97bc1e24bf93f4134eb5aee` to `ba4659e2cfb0c7242738ca7e6f372d94c3e44541`.

During successor initialization, one placeholder-only `agents/PR1060_workreport.md` commit was accidentally written to `main`; it was immediately removed. No product, benchmark, parser, Writer, converter, test, or release file was touched by that cleanup. Corrected main head before successor branch creation is `29766c0432665e5f4b1340e59f9a16e7d4ef3999`.

## Inherited truth

```text
W2.34 focused bridge/export      PASS
W2 C0 exact public route         PASS
V14 lexical-I13 focused gate     PASS
V11 SIF lexical-I13 fix          IMPLEMENTED / runtime qualification pending
BM-W2-02 authored                YES / exact public runtime NOT_RUN
BM-W2-04 authored                YES / exact public runtime NOT_RUN
W2 A synthetic public runtime    NOT_RUN
W2 B retained-real V11           NOT_RUN
W2.35 generated V14              NOT_RUN
W2.35a #1042 generated V14       NOT_RUN
W2.40 native V14                 NOT_RUN
W2 H release freeze              NOT_READY
```

## New reproduced production defect — RESTRAINT pointer lexical I13 custody

While expanding the BM-W2-04 RESTRAINT path, source inspection found that `buildCiiWriter2RestraintPointerCustody()` claimed authority `EXACT_PARSED_INDEX_ENDPOINTS_AND_PHYSICAL_RESTRAINT_POINTER_I13`, but `physicalPointerField()` accepted numerically integral REAL spellings by applying `Number()` before the integer check.

A focused authored falsifier was added:

```text
tests/cii-workspace-writer2-restraint-pointer-i13-custody.test.js
Git blob 2c5940d17b13807455c4468a0b6d31fdc36f860f
```

It requires lexical `1` to qualify and requires these tokens to be rejected:

```text
1.000000
1.000000E+00
1.000000D+00
```

Exact five-file graph admitted and Git-blob verified:

```text
parser/fixed-field.js
  485daa43553681ca54f488499e57f36d2239be58

tabs/cii-workspace/cii-workspace-contracts.js
  6ab30d8dd088225fd89bb729bf9ffdebefe652f6

tabs/cii-workspace/cii-workspace-physical-file.js
  0c4c445fbd3d4b929b1f9288b789b244547c8867

tabs/cii-workspace/cii-workspace-writer2-restraint-delete-custody.js
  preimage 2176ac97eaef84f3aa9073d5eaf73d1530cf09a8
  postimage 7053230546eaba4588b98a35ae5fc3819da83c14

tests/cii-workspace-writer2-restraint-pointer-i13-custody.test.js
  2c5940d17b13807455c4468a0b6d31fdc36f860f
```

Exact preimage execution:

```text
node --experimental-default-type=module tests/cii-workspace-writer2-restraint-pointer-i13-custody.test.js

FAIL AS EXPECTED
actual   = QUALIFIED
expected = BLOCKED
token    = 1.000000
```

The production patch adds lexical gate `/^[+-]?\d+$/` before semantic nonnegative-safe-integer conversion. No generic parser, RESTRAINT allocation/create authority, topology, benchmark oracle, or Writer3 behavior changed.

Exact postimage execution using the same unchanged test and exact four dependency blobs:

```text
PASS
CII Writer2 RESTRAINT pointer lexical-I13 custody falsifier passed.
```

Classification:

```text
W2_RESTRAINT_POINTER_LEXICAL_I13_CUSTODY = PASS_RUNTIME_EXACT_5_FILE_BLOB_GRAPH
```

This focused PASS does **not** promote BM-W2-04, W2 A, or W2 B.

## BM-W2-04 exact graph frontier

Entry test:

```text
tests/cii-workspace-writer2-benchmark-restraint-delete.test.js
Git blob 54c08bf0b2baf8138a703350d9e2600387693008
```

Independent oracle:

```text
Benchmark/CIICompare/Writer2/cii-writer2-benchmark-oracle.js
Git blob b36e38c8df327069f07ea20ad50c91f03ffdcd6a
```

Direct repository import custody observed so far:

```text
parser/fixed-field.js
  485daa43553681ca54f488499e57f36d2239be58

tabs/cii-workspace/cii-workspace-core.js
  cee2858a63992648edf5e61b8f63b3837a937f9e

tabs/cii-workspace/cii-workspace-intake.js
  3939ff6866191bca0ccf6d27264ecd1f2549ddd5

tabs/cii-workspace/cii-workspace-physical-file.js
  0c4c445fbd3d4b929b1f9288b789b244547c8867

tabs/cii-workspace/cii-workspace-topology-adapter.js
  57b8d2d6e8335887b962e09085cc93ece2e36d68

tabs/cii-workspace/cii-workspace-writer2-composite-restraint.js
  c007c91e1ac73a3ba5003f59ccdfa027eb5156a0

tabs/cii-workspace/cii-workspace-writer2-product-validation.js
  05fcb594a3be5e360ce804c77872319730a16b53

tabs/cii-workspace/cii-workspace-writer2-composite-restraint-support.js
  5b1494ba95dbfdf663bc377f8632a50d7cd2b65b

tabs/cii-workspace/cii-workspace-writer2-restraint-delete-compaction-plan.js
  current exact branch blob to continue from

tabs/cii-workspace/cii-workspace-writer2-restraint-delete-custody.js
  7053230546eaba4588b98a35ae5fc3819da83c14
```

`cii-workspace-core.js` still requires the broader normal product graph; `cii-workspace-intake.js` additionally requires the CAESAR parser and auxiliary/hanger/capability/nodename/SIF custody subgraph. Native Git remains unavailable in the execution container (`Could not resolve host: github.com`), and the connector exposes no archive/clone transport. This is an environment transport limitation, not a benchmark FAIL or PASS.

## Runtime classification

```text
RESTRAINT lexical-I13 focused gate PASS_RUNTIME_EXACT_5_FILE_BLOB_GRAPH
BM-W2-04 source custody            PASS_SOURCE_INSPECTION
BM-W2-04 independent oracle        AUTHORED
BM-W2-04 complete exact graph      NOT_YET_MATERIALIZED
BM-W2-04 unchanged execution       NOT_RUN
W2 A                                NOT_RUN
W2 B retained-real V11             NOT_RUN
```

## Exact next action

1. Continue exact transitive static-import expansion from `cii-workspace-core.js` and `cii-workspace-intake.js`.
2. Git-blob verify every admitted repository file.
3. Run unchanged `node tests/cii-workspace-writer2-benchmark-restraint-delete.test.js`.
4. First authored assertion/runtime failure after complete graph materialization is a genuine BM-W2-04 FAIL.
5. Clean execution promotes BM-W2-04 runtime only; W2 B remains blocked until W2 A also passes.
6. Continue unchanged W2 A public-runtime test next.
7. No additional production behavior changes without another exact reproduced defect.

## Authority boundaries

No stubs, import rewrites, partial-core substitute, lossy V14 bridge, reconstructed PASS, Writer3 topology widening, SIF CREATE, HANGER CREATE, RESTRAINT CREATE, or raw SIF field-2 semantic mutation authority.

## Changed-file ledger

```text
agents/PR1060_workreport.md
agents/status/PR1060.yaml
agents/claims/PR1060.yaml
tabs/cii-workspace/cii-workspace-writer2-restraint-delete-custody.js
tests/cii-workspace-writer2-restraint-pointer-i13-custody.test.js
```

## Appendix A — takeover qualification

1. Reproduce why `1.000000` was incorrectly accepted under an authority explicitly named physical I13 and identify the exact preimage/postimage blobs.
2. Trace BM-W2-04 pointer 1 / node 190 / owner `180->190` from physical ELEMENT row 13 field 4 into pointer custody, compaction planning, physical write, public route, and product validation.
3. Explain why the focused lexical-I13 PASS does not promote BM-W2-04 or W2 B.
4. State the exact event that changes BM-W2-04 from NOT_RUN to PASS or FAIL.
5. If the completed BM-W2-04 graph fails next, identify the first wrong authority boundary before changing any oracle or production code.
