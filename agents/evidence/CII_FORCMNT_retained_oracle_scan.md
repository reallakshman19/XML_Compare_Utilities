# CII FORCMNT retained-oracle scan

Chain: `CII-FIND-REPLACE-V14`
Base main: `274b47ef7a787a9f82cfe585371dc9b19d7983b1`
Scope: evidence only; no FORCE/FORCMNT mutation authority.

## Qualification question

Can an existing retained CII specimen prove the complete FORCE/FORCMNT ownership chain required before enabling Find & Replace FORCE scope?

Required oracle:

1. CAESAR II v14 target.
2. CONTROL FORCMNT count > 0.
3. Exact ELEMENT row-12 item-6 pointer > 0.
4. Pointer resolves to one exact 20-physical-row FORCMNT block.
5. Both 10-row specifications can be independently reconstructed.
6. Node/vector fields and unused-spec sentinel behavior are observable.
7. Adjacent element/block falsifiers prove that no unrelated byte range is writable.

## Retained specimens inspected

### XML_Compare_Utilities / SOURCE 3.CII

- path: `Benchmark/CIICompare/SOURCE 3.CII`
- Git blob: `20c0c37014004fb9de46e3e4d01f0c62535495d5`
- version: 11
- CONTROL row 2: `37 20 0 132 1 0`
- FORCMNT count: **0**
- result: useful for NODENAME/DISPLMNT retained evidence, not a FORCMNT oracle.

### 3D_Converters / RMS-BLOW-1.cii

- path: `Benchmarks/XML to CII 2019/Sample 1.1/RMS-BLOW-1.cii`
- Git blob: `dfa2b2721c64a0b0d38784fc7975be885ae817e7`
- version: 11
- CONTROL row 2: `11 11 0 18 0 0`
- FORCMNT count: **0**

### 3D_Converters / 1001-P - COPY[BenchMark].CII

- path: `Benchmarks/INPUT XML to CII 2019/1001/1001-P - COPY[BenchMark].CII`
- Git blob: `6ee776c62632cf4058a9373abd966987d7eaf0cf`
- version: 11
- CONTROL row 2: `6 6 0 2 3 0`
- FORCMNT count: **0**

### 3D_Converters / AML-78 benchmark

- path: `Benchmarks/INPUT XML to CII 2019/7/AML-78-SYS_007_08-03-2024[BENCHMARK}.CII`
- Git blob: `8bec33bf0d0244510a1931fc85644ef437ea9f2d`
- version: 11
- CONTROL row 2: `26 27 0 26 2 0`
- FORCMNT count: **0**

### 3D_Converters / INLET-SEPARATOR workflow CII

- path: `Benchmarks/INPUT XML to CII 2019/INLET SEP/INLET-SEPARATOR-SKID-C2_INPUT_inputxml_to_cii2019_workflow.cii`
- Git blob: `0ea75ecb413465dadb033661968b156762e37a15`
- version: 11 profile
- CONTROL row 2: `11 9 0 5 0 0`
- FORCMNT count: **0**

### 3D_Converters / older B7410250 benchmark

- path: `Benchmarks/XML to CII 2014/B7410250/SYS-30-B7410250 [CII BENCHMARK].cii`
- Git blob: `a18e20ac2a0acb845a3e1ccfc171a4f94a491b28`
- legacy version 4.5 profile
- CONTROL row 2: `14 7 0 3 0 0`
- FORCMNT count: **0**

## Repository-wide search result

Code search over retained `.cii` files with `#$ FORCMNT` found many files whose FORCMNT section is present structurally. Presence of the section is not qualification evidence: inspected retained candidates above all carry CONTROL FORCMNT=0, and snippets commonly show the next section header immediately after `#$ FORCMNT`.

Search for textual v14/FORCMNT evidence did not expose a retained textual v14 `.CII` with nonzero FORCMNT. The known paired v14 authority remains archived in `v11-v14.zip`; existing v14 merger qualification explicitly treats nonzero FORCMNT as unqualified.

## Authority conclusion

`FORCMNT` structure is partially documented:

- ELEMENT row 12 item 6 is the 1-based FORCMNT pointer;
- CONTROL row 2 item 6 is FORCMNT cardinality;
- v14 physical cardinality is 20 rows per FORCMNT auxiliary;
- documented force/moment semantics include node/vector identities and FX/FY/FZ/MX/MY/MZ components.

But **no retained nonzero v14 physical oracle was found** in the connected repository corpus during this scan. Therefore:

```text
FORCE intake                         BLOCKED
FORCE mutable spans                  0
FORCMNT documented structure         PARTIAL_PASS
retained nonzero v14 ownership       NOT_QUALIFIED
FORCE mutation authority             NONE
```

Do not infer FORCE ownership from `parser/sections/forces.js`; that reader collapses the fixed-format physical representation and is not byte-mutation authority.

## Exact next action

Acquire or retain one CAESAR II v14 CII with CONTROL FORCMNT > 0 and at least one positive ELEMENT FORCMNT pointer. Preserve its exact bytes/blob hash. Then prove pointer-to-20-row ownership, both 10-row specs, sentinel behavior, node/vector semantics, and adjacent falsifiers before any product change.
