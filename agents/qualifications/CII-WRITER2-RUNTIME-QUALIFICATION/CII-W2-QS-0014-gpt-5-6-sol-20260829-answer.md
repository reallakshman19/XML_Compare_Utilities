# CII-W2-QS-0014 — candidate answer

CHAIN_ID: CII-WRITER2-RUNTIME-QUALIFICATION
ENDPOINT_ID: EP-CII-W2-0014
QUESTION_SET_ID: CII-W2-QS-0014
QUALIFICATION_BASIS_HEAD: 6cfa288b02aecd1cec4de6398993a4bc7b47bf03
CANDIDATE_ID: gpt-5-6-sol-20260829
LIVE_PR_HEAD_OBSERVED: 28844511de8fd45e28d49ae1fe7a9e37845c5355
LIVE_MAIN_HEAD_OBSERVED: d35f6aa419244585afec2c47c8fbd0584011931a
RECONCILIATION: METADATA_DRIFT
QUALIFICATION_STATUS: DEFERRED_VERIFICATION
TAKEOVER_AUTHORITY: READ_ONLY

The live PR head is ahead of the qualification basis only by relay recovery metadata (`EP-CII-W2-0014` plus `agents/agentchain.md`). No Writer2 production, authored runner, benchmark source, oracle or execution-capsule behavior changed after `6cfa288b...`.

## Q1 — Production Trace

The PR1064 batch script first proves execution identity before any test is admitted:

```text
repository = reallaksh19/XML_Compare_Utilities
frozen checkout HEAD = a9018c131be736606e44fd0379545d233238f33e
root tree = 27eb6c81b8b69742e781720b2450714df7c7f74e
registry blob = d786d1e970666aa528a0e3d0822610f6afcb8364
retained-real source blob = e41cd05603b56837cbb6e31b9d4074ef6106fe9b
W2 A runner = 9922377ddeda86fc9167d65f33c97095346e79fa
BM-W2-01 runner = 7ba33984f290550f6f40eb91369ce9ceab1b74af
BM-W2-02 runner = 688bc905c877ea63c65ba21624ac647660009eee
BM-W2-03 runner = 93703ac66fec9b663165d95a20afbc654b6e26f4
BM-W2-04 runner = 54c08bf0b2baf8138a703350d9e2600387693008
```

The script clones, checks out the frozen basis, verifies `HEAD^{tree}`, hashes every frozen runner/source/registry path with `git hash-object`, and requires a clean worktree before runtime.

W2 A is `tests/cii-workspace-writer2-restraint-product-routing.test.js`. Its public path is:

```text
applyCiiWorkspaceTargetWriter2(preview, originalBytes)
 -> applyWriter(..., '2')
 -> currentTargetFor()
    -> intakeCiiWorkspaceDocument(targetInput)
    -> compare currentTarget.contentSha256 to preview.targetDocument.contentSha256
 -> adaptCiiDocumentToTopologyGraph(currentTarget)
 -> applyLowLevelWriter('2', ...)
    -> writer2HasRestraintApply(transferPlan)
    -> applyCiiWriter2CompositeWithRestraintDelete(...)
       -> target0 hash/byte + bound-scope custody
       -> RESTRAINT compaction component
       -> original-byte claim arbitration
       -> physical postimage re-intake
       -> postimage SHA/representation custody
 -> intakeCiiWorkspaceDocument(writerResult.bytes) again
 -> validateCiiWriter2ProductRoundTrip(...)
 -> PASS result only after validation
```

The first authored W2 A assertion after successful module load/fixture construction is the routed-plan assertion:

```js
assert.equal(routedPlan.status, 'PREVIEW_READY', routedPlan.blockers.join('|'));
```

W2 A must precede the retained-real benchmarks because the roadmap explicitly treats it as the synthetic public-product architecture gate. Focused family tests do not prove the complete public route. The batch therefore admits, in order, only after clean W2 A candidate PASS:

```text
BM-W2-01 NODENAME CREATE
 -> BM-W2-02 SIF DELETE
 -> BM-W2-03 HANGER DELETE-ALL
 -> BM-W2-04 RESTRAINT DELETE COMPACTION
```

## Q2 — Current Unresolved Problem / Failure Isolation

A nonzero W2 A exit is not self-classifying. Minimum retained evidence is:

```text
git-clone stdout/stderr/exit
git-checkout stdout/stderr/exit
runtime-manifest with actual/expected HEAD/tree/blob identities
git-status-before-runtime
W2_A stdout
W2_A stderr
W2_A exit code
git-status-after-W2_A if W2 A reached clean completion
```

Decision boundary:

- clone/checkout/DNS/auth failure -> `NOT_RUN / environment`;
- identity mismatch -> `NOT_RUN / wrong material`;
- module loader/runtime-environment failure before authored W2 A assertions -> `NOT_RUN / environment`;
- the first reached authored assertion or Writer2 product exception -> `FAIL`;
- exit 0 + exact W2 A completion marker + clean tree -> candidate `PASS`.

Prediction under the current environment-only hypothesis: an exact-checkout-capable substrate will pass identity/module load and reach authored W2 A code; current local substrate fails earlier at GitHub DNS and therefore supplies no product verdict.

Falsifier: a correct exact checkout successfully loads W2 A and reaches an authored assertion/product exception. The raw first exception/assertion is then the first wrong boundary and converts the next leg from environment qualification to product failure isolation.

## Q3 — Authority / Invariant

