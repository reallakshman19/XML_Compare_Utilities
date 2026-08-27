# PR1059 Work Report — Writer2 W2 A exact public runtime

## Handover in 60 seconds

PR #1059 continues the exact W2 A runtime gate from merged PR #1058 on `main@9685a2f41ec2b5a5c170762816702fefe90e18a7`. W2.34 and W2 C0 remain inherited PASS. W2 A remains NOT_RUN until the unchanged committed `tests/cii-workspace-writer2-restraint-product-routing.test.js` executes through the normal public `applyCiiWorkspaceTargetWriter2()` import graph with every admitted repository file verified by exact Git blob identity.

On 2026-08-27 the owner instructed `ok fix them` after the V11/V14 fixed-FORTRAN cross-check identified one concrete release-hardening defect: `tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js` accepted lexically REAL tokens such as `3.000000`, `3.000000E+00`, and `3.000000D+00` in Writer2-owned `I13` count/pointer coordinates whenever they were numerically integral. `3D_Converters` had already demonstrated that lexical REAL substitution in an `I13` slot can violate the CAESAR fixed-FORTRAN reader contract even when width and numeric value look acceptable. The owner instruction is therefore recorded as bounded production mutation authority for the lexical-I13 gate only; it does not authorize bypassing W2 A or widening CREATE/topology authority.

The fix is implemented and the focused gate now has exact before/after blob evidence. The exact production preimage `fc97ddd7...` fails the new authored lexical-I13 falsifier because `3.000000` is returned as integer `3`. The exact patched production blob `5f1473f...` passes that same test. The pre-existing V14 fixed-field regression also passes against the patched exact blob. Every local repository file used in these focused executions was admitted only after `git hash-object` matched its hosted Git blob.

This focused PASS does not promote W2 A because the W2 A test has a much larger public-core ESM graph that is still not completely materialized in the execution container.

Historical W2 A recovery remains unchanged: merged PR #1054 recorded a prior sparse mirror of 54 exact repository JS files with 31 unresolved static modules; execution reached missing `tabs/cii-workspace/cii-workspace-auxiliary.js` and no authored assertion failed. That mirror is not retained and is not current runtime evidence.

## Ground truth

- repository: `reallaksh19/XML_Compare_Utilities`
- base: `main@9685a2f41ec2b5a5c170762816702fefe90e18a7`
- branch: `agent/cii-writer2-w2a-runtime-closure`
- PR: #1059 draft/open; branch is linearly ahead of main with merge base equal to main
- predecessor: PR #1058 merged at `9685a2f41ec2b5a5c170762816702fefe90e18a7`
- W2 A test blob: `9922377ddeda86fc9167d65f33c97095346e79fa`
- public entrypoint: `applyCiiWorkspaceTargetWriter2`
- owner bounded write authorization: 2026-08-27 `ok fix them`
- merge authority: OWNER_ONLY / not granted

## Implemented hardening — V14 lexical I13

### Diagnosis

Preimage production blob:

```text
tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js
fc97ddd7fd5645e46c70a722c7f96f17dc7ae188
```

The preimage `integerValue()` used a general REAL-capable numeric regex and then accepted any finite value within `1e-9` of an integer. Consequently:

```text
3               -> 3
3.000000        -> 3          WRONG FOR I13 AUTHORITY
3.000000E+00    -> 3          WRONG FOR I13 AUTHORITY
3.000000D+00    -> 3          WRONG FOR I13 AUTHORITY
3.5             -> null
```

The engineering/fixed-format invariant is lexical, not merely numerical:

```text
CONTROL rows 1-3 use 2X,6I13
Writer2-owned CONTROL count positions therefore require integer lexical tokens.
Writer2-owned ELEMENT auxiliary-pointer positions are likewise integer fields.
```

### Patch

`NUMBER_RX` was replaced by:

```js
const INTEGER_RX = /^[+-]?\d+$/;
```

and `integerValue()` now rejects decimal and exponent spellings before numeric conversion.

Hosted postimage production blob:

```text
5f1473f692c172de5aa0712a70bc72d917a6934d
```

New focused falsifier:

```text
tests/cii-workspace-v14-writer2-i13-lexical.test.js
37703add4fbefd5e5636ef49a4b54214e33e5820
```

It proves both helper behavior and complete count/pointer transactions:

- plain/signed/zero-padded integer tokens remain accepted;
- `3.000000`, `3.000000E+00`, `3.000000D+00`, and fractional tokens are rejected;
- CONTROL row1/field4 NONAM written as a decimal REAL is rejected even when NODENAME cardinality and pointer movement otherwise agree;
- ELEMENT row14/field6 NODENAME pointer written in scientific REAL notation is rejected even when the matching CONTROL/cardinality transaction otherwise agrees.

Existing regression:

```text
tests/cii-workspace-v14-writer2-fixed-field-authority.test.js
78dbe0af0b8d0d8fd55aae26f586f727bb2d03df
```

### Exact before/after runtime evidence

Exact preimage falsification:

```text
production preimage blob = fc97ddd7fd5645e46c70a722c7f96f17dc7ae188   MATCH
new test blob            = 37703add4fbefd5e5636ef49a4b54214e33e5820   MATCH
node tests/cii-workspace-v14-writer2-i13-lexical.test.js
=> FAIL as expected: AssertionError, actual 3, expected null
```

