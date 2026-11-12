# p02-cii-edit-kernel · CII edit kernel

## What it does
It applies an approved Change set to a CAESAR II neutral file (`.CII`, version 14 only). In v1 it can change two things: the **weight of a rigid** (`RIGID/WEIGHT`, addressed by the element that points to the rigid) and the **name of a node** (`NODENAME/NAME`, addressed by node number). It finds the exact bytes of each value with the kit reader, replaces only those bytes, then reads the new file again and compares it field by field with the old one: only the planned fields may differ. If anything is wrong it refuses the whole Change set and writes nothing. It never parses and rewrites the file, and it never adds or removes records.

How a change is written:
- A weight is written like the old value of that field, right-aligned in the 13-character field: `1.390000E+03` becomes `1.529000E+03` (same decimals, same `E`, same 2-digit exponent).
- A node name is written in every node-name record at that node (the FROM or TO name of each element that touches the node), left-aligned, at most 25 characters. This is the layout of XCU `nodal-transfer.js`.

Checks, in this order: Change set rules (the P0.1 validator, vendored), base kind is `cii`, the file's sha256 equals `base.sha256` (checksum lock), each change approved, each target found and its old text equal to `oldToken`, new value allowed, no two changes on the same bytes; then build and re-check.

## Run
```
node cli.mjs apply <base.cii> <changeset.json> <out.cii>   # writes out.cii only if every change passes
node cli.mjs diff <a.cii> <b.cii>                          # every 13-character field that differs
node cli.mjs read <file.cii>                               # counts only
node --test                                                # all tests (run inside this folder)
node bench/run.mjs                                         # B1-B3; benchmarks are found in the XCU checkout
node ../_kit/card-check.mjs . --final
```
Exit code 0 = OK, 1 = refused, 2 = bad usage. Output is JSON.

## Refusal codes
Refusals from the kit reader (`CII_*`, for example `CII_VERSION_UNSUPPORTED` for a v11 file) are passed through unchanged.

| code | meaning |
|---|---|
| `INPUT_SHA256_MISMATCH` | A benchmark file is not the pinned file (from the kit). |
| `KERNEL_CHANGESET_INVALID` | The Change set breaks a P0.1 rule; `detail` starts with the rule code (R1-R13). |
| `KERNEL_BASE_KIND` | The Change set's base is not a CII file. |
| `KERNEL_BASE_SHA256_MISMATCH` | The file is not the one the Change set was made for (checksum lock). |
| `KERNEL_NOT_APPROVED` | A change is not approved. |
| `KERNEL_FIELD_UNSUPPORTED` | The field is not `RIGID/WEIGHT` or `NODENAME/NAME`, or the ref kind does not fit the field. |
| `KERNEL_TARGET_NOT_FOUND` | The element index or node number is not in the file. |
| `KERNEL_REF_NODES_MISMATCH` | The element at that index does not run from `fromNode` to `toNode`. |
| `KERNEL_NO_RIGID` | The element has no rigid, so it has no rigid weight. |
| `KERNEL_NO_NODENAME` | An element at the node has no node-name record; adding one is a structure change. |
| `KERNEL_OLD_TOKEN_MISMATCH` | The text in the file is not the Change set's `oldToken`. |
| `KERNEL_SPAN_HINT_MISMATCH` | The change's `span` hint does not point at the old text. |
| `KERNEL_SPAN_SHARED` | Two changes land on the same bytes. |
| `KERNEL_VALUE_INVALID` | The new value is not a number. |
| `KERNEL_NEGATIVE_WEIGHT` | A rigid weight below zero. |
| `KERNEL_ZERO_NOT_CONFIRMED` | A rigid weight of zero without `approval.zeroConfirmed`. |
| `KERNEL_TOKEN_FORM_UNKNOWN` | The old value is not in v14 number style (`1.390000E+03`), so the kernel cannot copy its form. |
| `KERNEL_VALUE_PRECISION_LOST` | The field keeps 7 significant digits (v14 style) and the new value has more, or a non-zero value would be written as zero. Round it in the Change set. |
| `KERNEL_VALUE_DOES_NOT_FIT` | The new value needs more room than the field has (3-digit exponent, name over 25 characters). |
| `KERNEL_NAME_NOT_STRING` | A node name was given as a number instead of text. |
| `KERNEL_NAME_INVALID` | A node name is empty, not plain printable text, or starts or ends with a space. |
| `KERNEL_NAME_IN_USE` | The new name already names another node. |
| `KERNEL_RECHECK_FAILED` | After the edit, the file does not read the same or something other than the planned fields changed. |
