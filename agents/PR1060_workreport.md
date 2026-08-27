# PR1060 Work Report — Writer2 BM-W2-04 exact runtime closure

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
BASE_MAIN: 29766c0432665e5f4b1340e59f9a16e7d4ef3999
BRANCH: agent/cii-writer2-bmw204-runtime-closure
PREDECESSOR: PR #1059 / squash-merged at ba4659e2cfb0c7242738ca7e6f372d94c3e44541
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: INVESTIGATE / VALIDATE / IMPLEMENT_ONLY_ON_REPRODUCED_DEFECT
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
RELEASE_FREEZE: NOT_READY_FOR_WRITER2_RELEASE_FREEZE
```

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

## Exact next action

1. Materialize the exact transitive ESM graph for `tests/cii-workspace-writer2-benchmark-restraint-delete.test.js` from the successor base.
2. Verify every admitted repository file against its Git blob SHA.
3. Run the committed benchmark unchanged.
4. First authored assertion/runtime failure after complete graph materialization is a genuine BM-W2-04 FAIL.
5. Clean execution promotes BM-W2-04 runtime only; W2 B remains blocked until W2 A also passes.
6. Continue the unchanged W2 A public-runtime test next.
7. Do not alter production behavior unless exact execution reproduces a product defect.

## Authority boundaries

No stubs, import rewrites, partial-core substitute, lossy V14 bridge, reconstructed PASS, Writer3 topology widening, SIF CREATE, HANGER CREATE, RESTRAINT CREATE, or raw SIF field-2 semantic mutation authority.

## Appendix A — takeover qualification

1. What exact event changes BM-W2-04 from NOT_RUN to PASS or FAIL?
2. Which physical coordinates may BM-W2-04 change, and which CONTROL field must remain byte-identical?
3. Why is the benchmark oracle independent of Writer2 implementation?
4. Why does BM-W2-04 PASS alone not promote W2 B?
5. If exact output differs from the oracle, which first wrong boundary must be isolated before any code change?
