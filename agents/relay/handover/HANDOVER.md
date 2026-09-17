# V2.5 handover — #1224

## Current relay state

- Lifecycle: `ACTIVE` with validation stop `ESSENTIAL_INPUT_MISSING`
- Material authority: `READ_ONLY`
- Active EP: `EP-CII-W2-NB-R1-V25-0002`
- Last checkpoint: `CP-CII-W2-NB-R1-V25-0001`
- Roadmap: `ROADMAP-XMLCU-V25-1224@RM-0003`
- Progress basis: `PB-0003`
- Objective: `OBJ-CII-W2-NB-R1-1224`
- Phase/work package: `PH-IMPLEMENTATION / WP-RET-001`
- Draft PR: `#1228`, mergeable, merge authority `OWNER_ONLY`

## Product state

Owner-directed implementation is present on `revision/cii-writer2-nodename-byte-r1-1224-v25-migration`:

1. SOURCE correspondence can map injectively into a larger TARGET subgraph while missing SOURCE support and ambiguous TARGET choices remain fail-closed.
2. Same-cardinality NodeName REPLACE is recovered as Writer1C exact-span authority before multisource aggregation; direct Writer2 overwrite authority remains unchanged.
3. Mixed source-set apply performs Writer1C replacement, re-intake/revalidation, then Writer2 structural NodeName relocation. V14 structural deltas are projected onto the replacement postimage rather than using the broad bridge for pure replacement.
4. Retained expected semantics are 35 REPLACE + 1 CREATE + 0 DELETE.
5. The independent retained byte oracle authorizes only the expected NodeName fields, required CONTROL.NONAM count, and independently derived affected ELEMENT pointer field; unrelated NODENAME bytes/padding, pointer fields, sections, and CR/LF bytes must remain exact.

## Qualification truth

`EP-CII-W2-NB-R1-V25-0001` required independent DISC/QUAL/TC before product mutation. Product mutation occurred after the owner instructed the active session to fix and proceed, without fabricating those missing certifications. This governance deviation is explicitly recorded in `CP-CII-W2-NB-R1-V25-0001`; it has **not** been retroactively certified.

`EP-CII-W2-NB-R1-V25-0002` is validation/delivery reconciliation only and prohibits further production mutation. A concrete failing executable test must create a bounded repair successor EP before production code changes again.

## Environment truth

Executable retained validation is still `NOT_RUN_ENVIRONMENT`:

- Actions run `35266182142`: `runner_id=0`, `steps=[]`.
- Actions run `35266754547`: `runner_id=0`, `steps=[]`.
- No byte-faithful repository checkout is mounted in the current execution environment.

These are infrastructure failures before test execution, not product test failures.

## Exact next action

Run, in a byte-faithful checkout or functioning runner:

```text
node tests/cii-workspace-source-subgraph-propagation.test.js
node tests/cii-workspace-multisource-retained-auto-anchor-benchmark.test.js
node tests/cii-workspace-multisource-pb0003-benchmark.test.js
```

If all pass, run the retained browser benchmark when Playwright is available, update the relay evidence, and prepare PR #1228 for owner review. If any command fails, record the exact failure and create a failure-specific repair EP before changing production code.
