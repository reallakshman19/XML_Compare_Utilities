# PR1064 Writer2 public-runtime batch manifest

## Purpose

Prepare one non-micro, fail-closed execution batch for the unchanged Writer2 public runtime qualification. The batch executes W2 A first and, only after W2 A candidate PASS, executes BM-W2-01 through BM-W2-04 in registry order. This artifact prepares execution; it is not runtime evidence and promotes no gate by itself.

## Frozen execution identity

```text
repository   reallaksh19/XML_Compare_Utilities
basis        a9018c131be736606e44fd0379545d233238f33e
root tree    27eb6c81b8b69742e781720b2450714df7c7f74e
```

The PR branch may be based on later evidence-only `main`; all qualification commands below deliberately execute against the frozen pre-evidence basis above.

## Frozen authored runners and source custody

| Stage | Path | Required git blob |
|---|---|---|
| W2 A | `tests/cii-workspace-writer2-restraint-product-routing.test.js` | `9922377ddeda86fc9167d65f33c97095346e79fa` |
| BM-W2-01 NODENAME CREATE | `tests/cii-workspace-writer2-benchmark-nodename-create.test.js` | `7ba33984f290550f6f40eb91369ce9ceab1b74af` |
| BM-W2-02 SIF DELETE | `tests/cii-workspace-writer2-benchmark-sif-delete.test.js` | `688bc905c877ea63c65ba21624ac647660009eee` |
| BM-W2-03 HANGER DELETE-ALL | `tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js` | `93703ac66fec9b663165d95a20afbc654b6e26f4` |
| BM-W2-04 RESTRAINT DELETE | `tests/cii-workspace-writer2-benchmark-restraint-delete.test.js` | `54c08bf0b2baf8138a703350d9e2600387693008` |
| Registry | `Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json` | `d786d1e970666aa528a0e3d0822610f6afcb8364` |
| Retained-real V11 source | `Benchmark/CIICompare/BM_CII_SOURCE.CII` | `e41cd05603b56837cbb6e31b9d4074ef6106fe9b` |

BM-W2-03 uses the authored `hanger-delete-all` runner. No alias, renamed runner, generated entrypoint, or partial replacement is admissible.

## Batch command

From any environment that has Git + Node and can clone the repository:

```bash
bash agents/evidence/PR1064_writer2_public_runtime_batch.sh
```

The script creates an isolated exact checkout, verifies all identities above, captures Git/Node versions, records clean worktree state, and preserves stdout/stderr/exit status per stage.

## Mandatory execution order

```text
IDENTITY GATE
  -> W2 A public synthetic RESTRAINT product routing
     -> only on candidate PASS: BM-W2-01 NODENAME
        -> BM-W2-02 SIF DELETE
           -> BM-W2-03 HANGER DELETE-ALL
              -> BM-W2-04 RESTRAINT DELETE COMPACTION
```

There is no admissible route around W2 A. Focused family PASS does not substitute for public W2 A or retained-real public benchmark execution.

## Classification

### Before authored W2 A is reached

```text
clone/checkout/materialization failure                 => NOT_RUN / environment
identity mismatch                                      => NOT_RUN / wrong material
module/runtime environment stop before authored code   => NOT_RUN / environment
```

### Once authored W2 A code is reached

```text
first authored assertion/product exception             => FAIL
exit 0 + required W2 A completion marker + clean tree  => candidate PASS
```

A nonzero W2 A execution is deliberately emitted as `NEEDS_HUMAN_CLASSIFICATION`; stdout/stderr must establish whether the first reached boundary was environmental or authored. Do not infer FAIL from a transport/module failure and do not infer NOT_RUN after an authored assertion was reached.

### Benchmarks

BM-W2-01..04 do not begin unless W2 A has candidate PASS. After that, the batch stops on the first nonzero benchmark and preserves its raw evidence. Any later benchmark remains `NOT_RUN`; the failure must not be hidden by continuing the sequence.

## Independent benchmark expectations

- BM-W2-01: NODENAME count/pointer changes only as authored; element topology remains unchanged; lexical integer pointer custody remains exact.
- BM-W2-02: selected SIF block is deleted and retained pointers compact by the authored rule; raw field-2 semantic widening remains excluded.
- BM-W2-03: the only retained-real hanger is deleted; retained prefix/execution rows remain authoritative and topology is unchanged.
- BM-W2-04: selected 24-row RESTRAINT block is deleted; pointers greater than the removed block compact by one; CONTROL count and lexical I13 custody remain exact; retained blocks are byte-preserved.

The independent structural oracle remains authoritative. Production output must never regenerate or weaken the oracle.

## Batch output contract

The execution directory contains at least:

```text
runtime-manifest.txt
runtime-summary.txt
git-clone.stdout.txt
git-clone.stderr.txt
git-clone.exit-code.txt
git-checkout.stdout.txt
git-checkout.stderr.txt
git-checkout.exit-code.txt
git-status-before-runtime.txt
<stage>.stdout.txt
<stage>.stderr.txt
<stage>.exit-code.txt
git-status-after-<stage>.txt
```

Preserve the entire directory unchanged when returning evidence to the repository-side agent.

## Gate state at batch preparation

```text
W2 A                 NOT_RUN
BM-W2-01 public       NOT_RUN
BM-W2-02 public       NOT_RUN
BM-W2-03 public       NOT_RUN
BM-W2-04 public       NOT_RUN
W2 B                  NOT_RUN
W2.35                 NOT_RUN
W2.35a                NOT_RUN
W2.40                 NOT_RUN
W2 H                  NOT_READY
```

## Authority boundary

Batch preparation grants no production mutation authority. In particular it does not authorize:

- SIF CREATE or raw SIF field-2 semantic widening;
- Writer1C custody widening;
- Writer3/topology mutation;
- benchmark, independent oracle, or tolerance mutation;
- workflow mutation or use of an unrelated workflow as an evidence bypass;
- regenerated tests, stubs, import rewrites, partial-core substitutes, or manually reconstructed checkout evidence;
- a Writer2 production patch before the first authored failure is preserved and engineering-critical write authority is independently verified.

## Repo-native runner audit

The current repository has no generic existing workflow that executes this W2 A public path. The available workflows are specialized (`topology-staged-export-interchange.yml`, `verify-module-boundaries.yml`, `xml-test.yml`); changing or repurposing them merely to manufacture qualification execution would cross the protected workflow/evidence boundary. Therefore this exact external batch capsule is the next admissible execution mechanism in the current tool substrate.
