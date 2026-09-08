# CII Writer2 current-main exact runtime qualification

## Purpose

Carry the historical PR #1064 public-runtime qualification intent forward to the post-repair current `main` without changing Writer2 product behavior, benchmark inputs, independent oracles, tolerances, converters, topology authority, or workflows.

This evidence leg is bound to:

```text
main commit  39317e1ae97d990d7d35261d453ca4cd520e623a
root tree    d86acd2fa48ac7553b2b7f1c41ce1dc720688f00
```

`39317e1a...` is the merge of PR #1123, the lexical-I13 SIF ELEMENT pointer validator repair. It follows the already-merged BM-W2-03 oracle repair (#1119) and BM-W2-04 custody repair (#1121).

## Ordered gate

The companion capsule `agents/evidence/CII_WRITER2_CURRENT_MAIN_RUNTIME_39317e1.sh` executes and stops on first nonzero:

```text
W2 A
 -> BM-W2-01 NODENAME CREATE
 -> BM-W2-02 SIF DELETE
 -> BM-W2-03 HANGER DELETE-ALL
 -> BM-W2-04 RESTRAINT DELETE
 -> retained S1/S2/S3 -> untouched T browser product path
```

The four retained BM runners now require their authored completion markers, rather than exit `0` alone. The final browser gate additionally requires the retained test diagnostics to contain:

```text
"structuralStatus": "READY"
"exactRawEmissionStatus": "READY"
"versionBridgeStatus": "PASS"
```

## Current-main identity pins

### Public Writer2 batch

```text
Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json
d786d1e970666aa528a0e3d0822610f6afcb8364

Benchmark/CIICompare/BM_CII_SOURCE.CII
e41cd05603b56837cbb6e31b9d4074ef6106fe9b

tests/cii-workspace-writer2-restraint-product-routing.test.js
9922377ddeda86fc9167d65f33c97095346e79fa

tests/cii-workspace-writer2-benchmark-nodename-create.test.js
7ba33984f290550f6f40eb91369ce9ceab1b74af

tests/cii-workspace-writer2-benchmark-sif-delete.test.js
688bc905c877ea63c65ba21624ac647660009eee

tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js
93703ac66fec9b663165d95a20afbc654b6e26f4

tests/cii-workspace-writer2-benchmark-restraint-delete.test.js
54c08bf0b2baf8138a703350d9e2600387693008
```

The retained runners themselves are unchanged from the frozen qualification basis; the accepted repairs are in production/support/oracle implementation.

### S1/S2/S3 retained product path

```text
Benchmark/S1.CII
73c49165b9d33a8c776ef76f480efec3a90e0c93

Benchmark/S2.CII
a04622553720cb41a6fc2a4b85d8290eac7a3b0a

Benchmark/S3.CII
a20b1ab87dd4e854cf2f453f8fd206be4b566b42

Benchmark/T.CII
96b4a4b12bf66bcb0264c56e7767a857c4cc11e6

Benchmark/TEXPECTED-PARTIALLLYDONE.CII
b7d0913a3827deb184d65c880594ca0667562167

tests/browser/cii-writer2-multisource-retained-benchmark.spec.mjs
e1ff63cb0220649025d6f07bd0dc9727104dcdcd

playwright.cii-writer2-retained.config.mjs
e26224f675e40666b80667c77e785e7a17d48161

tests/browser/cii-writer2-static-server.mjs
85311618b795781d96925e9855902cab95ef8917

tests/browser/cii-writer2-bridge-fixture.html
28c66a7fd6175c7cc50294cbe79e138dbde090f8

package.json
4ed6e40a2e49f4df4df03951300f79dd8b09c0bd

package-lock.json
8ead32dfbd874ab7b1b3d9938d10af7077b2550e
```

The retained Playwright spec is byte-identical to its PR #1112 merge form.

## Runtime truth in this execution substrate

Fresh exact materialization was attempted after the capsule was authored:

```text
git ls-remote https://github.com/reallaksh19/XML_Compare_Utilities.git 39317e1ae97d990d7d35261d453ca4cd520e623a
fatal: unable to access 'https://github.com/reallaksh19/XML_Compare_Utilities.git/': Could not resolve host: github.com
exit 128
```

Therefore the current exact-runtime classification is:

```text
W2 A                                NOT_RUN_ENVIRONMENT
BM-W2-01                            NOT_RUN_BLOCKED_ON_EXACT_RUNTIME
BM-W2-02                            NOT_RUN_BLOCKED_ON_EXACT_RUNTIME
BM-W2-03                            NOT_RUN_BLOCKED_ON_EXACT_RUNTIME
BM-W2-04                            NOT_RUN_BLOCKED_ON_EXACT_RUNTIME
S1/S2/S3 retained browser           NOT_RUN_BLOCKED_ON_EXACT_RUNTIME
```

This does not retract the narrower current-main-equivalent diagnostic PASS evidence recorded by #1117/#1119/#1121 or the retained product-path PASS recorded by #1112. It only preserves the distinction between those evidence classes and a fresh exact checkout execution at `39317e1a...`.

GitHub currently exposes no pull-request-triggered workflow run for `39317e1a...`; no missing CI context is represented as PASS.

## Execution command

On a substrate with GitHub clone access, run unchanged:

```bash
bash agents/evidence/CII_WRITER2_CURRENT_MAIN_RUNTIME_39317e1.sh
```

The capsule clones a fresh repository, detaches exactly at the bound basis, verifies the root tree and every listed Git blob, preserves stdout/stderr/exit codes per gate, installs the lockfile-pinned Playwright dependency set and Chromium revision only after BM-W2-04 passes, then runs the retained browser test.

## Protected boundaries

- no Writer2 production changes in this qualification leg;
- no benchmark CII changes;
- no oracle expected-value or tolerance changes;
- no SIF CREATE authority widening;
- no Writer3/topology promotion;
- no converter mutation;
- no workflow mutation or bypass;
- no physical merge of S1/S2/S3 into one source authority;
- `TEXPECTED-PARTIALLLYDONE.CII` remains structural authority only as established by #1112.
