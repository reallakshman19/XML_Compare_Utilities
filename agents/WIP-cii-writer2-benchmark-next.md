# WIP — CII Writer2 benchmark next batch

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
BASE_MAIN: d1f7d773ec89459f55d3fca9bcf0c93f2308b1e1
BRANCH: agent/cii-writer2-benchmark-next
WORK_INTENT: IMPLEMENT / VALIDATE
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
```

Mission: continue the approved `ciibenchmarkroadmap.md` after merged PR #1061. Implement the next orthogonal retained-real Writer2 benchmark case without changing production unless an authored benchmark reproduces a product defect.

Current next case: BM-W2-01 NODENAME CREATE on frozen `Benchmark/CIICompare/BM_CII_SOURCE.CII` blob `e41cd05603b56837cbb6e31b9d4074ef6106fe9b`.

Required gates before freezing the case:
1. prove node 10 is currently unnamed and bound to an ELEMENT with zero NODENAME pointer;
2. re-prove current Writer2 allocation policy on the retained source;
3. independent oracle must not import Writer2 mutation code;
4. CONTROL.NONAM 4->5, NODENAME 4->5, selected pointer 0->5 only if allocation authority proves append semantics;
5. ELEMENT connectivity/topology unchanged;
6. runtime remains NOT_RUN if exact checkout remains unavailable.

No SIF/HANGER/RESTRAINT CREATE, Writer3, workflow, parser, converter, or raw SIF semantic widening.