Exact patched qualification:

```text
production postimage blob = 5f1473f692c172de5aa0712a70bc72d917a6934d   MATCH
new test blob             = 37703add4fbefd5e5636ef49a4b54214e33e5820   MATCH
existing regression blob  = 78dbe0af0b8d0d8fd55aae26f586f727bb2d03df   MATCH

node tests/cii-workspace-v14-writer2-i13-lexical.test.js
CII Workspace V14 Writer2 lexical I13 fixed-field authority: PASS

node tests/cii-workspace-v14-writer2-fixed-field-authority.test.js
CII Workspace V14 Writer2 fixed-field authority: PASS
```

Classification:

```text
W2_V14_I13_LEXICAL_FIXED_FIELD_AUTHORITY = PASS_RUNTIME_EXACT_3_FILE_BLOB_SUBGRAPH
```

### Negative assurance

This hardening does **not** change:

- fixed field widths;
- CONTROL coordinate authority;
- ELEMENT pointer coordinate authority;
- V14 NODENAME=1 / RESTRAINT=24 / SIF&TEES=14 cardinality units;
- pointer range rules;
- cardinality correlation;
- V11/V14 bridge semantics;
- SIF item 15/16 semantic mapping;
- CREATE authority;
- Writer3 topology;
- parser/converter behavior outside this V14 Writer2 authority gate.

## Current changed-file ledger

```text
agents/PR1059_workreport.md
agents/claims/PR1059.yaml
agents/status/PR1059.yaml
tabs/cii-workspace/cii-workspace-v14-writer2-fixed-field-authority.js
tests/cii-workspace-v14-writer2-i13-lexical.test.js
```

No workflow file, benchmark, frozen upstream converter, topology Writer, or generic parser was changed.

## Current validation ledger

| Gate | Status | Observation | Oracle / evidence | Notes |
|---|---|---|---|---|
| W2.34 focused bridge/export | PASS inherited | prior exact runtime | predecessor evidence | unchanged |
| W2 C0 exact 14-file route/export | PASS inherited | prior exact runtime | predecessor evidence | unchanged |
| exact preimage lexical-I13 falsifier | FAIL as expected | LOCAL_EXECUTION / EXACT_GIT_BLOB | authored new test | actual 3 vs expected null |
| new lexical-I13 test on patch | PASS | LOCAL_EXECUTION / EXACT_GIT_BLOB | authored Node test | production+test blobs matched GitHub |
| existing V14 fixed-field regression | PASS | LOCAL_EXECUTION / EXACT_GIT_BLOB | authored Node test | production+legacy test blobs matched GitHub |
| hosted production diff | PASS | SOURCE_INSPECTION | GitHub PR patch | only lexical integer gate changed |
| W2 A exact public runtime | NOT_RUN | NOT_OBSERVED | exact graph reconstruction required | unchanged committed test |
| W2 B retained-real V11 | NOT_RUN | NOT_OBSERVED | none | blocked until W2 A PASS |
| generated/native V14 browser gates | NOT_RUN | NOT_OBSERVED | none | later stage |
| release freeze | NOT_READY | SOURCE/STATE | required gates incomplete | no NOT_RUN promotion |

## Runtime/environment boundary

Direct native Git access from the current execution container remains unavailable:

```text
git ls-remote https://github.com/reallaksh19/XML_Compare_Utilities.git HEAD
fatal: Could not resolve host: github.com
```

The GitHub connector provides exact file/blob access but no repository/archive materialization endpoint. Small focused graphs can be reconstructed exactly, as proven above. The much larger W2 A public-core graph still requires connector-mediated reconstruction or a runtime with native repository access.

## W2 A continuation rule

```text
exact complete ESM graph
-> Git-blob verify every admitted repository file
-> run unchanged committed W2 A test
-> first authored runtime/assertion failure = genuine W2 A FAIL
-> clean authored completion = W2 A PASS
-> only W2 A PASS permits W2 B promotion
```

No stub, import rewrite, partial-core substitution, lossy bridge, workflow-based substitute, or reconstructed PASS is permitted.

## Exact next action

Continue W2 A dependency closure from current branch/main truth. Reconstruct exact dependencies beginning from the historical frontier `tabs/cii-workspace/cii-workspace-auxiliary.js`, retain exact Git blob custody, and run unchanged:

```text
node tests/cii-workspace-writer2-restraint-product-routing.test.js
```

Do not modify additional production Writer behavior unless that exact authored runtime exposes a reproducible failure.

## Appendix A — takeover qualification

1. Trace the W2 A test through `applyCiiWorkspaceTargetWriter2()` to RESTRAINT composite dispatch and the independent complete-postimage validator.
2. Explain why dependency/module-not-found is NOT_RUN rather than product FAIL, and identify the first condition that converts the gate to FAIL.
3. Prove CONTROL row1/field4 NONAM custody is distinct from row2/field4 RESTRAINT block-count authority, and explain why lexical `I13` is stricter than numerical integrality.
4. Identify all Writer2 CREATE/topology boundaries that must remain blocked during W2 A and this hardening.
5. Give the exact next module/blob materialization state and the minimal response if the first authored assertion fails.
