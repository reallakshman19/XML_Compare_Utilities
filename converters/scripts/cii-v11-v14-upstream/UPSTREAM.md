# Frozen CAESAR II v11 <-> v14 converter source

This directory is a byte-identical vendor copy of the CAESAR II neutral-file v11 <-> v14 conversion engine from:

```text
repository: reallaksh19/3D_Converters
commit: ca8d391ac5f829f53bebb3c37adf0547c34a67b4
```

The upstream repository is not modified by XML_Compare_Utilities. The Python files below are not adapted locally; their Git blob SHA must remain identical to the pinned upstream blob.

| File | Upstream/expected Git blob SHA |
|---|---|
| `cii_v11_v14.py` | `6152f28c0c43b4d70029f360d993da5794310c8a` |
| `cii_v11_v14_format.py` | `56f59fb7e095a887fc84e8a008a5f40acbadaec5` |
| `cii_v11_v14_records.py` | `1a1f7bdd78a4b1479dd474fd9cc61a2b9adef235` |
| `cii_v11_v14_sif.py` | `88c1d80bdb7bd2d5197a56c5be60ac2057c02367` |
| `cii_v11_v14_validate.py` | `8e6896e8b61ac3c90d579139d39b29a6ace1637c` |
| `cii2019_section_rules.py` | `efa894afd241f8ac0b74f6a6e0ecfaedc3d6d76e` |

## Isolation rule

XML_Compare_Utilities already contains `converters/scripts/cii2019_section_rules.py`, but that file is **not** byte-identical to the pinned 3D_Converters dependency. The version bridge must load this directory as an isolated Python module root so `cii_v11_v14_validate.py` resolves the pinned upstream `cii2019_section_rules.py`, never the local XML copy.

## Adaptation boundary

Only target-repository integration code outside this directory may be adapted. The frozen upstream Python files must not be edited to fit the CII Workspace.

Writer integration is fail-closed:

```text
V11 target -> existing qualified CII Workspace writer directly

V14 target -> lossless upstream v14->v11 normalization
           -> exact untouched v14->v11->v14 roundtrip equality gate
           -> existing qualified V11 CII Workspace writer
           -> lossless upstream v11->v14 conversion
           -> upstream target-version structural validation
```

No `allow_lossy` conversion is permitted in a Writer1/Writer2 bridge. A source/target that cannot be represented losslessly in V11 remains outside the bridged writer authority.
