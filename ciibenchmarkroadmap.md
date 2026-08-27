# CII Writer2 Benchmark Roadmap

## Purpose

Create a retained, auditable benchmark ladder for Writer2 using the exact frozen real file:

```text
Benchmark/CIICompare/BM_CII_SOURCE.CII
Git blob: e41cd05603b56837cbb6e31b9d4074ef6106fe9b
Frozen base commit: 9685a2f41ec2b5a5c170762816702fefe90e18a7
Neutral version: V11
```

The benchmark must separate runtime-routing qualification from engineering/postimage qualification. It must not turn Writer2 output into its own oracle, must not silently discover a different record when an expected benchmark record drifts, and must not promote generated V14 evidence to native-V14 evidence.

## Baseline retained facts

The frozen V11 source is the benchmark authority. Current qualified baseline facts are:

```text
ELEMENTS                  40 x 15-row blocks
CONTROL.NOHGRS            1
CONTROL.NONAM              4
CONTROL.RESTRAINT blocks   7
CONTROL.SIF&TEES blocks    9
NODENAME rows              4
RESTRANT rows/block        24
SIF&TEES rows/block        10
HANGER count               1
HANGER node                205
MISCEL_1 rows              23
```

The first retained RESTRAINT benchmark is intentionally frozen to:

```text
pointer                    1
slot                       1
node                       190
owner element              180 -> 190
expected occupied slots    1
expected owner count       1
```

The benchmark must fail if those facts stop being true. It must not dynamically choose another candidate.

## Governing benchmark rules

1. **Exact source custody** — every benchmark records the exact source Git blob and source SHA-256 when executed.
2. **Orthogonal first cases** — qualify one mutation family at a time before composites.
3. **Independent expected postimage** — structural expected bytes are constructed by benchmark/oracle code that does not import Writer2 mutation code.
4. **Fail closed on fixture drift** — node, element, pointer, slot, cardinality and owner count are fixed benchmark facts.
5. **Exact negative assurance** — bytes/semantics outside authorized mutation regions must remain unchanged.
6. **No topology widening** — Writer2 benchmark cases must preserve ELEMENT connectivity unless a future separately-authorized Writer3 benchmark says otherwise.
7. **FORTRAN lexical authority** — I13 count/pointer coordinates must remain lexical integers, not merely numerically integral values.
8. **Version evidence classes stay separate** — V11 retained-real, converter-generated V14, #1042 generated V14, and native V14 are different gates.
9. **No PASS by construction** — a Writer2-produced postimage is never the sole expected oracle for Writer2 itself.
10. **Public runtime and oracle both required** — low-level writer success alone does not qualify the product route.

## Benchmark ladder

### BM-W2-00 — identity/control

```text
input      BM_CII_SOURCE.CII
operation  none
expected   byte-identical identity
```

Purpose: establish zero-delta intake/export custody.

### BM-W2-01 — NODENAME CREATE

Preferred frozen endpoint after custody qualification:

```text
node       10
before     unnamed / zero NODENAME pointer
after      BM-N10
```

Expected structural transition:

```text
CONTROL.NONAM        4 -> 5
NODENAME rows        4 -> 5
selected pointer     0 -> 5 (append allocation, only if source qualification proves this policy)
ELEMENT count        40 -> 40
topology             unchanged
```

Do not freeze append allocation until its current Writer2 authority is re-proven against this retained source.

### BM-W2-02 — V11 SIF/TEE DELETE

Frozen candidate:

```text
owner element        70 -> 250
SIF pointer          1
record node          70
source raw code      3
```

Operation:

```text
DELETE complete SIF block 1
```

Expected:

```text
CONTROL.SIF&TEES     9 -> 8
SIF rows             90 -> 80
selected owner       1 -> 0
retained pointers    p > 1 => p - 1
connectivity         unchanged
```

Raw-code mutation `3 -> 5` is not a Writer2 benchmark oracle while raw field-2 semantics remain unresolved.

### BM-W2-03 — HANGER DELETE-ALL

Frozen candidate:

