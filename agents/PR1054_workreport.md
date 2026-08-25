# PR1054 work report — Writer2 W2.17 RESTRAINT product/runtime qualification

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_ISSUE: #1052
PR: #1054
BRANCH: agent/cii-writer2-restraint-product-runtime-w217
BASE_MAIN: 3a681c1c587ee3c1462a962879e4f79433258105
PREDECESSOR: PR #1053 / W2.16 / squash merged
WORK_INTENT: INVESTIGATE / VALIDATE
CRITICALITY: ENGINEERING_CRITICAL
MUTATION_AUTHORITY: READ_ONLY_QUALIFICATION
PRODUCTION_CHANGE_AUTHORITY: FALSE_BY_DEFAULT
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR_STATE: DRAFT
CURRENT_GATE: W2_13_PRODUCT_RUNTIME
RELEASE_FREEZE: NOT_READY_FOR_WRITER2_RESTRAINT_DELETE_RELEASE_FREEZE
```

## Inherited observed truth

```text
W2.11 RESTRAINT P01-P06/P19/P07-P18 = PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                        = PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic product              = NOT_RUN_ENVIRONMENT
W2.13 retained-real-CII product      = NOT_RUN_ENVIRONMENT
remaining Writer2 regressions        = PARTIAL_PASS_W2_11_RESTRAINT_ONLY
repository npm                       = NOT_RUN_ENVIRONMENT
engineering failure                  = NONE_OBSERVED
```

## Binding authority / negative assurance

- CONTROL row1 / field4 / I13 = NONAM: preserve byte-identically.
- CONTROL row2 / field4 / I13 = RESTRAINTS: qualified RESTRAINT block-count mutation.
- RESTRAINT CREATE remains blocked.
- SIF CREATE remains blocked.
- HANGER CREATE remains blocked.
- Writer3 topology remains blocked/unchanged.
- Parser/converter semantics remain unchanged.
- No workflow changes without separate authorization.
- No production mutation unless an authored assertion first fails and the defect is isolated.

## Coordination

Live open Writer2 PR #1033 is SIF CREATE qualification only. W2.17 may consume merged SIF DELETE authority read-only but must not consume or widen SIF CREATE authority. No competing RESTRAINT runtime PR was found.

## Post-merge re-grounding

PR #1053 was squash-merged to exact `main`:

```text
3a681c1c587ee3c1462a962879e4f79433258105
```

The W2.16 merge was evidence-only. Current-main production/test identities therefore remain unchanged from the product implementation baseline. Exact current-main manifest:

```text
W2.13 synthetic product test                    9922377ddeda86fc9167d65f33c97095346e79fa
W2.13 retained-real-CII product test            c341b99e2786b0034ef672b4efb03d167d9ad26c
BM_CII_SOURCE.CII                               e41cd05603b56837cbb6e31b9d4074ef6106fe9b
cii-workspace-core.js                           cee2858a63992648edf5e61b8f63b3837a937f9e
cii-workspace-writer2-composite-routing.js      2e7a21bd17aa9af405f1a2f93201d4a45bb09e4b
cii-workspace-writer2-composite-restraint.js    c007c91e1ac73a3ba5003f59ccdfa027eb5156a0
cii-workspace-writer2-product-validation.js     05fcb594a3be5e360ce804c77872319730a16b53
restraint delete compaction planner             aedfb3ac78eed2294a88a64af261386f0db65085
regression: composite product routing            9fbddd0fdda5285c8ee8a477a850cf945051a9df
regression: HANGER partial product               4696cd24de47650d0757b1313f4ed05d622331f8
regression: HANGER deleted testimony             f02f0775424fabf20fbb70afa5be6090eeb67a0e
regression: real benchmark roundtrip              94f63368d0620ce22d26429073408d8f4d9f6e8c
regression: tri-family real benchmark             3a5fbab24a1de1e887bd13f40784484045f2b047
```

## Execution-environment investigation

This W2.17 turn attempted to obtain an admissible exact runner before considering any source mutation.

Observed:

```text
preserved /mnt/data/w215 sparse mirror           ABSENT
current main GitHub workflow runs                 0
predecessor a0098a7b... workflow runs             0
container GitHub token                            ABSENT
container HTTP/HTTPS proxy                        ABSENT
```

Native Git probe:

```text
git ls-remote https://github.com/reallaksh19/XML_Compare_Utilities.git HEAD
fatal: unable to access ... Could not resolve host: github.com
exit = 128
```

DNS-bypass probe against immutable raw GitHub host:

```text
curl --resolve raw.githubusercontent.com:443:185.199.108.133 ...
Failed to connect to raw.githubusercontent.com port 443
exit = 7
```

Therefore the execution container has no usable GitHub egress and no preserved exact checkout. The connector can inspect exact Git blobs, but it does not materialize repository files into the Node runtime as a checkout. There is also no connector action for starting a new manual workflow run. Creating/modifying a workflow or substituting a stubbed/module-rewritten harness would violate the qualification boundary and anti-gaming rules.

## Validation disposition

```text
W2.11 RESTRAINT runtime                         PASS_RUNTIME_EXACT_BLOB
W2.12 R01-R22                                  PASS_RUNTIME_EXACT_BLOB
W2.13 synthetic authored entrypoint             NOT_RUN_ENVIRONMENT
W2.13 retained-real-CII authored entrypoint     NOT_RUN_ENVIRONMENT
inherited Writer2 regression slice              PARTIAL_PASS_W2_11_RESTRAINT_ONLY
repository npm                                  NOT_RUN_ENVIRONMENT
engineering failure                             NONE_OBSERVED
release/freeze                                  NOT_READY_FOR_WRITER2_RESTRAINT_DELETE_RELEASE_FREEZE
```

No missing-checkout/module-load/network failure is relabelled as product PASS. No production defect has been observed in W2.17.

## Mandatory execution order on a capable exact runner

1. `node tests/cii-workspace-writer2-restraint-product-routing.test.js`
2. `node tests/cii-workspace-writer2-restraint-product-real-cii.test.js`
3. `node tests/cii-workspace-writer2-composite-product-routing.test.js`
4. `node tests/cii-workspace-writer2-hanger-partial-product.test.js`
5. `node tests/cii-workspace-writer2-hanger-partial-deleted-testimony.test.js`
6. `node tests/cii-workspace-writer2-real-benchmark-roundtrip.test.js`
7. `node tests/cii-workspace-writer2-trifamily-real-benchmark-roundtrip.test.js`
8. `npm ci && npm test` only on a complete exact checkout.

Runtime PASS is admissible only when the executed bytes match the pinned Git blobs above (and all transitively loaded repository files are from the same exact main revision).

## Changed-file ledger

Current PR diff is evidence-only:

```text
agents/PR1054_workreport.md
agents/status/PR1054.yaml
agents/claims/PR1054.yaml
```

The temporary WIP record has been removed. No production, test, workflow, parser, converter, UI, benchmark, or Writer3 repository file is changed by PR1054.

## Appendix A — takeover qualification

A1 Production trace: W2.11 physical compaction -> W2.12 one-TARGET0 original-coordinate arbitration -> W2.13 core Writer2 dispatch -> product validator -> independent complete-postimage validator -> canonical re-intake/final bytes.

A2 Failure isolation: the observed stop is runner acquisition/network/checkout availability; no authored assertion executed and therefore no product failure is established.

A3 Authority invariant: CONTROL row1/NONAM remains protected; row2/RESTRAINTS owns block-count mutation; CREATE/topology/parser authority remains blocked.

A4 Independent validation: the required W2.13 path terminates in the independent complete-postimage validator; Writer testimony alone is not sufficient.

A5 Minimal patch: no production patch is justified because no authored assertion has failed. The next action is execution, not code modification.

## EXACT_NEXT_ACTION

Acquire or use an existing authorized exact checkout/runner for `main@3a681c1c587ee3c1462a962879e4f79433258105`, execute the pinned W2.13 and inherited regression entrypoints in the mandatory order, preserve raw output, then update READY/NOT_READY. Do not create or modify workflows and do not merge PR1054 without a new explicit owner merge authorization.