A valid independent verifier verdict may grant engineering-critical write authority only for the currently qualified mission and only after the repository is reconciled to the verdict basis. It does not itself create a product failure or authorize speculative Writer2 changes.

Still protected regardless of a takeover PASS:

- focused family PASS cannot be promoted to public W2 A/BM PASS;
- frozen `BM_CII_SOURCE.CII` and independently frozen oracle expected values cannot be regenerated from Writer2 output;
- lexical fixed-width integer/I13 custody remains mandatory for qualified CONTROL and ELEMENT pointer/count coordinates;
- SIF CREATE construction authority remains blocked;
- raw SIF field-2 semantic authority remains unresolved and cannot be widened;
- Writer1C custody boundaries remain unchanged;
- Writer3/topology mutation remains excluded;
- benchmark/oracle/tolerance weakening is prohibited;
- `.github/workflows/**` cannot be modified/reused merely to manufacture evidence without separate authority;
- merge authority remains owner-only and separate from AUTO/write authority.

An invalid shortcut would be to run a hand-reconstructed subset of `cii-workspace-core.js` dependencies and call its success W2 A PASS. Another invalid shortcut would be to edit independent expected bytes to match Writer2 output.

## Q4 — Independent Validation

Independent retained-real structural expectations are:

### BM-W2-01 NODENAME CREATE

```text
candidate node = 10
owner element = 10 -> 20, parsed index 0, FROM end
NODENAME pointer = 0 -> 5
CONTROL.NONAM = 4 -> 5
NODENAME rows = 4 -> 5
ELEMENT count = 40 -> 40
new name = BM-N10
ELEMENT pointer token = lexical I13
connectivity/topology unchanged
unrelated bytes protected
```

### BM-W2-02 SIF DELETE

```text
selected SIF pointer = 1, owner 70 -> 250
SIF blocks = 9 -> 8
physical rows = 90 -> 80
old pointer 1 -> 0
retained pointer p > 1 -> p - 1
CONTROL SIF count = 9 -> 8, lexical I13
raw SIF field-2 semantics are NOT part of the oracle
topology/unrelated bytes unchanged
```

### BM-W2-03 HANGER DELETE-ALL

```text
hanger node = 205
CONTROL.NOHGRS = 1 -> 0
hanger nodes = [205] -> []
MISCEL_1 rows = 23 -> 11
retained layout = authoritative prefix 7 rows + execution tail 4 rows
topology and unrelated sections unchanged
```

### BM-W2-04 RESTRAINT DELETE

```text
frozen delete candidate = pointer 1 / slot 1 / node 190 / owner 180 -> 190
RESTRAINT blocks = 7 -> 6
physical rows = 168 -> 144
old pointer 1 -> 0
retained pointer p > 1 -> p - 1
CONTROL RESTRAINT count = 7 -> 6, lexical I13
CONTROL.NONAM remains 4
ELEMENT count remains 40
retained blocks remain byte-identical
topology/unrelated bytes unchanged
```

These are independent because the benchmark oracles construct expected postimages from frozen source custody and operation rules and then compare Writer2 output to those expectations; Writer2 output is not used to generate the expected values.

Authored completion markers exist for every public benchmark:

```text
BM-W2-01 retained-real NODENAME CREATE qualification passed.
CII Writer2 BM-W2-02 retained-real V11 SIF DELETE benchmark passed.
BM-W2-03 retained-real HANGER DELETE-ALL qualification passed.
CII Writer2 BM-W2-04 retained-real V11 RESTRAINT benchmark passed.
```

The current batch script explicitly requires the W2 A marker but does not require the four BM markers. Requiring the already-authored BM markers would be a validation-methodology hardening, not a Writer2 product-logic change. It must not be changed while takeover authority is READ_ONLY.

## Q5 — Next Contribution / Minimal Patch

### Environment NOT_RUN

Do not patch Writer2. Preserve W2 A/BM public gates as NOT_RUN. The next contribution is an admissible exact-checkout execution substrate and unmodified evidence return.

### Authored W2 A FAIL

Preserve the raw first assertion/product exception. Isolate in this order:

```text
routed plan / readiness
 -> target0 re-intake + stale SHA custody
 -> topology adapter binding
 -> RESTRAINT composite plan/component
 -> original-byte mutation claim arbitration
 -> postimage canonical re-intake
 -> product validator
```

Only after a valid independent `PASS_WRITE_ALLOWED` verdict may production change. The smallest patch is one first-wrong production module plus one focused falsifier/regression reproducing preimage FAIL -> postimage PASS, followed by unchanged W2 A rerun. Roll back if the focused falsifier does not reproduce the raw public failure or if the patch changes protected unrelated bytes/authority.

### Benchmark FAIL after W2 A PASS

W2 A remains candidate PASS subject to evidence review; the first failing benchmark is classified from raw evidence and all later benchmarks remain NOT_RUN. Patch only the first wrong family boundary and retain the independent benchmark oracle unchanged.

### Full batch candidate PASS

Do not jump to release. Review/promote W2 A and BM-W2-01..04 only under repository qualification rules, then evaluate W2 B retained-real promotion and continue W2.35 -> W2.35a -> W2.40. W2 H remains NOT_READY until all required gates close.

### Candidate recommendation before production mutation

The only presently identified improvement is evidence hardening in `agents/evidence/PR1064_writer2_public_runtime_batch.sh`: pass each benchmark's unique authored completion marker to `run_case`, matching the existing W2 A treatment. This is not required to classify current Writer2 product behavior and must wait for independent verification because it changes validation methodology.

I do not grant myself write authority. Independent verifier verdict is required.