```text
node                 205
count                1 -> 0
```

Expected:

```text
CONTROL.NOHGRS       1 -> 0
hanger nodes         [205] -> []
MISCEL_1 rows        23 -> 11
ELEMENTS             unchanged
NODENAME             unchanged
SIF&TEES             unchanged
RESTRANT             unchanged
```

### BM-W2-04 — RESTRAINT block DELETE/compaction

This is the primary retained-real W2 B benchmark.

Frozen candidate:

```text
pointer              1
slot                 1
node                 190
owner element        180 -> 190
rows/block           24
```

Independent expected transformation:

```text
CONTROL restraint blocks        7 -> 6
RESTRANT physical rows          168 -> 144
selected owner pointer          1 -> 0
all retained pointers p > 1     p -> p - 1
CONTROL.NONAM                   exactly unchanged at 4
ELEMENT connectivity            exactly unchanged
all non-RESTRANT semantic data  unchanged
```

The independent oracle may edit only:

```text
CONTROL row 2 / field 4 (I13)
ELEMENT block row 13 / field 4 (I13 restraint pointer)
RESTRANT section physical cardinality
```

All remaining bytes are expected to be inherited from the frozen source except where line deletion changes absolute offsets.

### BM-W2-05 — tri-family composite

Only after BM-W2-01/02/03 independently qualify:

```text
NODENAME CREATE
+ SIF DELETE
+ HANGER DELETE
```

Expected CONTROL state:

```text
NOHGRS  1 -> 0
NONAM   4 -> 5
SIF     9 -> 8
```

RESTRANT remains exactly 7.

### BM-W2-06 — four-family stress case

After BM-W2-04 also qualifies:

```text
NODENAME CREATE
+ SIF DELETE
+ HANGER DELETE
+ RESTRAINT DELETE
```

Expected cardinality vector:

| Field | Before | After |
|---|---:|---:|
| NUMELT | 40 | 40 |
| NOHGRS | 1 | 0 |
| NONAM | 4 | 5 |
| RESTRAINT | 7 | 6 |
| SIF&TEES | 9 | 8 |

This is the final V11 one-original-preimage composite benchmark, not the first benchmark.

## Negative benchmark suite

Each positive benchmark requires falsifiers.

### NEG-01 — unrelated byte drift

Change one unrelated header byte after an otherwise-correct postimage. Independent validation must fail exact complete-postimage comparison.

### NEG-02 — stale preview/hash

Replay a bound preview against an already-modified target. Must fail stale-target custody.

### NEG-03 — wrong CONTROL field

For RESTRAINT delete, mutate `CONTROL.NONAM` in addition to the authorized restraint count. Must fail.

### NEG-04 — wrong pointer relocation

Delete RESTRAINT block 1 but leave any pointer greater than 1 unshifted. Must fail.

### NEG-05 — invalid I13 lexical form

Use `6.000000`, `6.000000E+00`, or `6.000000D+00` in an I13 count/pointer coordinate. Must fail.

### NEG-06 — wrong SIF cardinality unit

Remove fewer/more than the complete 10-row V11 SIF block. Must fail.

## Benchmark manifest

The repository benchmark manifest is expected at:

```text
Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json
```

It records frozen source custody and each benchmark's fixed record identity, operation family, expected counts, expected pointer transition and authority class. Tests must read it rather than duplicate benchmark facts in several source files.

## Independent oracle architecture

### Level A — repository independent structural oracle

Implement an oracle that does not import Writer2 writer/planner modules. For BM-W2-04 it will:

1. verify CRLF and section ordering;
2. verify CONTROL restraint count is exactly 7;
3. verify ELEMENTS has exactly 40 x 15 rows;
4. verify element `180 -> 190` has restraint pointer 1;
5. verify RESTRAINT has exactly 7 x 24 rows;
6. verify block 1 / slot 1 is node 190 and all other slots are empty;
7. construct expected postimage by:
   - `CONTROL restraint count 7 -> 6` using lexical I13;
   - `ELEMENT restraint pointer 1 -> 0` for deleted owners;
   - `ELEMENT restraint pointer p -> p-1` for every retained pointer `p > 1`;
   - deleting exactly the first 24 RESTRAINT rows;
