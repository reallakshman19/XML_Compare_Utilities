# CII Writer2 V11/V14 bridge — local extracted-source runtime evidence

Date: 2026-08-25
PR: #1055
Branch: `agent/cii-writer2-restraint-product-runtime-w218`
Pinned source repository: `reallaksh19/3D_Converters`
Pinned source commit: `ca8d391ac5f829f53bebb3c37adf0547c34a67b4`

## 1. Scope and evidence classification

This record documents runtime execution performed when the native repository checkout remained unavailable because the execution container could not resolve GitHub hosts.

The execution is intentionally classified as:

```text
FROZEN_SOURCE_CUSTODY               PASS_EXACT_BLOB_CUSTODY
EXTRACTED_HIGH_RISK_RUNTIME_SLICE    PASS_RUNTIME_EXACT_SOURCE_EXCERPT
FULL_FROZEN_ENGINE_RUNTIME           NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
TARGET_AUTHORED_ENGINE_TEST          NOT_RUN_EXACT_REPOSITORY_MODULE_GRAPH
W2_13_PRODUCT_RUNTIME                NOT_RUN_EXACT_EXECUTABLE_ENVIRONMENT
```

`PASS_RUNTIME_EXACT_SOURCE_EXCERPT` must not be promoted to `PASS_RUNTIME_EXACT_BLOB`, full converter qualification, Writer2 product qualification, or release authority.

## 2. Exact frozen-source custody

The six vendored files on the current PR were compared directly against the same paths in `3D_Converters@ca8d391ac5f829f53bebb3c37adf0547c34a67b4`.

| File | Git blob SHA | Result |
|---|---|---|
| `cii_v11_v14.py` | `6152f28c0c43b4d70029f360d993da5794310c8a` | exact match |
| `cii_v11_v14_format.py` | `56f59fb7e095a887fc84e8a008a5f40acbadaec5` | exact match |
| `cii_v11_v14_records.py` | `1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235` | exact match |
| `cii_v11_v14_sif.py` | `88c1d80bdb7bd2d5197a56c5be60ac2057c02367` | exact match |
| `cii_v11_v14_validate.py` | `8e6896e8b61ac3c90d579139d39b29a6ace1637c` | exact match |
| `cii2019_section_rules.py` | `efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e` | exact match |

The existing XML repository `converters/scripts/cii2019_section_rules.py` is not substituted for the frozen upstream dependency.

## 3. Local extracted-source falsifier slice

Exact source excerpts from the blob-verified files were locally materialized only for the functions under test. No production repository file was changed and no source-repository file was modified.

Executed falsifiers:

```text
T01 source VERSION 11 accepted                         PASS
T02 source VERSION 14 accepted                         PASS
T03 unsupported VERSION 12 rejected                    PASS
T04 V14 SIF item15/item16 axial/torsion semantic swap  PASS
T05 non-zero V14 SIF item27 rejected with lossy=false  PASS
T06 non-zero V11 SIF item19 rejected on V11->V14       PASS
T07 empty V14 restraint stiffness maps to V11 sentinel PASS
T08 V14 ALLOWBLS item154 rejected with lossy=false     PASS
```

The first local slice reported five unittest cases PASS; the ALLOWBLS slice reported one unittest case PASS. The VERSION case contains three assertions, giving the eight falsifiers listed above.

## 4. What this proves

The executed exact source excerpts demonstrate the high-risk semantic behavior used by the bridge:

- admission is restricted to neutral major 11 or 14;
- SIF axial/torsional mapping is semantic, not row-position copying;
- unsupported V14 SIF extension data fails closed when loss is not authorized;
- ambiguous legacy V11 SIF data fails closed rather than being guessed into V14;
- the V14 empty-restraint stiffness representation maps to the retained V11 sentinel;
- V14 ALLOWBLS extension data outside items 1..153 fails closed when non-zero.

## 5. What this does not prove

This run does **not** prove:

- that the unchanged `tests/cii-workspace-v11-v14-frozen-engine.test.py` executed from an exact checkout;
- that the entire frozen six-file Python import graph compiled or executed together;
- source/target full-file structure validation through `cii_v11_v14_validate.py`;
- real `Benchmarks/v11-v14.zip` execution;
- V14 -> V11 -> V14 baseline exact-byte roundtrip admission;
- modified V11 -> V14 -> V11 exact-byte proof;
- browser/Pyodide worker behavior;
- Writer2 W2.13 product routing or retained-real-CII behavior;
- repository `npm test` or browser qualification.

Those remain separate mandatory gates.

## 6. No-Actions rule

The temporary `.github/workflows/cii-writer-v11-v14-bridge.yml` added earlier on PR #1055 was removed before this checkpoint. No GitHub Actions result is used as evidence for this record.

## 7. Next exact gate

Obtain an exact executable checkout/module graph and run, without import rewrites or source modification:

```text
python tests/cii-workspace-v11-v14-frozen-engine.test.py
node tests/cii-workspace-v11-v14-frozen-source.test.js
node tests/cii-workspace-writer2-restraint-product-routing.test.js
```

Until those authored tests execute, the full-engine and W2.13 states remain `NOT_RUN`.