8. preserve all other line text exactly;
9. re-intake the oracle postimage and verify semantic invariants.

Writer2 output must equal this independently constructed expected postimage for the canonical repository benchmark.

### Level B — CAESAR-native retained oracle

Where available, create a native CAESAR file by making exactly the benchmark change in the corresponding CAESAR version and saving/exporting. Freeze the file hash and compare structural/semantic authority against the Level-A oracle.

Do not require whole-file byte equality when CAESAR itself legitimately rewrites unrelated formatting; instead classify the accepted comparison dimensions explicitly.

## Version ladder

### W2 A

Existing synthetic public-runtime qualification remains independent. Benchmark work does not replace W2 A.

### W2 B — retained-real V11

Primary case: BM-W2-04.

Required path:

```text
retained V11 BM_CII_SOURCE
-> exact preview / explicit APPLY
-> public applyCiiWorkspaceTargetWriter2()
-> Writer2 postimage
-> independent BM-W2-04 oracle
-> exact expected postimage + semantic validation
```

### W2.35 — converter-generated V14

Generate V14 source/target from the validated V11 benchmark. Execute the same BM-W2-04 operation. Require:

```text
input/output version 14
changed sections include CONTROL/ELEMENTS/RESTRANT
generated V14 output downgraded to V11 == validated BM-W2-04 V11 postimage
```

This is generated-V14 evidence only.

### W2.35a — #1042 generated V14 regression

Keep #1042 as a separate historical regression fixture and gate. Do not merge its evidence identity with generic generated V14.

### W2.40 — native V14

Acquire/freeze a genuine native V14 baseline and a native V14 BM-W2-04-equivalent changed file. Converter-generated V14 must never be relabelled native.

### W2 H — release freeze

Release freeze requires, at minimum:

```text
W2 A public runtime PASS
BM-W2-04 retained-real V11 / W2 B PASS
BM-W2 generated-V14 / W2.35 PASS
#1042 generated-V14 / W2.35a PASS
native V14 / W2.40 PASS
I13 lexical falsifiers PASS
negative benchmark suite PASS
no unresolved unexpected semantic delta
```

## Implementation phases

### Phase 1 — benchmark custody and independent BM-W2-04 oracle

Files:

```text
ciibenchmarkroadmap.md
Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json
tests/cii-workspace-writer2-benchmark-restraint-delete.test.js
```

Acceptance:

- fixed pointer-1/node-190/180->190 custody is proven from the real source;
- no dynamic fallback candidate selection;
- independent postimage is constructed without Writer2 imports for its expected bytes;
- Writer2 result is compared to the independent postimage;
- connectivity and unrelated semantic state remain unchanged;
- I13 lexical forms are explicitly checked.

### Phase 2 — BM-W2-01/02/03 standalone cases

Qualify NODENAME CREATE, SIF DELETE and HANGER DELETE independently against fixed retained-source records.

### Phase 3 — composites BM-W2-05/06

Combine only already-qualified standalone cases.

### Phase 4 — generated V14

Run the same benchmark semantics through the frozen V11/V14 converter bridge and compare normalized V11 postimages exactly.

### Phase 5 — native V14

Add externally retained native V14 benchmark evidence and keep its source custody explicit.

### Phase 6 — release bundle

Freeze benchmark manifests, expected hashes, validation ledger, negative assurance and release-gate result.

## Current implementation decision

Start with **BM-W2-04 RESTRAINT block 1 / node 190 / owner 180->190** because it exercises the exact currently-pending retained-real Writer2 boundary:

```text
real physical cardinality
+ CONTROL count custody
+ ELEMENT pointer relocation
+ fixed-FORTRAN I13 syntax
+ independent complete-postimage validation
+ topology non-regression
```

No additional Writer2 engineering authority is created by the benchmark. If the retained source contradicts any frozen benchmark fact, the benchmark fails and the discrepancy must be investigated before changing the expected data.
